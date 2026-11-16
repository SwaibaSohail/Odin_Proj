const prisma = require("../lib/prisma");
const { NotFound } = require("../lib/http");

const isImageId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// GET /images/:id. Like everything else, pictures are only for people who are signed in.
async function show(req, res) {
  const image = isImageId(req.params.id)
    ? await prisma.image.findUnique({ where: { id: req.params.id }, select: { mimeType: true, data: true } })
    : null;
  if (!image) throw new NotFound("That picture doesn't exist.");
  // A picture never changes once it's saved, so browsers can keep it.
  res.set({ "Content-Type": image.mimeType, "Cache-Control": "private, max-age=31536000, immutable" });
  res.end(Buffer.from(image.data));
}

module.exports = { show };
