const bcrypt = require("bcryptjs");
const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const { signToken } = require("../lib/auth");
const { handleValidation } = require("../lib/http");

const login = [
  body("username")
    .isString()
    .withMessage("Username is required.")
    .trim()
    .notEmpty()
    .withMessage("Username is required."),
  body("password").isString().withMessage("Password is required.").notEmpty().withMessage("Password is required."),
  handleValidation,
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { username: req.body.username.toLowerCase() } });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }

    res.json({
      token: signToken(user),
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  },
];

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
