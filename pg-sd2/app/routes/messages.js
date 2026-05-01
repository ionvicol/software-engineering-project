// app/routes/messages.js
//
// Direct messaging between users. URL design:
//
//   GET  /messages                    -> inbox: list of conversations
//   GET  /messages/with/:userId       -> a conversation with one user
//   POST /messages/with/:userId       -> send a message in that conversation
//
// All routes require login. A user can only see conversations they are
// part of — the WHERE clauses always pin one side of the pair to the
// current user's id, so the database itself enforces the privacy.
//
// Messages do not implement edit or delete by design. For coursework
// scope we treat sent messages as immutable record (matches WhatsApp
// pre-edit behaviour); easy to extend later.

const express = require("express");
const router = express.Router();
const db = require("../services/db");
const { requireAuth } = require("../middleware/auth");

// --- GET /messages : inbox -----------------------------------------
// Build one row per "other party" (the user who isn't me) along with
// the most recent message in that thread and an unread count.
router.get("/messages", requireAuth, async (req, res, next) => {
  try {
    const me = req.session.user.user_id;

    const conversations = await db.query(`
      SELECT
        partner.user_id AS partner_id,
        partner.username AS partner_username,
        latest.message_id,
        latest.content AS last_content,
        latest.created_at AS last_at,
        latest.sender_user_id = ? AS i_sent_last,
        unread.unread_count
      FROM (
        -- pick out one row per partner — the most recent message in each thread
        SELECT
          IF(sender_user_id = ?, recipient_user_id, sender_user_id) AS partner_id,
          MAX(message_id) AS latest_message_id
        FROM messages
        WHERE sender_user_id = ? OR recipient_user_id = ?
        GROUP BY partner_id
      ) threads
      JOIN messages latest ON latest.message_id = threads.latest_message_id
      JOIN users partner   ON partner.user_id = threads.partner_id
      LEFT JOIN (
        SELECT sender_user_id, COUNT(*) AS unread_count
        FROM messages
        WHERE recipient_user_id = ? AND is_read = FALSE
        GROUP BY sender_user_id
      ) unread ON unread.sender_user_id = threads.partner_id
      ORDER BY latest.created_at DESC
    `, [me, me, me, me, me]);

    res.render("messages-inbox", { title: "Messages", conversations });
  } catch (err) {
    next(err);
  }
});

// --- GET /messages/with/:userId : single conversation ---------------
router.get("/messages/with/:userId", requireAuth, async (req, res, next) => {
  try {
    const me = req.session.user.user_id;
    const partnerId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(partnerId)) return res.status(404).render("404", { title: "User Not Found" });
    if (partnerId === me) {
      req.session.flash = { type: "error", message: "You cannot message yourself." };
      return res.redirect("/messages");
    }

    const partnerRows = await db.query("SELECT user_id, username FROM users WHERE user_id = ?", [partnerId]);
    if (!partnerRows.length) return res.status(404).render("404", { title: "User Not Found" });

    const messages = await db.query(`
      SELECT message_id, sender_user_id, recipient_user_id, content, is_read, created_at
      FROM messages
      WHERE (sender_user_id = ? AND recipient_user_id = ?)
         OR (sender_user_id = ? AND recipient_user_id = ?)
      ORDER BY created_at ASC
    `, [me, partnerId, partnerId, me]);

    // Mark every unread message FROM the partner as read now that we are viewing them.
    if (messages.some((m) => m.recipient_user_id === me && !m.is_read)) {
      await db.query(
        "UPDATE messages SET is_read = TRUE WHERE recipient_user_id = ? AND sender_user_id = ? AND is_read = FALSE",
        [me, partnerId]
      );
    }

    res.render("messages-conversation", {
      title: `Chat with ${partnerRows[0].username}`,
      partner: partnerRows[0],
      messages,
      me,
    });
  } catch (err) {
    next(err);
  }
});

// --- POST /messages/with/:userId : send a message -------------------
router.post("/messages/with/:userId", requireAuth, async (req, res, next) => {
  try {
    const me = req.session.user.user_id;
    const partnerId = parseInt(req.params.userId, 10);
    const content = (req.body.content || "").trim();

    if (partnerId === me) {
      req.session.flash = { type: "error", message: "You cannot message yourself." };
      return res.redirect("/messages");
    }
    if (content.length < 1 || content.length > 2000) {
      req.session.flash = { type: "error", message: "Message must be 1–2000 characters." };
      return res.redirect(`/messages/with/${partnerId}`);
    }

    const exists = await db.query("SELECT 1 FROM users WHERE user_id = ?", [partnerId]);
    if (!exists.length) return res.status(404).render("404", { title: "User Not Found" });

    await db.query(
      "INSERT INTO messages (sender_user_id, recipient_user_id, content) VALUES (?, ?, ?)",
      [me, partnerId, content]
    );

    res.redirect(`/messages/with/${partnerId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
