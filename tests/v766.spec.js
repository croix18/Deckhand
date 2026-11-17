/* v7.66 — the lesson list (Croix: "Deckhand pulled up today's slide, good, but I'm a little off. I need to be able to
 * select which lesson if not the current one."). The Slides card's Today's lesson follows the site's calendar; the
 * list lets the class be somewhere else on it: a lesson chosen for today (for every class of the course), or — one
 * more tap — a pace, "1 day behind", that carries to the next class days until the plan is re-dated. Three doors:
 * the stage's ⋯ → Lesson, the card's ✎ row, and "Pick a lesson" on a card with no slides today.
 * Synthetic calendars in the shape the site publishes (/m7/schedule.json, /a7/schedule.json); the slides pages are a
 * stub that says where it is. Dates are written with a time, so the suite reads the same in any time zone. */
const { test, expect, ok, stageBtn, offered } = require("./helpers");

const M7 = { v: 1, course: "m7", code: "M7", name: "Grade 7 Math", asOf: "2026-10-31", periods: [2, 4, 5],
  units: [{ unit: 10, name: "Equations and Inequalities" }, { unit: 13, name: "Numerical and Categorical Data" }],
  days: [
    { date: "2026-11-10", kind: "lesson", label: "Solving Two-Step Equations Using Properties of Equality", code: "10.05", unit: 10, slides: "slides/10.05/" },
    { date: "2026-11-11", kind: "no-class", label: "No school — Veterans Day", noSchool: true },
    { date: "2026-11-12", kind: "lesson", label: "Solving Two-Step Equations", code: "10.06", unit: 10, slides: "slides/10.06/" },
    { date: "2026-11-13", kind: "lesson", label: "Solving Equations Involving the Distributive Property", code: "10.07", unit: 10, slides: "slides/10.07/" },
    { date: "2026-11-16", kind: "lesson", label: "Solving Real-World Problems With Two-Step Equations", code: "10.08", unit: 10, slides: "slides/10.08/" },
    { date: "2026-11-17", kind: "lesson", label: "Writing and Solving Two-Step Equations From Real-World Contexts", code: "10.09+10", unit: 10, slides: "slides/10.09-10/" },
    { date: "2026-11-18", kind: "review", label: "Unit 10 review day", unit: 10 },
    { date: "2026-11-19", kind: "test", label: "Unit 10 Test — day 1", unit: 10 },
    { date: "2026-11-20", kind: "test", label: "Unit 10 Test — day 2", unit: 10 },
    { date: "2026-11-23", kind: "no-class", label: "No school — Thanksgiving break", noSchool: true },
    { date: "2026-11-30", kind: "lesson", label: "Effects of Outliers", code: "13.01", unit: 13, slides: "slides/13.01/" },
    { date: "2026-12-01", kind: "lesson", label: "Justifying and Choosing Measures of Center and Spread", code: "13.02+03", unit: 13 }
  ] };
const A7 = { v: 1, course: "a7", code: "A7", name: "Grade 7 Accelerated", asOf: "2026-10-31", periods: [1, 3],
  units: [{ unit: 6, name: "Relationships in Triangles" }, { unit: "x", name: "not a unit" }, { unit: 7 }],
  days: [
    { date: "2026-11-13", kind: "lesson", label: "Real-world coordinate-plane problems; perimeter", code: "6.06", unit: 6, slides: "slides/6.06/" },
    { date: "2026-11-16", kind: "lesson", label: "Similar triangles; indirect measurement", code: "6.07+08", unit: 6, slides: "slides/6.07-08/" },
    { date: "2026-11-17", kind: "test", label: "Unit 6 Test", unit: 6 },
    { date: "2026-11-18", kind: "lesson", label: "Thread B: angle pairs", unit: 6, slides: "slides/T-B1/", code: "<b>no</b>" }
  ] };
const DECK = '<!DOCTYPE html><title>Slides stub</title><body><h1 id="where"></h1><p id="born"></p>' +
  '<script>document.getElementById("where").textContent = location.pathname; document.getElementById("born").textContent = String(Date.now()) + "-" + Math.random();</script>';
/* the board with one Slides card already on it (no deck of its own: Today's lesson is on) */
const seeded = (dh, extra) => {
  const m = /<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/.exec(dh.SRC);
  const c = JSON.parse(m[1]);
  c.scenes[0].widgets = c.scenes[0].widgets.concat([Object.assign({ type: "embed", x: 50, y: 4, w: 48, h: 72, label: "Slides", url: "" }, extra || {})]);
  return dh.inject(dh.SRC, JSON.stringify(c));
};
const site = async (page, baseURL, cfgText, cal) => {
  const C = cal || { m7: M7, a7: A7 };
  await page.route("**/m7/schedule.json", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(C.m7) }));
  await page.route("**/a7/schedule.json", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(C.a7) }));
  await page.route(/\/(m7|a7)\/slides\//, r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: DECK }));
  await page.route(baseURL + "own-deck.html", r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: DECK }));
  if (cfgText) await page.route(baseURL + "Deckhand.html", r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: cfgText }));
};
const calendarsIn = page => expect.poll(() => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("deckhand.lessons")).courses.on.name; } catch (e) { return null; } }), { timeout: 8000 }).toBe("Grade 7 Math");
const boot = async (page, dh, hash) => {
  await dh.openAt(hash); await dh.launch();
  await calendarsIn(page);
  await page.evaluate(() => window.Deckhand.lessonPick.holdMs(0));      // (the double-tap guard has its own test)
};
/* the next day (or any other moment): the same device — its board, its calendars, its choice */
const again = async (page, dh, hash) => {
  await dh.reopen(hash); await dh.launch();
  await calendarsIn(page);
  await page.evaluate(() => window.Deckhand.lessonPick.holdMs(0));
};
const embSrc = page => page.evaluate(() => { const f = document.querySelector(".w-embed .embFrame"); return f && !f.hidden ? f.getAttribute("src") : null; });
const staged = page => page.evaluate(() => { const f = window.Deckhand.canvas.focused(); return f ? (f._entry && f._entry.type) : null; });
const stageIt = async page => { await page.evaluate(() => document.querySelector(".w-embed .wFocus").click()); await expect.poll(() => staged(page)).toBe("embed"); };
const picked = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("deckhand.lessonPick")); } catch (e) { return "unreadable"; } });
const noSlidesSaved = page => page.evaluate(() => JSON.stringify(window.Deckhand.config).indexOf("/slides/") === -1);
/* the list as it reads: "# unit" lines, and "code | title | date or Today | on" */
const listed = page => page.evaluate(() => [...document.querySelectorAll("#lsPop .lsBody > *")].map(e => e.classList.contains("lsUnit") ? "# " + e.textContent :
  [e.querySelector(".lsTag").textContent, e.querySelector(".lsLbl").textContent, (e.querySelector(".lsNow") || e.querySelector(".lsDate")).textContent, e.getAttribute("aria-pressed") === "true" ? "on" : ""].join(" | ")));
const row = (page, d) => page.locator('#lsPop .lsRow[data-d="' + d + '"]');
const toast = page => page.evaluate(() => { const t = document.getElementById("undoToast"); if (!t || t.hidden) return null; const b = t.querySelector("button"); return t.querySelector("span").textContent + (b.hidden ? "" : " [" + b.textContent + "]"); });
const shown = (page, label, dk) => page.evaluate(([l, d]) => window.Deckhand.pacing.shownFor(l, d), [label, dk]);

test.describe("v7.66 the lesson list", () => {
  test("@http the stage's ⋯ → Lesson lists the course's lessons by unit; a tap shows that lesson for the rest of the day, for every class of the course; the board's config never holds it; tomorrow is the calendar's again", async ({ page, dh, baseURL }) => {
    await site(page, baseURL, seeded(dh));
    await boot(page, dh, "#t=2026-11-16T10:30");                         // Teal Monday, 2nd period (on-level): the calendar says 10.08
    await expect.poll(() => embSrc(page)).toBe(baseURL + "m7/slides/10.08/");
    await page.click("#lockBtn");                                         // a locked board, as he teaches: choosing the slides is not editing
    ok(await page.evaluate(() => window.Deckhand.config.ui.locked === true), "the board did not lock");
    await stageIt(page);
    ok(await offered(page, "lessonStageBtn"), "Lesson not offered on the stage");
    ok(!(await offered(page, "editStageBtn")), "Change the link offered on a locked board");
    await page.click("#stageMoreBtn");
    await expect(page.locator("#lessonStageBtn .stageSub")).toHaveText("10.08");
    await page.click("#lessonStageBtn");
    await expect(page.locator("#lsPop")).toBeVisible();
    await expect(page.locator("#stageMoreMenu")).toBeHidden();
    ok(await page.evaluate(() => document.getElementById("lsPop").classList.contains("lsStage") && document.activeElement === document.getElementById("lsPop")), "the sheet is not the stage's, or does not hold the keys");
    await expect(page.locator("#lsPop .lsName")).toHaveText("Grade 7 Math");
    expect(await listed(page)).toEqual([
      "# Unit 10 · Equations and Inequalities",
      "10.05 | Solving Two-Step Equations Using Properties of Equality | Nov 10 | ",
      "10.06 | Solving Two-Step Equations | Nov 12 | ",
      "10.07 | Solving Equations Involving the Distributive Property | Nov 13 | ",
      "10.08 | Solving Real-World Problems With Two-Step Equations | Today | on",
      "10.09+10 | Writing and Solving Two-Step Equations From Real-World Contexts | Nov 17 | ",
      "# Unit 13 · Numerical and Categorical Data",
      "13.01 | Effects of Outliers | Nov 30 | "
    ]);
    await expect(page.locator("#lsPop .lsFoot")).toBeHidden();           // on the calendar: nothing to stay on
    // the line that is up changes nothing
    await row(page, "2026-11-16").click();
    await expect(page.locator("#lsPop")).toBeHidden();
    ok((await picked(page)) === null && (await toast(page)) === null, "tapping today's own lesson stored or said something");
    // Friday's lesson
    await stageBtn(page, "lessonStageBtn");
    await row(page, "2026-11-13").click();
    await expect(page.locator("#lsPop")).toBeHidden();
    await expect.poll(() => embSrc(page)).toBe(baseURL + "m7/slides/10.07/");
    await expect(page.frameLocator(".w-embed .embFrame").locator("#where")).toHaveText("/m7/slides/10.07/");
    ok((await staged(page)) === "embed", "the slides left the stage");
    expect(await toast(page)).toBe("10.07 for today [Stay 1 day behind]");
    expect(await picked(page)).toEqual({ v: 1, courses: { on: { d: "2026-11-16", pick: "2026-11-13", slides: "slides/10.07/" } } });
    ok(await noSlidesSaved(page), "the lesson was written into the board's config");
    await dh.flush();
    ok(JSON.stringify(await dh.stored()).indexOf("/slides/") === -1, "the lesson reached the device copy of the board");
    await page.click("#stageMoreBtn");
    await expect(page.locator("#lessonStageBtn .stageSub")).toHaveText("10.07");
    await page.keyboard.press("Escape");
    // the list says so too, and offers to stay
    await stageBtn(page, "lessonStageBtn");
    ok((await listed(page)).filter(r => / \| on$/.test(r)).join() === "10.07 | Solving Equations Involving the Distributive Property | Nov 13 | on", "the line that is up: " + JSON.stringify(await listed(page)));
    await expect(page.locator("#lsPop .lsKeep")).toHaveText("Stay 1 day behind");
    await expect(page.locator("#lsPop .lsKeep")).toHaveAttribute("aria-checked", "false");
    await page.click("#lsPop .lsX");
    // for the course: 4th and 5th are on-level too; 1st and 3rd (accelerated) keep the calendar's
    const s = await page.evaluate(() => ["2nd", "4th", "5th", "1st", "3rd", "HOWL Time"].map(p => { const x = window.Deckhand.pacing.shownFor(p, "2026-11-16"); return x ? x.tag + ":" + x.how : null; }));
    expect(s).toEqual(["10.07:pick", "10.07:pick", "10.07:pick", "6.07+08:calendar", "6.07+08:calendar", null]);
    await page.evaluate(() => window.Deckhand.shiftClock(80 * 60000));    // 11:50, 3rd period
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.Deckhand.settle.reset(); window.Deckhand.canvas.unfocus(); });   // the jump rang a bell; stand it down
    await expect.poll(() => embSrc(page), { timeout: 9000 }).toBe(baseURL + "a7/slides/6.07-08/");
    // tomorrow: the calendar's lesson, and the choice no longer in effect
    await again(page, dh, "#t=2026-11-17T10:30");
    await expect.poll(() => embSrc(page)).toBe(baseURL + "m7/slides/10.09-10/");
    expect((await shown(page, "2nd", "2026-11-17")).how).toBe("calendar");
  });

  test("@http Stay 1 day behind: the plan a class day over, on every class day after — a lesson, the review day's nothing, across a day off — until today's own line, the switch, or a re-dated plan ends it", async ({ page, dh, baseURL }) => {
    await site(page, baseURL, seeded(dh));
    await boot(page, dh, "#t=2026-11-16T10:30");
    await stageIt(page);
    await stageBtn(page, "lessonStageBtn");
    await row(page, "2026-11-13").click();
    expect(await toast(page)).toBe("10.07 for today [Stay 1 day behind]");
    await page.click("#undoToast button");
    expect(await toast(page)).toBe("Staying 1 day behind the calendar [Undo]");
    expect(await picked(page)).toEqual({ v: 1, courses: { on: { d: "2026-11-16", pick: "2026-11-13", slides: "slides/10.07/", keep: true, off: -1,
      anchors: [["2026-11-12", "slides/10.06/"], ["2026-11-13", "slides/10.07/"], ["2026-11-16", "slides/10.08/"], ["2026-11-17", "slides/10.09-10/"], ["2026-11-30", "slides/13.01/"]] } } });
    await expect.poll(() => embSrc(page)).toBe(baseURL + "m7/slides/10.07/");
    await page.click("#stageMoreBtn");
    await expect(page.locator("#lessonStageBtn .stageSub")).toHaveText("10.07 · 1 day behind");
    await page.keyboard.press("Escape");
    // Undo is today only again; the switch in the list turns it back on
    await page.click("#undoToast button");
    expect((await picked(page)).courses.on.keep).toBeUndefined();
    await stageBtn(page, "lessonStageBtn");
    await page.click("#lsPop .lsKeep");
    await expect(page.locator("#lsPop .lsKeep")).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#lsPop")).toBeVisible();                   // the switch does not put the sheet away
    ok((await picked(page)).courses.on.keep === true && (await picked(page)).courses.on.off === -1, "the switch did not keep the pace");
    await page.click("#lsPop .lsX");
    // every day after, by the calendar's class days (the pure answer), accelerated untouched
    const days = await page.evaluate(() => ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-23", "2026-11-30", "2026-12-01", "2026-11-21"].map(d => {
      const x = window.Deckhand.pacing.shownFor("2nd", d); return x ? [x.how, x.tag || x.label, x.url ? "slides" : "none"].join(":") : null; }));
    expect(days).toEqual(["pace:10.08:slides", "pace:10.09+10:slides", "pace:Unit 10 review day:none", "pace:Unit 10 Test — day 1:none",
      "calendar:No school — Thanksgiving break:none",                     // a day with no class has nothing to be behind on
      "pace:Unit 10 Test — day 2:none",                                    // the Monday after the break: Friday's, not the day off
      "pace:13.01:slides", null]);                                         // a Saturday: no such day, nothing chosen
    expect((await shown(page, "1st", "2026-11-17")).how).toBe("calendar");
    // Tuesday on the board: yesterday's lesson, and the stage says why
    await again(page, dh, "#t=2026-11-17T10:30");
    await expect.poll(() => embSrc(page)).toBe(baseURL + "m7/slides/10.08/");
    // Thursday: the plan a day over is the review day — no slides, and the card says which day and why
    await again(page, dh, "#t=2026-11-19T10:30");
    await expect(page.locator(".w-embed .embEmpty")).toBeVisible();
    await expect(page.locator(".w-embed .embWhy")).toHaveText("No slides today: Unit 10 review day (1 day behind the calendar)");
    await page.click(".w-embed .embPick");
    await expect(page.locator("#lsPop")).toBeVisible();
    ok(!(await page.evaluate(() => document.getElementById("lsPop").classList.contains("lsStage"))), "off the stage the sheet is centered");
    const L = await listed(page);
    ok(L.indexOf(" | Unit 10 review day | Nov 18 | on") !== -1 && L.indexOf(" | Unit 10 Test — day 1 | Today | ") !== -1, "the day in effect and today's own day are lines: " + JSON.stringify(L));
    ok(await row(page, "2026-11-18").isDisabled(), "a day with no slides that is already up can be tapped");
    await expect(page.locator("#lsPop .lsKeep")).toHaveAttribute("aria-checked", "true");
    // today's own line: back to the calendar, with Undo
    await row(page, "2026-11-19").click();
    await expect(page.locator("#lsPop")).toBeHidden();
    expect(await toast(page)).toBe("Following the calendar [Undo]");
    expect(await picked(page)).toBe(null);
    await expect(page.locator(".w-embed .embWhy")).toHaveText("No slides today: Unit 10 Test — day 1");
    await page.click("#undoToast button");
    ok((await picked(page)).courses.on.keep === true, "Undo did not bring the pace back");
    await expect(page.locator(".w-embed .embWhy")).toHaveText("No slides today: Unit 10 review day (1 day behind the calendar)");
    // the switch off on a day whose plan-a-day-over has no slides: nothing left to keep
    await page.click(".w-embed .embPick");
    await page.click("#lsPop .lsKeep");
    await expect(page.locator("#lsPop .lsFoot")).toBeHidden();
    expect(await picked(page)).toBe(null);
    await page.click("#lsPop .lsX");
    // a re-dated plan ends a pace: the calendar now has 10.08 on the 17th (the plan follows the class)
    await page.evaluate(() => localStorage.setItem("deckhand.lessonPick", JSON.stringify({ v: 1, courses: { on: { d: "2026-11-16", pick: "2026-11-13", slides: "slides/10.07/", keep: true, off: -1,
      anchors: [["2026-11-12", "slides/10.06/"], ["2026-11-13", "slides/10.07/"], ["2026-11-16", "slides/10.08/"], ["2026-11-17", "slides/10.09-10/"], ["2026-11-30", "slides/13.01/"]] } } })));
    expect((await shown(page, "2nd", "2026-11-17")).tag).toBe("10.08");
    const moved = JSON.parse(JSON.stringify(M7));
    moved.days.find(d => d.date === "2026-11-16").slides = "slides/10.07/"; moved.days.find(d => d.date === "2026-11-16").code = "10.07";
    moved.days.find(d => d.date === "2026-11-17").slides = "slides/10.08/"; moved.days.find(d => d.date === "2026-11-17").code = "10.08";
    await page.unroute("**/m7/schedule.json");
    await page.route("**/m7/schedule.json", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(moved) }));
    ok(await page.evaluate(() => window.Deckhand.pacing.refresh()), "the calendars did not refresh");
    const after = await shown(page, "2nd", "2026-11-17");
    ok(after.how === "calendar" && after.tag === "10.08", "a re-dated plan kept the old pace: " + JSON.stringify(after));
  });

  test("@http a test day: the card has no slides and offers the list; yesterday's lesson is one tap; a lesson with no code is named by its folder; a tap outside, Escape and the clicker put the sheet away; a double tap picks nothing", async ({ page, dh, baseURL }) => {
    await site(page, baseURL, seeded(dh));
    await boot(page, dh, "#t=2026-11-17T09:40");                         // Tuesday, 1st period (accelerated): Unit 6 Test
    await expect(page.locator(".w-embed .embEmpty")).toBeVisible();
    await expect(page.locator(".w-embed .embWhy")).toHaveText("No slides today: Unit 6 Test");
    await expect(page.locator(".w-embed .embPick")).toBeVisible();
    await stageIt(page);                                                  // (the bell stages an empty card too)
    await page.click(".w-embed .embPick");
    await expect(page.locator("#lsPop .lsName")).toHaveText("Grade 7 Accelerated");
    expect(await listed(page)).toEqual([
      "# Unit 6 · Relationships in Triangles",
      "6.06 | Real-world coordinate-plane problems; perimeter | Nov 13 | ",
      "6.07+08 | Similar triangles; indirect measurement | Nov 16 | ",
      " | Unit 6 Test | Today | on",
      "T-B1 | Thread B: angle pairs | Nov 18 | "                          // (its code was not a code: the folder names it)
    ]);
    // a tap outside closes it and does not reach the card under it; Escape; the clicker
    await page.mouse.click(1500, 900);
    await expect(page.locator("#lsPop")).toBeHidden();
    ok((await staged(page)) === "embed" && (await picked(page)) === null, "the tap outside reached the board");
    await page.click(".w-embed .embPick");
    await page.keyboard.press("Escape");
    await expect(page.locator("#lsPop")).toBeHidden();
    ok((await staged(page)) === "embed", "Escape took the card off the stage with the sheet");
    await stageBtn(page, "lessonStageBtn");
    await page.keyboard.press("PageDown");
    await expect(page.locator("#lsPop")).toBeHidden();
    // a double tap: the sheet comes up under the finger, and for a moment (350 ms; held long here, so a slow
    // machine reads the same) a line takes no tap and a tap outside does not put the sheet away
    await page.evaluate(() => window.Deckhand.lessonPick.holdMs(600000));
    await page.click(".w-embed .embPick");
    await row(page, "2026-11-16").click();
    ok((await picked(page)) === null && await page.locator("#lsPop").isVisible(), "the second half of a double tap picked a lesson");
    await page.mouse.click(1500, 900);
    ok(await page.locator("#lsPop").isVisible() && (await staged(page)) === "embed", "the second half of a double tap closed the sheet, or reached the board");
    await page.evaluate(() => window.Deckhand.lessonPick.holdMs(0));
    await row(page, "2026-11-16").click();
    await expect.poll(() => embSrc(page)).toBe(baseURL + "a7/slides/6.07-08/");
    expect(await toast(page)).toBe("6.07+08 for today [Stay 1 day behind]");
    await expect(page.locator(".w-embed .embWhy")).toBeHidden();
    // ahead reads as ahead
    await stageBtn(page, "lessonStageBtn");
    await row(page, "2026-11-18").click();
    expect(await toast(page)).toBe("T-B1 for today [Stay 1 day ahead]");
    await expect.poll(() => embSrc(page)).toBe(baseURL + "a7/slides/T-B1/");
  });

  test("@http the ✎ row names the lesson and opens the list; Today's lesson off, a card with its own deck and a class with no course have no list; the reason line follows the class", async ({ page, dh, baseURL }) => {
    await site(page, baseURL, seeded(dh));
    await boot(page, dh, "#t=2026-11-17T09:40");                         // 1st period, the test day
    await page.click(".w-embed .wEdit");
    await expect(page.locator(".w-embed .embLs")).toHaveText("Lesson ▾");
    await page.click(".w-embed .embLs");
    await expect(page.locator("#lsPop")).toBeVisible();
    await row(page, "2026-11-16").click();
    await expect(page.locator(".w-embed .embLs")).toHaveText("6.07+08 ▾");
    await expect(page.locator(".w-embed .embIn")).toHaveValue(baseURL + "a7/slides/6.07-08/");
    ok(await page.evaluate(() => document.querySelector(".w-embed .embIn").readOnly), "the chosen lesson's address is editable");
    // the row's own Reload is still Reload (it is found by its class; the lesson's button must not be taken for it)
    const born = await page.frameLocator(".w-embed .embFrame").locator("#born").textContent();
    await page.click('.w-embed .embRow button[aria-label="Reload"]');
    await expect.poll(async () => (await page.frameLocator(".w-embed .embFrame").locator("#born").textContent().catch(() => born)) !== born, { timeout: 8000 }).toBe(true);
    ok(!(await page.evaluate(() => window.Deckhand.lessonPick.isOpen())), "Reload opened the list");
    // off: no list anywhere; the stage does not offer it
    await page.click(".w-embed .embTodayCk");
    await expect(page.locator(".w-embed .embLs")).toBeHidden();
    await expect(page.locator(".w-embed .embPick")).toBeHidden();
    await stageIt(page);
    ok(!(await offered(page, "lessonStageBtn")), "Lesson offered with Today's lesson off");
    await stageBtn(page, "unfocusBtn");
    await page.click(".w-embed .embTodayCk");
    await expect(page.locator(".w-embed .embLs")).toBeVisible();
    // HOWL Time has no course: the last class's reason line and button go with it (within a tick of the card)
    await page.evaluate(() => localStorage.removeItem("deckhand.lessonPick"));
    await page.evaluate(() => document.dispatchEvent(new CustomEvent("deckhand:lessons")));
    await expect(page.locator(".w-embed .embWhy")).toHaveText("No slides today: Unit 6 Test");
    await page.evaluate(() => window.Deckhand.shiftClock(100 * 60000));   // 11:20, HOWL Time
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.Deckhand.settle.reset(); window.Deckhand.canvas.unfocus(); });
    await expect(page.locator(".w-embed .embWhy")).toBeHidden({ timeout: 9000 });
    await expect(page.locator(".w-embed .embPick")).toBeHidden();
    ok(!(await page.evaluate(() => window.Deckhand.pacing.canPick("HOWL Time"))) && (await page.evaluate(() => window.Deckhand.pacing.canPick("3rd"))), "canPick");
    ok((await page.evaluate(() => window.Deckhand.pacing.pickList("HOWL Time", "2026-11-17"))) === null, "a list for a class with no course");
    // the list is the class's it was opened for: when the next class comes in, it goes
    await page.evaluate(() => window.Deckhand.shiftClock(30 * 60000));    // 11:50, 3rd period (accelerated again)
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.Deckhand.settle.reset(); window.Deckhand.canvas.unfocus(); });
    await expect(page.locator(".w-embed .embPick")).toBeVisible({ timeout: 9000 });
    await page.evaluate(() => document.querySelector(".w-embed")._entry.api.pickLesson());   // (the bell's count left the clock over the card)
    await expect(page.locator("#lsPop")).toBeVisible();
    await expect(page.locator("#lsPop .lsName")).toHaveText("Grade 7 Accelerated");
    await page.evaluate(() => window.Deckhand.shiftClock(90 * 60000));    // 1:20, 4th period (on-level)
    await expect(page.locator("#lsPop")).toBeHidden({ timeout: 4000 });
    expect(await picked(page)).toBe(null);
  });

  test("@http a card holding its own deck: no Lesson on the stage until Today's lesson is ticked", async ({ page, dh, baseURL }) => {
    const own = baseURL + "own-deck.html";
    await site(page, baseURL, seeded(dh, { url: own }));
    await boot(page, dh, "#t=2026-11-16T10:30");
    await expect.poll(() => embSrc(page)).toBe(own);
    await stageIt(page);
    ok(!(await offered(page, "lessonStageBtn")), "Lesson offered for a deck of his own");
    ok((await page.evaluate(() => document.querySelector(".w-embed")._entry.api.lesson())) === null, "api.lesson()");
  });

  test("@http a weekend: no day on the calendar, but a lesson can be put up; nothing to stay on, so the toast is Undo", async ({ page, dh, baseURL }) => {
    await site(page, baseURL, seeded(dh));
    await boot(page, dh, "#t=2026-11-14T12:00");                         // Saturday; the next class is Monday's 1st (accelerated)
    await expect(page.locator(".w-embed .embEmpty")).toBeVisible();
    await expect(page.locator(".w-embed .embWhy")).toBeHidden();
    await page.click(".w-embed .embPick");
    const L = await listed(page);
    ok(L.indexOf(" | No class today | Today | on") !== -1, "today's line on a day the calendar does not have: " + JSON.stringify(L));
    await row(page, "2026-11-13").click();
    await expect.poll(() => embSrc(page)).toBe(baseURL + "a7/slides/6.06/");
    expect(await toast(page)).toBe("6.06 for today [Undo]");
    await expect(page.locator(".w-embed .embPick")).toBeHidden();         // (the card is showing slides now: the button is the empty state's)
    await page.click("#undoToast button");
    expect(await picked(page)).toBe(null);
    await expect(page.locator(".w-embed .embEmpty")).toBeVisible();
  });

  test("@http what is stored is checked before it is used: junk, a lesson the calendar has moved, a pace of zero or a month are all the calendar's day; the lessons copy carries codes, units and names, and only real ones", async ({ page, dh, baseURL }) => {
    await site(page, baseURL, seeded(dh));
    await boot(page, dh, "#t=2026-11-16T10:30");
    const L = await page.evaluate(() => JSON.parse(localStorage.getItem("deckhand.lessons")));
    expect(L.courses.on.days.find(d => d.d === "2026-11-17")).toEqual({ d: "2026-11-17", kind: "lesson", label: "Writing and Solving Two-Step Equations From Real-World Contexts", slides: "slides/10.09-10/", code: "10.09+10", unit: 10 });
    expect(L.courses.on.days.find(d => d.d === "2026-11-11")).toEqual({ d: "2026-11-11", kind: "no-class", label: "No school — Veterans Day", slides: null });
    expect(L.courses.acc.days.find(d => d.d === "2026-11-18")).toEqual({ d: "2026-11-18", kind: "lesson", label: "Thread B: angle pairs", slides: "slides/T-B1/", unit: 6 });   // "<b>no</b>" is not a code
    ok(L.courses.on.name === "Grade 7 Math" && L.courses.acc.name === "Grade 7 Accelerated", "names");
    expect(L.courses.on.units).toEqual({ 10: "Equations and Inequalities", 13: "Numerical and Categorical Data" });
    expect(L.courses.acc.units).toEqual({ 6: "Relationships in Triangles" });
    const tries = [
      "not json", "{}", JSON.stringify({ v: 2, courses: { on: { d: "2026-11-16", pick: "2026-11-13", slides: "slides/10.07/" } } }),
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-16", pick: "2026-11-13", slides: "slides/10.06/" } } }),             // not what is on that day
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-16", pick: "2026-11-18", slides: "slides/x/" } } }),                 // a day with no slides
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-15", pick: "2026-11-13", slides: "slides/10.07/" } } }),             // yesterday's choice
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-16", pick: "2026-02-30", slides: "slides/10.07/" } } }),
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-16", pick: "2026-11-13", slides: "../x/" } } }),
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-13", pick: "2026-11-12", slides: "slides/10.06/", keep: true, off: 0, anchors: [["2026-11-12", "slides/10.06/"]] } } }),
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-13", pick: "2026-11-12", slides: "slides/10.06/", keep: true, off: -30, anchors: [["2026-11-12", "slides/10.06/"]] } } }),
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-13", pick: "2026-11-12", slides: "slides/10.06/", keep: true, off: -1 } } }),
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-13", pick: "2026-11-12", slides: "slides/10.06/", keep: true, off: -1, anchors: [["2026-11-12", "slides/9.99/"]] } } }),
      JSON.stringify({ v: 1, courses: { on: { d: "2026-11-13", pick: "2026-11-12", slides: "slides/10.06/", keep: "yes" } } }),
      '{"v":1,"courses":{"__proto__":{"d":"2026-11-16","pick":"2026-11-13","slides":"slides/10.07/"},"on":null}}'
    ];
    for (const t of tries){
      const r = await page.evaluate(v => { localStorage.setItem("deckhand.lessonPick", v); const x = window.Deckhand.pacing.shownFor("2nd", "2026-11-16"); return x.how + ":" + x.tag; }, t);
      ok(r === "calendar:10.08", "a stored value was believed: " + t + " → " + r);
    }
    // and one that is real is used (a pace set on Friday: Monday shows Friday's)
    const good = await page.evaluate(() => { localStorage.setItem("deckhand.lessonPick", JSON.stringify({ v: 1, courses: { on: { d: "2026-11-13", pick: "2026-11-12", slides: "slides/10.06/", keep: true, off: -1, anchors: [["2026-11-12", "slides/10.06/"], ["2026-11-13", "slides/10.07/"]] } } })); const x = window.Deckhand.pacing.shownFor("2nd", "2026-11-16"); return x.how + ":" + x.tag; });
    expect(good).toBe("pace:10.07");
    // pick() refuses what is not a lesson with slides, and a class with no course; keep() only keeps a choice a class day apart
    const r = await page.evaluate(() => { localStorage.removeItem("deckhand.lessonPick"); const P = window.Deckhand.pacing;
      return [P.pick("2nd", "2026-11-16", "2026-11-18"), P.pick("2nd", "2026-11-16", "2026-12-01"), P.pick("2nd", "2026-11-16", "2026-07-04"), P.pick("HOWL Time", "2026-11-16", "2026-11-13"),
              P.keep("2nd", "2026-11-16", true), localStorage.getItem("deckhand.lessonPick")]; });
    expect(r).toEqual([false, false, false, false, false, null]);
  });

  test("file://: no list — no button, no Lesson on the stage, nothing chosen or stored", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-16T10:30");
    await dh.launch();
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await expect(page.locator(".w-embed .embPick")).toBeHidden();
    await page.click(".w-embed .wEdit");
    await expect(page.locator(".w-embed .embLs")).toBeHidden();
    await stageIt(page);
    ok(!(await offered(page, "lessonStageBtn")), "Lesson offered on file://");
    const r = await page.evaluate(() => { const P = window.Deckhand.pacing; return [P.shownFor("2nd", "2026-11-16"), P.canPick("2nd"), P.pickList("2nd", "2026-11-16"), P.pick("2nd", "2026-11-16", "2026-11-13"), P.keep("2nd", "2026-11-16", true), localStorage.getItem("deckhand.lessonPick")]; });
    expect(r).toEqual([null, false, null, false, false, null]);
    ok(!(await page.evaluate(() => window.Deckhand.lessonPick.isOpen())), "the sheet opened");
  });
});
