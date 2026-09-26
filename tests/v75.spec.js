/* v7.5 — Sea 2.0: the director, the weather, the residents, the tap. The
   acts themselves are checked in v71 (attack, lanes, the swell) and in
   settle-and-media (serpent, whale, stage mode); the pictures were reviewed
   by hand from frame grabs (docs/SEA.md). */
const { test, expect, ok } = require("./helpers");

test.describe("the sea's director", () => {
  test("v7.5: a period's setlist is a pure function of (date, period) — greeting, hush, rares late, nothing at the end", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T09:40:00");
    await dh.launch();
    const r = await page.evaluate(() => {
      const S = window.Deckhand.seaModule;
      const a = S.plan("2026-09-28", 0, 53, 1, { hist: [] });
      const b = S.plan("2026-09-28", 0, 53, 1, { hist: [] });
      const c = S.plan("2026-09-28", 3, 53, 1, { hist: [] });
      const d = S.plan("2026-09-29", 0, 53, 2, { hist: [] });
      const acts = S.acts;
      return {
        same: JSON.stringify(a) === JSON.stringify(b),
        differsByPeriod: JSON.stringify(a.events) !== JSON.stringify(c.events) || a.weather !== c.weather,
        differsByDay: JSON.stringify(a.events) !== JSON.stringify(d.events) || a.weather !== d.weather,
        weather: a.weather,
        first: a.events[0],
        hush: a.events.slice(1).every(e => e.at >= 10 * 60000),
        tail: a.events.every(e => e.at <= 50 * 60000),
        raresLate: a.events.every(e => acts[e.act].tier !== "rare" || e.at > 53 * 60000 * 2 / 3),
        attackAfterSerpent: (() => { const i = a.events.findIndex(e => e.act === "attack"); return i === -1 || a.events.slice(0, i).some(e => e.act === "serpent"); })(),
        n: a.events.length
      };
    });
    ok(r.same, "not deterministic");
    ok(r.differsByPeriod && r.differsByDay, "every period got the same show: " + JSON.stringify(r));
    ok(["calm", "breezy", "windy"].includes(r.weather), "weather: " + r.weather);
    ok(r.first.at === 45000 && ["turtle", "school", "paper"].includes(r.first.act), "greeting: " + JSON.stringify(r.first));
    ok(r.hush && r.tail && r.raresLate && r.attackAfterSerpent, "period arc broken: " + JSON.stringify(r));
    ok(r.n >= 4 && r.n <= 14, "odd setlist length " + r.n);
  });

  test("v7.5: memory halves the odds of a repeat for that period; the running board plans the period and sets the weather", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T09:40:00");    // Black Monday, 6th period, 20 minutes in
    await dh.launch();
    await expect.poll(() => page.evaluate(() => !!window.Deckhand.seaModule.current()), { timeout: 8000 }).toBe(true);   // the director's first tick
    const r = await page.evaluate(() => {
      const S = window.Deckhand.seaModule;
      // count how often the whale is planned for period 2 with and without a memory of two whale sightings
      let withMem = 0, without = 0;
      for (let d = 1; d <= 28; d++) {
        const date = "2026-10-" + String(d).padStart(2, "0");
        if (S.plan(date, 2, 53, 3, { hist: [] }).events.some(e => e.act === "whale")) without++;
        if (S.plan(date, 2, 53, 3, { hist: [{ d: "2026-09-30", p: 2, a: "whale" }, { d: "2026-09-29", p: 2, a: "whale" }] }).events.some(e => e.act === "whale")) withMem++;
      }
      const cur = S.current();
      return { withMem, without, cur: cur && { period: cur.period, weather: cur.plan.weather, n: cur.plan.events.length }, body: document.body.dataset.sea, sea: document.getElementById("sea").dataset.weather };
    });
    ok(r.withMem < r.without, "memory did not thin repeats: " + JSON.stringify(r));
    ok(r.cur && r.cur.period === 0 && r.cur.weather === r.body && r.body === r.sea, "no plan for the period in session: " + JSON.stringify(r));
  });

  test("v7.5: a running timer keeps the loud acts off; Settings can hold the sea calm", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T09:40:00");
    await dh.launch();
    await dh.addTimer();
    ok(!(await page.evaluate(() => window.Deckhand.canvas.timerRunning())), "timer running before start");
    await page.evaluate(() => document.querySelector(".w-timer")._entry.api.startSeconds(60));
    ok(await page.evaluate(() => window.Deckhand.canvas.timerRunning()), "timer probe blind");
    await page.click("#setBtn");
    await page.selectOption("#sSeaWeather", "calm");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    ok((await page.evaluate(() => [window.Deckhand.config.ui.seaWeather, document.body.dataset.sea].join())) === "calm,calm", "calm setting not applied");
    await page.evaluate(() => window.Deckhand.seaModule.setWeather("windy"));
    ok((await page.evaluate(() => document.body.dataset.sea)) === "calm", "calm setting did not hold");
  });
});

test.describe("the boat and the residents", () => {
  test("v7.5: the gull lands on the masthead, sits, and leaves before anything loud; the pennant hoists in hitches", async ({ page, dh }) => {
    const pg = await dh.newPage({ reducedMotion: "no-preference" });
    await pg.goto(dh.url + "#t=2026-09-26T12:00");        // a Saturday: the director sleeps, the sea is free
    await pg.waitForFunction(() => !!window.Deckhand);
    await pg.click("#launchBtn");
    // the boat is nested: drift on #boat, the swell wrapper, the chop wrapper, then the rig
    const nest = await pg.evaluate(() => !!document.querySelector("#boat > .btSwell > .btChop > .btSvg .btRig"));
    ok(nest, "boat wrappers missing");
    await pg.evaluate(() => window.Deckhand.sea("gull"));
    await expect(pg.locator("#boat")).toHaveClass(/gullIn/);
    await expect(pg.locator("#boat")).toHaveClass(/\bgull\b/, { timeout: 9000 });
    await expect(pg.locator("#boat")).not.toHaveClass(/gullIn/, { timeout: 3000 });
    ok((await pg.evaluate(() => getComputedStyle(document.querySelector("#boat .glPerch")).visibility)) === "visible", "gull not perched");
    ok(await pg.evaluate(() => window.Deckhand.seaModule.residents.gull), "resident flag off");
    // something loud is coming: the gull leaves FIRST, the whale surfaces three seconds later
    const t0 = Date.now();
    await pg.evaluate(() => window.Deckhand.sea("whale"));
    await expect(pg.locator("#boat")).toHaveClass(/gullOut/);
    ok(!(await pg.evaluate(() => document.getElementById("sea-whale").classList.contains("go"))), "the whale came up before the gull left");
    await expect(pg.locator("#sea-whale")).toHaveClass(/go/, { timeout: 6000 });
    ok(Date.now() - t0 >= 2500, "no tell before the whale");
    await expect(pg.locator("#boat")).toHaveClass(/rippled/);
    await pg.evaluate(() => { document.getElementById("sea-whale").classList.remove("go"); document.getElementById("boat").classList.remove("rippled", "gullOut"); });
    // the pennant: mast, lump, reveal — on a clip so the letters keep their shape
    await pg.evaluate(() => window.Deckhand.sea("pennant"));
    const pen = await pg.evaluate(() => ({
      mast: getComputedStyle(document.querySelector("#boat .btMast")).animationName,
      lump: getComputedStyle(document.querySelector("#boat .btPenLump")).animationName,
      cloth: getComputedStyle(document.querySelector("#boat .btPenCloth")).animationName,
      heel: getComputedStyle(document.querySelector("#boat .btRig")).animationName
    }));
    ok(/mastUp/.test(pen.mast) && /penLump/.test(pen.lump) && /penReveal/.test(pen.cloth) && /penFlutter/.test(pen.cloth) && /btHeelPen/.test(pen.heel), "pennant rig: " + JSON.stringify(pen));
    await pg.close();
  });

  test("v7.5: a tap hops the boat at once and answers with a SHOW; a second tap inside a minute only hops; a long press queues a rare", async ({ page, dh }) => {
    const pg = await dh.newPage({ reducedMotion: "no-preference" });
    await pg.goto(dh.url + "#t=2026-09-26T12:00");
    await pg.waitForFunction(() => !!window.Deckhand);
    await pg.click("#launchBtn");
    await pg.click("#boat", { force: true });
    await expect(pg.locator("#boat")).toHaveClass(/hop/);
    const first = await pg.evaluate(() => window.Deckhand.seaModule.lastStaged());
    ok(first && ["attack", "whale", "scatter", "chase"].includes(first.act), "summon pool: " + JSON.stringify(first));
    await pg.evaluate(() => window.Deckhand.seaModule.clear());
    await pg.click("#boat", { force: true });
    const second = await pg.evaluate(() => window.Deckhand.seaModule.lastStaged());
    ok(second.at === first.at, "the cooldown let a second show through");
    await expect(pg.locator("#boat")).toHaveClass(/hop/);
    // the long press
    await pg.evaluate(() => window.Deckhand.seaModule.clear());
    const box = await pg.locator("#boat").boundingBox();
    await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1700);
    await pg.mouse.up();
    await expect.poll(() => pg.evaluate(() => (window.Deckhand.seaModule.lastStaged() || {}).act), { timeout: 4000 }).toMatch(/attack|scatter|whale/);
    await pg.close();
  });

  test("v7.5: weather is three cheap knobs — calm, breezy, windy — and windy sinks the paper boat", async ({ page, dh }) => {
    const pg = await dh.newPage({ reducedMotion: "no-preference" });
    await pg.goto(dh.url + "#t=2026-09-26T12:00");
    await pg.waitForFunction(() => !!window.Deckhand);
    await pg.click("#launchBtn");
    const knobs = await pg.evaluate(() => {
      const S = window.Deckhand.seaModule, out = {};
      ["calm", "breezy", "windy"].forEach(w => {
        S.setWeather(w);
        const cs = getComputedStyle(document.body);
        out[w] = { h1: cs.getPropertyValue("--h1").trim(), p1: cs.getPropertyValue("--p1").trim(), swell: cs.getPropertyValue("--swell").trim() };
      });
      return out;
    });
    ok(+knobs.calm.h1 < +knobs.breezy.h1 && +knobs.breezy.h1 < +knobs.windy.h1, "heave knobs: " + JSON.stringify(knobs));
    ok(+knobs.calm.swell < 1 && +knobs.windy.swell > 1, "swell knobs: " + JSON.stringify(knobs));
    await pg.evaluate(() => { window.Deckhand.seaModule.setWeather("windy"); window.Deckhand.sea("paper", "near"); });
    const sink = await pg.evaluate(() => getComputedStyle(document.querySelector("#sea-paper .ppRock")).animationName);
    ok(/ppSink/.test(sink), "windy paper boat does not sink: " + sink);
    await pg.evaluate(() => { document.getElementById("sea-paper").classList.remove("go"); window.Deckhand.seaModule.setWeather("breezy"); window.Deckhand.sea("paper", "near"); });
    const dry = await pg.evaluate(() => getComputedStyle(document.querySelector("#sea-paper .ppRock")).animationName);
    ok(!/ppSink/.test(dry), "the paper boat sinks in a breeze: " + dry);
    await pg.close();
  });
});
