// app/middleware/auth.js
//
// Two small middlewares used across the app:
//
// 1) attachUser    — runs on every request. If the session has a user,
//                    we expose it as res.locals.currentUser so PUG
//                    templates can show "Logged in as ..." or hide
//                    Create Post links. We also fetch their unread
//                    message count so the nav can show a badge. Also
//                    exposes a flash message once and clears it.
//
// 2) requireAuth   — guards routes that need a logged-in user.
//                    Anonymous requests get redirected to /login with
//                    a flash message and the original URL preserved
//                    so we can bounce them back after login.

const db = require("../services/db");

async function attachUser(req, res, next) {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  res.locals.unreadMessageCount = 0;

  // One-shot flash messages. Set with req.session.flash = {...}, read once, cleared.
  if (req.session && req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  } else {
    res.locals.flash = null;
  }

  // Fetch unread message count for the nav badge. Wrapped in try/catch so
  // a transient DB error here never breaks every page; the badge just
  // doesn't render.
  if (res.locals.currentUser) {
    try {
      const rows = await db.query(
        "SELECT COUNT(*) AS n FROM messages WHERE recipient_user_id = ? AND is_read = FALSE",
        [res.locals.currentUser.user_id]
      );
      res.locals.unreadMessageCount = Number(rows[0].n) || 0;
    } catch (err) {
      // Non-fatal: messages table may not exist in some test environments.
      res.locals.unreadMessageCount = 0;
    }
  }

  next();
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.flash = { type: "error", message: "Please log in to continue." };
  // Remember where they wanted to go.
  req.session.returnTo = req.originalUrl;
  return res.redirect("/login");
}

module.exports = { attachUser, requireAuth };
