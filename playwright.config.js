// Deckhand test configuration (@playwright/test).
//
// Three projects, one suite:
//   file  — Deckhand.html over file://, mouse input. The classroom
//           Chromebox opens the file from Drive exactly this way.
//   touch — same, with a touch-capable context (pointerType "touch"),
//           for the Promethean IR panel. Only specs tagged @touch run.
//   http  — served by tools/serve.js on a real origin, the way GitHub
//           Pages serves it (referrer sent, per-origin storage).
//           Only specs tagged @http run.
//
// The suite runs under reduced motion: motion is decoration on top of
// instant state, so geometry asserts see final positions. Specs that
// test motion opt back in per page.
const { defineConfig, devices } = require("@playwright/test");

// NOTE: `reducedMotion` is NOT a top-level test option — the runner only
// forwards it through `contextOptions` (three porting passes hit this).
// helpers.js also emulates it per page, belt and braces.
const common = {
  viewport: { width: 1920, height: 1080 },
  contextOptions: { reducedMotion: "reduce" },
  acceptDownloads: true,
  trace: "retain-on-failure",
  screenshot: "only-on-failure",
  video: "off"
};

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 6_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "./test-results",
  projects: [
    { name: "file",  use: { ...devices["Desktop Chrome"], ...common, baseURL: "" },
      grepInvert: /@(touch|http)/ },
    { name: "touch", use: { ...devices["Desktop Chrome"], ...common, hasTouch: true, baseURL: "" },
      grep: /@touch/ },
    { name: "http",  use: { ...devices["Desktop Chrome"], ...common, baseURL: "http://localhost:4173/" },
      grep: /@http/ }
  ],
  webServer: {
    command: "node tools/serve.js 4173",
    url: "http://localhost:4173/Deckhand.html",
    reuseExistingServer: !process.env.CI,
    timeout: 20_000
  }
});
