// Route guards for pages that need a logged-in user or an admin.

function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();

  // Come back to this page after logging in.
  if (req.method === "GET") req.session.returnTo = req.originalUrl;
  res.redirect("/log-in");
}

function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect("/log-in");
  if (!req.user.is_admin) {
    return res.status(403).render("403", { title: "Admins only" });
  }
  next();
}

function redirectIfLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return res.redirect("/");
  next();
}

module.exports = { requireLogin, requireAdmin, redirectIfLoggedIn };
