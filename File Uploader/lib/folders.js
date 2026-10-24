const prisma = require("./prisma");
const { parseId } = require("./helpers");

// Only ever finds this user's own folders.
function findOwnedFolder(userId, idParam) {
  const id = parseId(idParam);
  return id ? prisma.folder.findFirst({ where: { id, ownerId: userId } }) : null;
}

function folderUrl(folderId) {
  return folderId ? `/folders/${folderId}` : "/drive";
}

// The folder and all its parents, from the top level down. Used for breadcrumbs
// and to check whether a folder is inside a shared folder.
async function getFolderPath(folderId) {
  return prisma.$queryRaw`
    WITH RECURSIVE path AS (
      SELECT id, name, "parentId", 0 AS depth FROM "Folder" WHERE id = ${folderId}
      UNION ALL
      SELECT f.id, f.name, f."parentId", path.depth + 1
      FROM "Folder" f JOIN path ON f.id = path."parentId"
    )
    SELECT id, name FROM path ORDER BY depth DESC
  `;
}

// The ids of a folder and every folder inside it, at any depth.
async function getFolderTreeIds(folderId) {
  const rows = await prisma.$queryRaw`
    WITH RECURSIVE tree AS (
      SELECT id FROM "Folder" WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM "Folder" f JOIN tree ON f."parentId" = tree.id
    )
    SELECT id FROM tree
  `;
  return rows.map((row) => row.id);
}

// Is a folder with this name already in the same place? (ignores upper/lower case)
async function folderNameTaken({ ownerId, parentId, name, exceptId }) {
  const existing = await prisma.folder.findFirst({
    where: {
      ownerId,
      parentId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

// Subfolders and files directly inside a folder (or at the top level when folderId is null).
async function getFolderContents(ownerId, folderId) {
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { ownerId, parentId: folderId },
      orderBy: { name: "asc" },
    }),
    prisma.file.findMany({
      where: { ownerId, folderId },
      orderBy: { name: "asc" },
    }),
  ]);
  return { folders, files };
}

module.exports = {
  findOwnedFolder,
  folderUrl,
  getFolderPath,
  getFolderTreeIds,
  folderNameTaken,
  getFolderContents,
};
