const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const { badRequest, handleValidation } = require("../lib/http");
const { MESSAGE_SELECT, messageJson } = require("../lib/json");
const { acceptImage, inspectImage } = require("../lib/images");

const PAGE_SIZE = 50;

// Reads ?after= or ?before= from the address. Missing is fine, nonsense isn't.
function cursor(value) {
  if (value === undefined) return undefined;
  return typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : null;
}

// GET /api/conversations/:id/messages
//   no query       the newest 50
//   ?before=<id>   the 50 before that message, for scrolling back
//   ?after=<id>    everything newer than that message, for checking for new ones
async function listMessages(req, res) {
  const conversationId = req.conversation.id;
  const after = cursor(req.query.after);
  const before = cursor(req.query.before);
  if (after === null || before === null) return badRequest(res, "That isn't a valid message id.");

  if (after !== undefined) {
    const messages = await prisma.message.findMany({
      where: { conversationId, id: { gt: after } },
      orderBy: { id: "asc" },
      take: 200,
      select: MESSAGE_SELECT,
    });
    return res.json({ messages: messages.map(messageJson) });
  }

  // Ask for one extra to learn whether there are older messages still to load.
  const newestFirst = await prisma.message.findMany({
    where: { conversationId, ...(before === undefined ? {} : { id: { lt: before } }) },
    orderBy: { id: "desc" },
    take: PAGE_SIZE + 1,
    select: MESSAGE_SELECT,
  });
  res.json({
    messages: newestFirst.slice(0, PAGE_SIZE).reverse().map(messageJson),
    hasMore: newestFirst.length > PAGE_SIZE,
  });
}

// POST /api/conversations/:id/messages
// Send { body } as JSON, or a form with "body" and a picture in "image".
const sendMessage = [
  acceptImage("image"),
  body("body")
    .optional()
    .isString()
    .withMessage("Messages must be text.")
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Messages can be up to 2,000 characters."),
  handleValidation,
  async (req, res) => {
    const conversationId = req.conversation.id;
    const senderId = req.user.id;
    const text = req.body?.body || "";
    const image = req.file ? inspectImage(req.file) : null;
    if (req.file && !image) return badRequest(res, "That file isn't a picture. Use a PNG, JPEG, GIF or WebP.");
    if (!text && !image) return badRequest(res, "Write a message or add a picture.");

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId, body: text, image: image ? { create: image } : undefined },
        select: MESSAGE_SELECT,
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } });
      await tx.member.update({
        where: { conversationId_userId: { conversationId, userId: senderId } },
        data: { lastReadMessageId: created.id },
      });
      return created;
    });
    res.status(201).json({ message: messageJson(message) });
  },
];

// PUT /api/conversations/:id/read { messageId }
// Marks everything up to that message as read. It never moves backwards.
const markRead = [
  body("messageId").isInt({ min: 1 }).withMessage("Say which message you've read up to.").toInt(),
  handleValidation,
  async (req, res) => {
    const conversationId = req.conversation.id;
    const latest = await prisma.message.findFirst({
      where: { conversationId, id: { lte: req.body.messageId } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    if (latest) {
      await prisma.member.updateMany({
        where: { conversationId, userId: req.user.id, lastReadMessageId: { lt: latest.id } },
        data: { lastReadMessageId: latest.id },
      });
    }
    res.status(204).end();
  },
];

module.exports = { listMessages, sendMessage, markRead };
