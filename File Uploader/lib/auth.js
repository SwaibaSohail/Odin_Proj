// Route guards.

function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();

  // Come back to this page after logging in.
  if (req.method === "GET") req.session.returnTo = req.originalUrl;
  res.redirect("/log-in");
}

function redirectIfLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return res.redirect("/drive");
  next();
}

module.exports = { requireLogin, redirectIfLoggedIn };
