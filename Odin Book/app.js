const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

for (const name of ["DATABASE_URL", "SESSION_SECRET"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const passport = require("./src/lib/passport");
const helpers = require("./src/lib/helpers");
const { pendingRequestCount } = require("./src/lib/social");
const { NotFound } = require("./src/lib/http");
const routes = require("./src/routes");

const app = express();
const production = process.env.NODE_ENV === "production";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Safe starting values for what pages read, so the error page can always be drawn.
Object.assign(app.locals, { me: null, h: helpers, here: "/", flash: null, pendingRequests: 0 });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Hosts like Render sit in front of the app, so trust them for the visitor's address.
if (production) app.set("trust proxy", 1);

// Security headers. Pages may only run this site's own scripts, and pictures
// may also come from the picker's preview (blob:).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "blob:"],
        upgradeInsecureRequests: production ? [] : null,
      },
    },
    // Lets the browser say that a form was sent from this site (the check
    // below needs that), while still telling other sites nothing.
    referrerPolicy: { policy: "same-origin" },
  }),
);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

// Sessions are kept in the database, so people stay signed in across restarts.
// JavaScript on the page can't read the cookie, and other sites can't send it
// along with their requests.
app.use(
  session({
    name: "hearth.sid",
    secret: process.env.SESSION_SECRET,
    store: new PgSession({ pool: new Pool({ connectionString: process.env.DATABASE_URL }), tableName: "session" }),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: production, maxAge: WEEK_MS },
  }),
);
app.use(passport.session());

// What every page can use.
app.use(async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.locals.me = req.user || null;
  res.locals.h = helpers;
  res.locals.here = req.originalUrl;
  res.locals.flash = null;
  res.locals.pendingRequests = req.user && req.method === "GET" ? await pendingRequestCount(req.user.id) : 0;

  // A one-off message is shown by the first normal page drawn after it was left.
  const render = res.render.bind(res);
  res.render = (view, options, callback) => {
    if (req.session?.flash && res.statusCode < 400) {
      res.locals.flash = req.session.flash;
      delete req.session.flash;
    }
    render(view, options, callback);
  };
  next();
});

// Only this site's own pages may change anything. Browsers say where a form
// was sent from in the Origin header.
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || !origin) return next();
  let host = null;
  try {
    host = new URL(origin).host;
  } catch {
    // Not a real address, so it can't be ours.
  }
  if (host !== req.get("host")) return res.status(403).render("error", { title: "Not allowed", message: "That request came from another site." });
  next();
});

app.use(routes);

app.use((req, res) => {
  res.status(404).render("error", { title: "Not found", message: "There's nothing at this address." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const json = req.get("accept") === "application/json";
  if (err instanceof NotFound) {
    return json ? res.status(404).json({ error: err.message }) : res.status(404).render("error", { title: "Not found", message: err.message });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).render("error", { title: "Too big", message: "That was too much to send at once." });
  }
  console.error(err);
  if (json) return res.status(500).json({ error: "Something went wrong on our side." });
  res.status(500).render("error", { title: "Something went wrong", message: "Something went wrong on our side. Try again in a moment." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hearth is running at http://localhost:${PORT}`);
});
