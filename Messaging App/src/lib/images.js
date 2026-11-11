const multer = require("multer");
const { imageSize } = require("image-size");

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_AVATAR_BYTES = 512 * 1024;
const MAX_SIDE = 8000;
const TYPES = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5 },
});

// Reads one uploaded picture into memory as req.file, and turns multer's
// errors into messages people can read. Requests that aren't uploads pass through.
function acceptImage(field) {
  const run = upload.single(field);
  return (req, res, next) =>
    run(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        const tooBig = err.code === "LIMIT_FILE_SIZE";
        return res.status(tooBig ? 413 : 400).json({
          error: tooBig ? "Pictures can be up to 4 MB." : "Send one picture at a time.",
        });
      }
      next(err);
    });
}

// Checks that an upload really is a picture by reading it, rather than
// trusting its name. Returns what to store, or null.
function inspectImage(file) {
  let info;
  try {
    info = imageSize(file.buffer);
  } catch {
    return null;
  }
  const mimeType = TYPES[info.type];
  if (!mimeType || !info.width || !info.height || info.width > MAX_SIDE || info.height > MAX_SIDE) return null;

  // Phone photos taken sideways are stored rotated, and browsers turn them upright.
  const sideways = info.orientation >= 5;
  return {
    data: file.buffer,
    mimeType,
    width: sideways ? info.height : info.width,
    height: sideways ? info.width : info.height,
  };
}

module.exports = { MAX_AVATAR_BYTES, acceptImage, inspectImage };
