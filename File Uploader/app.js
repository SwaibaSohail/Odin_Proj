const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const required = ["DATABASE_URL", "SESSION_SECRET"];
if (process.env.STORAGE_DRIVER === "supabase") required.push("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const prisma = require("./lib/prisma");
const storage = require("./lib/storage");
const authRouter = require("./routes/authRouter");
const driveRouter = require("./routes/driveRouter");
const filesRouter = require("./routes/filesRouter");
const shareRouter = require("./routes/shareRouter");
const { formatBytes, formatDate, fileTypeLabel } = require("./lib/helpers");
const { MAX_FILE_SIZE } = require("./lib/upload");

require("./lib/passport");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
Object.assign(app.locals, { formatBytes, formatDate, fileTypeLabel, maxFileSize: formatBytes(MAX_FILE_SIZE) });

// Hosts like Render and Railway sit behind a proxy that handles HTTPS.
if (isProduction) app.set("trust proxy", 1);

app.use(express.static(path.join(__dirname, "public")));
// Some browsers ask for /favicon.ico regardless of the <link rel="icon"> tag.
app.get("/favicon.ico", (req, res) => res.redirect(301, "/favicon.svg"));
app.use(express.urlencoded({ extended: true }));

const sessionStore = new PrismaSessionStore(prisma, {
  checkPeriod: 2 * 60 * 1000, // clear out expired sessions every 2 minutes
  dbRecordIdIsSessionId: true,
});
// This store's touch() rewrites the whole session just to push back its expiry
// date. When two requests overlap, that can undo a change the other one saved
// (like a "File uploaded" message). The cookie only gets a new expiry when the
// session is saved anyway, so without touch() nothing is lost.
delete sessionStore.touch;

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // one week
      httpOnly: true,
      sameSite: "lax", // the browser won't send it with form posts from other sites
      secure: isProduction,
    },
  })
);
app.use(passport.session());

// Make the user available to every view, and show a one-time message on the
// next page that's rendered. Error pages leave the message alone, so a
// background request for a missing file can't use it up.
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  const render = res.render.bind(res);
  res.render = (view, options, callback) => {
    if (res.statusCode < 400 && req.session.flash) {
      res.locals.flash = req.session.flash;
      delete req.session.flash;
    }
    return render(view, options, callback);
  };
  next();
});

app.get("/", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/drive");
  res.render("index", { title: "Your files, anywhere" });
});
app.use("/", authRouter);
app.use("/", driveRouter);
app.use("/files", filesRouter);
app.use("/share", shareRouter);

app.use((req, res) => {
  res.status(404).render("404", { title: "Not found", message: "That page doesn't exist." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).render("error", { title: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`File Uploader running at http://localhost:${PORT}/ (storage: ${storage.name})`);
});
