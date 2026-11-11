// Checks for the fields people fill in about themselves, shared by sign-up
// and the profile page.

const { body } = require("express-validator");
const bcrypt = require("bcryptjs");

const tidy = (value) => value.replace(/\s+/g, " ");

const usernameRule = () =>
  body("username")
    .isString()
    .withMessage("Choose a username.")
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 20 })
    .withMessage("Usernames are 3 to 20 characters.")
    .matches(/^[a-z0-9_]+$/)
    .withMessage("Use only letters, numbers and underscores.");

const displayNameRule = () =>
  body("displayName")
    .isString()
    .withMessage("Enter your name.")
    .trim()
    .customSanitizer(tidy)
    .notEmpty()
    .withMessage("Enter your name.")
    .isLength({ max: 40 })
    .withMessage("Names can be up to 40 characters.");

const aboutRule = () =>
  body("about")
    .isString()
    .withMessage("About must be text.")
    .trim()
    .customSanitizer(tidy)
    .isLength({ max: 160 })
    .withMessage("About can be up to 160 characters.");

// bcrypt ignores everything after 72 bytes, so longer passwords are refused
// instead of being quietly cut short.
const passwordRule = () =>
  body("password")
    .isString()
    .withMessage("Choose a password.")
    .isLength({ min: 8 })
    .withMessage("Passwords need at least 8 characters.")
    .custom((value) => !bcrypt.truncates(value))
    .withMessage("That password is too long.");

module.exports = { usernameRule, displayNameRule, aboutRule, passwordRule };
