// tests/e2e/03-create-post.test.js
//
// Posting user journey: register -> create a post -> verify it appears
// on the post detail page and the public browse page.

const { makeUser } = require("./helpers");

const user = makeUser("poster");
const POST_TITLE = `E2E test post ${Date.now()}`;
const POST_CONTENT = "End-to-end test content. Long enough to satisfy the 10-character minimum.";

module.exports = {
  "Register a poster account": function (browser) {
    browser
      .url(browser.launch_url + "/register")
      .waitForElementVisible("input[name='username']", 5000)
      .setValue("input[name='username']", user.username)
      .setValue("input[name='email']", user.email)
      .setValue("input[name='password']", user.password)
      .click("form.auth-form button[type='submit']")
      .waitForElementVisible("nav.navbar", 5000);
  },

  "Create a new post": function (browser) {
    browser
      .url(browser.launch_url + "/posts/new")
      .waitForElementVisible("input[name='title']", 5000)
      .setValue("input[name='title']", POST_TITLE)
      .setValue("textarea[name='content']", POST_CONTENT)
      // Pick the first option in the category dropdown that is not the placeholder.
      .execute(function () {
        const select = document.querySelector("select[name='category_id']");
        const firstReal = Array.from(select.options).find((o) => o.value);
        if (firstReal) select.value = firstReal.value;
      })
      .click("form.post-form button[type='submit']")
      // After successful create we redirect to /posts/:id which renders .post-detail
      .waitForElementVisible(".post-detail", 5000)
      .assert.containsText(".post-detail h1", POST_TITLE)
      .assert.containsText(".post-detail .post-content", POST_CONTENT);
  },

  "New post appears on the browse page": function (browser) {
    browser
      .url(browser.launch_url + "/posts")
      .waitForElementVisible(".post-card", 5000)
      .assert.containsText("main.container", POST_TITLE);
  },

  after: function (browser) {
    browser.end();
  },
};
