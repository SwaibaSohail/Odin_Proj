const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const { notFound, badRequest, handleValidation } = require("../lib/http");
const { USER_SELECT, userJson } = require("../lib/json");
const { displayNameRule, aboutRule } = require("../lib/rules");
const { MAX_AVATAR_BYTES, acceptImage, inspectImage } = require("../lib/images");

const byName = (a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });

async function userById(id) {
  return userJson(await prisma.user.findUniqueOrThrow({ where: { id }, select: USER_SELECT }));
}

// GET /api/users. Everyone but you, with people who are online first.
async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    where: { id: { not: req.user.id } },
    take: 500,
    select: USER_SELECT,
  });
  res.json({ users: users.map(userJson).sort((a, b) => b.online - a.online || byName(a, b)) });
}

// GET /api/users/:username
async function getUser(req, res) {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username.toLowerCase() },
    select: USER_SELECT,
  });
  if (!user) return notFound(res, "That person doesn't exist.");
  res.json({ user: userJson(user) });
}

// PATCH /api/users/me { displayName?, about? }
const updateMe = [
  displayNameRule().optional(),
  aboutRule().optional(),
  body().custom((fields) => fields?.displayName !== undefined || fields?.about !== undefined)
    .withMessage("Nothing to change."),
  handleValidation,
  async (req, res) => {
    const { displayName, about } = req.body;
    await prisma.user.update({ where: { id: req.user.id }, data: { displayName, about } });
    res.json({ user: await userById(req.user.id) });
  },
];

// PUT /api/users/me/avatar, with the picture in a form field called "avatar".
const setAvatar = [
  acceptImage("avatar"),
  async (req, res) => {
    const image = req.file && inspectImage(req.file);
    if (!image) return badRequest(res, "Choose a PNG, JPEG, GIF or WebP picture.");
    if (req.file.size > MAX_AVATAR_BYTES) return res.status(413).json({ error: "Profile photos can be up to 500 KB." });

    const userId = req.user.id;
    await prisma.$transaction([
      prisma.image.deleteMany({ where: { userId } }),
      prisma.image.create({ data: { ...image, userId } }),
    ]);
    res.json({ user: await userById(userId) });
  },
];

// DELETE /api/users/me/avatar
async function removeAvatar(req, res) {
  await prisma.image.deleteMany({ where: { userId: req.user.id } });
  res.json({ user: await userById(req.user.id) });
}

module.exports = { listUsers, getUser, updateMe, setAvatar, removeAvatar };
