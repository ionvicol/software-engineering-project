// app/routes/users.js
//
// Read-only views of the user directory. List shows everyone, with
// reputation and post count. Profile page shows that user's posts.

const express = require("express");
const router = express.Router();
const db = require("../services/db");

// GET /users — directory page
router.get("/", async (req, res, next) => {
  try {
    const users = await db.query(`
      SELECT u.user_id, u.username, u.bio, u.reputation_points, u.created_at,
             COUNT(p.post_id) AS post_count
      FROM users u
      LEFT JOIN posts p ON u.user_id = p.user_id
      GROUP BY u.user_id
      ORDER BY u.reputation_points DESC, u.username ASC
    `);

    const rankFor = req.app.locals.rankFor;
    const ranked = users.map((u) => ({ ...u, rank: rankFor(u.reputation_points) }));

    res.render("users", { title: "Users", users: ranked });
  } catch (err) {
    next(err);
  }
});

// GET /users/:id — single profile page with that user's posts
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(404).render("404", { title: "User Not Found" });

    const userRows = await db.query(
      "SELECT user_id, username, email, bio, reputation_points, created_at FROM users WHERE user_id = ?",
      [id]
    );
    if (userRows.length === 0) {
      return res.status(404).render("404", { title: "User Not Found" });
    }

    // Run the four impact-summary queries in parallel with the post list.
    // These are the numbers shown in the Personal Impact dashboard panel.
    const [posts, postCountRows, votesReceivedRows, commentsReceivedRows, totalScoreRows] = await Promise.all([
      db.query(`
        SELECT p.post_id, p.title, p.created_at, p.is_spoiler,
               c.name AS category_name,
               COALESCE(SUM(v.value), 0) AS score
        FROM posts p
        JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN votes v ON v.post_id = p.post_id
        WHERE p.user_id = ?
        GROUP BY p.post_id
        ORDER BY p.created_at DESC
      `, [id]),
      db.query("SELECT COUNT(*) AS n FROM posts WHERE user_id = ?", [id]),
      // Split upvotes vs downvotes received across all of this user's posts.
      db.query(`
        SELECT
          COALESCE(SUM(CASE WHEN v.value = 1  THEN 1 ELSE 0 END), 0) AS upvotes,
          COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes
        FROM posts p
        LEFT JOIN votes v ON v.post_id = p.post_id
        WHERE p.user_id = ?
      `, [id]),
      // How many comments other users have left on this user's posts.
      db.query(`
        SELECT COUNT(*) AS n
        FROM comments c
        JOIN posts p ON c.post_id = p.post_id
        WHERE p.user_id = ?
      `, [id]),
      db.query(`
        SELECT COALESCE(SUM(v.value), 0) AS total_score
        FROM votes v
        JOIN posts p ON v.post_id = p.post_id
        WHERE p.user_id = ?
      `, [id]),
    ]);

    const user = userRows[0];
    user.rank = req.app.locals.rankFor(user.reputation_points);

    const impact = {
      post_count:        Number(postCountRows[0].n) || 0,
      upvotes_received:  Number(votesReceivedRows[0].upvotes) || 0,
      downvotes_received:Number(votesReceivedRows[0].downvotes) || 0,
      comments_received: Number(commentsReceivedRows[0].n) || 0,
      total_post_score:  Number(totalScoreRows[0].total_score) || 0,
    };

    res.render("user-profile", { title: user.username, user, posts, impact });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
