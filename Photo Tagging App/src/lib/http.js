const { validationResult } = require("express-validator");

function notFound(res, message) {
  return res.status(404).json({ error: message });
}

function conflict(res, message) {
  return res.status(409).json({ error: message });
}

// Sends a 400 with the first problem in each field,
// like { field: "name", message: "Enter your name." }.
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  res.status(400).json({
    error: "Some fields need fixing.",
    details: errors.array({ onlyFirstError: true }).map((error) => ({ field: error.path, message: error.msg })),
  });
}

module.exports = { notFound, conflict, handleValidation };
