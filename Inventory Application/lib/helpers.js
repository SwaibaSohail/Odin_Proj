const crypto = require("node:crypto");
const { body } = require("express-validator");

// Turns a route param like "12" into 12. Anything else becomes null.
function parseId(value) {
  if (!/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

function notFound(res, message) {
  res.status(404).render("404", { title: "Not Found", message });
}

// PostgreSQL error codes
const isUniqueViolation = (err) => err.code === "23505";
const isForeignKeyViolation = (err) => err.code === "23503";

function isAdminPassword(password) {
  // Hashing both sides gives equal-length buffers for a constant-time compare.
  const hash = (value) => crypto.createHash("sha256").update(String(value)).digest();
  return crypto.timingSafeEqual(hash(password ?? ""), hash(process.env.ADMIN_PASSWORD));
}

// Used on every update and delete form.
const validateAdminPassword = body("adminPassword").custom((value) => {
  if (!isAdminPassword(value)) {
    throw new Error("Incorrect admin password.");
  }
  return true;
});

function formatPrice(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function stockStatus(quantity) {
  if (quantity === 0) return { label: "Out of stock", className: "out" };
  if (quantity <= 3) return { label: "Low stock", className: "low" };
  return { label: "In stock", className: "in" };
}

module.exports = {
  parseId,
  notFound,
  isUniqueViolation,
  isForeignKeyViolation,
  validateAdminPassword,
  formatPrice,
  stockStatus,
};
