// app/routes/auth.js
//
// Account routes: register, login, logout.
//
// Security notes for the code review:
//   - Passwords are hashed with bcrypt (10 rounds) before insertion;
//     plain text is never stored or logged.
//   - Login uses bcrypt.compare(), which is constant-time, so the
//     duration of the comparison does not leak information about
//     correct vs incorrect passwords.
//   - All SQL uses parameterised queries.
//   - Validation errors are reported back via the same form so users
//     can correct mistakes without losing the fields they typed.

const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const db = require("../services/db");

const BCRYPT_ROUNDS = 10;

// ---------------- Register ----------------
router.get("/register", (req, res) => {
  // Already-logged-in users have nothing to register; bounce them home.
  if (req.session.user) return res.redirect("/");
  res.render("register", { title: "Register", form: {}, errors: [] });
});

router.post("/register", async (req, res, next) => {
  try {
    const username = (req.body.username || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    const bio = (req.body.bio || "").trim();

    const errors = [];
    if (username.length < 3 || username.length > 50) errors.push("Username must be 3–50 characters.");
    if (!/^[A-Za-z0-9_]+$/.test(username)) errors.push("Username can only contain letters, numbers and underscores.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Please enter a valid email address.");
    if (password.length < 8) errors.push("Password must be at least 8 characters.");

    if (errors.length) {
      return res.status(400).render("register", { title: "Register", form: { username, email, bio }, errors });
    }

    // Reject duplicates explicitly so we can show a friendly error
    // rather than relying on a database-level UNIQUE violation.
    const existing = await db.query(
      "SELECT user_id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, email]
    );
    if (existing.length) {
      errors.push("That username or email is already in use.");
      return res.status(409).render("register", { title: "Register", form: { username, email, bio }, errors });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await db.query(
      "INSERT INTO users (username, email, password_hash, bio) VALUES (?, ?, ?, ?)",
      [username, email, hash, bio || null]
    );

    // Log the new user in immediately. We store only the minimum fields
    // we need for navigation so the session cookie stays small.
    req.session.user = { user_id: result.insertId, username, is_admin: false };
    req.session.flash = { type: "success", message: `Welcome, ${username}!` };
    return res.redirect("/");
  } catch (err) {
    next(err);
  }
});

// ---------------- Login ----------------
router.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("login", { title: "Log in", form: {}, errors: [] });
});

router.post("/login", async (req, res, next) => {
  try {
    const identifier = (req.body.identifier || "").trim(); // username OR email
    const password = req.body.password || "";

    if (!identifier || !password) {
      return res.status(400).render("login", { title: "Log in", form: { identifier }, errors: ["Please enter username/email and password."] });
    }

    const rows = await db.query(
      "SELECT user_id, username, password_hash, is_admin FROM users WHERE username = ? OR email = ? LIMIT 1",
      [identifier, identifier.toLowerCase()]
    );

    // Use the same generic error in both "user not found" and "bad password"
    // cases so we don't leak which usernames exist on the platform.
    const ok = rows.length > 0 && await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) {
      return res.status(401).render("login", { title: "Log in", form: { identifier }, errors: ["Incorrect username/email or password."] });
    }

    const user = rows[0];
    req.session.user = { user_id: user.user_id, username: user.username, is_admin: !!user.is_admin };

    // If the user was bounced here from a guarded route, send them back.
    const target = req.session.returnTo || "/";
    delete req.session.returnTo;
    req.session.flash = { type: "success", message: `Welcome back, ${user.username}!` };
    return res.redirect(target);
  } catch (err) {
    next(err);
  }
});

// ---------------- Logout ----------------
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
