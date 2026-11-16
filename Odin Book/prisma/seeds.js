#!/usr/bin/env node
// Fills the site with sample people, posts, likes, comments and follows, so
// there's something to look at. Names, usernames and dates come from Faker.
// It never deletes anything, and it does nothing if the sample people are
// already there.
//
// The sample accounts use SEED_PASSWORD from .env. Without it they get random
// passwords, which is what you want on a live site.

const path = require("node:path");
const crypto = require("node:crypto");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");

const PEOPLE = 14;

const BIOS = [
  "Bakes bread, badly at first and better lately.",
  "Trail runner. Slow, but I always finish.",
  "Learning to code one confusing error at a time.",
  "Tea drinker, map collector, occasional gardener.",
  "I take photos of doors. There's no deeper meaning.",
  "Bookshop on weekdays, allotment on weekends.",
  "Dad of two, fixer of bikes, burner of toast.",
  "Mostly here for the dog pictures.",
  "Sketching my way around the city.",
  "Night-shift nurse. Awake when you aren't.",
  "Trying every dumpling place in town, in order.",
  "Amateur astronomer. Clouds are my enemy.",
  "",
  "Vinyl, long walks and strong opinions about soup.",
];

const POSTS = [
  "Finally got a sourdough loaf that didn't come out like a brick. Third attempt this week.",
  "Is there anything better than the first properly cold morning of autumn? Scarf weather is here.",
  "Spent an hour hunting a bug that turned out to be a missing comma. Going for a walk.",
  "The library has a seed swap shelf now. Took some beans, left some sunflowers.",
  "Ran my first 10k today. Slowly, and with a lot of complaining, but I ran all of it.",
  "Reminder that it's fine to read the same book three times if it makes you happy.",
  "Our street's cat has now visited every house except ours. I'm trying not to take it personally.",
  "Made too much soup again. If you live near me, there is soup.",
  "Two years of saying I'd fix the squeaky door. Took four minutes. Why am I like this.",
  "Saw the space station go over tonight. Never gets old.",
  "New rule: no phone until I've had breakfast. Day one went fine. Ask me again on Friday.",
  "The market had the first strawberries of the year. I bought an unreasonable amount.",
  "Hot take: the best seat on any bus is top deck, front left.",
  "Planted garlic today. See you in nine months, garlic.",
  "Just finished a jigsaw with one piece missing. Checking the dog.",
  "Anyone have a good recipe for dal? Mine always comes out a bit sad.\n\nAsking for me. It's for me.",
  "Rain on the tent, tea in the flask, nowhere to be. Ten out of ten.",
  "Learned today that you can just... ask the bakery for the ends of the loaf. Game changer.",
  "Rewatched the film I loved at fifteen. It's still great. Fifteen-year-old me had taste.",
  "My nan's advice of the day: never trust a quiet toddler or a cheap umbrella.",
  "Signed up for a pottery class. Expect a lot of lopsided bowls.",
  "Good walk, good coffee, good company. That's the whole post.",
  "Three tabs open about how to keep basil alive. The basil is not optimistic.",
  "Cycled to work for a whole week. My legs have filed a complaint.",
  "The moon was enormous tonight. Stood in the garden in my slippers for ages.",
  "Found my old sketchbook from school. Past me drew a LOT of horses.",
  "Tried the new noodle place by the station. Get the hand-pulled ones.",
  "Fixed the leaking tap with a video and a borrowed spanner. Feeling unstoppable.",
  "It's the small things. Today it was a stranger holding the door and saying 'take your time'.",
  "Weekend plan: absolutely nothing, and plenty of it.",
];

const COMMENTS = [
  "This made my day.",
  "Same here, honestly.",
  "I need to try this.",
  "Ha, been there.",
  "Well done! That's not easy.",
  "Save some for me.",
  "You've convinced me.",
  "The dog definitely has it.",
  "Top deck, front left. Correct.",
  "Love this.",
  "Adding this to my list.",
  "How long did it take?",
  "Brilliant.",
  "This is the content I'm here for.",
  "Hard agree.",
  "Photos next time, please!",
];

const HOUR = 60 * 60 * 1000;

async function main() {
  const { faker } = await import("@faker-js/faker");
  faker.seed(20261116);

  // The same seed always gives the same names, so the first one tells us
  // whether this has run before.
  const people = [];
  const taken = new Set();
  while (people.length < PEOPLE) {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const username = `${first}_${last}`.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    if (username.length < 3 || taken.has(username)) continue;
    taken.add(username);
    people.push({ username, displayName: `${first} ${last}`, bio: BIOS[people.length % BIOS.length] });
  }
  if (await prisma.user.findUnique({ where: { username: people[0].username }, select: { id: true } })) {
    console.log("The sample people are already there. Nothing to do.");
    return;
  }

  const password = process.env.SEED_PASSWORD || crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  const users = [];
  for (const [i, person] of people.entries()) {
    users.push(
      await prisma.user.create({
        data: {
          ...person,
          passwordHash,
          // A few of them approve their followers, to show follow requests.
          requiresApproval: i % 5 === 4,
          createdAt: faker.date.past({ years: 1 }),
        },
      }),
    );
  }

  // Everyone follows a handful of the others.
  const follows = [];
  for (const user of users) {
    const others = faker.helpers.arrayElements(users.filter((other) => other.id !== user.id), { min: 3, max: 7 });
    for (const other of others) follows.push({ followerId: user.id, followingId: other.id, status: "ACCEPTED" });
  }
  await prisma.follow.createMany({ data: follows });

  // Posts are spread over the last ten days, and saved oldest first so the newest have the highest ids.
  // The first posts go round everyone once, so nobody's profile is empty.
  const drafts = faker.helpers.shuffle(POSTS).map((body, i) => ({
    body,
    authorId: (i < users.length ? users[i] : faker.helpers.arrayElement(users)).id,
    createdAt: faker.date.recent({ days: 10, refDate: new Date(Date.now() - HOUR) }),
  }));
  drafts.sort((a, b) => a.createdAt - b.createdAt);

  let likes = 0;
  let comments = 0;
  for (const draft of drafts) {
    const post = await prisma.post.create({ data: draft });
    const readers = users.filter((user) => user.id !== post.authorId);

    const fans = faker.helpers.arrayElements(readers, { min: 0, max: 9 });
    await prisma.like.createMany({ data: fans.map((user) => ({ userId: user.id, postId: post.id })) });
    likes += fans.length;

    const replies = faker.helpers.arrayElements(readers, { min: 0, max: 3 }).map((user) => ({
      postId: post.id,
      authorId: user.id,
      body: faker.helpers.arrayElement(COMMENTS),
      createdAt: faker.date.between({ from: post.createdAt, to: new Date() }),
    }));
    replies.sort((a, b) => a.createdAt - b.createdAt);
    await prisma.comment.createMany({ data: replies });
    comments += replies.length;
  }

  console.log(`Done: ${users.length} people, ${drafts.length} posts, ${likes} likes, ${comments} comments and ${follows.length} follows.`);
  if (process.env.SEED_PASSWORD) {
    console.log(`Sign in as any of them, for example "${users[0].username}", with the password in SEED_PASSWORD.`);
  } else {
    console.log("SEED_PASSWORD isn't set, so the sample accounts have random passwords and can't be signed in to.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
