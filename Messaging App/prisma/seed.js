#!/usr/bin/env node
// Adds five demo accounts with a few chats between them, so the app isn't
// empty the first time you open it. It never deletes anything, and it does
// nothing if the demo accounts are already there.
//
// The demo accounts use SEED_PASSWORD from .env. Without it they get random
// passwords, which is what you want on a live site.

const path = require("node:path");
const crypto = require("node:crypto");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const ago = (ms) => new Date(Date.now() - ms);

const PEOPLE = [
  { username: "maya", displayName: "Maya Ortiz", about: "Usually out on a trail somewhere.", lastSeenAt: ago(3 * HOUR) },
  { username: "jordan", displayName: "Jordan Blake", about: "Coffee first, messages second.", lastSeenAt: ago(25 * MINUTE) },
  { username: "sam", displayName: "Sam Lee", about: "Probably cooking something.", lastSeenAt: ago(50 * HOUR) },
  { username: "priya", displayName: "Priya Nair", about: "Night owl. Slow to reply before noon.", lastSeenAt: ago(5 * HOUR) },
  { username: "tom", displayName: "Tom Becker", about: "", lastSeenAt: null },
];

// Each message is [who, how long ago, text]. `unread` lists how many of the
// newest messages each person hasn't read yet.
const CHATS = [
  {
    group: "Weekend hike",
    members: ["maya", "jordan", "sam", "priya"],
    unread: { maya: 2 },
    messages: [
      ["maya", 52 * HOUR, "Forecast for Saturday looks clear. Who's in for the ridge trail?"],
      ["jordan", 51 * HOUR, "Me, as long as we're not starting at dawn again"],
      ["sam", 50 * HOUR, "In. I'll bring lunch for everyone, any requests?"],
      ["priya", 49 * HOUR, "Anything but those egg sandwiches from last time"],
      ["sam", 49 * HOUR - 2 * MINUTE, "Harsh. But fair."],
      ["maya", 28 * HOUR, "Okay: 8:30 at the car park by the visitor centre. It's about four hours there and back."],
      ["jordan", 27 * HOUR, "8:30 I can do"],
      ["priya", 4 * HOUR, "Can someone give me a lift? My bike has a flat"],
      ["jordan", 26 * MINUTE, "I can pick you up at 8, I go past yours anyway"],
    ],
  },
  {
    members: ["maya", "jordan"],
    unread: { maya: 1 },
    messages: [
      ["jordan", 30 * HOUR, "Do you still have my head torch from the last trip?"],
      ["maya", 29 * HOUR, "Yes! Sorry, it's been sitting in my bag for a month"],
      ["maya", 29 * HOUR - MINUTE, "I'll bring it Saturday"],
      ["jordan", 27 * MINUTE, "No rush. Bring the good trail mix too and we're even"],
    ],
  },
  {
    members: ["sam", "priya"],
    messages: [
      ["priya", 75 * HOUR, "What was the name of that noodle place near the station?"],
      ["sam", 74 * HOUR, "Lanzhou House. Get the hand-pulled ones, not the knife-cut"],
      ["priya", 74 * HOUR - 5 * MINUTE, "You're a hero"],
    ],
  },
  {
    group: "Flat 4B",
    members: ["sam", "priya", "tom"],
    messages: [
      ["tom", 100 * HOUR, "Landlord is sending someone to look at the boiler on Thursday morning"],
      ["priya", 99 * HOUR, "I'm working from home that day, I can let them in"],
      ["sam", 98 * HOUR, "Thanks Priya. Also it's my turn for bins, I haven't forgotten"],
    ],
  },
];

async function main() {
  if (await prisma.user.findUnique({ where: { username: PEOPLE[0].username }, select: { id: true } })) {
    console.log("The demo accounts are already there. Nothing to do.");
    return;
  }
  const taken = await prisma.user.findMany({
    where: { username: { in: PEOPLE.map((person) => person.username) } },
    select: { username: true },
  });
  if (taken.length) {
    console.log(`Skipped: someone already uses the username "${taken[0].username}".`);
    return;
  }

  const password = process.env.SEED_PASSWORD || crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  const ids = {};
  for (const person of PEOPLE) {
    const user = await prisma.user.create({ data: { ...person, passwordHash, createdAt: ago(120 * HOUR) } });
    ids[person.username] = user.id;
  }

  for (const chat of CHATS) {
    const [first] = chat.members;
    const started = chat.messages[0][1] + MINUTE;
    const pair = chat.members.map((name) => ids[name]).sort((a, b) => a - b);
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: Boolean(chat.group),
        name: chat.group || null,
        directKey: chat.group ? null : pair.join(":"),
        createdAt: ago(started),
        members: { create: chat.members.map((name) => ({ userId: ids[name], joinedAt: ago(started) })) },
      },
    });

    const saved = [];
    if (chat.group) {
      saved.push(
        await prisma.message.create({
          data: { conversationId: conversation.id, senderId: ids[first], kind: "EVENT", body: "created the group", createdAt: ago(started) },
        }),
      );
    }
    for (const [name, when, text] of chat.messages) {
      saved.push(
        await prisma.message.create({
          data: { conversationId: conversation.id, senderId: ids[name], body: text, createdAt: ago(when) },
        }),
      );
    }

    const newest = saved[saved.length - 1];
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: newest.createdAt } });
    for (const name of chat.members) {
      const behind = chat.unread?.[name] || 0;
      await prisma.member.update({
        where: { conversationId_userId: { conversationId: conversation.id, userId: ids[name] } },
        data: { lastReadMessageId: saved[saved.length - 1 - behind].id },
      });
    }
  }

  console.log(`Done: ${PEOPLE.length} demo accounts and ${CHATS.length} chats.`);
  if (process.env.SEED_PASSWORD) {
    console.log(`Log in as ${PEOPLE.map((person) => person.username).join(", ")} with the password in SEED_PASSWORD.`);
  } else {
    console.log("SEED_PASSWORD isn't set, so the demo accounts have random passwords and can't be logged in to.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
