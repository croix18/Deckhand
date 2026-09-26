const { test, expect, ok } = require("./helpers");

test("boots on the file and the device store seeds itself", async ({ page, dh }) => {
  await dh.openAt("#t=2026-09-21T10:30");
  await expect(page.locator("#greet")).toContainText("Mr. Shaffer");
  ok((await dh.stored()) !== null, "no device copy after boot");
});

test("@http boots on a real origin", async ({ page, dh }) => {
  await dh.openAt("#t=2026-09-21T10:30");
  await expect(page.locator("#greet")).toContainText("Mr. Shaffer");
});

test("@touch boots with a touch context", async ({ page, dh }) => {
  await dh.openAt("#t=2026-09-21T10:30");
  const b = await page.locator("#launchBtn").boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);   // a finger opens the board
  await expect(page.locator("main#canvas")).toBeVisible();
});
