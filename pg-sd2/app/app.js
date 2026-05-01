// app/app.js
//
// Express application bootstrap. Responsibilities:
//   - View engine + static files
//   - Body parsing + JSON
//   - Sessions (used for login state and flash messages)
//   - Make currentUser available to every PUG template
//   - Mount per-resource routers
//   - Home page (dashboard with stats + latest posts + top contributors)
//   - 404 + 500 error renderers

const express = require("express");
const path = require("path");
const session = require("express-session");

const db = require("./services/db");
const { attachUser } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const categoryRoutes = require("./routes/categories");
const tagRoutes = require("./routes/tags");
const commentRoutes = require("./routes/comments");
const voteRoutes = require("./routes/votes");
const reportRoutes = require("./routes/reports");
const leaderboardRoutes = require("./routes/leaderboard");
const messageRoutes = require("./routes/messages");
const accountRoutes = require("./routes/account");

const app = express();

// --- View engine + static files -------------------------------------
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "..", "static")));

// --- Body parsing ---------------------------------------------------
app.use(express.urlencoded({ extended: true })); // <form> POST bodies
app.use(express.json());                          // /vote AJAX POST

// Sessions
// In a production app we would use a session store (e.g. Redis). For a
// coursework project the default in-memory store is fine; sessions are
// reset on every server restart, which is acceptable.
//
// On Render and most PaaS hosts, the platform terminates HTTPS in front
// of the app and forwards the request as plain HTTP. We need to
// `trust proxy` so Express knows the original request was secure, and
// set `cookie.secure = true` in production so cookies are only sent
// over HTTPS.
const isProd = process.env.NODE_ENV === "production";
if (isProd) app.set("trust proxy", 1);

app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret-please-change-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

// Make req.session.user available as res.locals.currentUser to every view.
app.use(attachUser);

// --- Home page ------------------------------------------------------
app.get("/", async (req, res, next) => {
  try {
    const [userCount, postCount, categoryCount, tagCount, latestPosts, topContributors, popularCategories] = await Promise.all([
      db.query("SELECT COUNT(*) AS total FROM users"),
      db.query("SELECT COUNT(*) AS total FROM posts"),
      db.query("SELECT COUNT(*) AS total FROM categories"),
      db.query("SELECT COUNT(*) AS total FROM tags"),
      // Latest 5 posts with score
      db.query(`
        SELECT p.post_id, p.title, p.created_at, p.is_spoiler,
               u.user_id, u.username,
               c.category_id, c.name AS category_name,
               COALESCE(SUM(v.value), 0) AS score
        FROM posts p
        JOIN users u      ON p.user_id = u.user_id
        JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN votes v ON v.post_id = p.post_id
        GROUP BY p.post_id
        ORDER BY p.created_at DESC
        LIMIT 5
      `),
      // Top 5 contributors
      db.query(`
        SELECT u.user_id, u.username, u.reputation_points,
               COUNT(p.post_id) AS post_count
        FROM users u
        LEFT JOIN posts p ON p.user_id = u.user_id
        GROUP BY u.user_id
        ORDER BY u.reputation_points DESC, post_count DESC, u.username ASC
        LIMIT 5
      `),
      // Categories ranked by post count for the home sidebar
      db.query(`
        SELECT c.category_id, c.name, COUNT(p.post_id) AS post_count
        FROM categories c
        LEFT JOIN posts p ON c.category_id = p.category_id
        GROUP BY c.category_id
        ORDER BY post_count DESC, c.name ASC
        LIMIT 6
      `),
    ]);

    // Compute display rank for each top contributor.
    const rankedContributors = topContributors.map((u) => ({ ...u, rank: rankFor(u.reputation_points) }));

    res.render("index", {
      title: "Home",
      stats: {
        users: userCount[0].total,
        posts: postCount[0].total,
        categories: categoryCount[0].total,
        tags: tagCount[0].total,
      },
      latestPosts,
      topContributors: rankedContributors,
      popularCategories,
    });
  } catch (err) {
    next(err);
  }
});

// Rank thresholds match wireframe: Novice -> Expert -> Master -> Legend.
// Exported here so other routes/views can reuse the same ladder.
function rankFor(points) {
  if (points >= 2501) return "Legend";
  if (points >= 1501) return "Master";
  if (points >= 501)  return "Expert";
  return "Novice";
}
app.locals.rankFor = rankFor;

// --- Mount per-resource routers ------------------------------------
app.use("/", authRoutes);                  // /login, /register, /logout
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/categories", categoryRoutes);
app.use("/tags", tagRoutes);
app.use("/", commentRoutes);               // POST /posts/:id/comments etc.
app.use("/", voteRoutes);                  // POST /posts/:id/vote
app.use("/", reportRoutes);                // POST /posts/:id/report
app.use("/leaderboard", leaderboardRoutes);
app.use("/", messageRoutes);               // /messages and /messages/with/:userId
app.use("/", accountRoutes);               // /account, /account/delete, /privacy

// --- Errors --------------------------------------------------------
app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("500", { title: "Server Error", error: err.message });
});

const PORT = process.env.PORT || 3000;
// Skip starting the listener when the app is imported by the test
// runner — supertest spins up its own ephemeral server per test.
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/`);
  });
}

module.exports = app;
