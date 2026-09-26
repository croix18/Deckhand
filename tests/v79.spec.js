/* v7.9 — the week rotation counts SCHOOL weeks (Croix: "Yeah it alternates by
 * school week"): a week with no school days — Thanksgiving, the two winter
 * weeks, spring break — doesn't flip Teal/Black. The Mondays of those weeks
 * live in bell.skipWeeks (Settings → Bells → Week rotation); the seed carries
 * Lake County's 2026-27 breaks. */
const { test, expect, ok } = require("./helpers");

const idxAt = (page, iso) => page.evaluate(x => window.Deckhand.autoWeekIndexAt(x), iso);

test.describe("v7.9 school weeks", () => {
  test("v7.9: break weeks don't advance the rotation — Thanksgiving, winter, spring — before and after the anchor", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    const skips = await page.evaluate(() => window.Deckhand.config.bell.skipWeeks);
    ok(skips.join() === "2026-11-23,2026-12-21,2026-12-28,2027-03-22", "seed break weeks: " + skips.join());
    // groups[0] = Teal, groups[1] = Black; the anchor (Aug 31) is Black
    const expectIdx = {
      "2026-08-24T10:00": 0,   // the week before the anchor
      "2026-08-31T10:00": 1,   // the anchor: Black
      "2026-09-28T10:00": 1,   // 4 calendar weeks on
      "2026-11-16T10:00": 0,   // the week before Thanksgiving
      "2026-11-25T10:00": 0,   // Thanksgiving week keeps the previous week's colour
      "2026-11-30T10:00": 1,   // …and the next SCHOOL week flips from Nov 16, not from Nov 23
      "2026-12-14T10:00": 1,
      "2026-12-23T10:00": 1,   // winter week 1
      "2026-12-30T10:00": 1,   // winter week 2
      "2027-01-06T10:00": 0,   // back: one school week after Dec 14
      "2027-03-15T10:00": 0,
      "2027-03-24T10:00": 0,   // spring break
      "2027-03-29T10:00": 1
    };
    for (const k of Object.keys(expectIdx)){
      const got = await idxAt(page, k);
      ok(got === expectIdx[k], k + ": expected " + expectIdx[k] + " got " + got);
    }
    // without the list it is plain calendar parity — the pre-7.9 answer for Nov 30 was Teal
    await page.evaluate(() => { window.Deckhand.config.bell.skipWeeks = []; });
    ok((await idxAt(page, "2026-11-30T10:00")) === 0, "calendar parity should give Teal on Nov 30");
    ok((await idxAt(page, "2027-01-06T10:00")) === 1, "calendar parity should give Black on Jan 6");
  });

  test("v7.9: Settings → Week rotation takes the Mondays (any day of the week normalizes, junk is refused), and the board re-resolves", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-30T10:30");        // the Monday after Thanksgiving
    await dh.launch();
    await expect(page.locator("#weekTag")).toHaveText("Black Week");
    await page.click("#setBtn");
    await dh.tab("bells");
    ok(await page.inputValue("#sSkipWeeks") === "2026-11-23, 2026-12-21, 2026-12-28, 2027-03-22", "field not filled");
    await page.fill("#sSkipWeeks", "2026-11-25, nope");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toContainText("Weeks with no school");
    await page.fill("#sSkipWeeks", "2026-11-25 2026-12-23,2026-12-23");   // a Wednesday, a duplicate, odd separators
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    const saved = await page.evaluate(() => window.Deckhand.config.bell.skipWeeks);
    ok(saved.join() === "2026-11-23,2026-12-21", "not normalized to Mondays / deduped: " + saved.join());
    await page.click("#closeBtn");
    await expect(page.locator("#weekTag")).toHaveText("Black Week");   // still one skipped week before Nov 30
    // drop Thanksgiving from the list: Nov 30 goes back to calendar parity (Teal)
    await page.click("#setBtn");
    await page.fill("#sSkipWeeks", "");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    await expect(page.locator("#weekTag")).toHaveText("Teal Week");
    await dh.flush();
    ok((await dh.stored()).cfg.bell.skipWeeks.length === 0, "skipWeeks not saved");
  });

  test("v7.9: a board saved before the list existed takes the file's break weeks at boot; a saved empty list is respected; sanitize bounds it", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    // a 7.8 device copy: no skipWeeks key at all
    await page.evaluate(() => {
      const o = JSON.parse(localStorage.getItem("deckhand.config"));
      delete o.cfg.bell.skipWeeks; o.fileVersion = "7.8.1";
      localStorage.setItem("deckhand.config", JSON.stringify(o));
    });
    await dh.reopen("#t=2026-09-28T10:30");
    ok((await page.evaluate(() => window.Deckhand.configSource)) === "device", "not on the device copy");
    ok((await page.evaluate(() => window.Deckhand.config.bell.skipWeeks.join())) === "2026-11-23,2026-12-21,2026-12-28,2027-03-22",
      "an old copy did not take the file's break weeks");
    // a copy that SAYS none: kept
    await page.evaluate(() => {
      const o = JSON.parse(localStorage.getItem("deckhand.config"));
      o.cfg.bell.skipWeeks = [];
      localStorage.setItem("deckhand.config", JSON.stringify(o));
    });
    await dh.reopen("#t=2026-09-28T10:30");
    ok((await page.evaluate(() => window.Deckhand.config.bell.skipWeeks.length)) === 0, "an explicit empty list was overwritten");
    // sanitize: junk out, Mondays in, dedupe, twenty at most
    const many = []; for (let i = 0; i < 30; i++){ const d = new Date(2026, 0, 5 + 7 * i); many.push(d.toISOString().slice(0, 10)); }
    const pg = await dh.loadFixture("tmp_skip.html", JSON.stringify({
      schemaVersion: 4, appVersion: "7.9.0", ownerName: "",
      bell: { groups: [], skipWeeks: ["2026-11-25", "2026-11-23", "junk", 42, "2026-13-40", "2026-12-21"].concat(many) }
    }));
    const sk = await pg.evaluate(() => window.Deckhand.config.bell.skipWeeks);
    ok(sk.length === 20 && sk.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x)) && sk.indexOf("2026-11-23") !== -1 && sk.indexOf("2026-11-25") === -1,
      "sanitize: " + JSON.stringify(sk));
    ok(sk.every(x => new Date(x + "T12:00").getDay() === 1), "not all Mondays: " + sk.join());
    await pg.close();
  });
});
