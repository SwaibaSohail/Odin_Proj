#!/usr/bin/env node
// Creates a demo account with some folders and files to click around in.
// Running it again resets the demo account. Other accounts aren't touched.
//
// The demo password is SEED_PASSWORD from .env, or "demo12345" if it isn't set.

const path = require("node:path");
const zlib = require("node:zlib");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const storage = require("../lib/storage");
const { storageKeyFor, contentTypeFor } = require("../lib/upload");

const DEMO_EMAIL = "demo@example.com";

// A small PNG with a sunset-like gradient, so the demo has an image in it.
function sunsetPng(width = 160, height = 100) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3); // first byte: no filter
    for (let x = 0; x < width; x += 1) {
      const t = y / height;
      row[1 + x * 3] = Math.round(255 - 60 * t);
      row[2 + x * 3] = Math.round(170 - 120 * t);
      row[3 + x * 3] = Math.round(80 + 90 * t);
    }
    rows.push(row);
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const TOP_LEVEL_FILES = [
  ["welcome.txt", "Welcome to Filebox!\n\nUpload files, sort them into folders and share a folder with a link.\n"],
];

const FOLDERS = [
  {
    name: "Documents",
    files: [
      ["cover-letter.md", "# Cover letter\n\nDear hiring team,\n\nI'd love to join you as a junior developer.\n"],
      ["reading-list.txt", "1. Eloquent JavaScript\n2. You Don't Know JS\n3. The Pragmatic Programmer\n"],
    ],
    children: [
      {
        name: "Receipts",
        files: [
          ["groceries-october.csv", "date,shop,amount\n2026-10-03,Corner Market,24.50\n2026-10-11,FreshCo,61.20\n"],
          ["bike-repair.txt", "Bike repair, 12 Oct 2026\nNew chain and brake pads: $48\n"],
        ],
      },
    ],
  },
  {
    name: "Photos",
    files: [["sunset.png", sunsetPng()]],
  },
  {
    name: "Music",
    files: [],
  },
];

async function main() {
  const password = process.env.SEED_PASSWORD || "demo12345";

  // Remove the old demo account, its files in storage and everything in the database.
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { files: { select: { storageKey: true } } },
  });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
    await storage.removeQuietly(existing.files.map((file) => file.storageKey));
  }

  const user = await prisma.user.create({
    data: { name: "Demo User", email: DEMO_EMAIL, passwordHash: await bcrypt.hash(password, 10) },
  });

  async function addFile(name, content, folderId) {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const storageKey = storageKeyFor(user.id, name);
    const mimeType = contentTypeFor(name);
    const url = await storage.save({ key: storageKey, buffer, mimeType });
    await prisma.file.create({
      data: { name, size: buffer.length, mimeType, storageKey, url, ownerId: user.id, folderId },
    });
  }

  async function addFolder(node, parentId) {
    const folder = await prisma.folder.create({ data: { name: node.name, ownerId: user.id, parentId } });
    for (const [name, content] of node.files) await addFile(name, content, folder.id);
    for (const child of node.children || []) await addFolder(child, folder.id);
  }

  for (const [name, content] of TOP_LEVEL_FILES) await addFile(name, content, null);
  for (const node of FOLDERS) await addFolder(node, null);

  console.log(`Demo account ready: ${DEMO_EMAIL} / ${password} (storage: ${storage.name})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
