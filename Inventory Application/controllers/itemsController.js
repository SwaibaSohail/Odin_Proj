const { body, validationResult } = require("express-validator");
const db = require("../db/queries");
const { parseId, notFound, validateAdminPassword } = require("../lib/helpers");

const NOT_FOUND_MESSAGE = "That item doesn't exist.";

const validateItem = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 150 })
    .withMessage("Name must be 150 characters or fewer."),
  body("brand")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Brand must be 100 characters or fewer."),
  body("description")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must be 1000 characters or fewer."),
  body("price")
    .trim()
    .matches(/^\d{1,8}(\.\d{1,2})?$/)
    .withMessage("Price must be a number of 0 or more with up to 2 decimal places, like 199.99."),
  body("quantity")
    .trim()
    .isInt({ min: 0, max: 1000000 })
    .withMessage("Quantity must be a whole number from 0 to 1,000,000."),
  body("categoryId").custom(async (value) => {
    const id = parseId(value);
    if (!id || !(await db.getCategoryById(id))) {
      throw new Error("Choose a category.");
    }
    return true;
  }),
];

function findItem(idParam) {
  const id = parseId(idParam);
  return id ? db.getItemById(id) : undefined;
}

function itemFromBody(reqBody) {
  return {
    name: reqBody.name ?? "",
    brand: reqBody.brand ?? "",
    description: reqBody.description ?? "",
    price: reqBody.price ?? "",
    quantity: reqBody.quantity ?? "",
    categoryId: parseId(reqBody.categoryId),
  };
}

async function renderForm(res, { status = 200, item, errors = [], isEdit }) {
  const categories = await db.getAllCategories();
  res.status(status).render("items/form", {
    title: isEdit ? "Edit Item" : "New Item",
    item,
    categories,
    errors,
    isEdit,
    action: isEdit ? `/items/${item.id}/edit` : "/items/new",
  });
}

async function itemList(req, res) {
  const items = await db.getAllItems();
  res.render("items/index", { title: "All Items", items });
}

async function itemDetail(req, res) {
  const item = await findItem(req.params.id);
  if (!item) return notFound(res, NOT_FOUND_MESSAGE);

  res.render("items/show", { title: item.name, item });
}

async function createItemGet(req, res) {
  const item = {
    name: "",
    brand: "",
    description: "",
    price: "",
    quantity: "",
    categoryId: parseId(req.query.category),
  };
  await renderForm(res, { item, isEdit: false });
}

const createItemPost = [
  validateItem,
  async (req, res) => {
    const item = itemFromBody(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return renderForm(res, { status: 400, item, errors: errors.array(), isEdit: false });
    }

    const id = await db.insertItem(item);
    res.redirect(`/items/${id}`);
  },
];

async function updateItemGet(req, res) {
  const item = await findItem(req.params.id);
  if (!item) return notFound(res, NOT_FOUND_MESSAGE);

  await renderForm(res, { item: { ...item, categoryId: item.category_id }, isEdit: true });
}

const updateItemPost = [
  validateItem,
  validateAdminPassword,
  async (req, res) => {
    const existing = await findItem(req.params.id);
    if (!existing) return notFound(res, NOT_FOUND_MESSAGE);

    const item = { id: existing.id, ...itemFromBody(req.body) };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return renderForm(res, { status: 400, item, errors: errors.array(), isEdit: true });
    }

    await db.updateItem(item.id, item);
    res.redirect(`/items/${item.id}`);
  },
];

async function deleteItemGet(req, res) {
  const item = await findItem(req.params.id);
  if (!item) return notFound(res, NOT_FOUND_MESSAGE);

  res.render("items/delete", { title: `Delete ${item.name}`, item, errors: [] });
}

const deleteItemPost = [
  validateAdminPassword,
  async (req, res) => {
    const item = await findItem(req.params.id);
    if (!item) return notFound(res, NOT_FOUND_MESSAGE);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("items/delete", {
        title: `Delete ${item.name}`,
        item,
        errors: errors.array(),
      });
    }

    await db.deleteItem(item.id);
    res.redirect(`/categories/${item.category_id}`);
  },
];

module.exports = {
  itemList,
  itemDetail,
  createItemGet,
  createItemPost,
  updateItemGet,
  updateItemPost,
  deleteItemGet,
  deleteItemPost,
};
