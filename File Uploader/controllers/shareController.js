const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const { findOwnedFolder, folderUrl, getFolderPath, getFolderContents } = require("../lib/folders");
const { parseId, isUuid, flashAndRedirect } = require("../lib/helpers");
const { sendFile } = require("./filesController");

const DAY = 24 * 60 * 60 * 1000;

function sharingSection(folderId) {
  return `${folderUrl(folderId)}#sharing`;
}

// Owner side: create and stop share links

const validateDays = body("days")
  .trim()
  .isInt({ min: 1, max: 30 })
  .withMessage("Choose how long the link should work: 1 to 30 days.")
  .toInt();

const createShareLink = [
  validateDays,
  async (req, res) => {
    const folder = await findOwnedFolder(req.user.id, req.params.id);
    if (!folder) {
      return res.status(404).render("404", { title: "Not found", message: "That folder doesn't exist." });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return flashAndRedirect(req, res, "error", errors.array()[0].msg, sharingSection(folder.id));
    }

    const days = req.body.days;
    await prisma.shareLink.create({
      data: { folderId: folder.id, expiresAt: new Date(Date.now() + days * DAY) },
    });
    const message = `Share link created. It works for ${days} ${days === 1 ? "day" : "days"}.`;
    return flashAndRedirect(req, res, "success", message, sharingSection(folder.id));
  },
];

async function deleteShareLink(req, res) {
  const link = isUuid(req.params.linkId)
    ? await prisma.shareLink.findFirst({ where: { id: req.params.linkId, folder: { ownerId: req.user.id } } })
    : null;
  if (!link) {
    return res.status(404).render("404", { title: "Not found", message: "That share link doesn't exist." });
  }

  await prisma.shareLink.delete({ where: { id: link.id } });
  const message = "Sharing stopped. That link no longer works.";
  return flashAndRedirect(req, res, "success", message, sharingSection(link.folderId));
}

// Public side: anyone with the link, no account needed

async function findLink(linkId) {
  if (!isUuid(linkId)) return null;
  return prisma.shareLink.findUnique({
    where: { id: linkId },
    include: { folder: { include: { owner: { select: { name: true } } } } },
  });
}

// Renders an error page and returns true if the link can't be used.
function rejectLink(res, link) {
  if (!link) {
    res.status(404).render("404", {
      title: "Link not found",
      message: "This share link doesn't exist, or the owner stopped sharing.",
    });
    return true;
  }
  if (link.expiresAt <= new Date()) {
    res.status(410).render("share-expired", { title: "Link expired", link });
    return true;
  }
  return false;
}

// The breadcrumb path from the shared folder down to folderId, or null when
// folderId isn't inside the shared folder.
async function pathInsideShare(link, folderId) {
  const path = await getFolderPath(folderId);
  const start = path.findIndex((folder) => folder.id === link.folderId);
  return start === -1 ? null : path.slice(start);
}

async function showShared(req, res) {
  const link = await findLink(req.params.linkId);
  if (rejectLink(res, link)) return;

  const folderId = req.params.folderId === undefined ? link.folderId : parseId(req.params.folderId);
  const path = folderId ? await pathInsideShare(link, folderId) : null;
  if (!path) {
    return res.status(404).render("404", { title: "Not found", message: "That folder isn't part of this share." });
  }

  const { folders, files } = await getFolderContents(link.folder.ownerId, folderId);
  res.render("share", {
    title: path[path.length - 1].name,
    link,
    path,
    folders,
    files,
  });
}

async function downloadShared(req, res) {
  const link = await findLink(req.params.linkId);
  if (rejectLink(res, link)) return;

  const fileId = parseId(req.params.fileId);
  const file = fileId ? await prisma.file.findUnique({ where: { id: fileId } }) : null;
  const inside = file && file.folderId && (await pathInsideShare(link, file.folderId));
  if (!inside) {
    return res.status(404).render("404", { title: "Not found", message: "That file isn't part of this share." });
  }

  await sendFile(res, file);
}

module.exports = { createShareLink, deleteShareLink, showShared, downloadShared };
