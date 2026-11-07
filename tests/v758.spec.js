/* v7.58 — November 2.0 (Croix: "Now let's shore up the autumn/fall theming. The leaves are
 * great, but there's not much else."). docs/reviews/november-2.0-design.md is the spec: a bare
 * branch in the clock card's corner whose leaves let go and become the falling leaves; a
 * scarecrow among cornstalks with a crow and a hay bale, and a squirrel, on the sand; the gull's
 * scarf from the 15th; five November acts for the sea's director (fog, ducks, a loon, a trawler,
 * a campfire on the beach); Veterans Day's flag; feast week's turkey and the feast on the lunch
 * tray; windy days doubling the leaves; a November side on the tape. October's rules: edges
 * only, never on the stage, the landing page or a phone, still under reduced motion, and
 * Seasonal touches → Off takes all of it. */
const { test, expect, ok } = require("./helpers");

const motionOn = page => page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });
const has = (page, c) => page.evaluate(c => document.body.classList.contains(c), c);
const shown = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden"; }, sel);
const box = (page, sel) => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }, sel);
const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

test.describe("v7.58 November 2.0", () => {
  test("v7.58: the bare branch — in the clock card's corner in November only, five leaves on it, off a live settle-in and the stage", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-10T10:30");
    await dh.launch();
    ok(await shown(page, "#nvBranch"), "no branch in November");
    ok(await page.evaluate(() => !!document.querySelector(".w-clock #nvBranch")), "the branch is not in the clock card");
    ok((await page.evaluate(() => document.querySelectorAll("#nvBranch .nvHang").length)) === 5, "five leaves should hang on it");
    ok((await page.evaluate(() => window.Deckhand.season.branch.hanging())) === 5, "hanging() should count five");
    const br = await box(page, "#nvBranch"), card = await box(page, "#clockWidget");
    ok(Math.abs(br.r - card.r) < 2 && br.t - card.t < 40, "the branch is not in the card's top-right corner: " + JSON.stringify([br, card]));
    for (const sel of ["#clock", "#dateline"]) ok(!hit(br, await box(page, sel)), "the branch over " + sel);
    // a live settle-in card wears no branch (the web's rule)
    await page.evaluate(() => document.getElementById("clockWidget").classList.add("stLive"));
    ok(!(await shown(page, "#nvBranch")), "the branch on a live settle-in");
    await page.evaluate(() => document.getElementById("clockWidget").classList.remove("stLive"));
    // the stage
    await dh.addTimer();
    await page.click(".w-timer .wFocus");
    ok(await has(page, "focusMode"), "the timer did not take the stage");
    ok(!(await shown(page, "#nvBranch")), "the branch on the stage");
    // October keeps its web; the branch is November's
    await dh.openAt("#t=2026-10-20T10:30");
    await dh.launch();
    ok(!(await shown(page, "#nvBranch")), "a branch in October");
    ok(await shown(page, "#ocWeb"), "October lost its web");
  });

  test("v7.58: a gust — a leaf lets go and falls from where it hung (the outer column), the branch is one short, and it regrows", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-10T10:30");
    await dh.launch();
    await motionOn(page);
    await page.evaluate(() => window.Deckhand.seaModule.setWeather("calm"));
    const W = await page.evaluate(() => innerWidth);
    const before = await page.evaluate(() => ({ n: window.Deckhand.season.branch.hanging(), leaves: window.Deckhand.season.leaves.count() }));
    const let_ = await page.evaluate(() => window.Deckhand.season.branch.gust());
    ok(let_ >= 1 && let_ <= 2, "a gust should shake one or two loose: " + let_);
    ok(await page.evaluate(() => document.getElementById("nvBranch").classList.contains("gust")), "the limb did not sway in the gust");
    await expect.poll(() => page.evaluate(() => window.Deckhand.season.branch.hanging()), { timeout: 3000 }).toBe(before.n - let_);
    const fell = await page.evaluate(() => [...document.querySelectorAll("#nvLeaves .nvLeaf:not(.nvRest):not(.nvGone)")].map(e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top }; }));
    ok(fell.length >= before.leaves + let_, "no falling leaf took over: " + JSON.stringify(fell));
    ok(fell.some(f => f.t < 360), "no leaf started up at the branch: " + JSON.stringify(fell));
    for (const f of fell) ok(f.l > W * .82, "a leaf from the branch left the outer column: " + JSON.stringify(f));
    // three to five minutes later (the board's clock) the branch has its leaves back
    await page.evaluate(() => window.Deckhand.shiftClock(6 * 60000));
    await expect.poll(() => page.evaluate(() => window.Deckhand.season.branch.hanging()), { timeout: 4000 }).toBe(5);
    // the branch's clock: three an hour from 7 to 5, two more an hour that only a windy day keeps — pure
    const t = await page.evaluate(() => { const B = window.Deckhand.season.branch, a = B.times("2026-11-10"), b = B.times("2026-11-10");
      return { n: a.length, windy: a.filter(x => x.windy).length, same: JSON.stringify(a) === JSON.stringify(b), lo: a[0].m, hi: a[a.length - 1].m,
               other: JSON.stringify(B.times("2026-11-11")) !== JSON.stringify(a) }; });
    ok(t.n === 50 && t.windy === 20 && t.same && t.other && t.lo >= 7 * 60 && t.hi < 17 * 60, "branchTimes: " + JSON.stringify(t));
  });

  test("v7.58: the beach — scarecrow, hay bale and squirrel on the sand in November, clear of the clock, the strip and the dock; never on the stage, the landing page or a phone", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-10T10:30");
    await dh.launch();
    for (const sel of ["#nvScarecrow", "#nvScarecrow .scBale", "#nvScarecrow .scCrow", "#nvSquirrel"]) ok(await shown(page, sel), sel + " hidden in November");
    ok(!(await shown(page, "#nvTurkey")), "a turkey before feast week");
    const sc = await box(page, "#nvScarecrow"), sq = await box(page, "#nvSquirrel"), H = await page.evaluate(() => innerHeight);
    for (const sel of ["#clock", "#dayStrip", "#bathPill", "#dock", "#boat"]){
      const b = await box(page, sel);
      if (b.r - b.l < 1) continue;   // (not on the board right now)
      ok(!hit(sc, b), "the scarecrow over " + sel + ": " + JSON.stringify([sc, b]));
      ok(!hit(sq, b), "the squirrel over " + sel);
    }
    ok(sc.b > H - 60 && sq.b > H - 60, "the beach pieces should stand on the sand: " + JSON.stringify([sc, sq]));
    // the edges only: the scarecrow group stands at the right edge (October's pumpkins' region),
    // the squirrel to its left — nothing under the clock column
    const W = await page.evaluate(() => innerWidth), clk = await box(page, "#clock");
    ok(sc.l > clk.r && W - sc.r < W * .05 && sc.l > W * .8, "the scarecrow should stand at the right edge: " + JSON.stringify(sc));
    ok(H - sc.t < 34 + 180, "the scarecrow stands taller than the gourds did: " + (H - sc.t));
    ok(sq.r <= sc.l && sq.l > clk.r, "the squirrel should sit left of the scarecrow, clear of the clock: " + JSON.stringify([sq, sc]));
    ok((await page.evaluate(() => getComputedStyle(document.getElementById("nvScarecrow")).pointerEvents)) === "none", "the scarecrow's box takes taps; only the figure should");
    // a short screen (1366 × 768): smaller, still there, under the card's bottom-right corner, clear of its text
    await page.setViewportSize({ width: 1366, height: 768 });
    ok(await shown(page, "#nvScarecrow"), "no scarecrow at 1366×768");
    const s2 = await box(page, "#nvScarecrow");
    for (const sel of ["#bathPill", "#dayStrip", "#clock"]) ok(!hit(s2, await box(page, sel)), "1366×768: the scarecrow over " + sel);
    ok(s2.r <= 1366 && s2.b <= 768 && s2.t > 768 - 160, "1366×768: the scarecrow does not fit the corner: " + JSON.stringify(s2));
    await page.setViewportSize({ width: 1920, height: 1080 });
    // October: none of it
    await dh.openAt("#t=2026-10-20T10:30");
    await dh.launch();
    ok(!(await shown(page, "#nvScarecrow")) && !(await shown(page, "#nvSquirrel")), "November's beach in October");
    // the landing page
    await dh.openAt("#t=2026-11-10T10:30");
    await dh.launch();
    await dh.home();
    ok(!(await shown(page, "#nvScarecrow")) && !(await shown(page, "#nvSquirrel")), "the beach on the landing page");
    await dh.launch();
    // the stage
    await dh.addTimer();
    await page.click(".w-timer .wFocus");
    ok(!(await shown(page, "#nvScarecrow")) && !(await shown(page, "#nvSquirrel")), "the beach on the stage");
    // a phone
    await dh.openAt("#t=2026-11-18T10:30");
    await page.setViewportSize({ width: 380, height: 800 });
    for (const sel of ["#nvScarecrow", "#nvSquirrel", "#nvTurkey", "#nvBranch"]) ok(!(await shown(page, sel)), sel + " on a phone");
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("v7.58: taps — the squirrel digs, the crow flaps off and comes back, the turkey fans its tail (small, and nothing that matters)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-18T10:30");
    await dh.launch();
    await motionOn(page);
    const sq = page.locator("#nvSquirrel");
    await page.locator("#nvSquirrel .sqTap").dispatchEvent("pointerdown");
    await expect(sq).toHaveClass(/dig/);
    ok((await page.evaluate(() => document.querySelector("#nvSquirrel .sqBody").getAnimations().length)) > 0, "the dig does not move");
    ok(!(await page.evaluate(() => window.Deckhand.season.squirrel.dig())), "a second dig while digging");
    await expect(sq).not.toHaveClass(/dig/, { timeout: 6000 });
    // the scheduled dig scampers to its spot first (three hops), facing where it goes
    ok(await page.evaluate(() => window.Deckhand.season.squirrel.dig(-24)), "a scheduled dig refused");
    await expect(sq).toHaveClass(/run/);
    ok((await sq.getAttribute("data-face")) === "left", "the squirrel should face the way it runs");
    await expect(sq).toHaveClass(/dig/, { timeout: 3000 });
    const sched = await page.evaluate(() => { const S = window.Deckhand.season.squirrel, a = S.times("2026-11-18");
      return { n: a.length, same: JSON.stringify(a) === JSON.stringify(S.times("2026-11-18")), gaps: a.slice(1).every((x, i) => x.m - a[i].m >= 4 && x.m - a[i].m <= 9) }; });
    ok(sched.n > 50 && sched.same && sched.gaps, "the squirrel's clock (every 4–9 minutes, pure): " + JSON.stringify(sched));
    // the crow
    await page.locator("#nvScarecrow .scTap").dispatchEvent("pointerdown");
    await expect(page.locator("#nvScarecrow")).toHaveClass(/flap/);
    ok((await page.evaluate(() => document.querySelector("#nvScarecrow .scCrow").getAnimations().length)) > 0, "the crow does not fly");
    // the turkey (feast week)
    ok(await shown(page, "#nvTurkey"), "no turkey in feast week");
    await page.locator("#nvTurkey .tkTap").dispatchEvent("pointerdown");
    await expect(page.locator("#nvTurkey")).toHaveClass(/fan/);
    await expect(page.locator("#nvTurkey")).not.toHaveClass(/fan/, { timeout: 4000 });
    ok(await page.evaluate(() => window.Deckhand.season.turkey.tap()), "turkey.tap() refused");
  });

  test("v7.58: the gull's scarf from the 15th; Veterans Day's flag on the 11th (or its observed weekday); the turkey in feast week only", async ({ page, dh }) => {
    const scarf = () => page.evaluate(() => getComputedStyle(document.querySelector("#boat .nvScarf")).display !== "none");
    const flag = () => page.evaluate(() => getComputedStyle(document.querySelector("#boat .nvFlag")).display !== "none");
    await dh.openAt("#t=2026-11-14T10:30");
    await dh.launch();
    ok(!(await scarf()), "a scarf on the 14th");
    await dh.openAt("#t=2026-11-15T10:30");
    await dh.launch();
    ok(await scarf(), "no scarf on the 15th");
    const v = await page.evaluate(() => { const S = window.Deckhand.season;
      return [[2026, 11], [2026, 12], [2026, 10], [2023, 10], [2023, 11], [2029, 12], [2029, 11]].map(([y, d]) => S.veteransDay(new Date(y, 10, d, 10))).join(); });
    ok(v === "true,false,false,true,false,true,false", "veteransDay (2026 Wed 11th · 2023 Sat → Fri 10th · 2029 Sun → Mon 12th): " + v);
    await dh.openAt("#t=2026-11-11T10:30");
    await dh.launch();
    ok(await has(page, "nvVets") && await flag(), "no flag on Veterans Day");
    ok(await page.evaluate(() => getComputedStyle(document.querySelector("#boat .nvLantern")).display !== "none"), "the flag replaced the lantern; it hangs below it");
    await dh.openAt("#t=2026-11-12T10:30");
    await dh.launch();
    ok(!(await flag()), "a flag on the 12th");
    const fw = await page.evaluate(() => { const S = window.Deckhand.season;
      return [15, 16, 18, 20, 21, 23, 26].map(d => S.feastWeek(new Date(2026, 10, d, 10))).join() + "|" + [19, 20, 23].map(d => S.feastDay(new Date(2026, 10, d, 10))).join(); });
    ok(fw === "false,true,true,true,false,false,false|false,true,false", "feastWeek / feastDay: " + fw);
    await dh.openAt("#t=2026-11-18T10:30");
    await dh.launch();
    ok(await shown(page, "#nvTurkey"), "no turkey on the 18th");
    const tk = await box(page, "#nvTurkey"), sq18 = await box(page, "#nvSquirrel"), sc18 = await box(page, "#nvScarecrow"), W18 = await page.evaluate(() => innerWidth);
    ok(tk.r <= sq18.l && sq18.r <= sc18.l && W18 - tk.r >= W18 * .2, "the turkey's band (left of the squirrel, left of the scarecrow): " + JSON.stringify([tk, sq18, sc18]));
    ok(await page.evaluate(() => typeof window.Deckhand.season.thanksgivingWeek === "function" && !window.Deckhand.season.thanksgivingWeek(new Date(2026, 10, 18))), "thanksgivingWeek changed");
    await dh.openAt("#t=2026-11-23T10:30");
    await dh.launch();
    ok(!(await shown(page, "#nvTurkey")), "a turkey on the 23rd (the break)");
    // Thanksgiving week: the squirrel keeps to the left of the gourd bowl
    const g = await box(page, "#nvGourds"), s = await box(page, "#nvSquirrel");
    ok(s.r <= g.l, "the squirrel sits in the gourd bowl: " + JSON.stringify([s, g]));
    // the bowl sits in FRONT of the scarecrow, overlapping its left stalks a little
    const sc = await box(page, "#nvScarecrow");
    ok(g.r > sc.l && g.r < sc.l + (sc.r - sc.l) * .5, "the bowl should overlap the scarecrow's left side a little: " + JSON.stringify([g, sc]));
    const z = await page.evaluate(() => [+getComputedStyle(document.getElementById("nvGourds")).zIndex, +getComputedStyle(document.getElementById("nvScarecrow")).zIndex]);
    ok(z[0] > z[1], "the bowl is not in front of the scarecrow: " + z);
  });

  test("v7.58: the feast — the Friday before the break, the tray's slice is a whole pie and the cider has a second mug", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-20T12:55");
    await dh.launch();
    await expect(page.locator("#periodNow")).toHaveText("Lunch");
    ok(await has(page, "nvFeastDay"), "the 20th is not the feast");
    await expect(page.locator("#lunchArt .lPieWhole")).toBeVisible();
    await expect(page.locator("#lunchArt .lMug2")).toBeVisible();
    await expect(page.locator("#lunchArt .lPie")).toBeHidden();
    // the bites still come out of it
    await page.locator("#lunchArt .lCookie").evaluate(e => { e.dataset.bites = "2"; });
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll("#lunchArt .lPieWhole .lBite")].map(b => getComputedStyle(b).opacity).join()), { timeout: 1000 }).toBe("1,1,0");
    await dh.openAt("#t=2026-11-19T12:55");
    await dh.launch();
    ok(!(await has(page, "nvFeastDay")), "the 19th is the feast");
    ok((await page.evaluate(() => getComputedStyle(document.querySelector("#lunchArt .lPieWhole")).display)) === "none", "a whole pie on the 19th");
  });

  test("v7.58: the sea's November acts — each mounts when forced, fog only in the morning, the campfire only in the afternoon, none in October", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-18T13:30");
    await dh.launch();
    await motionOn(page);
    for (const n of ["ducks", "loon", "trawler", "campfire"]){
      const r = await page.evaluate(n => { const p = window.Deckhand.sea(n), el = document.getElementById("sea-" + n);
        return { p, go: el.classList.contains("go"), vis: getComputedStyle(el).visibility, anims: el.getAnimations({ subtree: true }).length }; }, n);
      ok(r.p && r.go && r.vis === "visible" && r.anims > 0, n + " did not play: " + JSON.stringify(r));
      await page.evaluate(() => window.Deckhand.seaModule.clear());
    }
    // the boat's parts: the gull looks at the ducks; the trawler's wake; the fog's lantern
    await page.evaluate(() => window.Deckhand.sea("ducks"));
    await expect(page.locator("#boat")).toHaveClass(/ducks/);
    await page.evaluate(() => window.Deckhand.seaModule.clear());
    ok(!(await page.evaluate(() => /ducks|trawl|fogged/.test(document.getElementById("boat").className))), "clear() left the boat wearing an act");
    ok(!(await page.evaluate(() => window.Deckhand.sea("fog"))), "fog played in the afternoon");
    // the campfire on the sand right of the dock, clear of the clock, the scarecrow and the turkey
    await page.evaluate(() => window.Deckhand.sea("campfire"));
    const cf = await box(page, "#sea-campfire svg"), sc = await box(page, "#nvScarecrow");
    ok(cf.l >= (await box(page, "#dock")).r && cf.r < sc.l && !hit(cf, await box(page, "#clock")) && !hit(cf, await box(page, "#nvTurkey")), "the campfire's place: " + JSON.stringify([cf, sc]));
    ok(await page.evaluate(() => window.Deckhand.sea("ducks")), "the campfire held the water (a beach act should not)");
    await page.evaluate(() => window.Deckhand.seaModule.clear());
    await dh.openAt("#t=2026-11-10T08:10");
    await dh.launch();
    await motionOn(page);
    ok(!(await page.evaluate(() => window.Deckhand.sea("campfire"))), "a campfire in the morning");
    ok(await page.evaluate(() => window.Deckhand.sea("fog")), "fog refused in the morning");
    await expect(page.locator("#sea-fog")).toHaveClass(/go/);
    await expect(page.locator("#boat")).toHaveClass(/fogged/);
    ok((await page.evaluate(() => getComputedStyle(document.getElementById("boat")).getPropertyValue("--lamp").trim())) === "1", "the lantern does not burn full in the fog");
    await page.evaluate(() => window.Deckhand.seaModule.clear());
    await dh.openAt("#t=2026-10-20T13:30");
    await dh.launch();
    await motionOn(page);
    for (const n of ["fog", "ducks", "loon", "trawler", "campfire"]) ok(!(await page.evaluate(n => window.Deckhand.sea(n), n)), n + " played in October");
  });

  test("v7.58: the director casts the November acts in November only — two a period at most, the trawler in a last third, the campfire only for an afternoon period; fog on its own morning clock", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-10T10:30");
    const NOV = new Set(["ducks", "loon", "trawler", "campfire"]);
    const M = await page.evaluate(() => {
      const S = window.Deckhand.seaModule, out = { oct: new Set(), nov: new Set(), am: new Set(), caps: [], trawlEarly: [], fogNov: 0, fogWeekend: 0, fogOct: 0, fogInPlan: 0 };
      for (let d = 1; d <= 30; d++){
        const o = "2026-10-" + String(d).padStart(2, "0"), n = "2026-11-" + String(d).padStart(2, "0"), wd = new Date(2026, 10, d).getDay();
        for (let p = 0; p < 7; p++){
          S.plan(o, p, 53, 1 + (d % 5), null, 13 * 60).events.forEach(e => out.oct.add(e.act));
          const pm = S.plan(n, p, 53, 1 + (d % 5), null, 13 * 60);
          pm.events.forEach(e => out.nov.add(e.act));
          out.caps.push(pm.events.slice(1).filter(e => ["ducks", "loon", "trawler", "campfire"].includes(e.act)).length);
          pm.events.forEach(e => { if (e.act === "trawler" && e.at <= 53 * 60000 * 2 / 3) out.trawlEarly.push(n + " p" + p); if (e.act === "fog") out.fogInPlan++; });
          S.plan(n, p, 53, 1 + (d % 5), null, 8 * 60).events.forEach(e => out.am.add(e.act));
        }
        if (S.fogMorning(n)) { out.fogNov++; if (wd === 0 || wd === 6) out.fogWeekend++; }
        if (S.fogMorning(o)) out.fogOct++;
      }
      out.same = S.fogMorning("2026-11-10") === S.fogMorning("2026-11-10");
      out.oct = [...out.oct]; out.nov = [...out.nov]; out.am = [...out.am];
      out.w = [S.novemberWeight("2026-11-10").w, S.novemberWeight("2026-10-10").w, S.novemberWeight("2026-11-10").cap];
      return out;
    });
    for (const a of NOV){
      ok(M.nov.includes(a), "November plans never cast " + a + ": " + M.nov.join());
      ok(!M.oct.includes(a), "October plans cast " + a);
    }
    ok(!M.am.includes("campfire"), "a morning period planned a campfire");
    ok(M.caps.every(n => n <= 2), "more than two November acts in a period: " + Math.max(...M.caps));
    ok(M.trawlEarly.length === 0, "a trawler before a last third: " + M.trawlEarly.join());
    ok(M.fogInPlan === 0, "the fog in a setlist (it keeps its own clock)");
    ok(M.fogNov >= 4 && M.fogNov <= 16 && M.fogWeekend === 0 && M.fogOct === 0 && M.same, "fogMorning: " + JSON.stringify({ nov: M.fogNov, wkend: M.fogWeekend, oct: M.fogOct }));
    ok(M.w.join() === "1,0,2", "novemberWeight: " + M.w.join());
  });

  test("v7.58: windy days double the leaves (a cap of ten); the tape's November side; Seasonal touches Off takes all of November 2.0", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-18T10:30");
    await dh.launch();
    await motionOn(page);
    await page.evaluate(() => window.Deckhand.seaModule.setWeather("windy"));
    ok((await page.evaluate(() => window.Deckhand.season.leaves.cap())) === 10, "windy: the cap should be ten");
    await page.evaluate(() => { for (let i = 0; i < 14; i++) window.Deckhand.season._leaf({ at: .5 }); });
    ok((await page.evaluate(() => window.Deckhand.season.leaves.count())) === 10, "windy: not ten leaves");
    await page.evaluate(() => window.Deckhand.seaModule.setWeather("calm"));
    ok((await page.evaluate(() => window.Deckhand.season.leaves.cap())) === 6, "calm: the cap should be six");
    // the tape
    await dh.addW("addMusicBtn");
    const sides = await page.evaluate(() => window.Deckhand.lofiSides());
    ok(sides.includes("Harvest moon") && !sides.includes("Graveyard shift"), "November's tape: " + sides.join("|"));
    const nov = await page.evaluate(() => window.Deckhand.lofi.NOV);
    ok(nov.bpm >= 58 && nov.bpm <= 66 && !nov.minor && nov.keys === "rhodes" && nov.drums === "brushes" && nov.prog.some(c => c[0] === 5 && /^m/.test(c[1])), "Harvest moon's recipe: " + JSON.stringify(nov));
    // Off
    await page.evaluate(() => { window.Deckhand.config.ui.season = "off"; window.Deckhand.season.apply(); });
    for (const c of ["november", "nvKnit", "nvFeast", "nvVets", "nvFeastDay"]) ok(!(await has(page, c)), "Off left " + c);
    for (const sel of ["#nvBranch", "#nvScarecrow", "#nvSquirrel", "#nvTurkey", "#boat .nvScarf", "#boat .nvFlag"]) ok(!(await shown(page, sel)), "Off left " + sel);
    for (const n of ["fog", "ducks", "loon", "trawler", "campfire"]) ok(!(await page.evaluate(n => window.Deckhand.sea(n), n)), "Off: " + n + " played");
    ok((await page.evaluate(() => window.Deckhand.season.branch.gust())) === 0, "Off: the branch still gusts");
    ok(!(await page.evaluate(() => window.Deckhand.season.squirrel.dig())), "Off: the squirrel still digs");
    ok((await page.evaluate(() => window.Deckhand.lofiSides())).every(n => n !== "Harvest moon"), "Off kept November's side");
    // October's tape never had it
    await dh.openAt("#t=2026-10-20T10:30");
    await dh.launch();
    await dh.addW("addMusicBtn");
    ok(!(await page.evaluate(() => window.Deckhand.lofiSides())).includes("Harvest moon"), "Harvest moon in October");
  });

  test("v7.58: reduced motion — the branch keeps its leaves, nothing on the beach moves, no gust, no dig", async ({ page, dh }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await dh.openAt("#t=2026-11-18T10:30");
    await dh.launch();
    ok(!(await has(page, "waveMotion")), "waveMotion on under reduced motion");
    const anims = await page.evaluate(() => ["#nvBranch", "#nvScarecrow", "#nvSquirrel", "#nvTurkey", "#boat .nvScarf", "#sea-campfire"]
      .map(s => s + ":" + document.querySelector(s).getAnimations({ subtree: true }).length).join());
    ok(!/:[1-9]/.test(anims), "something moves under reduced motion: " + anims);
    ok((await page.evaluate(() => window.Deckhand.season.branch.gust())) === 0, "a gust under reduced motion");
    ok((await page.evaluate(() => window.Deckhand.season.branch.hanging())) === 5, "the branch lost a leaf under reduced motion");
    ok(!(await page.evaluate(() => window.Deckhand.season.squirrel.dig())), "a dig under reduced motion");
    ok(!(await page.evaluate(() => window.Deckhand.season.scarecrow.crow())), "the crow flew under reduced motion");
    ok(await shown(page, "#nvScarecrow") && await shown(page, "#nvSquirrel") && await shown(page, "#nvTurkey"), "the beach should stay, still, under reduced motion");
  });
});
