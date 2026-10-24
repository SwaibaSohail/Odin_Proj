const crypto = require("node:crypto");

// Turns a route param like "12" into 12. Anything else becomes null.
function parseId(value) {
  if (!/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

// PostgreSQL error code for a duplicate value in a unique column.
const isUniqueViolation = (err) => err.code === "23505";

// Compares a submitted passcode with the real one in constant time.
function matchesSecret(value, secret) {
  const hash = (text) => crypto.createHash("sha256").update(String(text)).digest();
  return crypto.timingSafeEqual(hash(value ?? ""), hash(secret));
}

// Only allow redirects to paths on this site, never to another website.
function safeRedirectPath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/";
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

// Stores a one-time message and redirects once it's saved. Without the explicit
// save, express-session sends the redirect first and saves afterwards, so the
// browser can load the next page before the message has been stored.
function flashAndRedirect(req, res, message, url) {
  req.session.flash = message;
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      res.redirect(url);
      resolve();
    });
  });
}

module.exports = {
  flashAndRedirect,
  parseId,
  isUniqueViolation,
  matchesSecret,
  safeRedirectPath,
  formatDate,
};
