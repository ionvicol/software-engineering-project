// nightwatch.conf.js
//
// Nightwatch end-to-end test configuration.
//
// Two environments:
//   - chrome      : runs a real Chrome browser locally (needs Chrome installed).
//   - chromeHeadless : same but headless, used in CI.
//
// The base URL points at the Docker dev server by default. Override with
// the LAUNCH_URL env var when running against a different host (e.g. a
// deployed Render URL or an alternate port).
//
// The tests themselves register a new user with a timestamped username
// each run so they never collide with the seed data or with each other.

module.exports = {
  src_folders: ["tests/e2e"],
  page_objects_path: ["tests/e2e/page-objects"],

  webdriver: {
    start_process: true,
    server_path: require("chromedriver").path,
    port: 9515,
  },

  test_settings: {
    default: {
      launch_url: process.env.LAUNCH_URL || "http://localhost:3000",
      desiredCapabilities: {
        browserName: "chrome",
        "goog:chromeOptions": {
          args: [
            "--window-size=1280,900",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
          ],
        },
      },
    },

    chromeHeadless: {
      extends: "default",
      desiredCapabilities: {
        browserName: "chrome",
        "goog:chromeOptions": {
          args: [
            "--headless=new",
            "--window-size=1280,900",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
          ],
        },
      },
    },
  },
};
