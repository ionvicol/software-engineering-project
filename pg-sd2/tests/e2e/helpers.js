// tests/e2e/helpers.js
//
// Shared helpers for Nightwatch tests.
//
// makeUser() returns a unique username/email/password triple. We append
// the current millisecond timestamp plus a random suffix so tests never
// clash with each other or with seed data.

function makeUser(prefix = "tester") {
  const stamp = Date.now().toString(36);
  const rnd = Math.floor(Math.random() * 1000);
  const username = `${prefix}_${stamp}_${rnd}`;
  return {
    username,
    email: `${username}@example.com`,
    password: "password123!",
  };
}

module.exports = { makeUser };
