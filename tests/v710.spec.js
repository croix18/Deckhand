/* v7.10 — October (Croix: "spiderwebs, pumpkins, stuff like that"). The
 * Season module sets body.october from the board's clock for the month;
 * the web and spider on the clock, small webs on the other cards, three
 * pumpkins on the sand, a black pennant, two October-only sea acts and a
 * haunted lofi side hang off that one class. */
const { test, expect, ok } = require("./helpers");

test.describe("v7.10 October", () => {
  test("v7.10: the month switches it on and off by itself; Settings can keep it off", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-30T23:59:30");
    await dh.launch();
    ok(!(await page.evaluate(() => document.body.classList.contains("october"))), "September 30 is not October");
    await expect(page.locator("#ocWeb")).toBeHidden();
    await expect(page.locator("#ocPumpkins")).toBeHidden();
    await page.evaluate(() => { window.Deckhand.shiftClock(60000); window.Deckhand.season.apply(); });   // 00:00:30 Oct 1
    ok(await page.evaluate(() => document.body.classList.contains("october")), "October 1 did not switch it on");
    await expect(page.locator("#ocWeb")).toBeVisible();
    await expect(page.locator("#ocPumpkins")).toBeVisible();
    await page.evaluate(() => { window.Deckhand.shiftClock(31 * 86400000); window.Deckhand.season.apply(); });   // Nov 1
    ok(!(await page.evaluate(() => document.body.classList.contains("october"))), "November 1 did not switch it off");
    // the switch
    await dh.openAt("#t=2026-10-14T10:30");
    await dh.launch();
    await expect(page.locator("#ocPumpkins")).toBeVisible();
    await page.click("#setBtn");
    await page.selectOption("#sSeason", "off");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(!(await page.evaluate(() => document.body.classList.contains("october"))), "Off did not take");
    await expect(page.locator("#ocPumpkins")).toBeHidden();
    await dh.flush();
    ok((await dh.stored()).cfg.ui.season === "off", "season setting not saved");
    const pg = await dh.loadFixture("tmp_season.html", JSON.stringify({ schemaVersion: 4, appVersion: "7.10.0", ownerName: "", ui: { season: "spooky" }, bell: { groups: [] } }));
    ok((await pg.evaluate(() => window.Deckhand.config.ui.season)) === "auto", "junk season not sanitized");
    await pg.close();
  });

  test("v7.10: the pieces — web on the clock (not during the settle moment), small webs on cards, pumpkins on the sand (not on the landing page or the stage), a black pennant", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-14T10:30");
    await dh.launch();
    await dh.addTimer();
    const vis = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none"; }, sel);
    ok(await vis("#clockWidget .ocWeb"), "no web on the clock");
    ok(await vis(".w-timer .ocCorner"), "no small web on the timer card");
    ok(await vis("#ocPumpkins"), "no pumpkins");
    ok((await page.evaluate(() => getComputedStyle(document.querySelector("#boat .btBurgee")).fill)) === "rgb(17, 26, 38)", "the pennant is not black");
    // the settle moment owns the clock card: the web steps aside
    await page.evaluate(() => window.Deckhand.settle.start());
    await expect(page.locator("#clockWidget")).toHaveClass(/stLive/);
    ok(!(await vis("#clockWidget .ocWeb")), "the web stayed over the count");
    ok(!(await vis("#ocPumpkins")), "pumpkins on the stage");
    await page.evaluate(() => window.Deckhand.settle.reset());
    ok(await vis("#clockWidget .ocWeb"), "the web did not come back");
    // Home: no pumpkins on the landing page
    await dh.home();
    ok(!(await vis("#ocPumpkins")), "pumpkins on the landing page");
    await dh.launch();
    // the web never intercepts a tap on the clock's own controls
    await page.click("#clockWidget .wFocus");
    await expect(page.locator("#clockWidget")).toHaveClass(/wFull/);
    await page.keyboard.press("Escape");
  });

  test("v7.10: small taps — a pumpkin lights and changes its face; the spider drops on its thread", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-14T10:30");
    await dh.launch();
    await page.click("#lockBtn");                       // decoration answers while locked
    const pk = page.locator("#ocPumpkins .ocPumpkin").first();
    const face0 = await pk.getAttribute("data-face");
    ok(!(await pk.evaluate(e => e.classList.contains("lit"))), "first pumpkin lit before any tap");
    await pk.dispatchEvent("pointerdown");
    ok((await pk.getAttribute("data-face")) === String((+face0 + 1) % 3), "face did not change");
    ok(await pk.evaluate(e => e.classList.contains("lit")), "tap did not light it");
    await pk.dispatchEvent("pointerdown"); await pk.dispatchEvent("pointerdown");
    ok((await pk.getAttribute("data-face")) === face0, "three taps should come round");
    ok((await page.evaluate(() => getComputedStyle(document.querySelector("#ocPumpkins .ocPumpkin.lit .ocFace.f" + document.querySelector("#ocPumpkins .ocPumpkin.lit").dataset.face)).fill)) === "rgb(255, 228, 92)", "lit face is not the lamp colour");
    await page.locator("#ocWeb .ocSpider").dispatchEvent("pointerdown");
    await expect(page.locator("#ocWeb .ocSpiderRig")).toHaveClass(/drop/);
    await expect(page.locator("#ocWeb .ocSpiderRig")).not.toHaveClass(/drop/, { timeout: 7000 });
    ok(await page.evaluate(() => window.Deckhand.config.ui.locked), "a tap unlocked the board");
    await dh.unlock();
  });

  test("v7.10: the sea's October acts — bats and a ghost ship — play in October only, and the director schedules them; the tape gains a haunted side", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-14T10:30");
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });
    ok(await page.evaluate(() => window.Deckhand.sea("bats")), "bats refused in October");
    await expect(page.locator("#sea-bats")).toHaveClass(/go/);
    await expect(page.locator("#sea-bats")).not.toHaveClass(/go/, { timeout: 15000 });
    ok(await page.evaluate(() => window.Deckhand.sea("ghost")), "ghost refused in October");
    await expect(page.locator("#sea-ghost")).toHaveClass(/go/);
    await page.evaluate(() => window.Deckhand.seaModule.clear());
    // the plan: over a month of periods, bats and the ghost turn up; in November, never
    const S = () => page.evaluate(() => {
      const M = window.Deckhand.seaModule; let oct = new Set(), nov = new Set();
      for (let d = 1; d <= 30; d++) for (let p = 0; p < 6; p++){
        M.plan("2026-10-" + String(d).padStart(2, "0"), p, 53, 1 + (d % 5), null).events.forEach(e => oct.add(e.act));
        M.plan("2026-11-" + String(d).padStart(2, "0"), p, 53, 1 + (d % 5), null).events.forEach(e => nov.add(e.act));
      }
      return { oct: [...oct], nov: [...nov] };
    });
    const sets = await S();
    ok(sets.oct.includes("bats") && sets.oct.includes("ghost"), "October plans never cast the new acts: " + sets.oct.join());
    ok(!sets.nov.includes("bats") && !sets.nov.includes("ghost"), "November plans cast October acts: " + sets.nov.join());
    // the tape
    await dh.addW("addMusicBtn");
    const octSides = await page.evaluate(() => window.Deckhand.lofiSides());
    ok(octSides.length === 11 && octSides[10] === "Graveyard shift", "no haunted side in October: " + octSides.join("|"));
    // September: nothing October about it
    await dh.openAt("#t=2026-09-30T10:30");
    await dh.launch();
    ok(!(await page.evaluate(() => window.Deckhand.sea("bats"))), "bats played in September");
    ok(!(await page.evaluate(() => window.Deckhand.sea("ghost"))), "the ghost played in September");
    await dh.addW("addMusicBtn");
    ok((await page.evaluate(() => window.Deckhand.lofiSides())).length === 10, "the haunted side leaked into September");
  });
});
