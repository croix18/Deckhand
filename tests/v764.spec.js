/* v7.64 — Winter, part one: the year-round serpent from the approved prototype (tools/proofs/serpent.html)
 * and December's string lights (docs/reviews/winter-design.md C4, C8; winter-animation.md B3, B9).
 *   · the battle is assembled from a seed: an opener, two different exchanges and a finisher; the boat
 *     wins or the serpent wins, never a truce; the same seed is the same battle
 *   · the lights count school days by the board's own calendar, which now has single days off: MLK Day
 *     (Jan 18) is not one, so Jan 19 is one bulb darker than Jan 15, not two
 *   · nothing winter shows before Nov 30 (the Monday after Thanksgiving week); November ends there */
const { test, expect, ok } = require("./helpers");

const has = (page, c) => page.evaluate(c => document.body.classList.contains(c), c);
const shown = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none"; }, sel);
const count = (page, ymd) => page.evaluate(ymd => { const [y, m, d] = ymd.split("-").map(Number); const c = window.Deckhand.season.lights.count(new Date(y, m - 1, d)); return c ? c.lit : null; }, ymd);

test.describe("v7.64 the serpent's battle", () => {
  test("v7.64: a battle is assembled from its seed — both winners reachable, no truce, the same seed is the same battle", async ({ page, dh }) => {
    await dh.openAt("");
    const r = await page.evaluate(() => {
      const S = window.Deckhand.seaModule.serpent, out = { winners: {}, finishers: {}, openers: {}, bad: [], durs: [] };
      for (let seed = 1; seed <= 200; seed++){
        const b = S.assemble(seed);
        out.winners[b.winner] = (out.winners[b.winner] || 0) + 1;
        out.finishers[b.finisher] = (out.finishers[b.finisher] || 0) + 1;
        out.openers[b.opener] = (out.openers[b.opener] || 0) + 1;
        out.durs.push(b.dur);
        const want = { bonk: "boat", knot: "boat", dunk: "serpent", flop: "serpent" }[b.finisher];
        if (want !== b.winner || b.exchanges[0] === b.exchanges[1] || b.plan.length !== 4 || /truce/i.test(b.plan.join()) || !(b.KS.length > 20))
          out.bad.push(seed + ":" + b.plan.join(">") + ":" + b.winner);
      }
      const a = S.assemble(42), c = S.assemble(42), d = S.assemble(43);
      out.same = JSON.stringify([a.plan, a.KS, a.dur]) === JSON.stringify([c.plan, c.KS, c.dur]);
      out.differs = JSON.stringify(a.KS) !== JSON.stringify(d.KS);
      return out;
    });
    ok(!r.bad.length, "bad battles: " + r.bad.join(" "));
    ok(r.winners.boat > 60 && r.winners.serpent > 60 && Object.keys(r.winners).sort().join() === "boat,serpent", "winners: " + JSON.stringify(r.winners));
    ok(Object.keys(r.finishers).sort().join() === "bonk,dunk,flop,knot", "finishers: " + JSON.stringify(r.finishers));
    ok(Object.keys(r.openers).sort().join() === "fin,periscope", "openers: " + JSON.stringify(r.openers));
    ok(Math.min(...r.durs) > 35 && Math.max(...r.durs) < 52, "battle lengths " + Math.min(...r.durs) + "–" + Math.max(...r.durs));
    ok(r.same && r.differs, "a seed must replay its battle, and another seed play another");
  });

  test("v7.64: the attack plays a battle on the real boat at a fresh seed, its timer is the battle's, and the stage ends it and gives the boat back", async ({ dh }) => {
    const pg = await dh.newPage({ reducedMotion: "no-preference" });
    await pg.goto(dh.url + "#t=2026-10-14T10:30");
    await pg.waitForFunction(() => !!window.Deckhand);
    await pg.evaluate(() => { if (document.body.classList.contains("landing")) document.getElementById("launchBtn").click(); });
    await pg.waitForFunction(() => !document.body.classList.contains("landing"));
    const a = await pg.evaluate(() => { window.Deckhand.seaModule.clear(); window.Deckhand.sea("attack"); return window.Deckhand.seaModule.serpent.act(); });
    ok(a && a.kind === "battle" && a.dur > 35 && a.plan.length === 4 && /boat|serpent/.test(a.winner), "no battle: " + JSON.stringify(a));
    const b = await pg.evaluate(() => { window.Deckhand.seaModule.clear(); window.Deckhand.sea("attack"); return window.Deckhand.seaModule.serpent.act(); });
    ok(b.seed !== a.seed, "the same seed twice");
    // one body, drawn in one layer at a time, on the real boat's rig
    await pg.waitForFunction(() => /rotate/.test(document.querySelector("#boat .btRig").style.transform), null, { timeout: 3000 });
    ok(await pg.evaluate(() => document.querySelectorAll(".srpSerp").length === 1 && document.querySelectorAll("#srpBack use, #srpFront use, #srpTop use").length === 0), "the body is not one drawing");
    // the stage clears the sea: the loop stops and the boat is its own again
    await pg.click("#clockWidget .wFocus");
    await pg.waitForFunction(() => !window.Deckhand.seaModule.serpent.playing(), null, { timeout: 3000 });
    ok(await pg.evaluate(() => document.querySelector("#boat .btRig").style.transform === "" && !document.getElementById("boat").classList.contains("battle") &&
      getComputedStyle(document.getElementById("srpTop")).display === "none"), "the stage left the battle up");
    await pg.close();
  });

  test("v7.64: under reduced motion the serpent's acts keep their clock but draw nothing; the ice pass waits for the frozen sea", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-14T10:30");
    await dh.launch();
    const r = await page.evaluate(() => { document.body.classList.remove("waveMotion"); window.Deckhand.sea("serpent");
      return { go: document.getElementById("sea-serpent").classList.contains("go"), shown: getComputedStyle(document.getElementById("srpBack")).display }; });
    ok(r.go && r.shown === "none", "reduced motion drew the serpent: " + JSON.stringify(r));
    const f = await page.evaluate(() => { const S = window.Deckhand.seaModule;
      const o = { jan15: S.frozen("2027-01-15"), dates: [S.serpent.frozenDates("2027-01-10"), S.serpent.frozenDates("2027-01-11"), S.serpent.frozenDates("2027-01-29"), S.serpent.frozenDates("2027-01-30")] };
      document.body.classList.add("wnFrozen"); o.built = S.frozen("2027-01-15"); document.body.classList.remove("wnFrozen"); return o; });
    ok(f.jan15 === false && f.built === true && f.dates.join() === "false,true,true,false", "the ice pass's gate: " + JSON.stringify(f));
  });
});

test.describe("v7.64 winter: the lights and the calendar", () => {
  test("v7.64: the lights count December's school days, hold over the break, then count down — MLK Day is not a school day", async ({ page, dh }) => {
    await dh.openAt("");
    const want = { "2026-11-29": null, "2026-11-30": 0, "2026-12-01": 1, "2026-12-09": 7, "2026-12-18": 14, "2026-12-25": 14, "2027-01-01": 14,
      "2027-01-04": 14, "2027-01-05": 14, "2027-01-06": 13, "2027-01-15": 6, "2027-01-18": 6, "2027-01-19": 5, "2027-01-22": 2,
      "2027-01-26": 0, "2027-01-27": null, "2027-02-10": null };
    for (const [d, n] of Object.entries(want)) ok((await count(page, d)) === n, d + " should have " + n + " lit, not " + (await count(page, d)));
    const cal = await page.evaluate(() => { const B = window.Deckhand.bell;
      return { mlk: B.isSchoolDay(new Date(2027, 0, 18)), tue: B.isSchoolDay(new Date(2027, 0, 19)), pres: B.isSchoolDay(new Date(2027, 1, 15)),
               jan4: B.isSchoolDay(new Date(2027, 0, 4)), jan5: B.isSchoolDay(new Date(2027, 0, 5)), jan6: B.isSchoolDay(new Date(2027, 0, 6)),
               bells: B.dayBlocksFor(new Date(2027, 0, 18), 0), between: B.schoolDaysBetween(new Date(2027, 0, 15), new Date(2027, 0, 19)),
               seed: window.Deckhand.config.bell.skipDays.join() }; });
    ok(cal.mlk === false && cal.tue === true && cal.pres === false && cal.bells === null && cal.between === 1, "the calendar: " + JSON.stringify(cal));
    ok(cal.jan4 === false && cal.jan5 === false && cal.jan6 === true, "Jan 4–5 are teacher days, Jan 6 the first day back: " + JSON.stringify(cal));
    ok(cal.seed === "2027-01-04,2027-01-05,2027-01-18,2027-02-15", "the seed's days off: " + cal.seed);
    // one bulb at a time: from Jan 6 to the take-down no school day drops two
    const steps = await page.evaluate(() => { const out = []; let prev = 14;
      for (let d = new Date(2027, 0, 6); d < new Date(2027, 0, 27); d.setDate(d.getDate() + 1)){ const c = window.Deckhand.season.lights.count(new Date(d));
        if (window.Deckhand.bell.isSchoolDay(d)){ out.push(prev - c.lit); prev = c.lit; } else if (c.lit !== prev) out.push("changed on a day off"); }
      return out; });
    ok(steps.length === 14 && steps.every(x => x === 1), "a school day without exactly one bulb going out: " + steps.join());
  });

  test("v7.64: a device copy saved before single days off takes the file's list", async ({ page, dh }) => {
    await dh.openAt("");
    await page.evaluate(() => { const o = JSON.parse(localStorage.getItem("deckhand.config")); delete o.cfg.bell.skipDays; localStorage.setItem("deckhand.config", JSON.stringify(o)); });
    await dh.reopen("");
    ok((await page.evaluate(() => window.Deckhand.config.bell.skipDays.join())) === "2027-01-04,2027-01-05,2027-01-18,2027-02-15", "the file's days off were not taken");
  });

  test("v7.64: nothing winter before Nov 30; on Nov 30 November clears and the string goes up dark; Dec 18 all 14 lit, none under the greeting or the controls; Jan 27 it comes down", async ({ page, dh }) => {
    for (const d of ["2026-10-20", "2026-11-20", "2026-11-27"]){
      await dh.openAt("#t=" + d + "T10:30");
      await dh.launch();
      ok(!(await has(page, "winter")) && !(await shown(page, "#wnLights")) && !(await page.evaluate(() => document.querySelectorAll("#wnLights .wnBulb").length)), "winter showed on " + d);
      ok((await page.evaluate(() => window.Deckhand.season.active())) !== "winter", "active() is winter on " + d);
    }
    await dh.openAt("#t=2026-11-30T10:30");
    await dh.launch();
    ok((await has(page, "winter")) && !(await has(page, "november")), "Nov 30 is not winter's first day");
    ok(await shown(page, "#wnLights"), "no string on Nov 30");
    ok((await page.evaluate(() => [document.querySelectorAll("#wnLights .wnBulb").length, document.querySelectorAll("#wnLights .wnBulb.on").length].join())) === "14,0", "Nov 30: 14 dark bulbs");
    await dh.openAt("#t=2026-12-18T10:30");
    await dh.launch();
    ok((await page.evaluate(() => document.querySelectorAll("#wnLights .wnBulb.on").length)) === 14, "Dec 18: all 14 lit");
    // every bulb clear of the face's lines
    ok(await page.evaluate(() => { const f = document.getElementById("dateline").getBoundingClientRect();
      return [...document.querySelectorAll("#wnLights .wnBulb .wnDark")].every(b => b.getBoundingClientRect().bottom < f.top - 8); }), "a bulb over the date line");
    // no bulb under the greeting pill (its slot, shown or not) or the card's corner controls
    const clash = await page.evaluate(() => { const t = document.getElementById("greetToast"); t.hidden = false; t.textContent = "Good morning, Mr. Shaffer · Black Week · tap anywhere for sound";
      const tr = t.getBoundingClientRect(), ctl = [...document.querySelectorAll("#clockWidget .strip button, #clockWidget .wSize, #fsBtn")].map(b => b.getBoundingClientRect()).filter(r => r.width > 0);
      const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return [...document.querySelectorAll("#wnLights .wnBulb .wnDark")].map(b => b.getBoundingClientRect()).filter(b => hit(b, tr) || ctl.some(c => hit(b, c))).length; });
    ok(clash === 0, clash + " bulbs under the greeting or the controls");
    // the stage takes them
    await page.click("#clockWidget .wFocus");
    ok(!(await shown(page, "#wnLights")), "the lights on the stage");
    await dh.openAt("#t=2027-01-26T10:30");
    await dh.launch();
    ok((await shown(page, "#wnLights")) && (await page.evaluate(() => document.querySelectorAll("#wnLights .wnBulb.on").length)) === 0, "Jan 26: the string up, all dark");
    await dh.openAt("#t=2027-01-27T10:30");
    await dh.launch();
    ok((await has(page, "winter")) && !(await shown(page, "#wnLights")), "the string is still up on Jan 27");
  });
});
