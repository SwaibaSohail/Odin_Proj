const prisma = require("../lib/prisma");
const { parseId, flash, goBack, NotFound } = require("../lib/http");
const { listPosts, findPost, followingIds, withFollowState, suggestions } = require("../lib/social");
const { acceptImage, inspectImage } = require("../lib/images");

const MAX_POST = 1000;
const MAX_COMMENT = 500;

// Text from a form, with Windows line endings made plain and the ends trimmed.
const clean = (value) => (typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "");
const wantsJson = (req) => req.get("accept") === "application/json";

async function postPage(req, res, { tab, where, title }) {
  const me = req.user.id;
  const [{ posts, older }, people] = await Promise.all([
    listPosts(me, where, parseId(req.query.before)),
    suggestions(me).then((list) => withFollowState(me, list)),
  ]);
  res.render("feed", { title, tab, posts, older, people });
}

// GET /. Recent posts from you and the people you follow.
async function home(req, res) {
  const authors = [req.user.id, ...(await followingIds(req.user.id))];
  await postPage(req, res, { tab: "home", title: "Home", where: { authorId: { in: authors } } });
}

// GET /explore. Recent posts from everyone.
async function explore(req, res) {
  await postPage(req, res, { tab: "explore", title: "Explore", where: {} });
}

// GET /posts/:id. One post with all its comments.
async function show(req, res) {
  const id = parseId(req.params.id);
  const post = id && (await findPost(req.user.id, id));
  if (!post) throw new NotFound("That post doesn't exist.");
  res.render("post", { title: `Post by ${post.author.displayName}`, post });
}

// POST /posts. Text, a picture, or both.
const create = [
  acceptImage("image"),
  async (req, res) => {
    const text = clean(req.body?.body);
    const image = req.file ? inspectImage(req.file) : null;
    let problem = req.uploadError;
    if (!problem && req.file && !image) problem = "That file isn't a picture. Use a PNG, JPEG, GIF or WebP.";
    if (!problem && !text && !image) problem = "Write something or add a picture.";
    if (!problem && text.length > MAX_POST) problem = `Posts can be up to ${MAX_POST.toLocaleString("en")} characters.`;
    if (problem) {
      flash(req, "error", problem);
      return goBack(req, res);
    }
    await prisma.post.create({
      data: { authorId: req.user.id, body: text, image: image ? { create: image } : undefined },
    });
    flash(req, "good", "Posted.");
    goBack(req, res);
  },
];

// POST /posts/:id/delete. Only your own.
async function remove(req, res) {
  const id = parseId(req.params.id);
  const { count } = id ? await prisma.post.deleteMany({ where: { id, authorId: req.user.id } }) : { count: 0 };
  if (!count) throw new NotFound("That post doesn't exist.");
  flash(req, "good", "Post deleted.");
  // The post's own page is gone, so don't go back to it.
  if (req.body?.next?.startsWith(`/posts/${id}`)) req.body.next = "/";
  goBack(req, res);
}

// POST /posts/:id/like and /unlike. The page's script asks for JSON so it can
// update the count in place. Without scripts, the form just reloads the page.
function setLike(liked) {
  return async (req, res) => {
    const postId = parseId(req.params.id);
    if (!postId || !(await prisma.post.findUnique({ where: { id: postId }, select: { id: true } }))) {
      throw new NotFound("That post doesn't exist.");
    }
    const userId = req.user.id;
    if (liked) {
      await prisma.like.upsert({ where: { userId_postId: { userId, postId } }, update: {}, create: { userId, postId } });
    } else {
      await prisma.like.deleteMany({ where: { userId, postId } });
    }
    if (!wantsJson(req)) return goBack(req, res, `/posts/${postId}`);
    res.json({ liked, likes: await prisma.like.count({ where: { postId } }) });
  };
}

// POST /posts/:id/comments
async function addComment(req, res) {
  const postId = parseId(req.params.id);
  if (!postId || !(await prisma.post.findUnique({ where: { id: postId }, select: { id: true } }))) {
    throw new NotFound("That post doesn't exist.");
  }
  const text = clean(req.body?.body);
  if (!text) flash(req, "error", "Write a comment first.");
  else if (text.length > MAX_COMMENT) flash(req, "error", `Comments can be up to ${MAX_COMMENT} characters.`);
  else await prisma.comment.create({ data: { postId, authorId: req.user.id, body: text } });
  goBack(req, res, `/posts/${postId}`);
}

// POST /comments/:id/delete. Your own comment, or any comment on your post.
async function removeComment(req, res) {
  const id = parseId(req.params.id);
  const me = req.user.id;
  const { count } = id
    ? await prisma.comment.deleteMany({ where: { id, OR: [{ authorId: me }, { post: { authorId: me } }] } })
    : { count: 0 };
  if (!count) throw new NotFound("That comment doesn't exist.");
  flash(req, "good", "Comment deleted.");
  goBack(req, res);
}

module.exports = { home, explore, show, create, remove, like: setLike(true), unlike: setLike(false), addComment, removeComment };
