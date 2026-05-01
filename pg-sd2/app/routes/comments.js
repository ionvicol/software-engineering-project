// app/routes/comments.js
//
// Comments live under a post. We register them at app root level
// because the URLs are nested (POST /posts/:id/comments).
//
// Authors and admins can delete a comment. Anyone logged in can post.

const express = require("express");
const router = express.Router();
const db = require("../services/db");
const { requireAuth } = require("../middleware/auth");

// Add a comment to a post
router.post("/posts/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const content = (req.body.content || "").trim();

    if (content.length < 1 || content.length > 2000) {
      req.session.flash = { type: "error", message: "Comment must be 1–2000 characters." };
      return res.redirect(`/posts/${postId}`);
    }

    const postExists = await db.query("SELECT 1 FROM posts WHERE post_id = ?", [postId]);
    if (!postExists.length) return res.status(404).render("404", { title: "Post Not Found" });

    await db.query(
      "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
      [postId, req.session.user.user_id, content]
    );

    req.session.flash = { type: "success", message: "Comment posted." };
    res.redirect(`/posts/${postId}#comments`);
  } catch (err) {
    next(err);
  }
});

// Delete a comment (author or admin)
router.post("/comments/:id/delete", requireAuth, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const rows = await db.query("SELECT post_id, user_id FROM comments WHERE comment_id = ?", [commentId]);
    if (!rows.length) return res.status(404).render("404", { title: "Comment Not Found" });

    const owner = rows[0].user_id === req.session.user.user_id;
    if (!owner && !req.session.user.is_admin) {
      return res.status(403).render("500", { title: "Forbidden", error: "You can only delete your own comments." });
    }

    await db.query("DELETE FROM comments WHERE comment_id = ?", [commentId]);
    req.session.flash = { type: "success", message: "Comment deleted." };
    res.redirect(`/posts/${rows[0].post_id}#comments`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
