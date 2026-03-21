const express = require('express');
const router = express.Router();
const db = require('../services/db');

router.get('/', async (req, res, next) => {
  try {
    const posts = await db.query(`
      SELECT p.post_id, p.title, p.content, p.created_at, p.is_spoiler,
             u.username, c.name AS category_name,
             GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') AS tags
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN post_tags pt ON p.post_id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.tag_id
      GROUP BY p.post_id
      ORDER BY p.created_at DESC
    `);

    res.render('posts', { title: 'Posts', posts });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const postRows = await db.query(`
      SELECT p.post_id, p.title, p.content, p.created_at, p.updated_at, p.is_spoiler,
             u.user_id, u.username, c.category_id, c.name AS category_name
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.post_id = ?
    `, [req.params.id]);

    if (postRows.length === 0) {
      return res.status(404).render('404', { title: 'Post Not Found' });
    }

    const tags = await db.query(`
      SELECT t.tag_id, t.name
      FROM tags t
      JOIN post_tags pt ON t.tag_id = pt.tag_id
      WHERE pt.post_id = ?
      ORDER BY t.name ASC
    `, [req.params.id]);

    res.render('post-detail', {
      title: postRows[0].title,
      post: postRows[0],
      tags,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
