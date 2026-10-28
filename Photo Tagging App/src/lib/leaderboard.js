const prisma = require("./prisma");

// How many times each picture's high score table shows.
const TOP_SCORES = 10;

// The fastest named times for a picture. Ties go to whoever finished first.
async function topScores(sceneId, take = TOP_SCORES) {
  const games = await prisma.game.findMany({
    where: { sceneId, playerName: { not: null } },
    orderBy: [{ timeMs: "asc" }, { finishedAt: "asc" }],
    take,
    select: { playerName: true, timeMs: true, misses: true, finishedAt: true },
  });
  return games.map((game, i) => ({
    rank: i + 1,
    name: game.playerName,
    timeMs: game.timeMs,
    misses: game.misses,
    finishedAt: game.finishedAt,
  }));
}

// Where a finished game would land on the table, counting only named times.
async function rankFor(sceneId, timeMs, finishedAt) {
  const ahead = await prisma.game.count({
    where: {
      sceneId,
      playerName: { not: null },
      OR: [{ timeMs: { lt: timeMs } }, { timeMs, finishedAt: { lt: finishedAt } }],
    },
  });
  return ahead + 1;
}

module.exports = { TOP_SCORES, topScores, rankFor };
