const { Router } = require("express");
const scenesController = require("../controllers/scenesController");

const scenesRouter = Router();

scenesRouter.get("/", scenesController.listScenes);
scenesRouter.get("/:slug", scenesController.getScene);
scenesRouter.get("/:slug/scores", scenesController.listScores);

module.exports = scenesRouter;
