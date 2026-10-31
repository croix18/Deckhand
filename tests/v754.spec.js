/* v7.54 — the board stays awake (Croix: "Is there any way to stop the Promethean from falling asleep? If I
   have a YouTube video up playing it won't fall asleep, but deckhand in full screen mode will."). */
const { test, expect, ok } = require("./helpers");

test.describe("v7.54 awake", () => {
  test("the board asks for a screen wake lock at boot, holds it, and asks again when the tab comes back", async ({ page, dh }) => {
    await page.addInitScript(() => {
      window.__locks = []; let held = null;
      Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: type => new Promise(res => {
        const l = { type, released: false, _h: {}, addEventListener(ev, f){ (this._h[ev] = this._h[ev] || []).push(f); }, release(){ this.released = true; held = null; (this._h.release || []).forEach(f => f()); return Promise.resolve(); } };
        held = l; window.__locks.push(l); res(l);
      }) } });
      window.__dropLock = () => { if (held) held.release(); };
    });
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await page.waitForTimeout(300);
    ok((await page.evaluate(() => window.__locks.length)) === 1 && (await page.evaluate(() => window.__locks[0].type)) === "screen", "no screen wake lock asked for at boot");
    ok(await page.evaluate(() => window.Deckhand.awake.held()), "the lock is not held");
    // the browser let go (the tab was hidden): a tap asks again
    await page.evaluate(() => window.__dropLock());
    ok(!(await page.evaluate(() => window.Deckhand.awake.held())), "the release was not heard");
    await page.mouse.click(600, 400);
    await page.waitForTimeout(200);
    ok((await page.evaluate(() => window.__locks.length)) === 2 && (await page.evaluate(() => window.Deckhand.awake.held())), "not asked for again after a release");
    // never two at once
    await page.mouse.click(600, 400); await page.keyboard.press("Shift");
    await page.waitForTimeout(200);
    ok((await page.evaluate(() => window.__locks.length)) === 2, "asked twice while holding one");
  });

  test("a browser without the API: nothing breaks", async ({ page, dh }) => {
    await page.addInitScript(() => { try { Object.defineProperty(navigator, "wakeLock", { value: undefined, configurable: true }); } catch (e) {} });
    const errs = []; page.on("pageerror", e => errs.push(e.message));
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await page.waitForTimeout(300);
    ok(!(await page.evaluate(() => window.Deckhand.awake.supported())) && !(await page.evaluate(() => window.Deckhand.awake.held())), "claimed a lock with no API");
    ok(!errs.length, "errors: " + errs.join(" | "));
  });
});
