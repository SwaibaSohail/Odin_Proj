const { Router } = require("express");
const auth = require("./controllers/authController");
const posts = require("./controllers/postsController");
const users = require("./controllers/usersController");
const settings = require("./controllers/settingsController");
const images = require("./controllers/imagesController");
const { requireUser, requireNoUser } = require("./lib/http");
const { loginLimiter, signupLimiter, writeLimiter } = require("./lib/limits");

const router = Router();

// Signing in. These are the only pages you can see without an account.
router.get("/login", requireNoUser, auth.showLogin);
router.post("/login", requireNoUser, loginLimiter, auth.login);
router.get("/signup", requireNoUser, auth.showSignup);
router.post("/signup", requireNoUser, signupLimiter, auth.signup);
router.post("/guest", requireNoUser, signupLimiter, auth.guest);
router.post("/logout", auth.logout);

// Everything below needs you to be signed in.
router.use(requireUser);

router.get("/", posts.home);
router.get("/explore", posts.explore);
router.post("/posts", writeLimiter, posts.create);
router.get("/posts/:id", posts.show);
router.post("/posts/:id/delete", posts.remove);
router.post("/posts/:id/like", writeLimiter, posts.like);
router.post("/posts/:id/unlike", writeLimiter, posts.unlike);
router.post("/posts/:id/comments", writeLimiter, posts.addComment);
router.post("/comments/:id/delete", posts.removeComment);

router.get("/users", users.index);
router.get("/users/:username", users.profile);
router.get("/users/:username/followers", users.followers);
router.get("/users/:username/following", users.following);
router.post("/users/:username/follow", writeLimiter, users.follow);
router.post("/users/:username/unfollow", users.unfollow);

router.get("/requests", users.requests);
router.post("/requests/:username/accept", users.accept);
router.post("/requests/:username/decline", users.decline);

router.get("/settings", settings.show);
router.post("/settings/profile", settings.saveProfile);
router.post("/settings/photo", settings.setPhoto);
router.post("/settings/photo/remove", settings.removePhoto);

router.get("/images/:id", images.show);

module.exports = router;
