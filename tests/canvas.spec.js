/* Deckhand — canvas, widgets, lock, scenes, Next Bell, small-widget shed ladders.
 * Ported from test_deckhand_v6.js (v6 canvas block). Every test boots its own
 * board: the old suite chained on the previous test's widgets and lock state.
 */
const { test, expect, ok } = require("./helpers");

/* Geometry asserts need reduced motion (no spawn pop, no snap-glide).
   playwright.config.js puts `reducedMotion` at the top level of `use`, but
   @playwright/test only honors it inside `contextOptions` — the fixture
   context reports prefers-reduced-motion: no-preference. Opt in here until
   the config is fixed. */
test.use({ contextOptions: { reducedMotion: "reduce" } });

const near48 = v => Math.abs(v - Math.round(v / 48) * 48) < 1.5;

/* a mouse drag from the middle of `loc` by (dx, dy) — the old suite's
   move/down/move/up sequence, unchanged */
const dragBy = async (page, loc, dx, dy, steps) => {
  const b = await loc.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: steps || 6 });
  await page.mouse.up();
  return b;
};

test.describe("canvas", () => {
  test("canvas: default scene renders clock + settle-in, dock ready, settle selected", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    ok(await page.inputValue("#sceneSel") === "Daily Board",
      "scene: " + await page.inputValue("#sceneSel"));
    ok(await page.locator("#canvas .widget:visible").count() === 2, "widget count");
    ok(!(await page.locator("#clockWidget").isHidden()), "clock hidden");
    // v6.29: the settle-in replaced the default timer (Croix)
    ok(await page.locator(".w-settle.sel").count() === 1, "settle not selected");
    ok(await page.locator(".w-timer").count() === 0, "a timer snuck back in");
    ok(await page.evaluate(() => window.Deckhand.scene) === "Daily Board", "api scene");
    // the summoned-timer path still hands out the legacy ids
    await dh.addTimer();
    ok(await page.locator(".w-timer #timer").count() === 1, "legacy ids missing");
  });

  test("canvas: strip-drag snaps to the painted 48px grid and writes config", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    // the default timer is full-height, so shrink it first to free the y axis
    const hb = await page.locator(".w-timer .wHandle.hSE").boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x, hb.y - 320, { steps: 6 });
    await page.mouse.up();
    const sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + 40 - 217, sb.y + sb.height / 2 + 155, { steps: 8 });
    // let the drag rAF paint
    await expect.poll(() => page.evaluate(() =>
      document.querySelector(".w-timer").style.transform)).toContain("translate");
    const mid = await page.evaluate(() => {
      const el = document.querySelector(".w-timer");
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      return { tf: el.style.transform, drag: el.classList.contains("dragging"), cx: cw.x };
    });
    // buttery: mid-drag the widget follows via transform, unsnapped, config untouched
    ok(mid.tf.includes("translate") && mid.drag, "not following: " + JSON.stringify(mid));
    ok(mid.cx === 61, "config written mid-drag: " + mid.cx);
    await page.mouse.up();
    const m = await page.evaluate(() => {
      const el = document.querySelector(".w-timer");
      const c = document.getElementById("canvas").getBoundingClientRect();
      const w = el.getBoundingClientRect();
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      // v6.13: the grid is CANVAS-anchored (painted lines shifted to match)
      return { px: w.left - c.left, py: w.top - c.top, cx: cw.x, cy: cw.y, tf: el.style.transform };
    });
    ok(m.tf === "", "transform lingers after drop");
    ok(near48(m.px) && near48(m.py), "not on grid: " + JSON.stringify(m));
    ok(m.cx < 61 && m.cy > 0, "config not updated: " + JSON.stringify(m));
  });

  test("canvas: corner handle resizes on-grid; far over-shrink clamps at 180x140", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    const hb = await page.locator(".w-timer .wHandle.hSE").boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x - 213, hb.y - 158, { steps: 8 });
    await page.mouse.up();
    let m = await page.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const w = document.querySelector(".w-timer").getBoundingClientRect();
      return { r: w.right - c.left, b: w.bottom - c.top, w: w.width, h: w.height };
    });
    ok(near48(m.r) && near48(m.b), "edges off grid: " + JSON.stringify(m));
    ok(m.w >= 179 && m.h >= 139, "below minimum: " + JSON.stringify(m));
    const hb2 = await page.locator(".w-timer .wHandle.hSE").boundingBox();
    await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb2.x - 900, hb2.y - 900, { steps: 6 });
    await page.mouse.up();
    m = await page.evaluate(() => {
      const w = document.querySelector(".w-timer").getBoundingClientRect();
      return { w: w.width, h: w.height };
    });
    // snap-on-release lands on the nearest gridline at/above the 180x140 floor
    ok(m.w >= 179 && m.w <= 232 && m.h >= 139 && m.h <= 192,
      "clamp: " + JSON.stringify(m));
  });

  test("canvas: west-edge and SW-corner handles resize from the left, on grid", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    const before = await page.evaluate(() => {
      const r = document.querySelector(".w-timer").getBoundingClientRect();
      return { l: r.left, r: r.right, b: r.bottom };
    });
    // drag the LEFT edge outward: left edge moves, right edge must not
    const hw = await page.locator(".w-timer .wHandle.hW").boundingBox();
    await page.mouse.move(hw.x + hw.width / 2, hw.y + hw.height / 2);
    await page.mouse.down();
    await page.mouse.move(hw.x - 190, hw.y, { steps: 6 });
    await page.mouse.up();
    let m = await page.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const r = document.querySelector(".w-timer").getBoundingClientRect();
      return { l: r.left, r: r.right, b: r.bottom, gl: r.left - c.left };
    });
    ok(m.l < before.l - 100, "left edge did not move: " + JSON.stringify(m));
    ok(near48(m.gl), "left edge off grid: " + m.gl);
    ok(Math.abs(m.r - before.r) < 1.5, "right edge drifted: " + m.r + " vs " + before.r);
    // SW corner: left edge + bottom edge together, right edge still pinned
    const hsw = await page.locator(".w-timer .wHandle.hSW").boundingBox();
    await page.mouse.move(hsw.x + hsw.width / 2, hsw.y + hsw.height / 2);
    await page.mouse.down();
    await page.mouse.move(hsw.x + 130, hsw.y - 170, { steps: 6 });
    await page.mouse.up();
    const m2 = await page.evaluate(() => {
      const w = document.querySelector(".w-timer");
      const c = document.getElementById("canvas").getBoundingClientRect();
      const r = w.getBoundingClientRect();
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      return { l: r.left, r: r.right, b: r.bottom, tf: w.style.transform, cx: cw.x,
               gl: r.left - c.left, gb: r.bottom - c.top };
    });
    ok(m2.l > m.l + 60 && m2.b < before.b - 100, "SW corner did not resize: " + JSON.stringify(m2));
    ok(near48(m2.gl) && near48(m2.gb), "SW edges off grid: " + JSON.stringify(m2));
    ok(Math.abs(m2.r - before.r) < 1.5, "right edge drifted on SW: " + m2.r);
    ok(m2.tf === "" && m2.cx > 0, "state not committed: " + JSON.stringify(m2));
  });

  test("canvas: pointerdown restacks; clicking the clock keeps timer selection", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.click("#clock");
    await page.click(".w-timer .visWrap");
    const z = await page.evaluate(() => ({
      c: +document.getElementById("clockWidget").style.zIndex || 0,
      t: +document.querySelector(".w-timer").style.zIndex || 0
    }));
    ok(z.t > z.c && z.c > 0, "z-order: " + JSON.stringify(z));
    await page.click("#clock");
    ok(await page.locator(".w-timer.sel").count() === 1, "clock click stole selection");
  });

  test("canvas: + Timer adds a selected 2nd timer; keys route to selection; S cycles", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addTimerBtn");
    ok(await page.locator(".w-timer").count() === 2, "count");
    ok(await page.locator(".w-timer.sel").count() === 1, "selection");
    ok((await page.locator(".w-timer.sel .wLabel").textContent()) === "TIMER 2",
      "label: " + await page.locator(".w-timer.sel .wLabel").textContent());
    await page.mouse.click(960, 999);
    await page.keyboard.press(" ");            // starts ONLY Timer 2
    await expect(page.locator(".w-timer.sel .tStart")).toHaveText("Pause");
    ok(await dh.text("#startBtn") === "Start", "unselected timer started");
    await page.keyboard.press(" ");            // pause Timer 2
    await page.keyboard.press("s");            // cycle → the settle-in (v6.29 default)
    ok(await page.locator(".w-settle.sel").count() === 1, "S skipped the settle");
    await page.keyboard.press("s");            // …then around to the first timer
    ok(await page.locator(".w-timer.sel #timer").count() === 1, "S did not cycle");
    await page.keyboard.press("7");            // digits go to the selected timer
    ok(await dh.text("#timer") === "0:07", "entry: " + await dh.text("#timer"));
    await page.keyboard.press("Escape");
  });

  test("canvas: closing a widget removes it from the scene config", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addTimerBtn");               // the predecessor left two timers up
    const before = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.length);
    await page.locator(".w-timer").nth(1).locator(".wClose").click();
    ok(await page.locator(".w-timer").count() === 1, "widget lingers");
    const after = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.length);
    ok(after === before - 1, "config kept it: " + before + "->" + after);
    // v6.29: the settle-in is on the board and next in line — recovery
    // may hand the selection to it (close taps select the dying widget first)
    ok(await page.locator(".w-timer.sel, .w-stopwatch.sel, .w-settle.sel")
      .count() === 1, "selection not recovered");
  });

  test("canvas: clock removes, add-clock re-adds, one clock max", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    ok(await page.locator("#addClockBtn").isDisabled(), "add-clock enabled with clock up");
    await page.click("#clockWidget .wClose");
    ok(await page.locator("#clockWidget").isHidden(), "clock still visible");
    ok(await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.some(w => w.type === "clock")) === false,
      "config kept the clock");
    ok(!(await page.locator("#addClockBtn").isDisabled()), "add-clock still disabled");
    await dh.addW("addClockBtn");
    ok(!(await page.locator("#clockWidget").isHidden()), "clock did not return");
    ok(await page.locator("#addClockBtn").isDisabled(), "second clock allowed");
  });
});

test.describe("lock", () => {
  test("lock: freezes drag/close/add, keeps keyboard timer control, unlock restores", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.click("#lockBtn");
    ok(await dh.attr("#lockBtn", "aria-pressed") === "true", "not pressed");
    ok(await page.locator("#addTimerBtn").isDisabled(), "add enabled");
    ok(await page.locator(".w-timer .wClose").isHidden(), "close visible");
    const before = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    const sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 300, sb.y + 200, { steps: 5 });
    await page.mouse.up();
    const after = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    ok(before === after, "locked widget moved");
    ok(await page.evaluate(() => window.Deckhand.config.ui.locked) === true, "config");
    await page.mouse.click(960, 999);
    await page.keyboard.press(" ");            // timers still usable while locked
    await expect(page.locator("#startBtn")).toHaveText("Pause");
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
    // a quick tap must NOT unlock — a labeled button is one poke from a kid
    await page.click("#lockBtn");
    ok(await dh.attr("#lockBtn", "aria-pressed") === "true", "one tap unlocked");
    // scene SWITCHING stays live while locked (view action); the ⋯ manager doesn't
    ok(!(await page.locator("#sceneSel").isDisabled()), "sceneSel dead while locked");
    ok(await page.locator("#sceneBtn").isDisabled(), "⋯ manager usable while locked");
    // a deliberate 1.5s hold unlocks
    await dh.unlock();
    ok(await dh.attr("#lockBtn", "aria-pressed") === "false", "unlock failed");
    ok(!(await page.locator(".w-timer .wClose").isHidden()), "close still hidden");
  });

  test("drag survives mid-drag rug pulls: scene switch and ✕ cannot deadlock it", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    const dragWorks = async () => {
      const before = await page.evaluate(() =>
        document.querySelector(".w-timer")._entry.cfg.x);
      const b = await page.locator(".w-timer .strip").boundingBox();
      await page.mouse.move(b.x + 40, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + 40 - 96, b.y + b.height / 2, { steps: 4 });
      await page.mouse.up();
      const after = await page.evaluate(() =>
        document.querySelector(".w-timer")._entry.cfg.x);
      return after !== before;
    };
    // rug pull 1: scene switch while a drag is held
    let sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 140, sb.y + 80, { steps: 4 });
    await page.evaluate(() => {
      const sel = document.getElementById("sceneSel");
      sel.value = "Stations";
      sel.dispatchEvent(new Event("change"));
    });
    await expect(page.locator(".w-timer .wLabel").first()).toHaveText("STATION 1");
    await page.mouse.up();                        // lands nowhere — capture is gone
    await page.evaluate(() => {
      const sel = document.getElementById("sceneSel");
      sel.value = "Daily Board";
      sel.dispatchEvent(new Event("change"));
    });
    await expect(page.locator(".w-timer")).toHaveCount(1);
    ok(await dragWorks(), "dragging dead after scene-switch rug pull");
    // rug pull 2: the dragged widget's own ✕ mid-drag
    sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 140, sb.y + 80, { steps: 4 });
    await page.evaluate(() =>
      document.querySelector(".w-timer .wClose").click());
    await expect(page.locator(".w-timer")).toHaveCount(0);
    await page.mouse.up();
    await dh.addW("addTimerBtn");                 // bring a timer back
    ok(await dragWorks(), "dragging dead after ✕ rug pull");
  });

  test("lock mid-drag: the release never writes into a locked config", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    const before = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    const sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 200, sb.y + 60, { steps: 4 });
    await page.evaluate(() => document.getElementById("lockBtn").click());
    await expect(page.locator("#lockBtn")).toHaveAttribute("aria-pressed", "true");
    await page.mouse.up();
    const after = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    ok(before === after, "locked release still committed the drag");
    ok(await page.evaluate(() => window.Deckhand.config.ui.locked) === true, "not locked");
    const back = await page.evaluate(() => {
      const en = document.querySelector(".w-timer")._entry;
      const r = en.el.getBoundingClientRect();
      const c = document.getElementById("canvas").getBoundingClientRect();
      return Math.abs((r.left - c.left) / c.width * 100 - en.cfg.x) < 1.5;
    });
    ok(back, "widget stranded away from its stored box");
    await dh.unlock();
  });
});

test.describe("scenes", () => {
  test("scenes: Stations swaps the widget set and back without residue", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.selectOption("#sceneSel", "Stations");
    await expect(page.locator("#canvas .widget:visible")).toHaveCount(5);
    const labels = await page.locator(".w-timer .wLabel").allTextContents();
    ok(labels.join("|") === "STATION 1|STATION 2|STATION 3", "labels: " + labels.join("|"));
    ok(await page.locator(".w-stopwatch").count() === 1, "stopwatch missing");
    ok(await page.locator("#timer").count() === 1, "legacy ids not reassigned");
    ok(await page.evaluate(() => window.Deckhand.scene) === "Stations", "api scene");
    ok(await page.evaluate(() => document.activeElement !== document.getElementById("sceneSel")),
      "scene select kept keyboard focus");
    await page.keyboard.press("s");            // must cycle selection, NOT switch scene
    ok(await page.evaluate(() => window.Deckhand.scene) === "Stations", "s switched scene");
    await page.keyboard.press(" ");            // run the selected station timer
    await expect(page.locator(".w-timer.sel .tStart")).toHaveText("Pause");
    await page.selectOption("#sceneSel", "Daily Board");
    await page.waitForTimeout(400);            // destroyed timer must not tick or ring
    ok(await page.locator("#canvas .widget:visible").count() === 2, "residue widgets");
    // v6.29: the Daily Board carries a settle-in, not a timer
    ok(await page.locator(".w-timer").count() === 0, "timer residue");
    ok(await page.locator(".w-settle").count() === 1, "settle count");
    ok(await page.evaluate(() => window.Deckhand.config.activeScene) === "Daily Board",
      "config scene");
  });
});

test.describe("Next Bell widget", () => {
  test("Next Bell widget: drains through the period, honors seconds toggle", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");    // Teal Tue: in 2nd, 39 of 53 min left
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addBellBtn");
    ok(await page.locator(".w-bell").count() === 1, "bell widget missing");
    const b = await page.evaluate(() => {
      const w = document.querySelector(".w-bell");
      const cw = window.Deckhand.config.scenes[0].widgets;
      return {
        big: w.querySelector(".bellBig").textContent,
        small: w.querySelector(".bellSmall").textContent,
        off: parseFloat(w.querySelector(".visProg").getAttribute("stroke-dashoffset")),
        cfgType: cw[cw.length - 1].type, label: cw[cw.length - 1].label
      };
    });
    ok(b.big === "39 min", "big: " + b.big);
    ok(b.small === "until bell · 2nd", "small: " + b.small);
    // 39/53 remaining -> offset = C * (1 - 0.7358) ~ 139 of C=527.8
    ok(b.off > 130 && b.off < 150, "drain wrong: " + b.off);
    ok(b.cfgType === "bell" && b.label === "Next Bell", "config: " + JSON.stringify(b));
    await page.keyboard.press(" ");            // Space on a bell widget is a safe no-op
    ok(await dh.text("#startBtn") === "Start", "Space leaked to a timer");
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.check("#sCountSecs");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    await expect(page.locator(".w-bell .bellBig")).toHaveText(/^(39:00|38:[45]\d)$/);
  });

  test("Next Bell widget: coral in the warn window, weekend gap drain", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T11:05");    // 4 min left in 2nd (warn at 5)
    await dh.launch();
    await dh.addW("addBellBtn");
    let s = await page.evaluate(() => {
      const w = document.querySelector(".w-bell .visWrap");
      return { low: w.classList.contains("low"),
               big: w.querySelector(".bellBig").textContent };
    });
    ok(s.low && s.big === "4 min", "warn state: " + JSON.stringify(s));
    await dh.openAt("#t=2026-09-06T15:00");    // Sunday 3pm: 18h20m of 65h20m to Mon 9:20
    await dh.launch();
    await dh.addW("addBellBtn");
    s = await page.evaluate(() => {
      const w = document.querySelector(".w-bell .visWrap");
      return { big: w.querySelector(".bellBig").textContent,
               small: w.querySelector(".bellSmall").textContent,
               off: parseFloat(w.querySelector(".visProg").getAttribute("stroke-dashoffset")) };
    });
    ok(s.big === "18h 20m", "weekend big: " + s.big);
    ok(s.small === "until 1st · Monday 9:20", "weekend small: " + s.small);
    // ~28% remains -> offset ~ C * 0.719 ~ 380
    ok(s.off > 368 && s.off < 392, "weekend drain: " + s.off);
    await page.evaluate(() => window.Deckhand.setSchedule(-1));  // No bells
    // the widget repaints on its 500ms tick
    await expect(page.locator(".w-bell .visWrap")).toHaveClass(/bellOff/);
    s = await page.evaluate(() => {
      const w = document.querySelector(".w-bell .visWrap");
      return { off: w.classList.contains("bellOff"),
               small: w.querySelector(".bellSmall").textContent };
    });
    ok(s.off && s.small === "No bells today", "off state: " + JSON.stringify(s));
  });
});

test.describe("small widgets", () => {
  test("small widget: content never overflows the strip or the card edges", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    // shrink the timer widget to its minimum via the corner handle
    const hb = await page.locator(".w-timer .wHandle.hSE").boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x - 1200, hb.y - 1200, { steps: 6 });
    await page.mouse.up();
    const measure = () => page.evaluate(() => {
      const w = document.querySelector(".w-timer");
      const wr = w.getBoundingClientRect();
      const strip = w.querySelector(".strip").getBoundingClientRect();
      const gone = sel => {
        const el = w.querySelector(sel);
        return !el || getComputedStyle(el).display === "none";
      };
      // whichever display is active (ring, or plain digits when too short)
      const visGone = gone(".visWrap");
      const disp = w.querySelector(visGone ? ".tDisplay" : ".visWrap").getBoundingClientRect();
      const row = w.querySelector(".row").getBoundingClientRect();
      return { h: wr.height, stripBot: strip.bottom, cardBot: wr.bottom,
               dTop: disp.top, dBot: disp.bottom, rowBot: row.bottom,
               visGone, digitsText: w.querySelector(visGone ? ".tDisplay" : ".visDigits").textContent,
               hintGone: gone(".tHint"), chipsGone: gone(".chips") };
    });
    // the shed ladder settles after the resize commits
    await expect.poll(async () => { const m = await measure(); return m.hintGone && m.chipsGone; }).toBe(true);
    const m = await measure();
    ok(m.dTop >= m.stripBot - 1, "display over the strip: " + JSON.stringify(m));
    ok(m.dBot <= m.cardBot + 1 && m.rowBot <= m.cardBot + 1,
      "content past the card: " + JSON.stringify(m));
    ok(m.hintGone && m.chipsGone, "chrome not shed at " + m.h + "px: " + JSON.stringify(m));
    ok(m.digitsText === "5:00", "digits wrong: " + m.digitsText);
    // and the timer still works at minimum size
    await page.keyboard.press(" ");
    await expect(page.locator("#startBtn")).toHaveText("Pause");
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
  });

  test("small clock: sheds bells until only the time remains, never clips", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");    // bells active so bellWrap is populated
    await dh.launch();
    const hb = await page.locator("#clockWidget .wHandle.hSE").boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x - 1500, hb.y - 1500, { steps: 6 });
    await page.mouse.up();
    const measure = () => page.evaluate(() => {
      const w = document.getElementById("clockWidget");
      const wr = w.getBoundingClientRect();
      const strip = w.querySelector(".strip").getBoundingClientRect();
      const clk = document.getElementById("clock").getBoundingClientRect();
      const vis = id => getComputedStyle(document.getElementById(id)).display !== "none";
      return { h: wr.height, stripBot: strip.bottom, cardBot: wr.bottom,
               cTop: clk.top, cBot: clk.bottom, clockText: document.getElementById("clock").textContent,
               bell: vis("bellWrap"), sub: vis("clockSub") };
    });
    await expect.poll(async () => { const m = await measure(); return !m.bell && !m.sub; }).toBe(true);
    let m = await measure();
    ok(!m.bell && !m.sub, "chrome not shed at " + m.h + "px: " + JSON.stringify(m));
    ok(m.cTop >= m.stripBot - 1 && m.cBot <= m.cardBot + 1,
      "time clipped: " + JSON.stringify(m));
    ok(/^\d{1,2}:\d{2}$/.test(m.clockText), "clock text: " + m.clockText);
    // mid size: time + period survive, extras are gone
    await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "clock");
      w.w = 40; w.h = 34;                      // ~745x300px
      window.Deckhand;
    });
    await page.selectOption("#sceneSel", "Daily Board");
    const measure2 = () => page.evaluate(() => {
      const vis = id => getComputedStyle(document.getElementById(id)).display !== "none";
      const w = document.getElementById("clockWidget").getBoundingClientRect();
      const hero = document.getElementById("periodNow");
      const hr = hero.getBoundingClientRect();
      return { bell: vis("bellWrap"), hero: hero.textContent, strip: vis("dayStrip"),
               bath: vis("bathPill"), bar: vis("bellBar"), tag: vis("weekTag"),
               heroBot: hr.bottom, cardBot: w.bottom };
    });
    await expect.poll(async () => (await measure2()).bell).toBe(true);
    m = await measure2();
    ok(m.bell && m.hero === "2nd Period", "hero lost: " + JSON.stringify(m));
    ok(!m.strip && !m.bath && !m.bar && !m.tag, "extras kept: " + JSON.stringify(m));
    ok(m.heroBot <= m.cardBot + 1, "hero clipped: " + JSON.stringify(m));
  });
});

/* ---------- touch (Promethean panel): only the `touch` project runs these ---------- */

/* a one-finger drag through CDP Input.dispatchTouchEvent — the same channel
   page.touchscreen.tap uses, extended with touchMove so the strip's
   pointerdown/pointermove/pointerup arrive with pointerType "touch" */
const touchDrag = async (page, x0, y0, x1, y1, steps) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  const n = steps || 8;
  for (let i = 1; i <= n; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove",
      touchPoints: [{ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
};

test.describe("touch", () => {
  test("@touch a finger drags the timer by its strip and the drop snaps to the grid", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    // free the y axis first: the summoned timer is full-height
    await page.evaluate(() => {
      const en = document.querySelector(".w-timer")._entry;
      en.cfg.h = 40; en.el.style.height = "40%";
    });
    const before = await page.evaluate(() => {
      const en = document.querySelector(".w-timer")._entry;
      return { x: en.cfg.x, y: en.cfg.y };
    });
    // record what the strip actually saw, so a mouse fallback can't pass this
    await page.evaluate(() => {
      window.__ptypes = [];
      document.querySelector(".w-timer .strip").addEventListener("pointerdown",
        e => window.__ptypes.push(e.pointerType));
    });
    const sb = await page.locator(".w-timer .strip").boundingBox();
    const x0 = sb.x + 40, y0 = sb.y + sb.height / 2;
    await touchDrag(page, x0, y0, x0 - 217, y0 + 155, 8);
    const ptypes = await page.evaluate(() => window.__ptypes);
    ok(ptypes.length === 1 && ptypes[0] === "touch", "strip pointerType: " + JSON.stringify(ptypes));
    const m = await page.evaluate(() => {
      const el = document.querySelector(".w-timer");
      const c = document.getElementById("canvas").getBoundingClientRect();
      const w = el.getBoundingClientRect();
      const en = el._entry;
      return { px: w.left - c.left, py: w.top - c.top, cx: en.cfg.x, cy: en.cfg.y,
               tf: el.style.transform, drag: el.classList.contains("dragging") };
    });
    ok(!m.drag && m.tf === "", "touch drag never released: " + JSON.stringify(m));
    ok(m.cx < before.x && m.cy > before.y, "config not moved by the finger: " + JSON.stringify(m) + " from " + JSON.stringify(before));
    ok(near48(m.px) && near48(m.py), "touch drop off grid: " + JSON.stringify(m));
    // and the finger still selects: the dragged timer carries the teal outline
    ok(await page.locator(".w-timer.sel").count() === 1, "touch did not select");
    const outline = await page.$eval(".w-timer.sel", n => getComputedStyle(n).outlineColor);
    ok(outline === "rgb(18, 122, 133)", "selected outline: " + outline);
  });
});
