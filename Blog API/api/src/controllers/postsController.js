const { body, query } = require("express-validator");
const prisma = require("../lib/prisma");
const { isAuthor } = require("../lib/auth");
const { parseId, notFound, handleValidation } = require("../lib/http");

const POST_NOT_FOUND = "That post doesn't exist.";
const EXCERPT_LENGTH = 220;

const POST_FIELDS = {
  id: true,
  title: true,
  body: true,
  published: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
};

function excerptOf(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= EXCERPT_LENGTH) return flat;
  return `${flat.slice(0, flat.lastIndexOf(" ", EXCERPT_LENGTH))}…`;
}

// Shapes a database row for the API. Lists get an excerpt instead of the full body.
function toJson(post, { full = true } = {}) {
  const { body: text, _count, ...rest } = post;
  return {
    ...rest,
    ...(full ? { body: text } : { excerpt: excerptOf(text) }),
    commentCount: _count.comments,
  };
}

// Anyone can see a published post. Drafts are only visible to their author.
function canSee(post, user) {
  return post.published || (isAuthor(user) && post.author.id === user.id);
}

// Finds a post the current user may see, or null.
async function findVisiblePost(idParam, user) {
  const id = parseId(idParam);
  const post = id ? await prisma.post.findUnique({ where: { id }, select: POST_FIELDS }) : null;
  return post && canSee(post, user) ? post : null;
}

// Finds a post the current author wrote, or null.
async function findOwnPost(idParam, user) {
  const id = parseId(idParam);
  return id ? prisma.post.findFirst({ where: { id, authorId: user.id }, select: POST_FIELDS }) : null;
}

const validateStatus = query("status")
  .optional()
  .isIn(["published", "draft", "all"])
  .withMessage('Status must be "published", "draft" or "all".');

// GET /api/posts: published posts for everyone. With ?status=all or ?status=draft,
// a logged-in author gets their own posts, drafts included.
const listPosts = [
  validateStatus,
  handleValidation,
  async (req, res) => {
    const status = req.query.status || "published";

    if (status === "published" && !req.user) {
      const posts = await prisma.post.findMany({
        where: { published: true },
        orderBy: { publishedAt: "desc" },
        select: POST_FIELDS,
      });
      return res.json({ posts: posts.map((post) => toJson(post, { full: false })) });
    }

    if (!req.user) return res.status(401).json({ error: "Log in to see drafts." });
    if (!isAuthor(req.user)) return res.status(403).json({ error: "Only authors can see drafts." });

    const where = { authorId: req.user.id };
    if (status !== "all") where.published = status === "published";
    const posts = await prisma.post.findMany({ where, orderBy: { updatedAt: "desc" }, select: POST_FIELDS });
    res.json({ posts: posts.map((post) => toJson(post, { full: false })) });
  },
];

async function getPost(req, res) {
  const post = await findVisiblePost(req.params.id, req.user);
  if (!post) return notFound(res, POST_NOT_FOUND);
  res.json({ post: toJson(post) });
}

const titleRule = () =>
  body("title")
    .isString()
    .withMessage("Title must be text.")
    .trim()
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ max: 200 })
    .withMessage("Title must be 200 characters or fewer.");

const bodyRule = () =>
  body("body")
    .isString()
    .withMessage("Body must be text.")
    .trim()
    .notEmpty()
    .withMessage("Write something in the post.")
    .isLength({ max: 50000 })
    .withMessage("Posts can be up to 50,000 characters.");

const publishedRule = () =>
  body("published")
    .custom((value) => typeof value === "boolean")
    .withMessage("Published must be true or false.");

// The first time a post is published it gets a publish date, which it keeps
// even if it's unpublished and published again later.
function publishFields(published, existing) {
  if (published === undefined) return {};
  if (published && !existing?.publishedAt) return { published, publishedAt: new Date() };
  return { published };
}

const createPost = [
  titleRule(),
  bodyRule(),
  publishedRule().optional(),
  handleValidation,
  async (req, res) => {
    const { title, body: text, published = false } = req.body;
    const post = await prisma.post.create({
      data: { title, body: text, authorId: req.user.id, ...publishFields(published, null) },
      select: POST_FIELDS,
    });
    res.status(201).location(`/api/posts/${post.id}`).json({ post: toJson(post) });
  },
];

// PATCH changes only the fields that are sent, like { "published": true }.
const updatePost = [
  titleRule().optional(),
  bodyRule().optional(),
  publishedRule().optional(),
  handleValidation,
  async (req, res) => {
    const existing = await findOwnPost(req.params.id, req.user);
    if (!existing) return notFound(res, POST_NOT_FOUND);

    const { title, body: text, published } = req.body;
    if (title === undefined && text === undefined && published === undefined) {
      return res.status(400).json({ error: "Send at least one of: title, body, published." });
    }

    const post = await prisma.post.update({
      where: { id: existing.id },
      data: { title, body: text, ...publishFields(published, existing) },
      select: POST_FIELDS,
    });
    res.json({ post: toJson(post) });
  },
];

async function deletePost(req, res) {
  const post = await findOwnPost(req.params.id, req.user);
  if (!post) return notFound(res, POST_NOT_FOUND);

  await prisma.post.delete({ where: { id: post.id } });
  res.status(204).end();
}

module.exports = { listPosts, getPost, createPost, updatePost, deletePost, findVisiblePost };
