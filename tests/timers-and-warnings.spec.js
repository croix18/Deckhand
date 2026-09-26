/* Timer visual styles, digit entry, settings keyboard/focus, next-class
 * countdowns, end-of-class warning, bathroom window, clock seconds, volume,
 * settings tab rail, weekend bar, coarse countdown.
 * Ported from test_deckhand_v6.js (v5.2–v5.3 sections). */
const { test, expect, ok } = require("./helpers");

const CORAL = "rgb(255, 127, 106)";

/* ---------- v5.2: visual timers ---------- */

test.describe("timer visual styles", () => {
  test("ring style default: visual shown, digits element hidden but synced", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    ok(!(await page.locator("#visWrap").isHidden()), "visual hidden");
    ok(await page.locator("#timer").isHidden(), "digits element visible");
    ok(await dh.text("#visDigits") === "5:00", "vis digits: " + await dh.text("#visDigits"));
    await page.click('[data-min="1"]');
    ok(await dh.text("#visDigits") === "1:00", "vis not synced");
    const off = await page.$eval("#visProgC", n => n.getAttribute("stroke-dashoffset"));
    ok(parseFloat(off) < 1, "ring should be full when reset: " + off);
  });

  test("entry falls back to digits; low state colors visual", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.mouse.click(960, 999);
    await page.keyboard.press("7");            // entry mode
    ok(await page.locator("#visWrap").isHidden(), "visual during entry");
    ok(!(await page.locator("#timer").isHidden()), "entry digits hidden");
    await page.keyboard.press("Escape");
    await page.keyboard.press("9");            // 0:09 -> low immediately
    await page.keyboard.press("Enter");
    await expect(page.locator("#visWrap")).toHaveClass(/\blow\b/);
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
  });

  test("timer styles switch live: tide fills, disc thickens, digits return", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.click("#setBtn");
    await dh.tab("timer");
    await page.selectOption("#sTimerStyle", "tide");
    await page.click("#applyBtn");
    ok(!(await page.locator("#tideTank").isHidden()), "tank hidden");
    const h = await page.$eval("#tideWater", n => n.style.transform);   // v7.6: a transform, not a height
    ok(/scaleY\(1(\.0+)?\)/.test(h), "water not full on reset: " + h);
    await page.selectOption("#sTimerStyle", "disc");
    await page.click("#applyBtn");
    ok(await page.locator("#tideTank").isHidden(), "tank lingers");
    const w = await page.$eval("#visProgC", n => n.getAttribute("stroke-width"));
    ok(w === "64", "disc thickness: " + w);
    await page.selectOption("#sTimerStyle", "digits");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await page.locator("#visWrap").isHidden(), "visual lingers");
    ok(!(await page.locator("#timer").isHidden()), "digits missing");
  });

  test("disc digits fit the hole, including 10:00 and 100:39", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.click("#setBtn");
    await dh.tab("timer");
    await page.selectOption("#sTimerStyle", "disc");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    const fits = async () => await page.evaluate(() => {
      const w = document.getElementById("visWrap").clientWidth;
      const d = document.getElementById("visDigits");
      const r = document.createRange();
      r.selectNodeContents(d);
      return { hole: w * 0.30, text: r.getBoundingClientRect().width };
    });
    await page.click('[data-min="10"]');
    let m = await fits();
    ok(m.text <= m.hole + 2, "10:00 overflows: " + JSON.stringify(m));
    await page.mouse.click(960, 999);
    await page.keyboard.press("9"); await page.keyboard.press("9");
    await page.keyboard.press("9"); await page.keyboard.press("9");
    await page.keyboard.press("Enter");        // 100:39, running
    await expect(page.locator("#startBtn")).toHaveText("Pause");
    await page.keyboard.press(" ");            // pause
    await expect(page.locator("#startBtn")).not.toHaveText("Pause");
    m = await fits();
    ok(m.text <= m.hole + 2, "100:39 overflows: " + JSON.stringify(m));
    await page.keyboard.press("r");
  });

  test("+1:00 while running: visual drains truthfully (no pegged-full ring)", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.click("#setBtn");
    await dh.tab("timer");
    await page.selectOption("#sTimerStyle", "ring");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    await page.click('[data-min="1"]');
    await page.mouse.click(960, 999);
    await page.keyboard.press(" ");            // start 1:00
    await page.click("#plusBtn");              // now ~2:00 of visMax 2:00
    // the ring must visibly leave "full" once a second or so has elapsed
    await expect.poll(
      () => page.$eval("#visProgC", n => parseFloat(n.getAttribute("stroke-dashoffset"))),
      { timeout: 6000, message: "ring pegged full after +1:00" }
    ).toBeGreaterThan(0.5);
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
  });
});

/* ---------- settings keyboard / focus ---------- */

test.describe("settings keyboard and focus", () => {
  test("Space right after pointer-closing Settings starts the timer", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.click("#setBtn");
    await page.click("#closeBtn");             // pointer close: no focus restore
    await page.keyboard.press(" ");
    await expect(page.locator("#startBtn")).toHaveText("Pause");
    ok(await page.locator("#settingsWrap").isHidden(), "Settings reopened");
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
    await page.click("#setBtn");               // Esc close still restores focus
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() => document.activeElement.id) === "setBtn",
      "keyboard focus not restored");
  });

  test('labels already containing "Period" are not doubled', async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await page.click("#setBtn");
    await dh.openScheds();
    const ta = await page.inputValue("#taGrpReg1");
    await page.fill("#taGrpReg1", ta.replace("2nd 10:16-11:09", "2nd Period 10:16-11:09"));
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await dh.text("#periodNow") === "2nd Period", "hero: " + await dh.text("#periodNow"));
  });

  test("keyboard Close restores focus; pointer close blurs", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#setBtn");
    await page.focus("#closeBtn");
    await page.keyboard.press("Enter");        // keyboard activation
    ok(await page.evaluate(() => document.activeElement.id) === "setBtn",
      "keyboard close lost focus");
  });

  test("v7.2: settings is a tab rail — 6 tabs, one panel visible, General first", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#setBtn");
    const tabs = await page.locator("#setRail .setTab").allTextContents();
    ok(tabs.join("|") === "General|Bells|Timer|Rosters|Schedules|Device", "tabs: " + tabs.join("|"));
    const vis = async () => page.evaluate(() =>
      [...document.querySelectorAll("#setPanels .setSec")].filter(s => !s.hidden).map(s => s.id));
    ok((await vis()).join() === "secGeneral", "panels visible on open: " + (await vis()).join());
    ok(await page.evaluate(() => window.Deckhand.settings.currentTab()) === "general", "currentTab");
    await page.click("#tabScheds");
    ok((await vis()).join() === "secScheds", "panels after tapping Schedules: " + (await vis()).join());
    ok(await page.evaluate(() => window.Deckhand.settings.currentTab()) === "scheds", "currentTab after tap");
    ok(await dh.attr("#tabScheds", "aria-selected") === "true", "tab not selected");
    // the week types are BLOCK editors by default; the text boxes are one toggle away
    ok(await page.locator("#secScheds .wkCard").count() === 4, "week-type cards");
    ok(await page.locator("#taGrpReg1").isHidden(), "textarea shown by default");
    await page.evaluate(() => window.Deckhand.settings.textMode(0, true));
    ok(!(await page.locator("#taGrpReg1").isHidden()), "textarea hidden in text mode");
    ok(await page.locator('#secScheds .wkCard[data-wk="1"] .blkRow').count() > 0, "block rows missing");
    // the action row and the error slot are outside the tab panels
    ok(!(await page.locator("#applyBtn").isHidden()) && !(await page.locator("#closeBtn").isHidden()), "actions hidden");
    await page.keyboard.press("Escape");
  });

  test("v7.2: Tab stays inside the visible panel + rail + actions; arrows move the rail", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#setBtn");
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      seen.add(await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));
    }
    ok(seen.has("applyBtn") && seen.has("closeBtn"), "never reached buttons: " + [...seen].join(","));
    ok(seen.has("sName"), "never reached the General panel: " + [...seen].join(","));
    ok(!seen.has("sPresets") && !seen.has("taGrpReg1") && !seen.has("sNudge"),
      "Tab reached a hidden panel: " + [...seen].join(","));
    ok(![...seen].some(id => id === "BODY" || id === "launchBtn" || id === "setBtn"),
      "focus escaped the dialog: " + [...seen].join(","));
    // the rail: arrow keys switch tabs, and Tab then walks THAT panel
    await page.focus("#tabGeneral");
    await page.keyboard.press("ArrowDown");
    ok(await page.evaluate(() => window.Deckhand.settings.currentTab()) === "bells", "ArrowDown did not switch");
    ok(await page.evaluate(() => document.activeElement.id) === "tabBells", "focus not on the new tab");
    await page.keyboard.press("Tab");
    ok(await page.evaluate(() => document.activeElement.id) === "sDefault",
      "Tab from the rail went to " + await page.evaluate(() => document.activeElement.id));
    await page.keyboard.press("Escape");
  });

  test("v7.2: reopening settings returns to the tab you left, with focus inside the dialog", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#setBtn");
    await page.click("#tabRosters");
    await page.click("#closeBtn");
    await page.click("#setBtn");
    const inside = await page.evaluate(() =>
      !!(document.activeElement && document.activeElement.closest("#settingsCard")));
    ok(inside, "focus not inside dialog");
    ok(await page.evaluate(() => window.Deckhand.settings.currentTab()) === "rosters", "tab not remembered");
    ok(!(await page.locator("#rosterGrid").isHidden()), "rosters panel not showing");
    await page.keyboard.press("Escape");
  });
});

/* ---------- v5.3: next class ---------- */

test.describe("next-class countdown", () => {
  test("Sunday counts down to Monday 1st period (next week auto-resolved)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-06T15:00");    // Sunday of the Black week
    await dh.launch();
    ok(!(await page.locator("#bellWrap").isHidden()), "bell hidden on Sunday");
    ok(await dh.text("#periodNow") === "Next: 1st Period", "hero: " + await dh.text("#periodNow"));
    ok(await dh.text("#weekTag") === "Teal Week", "tag: " + await dh.text("#weekTag"));
    const sub = await dh.text("#bellSub");
    ok(sub.includes("Monday 9:20") && sub.includes("in 18h 20m"), "sub: " + sub);
    ok(!(await page.locator("#bellBar").isHidden()), "weekend bar hidden");
    const wk = await page.$eval("#bellFill", n => ({ w: parseFloat(n.style.width), sand: n.classList.contains("passing") }));
    // Fri 4:00pm -> Mon 9:20 is 65h20m; Sun 3pm has 18h20m left = ~28.1% remains
    ok(wk.sand && wk.w > 26 && wk.w < 30, "weekend drain: " + JSON.stringify(wk));
    ok(await page.locator("#bathPill").isHidden(), "bathroom shown for next");
    const next = await page.locator("#dayStrip .dayChip.next").textContent();
    ok(next.trim() === "1st", "strip next: " + next);
  });

  test("after school counts down to tomorrow (Wed variant honored)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T16:30");    // Tue after last bell
    await dh.launch();
    ok(await dh.text("#periodNow") === "Next: 1st Period", "hero: " + await dh.text("#periodNow"));
    ok(await dh.text("#weekTag") === "Teal Week (Wed)", "tag: " + await dh.text("#weekTag"));
    ok((await dh.text("#bellSub")).includes("Wednesday 9:20"), "sub: " + await dh.text("#bellSub"));
  });

  test("early morning (beyond 90-min window) counts down to same day", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T06:00");
    await dh.launch();
    const sub = await dh.text("#bellSub");
    ok(sub.startsWith("9:20") && sub.includes("in 3h 20m"), "sub: " + sub);
  });

  test("next-class countdown is toggleable", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-06T15:00");
    await dh.launch();
    ok(!(await page.locator("#bellWrap").isHidden()), "precondition");
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.uncheck("#sNext");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await page.locator("#bellWrap").isHidden(), "toggle failed");
  });

  test("nudge across midnight cannot freeze or skip the next-class scan", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-04T23:55");    // Fri night + bells 10 min ahead
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.bell.nudgeSeconds = 600;
      window.Deckhand.config.bell.countdownSeconds = true; });
    await expect(page.locator("#bellSub")).toContainText("Monday 9:20");
    let sub = await dh.text("#bellSub");
    ok(!sub.includes("in 0:00"), "pos nudge: " + sub);
    await dh.openAt("#t=2026-09-01T00:05");    // just past midnight + bells behind
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.bell.nudgeSeconds = -600;
      window.Deckhand.config.bell.countdownSeconds = true; });
    await expect(page.locator("#bellSub")).toContainText("Tuesday 9:20");
    sub = await dh.text("#bellSub");
    ok(!sub.includes("Wednesday"), "neg nudge: " + sub);
  });

  test("Saturday shows the weekend bar (Fri 4:00 -> Mon 9:20, ~30% by noon)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-05T12:00");    // Saturday noon
    await dh.launch();
    ok(!(await page.locator("#bellWrap").isHidden()), "hidden on Saturday");
    ok(await dh.text("#periodNow") === "Next: 1st Period", "hero: " + await dh.text("#periodNow"));
    const sub = await dh.text("#bellSub");
    ok(sub.includes("Monday 9:20") && sub.includes("in 45h 20m"), "sub: " + sub);
    const w = await page.$eval("#bellFill", n => parseFloat(n.style.width));
    ok(w > 67 && w < 72, "Saturday drain: " + w);  // 45h20m of 65h20m left = 69.4%
  });

  test("after the 4:00 bell the bar spans overnight to tomorrow", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T16:30");    // Tue evening
    await dh.launch();
    ok(!(await page.locator("#bellBar").isHidden()), "no overnight bar");
    const w = await page.$eval("#bellFill", n => parseFloat(n.style.width));
    ok(w > 94 && w < 99, "overnight drain: " + w); // 16h50m of 17h20m left = 97.1%
  });
});

/* ---------- v5.3: end-of-class warning + bell countdown modes ---------- */

test.describe("end-of-class warning and countdown", () => {
  test("5-minute warning: warn class, coral sub forced visible", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T11:05");    // 2nd ends 11:09 -> 4:00 left
    await dh.launch();
    ok(((await dh.attr("#bellWrap", "class")) || "").includes("warn"), "no warn class");
    // v7.0: the warning is navy text on a coral chip — assert the background
    await expect(page.locator("#bellSub")).toHaveCSS("background-color", CORAL);
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.uncheck("#sCount");             // countdown off...
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(!(await page.locator("#bellSub").isHidden()), "warning hidden with countdown off");
    ok((await dh.text("#bellSub")).includes("until bell"), "sub: " + await dh.text("#bellSub"));
  });

  test("warning minutes configurable (15 -> warns at 39:00 left... no; at 10:55)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:55");    // 14:00 left in 2nd
    await dh.launch();
    ok(!((await dh.attr("#bellWrap", "class")) || "").includes("warn"), "warn too early");
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.fill("#sWarn", "15");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(((await dh.attr("#bellWrap", "class")) || "").includes("warn"), "custom warn failed");
  });

  test("seconds-in-countdown toggle restores m:ss", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    ok((await dh.text("#bellSub")) === "39 min until bell", "default: " + await dh.text("#bellSub"));
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.check("#sCountSecs");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    // the sim clock keeps ticking while Settings is open, so accept 38:xx–39:00
    await expect(page.locator("#bellSub")).toHaveText(/^3[89]:\d{2} until bell$/);
  });

  test('final minute shows "< 1 min" in coarse mode', async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T11:08:30"); // 30s left in 2nd
    await dh.launch();
    ok((await dh.text("#bellSub")).includes("< 1 min until bell"), "sub: " + await dh.text("#bellSub"));
  });
});

/* ---------- v5.3: bathroom window, clock seconds, volume ---------- */

test.describe("bathroom window, clock seconds, volume", () => {
  test("bathroom window: closed first 10, open middle, closed last 10, toggleable", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:20");    // 2nd began 10:16
    await dh.launch();
    let bp = await dh.text("#bathPill");
    ok((await dh.attr("#bathPill", "class")) === "closed" && bp.includes("opens 10:26"),
      "early: " + bp + " / " + await dh.attr("#bathPill", "class"));
    await dh.openAt("#t=2026-09-08T10:35");
    await dh.launch();
    bp = await dh.text("#bathPill");
    ok((await dh.attr("#bathPill", "class")) === "open" && bp.includes("closes 10:59"),
      "mid: " + bp);
    await dh.openAt("#t=2026-09-08T11:02");
    await dh.launch();
    ok((await dh.attr("#bathPill", "class")) === "closed", "late not closed");
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.uncheck("#sBath");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await page.locator("#bathPill").isHidden(), "bathroom toggle failed");
  });

  test("seconds hidden by default; settings option restores them", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    ok(/^(AM|PM)$/.test(await dh.text("#clockSub")), "sub: " + await dh.text("#clockSub"));
    await page.click("#setBtn");
    await page.check("#sSeconds");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    await expect(page.locator("#clockSub")).toHaveText(/^:\d{2} (AM|PM)$/);
  });

  test("volume slider writes config; passing gets its mode class", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#setBtn");
    await page.fill("#sVolume", "60");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    const v = await page.evaluate(() => window.Deckhand.config.sound.volume);
    ok(Math.abs(v - 0.6) < 0.001, "volume: " + v);
    await dh.openAt("#t=2026-09-08T11:44");
    await dh.launch();
    ok(((await dh.attr("#bellWrap", "class")) || "").includes("passing"), "no passing class");
  });
});
