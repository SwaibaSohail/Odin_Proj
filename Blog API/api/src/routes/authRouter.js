const { Router } = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../lib/auth");

const authRouter = Router();

authRouter.post("/login", authController.login);
authRouter.get("/me", requireAuth, authController.me);

module.exports = authRouter;
