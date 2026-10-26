const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const { parseId, notFound, handleValidation } = require("../lib/http");
const { findVisiblePost } = require("./postsController");

const POST_NOT_FOUND = "That post doesn't exist.";
const COMMENT_NOT_FOUND = "That comment doesn't exist.";
const COMMENT_FIELDS = { id: true, name: true, body: true, createdAt: true, updatedAt: true, postId: true };

const bodyRule = () =>
  body("body")
    .isString()
    .withMessage("Comment must be text.")
    .trim()
    .notEmpty()
    .withMessage("Write a comment first.")
    .isLength({ max: 2000 })
    .withMessage("Comments can be up to 2,000 characters.");

// GET /api/posts/:postId/comments, oldest first.
async function listComments(req, res) {
  const post = await findVisiblePost(req.params.postId, req.user);
  if (!post) return notFound(res, POST_NOT_FOUND);

  const comments = await prisma.comment.findMany({
    where: { postId: post.id },
    orderBy: { createdAt: "asc" },
    select: COMMENT_FIELDS,
  });
  res.json({ comments });
}

// POST /api/posts/:postId/comments. No account needed, just a name.
const createComment = [
  body("name")
    .isString()
    .withMessage("Name must be text.")
    .trim()
    .notEmpty()
    .withMessage("Add your name.")
    .isLength({ max: 50 })
    .withMessage("Names can be up to 50 characters."),
  bodyRule(),
  handleValidation,
  async (req, res) => {
    const post = await findVisiblePost(req.params.postId, null);
    if (!post) return notFound(res, POST_NOT_FOUND);

    const comment = await prisma.comment.create({
      data: { name: req.body.name, body: req.body.body, postId: post.id },
      select: COMMENT_FIELDS,
    });
    res.status(201).json({ comment });
  },
];

// Authors can only manage comments on their own posts.
async function findManageableComment(idParam, user) {
  const id = parseId(idParam);
  return id
    ? prisma.comment.findFirst({ where: { id, post: { authorId: user.id } }, select: COMMENT_FIELDS })
    : null;
}

const updateComment = [
  bodyRule(),
  handleValidation,
  async (req, res) => {
    const existing = await findManageableComment(req.params.id, req.user);
    if (!existing) return notFound(res, COMMENT_NOT_FOUND);

    const comment = await prisma.comment.update({
      where: { id: existing.id },
      data: { body: req.body.body },
      select: COMMENT_FIELDS,
    });
    res.json({ comment });
  },
];

async function deleteComment(req, res) {
  const comment = await findManageableComment(req.params.id, req.user);
  if (!comment) return notFound(res, COMMENT_NOT_FOUND);

  await prisma.comment.delete({ where: { id: comment.id } });
  res.status(204).end();
}

module.exports = { listComments, createComment, updateComment, deleteComment };
