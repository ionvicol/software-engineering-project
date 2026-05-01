// tests/e2e/01-public-browse.test.js
//
// Anonymous user journey: home -> browse -> post detail.
// Verifies that the read-only paths render without requiring login,
// and that the navbar shows Login/Register (not the logged-in state).

module.exports = {
  "Home page renders for anonymous visitors": function (browser) {
    browser
      .url(browser.launch_url + "/")
      .waitForElementVisible("body", 5000)
      .assert.titleContains("Home")
      .assert.visible("nav.navbar")
      .assert.containsText("nav.navbar", "GameTips Forum")
      // Anonymous: should see Login / Register links, NOT a Create Post button
      .assert.containsText("nav.navbar", "Log in")
      .assert.containsText("nav.navbar", "Register");
  },

  "Browse page lists posts and shows filter controls": function (browser) {
    browser
      .url(browser.launch_url + "/posts")
      .waitForElementVisible(".filter-bar", 5000)
      .assert.visible("input[name='q']")
      .assert.visible("select[name='category']")
      .assert.visible("select[name='tag']")
      // At least one post should be rendered from the seed data
      .assert.elementPresent(".post-card");
  },

  "Clicking a post navigates to the post detail page": function (browser) {
    browser
      .url(browser.launch_url + "/posts")
      .waitForElementVisible(".post-card h2 a", 5000)
      .click(".post-card h2 a")
      .waitForElementVisible(".post-detail", 5000)
      .assert.visible(".vote-column")
      .assert.visible(".comments-section");
  },

  after: function (browser) {
    browser.end();
  },
};
