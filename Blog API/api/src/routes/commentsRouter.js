const { Router } = require("express");
const commentsController = require("../controllers/commentsController");
const { requireAuth, requireAuthor } = require("../lib/auth");

// Managing a single comment. Only the author of the post it's on can do this.
const commentsRouter = Router();

commentsRouter.patch("/:id", requireAuth, requireAuthor, commentsController.updateComment);
commentsRouter.delete("/:id", requireAuth, requireAuthor, commentsController.deleteComment);

module.exports = commentsRouter;
