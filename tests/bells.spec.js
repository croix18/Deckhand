/* Landing, week rotation, 2026-27 bell math, board basics, settings, day
 * strip, rollover, period hero — ported from test_deckhand_v6.js lines 96–416.
 * Every test boots its own page (the old suite shared one). */
const { test, expect, ok } = require("./helpers");

/* ---------- landing ---------- */
test.describe("landing", () => {
  test("landing: greeting, Teal/Black/No-bells chips, hint 1–3", async ({ page, dh }) => {
    await dh.openAt("");
    ok(/^Good (morning|afternoon|evening), Mr\. Shaffer$/.test(await dh.text("#greet")),
      "greeting: " + await dh.text("#greet"));
    const names = await page.locator("#schedChips .chip").allTextContents();
    ok(names.join("|") === "Teal Week|Black Week|No bells", "names: " + names.join("|"));
    ok((await dh.text("#landHint")).includes("1–3"), "hint: " + await dh.text("#landHint"));
  });

  test("auto-rotation pre-picks: Aug 31 wk = Black, Sep 7 wk = Teal", async ({ page, dh }) => {
    await dh.openAt("#t=2026-08-31T08:00");
    let pressed = await page.locator('#schedChips .chip[aria-pressed="true"]').textContent();
    ok(pressed.trim() === "Black Week", "Aug31 pressed: " + pressed);
    await dh.openAt("#t=2026-09-08T08:00");
    pressed = await page.locator('#schedChips .chip[aria-pressed="true"]').textContent();
    ok(pressed.trim() === "Teal Week", "Sep8 pressed: " + pressed);
    const wk = await page.evaluate(() => window.Deckhand.autoWeekIndexAt("2026-09-14T10:00"));
    ok(wk === 1, "Sep14 parity: " + wk);
  });

  test("manual chip overrides the auto pick for the day", async ({ page, dh }) => {
    await dh.openAt("#t=2026-08-31T10:30");       // auto = Black
    await dh.home();                             // v7.7: the landing page is skipped on a rotation-picked week
    await page.keyboard.press("1");               // override to Teal
    await dh.launch();
    const line = await dh.bellText();
    ok(line.includes("Teal Week") && line.includes("2nd"), "line: " + line);
  });
});

/* ---------- 2026-27 bell math (Sep 1 2026 = Tue, Sep 2 = Wed) ---------- */
test.describe("2026-27 bell math", () => {
  test('Wed sim + Teal: Wednesday times, "(Wed)", 2nd 19:00 left', async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-09T10:30");
    ok((await dh.text("#brand")).includes("SIM"), "no SIM badge");
    await dh.launch();
    const line = await dh.bellText();
    ok(line.includes("Teal Week (Wed)") && line.includes("2nd") && line.includes("19 min"),
      "line: " + line);                            // tealWed 2nd 10:06-10:49
    const w = await page.$eval("#bellFill", n => n.style.width);
    ok(parseFloat(w) > 0, "no bar fill");
  });

  test('Tue sim + Teal: regular times, no "(Wed)", 2nd 39:00 left', async ({ dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    const line = await dh.bellText();
    ok(line.includes("Teal Week") && !line.includes("(Wed)") &&
       line.includes("2nd") && line.includes("39 min"),
      "line: " + line);                            // tealReg 2nd 10:16-11:09
  });

  test("Black Week auto on its Wednesday: mirrored order (5th at 10:30)", async ({ dh }) => {
    await dh.openAt("#t=2026-09-02T10:30");       // Wed of the Black anchor week
    await dh.launch();
    const line = await dh.bellText();
    ok(line.includes("Black Week (Wed)") && line.includes("5th"), "line: " + line);
  });

  test("passing between HOWL and 3rd on a regular day", async ({ dh }) => {
    await dh.openAt("#t=2026-09-08T11:44");       // HOWL ends 11:43, 3rd at 11:46
    await dh.launch();
    const line = await dh.bellText();
    ok(line.includes("Passing") && line.includes("3rd") && line.includes("2 min"),
      "line: " + line);
  });

  test("lunch block + PM heuristic (12:42-1:12 read as PM)", async ({ dh }) => {
    await dh.openAt("#t=2026-09-08T12:50");
    await dh.launch();
    const line = await dh.bellText();
    ok(line.includes("Lunch") && line.includes("22 min"), "line: " + line);
  });

  test("No bells (chip 3) hides readout; debug API agrees", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T12:50");
    await dh.home();                             // v7.7: the landing page is skipped on a rotation-picked week
    await page.keyboard.press("3");
    await dh.launch();
    ok(await page.locator("#bellWrap").isHidden(), "readout visible");
    const st = await page.evaluate(() => window.Deckhand.bellStatusAt("2026-09-08T10:30"));
    ok(st.type === "off", "not off: " + JSON.stringify(st));
    await page.evaluate(() => window.Deckhand.setSchedule(0));
    const st2 = await page.evaluate(() => window.Deckhand.bellStatusAt("2026-09-09T10:30"));
    ok(st2.sched === "Teal Week (Wed)" && st2.label === "2nd", JSON.stringify(st2));
  });
});

/* ---------- board behavior ---------- */
test.describe("board", () => {
  test("board: clock, presets, entry, reset target, chip deselect", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.mouse.click(960, 999);
    ok(/^\d{1,2}:\d{2}$/.test(await dh.text("#clock")), "clock");
    ok(await dh.text("#timer") === "5:00", "timer: " + await dh.text("#timer"));
    await page.keyboard.press("7");
    await page.keyboard.press("3");
    ok(await dh.text("#timer") === "0:73", "entry: " + await dh.text("#timer"));
    await page.keyboard.press("Enter");
    await expect(page.locator("#startBtn")).toHaveText("Pause");   // running
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
    ok(await dh.text("#timer") === "1:13", "reset target");
    ok(await dh.attr('[data-min="5"]', "aria-pressed") === "false", "chip still pressed");
  });

  test("alarm rings; Enter dismisses; focused dock button suppressed", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.mouse.click(960, 999);
    await page.keyboard.press("2");
    await page.keyboard.press("Enter");
    await expect(page.locator("#alarm")).toHaveClass(/\bon\b/, { timeout: 8000 });   // 0:02 elapses
    await page.focus("#lockBtn");
    await page.keyboard.press("Enter");            // must dismiss, NOT toggle lock
    ok(!(await dh.attr("#alarm", "class")).includes("on"), "not dismissed");
    ok(await dh.attr("#lockBtn", "aria-pressed") === "false", "lock fired behind overlay");
    ok(await dh.text("#startBtn") === "Start", "timer restarted behind overlay");
  });

  test("stopwatch widget independent; background timer rings with its name", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.mouse.click(960, 999);
    await page.keyboard.press("3");                // primary timer: 0:03
    await page.keyboard.press("Enter");            // running
    await dh.addW("addWatchBtn");                  // stopwatch widget appears, selected
    ok(await page.locator(".w-stopwatch").count() === 1, "stopwatch not added");
    await page.keyboard.press(" ");                // runs the SELECTED stopwatch
    await expect(page.locator(".w-stopwatch .tDisplay")).not.toHaveText("0:00");
    // primary timer expires meanwhile
    await expect(page.locator("#alarm")).toHaveClass(/\bon\b/, { timeout: 8000 });
    ok((await dh.text("#alarmWho")) === "Timer", "who: " + await dh.text("#alarmWho"));
    await page.keyboard.press("Escape");
    await page.keyboard.press("h");
    ok(await page.evaluate(() => document.body.classList.contains("landing")), "H failed");
  });
});

/* ---------- settings ---------- */
test.describe("settings", () => {
  test("settings: rename + nudge; pick preserved; clock untouched", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:45");       // Teal Tue: 2nd ends 11:09 -> 24:00 left
    await dh.launch();
    ok((await dh.bellText()).includes("24 min"), "precondition: " + await dh.bellText());
    const clockBefore = await dh.text("#clock");
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.fill("#sNudge", "600");
    await dh.openScheds();
    await page.fill("#sGrpName1", "Teal");
    await page.click("#applyBtn");
    ok((await dh.text("#setErrors")) === "Applied.", "msg: " + await dh.text("#setErrors"));
    await page.click("#closeBtn");
    const line = await dh.bellText();
    ok(line.includes("Teal") && line.includes("2nd") && line.includes("14 min"),
      "line: " + line);
    ok(await dh.text("#clock") === clockBefore, "nudge moved clock");
  });

  test("settings: Wednesday-only group rejected; invalid atomic", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:45");
    await dh.launch();
    await page.click("#setBtn");
    await dh.openScheds();
    await page.fill("#taGrpWed3", "1st 9:20-10:03");
    await page.click("#applyBtn");
    ok((await dh.text("#setErrors")).includes("regular times too"), "err: " + await dh.text("#setErrors"));
    await page.fill("#taGrpWed3", "");
    const ta = await page.inputValue("#taGrpReg1");
    await page.fill("#taGrpReg1", ta + "\ngarbage");
    await page.click("#applyBtn");
    ok((await dh.text("#setErrors")).includes("line"), "err2: " + await dh.text("#setErrors"));
    await page.keyboard.press("Escape");
    await page.keyboard.press("h");
    const chips = await page.locator("#schedChips .chip").count();
    ok(chips === 3, "bad apply mutated groups: " + chips);
  });

  test("no-op Apply preserves explicit No bells", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.home();                             // v7.7: the landing page is skipped on a rotation-picked week
    await page.keyboard.press("3");
    await dh.launch();
    ok(await page.locator("#bellWrap").isHidden(), "precondition");
    await page.click("#setBtn");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await page.locator("#bellWrap").isHidden(), "bells resurrected");
  });

  test("settings: Tab trapped; focus restored; typing inert", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await dh.addTimer();
    await page.click("#setBtn");
    await dh.tab("timer");
    await page.click("#sPresets");
    await page.keyboard.type("5");
    const cls = (await dh.attr("#timer", "class")) || "";
    ok(!cls.includes("entry"), "digit leaked to timer");
    for (let i = 0; i < 50; i++) await page.keyboard.press("Tab");
    const inside = await page.evaluate(() =>
      !!(document.activeElement && document.activeElement.closest("#settingsCard")));
    ok(inside, "focus escaped");
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() => document.activeElement.id) === "setBtn", "focus not restored");
  });

  test("settings: flip anchor week recomputes; disabling falls to default", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-01T10:30");       // Black week Tue: 5th 10:16-11:09
    await dh.launch();
    ok((await dh.bellText()).includes("5th"), "precondition: " + await dh.bellText());
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.selectOption("#sAnchorWeek", "0");  // week of Aug 31 was actually Teal
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    let line = await dh.bellText();
    ok(line.includes("Teal Week") && line.includes("2nd"), "flip failed: " + line);
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.uncheck("#sAuto");                 // rotation off -> startup default governs
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    line = await dh.bellText();
    ok(line.includes("Teal Week"), "default not applied: " + line);
    const c = await page.evaluate(() => window.Deckhand.config);
    ok(c.bell.autoWeek === false, "autoWeek still on");
  });

  test("renaming the ANCHOR group does not disturb a No-bells pick", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-01T10:00");       // Black week auto
    await dh.home();                             // v7.7: the landing page is skipped on a rotation-picked week
    await page.keyboard.press("3");               // No bells
    await dh.launch();
    ok(await page.locator("#bellWrap").isHidden(), "precondition");
    await page.click("#setBtn");
    await dh.openScheds();
    await page.fill("#sGrpName2", "Gold Week");   // rename the anchor group
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await page.locator("#bellWrap").isHidden(), "rename resurrected bells");
  });

  test("turning rotation OFF preserves the current pick", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-01T10:00");
    await dh.home();                             // v7.7: the landing page is skipped on a rotation-picked week
    await page.keyboard.press("3");               // No bells
    await dh.launch();
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.uncheck("#sAuto");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await page.locator("#bellWrap").isHidden(), "auto-off resurrected bells");
  });
});

/* ---------- day strip ---------- */
test.describe("day strip", () => {
  test("day strip: order shown, current lit, passing shows next, toggleable", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");       // Teal Tue, in 2nd
    await dh.launch();
    ok(!(await page.locator("#dayStrip").isHidden()), "strip hidden");
    const chips = await page.locator("#dayStrip .dayChip").allTextContents();
    ok(chips.join("|") === "1st|2nd|HOWL|3rd|Lunch|4th|5th|6th",
      "order: " + chips.join("|"));
    ok((await page.locator("#dayStrip .dayChip.current").textContent()).trim() === "2nd",
      "current wrong");
    ok((await page.locator("#dayStrip .dayChip.past").allTextContents()).join("") === "1st",
      "past wrong");
    await dh.openAt("#t=2026-09-08T11:44");       // passing toward 3rd
    await dh.launch();
    ok((await page.locator("#dayStrip .dayChip.next").textContent()).trim() === "3rd",
      "next wrong");
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.uncheck("#sStrip");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await page.locator("#dayStrip").isHidden(), "strip toggle failed");
  });

  test("Black Wednesday strip runs backwards (6th first)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-02T10:30");
    await dh.launch();
    const chips = await page.locator("#dayStrip .dayChip").allTextContents();
    ok(chips.join("|") === "6th|5th|HOWL|3rd|Lunch|4th|2nd|1st",
      "order: " + chips.join("|"));
    ok((await page.locator("#dayStrip .dayChip.current").textContent()).trim() === "5th",
      "current wrong");
  });
});

/* ---------- weekend rollover (sim clock crosses midnight ~3s after boot) ---------- */
test.describe("weekend rollover", () => {
  const activeIndex = page => page.evaluate(() => window.Deckhand.activeIndex);

  test("weekend rollover adopts the new week (no manual override)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-06T23:59:57");    // Sunday night, Black week
    ok(await activeIndex(page) === 1, "precondition");
    // cross into Monday (Teal week)
    await expect.poll(() => activeIndex(page), { timeout: 8000, message: "did not adopt new week" }).toBe(0);
    await dh.home();                              // v7.7: Home rebuilds the chips
    const pressed = await page.locator('#schedChips .chip[aria-pressed="true"]').textContent();
    ok(pressed.trim() === "Teal Week", "landing chips stale: " + pressed);
  });

  test("weekend rollover respects a manual override", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-06T23:59:57");
    await dh.home();                             // v7.7: the landing page is skipped on a rotation-picked week
    await page.keyboard.press("3");               // No bells, manually
    ok(await activeIndex(page) === -1, "precondition");
    // the landing dateline ticks every 250ms — wait for Monday, then let one
    // bell paint (500ms) run its rollover check before asserting nothing moved
    await expect(page.locator("#landDate")).toHaveText(/^Monday/, { timeout: 8000 });
    await page.waitForTimeout(750);
    ok(await activeIndex(page) === -1, "rollover clobbered the override");
  });
});

/* ---------- v5.2: readability + visual timers ---------- */
test.describe("period hero", () => {
  test("period hero: big label, week tag, countdown as separate line", async ({ dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    ok(await dh.text("#periodNow") === "2nd Period", "hero: " + await dh.text("#periodNow"));
    ok(await dh.text("#weekTag") === "Teal Week", "tag: " + await dh.text("#weekTag"));
    ok((await dh.text("#bellSub")).includes("39 min until bell"), "sub: " + await dh.text("#bellSub"));
    await dh.openAt("#t=2026-09-08T11:12");       // HOWL Time (non-numeric label)
    await dh.launch();
    ok(await dh.text("#periodNow") === "HOWL Time", "hero: " + await dh.text("#periodNow"));
  });

  test("bell countdown toggle hides the ticking line, keeps the period", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.uncheck("#sCount");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    ok(await page.locator("#bellSub").isHidden(), "countdown still visible");
    ok(await dh.text("#periodNow") === "2nd Period", "period lost");
    ok(!(await page.locator("#bellBar").isHidden()), "bar should be untouched");
  });
});
