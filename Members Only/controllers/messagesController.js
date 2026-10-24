const { body, validationResult } = require("express-validator");
const db = require("../db/queries");
const { parseId, flashAndRedirect } = require("../lib/helpers");

const validateMessage = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ max: 100 })
    .withMessage("Title must be 100 characters or fewer."),
  body("body")
    .trim()
    .notEmpty()
    .withMessage("Message is required.")
    .isLength({ max: 2000 })
    .withMessage("Message must be 2000 characters or fewer."),
];

async function messageList(req, res) {
  const isMember = Boolean(req.user?.is_member);
  const rows = await db.getAllMessages();

  // Non-members never receive the author or date, not even hidden in the page.
  const messages = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    author: isMember ? `${row.first_name} ${row.last_name}` : null,
    createdAt: isMember ? row.created_at : null,
  }));

  res.render("index", { title: "Message board", messages, isMember });
}

function newMessageGet(req, res) {
  res.render("new-message", { title: "New message", values: { title: "", body: "" }, fieldErrors: {} });
}

const newMessagePost = [
  validateMessage,
  async (req, res) => {
    const values = { title: req.body.title ?? "", body: req.body.body ?? "" };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("new-message", {
        title: "New message",
        values,
        fieldErrors: errors.mapped(),
      });
    }

    await db.insertMessage({ ...values, userId: req.user.id });
    return flashAndRedirect(req, res, "Message posted.", "/");
  },
];

async function deleteMessagePost(req, res) {
  const id = parseId(req.params.id);
  const deleted = id ? await db.deleteMessage(id) : false;
  if (!deleted) {
    return res.status(404).render("404", { title: "Not found", message: "That message doesn't exist." });
  }

  return flashAndRedirect(req, res, "Message deleted.", "/");
}

module.exports = {
  messageList,
  newMessageGet,
  newMessagePost,
  deleteMessagePost,
};
