const { Router } = require("express");
const itemsController = require("../controllers/itemsController");

const itemsRouter = Router();

itemsRouter.get("/", itemsController.itemList);
itemsRouter.get("/new", itemsController.createItemGet);
itemsRouter.post("/new", itemsController.createItemPost);
itemsRouter.get("/:id", itemsController.itemDetail);
itemsRouter.get("/:id/edit", itemsController.updateItemGet);
itemsRouter.post("/:id/edit", itemsController.updateItemPost);
itemsRouter.get("/:id/delete", itemsController.deleteItemGet);
itemsRouter.post("/:id/delete", itemsController.deleteItemPost);

module.exports = itemsRouter;
