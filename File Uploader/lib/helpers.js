// Turns a route param like "12" into 12. Anything else becomes null.
function parseId(value) {
  if (!/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// Only allow redirects to paths on this site, never to another website.
function safeRedirectPath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/drive";
}

// Prisma error code for a duplicate value in a unique column.
const isUniqueViolation = (err) => err.code === "P2002";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

// Dates are rendered in UTC, then main.js switches them to the reader's time zone.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(date) {
  return `${dateFormat.format(date)} UTC`;
}

// A short label for a file's type, like "PDF" or "PNG".
function fileTypeLabel(fileName) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toUpperCase().slice(0, 4) : "FILE";
}

// Stores a one-time message and redirects once it's saved. Without the explicit
// save, express-session sends the redirect first and saves afterwards, so the
// browser can load the next page before the message has been stored.
function flashAndRedirect(req, res, type, text, url) {
  req.session.flash = { type, text };
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      res.redirect(url);
      resolve();
    });
  });
}

module.exports = {
  parseId,
  isUuid,
  safeRedirectPath,
  isUniqueViolation,
  formatBytes,
  formatDate,
  fileTypeLabel,
  flashAndRedirect,
};
