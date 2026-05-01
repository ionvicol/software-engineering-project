// tests/smoke.test.js
//
// Smoke tests using the Node 20 built-in test runner (`node:test`) and
// supertest. These run as part of CI on every push.
//
// Scope: route paths that do not touch the database, so the test suite
// can run anywhere — locally, in GitHub Actions, in the docker dev
// container — without needing MySQL up.
//
// What's covered:
//   - GET /login   renders 200 with the form
//   - GET /register renders 200 with the form
//   - POST /login with empty body -> 400 (validation kicks in before DB)
//   - GET on a nonexistent path -> 404 with our custom 404 page
//
// To add DB-backed tests later, spin up a test database in docker-compose
// and seed a known dataset, then import this file via NODE_ENV=test.

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-secret";
// Make sure the DB pool can be constructed without throwing even if the
// test runner has no real database available — values just need to exist.
process.env.DB_CONTAINER = process.env.DB_CONTAINER || "localhost";
process.env.DB_PORT = process.env.DB_PORT || "3306";
process.env.MYSQL_ROOT_USER = process.env.MYSQL_ROOT_USER || "root";
process.env.MYSQL_ROOT_PASSWORD = process.env.MYSQL_ROOT_PASSWORD || "password";
process.env.MYSQL_DATABASE = process.env.MYSQL_DATABASE || "sd2-db";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app/app.js");

test("GET /login renders the login form", async () => {
  const res = await request(app).get("/login");
  assert.equal(res.status, 200);
  assert.match(res.text, /<form[^>]*action=["']\/login["']/);
  assert.match(res.text, /name=["']password["']/);
});

test("GET /register renders the register form", async () => {
  const res = await request(app).get("/register");
  assert.equal(res.status, 200);
  assert.match(res.text, /<form[^>]*action=["']\/register["']/);
  assert.match(res.text, /name=["']username["']/);
});

test("POST /login with empty body returns 400", async () => {
  const res = await request(app)
    .post("/login")
    .type("form")
    .send({}); // no identifier, no password
  assert.equal(res.status, 400);
  assert.match(res.text, /username\/email and password/i);
});

test("GET /nope-does-not-exist renders the 404 page", async () => {
  const res = await request(app).get("/nope-does-not-exist");
  assert.equal(res.status, 404);
  assert.match(res.text, /404/);
});

test("Static CSS file is served", async () => {
  const res = await request(app).get("/css/styles.css");
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /text\/css/);
});
