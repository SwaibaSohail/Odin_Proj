const { Router } = require("express");
const shareController = require("../controllers/shareController");

// Public pages for share links. No account needed.
const shareRouter = Router();

shareRouter.get("/:linkId", shareController.showShared);
shareRouter.get("/:linkId/folders/:folderId", shareController.showShared);
shareRouter.get("/:linkId/files/:fileId/download", shareController.downloadShared);

module.exports = shareRouter;
