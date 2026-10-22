const pool = require("./pool");

// Users

const USER_COLUMNS = "id, first_name, last_name, email, is_member, is_admin";

// Includes the password hash, so only use this for checking a log-in.
async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return rows[0];
}

async function getUserById(id) {
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0];
}

async function insertUser({ firstName, lastName, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${USER_COLUMNS}`,
    [firstName, lastName, email, passwordHash]
  );
  return rows[0];
}

async function setMember(id) {
  await pool.query("UPDATE users SET is_member = TRUE WHERE id = $1", [id]);
}

// Admins can see everything, so they're members too.
async function setAdmin(id) {
  await pool.query("UPDATE users SET is_admin = TRUE, is_member = TRUE WHERE id = $1", [id]);
}

// Messages

async function getAllMessages() {
  const { rows } = await pool.query(`
    SELECT m.id, m.title, m.body, m.created_at, u.first_name, u.last_name
    FROM messages m
    JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC
  `);
  return rows;
}

async function insertMessage({ title, body, userId }) {
  await pool.query("INSERT INTO messages (title, body, user_id) VALUES ($1, $2, $3)", [
    title,
    body,
    userId,
  ]);
}

// Returns true if a message was deleted.
async function deleteMessage(id) {
  const { rowCount } = await pool.query("DELETE FROM messages WHERE id = $1", [id]);
  return rowCount > 0;
}

module.exports = {
  getUserByEmail,
  getUserById,
  insertUser,
  setMember,
  setAdmin,
  getAllMessages,
  insertMessage,
  deleteMessage,
};
