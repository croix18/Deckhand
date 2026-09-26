/* Config migrations, sanitize hardening, corrupted-block fallback,
 * autosave-vs-records, and the download round trip.
 *
 * Ported from the tail of test_deckhand_v6.js (old lines 4184-4602) plus
 * three v7.0 regression tests. Every fixture test opens its own copy of
 * the app through dh.loadFixture (a NEW page), so the stored()/flush()
 * helpers below take that page explicitly.
 */
const { test, expect, ok } = require("./helpers");
const path = require("path");
const fs = require("fs");

/* ---------- shared fixture builders (old lines 2554-2575) ---------- */
const BLK = [{ label: "1st", start: "9:20", end: "10:15" }];
const v1cfg = enabled => JSON.stringify({
  schemaVersion: 1, appVersion: "3.0.0",
  sound: { enabled: true, volume: 0.25 },
  timer: { presetsMinutes: [1, 3, 5, 10], defaultSeconds: 300 },
  bell: {
    enabled, nudgeSeconds: 30, showProgressBar: true,
    anchorMonday: "2026-08-10", anchorWeekType: "blue",
    templates: {
      blueReg: { label: "Blue Week", blocks: BLK },
      blueWed: { label: "Blue Week", blocks: BLK },
      blackReg: { label: "Black Week", blocks: BLK },
      blackWed: { label: "Black Week", blocks: BLK }
    }
  }
}, null, 2);
const v2cfg = (schedules, def) => JSON.stringify({
  schemaVersion: 2, appVersion: "4.0.0", ownerName: "Mr. Shaffer",
  sound: { enabled: true, volume: 0.25 },
  timer: { presetsMinutes: [1, 3, 5, 10], defaultSeconds: 300 },
  bell: { nudgeSeconds: 0, showProgressBar: true, defaultSchedule: def, schedules }
}, null, 2);

/* a quiet schema-4 tail shared by the inline fixtures */
const TAIL = {
  sound: { enabled: true, volume: 0.25 },
  clock: { showSeconds: false },
  timer: { presetsMinutes: [1, 3, 5, 10], defaultSeconds: 300, style: "ring" },
  bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none",
          autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
          groups: [] }
};

/* local helpers: the fixture page's own store / flush (dh.* act on the main page) */
const storedOn = pg => pg.evaluate(() => {
  try { return JSON.parse(localStorage.getItem("deckhand.config")); } catch (e) { return null; }
});
const flushOn = pg => pg.evaluate(() => window.Deckhand.flush());
const cfgOn = pg => pg.evaluate(() => window.Deckhand.config);
const launchOn = async pg => {
  await pg.click("#launchBtn");
  await expect(pg.locator("main#canvas")).toBeVisible();
};

test.describe("migrations", () => {
  test("v1 config migrates 1->2->3->4: paired groups, nudge kept, enabled honored", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_mig1.html", v1cfg(true));
    let c = await cfgOn(pg);
    ok(c.schemaVersion === 4 && c.bell.groups.length === 2, "groups: " + c.bell.groups.length);
    ok(c.scenes.length === 1 && c.scenes[0].name === "Daily Board" &&
       c.scenes[0].widgets.length === 2, "scenes not defaulted");
    ok(c.bell.groups[0].name === "Blue Week" && c.bell.groups[0].wednesday.length === 1,
      "pairing: " + JSON.stringify(c.bell.groups[0].name));
    ok(c.bell.nudgeSeconds === 30, "nudge: " + c.bell.nudgeSeconds);
    ok(c.bell.defaultGroup === "Blue Week", "default: " + c.bell.defaultGroup);
    await pg.close();
    const pg2 = await dh.loadFixture("tmp_mig1off.html", v1cfg(false));
    c = await cfgOn(pg2);
    ok(c.bell.defaultGroup === "none", "disabled resurrected: " + c.bell.defaultGroup);
    await pg2.close();
  });

  test("v2: 4 unpaired schedules keep all 4 groups + default", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_mig4.html", v2cfg([
      { name: "Blue", blocks: BLK }, { name: "Black", blocks: BLK },
      { name: "Assembly", blocks: BLK }, { name: "Finals", blocks: BLK }
    ], "Finals"));
    const c = await cfgOn(pg);
    ok(c.bell.groups.length === 4, "groups: " + c.bell.groups.length);
    ok(c.bell.defaultGroup === "Finals", "default: " + c.bell.defaultGroup);
    await pg.close();
  });

  test('v2: unpaired "Lab Wednesday" default maps to itself; dup names deduped', async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_miglab.html", v2cfg([
      { name: "Blue Regular", blocks: BLK }, { name: "Blue Wednesday", blocks: BLK },
      { name: "Lab Wednesday", blocks: BLK }
    ], "Lab Wednesday"));
    const c = await cfgOn(pg);
    ok(c.bell.defaultGroup === "Lab Wednesday", "default: " + c.bell.defaultGroup);
    await pg.close();
    const pg2 = await dh.loadFixture("tmp_migdup.html", v2cfg([
      { name: "Blue Regular", blocks: BLK }, { name: "Blue Week", blocks: BLK }
    ], "none"));
    const names = await pg2.evaluate(() => window.Deckhand.config.bell.groups.map(g => g.name));
    ok(new Set(names).size === names.length, "dupes: " + names.join("|"));
    await launchOn(pg2);
    await pg2.click("#setBtn");
    await pg2.click("#applyBtn");
    await expect(pg2.locator("#setErrors")).toHaveText("Applied.");
    await pg2.close();
  });

  test("v3 config migrates to 4: scenes defaulted, bells and prefs kept", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_mig3.html", JSON.stringify({
      schemaVersion: 3, appVersion: "5.3.3", ownerName: "Mr. Shaffer",
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: true },
      timer: { presetsMinutes: [2, 4], defaultSeconds: 240, style: "tide" },
      bell: { nudgeSeconds: 120, showProgressBar: true, defaultGroup: "Teal Week",
              autoWeek: true, anchorMonday: "2026-08-31", anchorWeekName: "Black Week",
              groups: [ { name: "Teal Week", regular: BLK, wednesday: BLK },
                        { name: "Black Week", regular: BLK, wednesday: BLK } ] }
    }));
    const c = await cfgOn(pg);
    ok(c.schemaVersion === 4, "schema: " + c.schemaVersion);
    ok(c.scenes.length === 1 && c.scenes[0].name === "Daily Board" &&
       c.scenes[0].widgets.length === 2, "scenes: " + JSON.stringify(c.scenes));
    ok(c.activeScene === "Daily Board" && c.ui.locked === false, "ui defaults");
    ok(c.bell.groups.length === 2 && c.bell.autoWeek === true &&
       c.bell.nudgeSeconds === 120, "bell lost");
    ok(c.timer.style === "tide" && c.clock.showSeconds === true, "prefs lost");
    await launchOn(pg);
    await expect(pg.locator(".w-settle")).toHaveCount(1);
    await pg.close();
  });
});

test.describe("saved scenes and pins", () => {
  test("saved clockless scene reopens with NO ghost clock", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_noclock.html", JSON.stringify(Object.assign({
      schemaVersion: 4, appVersion: "6.0.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Timers Only",
      scenes: [{ name: "Timers Only", widgets: [
        { type: "timer", x: 10, y: 10, w: 40, h: 60, label: "Solo" }
      ]}]
    }, TAIL)));
    await launchOn(pg);
    await expect(pg.locator("#clockWidget")).toBeHidden();
    await expect(pg.locator("#canvas .widget:visible")).toHaveCount(1);
    ok(!(await pg.locator("#addClockBtn").isDisabled()), "add-clock disabled");
    await pg.click("#addBtn");
    await pg.click("#addClockBtn");            // clock can be brought back and managed
    await expect(pg.locator("#clockWidget")).toBeVisible();
    await pg.click("#clockWidget .wClose");
    await expect(pg.locator("#clockWidget")).toBeHidden();
    await pg.close();
  });

  test("pin: saved pin reloads pressed + stacked on top; junk pin values sanitized", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_pin.html", JSON.stringify(Object.assign({
      schemaVersion: 4, appVersion: "6.9.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 50, h: 60, pin: "yes please" },
        { type: "timer", x: 5, y: 5, w: 30, h: 40, label: "Solo", pin: true },
        { type: "stopwatch", x: 8, y: 8, w: 30, h: 40, label: "Watch", pin: 0 }
      ]}]
    }, TAIL)));
    const pins = await pg.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.map(w => w.pin));
    ok(JSON.stringify(pins) === JSON.stringify([false, true, false]),
      "pins: " + JSON.stringify(pins));
    await launchOn(pg);
    await expect(pg.locator(".w-timer .wPin")).toHaveAttribute("aria-pressed", "true");
    // pinned timer stacks above the later-mounted, overlapping stopwatch
    // with zero taps — initial stacking must honor the saved pin
    const onTop = await pg.evaluate(() => {
      const b = document.querySelector(".w-timer").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !!el.closest(".w-timer") : false;
    });
    ok(onTop, "saved pin ignored at boot");
    await pg.close();
  });

  test("pin: try-and-undo on a default (scene-less) board leaves the board clean", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_pin_clean.html", JSON.stringify(Object.assign({
      schemaVersion: 4, appVersion: "6.9.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }                      // NO scenes key: DEFAULT_SCENES path
    }, TAIL)));
    await launchOn(pg);
    // v7.0: "dirty" is "differs from the last autosave" and the 2.5s tick
    // can clear it under us — compare config snapshots instead
    const snap = () => pg.evaluate(() => JSON.stringify(window.Deckhand.config));
    const before = await snap();
    await pg.click(".w-settle .wPin");           // pin… (v6.29: default = settle)
    ok((await snap()) !== before, "pin did not change the config");
    await pg.click(".w-settle .wPin");           // …and undo
    ok((await snap()) === before, "pin round trip left a phantom change");
    await pg.close();
  });
});

test.describe("sanitize hardening", () => {
  test("wave-4 config sanitized: junk dates, count clamps, agenda caps", async ({ dh }) => {
    const junkAgenda = [];
    for (let i = 0; i < 20; i++) junkAgenda.push({ text: "Item " + i, done: i === 1 ? "yes" : (i === 2) });
    junkAgenda[5] = { text: "   ", done: true };            // whitespace-only: dropped
    const pg = await dh.loadFixture("tmp_w4.html", JSON.stringify(Object.assign({
      schemaVersion: 4, appVersion: "6.10.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "event", x: 0, y: 0, w: 30, h: 40, label: "Ev",
          title: 12345, when: "next tuesday" },
        { type: "event", x: 32, y: 0, w: 30, h: 40, label: "Ev2",
          title: "Quarter ends", when: "2026-10-16T14:05" },
        { type: "event", x: 64, y: 0, w: 30, h: 40, label: "Ev3",
          title: "Phantom", when: "2026-13-40" },  // shape-valid, calendar-impossible
        { type: "tally", x: 0, y: 42, w: 30, h: 40, label: "Ta",
          items: ["junk", { name: "A", count: 99999 }, { name: "B", count: -4 },
                  { name: "C", count: 7 }] },
        { type: "agenda", x: 32, y: 42, w: 30, h: 40, label: "Ag", items: junkAgenda },
        { type: "agenda", x: 64, y: 42, w: 30, h: 40, label: "AgP",
          perPeriod: true, period: "__proto__",
          // PROTO_KEY placeholder: a real "__proto__" literal would set the
          // prototype of this fixture object instead of being data
          pages: { "PROTO_KEY": [{ text: "evil", done: false }],
                   "2nd": [{ text: "ok", done: true }] } }
      ]}]
    }, TAIL)).replace('"PROTO_KEY"', '"__proto__"'));
    const ws = await pg.evaluate(() => window.Deckhand.config.scenes[0].widgets);
    ok(ws[0].when === "" && ws[0].title === "", "junk event kept: " + JSON.stringify(ws[0]));
    ok(ws[1].when === "2026-10-16T14:05", "good datetime lost");
    ok(ws[2].when === "", "impossible date kept: " + ws[2].when);
    // junk entries filter out BEFORE the 2-counter cap: A and B survive
    ok(ws[3].items.length === 2 && ws[3].items[0].name === "A" &&
       ws[3].items[0].count === 9999 && ws[3].items[1].count === 0,
      "tally clamps: " + JSON.stringify(ws[3].items));
    // junk lines drop BEFORE the 12-item cap: 12 real items survive
    ok(ws[4].items.length === 12 && ws[4].items[1].done === false &&
       ws[4].items[2].done === true &&
       ws[4].items.every(i => i.text.trim()),
      "agenda caps: " + JSON.stringify(ws[4].items.map(i => [i.text, i.done])));
    // __proto__ never survives as a period override or a page key
    ok(ws[5].period === "" &&
       !Object.prototype.hasOwnProperty.call(ws[5].pages, "__proto__") &&
       ws[5].pages["2nd"].length === 1,
      "proto page kept: " + JSON.stringify({ p: ws[5].period, k: Object.keys(ws[5].pages) }));
    ok(await pg.evaluate(() => Object.prototype.text === undefined &&
       !Array.isArray(Object.prototype.items)), "prototype polluted");
    await launchOn(pg);
    await expect(pg.locator(".w-event")).toHaveCount(3);
    await expect(pg.locator(".w-tally .tlCard")).toHaveCount(2);
    await expect(pg.locator(".w-agenda .agItem")).toHaveCount(12);
    await pg.close();
  });

  test("sanitize: geometry stays on-canvas, labels dedupe, bell blocks bounded", async ({ dh }) => {
    const blocks = [];
    for (let i = 0; i < 30; i++){
      blocks.push({ label: "P" + i, start: "9:0" + (i % 10), end: "10:0" + (i % 10) });
    }
    blocks.push({ label: "BadStart", start: "nine am", end: "10:00" });
    blocks.push({ label: "HugeEnd", start: "9:00", end: "x".repeat(100000) });
    const pg = await dh.loadFixture("tmp_hard.html", JSON.stringify(Object.assign({}, TAIL, {
      schemaVersion: 4, appVersion: "6.11.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "timer", x: 95, y: 90, w: 100, h: 100, label: "Timer" },
        { type: "stopwatch", x: 4, y: 4, w: 30, h: 40, label: "Timer" }
      ]}],
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "Teal Week",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
              groups: [{ name: "Teal Week", regular: blocks, wednesday: [] }] }
    })));
    const c = await cfgOn(pg);
    const w0 = c.scenes[0].widgets[0], w1 = c.scenes[0].widgets[1];
    ok(w0.x + w0.w <= 100 && w0.y + w0.h <= 100, "off-canvas geometry kept: " + JSON.stringify(w0));
    ok(w1.label === "Timer 2", "duplicate label kept: " + w1.label);
    ok(c.bell.groups[0].regular.length === 20 &&
       c.bell.groups[0].regular.every(b => /^\d{1,2}:\d{2}$/.test(b.start) &&
                                           /^\d{1,2}:\d{2}$/.test(b.end)),
      "bell blocks unbounded: " + c.bell.groups[0].regular.length);
    await launchOn(pg);
    ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      "board scrolls sideways");
    await pg.close();
  });

  test("roster config sanitized: duplicate periods, junk names, caps", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_ros.html", JSON.stringify(Object.assign({
      schemaVersion: 4, appVersion: "6.2.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 58, h: 100 },
        { type: "picker", x: 61, y: 0, w: 39, h: 100, period: 7, size: "huge" },
        { type: "text", x: 5, y: 5, w: 20, h: 20, text: 12345 },
        { type: "embed", x: 55, y: 5, w: 20, h: 20, perPeriod: "yes", period: 42,
          decks: { "__proto__": "https://evil.example/x", "2nd": "javascript:alert(1)",
                   "3rd": "https://ok.example/deck", "": "https://ok.example/empty" } },
        { type: "score", x: 30, y: 5, w: 20, h: 20, teams: [{ name: 9, score: "x" }, null, { name: "Reds", score: 4.7 }] }
      ]}],
      rosters: [
        { period: "2nd", names: ["Ava", "", "Ben", 5, "  Cai  "] },
        { period: "2nd", names: ["Dupe"] },
        { period: "", names: ["X"] },
        "junk",
        { period: "3rd", names: "oops" }
      ]
    }, TAIL)));
    const c = await cfgOn(pg);
    ok(c.rosters.length === 1, "rosters kept: " + JSON.stringify(c.rosters));
    ok(c.rosters[0].period === "2nd" && c.rosters[0].names.join("|") === "Ava|Ben|Cai",
      "names: " + JSON.stringify(c.rosters[0]));
    const w = c.scenes[0].widgets[1];
    ok(w.type === "picker" && w.period === "" && w.size === undefined,
      "widget fields not scrubbed: " + JSON.stringify(w));
    ok(c.scenes[0].widgets[2].text === "", "junk text kept: " + JSON.stringify(c.scenes[0].widgets[2]));
    const em = c.scenes[0].widgets[3];
    ok(em.type === "embed" && em.perPeriod === false && em.period === "",
      "embed flags not scrubbed: " + JSON.stringify(em));
    ok(Object.keys(em.decks).join("|") === "3rd" && em.decks["3rd"] === "https://ok.example/deck",
      "hostile decks kept: " + JSON.stringify(em.decks));
    ok(Object.getPrototypeOf(em.decks) === Object.prototype &&
       !Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"),
      "prototype touched");
    const sc = c.scenes[0].widgets[4];
    ok(sc.teams.length === 2 && sc.teams[0].name === "Team 1" && sc.teams[0].score === 0 &&
       sc.teams[1].name === "Reds" && sc.teams[1].score === 5,
      "score teams not scrubbed: " + JSON.stringify(sc.teams));
    await launchOn(pg);
    await expect(pg.locator(".w-picker")).toHaveCount(1);
    await pg.close();
  });

  test("hostile config + string schemaVersion + garbage scenes tolerated", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_host.html",
      '{"schemaVersion":"3","ownerName":42,"sound":null,"timer":{"presetsMinutes":"x"},"bell":{"groups":"oops"},' +
      '"ui":7,"activeScene":42,"scenes":[{"widgets":[{"type":"clock","x":-40,"y":"a","w":9000,"h":2},' +
      '{"type":"evil"},{"type":"timer"},"junk"]},null]}');
    ok(/^Good (morning|afternoon|evening)!$/.test((await pg.textContent("#greet")).trim()),
      "greet: " + await pg.textContent("#greet"));
    await launchOn(pg);
    await pg.click("#startBtn");
    await expect(pg.locator("#startBtn")).toHaveText("Pause");
    const c = await cfgOn(pg);
    ok(c.scenes.length === 1 && c.scenes[0].widgets.length === 2, "scene not scrubbed");
    const cl = c.scenes[0].widgets[0];
    ok(cl.type === "clock" && cl.x === 0 && cl.y === 4 && cl.w === 100 && cl.h === 10,
      "clock coords not clamped: " + JSON.stringify(cl));
    await pg.close();
  });
});

test.describe("corrupted config", () => {
  test("corrupted config block: visible banner, defaults load, download refuses", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_bad.html", '{"schemaVersion": 4, THIS IS NOT JSON');
    await expect(pg.locator("#cfgWarn")).toBeVisible();
    ok((await pg.locator("#cfgWarn").textContent()).includes("unchanged"),
      "banner does not reassure about the file on disk");
    const c = await cfgOn(pg);
    ok(c.scenes[0].name === "Daily Board" && c.bell.groups.length === 0, "not on defaults");
    await pg.evaluate(() => document.getElementById("dlBtn").click());
    await expect(pg.locator("#setErrors")).toContainText("Export disabled");
    // the banner is informational: it must never eat taps (it covered the
    // stage-mode focus bar and stranded a touch-only teacher)
    ok(await pg.evaluate(() =>
      getComputedStyle(document.getElementById("cfgWarn")).pointerEvents) === "none",
      "cfgWarn banner intercepts taps");
    await pg.close();
  });

  test("v7.0: unknown schemaVersion shows the corrupt-config banner and export refuses", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_schema9.html", JSON.stringify({ schemaVersion: 9, ownerName: "Mr. Shaffer" }));
    await expect(pg.locator("#cfgWarn")).toBeVisible();
    ok((await pg.evaluate(() => window.Deckhand.configSource)) === "defaults",
      "configSource: " + await pg.evaluate(() => window.Deckhand.configSource));
    await launchOn(pg);
    await pg.click("#setBtn");
    await pg.click("#dlBtn");
    const msg = (await pg.textContent("#setErrors")).trim();
    ok(msg.startsWith("Export disabled"), "export not refused: " + msg);
    await pg.close();
  });
});

test.describe("autosave", () => {
  // v7.0 REWRITE of 'dirty dot: noise-game records never light it; real edits still do':
  // the board now autosaves to the device, so records DO persist — the
  // thing that must never happen is the failed-save dot lighting.
  test("dirty dot: noise-game records never light it; real edits still do", async ({ dh }) => {
    const pg = await dh.loadFixture("tmp_rec.html", JSON.stringify(Object.assign({
      schemaVersion: 4, appVersion: "6.11.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 50, h: 60 },
        { type: "meter", x: 52, y: 0, w: 40, h: 60, label: "Noise",
          limit: 60, records: {} }
      ]}]
    }, TAIL)));
    await launchOn(pg);
    ok((await storedOn(pg)) !== null, "no device copy after boot");
    await expect(pg.locator("#setBtn")).not.toHaveClass(/dirty/);
    await pg.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "meter");
      w.records["3rd"] = 300;                    // the game setting a record
    });
    ok(await flushOn(pg), "flush failed after a record");
    let st = await storedOn(pg);
    let m = st.cfg.scenes[0].widgets.find(x => x.type === "meter");
    ok(m.records["3rd"] === 300, "record not persisted: " + JSON.stringify(m.records));
    await expect(pg.locator("#setBtn")).not.toHaveClass(/dirty/);
    await pg.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "meter");
      w.limit = 70;                              // a real teacher edit
    });
    ok(await flushOn(pg), "flush failed after an edit");
    st = await storedOn(pg);
    m = st.cfg.scenes[0].widgets.find(x => x.type === "meter");
    ok(m.limit === 70, "real edit not persisted: " + JSON.stringify(m));
    ok((await pg.evaluate(() => window.Deckhand.dirty)) === false, "dirty after a successful flush");
    await expect(pg.locator("#setBtn")).not.toHaveClass(/dirty/);
    await pg.close();
  });
});

test.describe("round trip", () => {
  test("round trip: download keeps schema-4 config + canvas layout", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.selectOption("#sceneSel", "Stations");
    await expect.poll(() => page.evaluate(() => window.Deckhand.scene)).toBe("Stations");
    await page.click("#lockBtn");
    await page.click("#setBtn");
    await page.fill("#sNudge", "45");
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#dlBtn")
    ]);
    // v6.12: STABLE filename — same name in, same name out, so the browser
    // offers to replace the old copy instead of forcing a rename ritual
    ok(dl.suggestedFilename() === "Deckhand_v6.html", "filename: " + dl.suggestedFilename());
    await expect(page.locator("#setErrors")).toContainText("Applied. Exported Deckhand_v6.html");
    ok((await page.evaluate(() => window.Deckhand.dirty)) === false, "dirty after export");
    const html = fs.readFileSync(await dl.path(), "utf8");
    const saved = path.join(dh.fixtureDir, "tmp_rt.html");
    fs.writeFileSync(saved, html);
    const pg = await dh.newPage();
    await pg.goto("file://" + saved);
    await pg.waitForFunction(() => !!window.Deckhand);
    const c = await cfgOn(pg);
    ok(c.schemaVersion === 4 && c.bell.nudgeSeconds === 45 &&
       c.bell.groups.length === 2 && c.bell.groups[0].name === "Teal Week" &&
       c.bell.autoWeek === true && c.bell.anchorMonday === "2026-08-31" &&
       c.timer.style === "ring" && c.bell.showCountdown === true &&
       c.bell.warnMinutes === 5 && c.bell.bathroom.enabled === true &&
       c.bell.showNextClass === true && c.clock.showSeconds === false,
      JSON.stringify({ s: c.schemaVersion, n: c.bell.nudgeSeconds, g: c.bell.groups.map(g => g.name) }));
    ok(c.activeScene === "Stations" && c.ui.locked === true &&
       c.scenes.length === 2 && c.scenes[1].widgets.length === 5,
      "canvas state: " + JSON.stringify({ a: c.activeScene, l: c.ui.locked }));
    ok(await pg.evaluate(() => document.body.classList.contains("locked")),
      "saved copy did not reopen locked");
    await pg.close();
  });
});

test.describe("v7.0 boot and apply guards", () => {
  test("v7.0: a malformed #t= hash still boots", async ({ page, dh }) => {
    await dh.openAt("#t=%");
    ok(await page.evaluate(() => !!window.Deckhand), "window.Deckhand missing");
    await expect(page.locator("#launchBtn")).toBeVisible();
  });

  test("v7.0: bell-schedule lists refuse a 21st block at Apply", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    const before = await page.evaluate(() => window.Deckhand.config.bell.groups[0].regular.length);
    ok(before > 0 && before <= 20, "unexpected default block count: " + before);
    await page.click("#setBtn");
    await dh.openScheds();
    const lines = [];
    for (let i = 0; i < 21; i++){
      const s = 6 * 60 + i * 6, e = s + 4;          // 6:00-6:04, 6:06-6:10, … non-overlapping
      const hm = m => Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0");
      lines.push("B" + (i + 1) + " " + hm(s) + "-" + hm(e));
    }
    await page.fill("#taGrpReg1", lines.join("\n"));
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toContainText("at most 20 blocks");
    const after = await page.evaluate(() => window.Deckhand.config.bell.groups[0].regular.length);
    ok(after === before, "block list changed: " + before + " -> " + after);
  });
});
