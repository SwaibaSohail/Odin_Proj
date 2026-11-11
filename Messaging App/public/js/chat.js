// The right side: one chat's messages and the box for writing new ones.
import { request } from "./api.js";
import { state, emit, findConversation, peerOf, titleOf } from "./store.js";
import { el, avatar, clock, dayLabel, sameDay, presence, linkify, plural } from "./ui.js";
import { isPicture, prepareImage } from "./images.js";
import { showUser, groupInfo, showPicture } from "./dialogs.js";

const pane = document.querySelector("#chat");
const emptyPane = document.querySelector("#chat-empty");
const openPane = document.querySelector("#chat-open");
const titleButton = document.querySelector("#chat-title");
const scroller = document.querySelector("#messages");
const list = document.querySelector("#message-list");
const pendingList = document.querySelector("#pending-list");
const loadEarlier = document.querySelector("#load-earlier");
const jumpNew = document.querySelector("#jump-new");
const composer = document.querySelector("#composer");
const text = document.querySelector("#text");
const sendButton = document.querySelector("#send");
const fileInput = document.querySelector("#file");
const attachmentBox = document.querySelector("#attachment");
const attachmentPreview = document.querySelector("#attachment-preview");
const attachmentName = document.querySelector("#attachment-name");
const errorLine = document.querySelector("#composer-error");

// Messages from one person within this long of each other are shown as a run.
const RUN_MS = 5 * 60 * 1000;
// On phones Enter starts a new line, because there's a Send button under your thumb.
const touch = window.matchMedia("(pointer: coarse)").matches;

let conversation = null;
let messages = [];
let known = new Set();
let loaded = false;
let opening = 0; // goes up each time a chat is opened, so slow replies for an old one are dropped
let checking = false;
let attachment = null; // { file, url, name }
let outbox = Promise.resolve(); // messages are sent one after another, in the order they were written
let headerDrawn = "";
const drafts = new Map();
const receipt = el("li", { class: "receipt", text: "Seen" });

const isMine = (message) => message.sender.id === state.me.id;
const newestId = () => (messages.length ? messages[messages.length - 1].id : 0);
const atBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;

// True while you're reading the newest messages. The view then stays at the
// bottom when things change size: fonts and pictures loading, the window, the
// writing box growing.
let pinned = true;
const scrollToBottom = () => {
  pinned = true;
  scroller.scrollTop = scroller.scrollHeight;
};
const stayPinned = new ResizeObserver(() => {
  if (pinned) scroller.scrollTop = scroller.scrollHeight;
});

// ---------------------------------------------------------------- Drawing messages

function startsRun(message, previous) {
  return (
    !previous ||
    previous.kind === "event" ||
    previous.sender.id !== message.sender.id ||
    !sameDay(previous.createdAt, message.createdAt) ||
    new Date(message.createdAt) - new Date(previous.createdAt) > RUN_MS
  );
}

function pictureNode(message) {
  const { url, width, height } = message.image;
  const description = `Picture from ${message.sender.displayName}`;
  const button = el("button", { type: "button", class: "msg-image", "data-picture": url, "aria-label": `Open ${description.toLowerCase()}` }, [
    el("img", { src: url, width, height, alt: description, loading: "lazy" }),
  ]);
  // Up to 320px wide. Small pictures stay their own size rather than being stretched.
  button.style.width = `${Math.min(320, width)}px`;
  return button;
}

function messageNode(message, previous) {
  const mine = isMine(message);
  const first = startsRun(message, previous);
  const { sender } = message;

  // In a group, the first message of a run shows who it's from.
  let face = null;
  if (conversation.isGroup && !mine) {
    face = first
      ? el("button", { type: "button", class: "msg-avatar", "data-profile": sender.username, "aria-label": `${sender.displayName}'s profile` }, avatar(sender, { size: 28 }))
      : el("span", { class: "msg-avatar" });
  }
  return el("li", { class: `msg ${mine ? "mine" : "theirs"}${first ? " first" : ""}`, "data-id": message.id }, [
    face,
    el("div", { class: message.image ? "bubble with-image" : "bubble" }, [
      face && first ? el("p", { class: "msg-sender", text: sender.displayName }) : null,
      message.image ? pictureNode(message) : null,
      // The time sits at the end of the last line of text when there's room.
      el("p", { class: "msg-text" }, [
        ...linkify(message.body),
        el("time", { class: "msg-time", datetime: message.createdAt, text: clock(message.createdAt) }),
      ]),
    ]),
  ]);
}

// The list items for one message, with a date line first if it starts a new day.
function nodesFor(message, previous) {
  const nodes = [];
  if (!previous || !sameDay(previous.createdAt, message.createdAt)) {
    nodes.push(el("li", { class: "day" }, el("span", { text: dayLabel(message.createdAt) })));
  }
  if (message.kind === "event") {
    nodes.push(el("li", { class: "event", text: `${isMine(message) ? "You" : message.sender.displayName} ${message.body}` }));
  } else {
    nodes.push(messageNode(message, previous));
  }
  return nodes;
}

function drawAll() {
  const nodes = [];
  let previous = null;
  for (const message of messages) {
    nodes.push(...nodesFor(message, previous));
    previous = message;
  }
  list.replaceChildren(...nodes);
  drawReceipt();
}

// "Seen" under your last message, once the other person has read it.
function drawReceipt() {
  const last = messages[messages.length - 1];
  const seen =
    conversation && !conversation.isGroup && last && last.kind === "text" && isMine(last) &&
    peerOf(conversation).lastReadMessageId >= last.id;
  if (seen) list.append(receipt);
  else receipt.remove();
}

function drawHeader() {
  const who = conversation.isGroup ? conversation : peerOf(conversation);
  const online = conversation.members.filter((member) => member.online || member.id === state.me.id).length;
  const status = conversation.isGroup ? `${plural(conversation.members.length, "member")}, ${online} online` : presence(who);
  const signature = JSON.stringify([conversation.id, titleOf(conversation), who.avatarUrl, who.online, status]);
  if (signature === headerDrawn) return;
  headerDrawn = signature;

  titleButton.replaceChildren(
    avatar(who, { dot: !conversation.isGroup }),
    el("span", { class: "chat-title-text" }, [
      el("span", { class: "chat-name", text: titleOf(conversation) }),
      el("span", { class: `chat-status${!conversation.isGroup && who.online ? " status-online" : ""}`, text: status }),
    ]),
  );
}

// Adds messages that aren't showing yet. Returns true if there were any.
function addMessages(incoming) {
  const fresh = incoming.filter((message) => !known.has(message.id));
  if (!fresh.length) return false;

  const wasAtBottom = atBottom();
  let previous = messages[messages.length - 1];
  const inOrder = fresh[0].id > newestId();
  for (const message of fresh) known.add(message.id);
  messages.push(...fresh);

  if (inOrder) {
    for (const message of fresh) {
      list.append(...nodesFor(message, previous));
      previous = message;
    }
    drawReceipt();
  } else {
    // Something arrived out of order, so put everything in order and redraw.
    messages.sort((a, b) => a.id - b.id);
    drawAll();
  }

  if (wasAtBottom || fresh.some(isMine)) scrollToBottom();
  else jumpNew.hidden = false;
  return true;
}

// Tells the server how far you've read, if you're looking at the newest
// message. Returns true if that was news.
function markRead() {
  if (!conversation || !loaded || !messages.length || document.hidden || !atBottom()) return false;
  jumpNew.hidden = true;
  const me = conversation.members.find((member) => member.id === state.me.id);
  const last = newestId();
  const hadUnread = conversation.unread > 0;
  conversation.unread = 0;
  if (!me || me.lastReadMessageId >= last) return hadUnread;
  me.lastReadMessageId = last;
  request(`/conversations/${conversation.id}/read`, { method: "PUT", body: { messageId: last } }).catch(() => {});
  return true;
}

// ---------------------------------------------------------------- Opening and closing

function saveDraft() {
  if (!conversation) return;
  if (text.value) drafts.set(conversation.id, text.value);
  else drafts.delete(conversation.id);
}

function reset() {
  opening += 1;
  messages = [];
  known = new Set();
  loaded = false;
  pinned = true;
  headerDrawn = "";
  list.replaceChildren();
  pendingList.replaceChildren();
  titleButton.replaceChildren();
  loadEarlier.hidden = true;
  jumpNew.hidden = true;
  errorLine.textContent = "";
  clearAttachment();
}

export async function open(id) {
  if (state.openId === id) return;
  saveDraft();
  reset();
  const ticket = opening;
  state.openId = id;
  conversation = findConversation(id);

  emptyPane.hidden = true;
  openPane.hidden = false;
  document.body.classList.add("chat-active");
  text.value = drafts.get(id) || "";
  resize();
  updateSend();

  try {
    if (!conversation) {
      // Not in the list: a chat with no messages yet, or an address typed by hand.
      const data = await request(`/conversations/${id}`);
      if (ticket !== opening) return;
      conversation = data.conversation;
      state.extra = conversation;
    }
    drawHeader();
    const page = await request(`/conversations/${id}/messages`);
    if (ticket !== opening) return;
    for (const message of page.messages) known.add(message.id);
    messages = page.messages;
    drawAll();
    loadEarlier.hidden = !page.hasMore;
    loaded = true;
    scrollToBottom();
    if (markRead()) emit("conversations");
    if (!touch) text.focus();
  } catch (err) {
    if (ticket !== opening) return;
    if (err.status === 404) window.location.hash = "#/";
    else list.replaceChildren(el("li", { class: "event", text: err.message }));
  }
}

export function close() {
  if (state.openId === null) return;
  saveDraft();
  reset();
  state.openId = null;
  conversation = null;
  openPane.hidden = true;
  emptyPane.hidden = false;
  document.body.classList.remove("chat-active");
}

// Called every few seconds, after the chat list has been refreshed: picks up
// new names and read marks, and fetches any messages that have arrived.
export async function sync() {
  if (!conversation || !loaded || checking) return;
  const ticket = opening;
  const latest = findConversation(conversation.id);
  if (!latest) {
    // A group that's gone from your list is one you've left somewhere else.
    if (conversation.isGroup) window.location.hash = "#/";
    return;
  }
  conversation = latest;
  drawHeader();

  if ((conversation.lastMessage?.id || 0) > newestId()) {
    checking = true;
    try {
      const { messages: more } = await request(`/conversations/${conversation.id}/messages?after=${newestId()}`);
      if (ticket === opening) addMessages(more);
    } finally {
      checking = false;
    }
  }
  if (ticket !== opening) return;
  markRead();
  drawReceipt();
}

// ---------------------------------------------------------------- Writing

function resize() {
  text.style.height = "auto";
  text.style.height = `${Math.min(text.scrollHeight + 2, 140)}px`;
}

function updateSend() {
  sendButton.disabled = !text.value.trim() && !attachment;
}

function showAttachment(picture) {
  attachment = picture;
  attachmentPreview.src = picture.url;
  attachmentName.textContent = picture.name;
  attachmentBox.hidden = false;
  updateSend();
}

// Takes the picture off the message being written. `forget` also frees the preview.
function clearAttachment(forget = true) {
  if (attachment && forget) URL.revokeObjectURL(attachment.url);
  attachment = null;
  attachmentBox.hidden = true;
  attachmentPreview.removeAttribute("src");
}

async function attach(file) {
  errorLine.textContent = "";
  if (!isPicture(file)) {
    errorLine.textContent = "Only PNG, JPEG, GIF and WebP pictures can be sent.";
    return;
  }
  try {
    const prepared = await prepareImage(file);
    clearAttachment();
    showAttachment({ file: prepared, url: URL.createObjectURL(prepared), name: file.name || "Pasted picture" });
    text.focus();
  } catch (err) {
    errorLine.textContent = err.message;
  }
}

// A greyed-out copy of a message that's on its way to the server.
function pendingNode(body, picture) {
  return el("li", { class: "msg mine first pending" }, el("div", { class: picture ? "bubble with-image" : "bubble" }, [
    picture ? el("span", { class: "msg-image" }, el("img", { src: picture.url, alt: "" })) : null,
    el("p", { class: "msg-text" }, [body, el("span", { class: "msg-time", text: "Sending" })]),
  ]));
}

// Clears the box straight away, so the next message can be written while
// this one is being sent. If it fails, it goes back in the box.
function send(event) {
  event.preventDefault();
  const body = text.value.trim();
  const picture = attachment;
  if (!conversation || (!body && !picture)) return;

  const { id } = conversation;
  const waiting = pendingNode(body, picture);
  pendingList.append(waiting);
  text.value = "";
  drafts.delete(id);
  clearAttachment(false);
  errorLine.textContent = "";
  resize();
  updateSend();
  scrollToBottom();
  if (!touch) text.focus();

  outbox = outbox.then(async () => {
    let payload = { body };
    if (picture) {
      payload = new FormData();
      payload.append("body", body);
      payload.append("image", picture.file);
    }
    try {
      const { message } = await request(`/conversations/${id}/messages`, { method: "POST", body: payload });
      waiting.remove();
      if (picture) URL.revokeObjectURL(picture.url);
      if (conversation?.id === id) addMessages([message]);
      emit("refresh");
    } catch (err) {
      waiting.remove();
      if (conversation?.id !== id) return;
      errorLine.textContent = `${err.details?.[0]?.message || err.message} Your message wasn't sent.`;
      if (!text.value) text.value = body;
      if (picture && !attachment) showAttachment(picture);
      resize();
      updateSend();
    }
  });
}

composer.addEventListener("submit", send);
text.addEventListener("input", () => {
  resize();
  updateSend();
});
text.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing || touch) return;
  event.preventDefault();
  composer.requestSubmit();
});
text.addEventListener("paste", (event) => {
  const picture = [...event.clipboardData.files].find(isPicture);
  if (!picture) return;
  event.preventDefault();
  attach(picture);
});

document.querySelector("#attach").addEventListener("click", () => fileInput.click());
document.querySelector("#attachment-remove").addEventListener("click", () => {
  clearAttachment();
  updateSend();
});
fileInput.addEventListener("change", () => {
  const [file] = fileInput.files;
  fileInput.value = "";
  if (file) attach(file);
});

// Dropping a picture onto the chat attaches it.
const draggingFiles = (event) => conversation && [...event.dataTransfer.types].includes("Files");
pane.addEventListener("dragover", (event) => {
  if (!draggingFiles(event)) return;
  event.preventDefault();
  pane.classList.add("dragging");
});
pane.addEventListener("dragleave", (event) => {
  if (!pane.contains(event.relatedTarget)) pane.classList.remove("dragging");
});
pane.addEventListener("drop", (event) => {
  if (!draggingFiles(event)) return;
  event.preventDefault();
  pane.classList.remove("dragging");
  const [file] = event.dataTransfer.files;
  if (file) attach(file);
});

// ---------------------------------------------------------------- Looking around

loadEarlier.addEventListener("click", async () => {
  if (!messages.length) return;
  const ticket = opening;
  loadEarlier.disabled = true;
  try {
    const page = await request(`/conversations/${conversation.id}/messages?before=${messages[0].id}`);
    if (ticket !== opening) return;
    // Keep the message you were looking at in the same place on screen.
    const fromBottom = scroller.scrollHeight - scroller.scrollTop;
    const older = page.messages.filter((message) => !known.has(message.id));
    for (const message of older) known.add(message.id);
    messages = [...older, ...messages];
    drawAll();
    scroller.scrollTop = scroller.scrollHeight - fromBottom;
    loadEarlier.hidden = !page.hasMore;
  } catch (err) {
    errorLine.textContent = err.message;
  } finally {
    loadEarlier.disabled = false;
  }
});

jumpNew.addEventListener("click", () => {
  scrollToBottom();
  if (markRead()) emit("conversations");
});

scroller.addEventListener(
  "scroll",
  () => {
    pinned = atBottom();
    if (markRead()) emit("conversations");
  },
  { passive: true },
);
for (const box of [scroller, list, pendingList]) stayPinned.observe(box);

titleButton.addEventListener("click", () => {
  if (!conversation) return;
  if (conversation.isGroup) groupInfo(conversation);
  else showUser(peerOf(conversation));
});

list.addEventListener("click", async (event) => {
  const picture = event.target.closest("[data-picture]");
  if (picture) return showPicture(picture.dataset.picture, picture.querySelector("img").alt);

  const profile = event.target.closest("[data-profile]");
  if (!profile) return;
  try {
    showUser((await request(`/users/${profile.dataset.profile}`)).user);
  } catch (err) {
    errorLine.textContent = err.message;
  }
});
