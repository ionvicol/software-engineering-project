const express = require('express');
const path = require('path');
const db = require('./services/db');

const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const categoryRoutes = require('./routes/categories');
const tagRoutes = require('./routes/tags');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '..', 'static')));
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res, next) => {
  try {
    const [userCount, postCount, categoryCount, tagCount, latestPosts] = await Promise.all([
      db.query('SELECT COUNT(*) AS total FROM users'),
      db.query('SELECT COUNT(*) AS total FROM posts'),
      db.query('SELECT COUNT(*) AS total FROM categories'),
      db.query('SELECT COUNT(*) AS total FROM tags'),
      db.query(`
        SELECT p.post_id, p.title, p.created_at, u.username, c.name AS category_name
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        JOIN categories c ON p.category_id = c.category_id
        ORDER BY p.created_at DESC
        LIMIT 5
      `)
    ]);

    res.render('index', {
      title: 'Game Tips Forum',
      stats: {
        users: userCount[0].total,
        posts: postCount[0].total,
        categories: categoryCount[0].total,
        tags: tagCount[0].total,
      },
      latestPosts,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/db_test', async (req, res, next) => {
  try {
    const results = await db.query('SELECT * FROM users LIMIT 5');
    res.json(results);
  } catch (err) {
    next(err);
  }
});

app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/categories', categoryRoutes);
app.use('/tags', tagRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('500', { title: 'Server Error', error: err.message });
});

app.listen(3000, () => {
  console.log('Server running at http://127.0.0.1:3000/');
});

module.exports = app;
