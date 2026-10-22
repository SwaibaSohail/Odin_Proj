#!/usr/bin/env node
// Creates the tables and fills them with dummy users and messages.
// WARNING: this drops any existing users, messages and sessions first.
//
// Usage:
//   npm run seed                      (uses DATABASE_URL from .env)
//   npm run seed -- <database-url>    (e.g. your production database)
//
// The dummy users all get the same password: SEED_PASSWORD from .env,
// or "clubhouse123" if it isn't set. Set your own before seeding a live site.

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const SCHEMA = `
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS session;

CREATE TABLE users (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  is_member BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emails are used as usernames, so they must be unique regardless of case.
CREATE UNIQUE INDEX users_email_unique ON users (LOWER(email));

CREATE TABLE messages (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Deleting a user also deletes their messages.
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX messages_user_id_idx ON messages (user_id);

-- Log-in sessions (the same table connect-pg-simple would create).
CREATE TABLE session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX session_expire_idx ON session (expire);
`;

const USERS = [
  { key: "morgan", firstName: "Morgan", lastName: "Reyes", email: "admin@example.com", isMember: true, isAdmin: true },
  { key: "priya", firstName: "Priya", lastName: "Shah", email: "member@example.com", isMember: true, isAdmin: false },
  { key: "leo", firstName: "Leo", lastName: "Turner", email: "guest@example.com", isMember: false, isAdmin: false },
];

// [author, hours ago, title, body]
const MESSAGES = [
  ["morgan", 96, "House rules", "Be kind, keep it anonymous outside these walls, and put the good mugs back where you found them."],
  ["priya", 70, "Lost: one blue umbrella", "Left it by the coat rack on Friday. It has a duck-shaped handle, so it's definitely mine."],
  ["leo", 50, "Is this where the cool kids hang out?", "Signed up an hour ago and I still can't see who's who. Very mysterious."],
  ["morgan", 26, "Board games night", "Thursday at 7. Bring snacks. Whoever wins at Catan does the dishes."],
  ["priya", 9, "Who keeps leaving the record player on?", "Third night in a row. If it's you, at least pick something other than smooth jazz."],
  ["leo", 2, "Guess who", "Not telling. But I'm the one who finally fixed the wobbly table."],
];

async function main() {
  const connectionString = process.argv[2] || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No database URL. Set DATABASE_URL in .env or pass it as an argument.");
    process.exit(1);
  }

  const seedPassword = process.env.SEED_PASSWORD || "clubhouse123";
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log("Seeding database...");
    await client.query("BEGIN");
    await client.query(SCHEMA);

    const userIds = {};
    for (const user of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, is_member, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.firstName, user.lastName, user.email, passwordHash, user.isMember, user.isAdmin]
      );
      userIds[user.key] = rows[0].id;
    }

    for (const [author, hoursAgo, title, body] of MESSAGES) {
      await client.query(
        "INSERT INTO messages (title, body, user_id, created_at) VALUES ($1, $2, $3, NOW() - make_interval(hours => $4))",
        [title, body, userIds[author], hoursAgo]
      );
    }

    await client.query("COMMIT");
    console.log(`Done: ${USERS.length} users and ${MESSAGES.length} messages.`);
    console.log(`Dummy users (password "${seedPassword}"):`);
    for (const user of USERS) {
      const role = user.isAdmin ? "admin" : user.isMember ? "member" : "not a member";
      console.log(`  ${user.email}  (${role})`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
