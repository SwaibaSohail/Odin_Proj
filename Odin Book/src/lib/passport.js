const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcryptjs");
const prisma = require("./prisma");
const { USER_CARD } = require("./social");

// Checked when someone signs in with a username that doesn't exist, so the
// reply takes as long as it would for a wrong password.
const DUMMY_HASH = bcrypt.hashSync("no account has this password", 12);

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() },
        select: { id: true, passwordHash: true, isGuest: true },
      });
      // Guest accounts have no password, so they can't be signed in to this way.
      const hash = user && !user.isGuest ? user.passwordHash : DUMMY_HASH;
      const matches = await bcrypt.compare(password, hash);
      if (!user || user.isGuest || !matches) return done(null, false, { message: "Incorrect username or password." });
      done(null, { id: user.id });
    } catch (err) {
      done(err);
    }
  }),
);

// The session only remembers the user's id. Their details are read fresh on each request.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    done(null, (await prisma.user.findUnique({ where: { id }, select: USER_CARD })) || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
