const { body, validationResult } = require("express-validator");
const db = require("../db/queries");
const { matchesSecret } = require("../lib/helpers");

function checkPasscode(secretName) {
  return body("passcode")
    .trim()
    .custom((passcode) => {
      if (!matchesSecret(passcode, process.env[secretName])) {
        throw new Error("That's not the right passcode.");
      }
      return true;
    });
}

function joinGet(req, res) {
  res.render("join", { title: "Join the club", errors: [] });
}

const joinPost = [
  checkPasscode("MEMBER_PASSCODE"),
  async (req, res) => {
    if (req.user.is_member) return res.redirect("/");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("join", { title: "Join the club", errors: errors.array() });
    }

    await db.setMember(req.user.id);
    req.session.flash = "You're in. You can now see who wrote each message.";
    res.redirect("/");
  },
];

function adminGet(req, res) {
  res.render("admin", { title: "Admin access", errors: [] });
}

const adminPost = [
  checkPasscode("ADMIN_PASSCODE"),
  async (req, res) => {
    if (req.user.is_admin) return res.redirect("/");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("admin", { title: "Admin access", errors: errors.array() });
    }

    await db.setAdmin(req.user.id);
    req.session.flash = "You're now an admin. Every message has a delete button for you.";
    res.redirect("/");
  },
];

module.exports = { joinGet, joinPost, adminGet, adminPost };
