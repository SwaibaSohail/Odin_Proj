const bcrypt = require("bcryptjs");
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const db = require("../db/queries");
const { isUniqueViolation, safeRedirectPath, flashAndRedirect } = require("../lib/helpers");

const EMAIL_TAKEN = "An account with that email already exists.";

const validateSignUp = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required.")
    .isLength({ max: 100 })
    .withMessage("First name must be 100 characters or fewer."),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required.")
    .isLength({ max: 100 })
    .withMessage("Last name must be 100 characters or fewer."),
  body("email")
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Email is required.")
    .bail()
    .isEmail()
    .withMessage("Enter a valid email address.")
    .bail()
    .isLength({ max: 255 })
    .withMessage("Email must be 255 characters or fewer.")
    .bail()
    .custom(async (email) => {
      if (await db.getUserByEmail(email)) throw new Error(EMAIL_TAKEN);
      return true;
    }),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters.")
    .bail()
    .custom((password) => {
      // bcrypt only uses the first 72 bytes of a password.
      if (bcrypt.truncates(password)) throw new Error("Password is too long.");
      return true;
    }),
  body("confirmPassword").custom((confirmPassword, { req }) => {
    if (confirmPassword !== req.body.password) throw new Error("Passwords don't match.");
    return true;
  }),
];

function renderSignUp(res, { status = 200, values = {}, fieldErrors = {} } = {}) {
  res.status(status).render("sign-up", { title: "Sign up", values, fieldErrors });
}

function signUpGet(req, res) {
  renderSignUp(res);
}

const signUpPost = [
  validateSignUp,
  async (req, res, next) => {
    const values = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
    };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return renderSignUp(res, { status: 400, values, fieldErrors: errors.mapped() });
    }

    let user;
    try {
      const passwordHash = await bcrypt.hash(req.body.password, 10);
      user = await db.insertUser({ ...values, passwordHash });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      return renderSignUp(res, { status: 400, values, fieldErrors: { email: { msg: EMAIL_TAKEN } } });
    }

    // Log the new user straight in. They still need the passcode to become a member.
    req.login(user, (err) => {
      if (err) return next(err);
      const welcome = "Your account is ready. Enter the club passcode to become a member.";
      flashAndRedirect(req, res, welcome, "/join").catch(next);
    });
  },
];

function logInGet(req, res) {
  res.render("log-in", { title: "Log in", email: "", errors: [] });
}

function logInPost(req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const message =
        info?.message === "Missing credentials"
          ? "Enter your email and password."
          : info?.message || "Incorrect email or password.";
      return res.status(401).render("log-in", {
        title: "Log in",
        email: req.body.email ?? "",
        errors: [{ msg: message }],
      });
    }

    // Logging in starts a new session, so read where to go back to first.
    const returnTo = safeRedirectPath(req.session.returnTo);
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.redirect(returnTo);
    });
  })(req, res, next);
}

function logOutPost(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
}

module.exports = {
  signUpGet,
  signUpPost,
  logInGet,
  logInPost,
  logOutPost,
};
