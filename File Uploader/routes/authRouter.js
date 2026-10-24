const { Router } = require("express");
const authController = require("../controllers/authController");
const { redirectIfLoggedIn } = require("../lib/auth");

const authRouter = Router();

authRouter.get("/sign-up", redirectIfLoggedIn, authController.signUpGet);
authRouter.post("/sign-up", redirectIfLoggedIn, authController.signUpPost);
authRouter.get("/log-in", redirectIfLoggedIn, authController.logInGet);
authRouter.post("/log-in", redirectIfLoggedIn, authController.logInPost);
authRouter.post("/log-out", authController.logOutPost);

module.exports = authRouter;
