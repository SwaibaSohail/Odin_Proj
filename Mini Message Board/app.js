const express = require("express");
const path = require("path");
const indexRouter = require("./routes/indexRouter");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use("/", indexRouter);

app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mini Message Board running at http://localhost:${PORT}/`);
});
