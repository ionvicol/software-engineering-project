// tests/e2e/02-register-login.test.js
//
// Auth user journey: register a fresh account, then log out, then log
// back in with that account. Verifies the navbar reflects the change
// of state and that the same credentials work after the round trip.

const { makeUser } = require("./helpers");

const user = makeUser("auth");

module.exports = {
  "Register a new account": function (browser) {
    browser
      .url(browser.launch_url + "/register")
      .waitForElementVisible("input[name='username']", 5000)
      .setValue("input[name='username']", user.username)
      .setValue("input[name='email']", user.email)
      .setValue("input[name='password']", user.password)
      .click("form.auth-form button[type='submit']")
      // After register we land on home, logged in
      .waitForElementVisible("nav.navbar", 5000)
      .assert.containsText("nav.navbar", user.username)
      .assert.containsText("nav.navbar", "Log out");
  },

  "Log out clears the session": function (browser) {
    browser
      .click("form[action='/logout'] button[type='submit']")
      .waitForElementVisible("nav.navbar", 5000)
      .assert.containsText("nav.navbar", "Log in")
      .assert.containsText("nav.navbar", "Register");
  },

  "Log in with the same credentials": function (browser) {
    browser
      .url(browser.launch_url + "/login")
      .waitForElementVisible("input[name='identifier']", 5000)
      .setValue("input[name='identifier']", user.username)
      .setValue("input[name='password']", user.password)
      .click("form.auth-form button[type='submit']")
      .waitForElementVisible("nav.navbar", 5000)
      .assert.containsText("nav.navbar", user.username);
  },

  after: function (browser) {
    browser.end();
  },
};
