const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const { notFound, conflict, handleValidation } = require("../lib/http");
const { TOP_SCORES, topScores, rankFor } = require("../lib/leaderboard");

const GAME_NOT_FOUND = "That game doesn't exist. Start a new one.";
const DAY_MS = 24 * 60 * 60 * 1000;

// Guesses closer together than this are refused, so a script can't click
// all over the picture to find everyone.
const MIN_GUESS_GAP_MS = 300;

// How far outside a character's box still counts, as a fraction of the picture.
const MARGIN = 0.004;

const isGameId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function insideSpot(spot, x, y) {
  return (
    x >= spot.x - MARGIN &&
    x <= spot.x + spot.width + MARGIN &&
    y >= spot.y - MARGIN &&
    y <= spot.y + spot.height + MARGIN
  );
}

// POST /api/games { scene }. Called once the picture has loaded; the clock starts now.
const startGame = [
  body("scene").isString().withMessage("Choose a picture.").trim().notEmpty().withMessage("Choose a picture."),
  handleValidation,
  async (req, res) => {
    const scene = await prisma.scene.findUnique({ where: { slug: req.body.scene }, select: { id: true, slug: true } });
    if (!scene) return notFound(res, "That picture doesn't exist.");

    // Games without a name on the board are no use after a day.
    await prisma.game.deleteMany({ where: { playerName: null, startedAt: { lt: new Date(Date.now() - DAY_MS) } } });

    const game = await prisma.game.create({
      data: { sceneId: scene.id, startedAt: new Date() },
      select: { id: true, startedAt: true },
    });
    res.status(201).json({ game: { id: game.id, scene: scene.slug, startedAt: game.startedAt } });
  },
];

// POST /api/games/:id/guesses { characterId, x, y }
// x and y are where the player clicked, as fractions of the picture's width and height.
const makeGuess = [
  body("characterId").isInt({ min: 1 }).withMessage("Choose who you found.").toInt(),
  body("x").isFloat({ min: 0, max: 1 }).withMessage("Click somewhere on the picture.").toFloat(),
  body("y").isFloat({ min: 0, max: 1 }).withMessage("Click somewhere on the picture.").toFloat(),
  handleValidation,
  async (req, res) => {
    const { id } = req.params;
    if (!isGameId(id)) return notFound(res, GAME_NOT_FOUND);
    const { characterId, x, y } = req.body;
    const now = new Date();

    // Claim this guess in one step. It fails if the game is over or the last guess was too recent.
    const claimed = await prisma.game.updateMany({
      where: {
        id,
        finishedAt: null,
        OR: [{ lastGuessAt: null }, { lastGuessAt: { lte: new Date(now.getTime() - MIN_GUESS_GAP_MS) } }],
      },
      data: { lastGuessAt: now },
    });
    if (claimed.count === 0) {
      const game = await prisma.game.findUnique({ where: { id }, select: { finishedAt: true } });
      if (!game) return notFound(res, GAME_NOT_FOUND);
      if (game.finishedAt) return conflict(res, "This game is already over.");
      return res.status(429).json({ error: "Slow down a little." });
    }

    const game = await prisma.game.findUnique({
      where: { id },
      select: { sceneId: true, startedAt: true, finds: { select: { characterId: true } } },
    });
    const spot = await prisma.spot.findUnique({
      where: { sceneId_characterId: { sceneId: game.sceneId, characterId } },
      select: { x: true, y: true, width: true, height: true, character: { select: { id: true, name: true } } },
    });
    if (!spot) return res.status(400).json({ error: "That character isn't hiding in this picture." });

    const { character } = spot;
    const found = game.finds.map((find) => find.characterId);
    if (found.includes(character.id)) return conflict(res, `You've already found ${character.name}.`);

    if (!insideSpot(spot, x, y)) {
      await prisma.game.update({ where: { id }, data: { misses: { increment: 1 } } });
      return res.json({ correct: false, character, found, finished: false });
    }

    try {
      await prisma.find.create({ data: { gameId: id, characterId: character.id, foundAt: now } });
    } catch (err) {
      if (err.code === "P2002") return conflict(res, `You've already found ${character.name}.`);
      throw err;
    }
    const box = { x: spot.x, y: spot.y, width: spot.width, height: spot.height };
    const [finds, total] = await Promise.all([
      prisma.find.findMany({ where: { gameId: id }, select: { characterId: true } }),
      prisma.spot.count({ where: { sceneId: game.sceneId } }),
    ]);
    const foundNow = finds.map((find) => find.characterId);
    if (foundNow.length < total) return res.json({ correct: true, character, box, found: foundNow, finished: false });

    // That was the last one: stop the clock (only once, even if two guesses land together).
    const timeMs = now.getTime() - game.startedAt.getTime();
    await prisma.game.updateMany({ where: { id, finishedAt: null }, data: { finishedAt: now, timeMs } });
    const finished = await prisma.game.findUnique({ where: { id }, select: { finishedAt: true, timeMs: true, misses: true } });
    const rank = await rankFor(game.sceneId, finished.timeMs, finished.finishedAt);
    res.json({
      correct: true,
      character,
      box,
      found: foundNow,
      finished: true,
      result: { timeMs: finished.timeMs, misses: finished.misses, rank, madeTopScores: rank <= TOP_SCORES },
    });
  },
];

// PATCH /api/games/:id { name }. Puts a finished game's time on the high score table.
const saveName = [
  body("name")
    .isString()
    .withMessage("Enter your name.")
    .trim()
    .customSanitizer((value) => value.replace(/\s+/g, " "))
    .notEmpty()
    .withMessage("Enter your name.")
    .isLength({ max: 20 })
    .withMessage("Names can be up to 20 characters.")
    .matches(/^[\p{L}\p{N} .'_-]+$/u)
    .withMessage("Use letters, numbers, spaces, dots, dashes or apostrophes."),
  handleValidation,
  async (req, res) => {
    const { id } = req.params;
    if (!isGameId(id)) return notFound(res, GAME_NOT_FOUND);

    const game = await prisma.game.findUnique({
      where: { id },
      select: { sceneId: true, finishedAt: true, timeMs: true, playerName: true, scene: { select: { slug: true } } },
    });
    if (!game) return notFound(res, GAME_NOT_FOUND);
    if (!game.finishedAt) return conflict(res, "Find everyone first.");
    if (game.playerName) return conflict(res, "This time already has a name.");

    const rank = await rankFor(game.sceneId, game.timeMs, game.finishedAt);
    if (rank > TOP_SCORES) return conflict(res, `This time didn't make the top ${TOP_SCORES}.`);

    const saved = await prisma.game.updateMany({ where: { id, playerName: null }, data: { playerName: req.body.name } });
    if (saved.count === 0) return conflict(res, "This time already has a name.");

    res.json({ rank, scene: game.scene.slug, scores: await topScores(game.sceneId) });
  },
];

module.exports = { startGame, makeGuess, saveName };
