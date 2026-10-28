const { Router } = require("express");
const gamesController = require("../controllers/gamesController");

const gamesRouter = Router();

gamesRouter.post("/", gamesController.startGame);
gamesRouter.post("/:id/guesses", gamesController.makeGuess);
gamesRouter.patch("/:id", gamesController.saveName);

module.exports = gamesRouter;
