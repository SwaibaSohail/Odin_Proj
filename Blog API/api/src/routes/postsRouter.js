const { Router } = require("express");
const postsController = require("../controllers/postsController");
const commentsController = require("../controllers/commentsController");
const { optionalAuth, requireAuth, requireAuthor } = require("../lib/auth");

const postsRouter = Router();

postsRouter.get("/", optionalAuth, postsController.listPosts);
postsRouter.post("/", requireAuth, requireAuthor, postsController.createPost);
postsRouter.get("/:id", optionalAuth, postsController.getPost);
postsRouter.patch("/:id", requireAuth, requireAuthor, postsController.updatePost);
postsRouter.delete("/:id", requireAuth, requireAuthor, postsController.deletePost);

// Comments belong to a post
postsRouter.get("/:postId/comments", optionalAuth, commentsController.listComments);
postsRouter.post("/:postId/comments", commentsController.createComment);

module.exports = postsRouter;
