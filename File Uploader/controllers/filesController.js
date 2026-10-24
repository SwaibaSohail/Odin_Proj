const prisma = require("../lib/prisma");
const storage = require("../lib/storage");
const { getFolderPath, folderUrl } = require("../lib/folders");
const { parseId, flashAndRedirect } = require("../lib/helpers");

const FILE_NOT_FOUND = "That file doesn't exist.";

// Only ever finds the logged-in user's own files.
function findOwnedFile(req) {
  const id = parseId(req.params.id);
  return id ? prisma.file.findFirst({ where: { id, ownerId: req.user.id } }) : null;
}

function notFound(res, message = FILE_NOT_FOUND) {
  res.status(404).render("404", { title: "Not found", message });
}

// Sends the file, or a 404 page if it has gone missing from storage.
async function sendFile(res, file) {
  try {
    await storage.download(res, file);
  } catch (err) {
    if (res.headersSent) return;
    if (err.code === "ENOENT" || err.status === 404 || err.statusCode === "404") {
      return notFound(res, "This file is missing from storage.");
    }
    throw err;
  }
}

async function showFile(req, res) {
  const file = await findOwnedFile(req);
  if (!file) return notFound(res);

  const path = file.folderId ? await getFolderPath(file.folderId) : [];
  res.render("file", { title: file.name, file, path });
}

async function downloadFile(req, res) {
  const file = await findOwnedFile(req);
  if (!file) return notFound(res);
  await sendFile(res, file);
}

async function deleteFile(req, res) {
  const file = await findOwnedFile(req);
  if (!file) return notFound(res);

  await prisma.file.delete({ where: { id: file.id } });
  await storage.removeQuietly([file.storageKey]);

  return flashAndRedirect(req, res, "success", `Deleted "${file.name}".`, folderUrl(file.folderId));
}

module.exports = { showFile, downloadFile, deleteFile, sendFile };
