const { Router } = require("express");
const categoriesController = require("../controllers/categoriesController");

const categoriesRouter = Router();

categoriesRouter.get("/", (req, res) => res.redirect("/"));
categoriesRouter.get("/new", categoriesController.createCategoryGet);
categoriesRouter.post("/new", categoriesController.createCategoryPost);
categoriesRouter.get("/:id", categoriesController.categoryDetail);
categoriesRouter.get("/:id/edit", categoriesController.updateCategoryGet);
categoriesRouter.post("/:id/edit", categoriesController.updateCategoryPost);
categoriesRouter.get("/:id/delete", categoriesController.deleteCategoryGet);
categoriesRouter.post("/:id/delete", categoriesController.deleteCategoryPost);

module.exports = categoriesRouter;
