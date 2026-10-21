const pool = require("./pool");

// Categories

async function getAllCategories() {
  const { rows } = await pool.query(`
    SELECT c.id, c.name, c.description,
           COUNT(i.id)::int AS item_count,
           COALESCE(SUM(i.quantity), 0)::int AS total_stock
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    GROUP BY c.id
    ORDER BY LOWER(c.name)
  `);
  return rows;
}

async function getCategoryById(id) {
  const { rows } = await pool.query(
    "SELECT id, name, description FROM categories WHERE id = $1",
    [id]
  );
  return rows[0];
}

async function insertCategory({ name, description }) {
  const { rows } = await pool.query(
    "INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id",
    [name, description]
  );
  return rows[0].id;
}

async function updateCategory(id, { name, description }) {
  await pool.query(
    "UPDATE categories SET name = $1, description = $2 WHERE id = $3",
    [name, description, id]
  );
}

async function deleteCategory(id) {
  await pool.query("DELETE FROM categories WHERE id = $1", [id]);
}

// Items

async function getAllItems() {
  const { rows } = await pool.query(`
    SELECT i.id, i.name, i.brand, i.price, i.quantity,
           c.id AS category_id, c.name AS category_name
    FROM items i
    JOIN categories c ON c.id = i.category_id
    ORDER BY LOWER(i.name)
  `);
  return rows;
}

async function getItemsByCategory(categoryId) {
  const { rows } = await pool.query(
    `SELECT id, name, brand, price, quantity
     FROM items
     WHERE category_id = $1
     ORDER BY LOWER(name)`,
    [categoryId]
  );
  return rows;
}

async function getItemById(id) {
  const { rows } = await pool.query(
    `SELECT i.id, i.name, i.brand, i.description, i.price, i.quantity,
            i.category_id, i.created_at, c.name AS category_name
     FROM items i
     JOIN categories c ON c.id = i.category_id
     WHERE i.id = $1`,
    [id]
  );
  return rows[0];
}

async function insertItem({ name, brand, description, price, quantity, categoryId }) {
  const { rows } = await pool.query(
    `INSERT INTO items (name, brand, description, price, quantity, category_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [name, brand, description, price, quantity, categoryId]
  );
  return rows[0].id;
}

async function updateItem(id, { name, brand, description, price, quantity, categoryId }) {
  await pool.query(
    `UPDATE items
     SET name = $1, brand = $2, description = $3, price = $4, quantity = $5, category_id = $6
     WHERE id = $7`,
    [name, brand, description, price, quantity, categoryId, id]
  );
}

async function deleteItem(id) {
  await pool.query("DELETE FROM items WHERE id = $1", [id]);
}

// Dashboard

async function getInventoryStats() {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::int AS item_count,
           COALESCE(SUM(quantity), 0)::int AS total_stock,
           COALESCE(SUM(price * quantity), 0) AS total_value,
           COUNT(*) FILTER (WHERE quantity = 0)::int AS out_of_stock
    FROM items
  `);
  return rows[0];
}

module.exports = {
  getAllCategories,
  getCategoryById,
  insertCategory,
  updateCategory,
  deleteCategory,
  getAllItems,
  getItemsByCategory,
  getItemById,
  insertItem,
  updateItem,
  deleteItem,
  getInventoryStats,
};
