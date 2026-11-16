const crypto = require("node:crypto");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const passport = require("../lib/passport");

const DAY_MS = 24 * 60 * 60 * 1000;
const tidy = (value) => value.replace(/\s+/g, " ");

const signupRules = [
  body("displayName")
    .isString().withMessage("Enter your name.")
    .trim().customSanitizer(tidy)
    .notEmpty().withMessage("Enter your name.")
    .isLength({ max: 40 }).withMessage("Names can be up to 40 characters."),
  body("username")
    .isString().withMessage("Choose a username.")
    .trim().toLowerCase()
    .isLength({ min: 3, max: 20 }).withMessage("Usernames are 3 to 20 characters.")
    .matches(/^[a-z0-9_]+$/).withMessage("Use only letters, numbers and underscores.")
    .not().matches(/^guest_/).withMessage("That username is taken.")
    .bail()
    .custom(async (username) => {
      if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) throw new Error("That username is taken.");
    }),
  // bcrypt ignores everything after 72 bytes, so longer passwords are refused
  // instead of being quietly cut short.
  body("password")
    .isString().withMessage("Choose a password.")
    .isLength({ min: 8 }).withMessage("Passwords need at least 8 characters.")
    .custom((value) => !bcrypt.truncates(value)).withMessage("That password is too long."),
];

// Starts a signed-in session and goes to the home page.
function signIn(req, res, next, userId) {
  req.logIn({ id: userId }, (err) => (err ? next(err) : res.redirect(303, "/")));
}

function showLogin(req, res) {
  res.render("login", { title: "Sign in", error: null, username: "" });
}

function login(req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const username = typeof req.body?.username === "string" ? req.body.username.slice(0, 20) : "";
      return res.status(401).render("login", { title: "Sign in", error: info?.message || "Enter your username and password.", username });
    }
    signIn(req, res, next, user.id);
  })(req, res, next);
}

function showSignup(req, res) {
  res.render("signup", { title: "Sign up", errors: {}, values: {} });
}

const signup = [
  ...signupRules,
  async (req, res, next) => {
    const errors = validationResult(req);
    const { displayName, username, password } = req.body;
    const again = (fieldErrors) =>
      res.status(400).render("signup", { title: "Sign up", errors: fieldErrors, values: { displayName, username } });
    if (!errors.isEmpty()) {
      return again(Object.fromEntries(errors.array({ onlyFirstError: true }).map((error) => [error.path, error.msg])));
    }
    let user;
    try {
      user = await prisma.user.create({
        data: { username, displayName, passwordHash: await bcrypt.hash(password, 12) },
        select: { id: true },
      });
    } catch (err) {
      // Two people asked for the same username at the same moment.
      if (err.code !== "P2002") throw err;
      return again({ username: "That username is taken." });
    }
    signIn(req, res, next, user.id);
  },
];

// POST /guest. Makes a throwaway account so visitors can look around without
// signing up. It already follows a few people, so the home page isn't empty.
async function guest(req, res, next) {
  // Guests from more than a day ago are cleared out, with everything they posted.
  await prisma.user.deleteMany({ where: { isGuest: true, createdAt: { lt: new Date(Date.now() - DAY_MS) } } });

  const number = crypto.randomInt(1000, 10000);
  const user = await prisma.user.create({
    data: {
      username: `guest_${crypto.randomBytes(4).toString("hex")}`,
      displayName: `Guest ${number}`,
      bio: "Just looking around.",
      passwordHash: "none", // not a real hash, so no password can ever match it
      requiresApproval: false,
      isGuest: true,
    },
    select: { id: true },
  });
  const people = await prisma.user.findMany({
    where: { isGuest: false, requiresApproval: false },
    orderBy: [{ posts: { _count: "desc" } }, { id: "asc" }],
    take: 8,
    select: { id: true },
  });
  await prisma.follow.createMany({
    data: people.map((person) => ({ followerId: user.id, followingId: person.id, status: "ACCEPTED" })),
  });
  signIn(req, res, next, user.id);
}

function logout(req, res, next) {
  req.logout((err) => (err ? next(err) : res.redirect(303, "/login")));
}

module.exports = { showLogin, login, showSignup, signup, guest, logout };
