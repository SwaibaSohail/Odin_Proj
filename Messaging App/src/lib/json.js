// What to read from the database for each kind of record, and how it's sent
// to the browser. Password hashes and picture data never go through here.

const { isOnline } = require("./auth");

const imageUrl = (image) => (image ? `/api/images/${image.id}` : null);

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  about: true,
  lastSeenAt: true,
  createdAt: true,
  avatar: { select: { id: true } },
};

function userJson(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    about: user.about,
    avatarUrl: imageUrl(user.avatar),
    online: isOnline(user.lastSeenAt),
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
  };
}

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  kind: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, username: true, displayName: true, avatar: { select: { id: true } } } },
  image: { select: { id: true, width: true, height: true } },
};

function messageJson(message) {
  const { sender, image } = message;
  return {
    id: message.id,
    conversationId: message.conversationId,
    kind: message.kind.toLowerCase(),
    body: message.body,
    image: image ? { url: imageUrl(image), width: image.width, height: image.height } : null,
    sender: { id: sender.id, username: sender.username, displayName: sender.displayName, avatarUrl: imageUrl(sender.avatar) },
    createdAt: message.createdAt,
  };
}

// A conversation with its members and its newest message.
const CONVERSATION_SELECT = {
  id: true,
  isGroup: true,
  name: true,
  lastMessageAt: true,
  members: {
    orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
    select: { lastReadMessageId: true, user: { select: USER_SELECT } },
  },
  messages: { orderBy: { id: "desc" }, take: 1, select: MESSAGE_SELECT },
};

function conversationJson(conversation, unread = 0) {
  const [lastMessage] = conversation.messages;
  return {
    id: conversation.id,
    isGroup: conversation.isGroup,
    name: conversation.name,
    members: conversation.members.map((member) => ({
      ...userJson(member.user),
      lastReadMessageId: member.lastReadMessageId,
    })),
    lastMessage: lastMessage ? messageJson(lastMessage) : null,
    lastMessageAt: conversation.lastMessageAt,
    unread,
  };
}

module.exports = { USER_SELECT, userJson, MESSAGE_SELECT, messageJson, CONVERSATION_SELECT, conversationJson };
