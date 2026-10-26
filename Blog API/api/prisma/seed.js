#!/usr/bin/env node
// Fills the blog with an author account, some posts and comments.
// WARNING: this deletes every existing user, post and comment first.
//
// The author logs in as "author" with SEED_PASSWORD from .env, or
// "notebook123" if it isn't set. Set your own before seeding a live site.

const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY);

const POSTS = [
  {
    title: "Why I'm building a blog from scratch",
    daysAgo: 21,
    body: `There are plenty of blogging platforms out there, so building my own sounds a bit silly. But it's the best excuse I've found to practise everything at once: a database, an API, logging in, and two separate websites that talk to it.

The plan is simple. One site is for reading, and anyone can leave a comment. The other is just for me, for writing drafts and deciding when they go live.

If you're reading this, the first part works.`,
    comments: [
      ["Maya", 20, "Love this idea. Building the thing you use is the best way to learn it."],
      ["Jordan", 19, "Following along! Are you going to add tags later?"],
    ],
  },
  {
    title: "What a JSON Web Token actually is",
    daysAgo: 12,
    body: `A JWT is a small piece of signed text. It has three parts separated by dots: a header, a payload with some facts (like your user id and when the token expires), and a signature.

The signature is the important bit. The server makes it with a secret only it knows, so if anyone changes the payload, the signature stops matching and the token is rejected.

That means the server doesn't have to remember who's logged in. It just checks the signature on every request. The trade-off is that a token can't easily be cancelled before it expires, so keep the lifetime short.`,
    comments: [["Sam", 11, "This is the clearest explanation I've read. The signature part finally clicked."]],
  },
  {
    title: "Drafts, and why they live in the database",
    daysAgo: 4,
    body: `Every post here starts as a draft. It's saved in the database like any other post, but with a "published" flag set to false.

The API only shows published posts to the public. When I'm logged in, it shows me my drafts too, so I can keep editing them until they're ready.

Publishing is just flipping that flag. The first time a post goes live it gets a publish date, and that date stays put even if I unpublish it for a quick fix.`,
    comments: [],
  },
  {
    title: "Notes on deploying three apps at once",
    draft: true,
    body: `Still working on this one. The API needs a host that runs Node, and the two websites can live anywhere that serves static files.

The tricky part is CORS: the API has to know which websites are allowed to call it.`,
    comments: [],
  },
];

async function main() {
  const password = process.env.SEED_PASSWORD || "notebook123";

  // Empty the tables and restart the ids, so the posts are always 1 to 4.
  await prisma.$executeRaw`TRUNCATE TABLE "Comment", "Post", "User" RESTART IDENTITY CASCADE`;

  const author = await prisma.user.create({
    data: {
      username: "author",
      name: "Demo Author",
      role: "AUTHOR",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  for (const post of POSTS) {
    const date = post.draft ? new Date() : daysAgo(post.daysAgo);
    await prisma.post.create({
      data: {
        title: post.title,
        body: post.body,
        published: !post.draft,
        publishedAt: post.draft ? null : date,
        createdAt: date,
        authorId: author.id,
        comments: {
          create: post.comments.map(([name, days, body]) => ({ name, body, createdAt: daysAgo(days) })),
        },
      },
    });
  }

  const published = POSTS.filter((post) => !post.draft).length;
  console.log(`Done: ${published} published posts and ${POSTS.length - published} draft.`);
  console.log(`Author log-in: author / ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
