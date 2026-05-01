// app/routes/leaderboard.js
//
// Public leaderboard. Sorts users by reputation_points, breaks ties on
// number of posts, then alphabetically. We keep the SQL deliberately
// simple so it's easy to explain in a code review.

const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.get("/", async (req, res, next) => {
  try {
    const users = await db.query(`
      SELECT u.user_id, u.username, u.bio, u.reputation_points,
             COUNT(DISTINCT p.post_id) AS post_count,
             COALESCE(SUM(v.value), 0) AS total_post_score
      FROM users u
      LEFT JOIN posts p ON p.user_id = u.user_id
      LEFT JOIN votes v ON v.post_id = p.post_id
      GROUP BY u.user_id
      ORDER BY u.reputation_points DESC, post_count DESC, u.username ASC
      LIMIT 50
    `);

    // Reuse the same rank ladder defined on app.locals so every page agrees.
    const rankFor = req.app.locals.rankFor;
    const ranked = users.map((u) => ({ ...u, rank: rankFor(u.reputation_points) }));

    res.render("leaderboard", { title: "Leaderboard", users: ranked });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
