# GameTips Forum

A full-stack web app where gamers share tips, strategies and questions.
Built for the Software Engineering coursework module — Sprint 3 plus
Sprint 4 extensions, full E2E test suite, and cloud deployment ready.

**Stack:** Node.js · Express · PUG · MySQL 8 · Docker · vanilla JavaScript · CSS · Nightwatch.

---

## 1. Run it locally

You only need Docker installed.

```bash
git clone https://github.com/ionvicol/software-engineering-project
cd software-engineering-project/pg-sd2
cp .env.example .env
docker compose up --build
# In a second terminal, hash the seed passwords once:
docker compose exec web npm run seed-passwords
```

Open <http://localhost:3000> · phpMyAdmin: <http://localhost:8081> (root / password).

### Seed accounts (password is `password123` for all)

| Username     | Role  | Why                                                |
| ------------ | ----- | -------------------------------------------------- |
| `RaidPilot`  | admin | Can access `/admin/reports`                        |
| `SpeedyFox`  | user  | Has the highest reputation                         |
| `NoobHunter` | user  | Owns several posts; has seed DMs in inbox          |

### Reset

```bash
docker compose down -v   # nukes the MySQL volume so the schema reseeds
```

---

## 2. Tests

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

## 3. Deploy to Render (cloud-based infrastructure)

The repo ships with a `render.yaml` blueprint:

1. Push the repo to GitHub.
2. In Render's dashboard, click **New → Blueprint** and point it at the repo.
3. Render reads `render.yaml`, provisions the web service and the MySQL private service, and assigns an HTTPS URL.
4. Open the Render shell for the web service and run once:
   ```
   mysql -h $DB_CONTAINER -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE < /src/sd2-db.sql
   npm run seed-passwords
   ```
5. Visit the assigned URL.

Notes:
- The Dockerfile detects `NODE_ENV=production` and runs `node` directly instead of `supervisor` (no file-watching in prod).
- Sessions use `cookie.secure = true` and `app.set("trust proxy", 1)` in production so cookies work behind Render's HTTPS terminator.

---

## 4. What's in here

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

## 5. Features

### Sprint 3 (core)
- Users list + profile · post browse with filters · post detail with score
- Auth (bcrypt + sessions) · post CRUD with ownership checks
- Comments, voting (3-case logic + reputation), reports + admin queue, leaderboard

### Sprint 4 extensions
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

## 6. Database schema

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

## 7. Manual test plan

(Useful for the demo — automated coverage is in §2.)

### Public read (no login)
1. `/` shows stats, latest posts, top contributors, popular categories.
2. `/posts` lets you filter by search/category/tag.
3. Spoiler posts hide content behind a click-to-reveal toggle.
4. `/users`, `/users/:id`, `/categories`, `/tags`, `/leaderboard` all render.
5. `/privacy` renders without login.

### Auth
6. Register → land logged in. Log out. Log in with same creds.
7. Wrong password → generic error.
8. `/posts/new` while logged out → bounced to login → back to form after.

### Posts
9. Create with title <5 chars → validation error.
10. Create with valid media URL → image renders at top of detail page.
11. Edit your post → "Updated" timestamp appears.
12. Try to edit `/posts/3/edit` as a different user → 403.
13. Delete your post → confirmation → gone.

### Voting
14. Click ▲ on someone else's post → score +1, button green.
15. Click ▲ again → toggles off, score back.
16. Click ▼ → switches; score moves by 2.
17. Try to vote on your own post → error.
18. Author's profile shows reputation reflecting votes.

### Comments
19. Add a comment → appears with your username.
20. Delete your comment → gone.
21. As `RaidPilot` (admin), delete someone else's → allowed.

### Reports
22. Submit a report → flash confirmation.
23. As admin, `/admin/reports` lists open reports → mark resolved.
24. Non-admin visits `/admin/reports` → 403.

### Related posts
25. `/posts/3` (Iron Warden) → "Related posts" section ranked by shared-tag count.

### Messaging
26. Log in as `NoobHunter` → see unread badge in nav.
27. Open `/messages` → see seed conversation from `SpeedyFox`.
28. Open the thread → unread badge clears, messages chronological.
29. Send a reply → appears at bottom; inbox preview updates with "You: ".
30. Visit another user's profile → "Send message" → land in conversation.
31. `/messages/with/<your-own-id>` → redirect with error.

### Personal impact dashboard
32. Open any `/users/:id` → see Posts / Upvotes received / Downvotes received / Comments received / Total post score.

### Account & privacy
33. As any user, click footer "Account settings" → see your stored data.
34. Type wrong username in delete confirmation → error, account NOT deleted.
35. Type correct username → account deleted, session cleared, redirected home. (Don't run this against the seed admin if you want the demo data preserved.)

### Errors
36. `/posts/99999` → 404.
37. `/totally-nonexistent` → 404.

---

## 8. Code review notes

### Database (`sd2-db.sql`)
- Composite PK on `votes` (`user_id, post_id`) enforces "one vote per user per post" at DB level.
- `CHECK` constraints: `votes.value IN (-1, 1)` and `messages.sender ≠ recipient`.
- Indexes on `messages` for unread-count and conversation queries.
- `ON DELETE CASCADE` everywhere safe — drives the right-to-erasure feature.

### Backend
- Single MySQL pool (`app/services/db.js`) shared by every route.
- Every query is parameterised — no string concatenation.
- `attachUser` middleware fetches `unreadMessageCount` once per request so the navbar can show a badge without every route writing the query.
- `findRelatedPosts(postId, categoryId)` is the recommendation algorithm — tag overlap first, category fallback.
- `routes/messages.js` enforces conversation privacy at the SQL layer: every query pins one side to the current user, so a user literally cannot retrieve a conversation they're not part of.
- `routes/account.js` deletion: a single DELETE on `users` — every dependent row goes via cascade. Worth pointing out in the oral as a clean schema-design payoff.
- `app.listen()` is skipped under `NODE_ENV=test` so supertest can import the app without binding a port.

### Frontend
- One `layout.pug` base; every page does `extends layout` and fills `block content`.
- Native `<details>` for spoilers — no JS, accessible by default.
- `votes.js` is a single document-level event delegate — no per-button handlers, no jQuery.

### Tests
- **Smoke**: 5 tests via `node:test` + supertest, run in process. No DB. Catches route-level regressions in seconds.
- **E2E**: 4 user-flow tests via Nightwatch + headless Chrome. Boots a real MySQL container in CI, loads the schema, hashes passwords, starts the app, drives it as a real browser. Covers exactly the kinds of bugs supertest can't see (form serialisation, AJAX wiring, navbar state changes).

### DevOps
- `Dockerfile` is production-aware — `node` in prod, `supervisor` in dev.
- `docker-compose.yml` uses a named volume + auto-imports the schema via `/docker-entrypoint-initdb.d/`.
- `render.yaml` blueprints the cloud deployment.
- CI has two jobs: a fast `build` (lint + PUG compile + smoke), and a full `e2e` (real Chrome + real MySQL).

---

## 9. Security & ethics

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

## 10. Deliberate scope decisions (for the oral)

Things omitted on purpose, with the trade-off ready to discuss:

- **CSRF tokens** — module didn't cover them. Would add `csurf` or double-submit cookies. SameSite cookies provide some protection meanwhile.
- **DB-backed unit tests** — smoke suite covers no-DB routes; E2E covers DB-backed flows end-to-end. The intermediate layer (DB-backed unit tests against routes) would be the next addition with a test docker-compose profile.
- **Real image upload** — current implementation is URL-based. `multer` would be the add for file uploads.
- **Login rate limiting** — `express-rate-limit` for production.
- **Edit profile UI** — bio/email changes via a form would round out account settings; the data layer already supports it.
