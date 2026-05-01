// app/routes/votes.js
//
// Voting endpoint. Implements the three-case logic from the Sprint 2
// voting sequence diagram exactly:
//
//   [A] No existing vote      -> insert (+1 or -1).  Reputation += value.
//   [B] Same vote re-clicked  -> delete vote.        Reputation -= value (toggle off).
//   [C] Opposite vote clicked -> update vote value.  Reputation += 2*value (swap).
//
// The endpoint is JSON-first (called by static/js/votes.js via fetch)
// so the page does not have to fully reload after every vote — the
// client just updates the score number and the highlighted button.
//
// Returning JSON also keeps a clear contract: one URL, one verb, one
// response shape. Easy to talk through in a code review.

const express = require("express");
const router = express.Router();
const db = require("../services/db");
const { requireAuth } = require("../middleware/auth");

router.post("/posts/:id/vote", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const requested = parseInt(req.body.value, 10); // expect +1 or -1
    if (![1, -1].includes(requested)) {
      return res.status(400).json({ error: "Vote value must be +1 or -1." });
    }

    // Look up the post so we know its author for reputation accounting,
    // and confirm it still exists.
    const postRows = await db.query("SELECT user_id FROM posts WHERE post_id = ?", [postId]);
    if (!postRows.length) return res.status(404).json({ error: "Post not found." });
    const authorId = postRows[0].user_id;

    // Voters cannot rate their own posts — keeps reputation honest.
    if (authorId === req.session.user.user_id) {
      return res.status(400).json({ error: "You cannot vote on your own post." });
    }

    const existingRows = await db.query(
      "SELECT value FROM votes WHERE user_id = ? AND post_id = ?",
      [req.session.user.user_id, postId]
    );
    const existing = existingRows.length ? existingRows[0].value : 0;

    let myVote;        // what the user's vote will be after this request
    let repDelta;      // how the post author's reputation changes

    if (existing === 0) {
      // [A] First time voting on this post.
      await db.query(
        "INSERT INTO votes (user_id, post_id, value) VALUES (?, ?, ?)",
        [req.session.user.user_id, postId, requested]
      );
      myVote = requested;
      repDelta = requested;
    } else if (existing === requested) {
      // [B] Same button clicked again -> toggle off.
      await db.query(
        "DELETE FROM votes WHERE user_id = ? AND post_id = ?",
        [req.session.user.user_id, postId]
      );
      myVote = 0;
      repDelta = -requested;
    } else {
      // [C] Switching from up to down (or vice versa).
      await db.query(
        "UPDATE votes SET value = ? WHERE user_id = ? AND post_id = ?",
        [requested, req.session.user.user_id, postId]
      );
      myVote = requested;
      repDelta = 2 * requested;
    }

    await db.query(
      "UPDATE users SET reputation_points = reputation_points + ? WHERE user_id = ?",
      [repDelta, authorId]
    );

    // Return the new aggregate score so the client can render it.
    const sumRows = await db.query(
      "SELECT COALESCE(SUM(value), 0) AS score FROM votes WHERE post_id = ?",
      [postId]
    );
    res.json({ score: Number(sumRows[0].score), myVote });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
