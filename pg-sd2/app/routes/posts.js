// app/routes/posts.js
//
// Posts: list (with filters + search), detail (with score, comments,
// vote state for current user), and full CRUD (create / edit / delete).
//
// Routes guarded by requireAuth: /new, the create POST, the edit pages,
// and the delete POST. Edit and delete additionally check ownership so
// one user cannot modify another's post.

const express = require("express");
const router = express.Router();
const db = require("../services/db");
const { requireAuth } = require("../middleware/auth");

// --------------------------------------------------------------------
// GET /posts  — Browse posts page with optional ?q=, ?category=, ?tag=
// --------------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const search = (req.query.q || "").trim();
    const categoryId = req.query.category ? parseInt(req.query.category, 10) : null;
    const tagId = req.query.tag ? parseInt(req.query.tag, 10) : null;

    // Build WHERE clauses dynamically while keeping every dynamic value
    // parameterised. We never concatenate user input into SQL.
    const where = [];
    const params = [];

    if (search) {
      where.push("(p.title LIKE ? OR p.content LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (categoryId) {
      where.push("p.category_id = ?");
      params.push(categoryId);
    }
    if (tagId) {
      // EXISTS subquery is clearer than another JOIN+GROUP BY for filtering.
      where.push("EXISTS (SELECT 1 FROM post_tags pt2 WHERE pt2.post_id = p.post_id AND pt2.tag_id = ?)");
      params.push(tagId);
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const posts = await db.query(`
      SELECT p.post_id, p.title, p.content, p.created_at, p.is_spoiler, p.game_title,
             u.user_id, u.username,
             c.category_id, c.name AS category_name,
             COALESCE(SUM(v.value), 0) AS score,
             GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') AS tag_list
      FROM posts p
      JOIN users u      ON p.user_id = u.user_id
      JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN votes v     ON v.post_id = p.post_id
      LEFT JOIN post_tags pt ON pt.post_id = p.post_id
      LEFT JOIN tags t       ON t.tag_id = pt.tag_id
      ${whereSql}
      GROUP BY p.post_id
      ORDER BY p.created_at DESC
    `, params);

    // Provide filter dropdowns
    const [categories, tags] = await Promise.all([
      db.query("SELECT category_id, name FROM categories ORDER BY name"),
      db.query("SELECT tag_id, name FROM tags ORDER BY name"),
    ]);

    res.render("posts", {
      title: "Browse Posts",
      posts,
      categories,
      tags,
      filters: { q: search, category: categoryId, tag: tagId },
    });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------------
// GET /posts/new  — show the create-post form (login required)
// --------------------------------------------------------------------
router.get("/new", requireAuth, async (req, res, next) => {
  try {
    const [categories, tags] = await Promise.all([
      db.query("SELECT category_id, name FROM categories ORDER BY name"),
      db.query("SELECT tag_id, name FROM tags ORDER BY name"),
    ]);
    res.render("post-form", {
      title: "Create Post",
      mode: "create",
      action: "/posts",
      post: { title: "", content: "", game_title: "", media_url: "", category_id: null, is_spoiler: false },
      selectedTagIds: [],
      categories,
      tags,
      errors: [],
    });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------------
// POST /posts  — create a new post (login required)
// --------------------------------------------------------------------
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { errors, fields } = readPostBody(req.body);
    if (errors.length) {
      const [categories, tags] = await Promise.all([
        db.query("SELECT category_id, name FROM categories ORDER BY name"),
        db.query("SELECT tag_id, name FROM tags ORDER BY name"),
      ]);
      return res.status(400).render("post-form", {
        title: "Create Post", mode: "create", action: "/posts",
        post: fields, selectedTagIds: fields.tagIds, categories, tags, errors,
      });
    }

    const result = await db.query(
      "INSERT INTO posts (user_id, category_id, title, content, game_title, media_url, is_spoiler) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.session.user.user_id, fields.category_id, fields.title, fields.content, fields.game_title || null, fields.media_url || null, fields.is_spoiler ? 1 : 0]
    );

    if (fields.tagIds.length) {
      const values = fields.tagIds.map(() => "(?, ?)").join(", ");
      const params = [];
      fields.tagIds.forEach((tid) => params.push(result.insertId, tid));
      await db.query(`INSERT INTO post_tags (post_id, tag_id) VALUES ${values}`, params);
    }

    req.session.flash = { type: "success", message: "Post created." };
    res.redirect(`/posts/${result.insertId}`);
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------------
// GET /posts/:id  — single post detail with comments, score, my vote
// --------------------------------------------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(404).render("404", { title: "Post Not Found" });

    const postRows = await db.query(`
      SELECT p.post_id, p.title, p.content, p.created_at, p.updated_at, p.is_spoiler, p.game_title, p.media_url,
             u.user_id, u.username,
             c.category_id, c.name AS category_name,
             COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.post_id), 0) AS score
      FROM posts p
      JOIN users u      ON p.user_id = u.user_id
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.post_id = ?
    `, [id]);

    if (postRows.length === 0) {
      return res.status(404).render("404", { title: "Post Not Found" });
    }

    const [tags, comments, myVoteRows, related] = await Promise.all([
      db.query(`
        SELECT t.tag_id, t.name FROM tags t
        JOIN post_tags pt ON t.tag_id = pt.tag_id
        WHERE pt.post_id = ? ORDER BY t.name
      `, [id]),
      db.query(`
        SELECT c.comment_id, c.content, c.created_at, u.user_id, u.username
        FROM comments c JOIN users u ON c.user_id = u.user_id
        WHERE c.post_id = ? ORDER BY c.created_at ASC
      `, [id]),
      // Look up the current user's vote (if any) so the UI can highlight it.
      req.session.user
        ? db.query("SELECT value FROM votes WHERE user_id = ? AND post_id = ?", [req.session.user.user_id, id])
        : Promise.resolve([]),
      // Related posts recommendation. Ranks other posts by the count of
      // tags they share with this one. Falls back to same-category posts
      // if this post has no tags. This is the "basic matching algorithm"
      // requested in the brief.
      findRelatedPosts(id, postRows[0].category_id),
    ]);

    res.render("post-detail", {
      title: postRows[0].title,
      post: postRows[0],
      tags,
      comments,
      myVote: myVoteRows.length ? myVoteRows[0].value : 0,
      related,
    });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------------
// GET /posts/:id/edit  — edit form (owner only)
// --------------------------------------------------------------------
router.get("/:id/edit", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await db.query("SELECT * FROM posts WHERE post_id = ?", [id]);
    if (!rows.length) return res.status(404).render("404", { title: "Post Not Found" });

    const post = rows[0];
    if (!ownsOrAdmin(req, post.user_id)) {
      return res.status(403).render("500", { title: "Forbidden", error: "You can only edit your own posts." });
    }

    const [categories, tags, postTags] = await Promise.all([
      db.query("SELECT category_id, name FROM categories ORDER BY name"),
      db.query("SELECT tag_id, name FROM tags ORDER BY name"),
      db.query("SELECT tag_id FROM post_tags WHERE post_id = ?", [id]),
    ]);

    res.render("post-form", {
      title: "Edit Post",
      mode: "edit",
      action: `/posts/${id}`,
      post,
      selectedTagIds: postTags.map((r) => r.tag_id),
      categories,
      tags,
      errors: [],
    });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------------
// POST /posts/:id  — update an existing post (owner only)
// --------------------------------------------------------------------
router.post("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await db.query("SELECT user_id FROM posts WHERE post_id = ?", [id]);
    if (!existing.length) return res.status(404).render("404", { title: "Post Not Found" });
    if (!ownsOrAdmin(req, existing[0].user_id)) {
      return res.status(403).render("500", { title: "Forbidden", error: "You can only edit your own posts." });
    }

    const { errors, fields } = readPostBody(req.body);
    if (errors.length) {
      const [categories, tags] = await Promise.all([
        db.query("SELECT category_id, name FROM categories ORDER BY name"),
        db.query("SELECT tag_id, name FROM tags ORDER BY name"),
      ]);
      return res.status(400).render("post-form", {
        title: "Edit Post", mode: "edit", action: `/posts/${id}`,
        post: { ...fields, post_id: id }, selectedTagIds: fields.tagIds, categories, tags, errors,
      });
    }

    await db.query(
      "UPDATE posts SET title = ?, content = ?, category_id = ?, game_title = ?, media_url = ?, is_spoiler = ?, updated_at = NOW() WHERE post_id = ?",
      [fields.title, fields.content, fields.category_id, fields.game_title || null, fields.media_url || null, fields.is_spoiler ? 1 : 0, id]
    );

    // Replace the tag associations: simplest correct approach is delete-then-insert.
    await db.query("DELETE FROM post_tags WHERE post_id = ?", [id]);
    if (fields.tagIds.length) {
      const values = fields.tagIds.map(() => "(?, ?)").join(", ");
      const params = [];
      fields.tagIds.forEach((tid) => params.push(id, tid));
      await db.query(`INSERT INTO post_tags (post_id, tag_id) VALUES ${values}`, params);
    }

    req.session.flash = { type: "success", message: "Post updated." };
    res.redirect(`/posts/${id}`);
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------------
// POST /posts/:id/delete  — delete a post (owner only)
// FK ON DELETE CASCADE removes votes/comments/post_tags automatically.
// --------------------------------------------------------------------
router.post("/:id/delete", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await db.query("SELECT user_id FROM posts WHERE post_id = ?", [id]);
    if (!rows.length) return res.status(404).render("404", { title: "Post Not Found" });
    if (!ownsOrAdmin(req, rows[0].user_id)) {
      return res.status(403).render("500", { title: "Forbidden", error: "You can only delete your own posts." });
    }

    await db.query("DELETE FROM posts WHERE post_id = ?", [id]);
    req.session.flash = { type: "success", message: "Post deleted." };
    res.redirect("/posts");
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------
function ownsOrAdmin(req, ownerId) {
  return req.session.user && (req.session.user.user_id === ownerId || req.session.user.is_admin);
}

// Basic matching algorithm. Returns up to 5 posts that are similar to
// the given post, ranked by tag overlap. Posts sharing more tags with
// the source post score higher; ties broken by recency.
//
// If the source post has no tags, we fall back to "other recent posts
// in the same category" so the UI is never empty.
//
// SQL is deliberately simple — one query, easy to talk through in oral.
async function findRelatedPosts(postId, categoryId) {
  // First try tag-overlap matching.
  const tagBased = await db.query(`
    SELECT p.post_id, p.title, p.created_at, u.username, c.name AS category_name,
           COUNT(*) AS shared_tags
    FROM posts p
    JOIN post_tags pt ON p.post_id = pt.post_id
    JOIN users u      ON p.user_id = u.user_id
    JOIN categories c ON p.category_id = c.category_id
    WHERE pt.tag_id IN (SELECT tag_id FROM post_tags WHERE post_id = ?)
      AND p.post_id != ?
    GROUP BY p.post_id
    ORDER BY shared_tags DESC, p.created_at DESC
    LIMIT 5
  `, [postId, postId]);

  if (tagBased.length > 0) return tagBased;

  // Fallback: recent posts in the same category.
  return db.query(`
    SELECT p.post_id, p.title, p.created_at, u.username, c.name AS category_name,
           0 AS shared_tags
    FROM posts p
    JOIN users u      ON p.user_id = u.user_id
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.category_id = ? AND p.post_id != ?
    ORDER BY p.created_at DESC
    LIMIT 5
  `, [categoryId, postId]);
}

// Pull, validate and normalise the post form body. Returns:
//   { errors: string[], fields: { title, content, game_title, media_url, category_id, is_spoiler, tagIds[] } }
function readPostBody(body) {
  const title = (body.title || "").trim();
  const content = (body.content || "").trim();
  const game_title = (body.game_title || "").trim();
  const media_url = (body.media_url || "").trim();
  const category_id = parseInt(body.category_id, 10);
  const is_spoiler = body.is_spoiler === "on" || body.is_spoiler === "1" || body.is_spoiler === true;

  // tags from a multi-select arrive either as a string (one chosen) or array.
  let tagIds = [];
  if (Array.isArray(body.tag_ids)) tagIds = body.tag_ids;
  else if (body.tag_ids) tagIds = [body.tag_ids];
  tagIds = tagIds.map((t) => parseInt(t, 10)).filter((n) => Number.isFinite(n));

  const errors = [];
  if (title.length < 5 || title.length > 150) errors.push("Title must be 5–150 characters.");
  if (content.length < 10) errors.push("Content must be at least 10 characters.");
  if (!Number.isFinite(category_id)) errors.push("Please choose a category.");

  // Media URL is optional. If present, it must be http(s) and reasonable length.
  // We deliberately don't try to verify the URL resolves — the page will simply
  // fail to render the <img> if the link is bad, which is acceptable.
  if (media_url) {
    if (media_url.length > 500) errors.push("Media URL is too long (max 500 characters).");
    else if (!/^https?:\/\/[^\s]+$/i.test(media_url)) errors.push("Media URL must start with http:// or https://");
  }

  return { errors, fields: { title, content, game_title, media_url, category_id, is_spoiler, tagIds } };
}

module.exports = router;
