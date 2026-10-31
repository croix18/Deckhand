/* v7.56 — November (Croix: "Halloween is over so I need a fall theme. Not quite winter
 * theming yet."). October's sibling: Season sets body.november for the month; falling
 * leaves down the board's outer edges, a lantern on the boat that brightens week by week,
 * a V of geese (the sea's one sky act, on its own clock), the lunch tray gone fall, and
 * Thanksgiving week's bowl of gourds. Seasonal touches Off takes it all. */
const { test, expect, ok } = require("./helpers");

const motionOn = page => page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });
const has = (page, c) => page.evaluate(c => document.body.classList.contains(c), c);
const shown = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none"; }, sel);

test.describe("v7.56 November", () => {
  test("v7.56: the month by name — November in November, October in October, neither in December or with Seasonal touches Off", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-10T10:30");
    await dh.launch();
    ok(await has(page, "november") && !(await has(page, "october")), "Nov 10 should be November only: " + await page.evaluate(() => document.body.className));
    ok((await page.evaluate(() => window.Deckhand.season.active())) === "november", "active() should name the month");
    // the haunted lofi side stays October's
    await dh.addW("addMusicBtn");
    ok(!(await page.evaluate(() => window.Deckhand.lofiSides())).includes("Graveyard shift"), "the haunted side leaked into November");
    // the switch takes November too
    await page.evaluate(() => { window.Deckhand.config.ui.season = "off"; window.Deckhand.season.apply(); });
    ok(!(await has(page, "november")) && !(await has(page, "october")), "Off left a month on");
    ok((await page.evaluate(() => window.Deckhand.season.active())) === null, "Off: active() should be null");
    ok((await page.evaluate(() => document.querySelectorAll("#nvLeaves .nvLeaf").length)) === 0, "Off left leaves");
    await dh.openAt("#t=2026-10-20T10:30");
    await dh.launch();
    ok(await has(page, "october") && !(await has(page, "november")), "Oct 20 should be October only");
    ok((await page.evaluate(() => window.Deckhand.season.active())) === "october", "October: active()");
    await dh.openAt("#t=2026-12-02T10:30");
    await dh.launch();
    ok(!(await has(page, "november")) && !(await has(page, "october")), "December kept a month");
    await expect(page.locator("#nvLeaves")).toBeHidden();
  });

  test("v7.56: leaves fall in the outer columns only, never over the clock's digits, and the stage takes them", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-10T10:30");
    await dh.launch();
    await motionOn(page);
    const boxes = await page.evaluate(() => {
      const S = window.Deckhand.season;
      ["left", "right", "left", "right", "right"].forEach((side, i) => S._leaf({ side, at: [0, .3, .6, .85, .5][i] }));
      return [...document.querySelectorAll("#nvLeaves .nvLeaf")].map(e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
    });
    ok(boxes.length === 5, "five leaves: " + boxes.length);
    const W = await page.evaluate(() => innerWidth), clock = await page.locator("#clock").boundingBox();
    for (const b of boxes){
      ok(b.r < W * .18 || b.l > W * .82, "a leaf outside the outer columns: " + JSON.stringify(b));
      const hit = b.l < clock.x + clock.width && b.r > clock.x && b.t < clock.y + clock.height && b.b > clock.y;
      ok(!hit, "a leaf over the digits: " + JSON.stringify([b, clock]));
    }
    ok(await shown(page, "#nvLeaves"), "the leaves' layer is hidden on the board");
    ok((await page.evaluate(() => getComputedStyle(document.getElementById("nvLeaves")).pointerEvents)) === "none", "the layer takes taps; only a leaf should");
    // never more than six
    await page.evaluate(() => { for (let i = 0; i < 4; i++) window.Deckhand.season._leaf({ at: .5 }); });
    ok((await page.evaluate(() => window.Deckhand.season.leaves.count())) === 6, "more than six on the board");
    // a tap sends one spinning away
    const before = await page.evaluate(() => window.Deckhand.season.leaves.count());
    await page.locator("#nvLeaves .nvLeaf").first().dispatchEvent("pointerdown");
    ok((await page.evaluate(() => window.Deckhand.season.leaves.count())) === before - 1, "a tap did not fling the leaf");
    ok((await page.evaluate(() => document.querySelector("#nvLeaves .nvGone").getAnimations().length)) === 1, "the flung leaf is not spinning away");
    await page.evaluate(() => document.querySelector("#nvLeaves .nvGone").getAnimations().forEach(a => a.finish()));   // its 1.1 s, now
    await expect(page.locator("#nvLeaves .nvGone")).toHaveCount(0);
    // the stage: a staged card clears the moving leaves and hides the layer; no new one falls there
    await dh.addTimer();
    await page.click(".w-timer .wFocus");
    ok(await has(page, "focusMode"), "the timer did not take the stage");
    ok(!(await shown(page, "#nvLeaves")), "leaves on the stage");
    ok((await page.evaluate(() => window.Deckhand.season.leaves.count())) === 0, "moving leaves outlived the stage");
    ok((await page.evaluate(() => window.Deckhand.season._leaf())) === null, "a leaf spawned on the stage");
  });

  test("v7.56: reduced motion — nothing falls; three leaves rest still on the water", async ({ page, dh }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await dh.openAt("#t=2026-11-10T10:30");
    await dh.launch();
    ok(!(await has(page, "waveMotion")), "waveMotion on under reduced motion");
    ok((await page.evaluate(() => window.Deckhand.season._leaf())) === null, "a leaf fell under reduced motion");
    await page.evaluate(() => window.Deckhand.season.leaves.step());
    const r = await page.evaluate(() => {
      const ls = [...document.querySelectorAll("#nvLeaves .nvLeaf")];
      return { n: ls.length, rest: ls.every(e => e.classList.contains("nvRest")), anims: ls.reduce((n, e) => n + e.getAnimations({ subtree: true }).length, 0),
               low: ls.every(e => e.getBoundingClientRect().top > innerHeight - 60), right: ls.every(e => e.getBoundingClientRect().left > innerWidth * .82) };
    });
    ok(r.n === 3 && r.rest, "three resting leaves: " + JSON.stringify(r));
    ok(r.anims === 0, "a resting leaf animates: " + r.anims);
    ok(r.low && r.right, "the resting leaves should lie on the water at the right edge: " + JSON.stringify(r));
    // no geese either
    await page.evaluate(() => window.Deckhand.sea("geese"));
    ok((await page.evaluate(() => getComputedStyle(document.getElementById("sea-geese")).visibility)) === "hidden", "geese under reduced motion");
  });

  test("v7.56: the boat's lantern — November only, brighter each week, brightest Thanksgiving week", async ({ page, dh }) => {
    const lampAt = async t => {
      await dh.openAt("#t=" + t);
      await dh.launch();
      return page.evaluate(() => ({ shown: getComputedStyle(document.querySelector("#boat .nvLantern")).display !== "none",
        streamer: getComputedStyle(document.querySelector("#boat .btStreamer")).display !== "none",
        lamp: +(document.body.dataset.nvLamp || 0), glow: +getComputedStyle(document.body).getPropertyValue("--lamp") }));
    };
    const oct = await lampAt("2026-10-20T10:30");
    ok(!oct.shown && oct.streamer, "October flies the streamer, no lantern: " + JSON.stringify(oct));
    const w1 = await lampAt("2026-11-03T10:30"), w2 = await lampAt("2026-11-10T10:30"), w3 = await lampAt("2026-11-17T10:30"), tg = await lampAt("2026-11-24T10:30");
    ok(w1.shown && !w1.streamer, "November hangs the lantern: " + JSON.stringify(w1));
    ok(w1.lamp === 1 && w2.lamp === 2 && w3.lamp === 3 && tg.lamp === 4, "lamp steps: " + [w1.lamp, w2.lamp, w3.lamp, tg.lamp]);
    ok(w1.glow < w2.glow && w2.glow < w3.glow && w3.glow < tg.glow && tg.glow === 1, "the glow should grow: " + [w1.glow, w2.glow, w3.glow, tg.glow]);
  });

  test("v7.56: the geese — a sky act in November only, on their own clock, never in a setlist", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-10T10:30");
    await dh.launch();
    await motionOn(page);
    await page.evaluate(() => { window.Deckhand.seaModule.acts.geese.dur = 700; });
    const up = await page.evaluate(() => {   // one task: the act's clock cannot run out between the looks
      const played = window.Deckhand.sea("geese"), g = document.getElementById("sea-geese");
      return { played, go: g.classList.contains("go"), vis: getComputedStyle(g).visibility,
               n: g.querySelectorAll(".nvGoose").length, flying: g.querySelector(".nvV").getAnimations().length };
    });
    ok(up.played && up.go, "geese refused in November: " + JSON.stringify(up));
    ok(up.vis === "visible", "the V is not visible: " + JSON.stringify(up));
    ok(up.n >= 7 && up.n <= 9, "seven to nine geese: " + up.n);
    ok(up.flying > 0, "the V does not fly");
    await expect(page.locator("#sea-geese")).not.toHaveClass(/go/, { timeout: 1500 });
    const M = await page.evaluate(() => {
      const S = window.Deckhand.seaModule, out = { novPlan: new Set(), days: {}, tg: S.thanksgivingDay(2026) };
      for (let d = 1; d <= 30; d++){
        const ds = "2026-11-" + String(d).padStart(2, "0");
        for (let p = 0; p < 7; p++) S.plan(ds, p, 53, 1 + (d % 5), null).events.forEach(e => out.novPlan.add(e.act));
        out.days[d] = S.geeseTimes(ds);
      }
      out.novPlan = [...out.novPlan];
      out.oct = S.geeseTimes("2026-10-20"); out.dec = S.geeseTimes("2026-12-02");
      out.same = JSON.stringify(S.geeseTimes("2026-11-10")) === JSON.stringify(S.geeseTimes("2026-11-10"));
      return out;
    });
    ok(!M.novPlan.includes("geese"), "a period setlist cast the geese");
    ok(M.tg === 26, "Thanksgiving 2026 is the 26th: " + M.tg);
    for (let d = 1; d <= 30; d++){
      const t = M.days[d];
      ok(t.length >= 1 && t.length <= 2, "Nov " + d + ": " + JSON.stringify(t));
      ok(t.every(m => m >= 9 * 60 + 15 && m <= 15 * 60 + 15), "Nov " + d + " outside the school day: " + JSON.stringify(t));
    }
    ok(M.days[20].length === 2, "the Friday before the break should have two crossings: " + JSON.stringify(M.days[20]));
    for (const d of [23, 24, 25, 26, 27]) ok(M.days[d].length >= 1, "Thanksgiving week day without geese: " + d);
    ok(M.oct.length === 0 && M.dec.length === 0, "geese outside November");
    ok(M.same, "geeseTimes is not pure");
    // October refuses them
    await dh.openAt("#t=2026-10-20T10:30");
    await dh.launch();
    ok(!(await page.evaluate(() => window.Deckhand.sea("geese"))), "geese played in October");
  });

  test("v7.56: lunch goes fall — pie for the cookie (it still takes three bites), cider for the milk, a rust tray", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-10T12:50");                           // Black Tuesday: Lunch 12:42–1:12
    await dh.launch();
    await expect(page.locator("#periodNow")).toHaveText("Lunch");
    await expect(page.locator("#lunchArt .lunchTray")).toBeVisible();
    await expect(page.locator("#lunchArt .lPie")).toBeVisible();
    await expect(page.locator("#lunchArt .lCookieBody")).toBeHidden();
    await expect(page.locator("#lunchArt .lChips")).toBeHidden();
    await expect(page.locator("#lunchArt text.nvOnly")).toHaveText("CIDER");
    await expect(page.locator("#lunchArt text.ocNot")).toBeHidden();
    await expect(page.locator("#lunchArt text.ocOnly")).toBeHidden();
    await expect(page.locator("#lunchArt .lCinnamon")).toBeVisible();
    await expect(page.locator("#lunchArt .lAppleBody")).toBeVisible();            // the apple stays
    await expect(page.locator("#lunchArt .lPk")).toBeHidden();
    ok((await page.evaluate(() => getComputedStyle(document.querySelector("#lunchArt .lTrayBody")).fill)) === "rgb(181, 84, 42)", "the tray is not rust");
    const cookie = page.locator("#lunchArt .lCookie");
    for (const n of [1, 2, 3, 0]){
      await cookie.click({ force: true });
      ok((await page.evaluate(() => +(document.querySelector("#lunchArt .lCookie").dataset.bites || 0))) === n, "bites not " + n);
    }
    await page.locator("#lunchArt .lCookie").evaluate(e => { e.dataset.bites = "2"; });
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll("#lunchArt .lPie .lBite")].map(b => getComputedStyle(b).opacity).join()), { timeout: 1000 }).toBe("1,1,0");   // the bites fade in over 80 ms
    await page.locator("#lunchArt .lMilk").click({ force: true });
    ok(await page.evaluate(() => document.querySelector("#lunchArt .lMilk").classList.contains("go")), "the cider did not slurp");
    ok(!(await page.evaluate(() => document.querySelector("#lunchArt .lGhost").classList.contains("go"))), "the October ghost popped in November");
  });

  test("v7.56: Thanksgiving week — Season.thanksgivingWeek, and the bowl of gourds that week only (a tap wobbles one)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-17T10:30");
    await dh.launch();
    const tw = await page.evaluate(() => { const S = window.Deckhand.season;
      return ["2026-11-22T12:00", "2026-11-23T00:00", "2026-11-24T10:00", "2026-11-29T23:59", "2026-11-30T00:00", "2026-11-17T10:00", "2025-11-25T10:00", "2025-11-21T10:00"]
        .map(s => S.thanksgivingWeek(new Date(s))).join(); });
    ok(tw === "false,true,true,true,false,false,true,false", "thanksgivingWeek: " + tw);
    ok(await page.evaluate(() => window.Deckhand.season.thanksgivingWeek(new Date("2026-11-24"))), "Nov 24 2026 is Thanksgiving week");
    ok(!(await page.evaluate(() => window.Deckhand.season.thanksgivingWeek(new Date("2026-11-17")))), "Nov 17 2026 is not");
    ok(!(await has(page, "nvThanks")), "Nov 17 wears Thanksgiving");
    await expect(page.locator("#nvGourds")).toBeHidden();
    await dh.openAt("#t=2026-11-24T10:30");
    await dh.launch();
    await motionOn(page);
    ok(await has(page, "nvThanks"), "Nov 24 is not Thanksgiving week on the board");
    await expect(page.locator("#nvGourds")).toBeVisible();
    ok((await page.evaluate(() => document.body.dataset.nvLamp)) === "4", "the lantern is not at its brightest");
    const g = page.locator("#nvGourds .nvGourd.g2");
    await g.dispatchEvent("pointerdown");
    await expect(g).toHaveClass(/wob/);
    // the gourds never sit over the digits
    const gb = await page.locator("#nvGourds").boundingBox(), cb = await page.locator("#clock").boundingBox();
    ok(gb.x > cb.x + cb.width || gb.y > cb.y + cb.height, "the gourds over the clock: " + JSON.stringify([gb, cb]));
    // not on the stage
    await dh.addTimer();
    await page.click(".w-timer .wFocus");
    await expect(page.locator("#nvGourds")).toBeHidden();
  });
});
