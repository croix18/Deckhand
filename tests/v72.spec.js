/* v7.2 — the pennant and the Ink overlay. (The Pledge rework and the
   per-period settle seconds live in v71.spec.js next to the routine.) */
const { test, expect, ok } = require("./helpers");

test("v7.2: the boat runs up a '<name> Rules' pennant now and then, and it follows the greeting name", async ({ page, dh }) => {
  const pg = await dh.newPage({ reducedMotion: "no-preference" });
  await pg.goto(dh.url + "#t=2026-09-24T10:30");
  await pg.waitForFunction(() => !!window.Deckhand);
  await pg.click("#launchBtn");
  ok((await pg.evaluate(() => getComputedStyle(document.querySelector("#boat .btPen")).visibility)) === "hidden", "pennant showing at rest");
  await pg.evaluate(() => window.Deckhand.sea("pennant"));
  await expect(pg.locator("#boat")).toHaveClass(/pennant/);
  await expect(pg.locator("#boat .btPenText")).toHaveText("Mr. Shaffer Rules");
  ok((await pg.evaluate(() => getComputedStyle(document.querySelector("#boat .btPen")).visibility)) === "visible", "pennant hidden while flying");
  const anim = await pg.evaluate(() => getComputedStyle(document.querySelector("#boat .btPenCloth")).animationName);
  ok(/penReveal/.test(anim), "pennant does not run: " + anim);   // v7.5: a clip reveal (the letters never squash)
  await pg.evaluate(() => { window.Deckhand.config.ownerName = "Ms. Rivera"; });
  await pg.evaluate(() => document.getElementById("boat").classList.remove("pennant"));
  await pg.evaluate(() => window.Deckhand.sea("pennant"));
  await expect(pg.locator("#boat .btPenText")).toHaveText("Ms. Rivera Rules");
});

test("v7.2: Ink — draw over the board, Done keeps the ink and the board stays usable, Undo/Clear, D and Escape", async ({ page, dh }) => {
  await dh.openAt("#t=2026-09-24T10:30");
  await dh.launch();
  await expect(page.locator("#inkBar")).toBeHidden();
  ok((await page.evaluate(() => getComputedStyle(document.getElementById("ink")).pointerEvents)) === "none", "overlay eats taps at rest");
  await page.click("#inkBtn");
  await expect(page.locator("body")).toHaveClass(/inking/);
  await expect(page.locator("#inkBar")).toBeVisible();
  await page.mouse.move(400, 400); await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(400 + i * 20, 400 + Math.sin(i / 3) * 40);
  await page.mouse.up();
  await page.click('#inkBar [data-color="#FF7F6A"]');
  await page.click('#inkBar [data-size="18"]');
  await page.mouse.move(500, 700); await page.mouse.down(); await page.mouse.move(900, 690); await page.mouse.up();
  ok((await page.evaluate(() => window.Deckhand.ink.count())) === 2, "strokes not recorded");
  const px = await page.evaluate(() => {
    const c = document.getElementById("ink"), k = c.width / innerWidth;
    return [...c.getContext("2d").getImageData(Math.round(700 * k), Math.round(695 * k), 1, 1).data];
  });
  ok(px[3] > 0 && px[0] > 200, "coral stroke not painted: " + px);
  // Done: the ink stays, the palette folds, taps reach the board again
  await page.click("#inkDone");
  await expect(page.locator("body")).not.toHaveClass(/inking/);
  ok((await page.evaluate(() => window.Deckhand.ink.count())) === 2, "Done erased the ink");
  ok((await page.evaluate(() => getComputedStyle(document.getElementById("ink")).pointerEvents)) === "none", "overlay still armed");
  await page.click(".w-settle .stStart");
  await expect.poll(() => page.evaluate(() => document.querySelector(".w-settle")._entry.api.running())).toBe(true);
  await page.keyboard.press("r");
  // D arms, Undo/Clear, Escape disarms
  await page.keyboard.press("d");
  await expect(page.locator("body")).toHaveClass(/inking/);
  await page.click("#inkUndo");
  ok((await page.evaluate(() => window.Deckhand.ink.count())) === 1, "undo");
  await page.click("#inkClear");
  ok((await page.evaluate(() => window.Deckhand.ink.count())) === 0, "clear");
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/inking/);
  // a staged deck has its own Draw button; the overlay sits above the stage
  await page.click(".w-settle .wFocus");
  await expect(page.locator("#inkBtnStage")).toBeVisible();
  await page.click("#inkBtnStage");
  await expect(page.locator("body")).toHaveClass(/inking/);
  await page.mouse.move(600, 500); await page.mouse.down(); await page.mouse.move(900, 520); await page.mouse.up();
  ok((await page.evaluate(() => window.Deckhand.ink.count())) === 1, "could not draw over the stage");
  await page.click("#inkDone");
  await page.click("#unfocusBtn");
  // Home folds the palette; the alarm still wins over an armed pen
  await page.keyboard.press("d");
  await page.keyboard.press("h");
  await expect(page.locator("body")).not.toHaveClass(/inking/);
});

test("v7.2: @touch a finger draws on the Ink overlay", async ({ page, dh, context }) => {
  await dh.openAt("#t=2026-09-24T10:30");
  await dh.launch();
  await page.click("#inkBtn");
  const cdp = await context.newCDPSession(page);
  const pts = [[500, 400], [560, 420], [620, 440], [700, 430]];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
  for (const [x, y] of pts.slice(1)) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.Deckhand.ink.count())).toBe(1);
});
