// app/routes/categories.js
// Lists all categories and shows posts inside a single category.

const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.get("/", async (req, res, next) => {
  try {
    const categories = await db.query(`
      SELECT c.category_id, c.name, c.description, COUNT(p.post_id) AS post_count
      FROM categories c
      LEFT JOIN posts p ON c.category_id = p.category_id
      GROUP BY c.category_id
      ORDER BY c.name ASC
    `);
    res.render("categories", { title: "Categories", categories });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(404).render("404", { title: "Category Not Found" });

    const categoryRows = await db.query(
      "SELECT category_id, name, description FROM categories WHERE category_id = ?",
      [id]
    );
    if (categoryRows.length === 0) {
      return res.status(404).render("404", { title: "Category Not Found" });
    }

    const posts = await db.query(`
      SELECT p.post_id, p.title, p.created_at, p.is_spoiler,
             u.username,
             COALESCE(SUM(v.value), 0) AS score
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN votes v ON v.post_id = p.post_id
      WHERE p.category_id = ?
      GROUP BY p.post_id
      ORDER BY p.created_at DESC
    `, [id]);

    res.render("category-detail", { title: categoryRows[0].name, category: categoryRows[0], posts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
