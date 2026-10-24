const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const storage = require("../lib/storage");
const upload = require("../lib/upload");
const {
  findOwnedFolder,
  folderUrl,
  getFolderPath,
  getFolderTreeIds,
  folderNameTaken,
  getFolderContents,
} = require("../lib/folders");
const { flashAndRedirect } = require("../lib/helpers");

const FOLDER_NOT_FOUND = "That folder doesn't exist.";

const validateFolderName = body("name")
  .trim()
  .notEmpty()
  .withMessage("Folder name is required.")
  .isLength({ max: 100 })
  .withMessage("Folder name must be 100 characters or fewer.");

function notFound(res, message = FOLDER_NOT_FOUND) {
  res.status(404).render("404", { title: "Not found", message });
}

// The folder page, used for "My Drive" (folder = null) and for every folder.
async function renderFolder(req, res, folder, { status = 200, newFolderError = null, newFolderName = "" } = {}) {
  const folderId = folder ? folder.id : null;
  const [contents, path, shareLinks] = await Promise.all([
    getFolderContents(req.user.id, folderId),
    folder ? getFolderPath(folder.id) : [],
    folder
      ? prisma.shareLink.findMany({
          where: { folderId: folder.id, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  res.status(status).render("drive", {
    title: folder ? folder.name : "My Drive",
    folder,
    path,
    folders: contents.folders,
    files: contents.files,
    shareLinks,
    shareBaseUrl: `${req.protocol}://${req.get("host")}/share/`,
    newFolderError,
    newFolderName,
    accept: upload.ACCEPT_ATTRIBUTE,
    allowedTypes: upload.ALLOWED_LABEL,
  });
}

async function showRoot(req, res) {
  await renderFolder(req, res, null);
}

async function showFolder(req, res) {
  const folder = await findOwnedFolder(req.user.id, req.params.id);
  if (!folder) return notFound(res);
  await renderFolder(req, res, folder);
}

// Creates a folder in "My Drive" or, with an :id, inside another folder.
const createFolder = [
  validateFolderName,
  async (req, res) => {
    let parent = null;
    if (req.params.id !== undefined) {
      parent = await findOwnedFolder(req.user.id, req.params.id);
      if (!parent) return notFound(res);
    }

    const name = req.body.name ?? "";
    const parentId = parent ? parent.id : null;
    const errors = validationResult(req);
    let error = errors.isEmpty() ? null : errors.array()[0].msg;
    if (!error && (await folderNameTaken({ ownerId: req.user.id, parentId, name }))) {
      error = `There's already a folder called "${name}" here.`;
    }
    if (error) {
      return renderFolder(req, res, parent, { status: 400, newFolderError: error, newFolderName: name });
    }

    await prisma.folder.create({ data: { name, ownerId: req.user.id, parentId } });
    return flashAndRedirect(req, res, "success", `Created the folder "${name}".`, folderUrl(parentId));
  },
];

async function renameFolderGet(req, res) {
  const folder = await findOwnedFolder(req.user.id, req.params.id);
  if (!folder) return notFound(res);
  res.render("folder-rename", { title: `Rename ${folder.name}`, folder, name: folder.name, error: null });
}

const renameFolderPost = [
  validateFolderName,
  async (req, res) => {
    const folder = await findOwnedFolder(req.user.id, req.params.id);
    if (!folder) return notFound(res);

    const name = req.body.name ?? "";
    const errors = validationResult(req);
    let error = errors.isEmpty() ? null : errors.array()[0].msg;
    const taken =
      !error &&
      (await folderNameTaken({ ownerId: req.user.id, parentId: folder.parentId, name, exceptId: folder.id }));
    if (taken) error = `There's already a folder called "${name}" here.`;
    if (error) {
      return res.status(400).render("folder-rename", { title: `Rename ${folder.name}`, folder, name, error });
    }

    await prisma.folder.update({ where: { id: folder.id }, data: { name } });
    return flashAndRedirect(req, res, "success", `Renamed the folder to "${name}".`, folderUrl(folder.id));
  },
];

async function deleteFolderGet(req, res) {
  const folder = await findOwnedFolder(req.user.id, req.params.id);
  if (!folder) return notFound(res);

  const treeIds = await getFolderTreeIds(folder.id);
  const fileCount = await prisma.file.count({ where: { folderId: { in: treeIds } } });
  res.render("folder-delete", {
    title: `Delete ${folder.name}`,
    folder,
    subfolderCount: treeIds.length - 1,
    fileCount,
  });
}

async function deleteFolderPost(req, res) {
  const folder = await findOwnedFolder(req.user.id, req.params.id);
  if (!folder) return notFound(res);

  // Collect every file inside the folder (at any depth) before the database
  // deletes them along with the folder, so they can be removed from storage too.
  const treeIds = await getFolderTreeIds(folder.id);
  const files = await prisma.file.findMany({
    where: { folderId: { in: treeIds } },
    select: { storageKey: true },
  });

  await prisma.folder.delete({ where: { id: folder.id } });
  await storage.removeQuietly(files.map((file) => file.storageKey));

  const message = `Deleted the folder "${folder.name}" and everything in it.`;
  return flashAndRedirect(req, res, "success", message, folderUrl(folder.parentId));
}

// Runs after the acceptUpload middleware, which has read the file into memory.
async function uploadFile(req, res) {
  let folder = null;
  if (req.params.id !== undefined) {
    folder = await findOwnedFolder(req.user.id, req.params.id);
    if (!folder) return notFound(res);
  }
  const backTo = folderUrl(folder ? folder.id : null);

  if (req.uploadError) {
    return flashAndRedirect(req, res, "error", req.uploadError, backTo);
  }

  const { originalname: name, buffer, size } = req.file;
  if (name.length > 255) {
    const message = "That file name is too long. Rename the file and try again.";
    return flashAndRedirect(req, res, "error", message, backTo);
  }

  const storageKey = upload.storageKeyFor(req.user.id, name);
  const mimeType = upload.contentTypeFor(name);

  let url;
  try {
    url = await storage.save({ key: storageKey, buffer, mimeType });
  } catch (err) {
    console.error("Upload to storage failed:", err);
    return flashAndRedirect(req, res, "error", "The upload didn't work. Please try again.", backTo);
  }

  try {
    await prisma.file.create({
      data: { name, size, mimeType, storageKey, url, ownerId: req.user.id, folderId: folder ? folder.id : null },
    });
  } catch (err) {
    await storage.removeQuietly([storageKey]);
    throw err;
  }

  return flashAndRedirect(req, res, "success", `Uploaded "${name}".`, backTo);
}

module.exports = {
  showRoot,
  showFolder,
  createFolder,
  renameFolderGet,
  renameFolderPost,
  deleteFolderGet,
  deleteFolderPost,
  uploadFile,
};
