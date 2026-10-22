const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

for (const name of ["DATABASE_URL", "SESSION_SECRET", "MEMBER_PASSCODE", "ADMIN_PASSCODE"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const passport = require("passport");
const pool = require("./db/pool");
const messagesController = require("./controllers/messagesController");
const authRouter = require("./routes/authRouter");
const clubRouter = require("./routes/clubRouter");
const messagesRouter = require("./routes/messagesRouter");
const { formatDate } = require("./lib/helpers");

require("./config/passport");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.locals.formatDate = formatDate;

// Hosts like Render and Railway sit behind a proxy that handles HTTPS.
if (isProduction) app.set("trust proxy", 1);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
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

// Make the user and any one-time message available to every view.
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.get("/", messagesController.messageList);
app.use("/", authRouter);
app.use("/", clubRouter);
app.use("/messages", messagesRouter);

app.use((req, res) => {
  res.status(404).render("404", { title: "Not found", message: "That page doesn't exist." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", { title: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Members Only running at http://localhost:${PORT}/`);
});
