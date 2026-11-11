const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const { parseId, notFound, conflict, badRequest, handleValidation, listNames } = require("../lib/http");
const { CONVERSATION_SELECT, conversationJson } = require("../lib/json");

const NOT_FOUND = "That chat doesn't exist.";
const MAX_GROUP_SIZE = 50;

// Loads your place in the chat named in the address. If you aren't in it, you
// get the same 404 as for a chat that doesn't exist.
async function requireMember(req, res, next) {
  const id = parseId(req.params.id);
  const member =
    id &&
    (await prisma.member.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: req.user.id } },
      select: { conversation: { select: { id: true, isGroup: true, name: true } } },
    }));
  if (!member) return notFound(res, NOT_FOUND);
  req.conversation = member.conversation;
  next();
}

function requireGroup(req, res, next) {
  if (!req.conversation.isGroup) return badRequest(res, "You can only do that in a group.");
  next();
}

// How many messages from other people you haven't read yet, for each chat.
async function unreadCounts(userId) {
  const rows = await prisma.$queryRaw`
    SELECT m."conversationId" AS id, COUNT(*)::int AS unread
    FROM "Message" m
    JOIN "Member" me ON me."conversationId" = m."conversationId" AND me."userId" = ${userId}
    WHERE m.id > me."lastReadMessageId" AND m."senderId" <> ${userId}
    GROUP BY m."conversationId"`;
  return new Map(rows.map((row) => [row.id, row.unread]));
}

async function conversationById(id, userId) {
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id }, select: CONVERSATION_SELECT });
  return conversationJson(conversation, (await unreadCounts(userId)).get(id) || 0);
}

// Adds a note like "created the group" to a chat. Whoever did it has seen it already.
async function addEvent(tx, conversationId, senderId, text) {
  const message = await tx.message.create({
    data: { conversationId, senderId, kind: "EVENT", body: text },
    select: { id: true, createdAt: true },
  });
  await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });
  await tx.member.updateMany({
    where: { conversationId, userId: senderId },
    data: { lastReadMessageId: message.id },
  });
}

const nameRule = () =>
  body("name")
    .isString()
    .withMessage("Give the group a name.")
    .trim()
    .customSanitizer((value) => value.replace(/\s+/g, " "))
    .notEmpty()
    .withMessage("Give the group a name.")
    .isLength({ max: 50 })
    .withMessage("Group names can be up to 50 characters.");

const peopleRule = (field) =>
  body(field)
    .isArray({ min: 1, max: MAX_GROUP_SIZE })
    .withMessage("Choose at least one person.")
    .bail()
    .custom((ids) => ids.every((id) => Number.isInteger(id) && id > 0))
    .withMessage("Choose people from the list.");

// The people with these ids, or null if any of them don't exist.
async function findPeople(ids) {
  const people = await prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });
  return people.length === ids.length ? people : null;
}

// GET /api/conversations. Your chats, newest first. A chat with no messages
// yet stays out of the list until someone says something.
async function listConversations(req, res) {
  const me = req.user.id;
  const [conversations, unread] = await Promise.all([
    prisma.conversation.findMany({
      where: { members: { some: { userId: me } }, messages: { some: {} } },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      select: CONVERSATION_SELECT,
    }),
    unreadCounts(me),
  ]);
  res.json({ conversations: conversations.map((c) => conversationJson(c, unread.get(c.id) || 0)) });
}

// GET /api/conversations/:id
async function getConversation(req, res) {
  res.json({ conversation: await conversationById(req.conversation.id, req.user.id) });
}

// POST /api/conversations/direct { userId }
// Opens your chat with someone, creating it the first time.
const openDirect = [
  body("userId").isInt({ min: 1 }).withMessage("Choose someone to message.").toInt(),
  handleValidation,
  async (req, res) => {
    const me = req.user.id;
    const other = req.body.userId;
    if (other === me) return badRequest(res, "You can't message yourself.");
    if (!(await findPeople([other]))) return notFound(res, "That person doesn't exist.");

    const directKey = `${Math.min(me, other)}:${Math.max(me, other)}`;
    const find = () => prisma.conversation.findUnique({ where: { directKey }, select: { id: true } });
    let conversation = await find();
    let created = false;
    if (!conversation) {
      try {
        conversation = await prisma.conversation.create({
          data: { directKey, members: { create: [{ userId: me }, { userId: other }] } },
          select: { id: true },
        });
        created = true;
      } catch (err) {
        // Both people opened the chat at the same moment.
        if (err.code !== "P2002") throw err;
        conversation = await find();
      }
    }
    res.status(created ? 201 : 200).json({ conversation: await conversationById(conversation.id, me) });
  },
];

// POST /api/conversations/groups { name, memberIds }
const createGroup = [
  nameRule(),
  peopleRule("memberIds"),
  handleValidation,
  async (req, res) => {
    const me = req.user.id;
    const others = [...new Set(req.body.memberIds)].filter((id) => id !== me);
    if (others.length === 0) return badRequest(res, "Choose at least one other person.");
    if (others.length + 1 > MAX_GROUP_SIZE) return badRequest(res, `Groups can have up to ${MAX_GROUP_SIZE} people.`);
    if (!(await findPeople(others))) return badRequest(res, "Some of those people don't exist.");

    const id = await prisma.$transaction(async (tx) => {
      const group = await tx.conversation.create({
        data: {
          isGroup: true,
          name: req.body.name,
          members: { create: [me, ...others].map((userId) => ({ userId })) },
        },
        select: { id: true },
      });
      await addEvent(tx, group.id, me, "created the group");
      return group.id;
    });
    res.status(201).json({ conversation: await conversationById(id, me) });
  },
];

// PATCH /api/conversations/:id { name }. Anyone in a group can rename it.
const renameGroup = [
  nameRule(),
  handleValidation,
  async (req, res) => {
    const { id, name: oldName } = req.conversation;
    const { name } = req.body;
    if (name !== oldName) {
      await prisma.$transaction(async (tx) => {
        await tx.conversation.update({ where: { id }, data: { name } });
        await addEvent(tx, id, req.user.id, `renamed the group to "${name}"`);
      });
    }
    res.json({ conversation: await conversationById(id, req.user.id) });
  },
];

// POST /api/conversations/:id/members { userIds }. Anyone in a group can add people.
const addMembers = [
  peopleRule("userIds"),
  handleValidation,
  async (req, res) => {
    const { id } = req.conversation;
    const current = await prisma.member.findMany({ where: { conversationId: id }, select: { userId: true } });
    const already = new Set(current.map((member) => member.userId));
    const ids = [...new Set(req.body.userIds)].filter((userId) => !already.has(userId));
    if (ids.length === 0) return conflict(res, "They're already in this group.");
    if (current.length + ids.length > MAX_GROUP_SIZE) return badRequest(res, `Groups can have up to ${MAX_GROUP_SIZE} people.`);
    const people = await findPeople(ids);
    if (!people) return badRequest(res, "Some of those people don't exist.");

    await prisma.$transaction(async (tx) => {
      // New people can scroll back through the group, but only what comes
      // after they joined counts as unread.
      const latest = await tx.message.findFirst({
        where: { conversationId: id },
        orderBy: { id: "desc" },
        select: { id: true },
      });
      await tx.member.createMany({
        data: ids.map((userId) => ({ conversationId: id, userId, lastReadMessageId: latest ? latest.id : 0 })),
      });
      await addEvent(tx, id, req.user.id, `added ${listNames(people.map((person) => person.displayName))}`);
    });
    res.status(201).json({ conversation: await conversationById(id, req.user.id) });
  },
];

// DELETE /api/conversations/:id/members/me. Leaves a group.
async function leaveGroup(req, res) {
  const { id } = req.conversation;
  const me = req.user.id;
  await prisma.$transaction(async (tx) => {
    await addEvent(tx, id, me, "left the group");
    await tx.member.delete({ where: { conversationId_userId: { conversationId: id, userId: me } } });
    // An empty group has nobody left to read it.
    const remaining = await tx.member.count({ where: { conversationId: id } });
    if (remaining === 0) await tx.conversation.delete({ where: { id } });
  });
  res.status(204).end();
}

module.exports = {
  requireMember,
  requireGroup,
  listConversations,
  getConversation,
  openDirect,
  createGroup,
  renameGroup,
  addMembers,
  leaveGroup,
};
