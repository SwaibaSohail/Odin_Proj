const { validationResult } = require("express-validator");

// Turns a route param like "12" into 12. Anything else becomes null.
function parseId(value) {
  if (typeof value !== "string" || !/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

function notFound(res, message) {
  return res.status(404).json({ error: message });
}

function conflict(res, message) {
  return res.status(409).json({ error: message });
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

// Sends a 400 with the first problem in each field,
// like { field: "username", message: "That username is taken." }.
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  res.status(400).json({
    error: "Some fields need fixing.",
    details: errors.array({ onlyFirstError: true }).map((error) => ({ field: error.path, message: error.msg })),
  });
}

// "Sam", "Sam and Priya", "Sam, Priya and Tom"
function listNames(names) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

module.exports = { parseId, notFound, conflict, badRequest, handleValidation, listNames };
