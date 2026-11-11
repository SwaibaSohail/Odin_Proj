const { Router } = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../lib/auth");
const { loginLimiter, signupLimiter } = require("../lib/limits");

const authRouter = Router();

authRouter.post("/signup", signupLimiter, authController.signup);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);

module.exports = authRouter;
