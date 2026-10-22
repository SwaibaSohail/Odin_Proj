const { Router } = require("express");
const messagesController = require("../controllers/messagesController");
const { requireLogin, requireAdmin } = require("../lib/auth");

const messagesRouter = Router();

messagesRouter.get("/", (req, res) => res.redirect("/"));
messagesRouter.get("/new", requireLogin, messagesController.newMessageGet);
messagesRouter.post("/new", requireLogin, messagesController.newMessagePost);
messagesRouter.post("/:id/delete", requireAdmin, messagesController.deleteMessagePost);

module.exports = messagesRouter;
