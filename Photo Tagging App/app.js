const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const express = require("express");
const scenesRouter = require("./src/routes/scenesRouter");
const gamesRouter = require("./src/routes/gamesRouter");

const app = express();
const publicDir = path.join(__dirname, "public");

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

// The API
app.get("/api", (req, res) => {
  res.json({
    name: "Where's Mabel?",
    endpoints: [
      "GET    /api/scenes",
      "GET    /api/scenes/:slug",
      "GET    /api/scenes/:slug/scores",
      "POST   /api/games",
      "POST   /api/games/:id/guesses",
      "PATCH  /api/games/:id",
    ],
  });
});
app.use("/api/scenes", scenesRouter);
app.use("/api/games", gamesRouter);
app.use("/api", (req, res) => {
  res.status(404).json({ error: "There's nothing at this address." });
});

// The website. The pictures are big, so browsers keep them for a day.
app.use("/images", express.static(path.join(publicDir, "images"), { maxAge: "1d" }));
app.use(express.static(publicDir, { extensions: ["html"] }));

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
  console.log(`Where's Mabel? is running at http://localhost:${PORT}`);
});
