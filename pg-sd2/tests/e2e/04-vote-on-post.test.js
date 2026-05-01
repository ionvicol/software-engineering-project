// tests/e2e/04-vote-on-post.test.js
//
// Voting user journey: register a fresh user, navigate to an existing
// (seeded) post that they don't own, click upvote, and confirm the
// score increased and the upvote button is now visually active.
//
// We use the first seed post (post_id = 1, "Best aiming settings...")
// because it's owned by user_id = 1 (NoobHunter), so a freshly-
// registered tester is guaranteed not to be the owner.

const { makeUser } = require("./helpers");

const user = makeUser("voter");

module.exports = {
  "Register a voter account": function (browser) {
    browser
      .url(browser.launch_url + "/register")
      .waitForElementVisible("input[name='username']", 5000)
      .setValue("input[name='username']", user.username)
      .setValue("input[name='email']", user.email)
      .setValue("input[name='password']", user.password)
      .click("form.auth-form button[type='submit']")
      .waitForElementVisible("nav.navbar", 5000);
  },

  "Upvote increases the score and highlights the button": function (browser) {
    browser
      .url(browser.launch_url + "/posts/1")
      .waitForElementVisible(".vote-column", 5000)
      // Read the current score before voting
      .getText(".vote-score", function (result) {
        const before = parseInt(result.value, 10);
        browser
          .click(".vote-up")
          // The AJAX call updates the score; wait briefly for the DOM update.
          .pause(500)
          .getText(".vote-score", function (afterResult) {
            const after = parseInt(afterResult.value, 10);
            browser.assert.ok(after === before + 1,
              `Score should be ${before + 1} after upvote but was ${after}`);
          })
          .assert.cssClassPresent(".vote-up", "is-active");
      });
  },

  after: function (browser) {
    browser.end();
  },
};
