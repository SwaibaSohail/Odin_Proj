const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

for (const name of ["DATABASE_URL", "ADMIN_PASSWORD"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const express = require("express");
const categoriesController = require("./controllers/categoriesController");
const categoriesRouter = require("./routes/categoriesRouter");
const itemsRouter = require("./routes/itemsRouter");
const { formatPrice, stockStatus } = require("./lib/helpers");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.locals.formatPrice = formatPrice;
app.locals.stockStatus = stockStatus;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.get("/", categoriesController.categoryList);
app.use("/categories", categoriesRouter);
app.use("/items", itemsRouter);

app.use((req, res) => {
  res.status(404).render("404", { title: "Not Found", message: "That page doesn't exist." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", { title: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Inventory app running at http://localhost:${PORT}/`);
});
