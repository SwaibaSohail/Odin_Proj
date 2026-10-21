const { body, validationResult } = require("express-validator");
const db = require("../db/queries");
const {
  parseId,
  notFound,
  isUniqueViolation,
  isForeignKeyViolation,
  validateAdminPassword,
} = require("../lib/helpers");

const NOT_FOUND_MESSAGE = "That category doesn't exist.";

const validateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 100 })
    .withMessage("Name must be 100 characters or fewer."),
  body("description")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be 500 characters or fewer."),
];

function findCategory(idParam) {
  const id = parseId(idParam);
  return id ? db.getCategoryById(id) : undefined;
}

function categoryFromBody(reqBody) {
  return { name: reqBody.name ?? "", description: reqBody.description ?? "" };
}

function duplicateNameError(name) {
  return { msg: `A category named "${name}" already exists.` };
}

function renderForm(res, { status = 200, category, errors = [], isEdit }) {
  res.status(status).render("categories/form", {
    title: isEdit ? "Edit Category" : "New Category",
    category,
    errors,
    isEdit,
    action: isEdit ? `/categories/${category.id}/edit` : "/categories/new",
  });
}

async function renderDeletePage(res, { status = 200, category, errors = [] }) {
  const items = await db.getItemsByCategory(category.id);
  res.status(status).render("categories/delete", {
    title: `Delete ${category.name}`,
    category,
    items,
    errors,
  });
}

async function categoryList(req, res) {
  const [categories, stats] = await Promise.all([
    db.getAllCategories(),
    db.getInventoryStats(),
  ]);
  res.render("index", { title: "Inventory", categories, stats });
}

async function categoryDetail(req, res) {
  const category = await findCategory(req.params.id);
  if (!category) return notFound(res, NOT_FOUND_MESSAGE);

  const items = await db.getItemsByCategory(category.id);
  res.render("categories/show", { title: category.name, category, items });
}

function createCategoryGet(req, res) {
  renderForm(res, { category: { name: "", description: "" }, isEdit: false });
}

const createCategoryPost = [
  validateCategory,
  async (req, res) => {
    const category = categoryFromBody(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return renderForm(res, { status: 400, category, errors: errors.array(), isEdit: false });
    }

    try {
      const id = await db.insertCategory(category);
      res.redirect(`/categories/${id}`);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      renderForm(res, { status: 400, category, errors: [duplicateNameError(category.name)], isEdit: false });
    }
  },
];

async function updateCategoryGet(req, res) {
  const category = await findCategory(req.params.id);
  if (!category) return notFound(res, NOT_FOUND_MESSAGE);

  renderForm(res, { category, isEdit: true });
}

const updateCategoryPost = [
  validateCategory,
  validateAdminPassword,
  async (req, res) => {
    const existing = await findCategory(req.params.id);
    if (!existing) return notFound(res, NOT_FOUND_MESSAGE);

    const category = { id: existing.id, ...categoryFromBody(req.body) };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return renderForm(res, { status: 400, category, errors: errors.array(), isEdit: true });
    }

    try {
      await db.updateCategory(category.id, category);
      res.redirect(`/categories/${category.id}`);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      renderForm(res, { status: 400, category, errors: [duplicateNameError(category.name)], isEdit: true });
    }
  },
];

async function deleteCategoryGet(req, res) {
  const category = await findCategory(req.params.id);
  if (!category) return notFound(res, NOT_FOUND_MESSAGE);

  await renderDeletePage(res, { category });
}

// A category can only be deleted once it has no items left. The delete page
// lists any remaining items so they can be moved or deleted first.
const deleteCategoryPost = [
  validateAdminPassword,
  async (req, res) => {
    const category = await findCategory(req.params.id);
    if (!category) return notFound(res, NOT_FOUND_MESSAGE);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return renderDeletePage(res, { status: 400, category, errors: errors.array() });
    }

    try {
      await db.deleteCategory(category.id);
      res.redirect("/");
    } catch (err) {
      if (!isForeignKeyViolation(err)) throw err;
      await renderDeletePage(res, { status: 409, category });
    }
  },
];

module.exports = {
  categoryList,
  categoryDetail,
  createCategoryGet,
  createCategoryPost,
  updateCategoryGet,
  updateCategoryPost,
  deleteCategoryGet,
  deleteCategoryPost,
};
