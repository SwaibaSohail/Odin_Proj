const prisma = require("../lib/prisma");
const { notFound } = require("../lib/http");
const { topScores } = require("../lib/leaderboard");

const SCENE_NOT_FOUND = "That picture doesn't exist.";

// Says who is hiding in each picture, but never where.
const SCENE_FIELDS = {
  id: true,
  slug: true,
  title: true,
  description: true,
  imageUrl: true,
  previewUrl: true,
  width: true,
  height: true,
  spots: {
    select: {
      character: { select: { id: true, slug: true, name: true, description: true, imageUrl: true, position: true } },
    },
  },
};

function sceneJson({ id, spots, ...scene }) {
  const characters = spots
    .map((spot) => spot.character)
    .sort((a, b) => a.position - b.position)
    .map(({ position, ...character }) => character);
  return { ...scene, characters };
}

// GET /api/scenes, with the best time for each.
async function listScenes(req, res) {
  const scenes = await prisma.scene.findMany({ orderBy: { position: "asc" }, select: SCENE_FIELDS });
  const best = await Promise.all(scenes.map((scene) => topScores(scene.id, 1)));
  res.json({
    scenes: scenes.map((scene, i) => ({ ...sceneJson(scene), bestScore: best[i][0] || null })),
  });
}

// GET /api/scenes/:slug
async function getScene(req, res) {
  const scene = await prisma.scene.findUnique({ where: { slug: req.params.slug }, select: SCENE_FIELDS });
  if (!scene) return notFound(res, SCENE_NOT_FOUND);
  res.json({ scene: sceneJson(scene) });
}

// GET /api/scenes/:slug/scores
async function listScores(req, res) {
  const scene = await prisma.scene.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, slug: true, title: true },
  });
  if (!scene) return notFound(res, SCENE_NOT_FOUND);
  res.json({ scene: { slug: scene.slug, title: scene.title }, scores: await topScores(scene.id) });
}

module.exports = { listScenes, getScene, listScores };
