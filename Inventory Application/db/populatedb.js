#!/usr/bin/env node
// Creates the tables and fills them with dummy data.
// WARNING: this drops any existing categories and items first.
//
// Usage:
//   npm run seed                      (uses DATABASE_URL from .env)
//   npm run seed -- <database-url>    (e.g. your production database)

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { Client } = require("pg");

const SCHEMA = `
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

-- Category names are unique regardless of upper/lower case.
CREATE UNIQUE INDEX categories_name_unique ON categories (LOWER(name));

CREATE TABLE items (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(100) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  -- A category can't be deleted while it still has items.
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX items_category_id_idx ON items (category_id);
`;

const DATA = [
  {
    name: "Guitars & Basses",
    description: "Acoustic, electric and bass guitars for every style.",
    items: [
      ["Player Stratocaster", "Fender", "Alder body, maple neck and three single-coil pickups.", 849.99, 6],
      ["Les Paul Standard '50s", "Gibson", "Mahogany body with a carved maple top and Burstbucker pickups.", 2799.0, 2],
      ["FG800 Acoustic Guitar", "Yamaha", "Solid spruce top dreadnought, great for beginners.", 219.99, 12],
      ["Precision Bass", "Fender", "Classic 4-string bass with a split-coil pickup.", 949.99, 0],
    ],
  },
  {
    name: "Keyboards & Pianos",
    description: "Digital pianos, synthesizers and stage keyboards.",
    items: [
      ["P-125 Digital Piano", "Yamaha", "88 weighted keys with a compact, portable design.", 699.99, 4],
      ["microKORG Synthesizer", "Korg", "37-key analog modeling synth with a built-in vocoder.", 449.0, 3],
      ["Stage 4 88", "Nord", "Flagship 88-key stage piano with organ and synth sections.", 5299.0, 1],
    ],
  },
  {
    name: "Drums & Percussion",
    description: "Acoustic kits, electronic kits and hand percussion.",
    items: [
      ["Export 5-Piece Drum Kit", "Pearl", "Complete kit with hardware and cymbals.", 899.0, 2],
      ["14\" Supraphonic Snare", "Ludwig", "Legendary aluminum shell snare drum.", 399.0, 5],
      ["Headliner Cajon", "Meinl", "Hardwood cajon with adjustable snare wires.", 139.99, 9],
      ["TD-07KV Electronic Kit", "Roland", "Mesh-head electronic kit with Bluetooth audio.", 1099.99, 0],
    ],
  },
  {
    name: "Wind Instruments",
    description: "Saxophones, brass and woodwinds.",
    items: [
      ["YAS-280 Alto Saxophone", "Yamaha", "Student alto sax with a lightweight case.", 1399.99, 3],
      ["YTR-2330 Trumpet", "Yamaha", "Durable student trumpet with a yellow brass bell.", 749.99, 4],
      ["JFL700 Student Flute", "Jupiter", "Silver-plated closed-hole flute.", 589.0, 7],
    ],
  },
  {
    name: "Accessories",
    description: "Strings, tuners, sticks, stands and more.",
    items: [
      ["Regular Slinky Strings 10-46 (3 pack)", "Ernie Ball", "Nickel-wound electric guitar strings.", 19.99, 48],
      ["SN-5 Clip-on Tuner", "Snark", "Chromatic tuner for guitar, bass and violin.", 14.99, 30],
      ["American Classic 5A Drumsticks", "Vic Firth", "Hickory sticks with wood tips, one pair.", 12.99, 60],
      ["KS7190 Keyboard Stand", "On-Stage", "Adjustable single-X keyboard stand.", 39.99, 2],
    ],
  },
];

async function main() {
  const connectionString = process.argv[2] || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No database URL. Set DATABASE_URL in .env or pass it as an argument.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log("Seeding database...");
    await client.query("BEGIN");
    await client.query(SCHEMA);

    for (const category of DATA) {
      const { rows } = await client.query(
        "INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id",
        [category.name, category.description]
      );
      for (const [name, brand, description, price, quantity] of category.items) {
        await client.query(
          `INSERT INTO items (name, brand, description, price, quantity, category_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [name, brand, description, price, quantity, rows[0].id]
        );
      }
    }

    await client.query("COMMIT");
    const itemCount = DATA.reduce((sum, category) => sum + category.items.length, 0);
    console.log(`Done: ${DATA.length} categories and ${itemCount} items.`);
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
