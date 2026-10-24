const { Router } = require("express");
const driveController = require("../controllers/driveController");
const shareController = require("../controllers/shareController");
const { requireLogin } = require("../lib/auth");
const { acceptUpload } = require("../lib/upload");

const driveRouter = Router();

// "My Drive", the top level
driveRouter.get("/drive", requireLogin, driveController.showRoot);
driveRouter.post("/drive/folders", requireLogin, driveController.createFolder);
driveRouter.post("/drive/upload", requireLogin, acceptUpload, driveController.uploadFile);

// Folders
driveRouter.get("/folders/:id", requireLogin, driveController.showFolder);
driveRouter.post("/folders/:id/folders", requireLogin, driveController.createFolder);
driveRouter.post("/folders/:id/upload", requireLogin, acceptUpload, driveController.uploadFile);
driveRouter.get("/folders/:id/rename", requireLogin, driveController.renameFolderGet);
driveRouter.post("/folders/:id/rename", requireLogin, driveController.renameFolderPost);
driveRouter.get("/folders/:id/delete", requireLogin, driveController.deleteFolderGet);
driveRouter.post("/folders/:id/delete", requireLogin, driveController.deleteFolderPost);

// Share links (owner side)
driveRouter.post("/folders/:id/share", requireLogin, shareController.createShareLink);
driveRouter.post("/share-links/:linkId/delete", requireLogin, shareController.deleteShareLink);

module.exports = driveRouter;
