// app/services/db.js
// MySQL connection pool used by every route. Promise-based so we can
// `await db.query(...)` from anywhere. Always pass parameters as the
// second argument — never concatenate into the SQL string — so the
// driver parameterises the query and SQL injection is impossible.

require("dotenv").config();

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_CONTAINER,
  port: process.env.DB_PORT,
  user: process.env.MYSQL_ROOT_USER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { query, pool };
