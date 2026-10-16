const { Router } = require("express");

const messages = [
  {
    text: "Hi there!",
    user: "Amando",
    added: new Date(),
  },
  {
    text: "Hello World!",
    user: "Charles",
    added: new Date(),
  },
];

const indexRouter = Router();

indexRouter.get("/", (req, res) => {
  res.render("index", { title: "Mini Messageboard", messages: messages });
});

indexRouter.get("/new", (req, res) => {
  res.render("form", { title: "New Message" });
});

indexRouter.post("/new", (req, res) => {
  const messageUser = (req.body.messageUser || "").trim();
  const messageText = (req.body.messageText || "").trim();

  if (!messageUser || !messageText) {
    return res.redirect("/new");
  }

  messages.push({ text: messageText, user: messageUser, added: new Date() });
  res.redirect("/");
});

indexRouter.get("/messages/:id", (req, res, next) => {
  const message = messages[Number(req.params.id)];

  if (!message) {
    return next();
  }

  res.render("message", { title: "Message Details", message: message });
});

module.exports = indexRouter;
