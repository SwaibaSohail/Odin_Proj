const prisma = require("../lib/prisma");
const { notFound } = require("../lib/http");

const NOT_FOUND = "That picture doesn't exist.";
const isImageId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// GET /api/images/:id
// Profile photos are for anyone who's logged in. A picture in a chat is only
// for the people in that chat.
async function showImage(req, res) {
  const { id } = req.params;
  if (!isImageId(id)) return notFound(res, NOT_FOUND);

  const image = await prisma.image.findUnique({
    where: { id },
    select: { mimeType: true, userId: true, message: { select: { conversationId: true } } },
  });
  if (!image) return notFound(res, NOT_FOUND);

  if (image.userId === null) {
    const member =
      image.message &&
      (await prisma.member.findUnique({
        where: { conversationId_userId: { conversationId: image.message.conversationId, userId: req.user.id } },
        select: { userId: true },
      }));
    if (!member) return notFound(res, NOT_FOUND);
  }

  const { data } = await prisma.image.findUniqueOrThrow({ where: { id }, select: { data: true } });
  // A picture never changes once it's saved, so browsers can keep it.
  res.set({ "Content-Type": image.mimeType, "Cache-Control": "private, max-age=31536000, immutable" });
  res.end(Buffer.from(data));
}

module.exports = { showImage };
