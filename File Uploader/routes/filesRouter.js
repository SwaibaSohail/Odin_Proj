const { Router } = require("express");
const filesController = require("../controllers/filesController");
const { requireLogin } = require("../lib/auth");

const filesRouter = Router();

filesRouter.get("/:id", requireLogin, filesController.showFile);
filesRouter.get("/:id/download", requireLogin, filesController.downloadFile);
filesRouter.post("/:id/delete", requireLogin, filesController.deleteFile);

module.exports = filesRouter;
