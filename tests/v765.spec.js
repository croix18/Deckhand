/* v7.65 — Winter, December (docs/reviews/winter-design.md C1–C3, C6a; winter-animation.md B1, B2, B4–B6):
 * the frost, the flurries, the snowman of beach finds, the dune's snow, the manatee and the gull's visits.
 *   · what shows on each December date (and on Jan 6) is a pure function of the date: the frost's stage,
 *     the snowman's stage, the dune's cover; nothing winter before Nov 30
 *   · decoration keeps to the edges: the frost never reaches the face's content, no flake is ever over
 *     the clock's columns, the snowman stays clear of the clock's digits; the stage, the landing page and
 *     Seasonal touches Off take all of it
 *   · snow is weather: one to three flurries a school week, a cap of three flakes on the board
 *   · the manatee from Dec 7 (the greeting every period on Dec 7–8 and the first two days back), gone
 *     after Jan 8 (it swims off left that day); the gull's first visit on Dec 14, in the day's first class */
const { test, ok } = require("./helpers");

const shown = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none" && (e.id === "wnFrostBox" || e.id === "wnCap" || e.getBoundingClientRect().width > 0); }, sel);
const stagesOf = (page, ymd) => page.evaluate(ymd => { const [y, m, d] = ymd.split("-").map(Number); return window.Deckhand.season.winterStages(new Date(y, m - 1, d)); }, ymd);
const EXPECT = {
  "2026-11-24": null,
  "2026-11-30": { frost: .25, sm: "S1", cap: .45 },
  "2026-12-03": { frost: .25, sm: "S1", cap: .45 },
  "2026-12-07": { frost: .4, sm: "S2", cap: .7 },
  "2026-12-10": { frost: .4, sm: "S2", cap: .7 },
  "2026-12-14": { frost: .55, sm: "S3", cap: .85 },
  "2026-12-18": { frost: .55, sm: "S3", cap: .85 },
  "2026-12-29": { frost: .55, sm: "S3", cap: .85 },   // the break holds the last school day's world
  "2027-01-06": { frost: .78, sm: "S3", cap: .85 }
};
/* the frost painted (the idle callback), then its box against the face's content */
async function frostOn(page){
  await page.evaluate(() => { const F = window.Deckhand.season.frost; F.reset(); F.step(true); });
  await page.waitForFunction(() => !!document.querySelector("#wnFrostBox .wnFrost.on"), null, { timeout: 5000 });
}

test.describe("v7.65 winter, December", () => {
  test("v7.65: the stages are pure in the date — frost F1/F2/F3/F4, the snowman S1/S2/S3, the dune's cover; none before Nov 30", async ({ page, dh }) => {
    await dh.openAt("");
    for (const [d, want] of Object.entries(EXPECT)){
      const got = await stagesOf(page, d);
      ok(JSON.stringify(got) === JSON.stringify(want), d + ": " + JSON.stringify(got) + " ≠ " + JSON.stringify(want));
    }
    for (const d of ["2026-10-31", "2026-11-20", "2026-11-29"]) ok((await stagesOf(page, d)) === null, "winter stages on " + d);
    // the generator paints any s up to the designed peak; this version caps the schedule at F4
    ok((await page.evaluate(() => window.Deckhand.season.frost && 1)) === 1, "no frost module");
  });

  test("v7.65: on the board — Nov 24 nothing winter; Nov 30 the snowball, the first frost, the dune's snow; Dec 7 stacked; Dec 14 and Jan 6 finished; the frost keeps 28 px from the face", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-24T10:30");
    await dh.launch();
    for (const sel of ["#wnSnowman", "#wnFrostBox", "#wnSnow", "#wnCap"]) ok(!(await shown(page, sel)), sel + " on Nov 24");
    ok((await page.evaluate(() => document.querySelectorAll("#wnFrostBox canvas, #wnSnowman .smLayer, #wnCap .capLayer").length)) === 0, "winter drawn on Nov 24");
    for (const [d, sm] of [["2026-11-30", "S1"], ["2026-12-07", "S2"], ["2026-12-14", "S3"], ["2027-01-06", "S3"]]){
      await dh.openAt("#t=" + d + "T10:30");
      await dh.launch();
      ok(await shown(page, "#wnSnowman"), "no snowman on " + d);
      ok((await page.evaluate(() => document.getElementById("wnSnowman").dataset.stage)) === sm, "snowman stage on " + d);
      ok((await page.evaluate(() => document.querySelectorAll("#wnCap .capLayer path").length)) > 0, "no dune snow on " + d);
      await frostOn(page);
      /* the painted pixels, not the canvas's box (the top band runs above the face): none within 20 px of the face's
         content (every text or bar box in it), so none over the clock's digits either */
      const r = await page.evaluate(() => {
        const cv = document.querySelector("#wnFrostBox .wnFrost.on"), c = cv.getBoundingClientRect(), k = cv.width / c.width;
        const px = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
        const boxes = [...document.querySelectorAll("#clockFace *")].filter(el => !el.closest("svg") && (!el.children.length || [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())))
          .map(el => el.getBoundingClientRect()).filter(b => b.width > 1 && b.height > 1);
        let hits = 0, painted = 0;
        for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2){
          if (px[(y * cv.width + x) * 4 + 3] < 8) continue;
          painted++;
          const sx = c.left + x / k, sy = c.top + y / k;
          if (boxes.some(b => sx > b.left - 20 && sx < b.right + 20 && sy > b.top - 20 && sy < b.bottom + 20)) hits++;
        }
        const clock = document.getElementById("clock").getBoundingClientRect(), sm = document.getElementById("wnSnowman").getBoundingClientRect();
        return { w: c.width, h: c.height, painted, hits, smOverDigits: sm.left < clock.right && sm.right > clock.left && sm.top < clock.bottom && sm.bottom > clock.top };
      });
      ok(r.w > 50 && r.h > 50 && r.painted > 500, d + ": the frost is " + JSON.stringify(r));
      ok(r.hits === 0, d + ": " + r.hits + " frost pixels within 20 px of the face's content");
      ok(!r.smOverDigits, d + ": the snowman over the clock's digits");
    }
    // the frost grows: Jan 6 (F4) is bigger than Nov 30 (F1)
  });

  test("v7.65: the stage, the landing page and Seasonal touches Off take it all; a bell routine hides the frost", async ({ page, dh }) => {
    await dh.openAt("#t=2026-12-14T10:30");
    await dh.launch();
    await frostOn(page);
    ok((await shown(page, "#wnSnowman")) && (await shown(page, "#wnFrostBox")), "December's pieces missing on Dec 14");
    await page.click("#clockWidget .wFocus");
    ok(!(await shown(page, "#wnSnowman")) && !(await shown(page, "#wnFrostBox")) && !(await shown(page, "#wnSnow")), "winter on the stage");
    await dh.openAt("#t=2026-12-14T10:30");
    await dh.launch();
    await page.evaluate(() => { document.getElementById("clockWidget").classList.add("stLive"); });
    ok(!(await shown(page, "#wnFrostBox")), "the frost over a bell routine");
    await page.evaluate(() => { document.getElementById("clockWidget").classList.remove("stLive"); window.Deckhand.config.ui.season = "off"; window.Deckhand.season.apply(); });
    ok(!(await shown(page, "#wnSnowman")) && !(await shown(page, "#wnFrostBox")) && !(await shown(page, "#wnCap")), "Seasonal touches Off left winter up");
  });

  test("v7.65: flurries are rare and pure — one on Nov 30 in the first period, 2 a school week in December, none before Nov 30; never more than 3 flakes, all in the outer columns", async ({ page, dh }) => {
    await dh.openAt("#t=2026-12-10T10:30");
    await dh.launch();
    const r = await page.evaluate(() => {
      const S = window.Deckhand.season, key = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const week = mon => { let n = 0; for (let i = 0; i < 5; i++){ const d = new Date(2026, 11, mon + i); n += S.flurryTimes(key(d)).length; } return n; };
      const nov30 = S.flurryTimes("2026-11-30");
      return { nov30, again: JSON.stringify(S.flurryTimes("2026-12-09")) === JSON.stringify(S.flurryTimes("2026-12-09")),
               before: ["2026-11-20", "2026-11-25", "2026-11-29"].map(d => S.flurryTimes(d).length).reduce((a, b) => a + b, 0),
               w1: [1, 2, 3, 4].map(i => S.flurryTimes(key(new Date(2026, 11, i))).length).reduce((a, b) => a + b, 0),
               w2: week(7), w3: week(14), all: (() => { const out = []; for (let i = 7; i < 19; i++) S.flurryTimes(key(new Date(2026, 11, i))).forEach(f => out.push(f)); return out; })() };
    });
    ok(r.nov30.length === 1 && r.nov30[0].p === 0 && r.nov30[0].first, "Nov 30's first snowflake: " + JSON.stringify(r.nov30));
    ok(r.again && r.before === 0 && r.w1 === 0, "flurries not pure, or before Nov 30, or more on Dec 1–4");
    ok(r.w2 === 2 && r.w3 === 2, "December weeks: " + r.w2 + ", " + r.w3);
    ok(r.all.every(f => f.at >= 10 && f.at <= 35 && f.len >= 3 && f.len <= 6 && f.n >= 5 && f.n <= 9), "a flurry outside the design's shape: " + JSON.stringify(r.all));
    // the cap and the columns, on the board with motion on
    await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });
    const fl = await page.evaluate(() => { const S = window.Deckhand.season.snow; let n = 0; for (let i = 0; i < 8; i++) if (S.spawn({ at: .3 })) n++;
      const W = innerWidth, clock = document.getElementById("clock").getBoundingClientRect();
      const boxes = [...document.querySelectorAll(".wnFlake.on")].map(e => e.getBoundingClientRect());
      return { n, count: S.count(), out: boxes.filter(b => !(b.right < W * .155 || b.left > W * .845)).length, overClock: boxes.filter(b => b.left < clock.right && b.right > clock.left && b.top < clock.bottom && b.bottom > clock.top).length }; });
    ok(fl.n === 3 && fl.count === 3, "the cap: " + JSON.stringify(fl));
    ok(fl.out === 0 && fl.overClock === 0, "a flake outside the outer columns or over the clock: " + JSON.stringify(fl));
    // reduced motion: nothing falls; during a flurry two crystals lie still
    await page.evaluate(() => { const S = window.Deckhand.season.snow; S.clear(); window.Deckhand.config.ui.motion = "off"; document.body.classList.remove("waveMotion"); S.flurry(60000, 6); });
    const still = await page.evaluate(() => ({ on: document.querySelectorAll(".wnFlake.on").length, anims: document.querySelectorAll(".wnFlake.on").length ? [...document.querySelectorAll(".wnFlake")].reduce((a, e) => a + e.getAnimations({ subtree: true }).length, 0) : -1 }));
    ok(still.on === 2 && still.anims === 0, "reduced motion: " + JSON.stringify(still));
  });

  test("v7.65: the manatee — from Dec 7, greeting every period on Dec 7–8 and Jan 6–7, leaving left on Jan 8, gone after; it plays on the board and the gull leans", async ({ page, dh }) => {
    await dh.openAt("#t=2026-12-10T10:30");
    await dh.launch();
    const r = await page.evaluate(() => {
      const M = window.Deckhand.seaModule, g = d => [0, 1, 2, 3, 4, 5].map(p => M.plan(d, p, 50, 1, null).events[0].act);
      const acts = d => { const s = new Set(); for (let p = 0; p < 7; p++) M.plan(d, p, 50, 1, null).events.forEach(e => s.add(e.act)); return [...s]; };
      return { dec7: g("2026-12-07"), dec8: g("2026-12-08"), jan6: g("2027-01-06"), jan7: g("2027-01-07"),
               dec3: acts("2026-12-03").indexOf("manatee"), nov30: acts("2026-11-30").filter(a => ["manatee", "visit"].indexOf(a) !== -1).length,
               jan11: acts("2027-01-11").indexOf("manatee"), w: M.winterWeight("2026-12-02").w, cap: M.winterWeight("2026-12-09").cap,
               visitPlanned: ["2026-12-09", "2026-12-15", "2026-12-16"].some(d => acts(d).indexOf("visit") !== -1) };
    });
    ok(r.dec7.every(a => a === "manatee") && r.dec8.every(a => a === "manatee"), "the debut: " + r.dec7 + " / " + r.dec8);
    ok(r.jan6.every(a => a === "manatee") && r.jan7.every(a => a === "manatee"), "first back: " + r.jan6 + " / " + r.jan7);
    ok(r.dec3 === -1 && r.nov30 === 0 && r.jan11 === -1 && r.w === 0 && r.cap === 2, "the manatee's window or the weight: " + JSON.stringify(r));
    ok(!r.visitPlanned, "the visit is on its own clock, never in a setlist");
    // on the board
    await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); const M = window.Deckhand.seaModule; M.clear(); M.residents.gull = true; document.getElementById("boat").classList.add("gull"); });
    ok(await page.evaluate(() => window.Deckhand.seaModule.play("manatee", "near")), "the manatee would not play on Dec 10");
    await page.waitForTimeout(300);
    const on = await page.evaluate(() => { const e = document.getElementById("sea-manatee"); return { go: e.classList.contains("go"), leave: e.classList.contains("leave"), boat: document.getElementById("boat").classList.contains("manatee"),
      near: e.parentNode.classList.contains("seaNear"), anim: e.getAnimations({ subtree: true }).map(a => a.animationName).filter(Boolean).sort().join() }; });
    ok(on.go && !on.leave && on.boat && on.near && /mnDrift/.test(on.anim) && /mnPitch/.test(on.anim) && /mnGullLean/.test(await page.evaluate(() => document.querySelector("#boat .glPerch").getAnimations().map(a => a.animationName).join())), "the act on the board: " + JSON.stringify(on));
    await dh.openAt("#t=2027-01-08T10:30");
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); window.Deckhand.seaModule.clear(); window.Deckhand.seaModule.play("manatee", "near"); });
    ok(await page.evaluate(() => document.getElementById("sea-manatee").classList.contains("leave")), "Jan 8 is not the leaving day");
  });

  test("v7.65: the gull's visit — first on Dec 14 in the day's first class, never before the snowman is finished; the resident comes home at its end", async ({ page, dh }) => {
    await dh.openAt("#t=2026-12-14T10:30");
    await dh.launch();
    const r = await page.evaluate(() => { const S = window.Deckhand.season; const n = []; for (let i = 1; i <= 13; i++) n.push(S.visitTimes("2026-12-" + String(i).padStart(2, "0")));
      let dec = 0; for (let i = 15; i <= 18; i++) if (S.visitTimes("2026-12-" + i)) dec++;
      return { before: n.filter(Boolean).length, first: S.visitTimes("2026-12-14"), freeze: S.visitTimes("2027-01-20"), dec }; });
    ok(r.before === 0 && r.first && r.first.p === 0 && r.first.at === 105000 && r.freeze === null && r.dec <= 3, "the visit's clock: " + JSON.stringify(r));
    await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); const M = window.Deckhand.seaModule; M.clear(); M.residents.gull = true; document.getElementById("boat").classList.add("gull"); });
    ok(await page.evaluate(() => window.Deckhand.seaModule.play("visit")), "the visit would not start on Dec 14");
    const v = await page.evaluate(() => ({ go: document.getElementById("sea-visit").classList.contains("go"), home: window.Deckhand.seaModule.residents.gull,
      gullBack: window.Deckhand.seaModule.play("gull"), attack: window.Deckhand.seaModule.play("attack") }));
    ok(v.go && !v.home && !v.gullBack && !v.attack, "during the visit: " + JSON.stringify(v));
    await dh.openAt("#t=2026-12-10T10:30");
    await dh.launch();
    ok(!(await page.evaluate(() => window.Deckhand.seaModule.play("visit"))), "a visit before the snowman is finished");
  });
});
