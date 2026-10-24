const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const prisma = require("./prisma");

const PUBLIC_USER_FIELDS = { id: true, name: true, email: true };

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return done(null, false, { message: "Incorrect email or password." });
      }
      return done(null, { id: user.id, name: user.name, email: user.email });
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
    const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_FIELDS });
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});
