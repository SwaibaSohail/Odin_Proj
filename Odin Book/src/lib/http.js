// Only addresses on this site are allowed as a place to go back to.
function localPath(value, fallback = "/") {
  return typeof value === "string" && /^\/(?!\/)/.test(value) && !value.includes("\\") ? value : fallback;
}

// Turns a route param like "12" into 12. Anything else becomes null.
function parseId(value) {
  if (typeof value !== "string" || !/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

// Leaves a one-off message for the next page, like "Post deleted."
function flash(req, kind, text) {
  req.session.flash = { kind, text };
}

// Sends the browser back to where the form was, once the session is saved,
// so the next page is sure to see any message left for it.
function goBack(req, res, fallback = "/") {
  const to = localPath(req.body?.next, fallback);
  req.session.save((err) => {
    if (err) console.error(err);
    res.redirect(303, to);
  });
}

function requireUser(req, res, next) {
  if (req.user) return next();
  if (req.accepts("html")) return res.redirect("/login");
  res.status(401).json({ error: "Sign in to continue." });
}

function requireNoUser(req, res, next) {
  if (req.user) return res.redirect("/");
  next();
}

class NotFound extends Error {}

module.exports = { localPath, parseId, flash, goBack, requireUser, requireNoUser, NotFound };
