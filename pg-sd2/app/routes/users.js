const express = require('express');
const router = express.Router();
const db = require('../services/db');

router.get('/', async (req, res, next) => {
  try {
    const users = await db.query(`
      SELECT u.user_id, u.username, u.email, u.bio, u.reputation_points, u.created_at,
             COUNT(p.post_id) AS post_count
      FROM users u
      LEFT JOIN posts p ON u.user_id = p.user_id
      GROUP BY u.user_id
      ORDER BY u.reputation_points DESC, u.username ASC
    `);

    res.render('users', { title: 'Users', users });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userRows = await db.query(
      `SELECT user_id, username, email, bio, reputation_points, created_at FROM users WHERE user_id = ?`,
      [req.params.id]
    );

    if (userRows.length === 0) {
      return res.status(404).render('404', { title: 'User Not Found' });
    }

    const posts = await db.query(`
      SELECT p.post_id, p.title, p.created_at, c.name AS category_name
      FROM posts p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [req.params.id]);

    res.render('user-profile', {
      title: userRows[0].username,
      user: userRows[0],
      posts,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
