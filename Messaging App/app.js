const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

for (const name of ["DATABASE_URL", "JWT_SECRET"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { requireAuth, userIdFromRequest } = require("./src/lib/auth");
const authRouter = require("./src/routes/authRouter");
const usersRouter = require("./src/routes/usersRouter");
const conversationsRouter = require("./src/routes/conversationsRouter");
const { showImage } = require("./src/controllers/imagesController");

const app = express();
const production = process.env.NODE_ENV === "production";
const publicDir = path.join(__dirname, "public");

// Hosts like Render sit in front of the app, so trust them for the visitor's address.
if (production) app.set("trust proxy", 1);

// Security headers. The page may only run this site's own scripts, and
// pictures may also come from the picker's preview (blob:).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "blob:"],
        upgradeInsecureRequests: production ? [] : null,
      },
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "20kb" }));

// The API

// Only this site's own pages may change anything. Browsers say where a
// request came from in the Origin header.
app.use("/api", (req, res, next) => {
  const origin = req.get("origin");
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || !origin) return next();
  let host = null;
  try {
    host = new URL(origin).host;
  } catch {
    // Not a real address, so it can't be ours.
  }
  if (host !== req.get("host")) return res.status(403).json({ error: "That request came from another site." });
  next();
});
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/conversations", requireAuth, conversationsRouter);
app.get("/api/images/:id", requireAuth, showImage);
app.use("/api", (req, res) => {
  res.status(404).json({ error: "There's nothing at this address." });
});

// The website. The app is for people who are logged in, and the log-in and
// sign-up pages are for people who aren't.
function page(name) {
  return (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(publicDir, `${name}.html`));
  };
}
const loggedIn = (req) => userIdFromRequest(req) !== null;

app.get("/", (req, res, next) => (loggedIn(req) ? next() : res.redirect("/login")), page("app"));
app.get("/login", (req, res, next) => (loggedIn(req) ? res.redirect("/") : next()), page("login"));
app.get("/signup", (req, res, next) => (loggedIn(req) ? res.redirect("/") : next()), page("signup"));
app.use(express.static(publicDir, { index: false }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, "404.html"));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "The request body isn't valid JSON." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "The request body is too large." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Parley is running at http://localhost:${PORT}`);
});
