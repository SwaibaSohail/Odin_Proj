const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

for (const name of ["DATABASE_URL", "JWT_SECRET"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const express = require("express");
const cors = require("cors");
const authRouter = require("./src/routes/authRouter");
const postsRouter = require("./src/routes/postsRouter");
const commentsRouter = require("./src/routes/commentsRouter");

const app = express();

// Only these websites may call the API from a browser.
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api", (req, res) => {
  res.json({
    name: "Blog API",
    endpoints: [
      "POST   /api/auth/login",
      "GET    /api/auth/me",
      "GET    /api/posts",
      "POST   /api/posts",
      "GET    /api/posts/:id",
      "PATCH  /api/posts/:id",
      "DELETE /api/posts/:id",
      "GET    /api/posts/:postId/comments",
      "POST   /api/posts/:postId/comments",
      "PATCH  /api/comments/:id",
      "DELETE /api/comments/:id",
    ],
  });
});
app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);
app.use("/api/comments", commentsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "There's nothing at this address." });
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
  console.log(`Blog API running at http://localhost:${PORT}/api`);
});
