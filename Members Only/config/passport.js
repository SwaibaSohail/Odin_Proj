const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const db = require("../db/queries");

const WRONG_DETAILS = "Incorrect email or password.";

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await db.getUserByEmail(email.trim());
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return done(null, false, { message: WRONG_DETAILS });
      }
      // Keep the password hash out of the session and req.user.
      const { password_hash: _hash, ...safeUser } = user;
      return done(null, safeUser);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // A deleted user (for example after re-seeding) just gets logged out.
    const user = await db.getUserById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});
