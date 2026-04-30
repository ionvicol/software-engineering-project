# Software Engineering Project

# GameTips forum

The “Game Tips and Tricks Forum” is an online platform created for gamers to share advice, strategies, and useful information about different video games. The purpose of this project is to build a space where players can ask questions, post helpful tips, and learn from each other’s experiences. The forum allows users to interact, discuss gameplay techniques, and improve their skills by exchanging knowledge. This project focuses on creating a simple and organized community where gamers can connect and support one another. 

**Stack:** Node.js · Express · PUG · MySQL · Docker · vanilla JavaScript · CSS · Nightwatch.

---

## 1. Tests

Two test suites, run separately for speed:

```bash
docker compose exec web npm test          # Smoke tests (supertest, no DB)
docker compose exec web npm run test:e2e  # End-to-end tests (Nightwatch + headless Chrome)
```

`npm run test:e2e:headed` runs Nightwatch with a visible Chrome window
for debugging — useful locally, never in CI.

### What's covered

**Smoke tests** (`tests/smoke.test.js` — Node `node:test` + supertest):
- `GET /login` returns the login form
- `GET /register` returns the register form
- `POST /login` with empty body returns 400
- `GET /no-such-page` returns the 404 page
- `GET /css/styles.css` is served with a CSS content type

**End-to-end tests** (`tests/e2e/*.test.js` — Nightwatch driving real Chrome):
- **01 — Public browse**: anonymous user can load the home page, browse posts with filters, and click into a post detail page.
- **02 — Register & log in**: a fresh user can register, see their session reflected in the navbar, log out, and log back in with the same credentials.
- **03 — Create post**: a logged-in user can submit a new post and see it both on the detail page and in the public browse list.
- **04 — Vote on a post**: a logged-in user can upvote a post owned by someone else and see both the score and the active-button state update via the AJAX endpoint.

E2E tests register a new user with a timestamped username on each run,
so they never collide with seed data or with each other.

---

## 2. Deploy to Render (cloud-based infrastructure)

The repo ships with a `render.yaml` blueprint:

- In Render's dashboard, click **New → Blueprint** and point it at the repo.
- Render reads `render.yaml`, provisions the web service and the MySQL private service, and assigns an HTTPS URL.
- Open the Render shell for the web service and run once:
   ```
   mysql -h $DB_CONTAINER -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE < /src/sd2-db.sql
   npm run seed-passwords
   ```
5. Visit the assigned URL.

Notes:
- The Dockerfile detects `NODE_ENV=production` and runs `node` directly instead of `supervisor` (no file-watching in prod).
- Sessions use `cookie.secure = true` and `app.set("trust proxy", 1)` in production so cookies work behind Render's HTTPS terminator.

---

## 3. What's in the folders?

```
pg-sd2/
├── index.js                  # entry point
├── package.json              # deps & npm scripts
├── Dockerfile                # production-aware container
├── docker-compose.yml        # web + db + phpmyadmin
├── render.yaml               # cloud deployment blueprint
├── nightwatch.conf.js        # E2E test config
├── sd2-db.sql                # full schema + seed data
├── .env.example
├── .github/workflows/ci.yml  # CI: lint + PUG compile + smoke + E2E
│
├── app/
│   ├── app.js
│   ├── services/db.js
│   ├── middleware/auth.js
│   ├── scripts/seed-passwords.js
│   ├── routes/
│   │   ├── auth.js     users.js     posts.js
│   │   ├── categories.js  tags.js   comments.js
│   │   ├── votes.js    reports.js   leaderboard.js
│   │   ├── messages.js account.js   ← (new in this iteration)
│   └── views/
│       ├── layout.pug    partials/nav.pug
│       ├── index.pug     posts.pug    post-detail.pug    post-form.pug
│       ├── messages-inbox.pug   messages-conversation.pug
│       ├── login.pug     register.pug
│       ├── leaderboard.pug      admin-reports.pug
│       ├── account.pug   privacy.pug   ← (new in this iteration)
│       ├── user-profile.pug (with personal impact dashboard)
│       └── 404.pug 500.pug
│
├── static/
│   ├── css/styles.css
│   └── js/votes.js
│
└── tests/
    ├── smoke.test.js         # supertest, no DB
    └── e2e/                  # Nightwatch + headless Chrome
        ├── 01-public-browse.test.js
        ├── 02-register-login.test.js
        ├── 03-create-post.test.js
        ├── 04-vote-on-post.test.js
        └── helpers.js
```

---

## 4. Features

- Users list + profile · post browse with filters · post detail with score
- Auth (bcrypt + sessions) · post CRUD with ownership checks
- Comments, voting (3-case logic + reputation), reports + admin queue, leaderboard

## New Features
- **In-app messaging** — inbox, conversations, unread badge, "Send message" on profiles
- **Post media** — optional image URL, rendered inline at top of post detail
- **Related posts** — basic matching algorithm via tag overlap with category fallback
- **Personal impact dashboard** — posts, upvotes received, downvotes received, comments received, total post score on every user profile

### Compliance & data
- **Privacy notice** at `/privacy` describing exactly what's stored
- **Account deletion** at `/account` (right to erasure — cascades cleanly via FK constraints)
- Footer links surface both on every page

### Testing & deployment
- Smoke tests via supertest — fast, no DB
- E2E tests via Nightwatch — full browser, full stack
- Both run in GitHub Actions CI on every push
- `render.yaml` blueprint for one-click Render deployment

---

## 5. Database schema

Nine tables. All foreign keys use `ON DELETE CASCADE` where it's safe so
deleting a user automatically cleans up their posts, comments, votes,
reports, and messages — making GDPR right-to-erasure structurally simple.

```
users · categories · tags · posts · post_tags ·
comments · votes · reports · messages
```

Post score is **computed** (`SUM(votes.value)`) rather than stored,
which means it can never drift out of sync.

---

## 6. Security & ethics

- Bcrypt (10 rounds) for passwords. No plain-text storage or logging.
- Parameterised SQL throughout.
- Session cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- Login errors are generic — no leak of which field was wrong.
- Edit / delete / report / message endpoints are server-side ownership-checked.
- Spoiler tags hide post content behind click-to-reveal.
- Reports queue gives moderators a path to act.
- DM privacy enforced at SQL layer, not just UI.
- GDPR-style: privacy notice at `/privacy`, right-to-erasure at `/account`, minimum data collected, no analytics trackers.

---
