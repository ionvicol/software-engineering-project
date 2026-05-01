// app/routes/tags.js
// Tag cloud and posts-by-tag drilldown.

const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.get("/", async (req, res, next) => {
  try {
    const tags = await db.query(`
      SELECT t.tag_id, t.name, COUNT(pt.post_id) AS post_count
      FROM tags t
      LEFT JOIN post_tags pt ON t.tag_id = pt.tag_id
      GROUP BY t.tag_id
      ORDER BY t.name ASC
    `);
    res.render("tags", { title: "Tags", tags });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(404).render("404", { title: "Tag Not Found" });

    const tagRows = await db.query("SELECT tag_id, name FROM tags WHERE tag_id = ?", [id]);
    if (tagRows.length === 0) {
      return res.status(404).render("404", { title: "Tag Not Found" });
    }

    const posts = await db.query(`
      SELECT p.post_id, p.title, p.created_at, p.is_spoiler,
             u.username, c.name AS category_name,
             COALESCE(SUM(v.value), 0) AS score
      FROM posts p
      JOIN users u      ON p.user_id = u.user_id
      JOIN categories c ON p.category_id = c.category_id
      JOIN post_tags pt ON p.post_id = pt.post_id
      LEFT JOIN votes v ON v.post_id = p.post_id
      WHERE pt.tag_id = ?
      GROUP BY p.post_id
      ORDER BY p.created_at DESC
    `, [id]);

    res.render("tag-detail", { title: tagRows[0].name, tag: tagRows[0], posts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
