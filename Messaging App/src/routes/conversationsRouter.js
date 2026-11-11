const { Router } = require("express");
const conversations = require("../controllers/conversationsController");
const messages = require("../controllers/messagesController");
const { sendLimiter } = require("../lib/limits");

const conversationsRouter = Router();
const { requireMember, requireGroup } = conversations;

conversationsRouter.get("/", conversations.listConversations);
conversationsRouter.post("/direct", conversations.openDirect);
conversationsRouter.post("/groups", conversations.createGroup);

// Everything below is about one chat, and only for the people in it.
conversationsRouter.get("/:id", requireMember, conversations.getConversation);
conversationsRouter.patch("/:id", requireMember, requireGroup, conversations.renameGroup);
conversationsRouter.post("/:id/members", requireMember, requireGroup, conversations.addMembers);
conversationsRouter.delete("/:id/members/me", requireMember, requireGroup, conversations.leaveGroup);

conversationsRouter.get("/:id/messages", requireMember, messages.listMessages);
conversationsRouter.post("/:id/messages", requireMember, sendLimiter, messages.sendMessage);
conversationsRouter.put("/:id/read", requireMember, messages.markRead);

module.exports = conversationsRouter;
