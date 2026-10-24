// Stores files in the "uploads" folder next to the app. Good for local
// development, but files are lost on hosts with temporary disks.

const fs = require("node:fs/promises");
const path = require("node:path");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

function fullPath(key) {
  return path.join(UPLOAD_DIR, key);
}

async function save({ key, buffer }) {
  await fs.mkdir(path.dirname(fullPath(key)), { recursive: true });
  await fs.writeFile(fullPath(key), buffer);
  return `uploads/${key}`;
}

async function remove(keys) {
  await Promise.all(keys.map((key) => fs.rm(fullPath(key), { force: true })));
}

function download(res, file) {
  return new Promise((resolve, reject) => {
    res.download(fullPath(file.storageKey), file.name, (err) => (err ? reject(err) : resolve()));
  });
}

module.exports = { name: "local", save, remove, download };
