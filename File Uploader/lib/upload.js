// Upload rules: one file at a time, up to 10 MB, and only these file types.
// The type is decided by the file extension, and we store our own content
// type for it rather than trusting what the browser sends.

const crypto = require("node:crypto");
const path = require("node:path");
const multer = require("multer");

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_TYPES).join(",");
const ALLOWED_LABEL = [...new Set(Object.keys(ALLOWED_TYPES).map((ext) => ext.slice(1).toUpperCase()))]
  .filter((ext) => ext !== "JPEG")
  .join(", ");

function extensionOf(fileName) {
  return path.extname(fileName).toLowerCase();
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  defParamCharset: "utf8", // keep names like "résumé.pdf" intact
  fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES[extensionOf(file.originalname)]) {
      const err = new Error("File type not allowed");
      err.code = "FILE_TYPE_NOT_ALLOWED";
      return cb(err);
    }
    cb(null, true);
  },
}).single("file");

function errorMessage(err) {
  if (err.code === "LIMIT_FILE_SIZE") return "That file is too big. The limit is 10 MB.";
  if (err.code === "FILE_TYPE_NOT_ALLOWED") {
    return `That file type isn't allowed. Allowed types: ${ALLOWED_LABEL}.`;
  }
  if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
    return "Upload one file at a time.";
  }
  return "The upload didn't work. Please try again.";
}

// Runs multer, then hands any problem to the controller as req.uploadError.
function acceptUpload(req, res, next) {
  multerUpload(req, res, (err) => {
    if (err) {
      const isUploadProblem = err instanceof multer.MulterError || err.code === "FILE_TYPE_NOT_ALLOWED";
      if (!isUploadProblem) return next(err);
      req.uploadError = errorMessage(err);
    } else if (!req.file) {
      req.uploadError = "Choose a file to upload.";
    } else if (req.file.size === 0) {
      req.uploadError = "That file is empty.";
    }
    next();
  });
}

// Where a new upload goes in storage: a folder per user and a random name.
function storageKeyFor(userId, fileName) {
  return `${userId}/${crypto.randomUUID()}${extensionOf(fileName)}`;
}

function contentTypeFor(fileName) {
  return ALLOWED_TYPES[extensionOf(fileName)];
}

module.exports = {
  MAX_FILE_SIZE,
  ACCEPT_ATTRIBUTE,
  ALLOWED_LABEL,
  acceptUpload,
  storageKeyFor,
  contentTypeFor,
};
