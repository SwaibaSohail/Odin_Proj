const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { logIn, logOut, userIdFromRequest } = require("../lib/auth");
const { handleValidation } = require("../lib/http");
const { USER_SELECT, userJson } = require("../lib/json");
const { usernameRule, displayNameRule, passwordRule } = require("../lib/rules");

const USERNAME_TAKEN = "That username is taken.";

// Checked when someone logs in with a username that doesn't exist, so the
// reply takes as long as it would for a wrong password.
const DUMMY_HASH = bcrypt.hashSync("no account has this password", 12);

// POST /api/auth/signup { username, displayName, password }. Logs you in too.
const signup = [
  usernameRule()
    .bail()
    .custom(async (username) => {
      const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (taken) throw new Error(USERNAME_TAKEN);
    }),
  displayNameRule(),
  passwordRule(),
  handleValidation,
  async (req, res) => {
    const { username, displayName, password } = req.body;
    let user;
    try {
      user = await prisma.user.create({
        data: { username, displayName, passwordHash: await bcrypt.hash(password, 12) },
        select: { id: true },
      });
    } catch (err) {
      // Two people asked for the same username at the same moment.
      if (err.code !== "P2002") throw err;
      return res.status(400).json({
        error: "Some fields need fixing.",
        details: [{ field: "username", message: USERNAME_TAKEN }],
      });
    }
    await logIn(res, user.id);
    res.status(201).json({ user: await currentUser(user.id) });
  },
];

// POST /api/auth/login { username, password }
async function login(req, res) {
  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const user = username
    ? await prisma.user.findUnique({ where: { username }, select: { id: true, passwordHash: true } })
    : null;
  const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !matches) return res.status(401).json({ error: "Incorrect username or password." });

  await logIn(res, user.id);
  res.json({ user: await currentUser(user.id) });
}

// POST /api/auth/logout
async function logout(req, res) {
  await logOut(res, userIdFromRequest(req));
  res.status(204).end();
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ user: await currentUser(req.user.id) });
}

async function currentUser(id) {
  return userJson(await prisma.user.findUniqueOrThrow({ where: { id }, select: USER_SELECT }));
}

module.exports = { signup, login, logout, me };
