// app/routes/reports.js
//
// Lightweight moderation queue. Logged-in users can flag a post; admins
// see the queue and can mark items resolved (which leaves the record
// for audit but stops it appearing as "open").

const express = require("express");
const router = express.Router();
const db = require("../services/db");
const { requireAuth } = require("../middleware/auth");

// Submit a report
router.post("/posts/:id/report", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const reason = (req.body.reason || "").trim();

    if (reason.length < 5 || reason.length > 255) {
      req.session.flash = { type: "error", message: "Report reason must be 5–255 characters." };
      return res.redirect(`/posts/${postId}`);
    }

    const exists = await db.query("SELECT 1 FROM posts WHERE post_id = ?", [postId]);
    if (!exists.length) return res.status(404).render("404", { title: "Post Not Found" });

    await db.query(
      "INSERT INTO reports (post_id, reporter_user_id, reason) VALUES (?, ?, ?)",
      [postId, req.session.user.user_id, reason]
    );
    req.session.flash = { type: "success", message: "Report submitted. Thank you for helping keep the community safe." };
    res.redirect(`/posts/${postId}`);
  } catch (err) {
    next(err);
  }
});

// Admin moderation queue
router.get("/admin/reports", requireAuth, async (req, res, next) => {
  try {
    if (!req.session.user.is_admin) {
      return res.status(403).render("500", { title: "Forbidden", error: "Admin access required." });
    }
    const reports = await db.query(`
      SELECT r.report_id, r.reason, r.status, r.created_at,
             p.post_id, p.title,
             u.user_id AS reporter_id, u.username AS reporter_name
      FROM reports r
      JOIN posts p ON r.post_id = p.post_id
      JOIN users u ON r.reporter_user_id = u.user_id
      ORDER BY (r.status = 'open') DESC, r.created_at DESC
    `);
    res.render("admin-reports", { title: "Reports", reports });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/reports/:id/resolve", requireAuth, async (req, res, next) => {
  try {
    if (!req.session.user.is_admin) {
      return res.status(403).render("500", { title: "Forbidden", error: "Admin access required." });
    }
    await db.query("UPDATE reports SET status = 'resolved' WHERE report_id = ?", [parseInt(req.params.id, 10)]);
    res.redirect("/admin/reports");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
