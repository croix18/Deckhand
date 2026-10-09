/* v7.11.5 — the hardening pass (Croix: "run through all of the code and harden it").
 * Three review passes over the file found ~40 defects; these pin the ones a
 * teacher would meet: a defaults board that must never autosave over the
 * device, bells that respect "Weeks with no school", labels that survive a
 * reload, a renamed default week, M as a real setting, the picker's un-mark,
 * the sea under Seasonal touches Off and under motion Off, a stopwatch as a
 * working room, and the timer's end armed as one timeout. */
const { test, expect, ok } = require("./helpers");
const path = require("path"), fs = require("fs");

test.describe("v7.11.5 hardening", () => {
  test("v7.11.5: a board built from DEFAULTS never autosaves; a device copy is quarantined once", async ({ page, dh }) => {
    // this file's own config block is junk and there is no device copy → defaults, suspended
    const pg = await dh.loadFixture("tmp_broken.html", "{ this is not json");
    ok((await pg.evaluate(() => window.Deckhand.configSource)) === "defaults", "not on defaults");
    await pg.evaluate(() => { window.Deckhand.config.ownerName = "Edited"; });
    await pg.evaluate(() => window.Deckhand.flush());
    await pg.waitForTimeout(300);
    ok((await pg.evaluate(() => localStorage.getItem("deckhand.config"))) === null, "the defaults board was written to the device");
    // the "changed in another window" × works
    await pg.evaluate(() => { document.getElementById("verNudge").hidden = false; document.getElementById("verNudgeKeep").click(); });
    ok(await pg.evaluate(() => document.getElementById("verNudge").hidden), "the banner's × did nothing");
    await pg.close();
    // an unreadable device copy is set aside ONCE, not on every boot
    await dh.openAt("#t=2026-09-28T10:30");
    await page.evaluate(() => { localStorage.setItem("deckhand.config", "{{unreadable"); });
    await dh.reopen("#t=2026-09-28T10:30");
    await dh.reopen("#t=2026-09-28T10:30");
    const bad = await page.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf("deckhand.config.bad-") === 0).length);
    ok(bad === 1, "quarantined " + bad + " times");
    await page.evaluate(() => { Object.keys(localStorage).forEach(k => { if (k.indexOf("deckhand.config.bad-") === 0) localStorage.removeItem(k); }); localStorage.removeItem("deckhand.config"); });
  });

  test("v7.11.5: a week with no school has no bells — the Friday before Thanksgiving points at the Monday after", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-20T16:00");           // Friday Nov 20, after school
    const st = await page.evaluate(() => window.Deckhand.bellStatusAt("2026-11-20T16:00"));
    ok(st.type === "next" && /Mon/.test(st.when), "next class: " + JSON.stringify(st));
    ok(st.remainMs > 9 * 86400000, "the next class should be ten days out, not three: " + st.remainMs);
    const wk = await page.evaluate(() => window.Deckhand.bellStatusAt("2026-11-25T10:30").type);
    ok(wk !== "in", "bells rang on Thanksgiving week: " + wk);
    // winter: two skip weeks in a row still resolve (a three-week look-ahead)
    const dec = await page.evaluate(() => window.Deckhand.bellStatusAt("2026-12-18T16:00"));
    ok(dec.type === "next" && dec.remainMs > 16 * 86400000, "winter break did not resolve: " + JSON.stringify(dec));
  });

  test("v7.11.5: Settings — a 21-character label is trimmed, the renamed default week stays the default, an impossible date is refused, M survives Apply", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await page.keyboard.press("m");                     // mute
    ok(!(await page.evaluate(() => window.Deckhand.config.sound.enabled)), "M did not write the setting");
    await page.click("#setBtn");
    await dh.tab("bells");
    ok(!(await page.isChecked("#sSound")), "Settings shows sound on while muted");
    await page.fill("#sSkipWeeks", "2026-11-31");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toContainText("is not a date");
    await page.fill("#sSkipWeeks", "2026-11-23");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    ok(!(await page.evaluate(() => window.Deckhand.config.sound.enabled)), "Apply un-muted the board");
    await page.click("#closeBtn");
    // a text-mode label past 20 characters ends trimmed, so the roster join survives a reload
    const trimmed = await page.evaluate(() => {
      const c = window.Deckhand.config;
      c.bell.groups[0].regular = [{ label: "Advanced Math Class ", start: "9:20", end: "10:13" }];
      return c.bell.groups[0].regular[0].label;
    });
    ok(trimmed === "Advanced Math Class ", "setup");
    await dh.flush();
    await dh.reopen("#t=2026-09-28T10:30");
    ok((await page.evaluate(() => window.Deckhand.config.bell.groups[0].regular[0].label)) === "Advanced Math Class", "the trailing space survived sanitize");
    // rename the default week: the default follows the card
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.evaluate(() => { window.Deckhand.config.bell.autoWeek = false; });   // the default matters only without the rotation
    await page.click("#closeBtn"); await page.click("#setBtn"); await dh.tab("bells");
    await page.selectOption("#sDefault", { index: 2 });   // options: none, Teal Week, Black Week — pick Black (card 2)
    const def = await page.inputValue("#sDefault");
    await dh.openScheds();                                 // the week-type cards fold open
    await page.fill("#sGrpName2", "Renamed Week");        // rename that same card
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    ok((await page.evaluate(() => window.Deckhand.config.bell.defaultGroup)) === "Renamed Week", "the default (" + def + ") did not follow the rename: " + await page.evaluate(() => window.Deckhand.config.bell.defaultGroup));
    await page.click("#closeBtn");
  });

  test("v7.11.5: the picker puts an un-marked student back into the round", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "1st", names: ["Ava", "Ben", "Cal", "Dan"] }]; });
    await dh.addW("addPickerBtn");
    await page.selectOption(".w-picker .pkSel", "1st");
    const pickOne = async () => { await page.click(".w-picker .pkGo"); await page.waitForTimeout(1100); return page.textContent(".w-picker .pkName"); };
    let first = await pickOne();
    while (first === "Ava"){                                                // Ava must still be IN the pool when she is marked out
      for (let i = 0; i < 3; i++) await pickOne();                          // finish this round
      first = await pickOne();
    }
    const picks = [first];                                                  // the round is under way with Ava still to come
    await page.evaluate(() => window.Deckhand.absent.toggle("1st", "Ava"));  // out mid-round
    picks.push(await pickOne());                                            // never Ava
    ok(picks[1] !== "Ava", "picked a student marked out");
    await page.evaluate(() => window.Deckhand.absent.toggle("1st", "Ava"));  // back
    picks.push(await pickOne()); picks.push(await pickOne());
    ok(picks.filter(n => n === "Ava").length === 1, "Ava should be called exactly once in the round: " + picks.join());
    ok(/^0 of 4 left/.test(await page.textContent(".w-picker .pkLeft")), "the round should end after four picks, not restart early: " + await page.textContent(".w-picker .pkLeft"));
  });

  test("v7.11.5: the sea — Seasonal touches Off means no Halloween rules; motion Off ends the show; a stopwatch is a working room", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-30T10:30");
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.ui.season = "off"; window.Deckhand.season.apply(); });
    const ev = await page.evaluate(() => window.Deckhand.seaModule.plan("2026-10-30", 2, 50, 5, null).events.map(e => e.act));
    ok(ev[0] !== "castaway" && !ev.includes("ghost") && !ev.includes("bats"), "October rules leaked with season off: " + ev.join());
    await page.evaluate(() => { window.Deckhand.config.ui.season = "auto"; window.Deckhand.season.apply(); window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });
    ok(await page.evaluate(() => window.Deckhand.sea("bats")), "bats refused");
    await expect(page.locator("#sea-bats")).toHaveClass(/go/);
    await page.click("#setBtn");
    await page.selectOption("#sMotion", "off");
    await page.click("#applyBtn");
    await page.click("#closeBtn");
    await expect(page.locator("#sea-bats")).not.toHaveClass(/go/);           // motion Off ends the show at once
    // a running stopwatch counts as a working room for the director
    await dh.addW("addWatchBtn");                        // appears selected
    await page.keyboard.press(" ");                       // runs it
    await expect(page.locator(".w-stopwatch .tDisplay")).not.toHaveText("0:00");
    ok(await page.evaluate(() => window.Deckhand.canvas.timerRunning()), "a running stopwatch is not a working room");
    await page.keyboard.press(" ");
  });

  test("v7.11.5: the timer arms its end as one timeout, cleared by pause and reset", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addTimer();
    await page.keyboard.press("3"); await page.keyboard.press("Enter");   // 3 seconds
    await page.waitForTimeout(3600);
    await expect(page.locator("#alarm")).toHaveClass(/on/);
    await page.keyboard.press("Escape");
  });
});

test.describe("v7.11.6", () => {
  test("v7.11.6: +1 on the Scoreboard and the Tally keeps the number inside its card (the `.pop` class collided with the popover sheets since 7.2)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addW("addScoreBtn");
    await page.click(".w-score .scB:not(.minus) >> nth=0");
    const inside = await page.evaluate(() => {
      const n = document.querySelector(".w-score .scScore"), t = n.closest(".scTeam");
      const a = n.getBoundingClientRect(), b = t.getBoundingClientRect();
      return n.textContent === "1" && a.top >= b.top && a.bottom <= b.bottom && a.left >= b.left && a.right <= b.right;
    });
    ok(inside, "the score left its team card after +1");
    await dh.addW("addTallyBtn");
    await page.click(".w-tally .scB:not(.minus) >> nth=0");
    const inside2 = await page.evaluate(() => {
      const n = document.querySelector(".w-tally .tlCount"), t = n.closest(".tlCard");
      const a = n.getBoundingClientRect(), b = t.getBoundingClientRect();
      return n.textContent === "1" && a.top >= b.top && a.bottom <= b.bottom;
    });
    ok(inside2, "the tally count left its card after +1");
  });
});

/* v7.12 — "Read from the back row" (the tools audit, §3 items 1–8) */
test.describe("v7.12", () => {
  test("v7.12: the spinner fits its card, the tallies stack face-over-count, a reset button with Undo on the probability kit, the scoreboard and the tally", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addW("addSpinBtn");
    const fit = await page.evaluate(() => {
      const w = document.querySelector(".w-spin"), wheel = w.querySelector(".spWrap"), go = w.querySelector(".spGo");
      const a = w.getBoundingClientRect(), b = wheel.getBoundingClientRect(), c = go.getBoundingClientRect();
      const strip = w.querySelector(".strip").getBoundingClientRect();
      return b.top >= strip.bottom - 1 && c.bottom <= a.bottom - 6;
    });
    ok(fit, "the spinner's wheel or button leaves the card");
    // each tally entry is a column: the face, then the count — never "8 1"
    await dh.addW("addDiceBtn");
    await page.click(".w-dice .btn >> nth=0");
    await page.waitForTimeout(900);
    const col = await page.evaluate(() => { const s = document.querySelector(".w-dice .prTally > span"); return s && getComputedStyle(s).flexDirection === "column" && !/ /.test(s.firstChild.textContent); });
    ok(col, "the dice tally is not a column");
    // Clear with Undo
    await page.click(".w-dice .tReset");
    await expect(page.locator("#undoToast")).toBeVisible();
    ok((await page.evaluate(() => document.querySelector(".w-dice")._entry.api.tally().rolls)) === 0, "Clear did not clear");
    await page.click("#undoToast button");
    ok((await page.evaluate(() => document.querySelector(".w-dice")._entry.api.tally().rolls)) === 1, "Undo did not restore the roll");
    await dh.addW("addScoreBtn");
    await page.click(".w-score .scB:not(.minus) >> nth=0");
    await page.click(".w-score .tReset");
    ok((await page.textContent(".w-score .scScore >> nth=0")) === "0", "Reset scores did not reset");
    await page.click("#undoToast button");
    ok((await page.textContent(".w-score .scScore >> nth=0")) === "1", "Undo did not restore the score");
    // locked: the team-count chips and the rename hide; +1 still works
    await page.click("#lockBtn");
    ok(!(await page.isVisible(".w-score .scChips")), "team-count chips showed while locked");
    await page.click(".w-score .scName >> nth=0");
    ok(!(await page.$(".w-score .scNameInput")), "rename opened while locked");
    await page.click(".w-score .scB:not(.minus) >> nth=0");
    ok((await page.textContent(".w-score .scScore >> nth=0")) === "2", "+1 stopped working while locked");
    await dh.unlock();
  });

  test("v7.12: group cards list one name per line at a readable size; the picker's roster message survives the lock; one name per tool; new cards avoid the clock's digits", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "1st", names: ["Ava","Ben","Cal","Dee","Eli","Fay","Gus"] }]; });
    await dh.addW("addGroupsBtn");
    await page.selectOption(".w-groups .pkSel", "1st");
    await page.click(".w-groups .gpGo");
    const g = await page.evaluate(() => { const c = document.querySelector(".w-groups .gpCard span"); return { fs: parseFloat(getComputedStyle(c).fontSize), block: getComputedStyle(c).display }; });
    ok(g.fs >= 18 && g.block === "block", "group names are not readable lines: " + JSON.stringify(g));
    ok((await page.textContent(".w-groups .gpGo")) === "Shuffle", "the button did not become Shuffle");
    // the picker with no roster for the period says so, locked or not
    await dh.addW("addPickerBtn");
    await page.selectOption(".w-picker .pkSel", "1st");
    await page.evaluate(() => { window.Deckhand.config.rosters = []; });
    await page.waitForTimeout(5200);   // the 5 s refresh
    await page.click("#lockBtn");
    await expect(page.locator(".w-picker .pkEmpty")).toBeVisible();
    await expect(page.locator(".w-picker .pkEmpty")).toHaveText("Add class rosters in Settings");
    await dh.unlock();
    // one name per tool: a second Name Picker is "Name Picker 2" on the card
    await dh.addW("addPickerBtn");
    const cap = await page.evaluate(() => Array.from(document.querySelectorAll(".w-picker")).map(w => w.getAttribute("data-label") || "").join("|"));
    ok(/Name Picker 2/.test(cap), "the second picker's caption: " + cap);
    // a board saved with the old default label is not a custom name
    const legacy = await page.evaluate(() => { const c = window.Deckhand.config; c.scenes[0].widgets.push({ type: "text", x: 60, y: 60, w: 30, h: 30, label: "Note", html: "" }); window.Deckhand.canvas.loadScene(); return !!document.querySelector('.w-text.wNamed'); });
    ok(!legacy, '"Note" from an old board showed as a custom caption');
    // new cards spawn in a corner, never on the clock's digits
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addW("addTimerBtn");
    const clear = await page.evaluate(() => {
      const t = document.querySelector(".w-timer").getBoundingClientRect(), d = document.getElementById("clock");
      const b = d.getBoundingClientRect();
      return { ok: !(t.left < b.right && t.right > b.left && t.top < b.bottom && t.bottom > b.top), t: [t.left, t.top, t.right, t.bottom], b: [b.left, b.top, b.right, b.bottom] };
    });
    ok(clear.ok, "the new card covers the clock's digits: " + JSON.stringify(clear));
  });
});

/* v7.13 — "Touch and survival" (tools audit §3, items 9–15, Croix: "Do it!"). */
test.describe("v7.13", () => {
  const toolLayout = page => page.evaluate(() => {
    const ws = window.Deckhand.config.scenes[0].widgets, pos = { dice: [1, 2, 30, 46], coin: [32, 2, 22, 40], spin: [55, 2, 22, 50], cards: [78, 2, 21, 50], picker: [1, 50, 30, 45], groups: [32, 50, 40, 45], draw: [1, 2, 40, 60], work: [42, 2, 28, 45], meter: [71, 2, 28, 45], music: [42, 48, 28, 30], event: [71, 48, 28, 30], timer: [1, 63, 40, 34] };
    ws.forEach(w => { if (pos[w.type]) [w.x, w.y, w.w, w.h] = pos[w.type]; });
    window.Deckhand.canvas.loadScene();
  });
  const rosters = page => page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee","Eli","Fay","Gus","Hal"] }]; });

  test("v7.13: the timer by touch — a tap on the face opens a keypad, digits and Start run it, the chips hide while it runs, presets take seconds", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addTimerBtn");
    await page.keyboard.press("Escape");
    const w = page.locator(".w-timer");
    await w.locator(".tDisplay:visible, .visWrap:visible").first().click();
    await expect(w).toHaveClass(/padOpen/);
    ok(await w.locator(".tChips").isHidden(), "the chips stayed under the keypad");
    for (const k of ["1", "3", "0"]) await w.locator('.tPad [data-k="' + k + '"]').click();
    await expect(w.locator(".tDisplay")).toHaveText("1:30");
    await w.locator('.tPad [data-k="bs"]').click();
    await expect(w.locator(".tDisplay")).toHaveText("0:13");
    await w.locator('.tPad [data-k="0"]').click();
    await w.locator('.tPad [data-k="go"]').click();
    await expect(w).toHaveClass(/running/);
    await expect(w).not.toHaveClass(/padOpen/);
    ok((await w.locator(".tChips").evaluate(e => getComputedStyle(e).visibility)) === "hidden", "the chips showed while running");
    await page.keyboard.press("r");
    await expect(w).not.toHaveClass(/running/);
    // seconds presets: 0:30 parses, the chip reads m:ss, the ⏱ menu reads words
    const parsed = await page.evaluate(() => ["0:30", "1:30", "3", "0.5", "x", "0:05"].map(s => window.Deckhand.parsePresetToken ? window.Deckhand.parsePresetToken(s) : null));
    if (parsed[0] !== null) ok(parsed.join() === "0.5,1.5,3,0.5,,0.08333333333333333", "preset parsing: " + parsed.join());
    await page.evaluate(() => { window.Deckhand.config.timer.presetsMinutes = [0.5, 1, 3]; window.Deckhand.canvas.loadScene(); });
    await expect(page.locator(".w-timer .tChips .chip").first()).toHaveText("0:30");
    await page.locator(".w-timer .tChips .chip").first().click();
    await expect(page.locator(".w-timer .tDisplay")).toHaveText("0:30");
    // the ring's last ten seconds carry no coral band (the ring itself goes coral)
    await page.evaluate(() => { window.Deckhand.config.timer.style = "ring"; window.Deckhand.canvas.loadScene(); });
    const band = await page.evaluate(() => { const w = document.querySelector(".w-timer .visWrap"); w.classList.add("low"); return getComputedStyle(w.querySelector(".visDigits")).backgroundImage + "|" + getComputedStyle(w.querySelector(".visDigits")).backgroundColor; });
    ok(/none\|rgba\(0, 0, 0, 0\)/.test(band), "the ring's low band is back: " + band);
  });

  test("v7.13: work survives a scene switch — the picker's round (one per class, shared by every picker), the groups, the tallies under dice/coin/spinner/cards, the sketch, the meter's round by hand", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await rosters(page);
    for (const id of ["addDiceBtn","addCoinBtn","addSpinBtn","addCardsBtn","addPickerBtn","addGroupsBtn"]){ await dh.addW(id); await page.keyboard.press("Escape"); }
    await toolLayout(page);
    await page.click('.w-dice .chip[data-batch="100"]');
    await page.click('.w-coin .chip[data-batch="10"]');
    await page.click('.w-spin .chip[data-batch="10"]');
    await page.click('.w-cards .chip[data-batch="10"]');
    await page.selectOption(".w-picker .pkSel", "5th");
    await page.click(".w-picker .pkGo"); await page.waitForTimeout(1100);
    await page.click(".w-picker .pkGo"); await page.waitForTimeout(1100);
    await page.selectOption(".w-groups .pkSel", "5th");
    await page.click(".w-groups .gpGo");
    const state = () => page.evaluate(() => ({
      dice: document.querySelector(".w-dice")._entry.api.tally().rolls, coin: document.querySelector(".w-coin")._entry.api.tally().flips,
      spin: document.querySelector(".w-spin")._entry.api.tally().spins, cards: document.querySelector(".w-cards")._entry.api.tally().draws,
      pk: document.querySelector(".w-picker .pkName").textContent + "/" + document.querySelector(".w-picker .pkLeft").textContent,
      gp: [...document.querySelectorAll(".w-groups .gpCard")].map(c => c.textContent).join("|"), gpBtn: document.querySelector(".w-groups .gpGo").textContent }));
    const before = await state();
    ok(before.dice === 100 && before.coin === 10 && before.spin === 10 && before.cards === 10, "batches: " + JSON.stringify(before));
    ok(/6 of 8 left/.test(before.pk) && before.gp.length > 20 && before.gpBtn === "Shuffle", "round/groups: " + JSON.stringify(before));
    const scenes = await page.evaluate(() => window.Deckhand.config.scenes.map(s => s.name));
    await page.selectOption("#sceneSel", scenes[1]); await page.waitForTimeout(300);
    await page.selectOption("#sceneSel", scenes[0]); await page.waitForTimeout(500);
    ok(JSON.stringify(await state()) === JSON.stringify(before), "a scene switch lost work: " + JSON.stringify(await state()));
    // a second picker on the board continues the SAME round for 5th
    await dh.addW("addPickerBtn"); await page.keyboard.press("Escape");
    await page.selectOption(".w-picker >> nth=1 >> .pkSel", "5th");
    await expect(page.locator(".w-picker >> nth=1 >> .pkLeft")).toHaveText(/6 of 8 left/);
    // the batch has Undo
    await page.click('.w-dice .chip[data-batch="10"]');
    ok((await page.evaluate(() => document.querySelector(".w-dice")._entry.api.tally().rolls)) === 110, "the batch did not add");
    await page.click("#undoToast button");
    ok((await page.evaluate(() => document.querySelector(".w-dice")._entry.api.tally().rolls)) === 100, "Undo did not take the batch back");
    // tomorrow is a clean sheet (the store is for today only)
    await dh.openAt("#t=2026-09-30T10:30");
    await dh.launch();
    ok((await page.evaluate(() => document.querySelectorAll(".w-dice").length)) === 0, "precondition: a fresh boot");
  });

  test("v7.13: the probability kit shows relative frequency against theory — a bar per outcome with the expected share as a line; the two-dice triangle", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addDiceBtn"); await page.keyboard.press("Escape");
    await toolLayout(page);
    const bars = await page.evaluate(() => [...document.querySelectorAll(".w-dice .prTally > span")].filter(s => s.querySelector(".prBar")).map(s => ({ k: [...s.childNodes].find(n => n.nodeType === 3).textContent, tick: parseFloat(s.querySelector(".prBar em").style.bottom), fill: parseFloat(s.querySelector(".prBar u").style.height) })));
    ok(bars.length === 11 && bars[0].k === "2" && bars[10].k === "12", "two dice should list every total 2–12: " + JSON.stringify(bars));
    ok(bars[5].tick > bars[0].tick && bars[5].tick > bars[10].tick && Math.abs(bars[0].tick - bars[10].tick) < 0.01, "the theoretical line is not the triangle: " + JSON.stringify(bars));
    ok(bars.every(b => b.fill === 0), "bars filled before any roll");
    await page.click('.w-dice .chip[data-batch="100"]');
    const after = await page.evaluate(() => [...document.querySelectorAll(".w-dice .prTally > span")].filter(s => s.querySelector(".prBar")).map(s => parseFloat(s.querySelector(".prBar u").style.height)));
    ok(after.some(f => f > 0) && after.every(f => f <= 100), "bars after 100 rolls: " + after.join());
    // one die: six equal ticks and percentages (eleven columns drop the percent for room)
    await page.click('.w-dice .chip[data-n="1"]');
    await page.click('.w-dice .chip[data-batch="10"]');
    ok(/\d+%/.test(await page.textContent(".w-dice .prTally")), "no percentages");
    const one = await page.evaluate(() => [...document.querySelectorAll(".w-dice .prTally > span .prBar em")].map(e => e.style.bottom));
    ok(one.length === 6 && new Set(one).size === 1, "one die: " + one.join());
  });

  test("v7.13: the Noise Meter plays by hand when the mic is refused — the streak runs, ✖ and Space add a strike (with Undo), the record and the per-period tally still count", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addMeterBtn"); await page.keyboard.press("Escape");
    await page.click(".w-meter .mtBtn");                   // headless: no mic → by hand
    await expect.poll(() => page.evaluate(() => document.querySelector(".w-meter")._entry.api.manual())).toBe(true);
    ok(/by hand/i.test(await page.textContent(".w-meter .mtStatus")), "status: " + await page.textContent(".w-meter .mtStatus"));
    ok(await page.locator(".w-meter .mtTrack").isHidden(), "the level bar stayed with no mic");
    await page.waitForTimeout(2300);
    ok(/0:0[2-9]/.test(await page.textContent(".w-meter .mtStreak")), "the streak did not run: " + await page.textContent(".w-meter .mtStreak"));
    await page.click(".w-meter .mtStrike");
    await expect(page.locator(".w-meter .mtStrikes")).toHaveText("✖");
    await expect(page.locator(".w-meter .mtTally")).toContainText("5th 1");
    ok(/Record 0:0[2-9]/.test(await page.textContent(".w-meter .mtRecord")), "no record: " + await page.textContent(".w-meter .mtRecord"));
    await page.keyboard.press(" ");                        // the meter is the selected card
    await expect(page.locator(".w-meter .mtStrikes")).toHaveText("✖ ✖");
    await page.click("#undoToast button");
    await expect(page.locator(".w-meter .mtStrikes")).toHaveText("✖");
    // "By hand" is also a choice before asking
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addMeterBtn"); await page.keyboard.press("Escape");
    await page.click(".w-meter .mtHand");
    ok(await page.evaluate(() => document.querySelector(".w-meter")._entry.api.manual()), "By hand did not switch");
  });

  test("v7.13: the countdown counts school days (weekends and no-school weeks skipped) with the calendar days beside it; a card already counting calendar days keeps doing so", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");                // Tuesday
    await dh.launch();
    const sd = await page.evaluate(() => {
      const B = window.Deckhand.bell;
      const f = (a, b) => B.schoolDaysBetween(new Date(a), new Date(b));
      return [f("2026-09-29T10:30", "2026-10-12"), f("2026-09-29T10:30", "2026-10-02"), f("2026-10-02T10:30", "2026-10-05"), f("2026-10-02T10:30", "2026-10-03"), f("2026-11-20T10:30", "2026-11-30")];
    });
    ok(sd.join() === "9,3,1,0,1", "school days: " + sd.join());   // Thanksgiving week (Nov 23) is a no-school week in the file
    await dh.addW("addEventBtn"); await page.keyboard.press("Escape");
    await page.click(".w-event .wEdit");
    await page.fill(".w-event .evName", "Unit test"); await page.fill(".w-event .evDate", "2026-10-12");
    await page.click(".w-event .evBtn");
    await expect(page.locator(".w-event .evBig")).toHaveText("9");
    await expect(page.locator(".w-event .evUnit")).toHaveText("school days to go");
    await expect(page.locator(".w-event .evSub")).toContainText("13 days");
    await page.click(".w-event .wEdit");
    await page.click(".w-event .evSchool");                // calendar days by choice
    await page.click(".w-event .evBtn");
    await expect(page.locator(".w-event .evBig")).toHaveText("13");
    // a legacy card with an event keeps calendar days; a new empty one counts school days
    const legacy = await page.evaluate(() => { const c = window.Deckhand.config; c.scenes[0].widgets.push({ type: "event", x: 60, y: 60, w: 30, h: 30, title: "Old", when: "2026-10-12" }); window.Deckhand.canvas.loadScene(); return [...document.querySelectorAll(".w-event .evBig")].map(e => e.textContent).join("|"); });
    ok(legacy === "13|13", "a legacy countdown changed its number: " + legacy);
    const san = await page.evaluate(() => JSON.stringify(window.Deckhand.sanitize({ scenes: [{ name: "S", widgets: [{ type: "event", when: "2026-10-12" }, { type: "event" }] }] }).scenes[0].widgets.map(w => w.schoolDays)));
    ok(san === "[false,true]", "sanitize's default: " + san);
  });

  test("v7.13: the Work Mode card drives the room — the meter's limit follows the mode, the music plays for quiet modes when told to, modes can be reworded; the Music card plays while a timer runs when the setting is on", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    for (const id of ["addWorkBtn","addMeterBtn","addMusicBtn","addTimerBtn"]){ await dh.addW(id); await page.keyboard.press("Escape"); }
    await toolLayout(page);
    const limit = () => page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "meter").limit);
    const playing = () => page.evaluate(() => document.querySelector(".w-music")._entry.api.running());
    await page.click('.w-work .chip[data-mode="groups"]');
    ok((await limit()) === 80, "groups should set the limit to 80: " + await limit());
    await page.click('.w-work .chip[data-mode="silent"]');
    ok((await limit()) === 35 && !(await playing()), "silent: limit 35, music untouched until told");
    await page.click('.w-work .chip[data-drive="music"]');
    await expect.poll(playing).toBe(true);
    await page.click('.w-work .chip[data-mode="partners"]');
    await expect.poll(playing).toBe(false);
    await page.click('.w-work .chip[data-drive="meter"]');   // off: the limit is the teacher's again
    await page.click('.w-work .chip[data-mode="groups"]');
    ok((await limit()) === 65, "the meter followed a mode after being told not to: " + await limit());
    await page.click(".w-work .wEdit");
    await page.fill(".w-work .wkName", "LEVEL 3"); await page.fill(".w-work .wkSubIn", "Outside voices, inside");
    await page.click(".w-work .wkDone");
    await expect(page.locator(".w-work .wkBadge")).toHaveText("LEVEL 3");
    await expect(page.locator('.w-work .chip[data-mode="groups"]')).toHaveText("Level 3");
    const kept = await page.evaluate(() => window.Deckhand.sanitize(JSON.parse(JSON.stringify(window.Deckhand.config))).scenes[0].widgets.find(w => w.type === "work"));
    ok(kept.custom.groups && kept.custom.groups.name === "LEVEL 3" && kept.drive.meter === false && kept.drive.music === true, "the rewording or the drive flags did not survive sanitize: " + JSON.stringify(kept));
    // the timer runs the music
    await page.click('.w-work .chip[data-mode="partners"]');   // music off
    await expect.poll(playing).toBe(false);
    const timer = () => page.evaluate(() => document.querySelector(".w-timer")._entry.api.startPause());
    await timer(); await page.waitForTimeout(200);
    ok(!(await playing()), "the timer ran the music with the setting off");
    await timer();
    await page.evaluate(() => { window.Deckhand.config.timer.music = true; });
    await timer();
    await expect.poll(playing).toBe(true);
    await timer();
    await expect.poll(playing).toBe(false);
  });

  test("v7.13: the Sketch Pad — three widths, Undo takes back the last stroke, Clear has Undo, the number line takes a range and a step, the sketch survives a scene switch", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addDrawBtn"); await page.keyboard.press("Escape");
    await toolLayout(page);
    const c = await page.$(".w-draw .dwCanvas"); const b = await c.boundingBox();
    const stroke = async (x0, y0, x1, y1) => { await page.mouse.move(b.x + x0, b.y + y0); await page.mouse.down(); await page.mouse.move(b.x + x1, b.y + y1, { steps: 6 }); await page.mouse.up(); };
    const n = () => page.evaluate(() => document.querySelector(".w-draw")._entry.api.strokes());
    const inked = () => page.evaluate(() => { const c = document.querySelector(".w-draw .dwCanvas"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) k++; return k; });
    await page.click('.w-draw .dwW[data-w="16"]');
    await stroke(40, 40, 300, 200);
    const thick = await inked();
    await page.click('.w-draw .dwW[data-w="4"]');
    await stroke(40, 240, 300, 400);
    const both = await inked();
    ok(thick > 0 && both - thick > 0 && both - thick < thick / 2, "a thin stroke should ink far less than a thick one: " + thick + " / " + (both - thick));
    ok((await n()) === 2, "strokes: " + await n());
    await page.click(".w-draw .dwUndo");
    ok((await n()) === 1 && Math.abs((await inked()) - thick) < thick * 0.05, "Undo did not take back the thin stroke");
    await page.click(".w-draw .dwClear");
    ok((await inked()) === 0, "Clear left ink");
    await page.click("#undoToast button");
    ok((await n()) === 1 && (await inked()) > 0, "Undo after Clear did not restore");
    // number line range
    await page.selectOption(".w-draw .dwBgSel", "line");
    await expect(page.locator(".w-draw .dwLine")).toBeVisible();
    await page.fill('.w-draw .dwLn[data-k="step"]', "10"); await page.press('.w-draw .dwLn[data-k="step"]', "Enter");
    await page.fill('.w-draw .dwLn[data-k="min"]', "0"); await page.press('.w-draw .dwLn[data-k="min"]', "Enter");
    await page.fill('.w-draw .dwLn[data-k="max"]', "100"); await page.press('.w-draw .dwLn[data-k="max"]', "Enter");
    const ln = await page.evaluate(() => JSON.stringify(window.Deckhand.config.scenes[0].widgets.find(w => w.type === "draw").line));
    ok(ln === '{"min":0,"max":100,"step":10}', "number line: " + ln);
    const norm = await page.evaluate(() => JSON.stringify(window.Deckhand.sanitize({ scenes: [{ name: "S", widgets: [{ type: "draw", line: { min: 5, max: 1, step: 0 } }, { type: "draw", line: { min: 0, max: 1, step: 0.001 } }] }] }).scenes[0].widgets.map(w => w.line)));
    ok(norm === '[{"min":-10,"max":10,"step":1},{"min":0,"max":1,"step":0.005}]', "normLine: " + norm);
    // the sketch outlives a scene switch
    const scenes = await page.evaluate(() => window.Deckhand.config.scenes.map(s => s.name));
    await page.selectOption("#sceneSel", scenes[1]); await page.waitForTimeout(300);
    await page.selectOption("#sceneSel", scenes[0]); await page.waitForTimeout(500);
    ok((await n()) === 1 && (await inked()) > 0, "the sketch did not survive the scene switch");
  });
});

/* v7.14 — "Routines and math" (tools audit §4: the wrap-up, the Talk Timer, Stations, the
 * Number Line). */
test.describe("v7.14", () => {
  const rosters = page => page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee","Eli","Fay","Gus","Hal","Ivy","Jon","Kim","Lee"] }]; });
  const place = page => page.evaluate(() => {
    const ws = window.Deckhand.config.scenes[0].widgets, pos = { talk: [1, 2, 32, 52], stations: [35, 2, 40, 60], numline: [1, 56, 60, 42] };
    ws.forEach(w => { if (pos[w.type]) [w.x, w.y, w.w, w.h] = pos[w.type]; });
    window.Deckhand.canvas.loadScene();
  });

  test("v7.14: the wrap-up at the bell — N minutes out the clock takes the stage with the time to the bell, the prompt, a checklist and the rule; R stands it down for that period; the bell brings the face back; a settle-in outranks it", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T11:05:30");            // 5th ends 11:09
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.bell.wrapup = { on: true, minutes: 3, prompt: "One thing you learned", steps: "Pack up\nPush in your chair", msg: "" }; });
    const live = () => page.evaluate(() => window.Deckhand.wrapup.live());
    await page.waitForTimeout(600);
    ok(!(await live()), "live with 3:30 left");
    await page.evaluate(() => window.Deckhand.shiftClock(60000));
    await expect.poll(live).toBe(true);
    await expect(page.locator("#clockWrap .wuBig")).toHaveText(/^2:(2\d|30)$/);   // 2:30 left, give or take a loaded runner
    await expect(page.locator("#clockWrap .wuPrompt")).toHaveText("One thing you learned");
    ok((await page.locator("#clockWrap .wuList li").count()) === 2, "checklist");
    await expect(page.locator("#clockWrap .wuMsg")).toHaveText("The teacher dismisses you, not the bell.");
    ok(await page.evaluate(() => document.querySelector(".w-clock").classList.contains("wFull")), "the clock did not take the stage");
    await page.click("#clockWrap .wuList li >> nth=0");
    await expect(page.locator("#clockWrap .wuList li >> nth=0")).toHaveClass(/done/);
    await page.keyboard.press("r");
    ok(!(await live()), "R did not stand it down");
    await page.evaluate(() => window.Deckhand.wrapup._watch());
    ok(!(await live()), "it came back for the same period after R");
    // the bell: the face returns (the settle-in starts on the transition into HOWL)
    await page.evaluate(() => window.Deckhand.wrapup.start());
    ok(await live(), "start() refused");
    await page.evaluate(() => window.Deckhand.shiftClock(160000));   // 11:09:10
    await expect.poll(live).toBe(false);
    // off by default; sanitize keeps the fields
    const san = await page.evaluate(() => JSON.stringify(window.Deckhand.sanitize({ bell: { wrapup: { on: true, minutes: 99, steps: "a\nb\nc\nd\ne\nf\ng", prompt: "p" } } }).bell.wrapup));
    ok(san === '{"on":true,"minutes":15,"prompt":"p","steps":"a\\nb\\nc\\nd\\ne\\nf","msg":""}', "sanitize: " + san);
    ok((await page.evaluate(() => window.Deckhand.sanitize({}).bell.wrapup.on)) === false, "the wrap-up should be off until Croix turns it on");
  });

  test("v7.14: the Talk Timer — A for the seconds set, a chime and a public switch to B, then Share; ✎ sets the question and who A is; Space and R", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addTalkBtn"); await page.keyboard.press("Escape");
    await place(page);
    const api = () => page.evaluate(() => { const a = document.querySelector(".w-talk")._entry.api; return { phase: a.phase(), running: a.running(), letter: document.querySelector(".w-talk .tkLetter").textContent, who: document.querySelector(".w-talk .tkWho").textContent }; });
    await page.click(".w-talk .wEdit");
    await page.fill(".w-talk .tkPromptIn", "Why is 7 the most common total?");
    await page.fill(".w-talk .tkWhoIn", "closest to the window");
    await page.click(".w-talk .tkDone");
    await expect(page.locator(".w-talk .tkPrompt")).toHaveText("Why is 7 the most common total?");
    await expect(page.locator(".w-talk .tkRule")).toHaveText("A is closest to the window");
    await page.click('.w-talk .chip[data-secs="30"]');
    await expect(page.locator(".w-talk .tkTime")).toHaveText("0:30");
    await page.keyboard.press(" ");                                    // the selected card
    let s = await api();
    ok(s.phase === "A" && s.running && s.letter === "A", "A did not start: " + JSON.stringify(s));
    await page.keyboard.press(" ");                                    // pause
    s = await api();
    ok(s.phase === "A" && !s.running, "Space did not pause: " + JSON.stringify(s));
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "talk"); w.secs = 15; });
    const kept = await page.evaluate(() => window.Deckhand.sanitize(JSON.parse(JSON.stringify(window.Deckhand.config))).scenes[0].widgets.find(w => w.type === "talk"));
    ok(kept.prompt === "Why is 7 the most common total?" && kept.who === "closest to the window" && kept.secs === 15, "sanitize: " + JSON.stringify(kept));
    await page.keyboard.press("r");
    s = await api();
    ok(s.phase === "idle" && !s.running, "R did not reset: " + JSON.stringify(s));
  });

  test("v7.14: the Talk Timer's phases run A → B → Share on the clock", async ({ page, dh }) => {
    test.setTimeout(90000);
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addTalkBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "talk"); w.secs = 15; window.Deckhand.canvas.loadScene(); });
    const phase = () => page.evaluate(() => document.querySelector(".w-talk")._entry.api.phase());
    await page.click(".w-talk .tkGo");
    ok((await phase()) === "A", "A");
    await expect.poll(phase, { timeout: 20000 }).toBe("B");
    await expect(page.locator(".w-talk")).toHaveClass(/phaseB/);
    await expect(page.locator(".w-talk .tkWho")).toHaveText("Partner B speaks");
    await expect.poll(phase, { timeout: 20000 }).toBe("share");
    await expect(page.locator(".w-talk .tkLetter")).toHaveText("Share");
    ok(!(await page.evaluate(() => document.querySelector(".w-talk")._entry.api.running())), "still running after Share");
  });

  test("v7.14: Stations — the Group Maker's groups for the class (or its own by count) × named stations × a rotating timer; Next moves everyone one station on; the rotation survives a scene switch", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await rosters(page);
    await dh.addW("addGroupsBtn"); await page.keyboard.press("Escape");
    await page.selectOption(".w-groups .pkSel", "5th");
    await page.click('.w-groups .chip[data-by="count"][data-n="4"]');
    await page.click(".w-groups .gpGo");
    const made = await page.evaluate(() => [...document.querySelectorAll(".w-groups .gpCard")].map(c => [...c.querySelectorAll("span")].map(s => s.textContent).join("+")));
    await dh.addW("addStationsBtn"); await page.keyboard.press("Escape");
    await place(page);
    await page.selectOption(".w-stations .pkSel", "5th");
    const st = () => page.evaluate(() => { const s = document.querySelector(".w-stations")._entry.api.state(); return { rot: s.rot, done: s.done, groups: s.groups.map(g => g.join("+")), running: !!s.endAt, cards: [...document.querySelectorAll(".w-stations .snCard")].map(c => c.querySelector("b").textContent + "=" + c.querySelector("i").textContent) }; });
    let s = await st();
    ok(s.groups.join("|") === made.join("|"), "Stations should take the Group Maker's groups: " + s.groups.join("|") + " vs " + made.join("|"));
    ok(s.cards.join() === "Station 1=Group 1,Station 2=Group 2,Station 3=Group 3,Station 4=Group 4", "rotation 1: " + s.cards.join());
    await page.click(".w-stations .wEdit");
    await page.fill(".w-stations .snNames", "Vocabulary\nPractice\nChallenge\nTeacher table");
    await page.click('.w-stations .snMins .chip[data-n="5"]');
    await page.click(".w-stations .snDone");
    await expect(page.locator(".w-stations .snTime")).toHaveText("5:00");
    await page.click(".w-stations .snGo");
    await page.click(".w-stations .snNext");
    s = await st();
    ok(s.rot === 1 && s.running && s.cards[0] === "Vocabulary=Group 4" && s.cards[1] === "Practice=Group 1", "after Next: " + JSON.stringify(s.cards));
    await expect(page.locator(".w-stations .snRot")).toHaveText("Rotation 2 of 4");
    const scenes = await page.evaluate(() => window.Deckhand.config.scenes.map(sc => sc.name));
    await page.selectOption("#sceneSel", scenes[1]); await page.waitForTimeout(300);
    await page.selectOption("#sceneSel", scenes[0]); await page.waitForTimeout(500);
    s = await st();
    ok(s.rot === 1 && s.running && s.cards[0] === "Vocabulary=Group 4", "the rotation did not survive the scene switch: " + JSON.stringify(s));
    for (let i = 0; i < 3; i++) await page.click(".w-stations .snNext");
    s = await st();
    ok(s.done && !s.running, "the last rotation should end the run: " + JSON.stringify(s));
    await expect(page.locator(".w-stations .snRot")).toHaveText("All 4 rotations done");
    await page.keyboard.press("r");
    s = await st();
    ok(s.rot === 0 && !s.done, "R");
    const kept = await page.evaluate(() => window.Deckhand.sanitize(JSON.parse(JSON.stringify(window.Deckhand.config))).scenes[0].widgets.find(w => w.type === "stations"));
    ok(kept.spots.join("|") === "Vocabulary|Practice|Challenge|Teacher table" && kept.mins === 5 && kept.count === 4, "sanitize: " + JSON.stringify(kept));
  });

  test("v7.14: the Number Line — a tap places a point, a drag moves it, a tap on it takes it away; Jump draws an arc with its signed length; range and step; Undo and Clear; marks survive a scene switch", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addNumlineBtn"); await page.keyboard.press("Escape");
    await place(page);
    const at = v => page.evaluate(v => document.querySelector(".w-numline")._entry.api.at(v), v);
    const y = (await at(0)).y;
    const X = {}; for (const v of [-7, -3, -2, 3, 5]) X[v] = (await at(v)).x;
    const xOf = v => X[v];
    const marks = () => page.evaluate(() => document.querySelector(".w-numline")._entry.api.marks());
    await page.mouse.click(xOf(-7), y);
    await page.mouse.click(xOf(3), y);
    let m = await marks();
    ok(m.points.join() === "-7,3", "points: " + m.points.join());
    await page.mouse.move(xOf(3), y); await page.mouse.down(); await page.mouse.move(xOf(5), y, { steps: 5 }); await page.mouse.up();
    m = await marks();
    ok(m.points.join() === "-7,5", "drag: " + m.points.join());
    await page.click('.w-numline .chip[data-mode="jump"]');
    await page.mouse.move(xOf(-7), y); await page.mouse.down(); await page.mouse.move(xOf(-3), y, { steps: 5 }); await page.mouse.up();
    m = await marks();
    ok(m.jumps.length === 1 && m.jumps[0].join() === "-7,-3", "jump: " + JSON.stringify(m.jumps));
    await expect(page.locator(".w-numline .nlJLab")).toHaveText("+4");
    await page.mouse.move(xOf(5), y); await page.mouse.down(); await page.mouse.move(xOf(-2), y, { steps: 5 }); await page.mouse.up();
    await expect(page.locator(".w-numline .nlJLab >> nth=1")).toHaveText("−7");
    ok(await page.locator(".w-numline .nlJump.neg").count() === 1, "a negative jump is drawn navy");
    await page.click('.w-numline .chip[data-mode="closed"]');
    await page.mouse.move(xOf(5), y); await page.mouse.down(); await page.mouse.move(xOf(5), y - 200, { steps: 5 }); await page.mouse.up();   // v7.16: pulled off the line, it's gone
    m = await marks();
    ok(m.points.join() === "-7", "pull-away: " + m.points.join());
    await page.click(".w-numline .nlUndo");                             // v7.16: Undo walks back the last change
    m = await marks();
    ok(m.jumps.length === 2 && m.points.join() === "-7,5", "undo: " + JSON.stringify(m));
    // range: 0 to 1 by 0.25 — marks off the new line are dropped (v7.16: the Custom row lives behind the range chip)
    await page.click(".w-numline .nlRangeBtn");
    await page.fill('.w-numline .nlIn[data-k="step"]', "0.25"); await page.press('.w-numline .nlIn[data-k="step"]', "Enter");
    await page.fill('.w-numline .nlIn[data-k="min"]', "0"); await page.press('.w-numline .nlIn[data-k="min"]', "Enter");
    await page.fill('.w-numline .nlIn[data-k="max"]', "1"); await page.press('.w-numline .nlIn[data-k="max"]', "Enter");
    const line = await page.evaluate(() => JSON.stringify(window.Deckhand.config.scenes[0].widgets.find(w => w.type === "numline").line));
    ok(line === '{"min":0,"max":1,"step":0.25}', "line: " + line);
    m = await marks();
    ok(m.points.length === 0 && m.jumps.length === 0, "marks off the new line should go: " + JSON.stringify(m));
    const labels = await page.evaluate(() => [...document.querySelectorAll(".w-numline .nlLab")].map(t => t.textContent).join());
    ok(labels === "0,0.25,0.5,0.75,1", "labels: " + labels);
    const half = await at(0.5);
    await page.mouse.click(half.x, half.y);
    m = await marks();
    ok(m.points.join() === "0.5", "a point at 0.5: " + m.points.join());
    const scenes = await page.evaluate(() => window.Deckhand.config.scenes.map(sc => sc.name));
    await page.selectOption("#sceneSel", scenes[1]); await page.waitForTimeout(300);
    await page.selectOption("#sceneSel", scenes[0]); await page.waitForTimeout(400);
    m = await marks();
    ok(m.points.join() === "0.5", "the marks did not survive the scene switch");
    await page.click(".w-numline .nlClear");
    ok((await marks()).points.length === 0, "Clear");
    await page.click("#undoToast button");
    ok((await marks()).points.join() === "0.5", "Undo after Clear");
  });
});

/* v7.15 — the pen hands the lesson back (Croix, after class: "It was awkward to walk over,
 * clear the screen, click done, collapse the bar, click back into the slides frame"). */
test.describe("v7.15", () => {
  test("v7.15: leaving the pen is one action — Done or the clicker clears the drawing (with Undo), folds the dock on a staged deck and gives the slides the keys; the next click moves the slide", async ({ page, dh }) => {
    const deck = path.join(dh.fixtureDir, "tmp_ink_deck.html");
    fs.writeFileSync(deck, '<!DOCTYPE html><title>InkDeck</title><body><h1 id="n">Slide 1</h1><script>var n=1;addEventListener("keydown",function(e){if(e.key==="PageDown"||e.key==="ArrowRight"){n++;document.getElementById("n").textContent="Slide "+n;}});</script>');
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn");
      inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector(".w-embed .embFrame").src = u;
    }, "file://" + deck);
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    const st = () => page.evaluate(() => ({
      keys: !!(document.activeElement && document.activeElement.classList.contains("embFrame")),
      inking: document.body.classList.contains("inking"),
      dockMin: document.body.classList.contains("dockMin"),
      strokes: window.Deckhand.ink.count() }));
    const slide = () => page.frameLocator(".w-embed .embFrame").locator("#n").textContent();
    const draw = async () => { await page.mouse.move(600, 500); await page.mouse.down(); await page.mouse.move(900, 520, { steps: 5 }); await page.mouse.up(); };
    await expect.poll(async () => (await st()).keys).toBe(true);
    await page.keyboard.press("PageDown");
    await expect.poll(slide).toBe("Slide 2");
    // the stage's Draw, then the clicker: the first press ends the drawing, the second turns the slide
    await page.click("#inkBlob");
    await draw();
    let s = await st();
    ok(s.inking && s.strokes === 1 && !s.keys, "drawing: " + JSON.stringify(s));
    await page.keyboard.press("PageDown");
    s = await st();
    ok(!s.inking && s.strokes === 0 && s.keys && s.dockMin, "the clicker did not hand the lesson back: " + JSON.stringify(s));
    ok((await slide()) === "Slide 2", "the slide turned under the ink");
    await page.keyboard.press("PageDown");
    await expect.poll(slide).toBe("Slide 3");
    // the dock's Draw (the dock opened for it), then Done
    await page.click("#dockTog");
    await page.click("#inkBtn");
    await draw();
    ok(!(await st()).dockMin, "precondition: the dock is open");
    await page.click("#inkDone");
    s = await st();
    ok(!s.inking && s.strokes === 0 && s.keys && s.dockMin, "Done did not hand the lesson back: " + JSON.stringify(s));
    await page.keyboard.press("PageDown");
    await expect.poll(slide).toBe("Slide 4");
    // Undo brings the drawing back and leaves the keys with the slides
    await page.click("#undoToast button");
    s = await st();
    ok(s.strokes === 1 && s.keys && !s.inking, "Undo: " + JSON.stringify(s));
    // Escape leaves the pen the same way
    await page.click("#inkBlob");
    await draw();
    await page.keyboard.press("Escape");
    s = await st();
    ok(!s.inking && s.strokes === 0 && s.keys, "Escape: " + JSON.stringify(s));
  });

  test("v7.15: the dock has one ⋮ (Scenes live there), Fullscreen sits in the top-right corner clear of a card's ✕, and on a staged deck the pen is a blob in the bottom-right corner", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    ok((await page.locator("#dock svg.dots").count()) === 1, "the dock has more than one dots button");
    await page.click("#moreBtn");
    await expect(page.locator("#moreMenu #sceneBtn")).toBeVisible();
    await page.click("#sceneBtn");
    await expect(page.locator("#sceneMenu")).toBeVisible();
    await page.keyboard.press("Escape");
    const box = await page.evaluate(() => {
      const f = document.getElementById("fsBtn").getBoundingClientRect(), x = document.querySelector("#clockWidget .wClose").getBoundingClientRect();
      return { fsRight: innerWidth - f.right, fsTop: f.top, gap: f.left - x.right };
    });
    ok(box.fsRight < 12 && box.fsTop < 12, "Fullscreen is not in the top-right corner: " + JSON.stringify(box));
    ok(box.gap >= 16, "the clock's ✕ sits under the fullscreen button: " + JSON.stringify(box));
    ok((await page.locator("#inkBlob").isHidden()), "the pen blob shows on the plain board");
    await page.click("#clockWidget .wFocus");
    await expect(page.locator("#inkBlob")).toBeVisible();
    ok((await page.locator("#focusBar #inkBtnStage").count()) === 0, "Draw is still in the stage bar");
    const blob = await page.evaluate(() => { const r = document.getElementById("inkBlob").getBoundingClientRect(); return { right: innerWidth - r.right, bottom: innerHeight - r.bottom, op: +getComputedStyle(document.getElementById("inkBlob")).opacity }; });
    /* v7.28: the pen now lives mid-left by default (⇄ sends it back to the bottom-right — see v7.28) */
    const left = await page.evaluate(() => document.getElementById("inkBlob").getBoundingClientRect().left);
    ok(left < 40 && blob.op < 0.8, "the pen blob is not a quiet blob at the left edge: " + JSON.stringify(blob) + " left " + left);
    await page.click("#inkBlob");
    await expect(page.locator("#inkBar")).toBeVisible();
    await expect(page.locator("#inkBlob")).toBeHidden();
    const bar = await page.evaluate(() => { const b = document.getElementById("inkBar"), r = b.getBoundingClientRect(); return { left: r.left, bg: getComputedStyle(b).backgroundColor }; });
    ok(bar.left < 40 && /rgba\(255, 255, 255, 0\.[0-9]+\)/.test(bar.bg), "the palette should pop up see-through at the left edge (v7.28): " + JSON.stringify(bar));
    await page.click("#inkDone");
    await expect(page.locator("#inkBlob")).toBeVisible();
  });

  test("v7.15: the Number Line opens as a full-width strip at the bottom, and a resized card redraws in its own pixels — the line runs the width, the labels keep their size", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addNumlineBtn"); await page.keyboard.press("Escape");
    const w = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(x => x.type === "numline"));
    ok(w.w >= 90 && w.y + w.h >= 95, "not a full-width strip at the bottom: " + JSON.stringify(w));
    const geo = () => page.evaluate(() => {
      const c = document.querySelector(".w-numline .nlSvg").getBoundingClientRect(), api = document.querySelector(".w-numline")._entry.api;
      const a = api.at(-10), b = api.at(10), lab = document.querySelector(".w-numline .nlLab").getBoundingClientRect();
      return { span: (b.x - a.x) / c.width, labH: lab.height, lineY: (a.y - c.top) / c.height };
    });
    const g1 = await geo();
    await page.evaluate(() => { const x = window.Deckhand.config.scenes[0].widgets.find(y => y.type === "numline"); x.x = 20; x.y = 5; x.w = 50; x.h = 85; window.Deckhand.canvas.loadScene(); });
    await page.waitForTimeout(300);
    const g2 = await geo();
    ok(g1.span > 0.85 && g2.span > 0.85, "the line does not run the card's width: " + JSON.stringify([g1, g2]));
    ok([g1, g2].every(g => g.labH >= 20 && g.labH <= 48), "the labels are unreadable or ballooned: " + JSON.stringify([g1, g2]));
    ok(g2.lineY > 0.55 && g2.lineY < 0.8, "a tall card put the line in a strange place: " + JSON.stringify(g2));
  });

  test("v7.16: the Number Line by hand — drop closed and open dots, drag one, tap to flip it, pull it off to throw it away, shade a ray by tapping a side, pick the range from chips; Undo walks it all back", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addNumlineBtn"); await page.keyboard.press("Escape");
    const at = v => page.evaluate(v => document.querySelector(".w-numline")._entry.api.at(v), v);
    const dots = () => page.evaluate(() => JSON.stringify(document.querySelector(".w-numline")._entry.api.marks().dots));
    const tap = async v => { const p = await at(v); await page.mouse.click(p.x, p.y); };
    const drag = async (a, b, dy) => { const p = await at(a), q = await at(b); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(q.x, q.y + (dy || 0), { steps: 6 }); await page.mouse.up(); };
    await expect(page.locator(".w-numline .nlRange")).toBeHidden();      // nothing to type to start
    await tap(3);                                                        // Closed is the default tool
    await page.click('.w-numline .chip[data-mode="open"]');
    await tap(-2);
    ok((await dots()) === '[{"v":3,"open":false,"ray":0},{"v":-2,"open":true,"ray":0}]', "drop: " + await dots());
    ok((await page.locator(".w-numline .nlPt.open").count()) === 1, "the open dot is not drawn open");
    await drag(-2, -4);
    ok((await dots()) === '[{"v":3,"open":false,"ray":0},{"v":-4,"open":true,"ray":0}]', "drag: " + await dots());
    await tap(3);                                                        // a tap on a dot flips it
    ok(JSON.parse(await dots())[0].open === true, "flip: " + await dots());
    await page.click('.w-numline .chip[data-mode="ray"]');
    await tap(7); await tap(-8);
    ok((await dots()) === '[{"v":3,"open":true,"ray":1},{"v":-4,"open":true,"ray":-1}]', "rays: " + await dots());
    ok((await page.locator(".w-numline .nlRay").count()) === 2, "rays not drawn");
    await tap(9);                                                        // the same side again takes it away
    ok(JSON.parse(await dots())[0].ray === 0, "ray off: " + await dots());
    await page.click('.w-numline .chip[data-mode="closed"]');
    await drag(3, 3, -200);                                              // pulled off the line
    ok(JSON.parse(await dots()).length === 1, "pull-away: " + await dots());
    await page.click(".w-numline .nlUndo"); await page.click(".w-numline .nlUndo");
    ok((await dots()) === '[{"v":3,"open":true,"ray":1},{"v":-4,"open":true,"ray":-1}]', "undo twice: " + await dots());
    // two dots never share a tick: the one placed wins
    await drag(-4, 3);
    ok(JSON.parse(await dots()).length === 1 && JSON.parse(await dots())[0].v === 3, "stacked dots: " + await dots());
    // the range from chips
    await expect(page.locator(".w-numline .nlRangeBtn")).toContainText("−10 to 10");
    await page.click(".w-numline .nlRangeBtn");
    await page.click('.w-numline .nlPresets .chip[data-p="-5,5,1"]');
    await expect(page.locator(".w-numline .nlRange")).toBeHidden();
    await expect(page.locator(".w-numline .nlRangeBtn")).toContainText("−5 to 5");
    ok((await page.evaluate(() => JSON.stringify(window.Deckhand.config.scenes[0].widgets.find(w => w.type === "numline").line))) === '{"min":-5,"max":5,"step":1}', "preset");
    ok(JSON.parse(await dots())[0].v === 3, "a dot on both lines kept its number: " + await dots());
    // − / +: fewer or more numbers without typing; a dot keeps its exact number between ticks
    await page.click(".w-numline .nlMore");
    await expect(page.locator(".w-numline .nlRangeBtn")).toContainText("−10 to 10");
    await page.click(".w-numline .nlMore");
    await expect(page.locator(".w-numline .nlRangeBtn")).toContainText("−20 to 20");
    await page.click(".w-numline .nlMore");
    await expect(page.locator(".w-numline .nlRangeBtn")).toContainText("−50 to 50 by 5");
    ok(JSON.parse(await dots())[0].v === 3, "zooming out moved the dot: " + await dots());
    const labs = await page.evaluate(() => { const t = [...document.querySelectorAll(".w-numline .nlLab")].map(e => e.getBoundingClientRect()); return t.every((r, i) => !i || r.left > t[i - 1].right + 2); });
    ok(labs, "labels overlap at ±50");
    await page.click(".w-numline .nlLess"); await page.click(".w-numline .nlLess");
    await expect(page.locator(".w-numline .nlRangeBtn")).toContainText("−10 to 10");
    await page.click("#lockBtn");
    await expect(page.locator(".w-numline .nlRangeBtn")).toBeHidden();
    await tap(-1);                                                       // dots work while locked (a teaching action)
    ok(JSON.parse(await dots()).length === 2, "could not drop a dot while locked");
  });
});

/* v7.18 — minimize, and the minutes-left flash (Croix: "I have one period slides up and we finish
 * class… I collapse the screen, flip on the main clock, then hide the embed for next class";
 * "a faint over all the screens warning that there are 3 minutes left… Just a 3 will do"). */
test.describe("v7.18", () => {
  const loadDeck = async (page, dh) => {
    const deck = path.join(dh.fixtureDir, "tmp_min_deck.html");
    fs.writeFileSync(deck, "<!DOCTYPE html><title>MinDeck</title><body><h1>DECK</h1>");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn");
      inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector(".w-embed .embFrame").src = u;
    }, "file://" + deck);
    await page.waitForTimeout(300);
  };
  const st = page => page.evaluate(() => ({
    staged: document.body.classList.contains("focusMode"),
    shown: !!document.querySelector(".w-embed").offsetParent,
    src: document.querySelector(".w-embed .embFrame").getAttribute("src"),
    chips: [...document.querySelectorAll("#shelf .minChip")].map(c => c.textContent),
    min: !!window.Deckhand.config.scenes[0].widgets.find(w => w.type === "embed").min }));

  test("v7.18: Minimize — one tap takes a staged deck off the stage and the board to a dock chip (the clock is back, the frame goes quiet); the chip brings it back; it survives a reload; the next bell's settle-in brings the slides back by itself", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:15:40");                  // 20 s before 2nd period
    await dh.launch();
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await loadDeck(page, dh);
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("#minStageBtn")).toBeVisible();
    await page.click("#minStageBtn");
    let s = await st(page);
    ok(!s.staged && !s.shown && s.src === null && s.chips.join() === "Slides" && s.min, "the stage bar's Minimize: " + JSON.stringify(s));
    await expect(page.locator("#clockWidget")).toBeVisible();
    // the chip brings it back
    await page.click("#shelf .minChip");
    s = await st(page);
    ok(s.shown && s.src && !s.chips.length && !s.min, "the chip: " + JSON.stringify(s));
    // the strip's — does the same on the board
    await page.click(".w-embed .wMin");
    s = await st(page);
    ok(!s.shown && s.min, "the strip's —: " + JSON.stringify(s));
    const kept = await page.evaluate(() => window.Deckhand.sanitize(JSON.parse(JSON.stringify(window.Deckhand.config))).scenes[0].widgets.find(w => w.type === "embed").min);
    ok(kept === true, "minimized did not survive sanitize");
    // the bell at 10:16: the settle-in runs and hands off to the slides — brought back first
    await page.evaluate(() => { window.Deckhand.config.bell.settle.seconds = 5; window.Deckhand.settle._doneMs(300); });
    await expect(page.locator("#clockWidget.stLive")).toHaveCount(1, { timeout: 30000 });
    await expect(page.locator(".w-embed.wFull")).toHaveCount(1, { timeout: 15000 });
    s = await st(page);
    ok(s.staged && s.shown && !s.min && !s.chips.length, "the settle-in did not bring the slides back: " + JSON.stringify(s));
    // the clock is never minimized from the stage bar
    await page.click("#unfocusBtn");
    await page.click("#clockWidget .wFocus");
    await expect(page.locator("#minStageBtn")).toBeHidden();
  });

  test("v7.18: the minutes-left flash — a faint numeral over every screen at the crossing, once a class, never when opened inside the window, off in Settings", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T11:05:57");                  // 5th ends 11:09 — the 3-minute mark in 3 s
    await dh.launch();
    const fl = () => page.evaluate(() => ({ go: document.getElementById("minFlash").classList.contains("go"), n: document.getElementById("minFlash").textContent }));
    ok(!(await fl()).go, "flashed early");
    await expect.poll(async () => (await fl()).go, { timeout: 8000 }).toBe(true);
    ok((await fl()).n === "3", "the numeral: " + JSON.stringify(await fl()));
    const peak = await page.evaluate(() => new Promise(r => setTimeout(() => r(+getComputedStyle(document.getElementById("minFlash")).opacity), 1000)));
    ok(peak > 0.1 && peak < 0.4, "not faint: " + peak);
    ok((await page.evaluate(() => getComputedStyle(document.getElementById("minFlash")).pointerEvents)) === "none", "the flash takes taps");
    await expect.poll(async () => (await fl()).go, { timeout: 6000 }).toBe(false);
    await page.evaluate(() => window.Deckhand.flash._watch());
    ok(!(await fl()).go, "flashed twice in one class");
    // opened with 2:30 left: nothing
    await dh.openAt("#t=2026-09-29T11:06:30");
    await dh.launch();
    await page.waitForTimeout(800);
    ok(!(await fl()).go, "flashed on a board opened inside the window");
    // Settings: off, or a different minute
    const san = await page.evaluate(() => JSON.stringify([window.Deckhand.sanitize({}).bell.flash, window.Deckhand.sanitize({ bell: { flash: { on: false, minutes: 44 } } }).bell.flash]));
    ok(san === '[{"on":true,"minutes":3},{"on":false,"minutes":10}]', "sanitize: " + san);
    await dh.openAt("#t=2026-09-29T11:05:57");
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.bell.flash = { on: false, minutes: 3 }; });
    await page.waitForTimeout(4500);
    ok(!(await fl()).go, "flashed while off");
  });
});

/* v7.19 — Deckhand at a web address (Croix: "why don't we go ahead and run the whole thing in one
 * of my domains"). */
test.describe("v7.19", () => {
  test("v7.19: Import a board — an exported copy's board (layout, bells, rosters) replaces this device's after one confirming tap; junk is refused; the Drive file never asks for the web app's files", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    ok((await page.evaluate(() => !!document.querySelector('link[rel="manifest"]'))) === false, "a file:// board asked for a manifest");
    // an exported copy: the config block with rosters, a renamed scene and a Talk Timer
    const cfg = await page.evaluate(() => {
      const c = JSON.parse(JSON.stringify(window.Deckhand.config));
      c.rosters = [{ period: "5th", names: ["Ava", "Ben", "Cal"] }];
      c.scenes[0].widgets.push({ type: "talk", x: 60, y: 10, w: 30, h: 40, label: "", pin: false, prompt: "Why?", who: "", secs: 60 });
      c.bell.flash = { on: false, minutes: 2 };
      return c;
    });
    const exported = path.join(dh.fixtureDir, "tmp_exported_board.html");
    fs.writeFileSync(exported, '<!DOCTYPE html><title>Deckhand</title><script id="deckhand-config" type="application/json">\n' + JSON.stringify(cfg) + '\n</script><p>…the rest of the app…</p>');
    const junk = path.join(dh.fixtureDir, "tmp_not_a_board.html");
    fs.writeFileSync(junk, "<!DOCTYPE html><p>not a board</p>");
    await page.click("#setBtn");
    await dh.tab("device");
    await page.setInputFiles("#importFile", junk);
    await expect(page.locator("#setErrors")).toContainText("doesn't hold a Deckhand board");
    await expect(page.locator("#importBtn")).not.toHaveClass(/armed/);
    await page.setInputFiles("#importFile", exported);
    await expect(page.locator("#importBtn")).toHaveClass(/armed/);
    await expect(page.locator("#setErrors")).toContainText("rosters for 1 period");
    await page.evaluate(() => { window.name = "dh.keepStore"; });   // the suite clears the store on every navigation — keep it for this reload
    await Promise.all([page.waitForNavigation(), page.click("#importBtn")]);
    await page.waitForFunction(() => !!window.Deckhand);
    await dh.launch();
    const after = await page.evaluate(() => ({ r: window.Deckhand.config.rosters, talk: !!document.querySelector(".w-talk"), flash: window.Deckhand.config.bell.flash, src: window.Deckhand.configSource }));
    ok(after.r.length === 1 && after.r[0].names.join() === "Ava,Ben,Cal" && after.talk && after.flash.on === false && after.src === "device",
      "the imported board is not the one in use: " + JSON.stringify(after));
  });
});


/* v7.20 — the tape always has a pause within reach (Croix: "I played some of the lofi music, but
 * closed the window before hitting pause. The music kept playing and there wasn't a way for me to
 * stop it"). */
test.describe("v7.20", () => {
  test("v7.20: while the tape plays with its card out of sight — minimized, on Home, under a staged deck — a Now Playing pill pauses it; Sound Off silences it; a card on screen needs no pill", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addMusicBtn"); await page.keyboard.press("Escape");
    const playing = () => page.evaluate(() => document.querySelector(".w-music")._entry.api.running());
    const pill = () => page.locator("#nowPlaying");
    const play = async () => { await page.evaluate(() => { const a = document.querySelector(".w-music")._entry.api; if (!a.running()) a.startPause(); }); await expect.poll(playing).toBe(true); };
    await play();
    await page.waitForTimeout(700);
    await expect(pill()).toBeHidden();                              // the card is right there
    // minimized
    await page.click(".w-music .wMin");
    await expect(pill()).toBeVisible();
    await expect(pill()).toContainText("Pause");
    await pill().click();
    await expect.poll(playing).toBe(false);
    await expect(pill()).toBeHidden();
    await page.click("#shelf .minChip");
    // Home
    await play();
    await page.keyboard.press("h");
    await expect(pill()).toBeVisible();
    await pill().click();
    await expect.poll(playing).toBe(false);
    await page.click("#launchBtn");
    // under a staged card
    await play();
    await dh.addW("addTimerBtn"); await page.keyboard.press("Escape");
    await page.click(".w-timer .wFocus");
    await expect(pill()).toBeVisible();
    await page.click("#unfocusBtn");
    await expect(pill()).toBeHidden({ timeout: 2000 });
    // Sound Off (M) silences the tape too
    await page.keyboard.press("m");
    await expect.poll(playing).toBe(false);
    await page.keyboard.press("m");
  });
});

/* v7.21 — zoom for the back row (Croix: "a couple of times I had students claiming they can't see
 * from the back row… what I'd really like is a way to zoom"). */
test.describe("v7.21", () => {
  test("v7.21: on a staged deck the magnifier zooms in (150%), a drag moves around, + / − and a double tap change it, the clicker still turns slides at any zoom, Done and Exit go back to 100%", async ({ page, dh }) => {
    const deck = path.join(dh.fixtureDir, "tmp_zoom_deck.html");
    fs.writeFileSync(deck, '<!DOCTYPE html><title>ZoomDeck</title><body><h1 id="n">Slide 1</h1><script>var n=1;addEventListener("keydown",function(e){if(e.key==="PageDown"){n++;document.getElementById("n").textContent="Slide "+n;}});</script>');
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn");
      inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector(".w-embed .embFrame").src = u;
    }, "file://" + deck);
    await page.waitForTimeout(300);
    await expect(page.locator("#zoomBlob")).toBeHidden();              // only on a staged card
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("#zoomBlob")).toBeVisible();
    const z = () => page.evaluate(() => window.Deckhand.canvas.zoom());
    const slide = () => page.frameLocator(".w-embed .embFrame").locator("#n").textContent();
    await page.click("#zoomBlob");
    let s = await z();
    ok(s.on && s.s === 1.5, "the magnifier: " + JSON.stringify(s));
    await expect(page.locator("#zoomBar .zmPct")).toHaveText("150%");
    const tf = await page.evaluate(() => document.querySelector(".w-embed .wBody").style.transform);
    ok(/scale\(1\.5/.test(tf), "the deck is not magnified: " + tf);
    await page.keyboard.press("PageDown");
    await expect.poll(slide).toBe("Slide 2");
    await page.mouse.move(800, 450); await page.mouse.down(); await page.mouse.move(1000, 600, { steps: 6 }); await page.mouse.up();
    const moved = await z();
    ok(moved.x > s.x && moved.y > s.y, "a drag did not move the view: " + JSON.stringify([s, moved]));
    await page.keyboard.press("PageDown");
    await expect.poll(slide).toBe("Slide 3");                          // the keys went back to the slides
    await page.click("#zoomBar .zmIn");
    ok((await z()).s === 2, "+ : " + JSON.stringify(await z()));
    await page.click("#zoomBar .zmOut"); await page.click("#zoomBar .zmOut");
    ok((await z()).s === 1.25, "− − : " + JSON.stringify(await z()));
    await page.mouse.dblclick(600, 400);
    ok((await z()).s === 2, "a double tap: " + JSON.stringify(await z()));
    await page.click("#zoomBar .zmDone");
    s = await z();
    ok(!s.on && (await page.evaluate(() => document.querySelector(".w-embed .wBody").style.transform)) === "", "Done: " + JSON.stringify(s));
    await page.click("#zoomBlob");
    await page.click("#unfocusBtn");
    ok(!(await z()).on, "Exit left the card zoomed");
    await expect(page.locator("#zoomBar")).toBeHidden();
  });
});

/* v7.22 — pick the side (Croix: "the low fi music. Can I get a way to pick which track I'm listening to"). */
test.describe("v7.22", () => {
  test("v7.22: tapping the side's name opens the picker; a side plays at once and is remembered; Repeat this side stays on it; ✕ closes", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addMusicBtn"); await page.keyboard.press("Escape");
    const api = () => page.evaluate(() => document.querySelector(".w-music")._entry.api.current());
    const running = () => page.evaluate(() => document.querySelector(".w-music")._entry.api.running());
    const picker = page.locator(".w-music .muPick");
    await expect(picker).toBeHidden();
    await page.click(".w-music .muWhat");
    await expect(picker).toBeVisible();
    const n = await page.locator(".w-music .muSide").count();
    const sides = await page.evaluate(() => document.querySelector(".w-music")._entry.api.sides());
    ok(n === sides.length && n >= 10, "the picker lists every side: " + n + " vs " + sides.length);
    await expect(page.locator('.w-music .muSide[aria-pressed="true"]')).toHaveCount(1);
    ok(/·/.test(await page.locator(".w-music .muSide span").first().textContent()), "each side says how it feels");
    await page.click('.w-music .muSide[data-i="8"]');
    await expect(picker).toBeHidden();
    await expect.poll(running).toBe(true);                             // picking a side plays it
    let c = await api();
    ok(c.i === 8 && !c.repeat, "picked: " + JSON.stringify(c));
    await expect(page.locator(".w-music .muWhat")).toContainText(sides[8]);
    // Repeat this side
    await page.click(".w-music .muWhat");
    await page.click(".w-music .muRepeat");
    await expect(page.locator(".w-music .muRepeat")).toHaveAttribute("aria-pressed", "true");
    await page.click(".w-music .muPickX");
    await expect(picker).toBeHidden();
    c = await api();
    ok(c.i === 8 && c.repeat, "repeat: " + JSON.stringify(c));
    // remembered: the board opens on the picked side
    await page.waitForTimeout(1200);
    const saved = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(x => x.type === "music"));
    ok(saved.side === 8 && saved.repeat === true, "saved: " + JSON.stringify(saved));
    await dh.reopen("#t=2026-09-29T10:30");
    await dh.launch();
    c = await api();
    ok(c.i === 8 && c.repeat, "after a reload: " + JSON.stringify(c));
    await expect(page.locator(".w-music .muWhat")).toContainText(sides[8]);
  });
});

/* v7.23 — a new tape (Croix: "Several of the tracks sound almost the same. I want some good study music lofi"). */
test.describe("v7.23", () => {
  test("v7.23: every side is its own band (no two share keys + comping + melody + drums), renders real sound at one loudness, and the picker says how each feels", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    const r = await page.evaluate(async () => {
      const L = window.Deckhand.lofi, all = L.TRACKS.concat([L.OCT]), out = [];
      for (const tr of all) {
        const buf = await L.render(tr, 6, 4);
        const d = buf.getChannelData(0), e = buf.getChannelData(1);
        let pk = 0, ss = 0, bad = 0;
        for (let i = 0; i < d.length; i++) { if (!isFinite(d[i]) || !isFinite(e[i])) bad++; pk = Math.max(pk, Math.abs(d[i]), Math.abs(e[i])); ss += d[i] * d[i]; }
        out.push({ name: tr.name, band: [tr.keys, tr.comp, tr.mel, tr.drums].join("/"), pk, db: 10 * Math.log10(ss / d.length), bad, feel: tr.feel });
      }
      return out;
    });
    ok(r.length === 12, "sides: " + r.length);
    const bands = new Set(r.map(x => x.band));
    ok(bands.size === r.length, "two sides share a band: " + r.map(x => x.band).join(" | "));
    for (const x of r) {
      ok(!x.bad, x.name + " rendered NaN");
      ok(x.pk > .1 && x.pk < .99, x.name + " peak " + x.pk);
      ok(x.db > -30 && x.db < -8, x.name + " loudness " + x.db.toFixed(1));
      ok(/·/.test(x.feel), x.name + " has no feel line");
    }
    await dh.addW("addMusicBtn"); await page.keyboard.press("Escape");
    await page.click(".w-music .muWhat");
    await expect(page.locator(".w-music .muSide span").first()).toHaveText(r[0].feel);
  });
});

/* v7.24 — the quiet album and nature sounds (Croix: "The second track was really cool. Everything
 * else was terrible. They were too fast paced or scratchy… are you able to produce nature noises
 * as well? I'd love a crackling fire, heavy rain, a thunderstorm, a babbling brook, forest sounds"). */
test.describe("v7.24", () => {
  test("v7.24: every side is slow and quiet on the needle; the five nature sounds render real sound; the card plays nature alone or under the lofi, Next walks the sounds with no music, and it all survives a reload", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    const r = await page.evaluate(async () => {
      const L = window.Deckhand.lofi, N = window.Deckhand.nature;
      const sides = L.TRACKS.concat([L.OCT]).map(t => ({ name: t.name, bpm: t.bpm, dust: t.dust, wow: t.wow }));
      const nat = [];
      for (const s of N.SOUNDS) {
        const buf = await N.render(s.id, 8);
        const d = buf.getChannelData(0); let pk = 0, ss = 0, bad = 0;
        for (let i = 44100 * 3; i < d.length; i++) { if (!isFinite(d[i])) bad++; pk = Math.max(pk, Math.abs(d[i])); ss += d[i] * d[i]; }
        nat.push({ id: s.id, pk, db: 10 * Math.log10(ss / (d.length - 44100 * 3)), bad });
      }
      return { sides, nat };
    });
    for (const s of r.sides) ok(s.bpm <= 68 && s.dust <= .25 && s.wow <= .8, "not relaxing: " + JSON.stringify(s));
    ok(r.sides[0].name === "Rainy window", "Rainy window is not side A");
    ok(r.nat.length === 9, "sounds: " + r.nat.length);
    for (const n of r.nat) {
      ok(!n.bad && n.pk > .05 && n.pk < .99, n.id + " peak " + n.pk);
      ok(n.db > -34 && n.db < -12, n.id + " loudness " + n.db.toFixed(1));
    }
    await dh.addW("addMusicBtn"); await page.keyboard.press("Escape");
    const what = () => page.locator(".w-music .muWhat").textContent();
    const cur = () => page.evaluate(() => document.querySelector(".w-music")._entry.api.current());
    const running = () => page.evaluate(() => document.querySelector(".w-music")._entry.api.running());
    await page.click(".w-music .muWhat");
    await expect(page.locator(".w-music .muNat")).toHaveCount(10);           // seven nature sounds, brown and white noise, and Off
    await page.click('.w-music .muNat[data-n="rain"]');
    await expect.poll(running).toBe(true);
    await expect(page.locator(".w-music .muWhat")).toHaveText("Lofi — Rainy window + Rain on the roof");
    await page.click(".w-music .muWhat");
    await page.click(".w-music .muNone");                                     // No music: the rain alone
    await expect(page.locator(".w-music .muWhat")).toHaveText("Rain on the roof");
    ok(await running(), "No music stopped the rain");
    await page.click(".w-music .muNext");
    await expect(page.locator(".w-music .muWhat")).toHaveText("Rain on the window");
    let c = await cur();
    ok(!c.lofi && c.nature === "window", "state: " + JSON.stringify(c));
    await page.waitForTimeout(1200);
    const saved = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(x => x.type === "music"));
    ok(saved.lofi === false && saved.nature === "window", "saved: " + JSON.stringify(saved));
    await page.click(".w-music .muWhat");
    await page.click('.w-music .muSide[data-i="2"]');                         // a side brings the music back, the storm stays under it
    await expect(page.locator(".w-music .muWhat")).toHaveText("Lofi — Reading nook + Rain on the window");
    await page.click(".w-music .muWhat");
    await page.click(".w-music .muNatOff");
    await expect(page.locator(".w-music .muWhat")).toHaveText("Lofi — Reading nook");
    await page.click(".w-music .muWhat");
    await page.click('.w-music .muNat[data-n="fire"]');
    await page.waitForTimeout(1200);
    await dh.reopen("#t=2026-09-29T10:30");
    await dh.launch();
    c = await cur();
    ok(c.lofi && c.nature === "fire" && c.name === "Reading nook", "after a reload: " + JSON.stringify(c));
  });
});

/* v7.25 — Midnight jazz (Croix: "I really like the slow piano jazz with the storm going on. It's cozy. Think you can replicate this?"). */
test.describe("v7.25", () => {
  test("v7.25: Midnight jazz is a slow piano ballad that brings the Thunderstorm with it when no sound is on; Off afterwards sticks", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    const tr = await page.evaluate(() => window.Deckhand.lofi.TRACKS.find(t => t.name === "Midnight jazz"));
    ok(tr && tr.keys === "piano" && tr.comp === "ballad" && tr.bpm <= 62 && tr.prog.length === 8, "the ballad: " + JSON.stringify(tr));
    await dh.addW("addMusicBtn"); await page.keyboard.press("Escape");
    const i = await page.evaluate(() => document.querySelector(".w-music")._entry.api.sides().indexOf("Midnight jazz"));
    await page.click(".w-music .muWhat");
    await page.click('.w-music .muSide[data-i="' + i + '"]');
    await expect(page.locator(".w-music .muWhat")).toHaveText("Lofi — Midnight jazz + Thunderstorm");
    await page.click(".w-music .muWhat");
    await page.click(".w-music .muNatOff");
    await expect(page.locator(".w-music .muWhat")).toHaveText("Lofi — Midnight jazz");
    await page.click(".w-music .muNext");
    await page.click(".w-music .muWhat");
    await page.click('.w-music .muNat[data-n="brook"]');
    await page.click(".w-music .muWhat");
    await page.click('.w-music .muSide[data-i="' + i + '"]');
    await expect(page.locator(".w-music .muWhat")).toHaveText("Lofi — Midnight jazz + Babbling brook");   // a sound already on stays
  });
});

/* v7.26 — the forest and the ocean (Croix: "The forest one was super washed out with static. It should be animal
 * noises and wind sounds, crickets occasionally, birds, other animals. Can you add in an ocean one. The rain and storm
 * sounded obvious when it changed tracks. I need it smoother."). */
test.describe("v7.26", () => {
  test("v7.26: the forest is wind and animals, not hiss; the ocean rises and falls in waves; the card mutes a side's own rain under a nature sound", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    const r = await page.evaluate(async () => {
      const N = window.Deckhand.nature, out = {};
      for (const id of ["forest", "ocean"]) {
        const buf = await N.render(id, 24);
        const d = buf.getChannelData(0), from = 44100 * 4;
        let hf = 0, all = 0, prev = 0;                     // brightness: the energy of the sample-to-sample change
        const w = [];
        for (let i = from; i < d.length; i++) { const x = d[i]; hf += (x - prev) * (x - prev); all += x * x; prev = x; }
        for (let i = from; i + 22050 <= d.length; i += 22050) { let s = 0; for (let j = 0; j < 22050; j++) s += d[i + j] * d[i + j]; w.push(Math.sqrt(s / 22050)); }
        out[id] = { bright: hf / all, swell: Math.max(...w) / Math.min(...w) };
      }
      return out;
    });
    ok(r.forest.bright < .05, "the forest hisses: " + JSON.stringify(r.forest));
    ok(r.ocean.swell > 1.6, "the ocean doesn't swell: " + JSON.stringify(r.ocean));
    await dh.addW("addMusicBtn"); await page.keyboard.press("Escape");
    await page.click(".w-music .muWhat");
    await page.click('.w-music .muNat[data-n="ocean"]');
    await expect(page.locator(".w-music .muWhat")).toHaveText("Lofi — Rainy window + Ocean");
    const saved = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(x => x.type === "music").nature);
    ok(saved === "ocean", "ocean not kept: " + saved);
  });
});

/* v7.27 — softer rain, a forest you can hear, a sea that breaks (Croix: "The forest, there's like a white noise and I
 * can't hear many forest sounds besides the birds… Ocean sounded super artificial… The rain was too much, it was like
 * sitting next to a faucet instead of rain on the roof or rain on the window"). */
test.describe("v7.27", () => {
  test("v7.27: the roof rain is dark (no faucet hiss), the window rain is its own sound, the forest's wind leaves room, and the ocean still breaks in waves", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    const r = await page.evaluate(async () => {
      const N = window.Deckhand.nature, out = {};
      for (const id of ["rain", "window", "forest", "ocean"]) {
        const buf = await N.render(id, 20);
        const d = buf.getChannelData(0), from = 44100 * 4;
        let hf = 0, all = 0, prev = 0; const w = [];
        for (let i = from; i < d.length; i++) { const x = d[i]; hf += (x - prev) * (x - prev); all += x * x; prev = x; }
        for (let i = from; i + 22050 <= d.length; i += 22050) { let s = 0; for (let j = 0; j < 22050; j++) s += d[i + j] * d[i + j]; w.push(Math.sqrt(s / 22050)); }
        out[id] = { bright: hf / all, swell: Math.max(...w) / Math.min(...w) };
      }
      return out;
    });
    ok(r.rain.bright < .02, "the roof rain hisses like a tap: " + JSON.stringify(r.rain));
    ok(r.window.bright > r.rain.bright * 3, "the window rain is the roof rain again: " + JSON.stringify(r));
    ok(r.forest.bright < .08, "the forest hisses: " + JSON.stringify(r.forest));
    ok(r.ocean.swell > 1.6, "the ocean doesn't break: " + JSON.stringify(r.ocean));
    const names = await page.evaluate(() => window.Deckhand.nature.SOUNDS.map(s => s.name));
    ok(names.includes("Rain on the roof") && names.includes("Rain on the window") && !names.includes("Heavy rain"), "rains: " + names.join("|"));
  });
});

/* v7.28 — from the day's teaching (Croix: "Can I have the ability to move the now playing pill? It's front and center
 * and blocks my slides… Can I get a refresh button for the embed?… Can I have a vertical pen menu on the left side of
 * the screen"). */
test.describe("v7.28", () => {
  test("v7.28: the Now Playing pill drags anywhere and stays there (a drag never pauses; a tap still does)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addMusicBtn"); await page.keyboard.press("Escape");
    const playing = () => page.evaluate(() => document.querySelector(".w-music")._entry.api.running());
    await page.evaluate(() => document.querySelector(".w-music")._entry.api.startPause());
    await expect.poll(playing).toBe(true);
    await page.evaluate(() => window.Deckhand.landing.show());
    const pill = page.locator("#nowPlaying");
    await expect(pill).toBeVisible({ timeout: 3000 });
    const a = await pill.boundingBox();
    await page.mouse.move(a.x + 20, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(a.x - 300, a.y + 400, { steps: 8 }); await page.mouse.up();
    const b = await pill.boundingBox();
    ok(b.y > a.y + 300 && b.x < a.x - 200, "the pill did not move: " + JSON.stringify([a, b]));
    ok(await playing(), "a drag paused the music");
    const pos = await page.evaluate(() => window.Deckhand.config.ui.npPos);
    ok(pos && pos.y > .3, "position not kept: " + JSON.stringify(pos));
    await page.waitForTimeout(500);
    await pill.click();
    await expect.poll(playing).toBe(false);
  });

  test("v7.28: ↻ Refresh loads the deck's latest edits — on the card and from the stage bar — and the clicker keeps working", async ({ page, dh }) => {
    const deck = path.join(dh.fixtureDir, "tmp_refresh_deck.html");
    const write = t => fs.writeFileSync(deck, '<!DOCTYPE html><title>Deck</title><body><h1 id="n">' + t + '</h1><script>var n=1;addEventListener("keydown",function(e){if(e.key==="PageDown"){n++;document.getElementById("n").textContent="' + t + ' "+n;}});</script>');
    write("Version 1");
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn");
      inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets; w[w.length - 1].url = u;
      document.querySelector(".w-embed .embFrame").src = u;
    }, "file://" + deck);
    const slide = () => page.frameLocator(".w-embed .embFrame").locator("#n").textContent();
    await expect.poll(slide).toBe("Version 1");
    await expect(page.locator(".w-embed .wReload")).toBeVisible();
    write("Version 2");
    await page.click(".w-embed .wReload");
    await expect.poll(slide, { timeout: 5000 }).toBe("Version 2");
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("#reloadStageBtn")).toBeVisible();
    write("Version 3");
    await page.click("#reloadStageBtn");
    await expect.poll(slide, { timeout: 5000 }).toBe("Version 3");
    await page.waitForTimeout(400);
    await page.keyboard.press("PageDown");
    await expect.poll(slide).toBe("Version 3 2");                  // the clicker's keys went back to the slides
    await page.click("#unfocusBtn");
    await page.click("#clockWidget .wFocus");
    await expect(page.locator("#reloadStageBtn")).toBeHidden();    // only for slides
  });

  test("v7.28: the pen tools stand up along the left edge; ⇄ moves them (and the pen) to the right and back, remembered", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    const geo = () => page.evaluate(() => { const r = document.getElementById("inkBar").getBoundingClientRect(); return { left: r.left, right: innerWidth - r.right, bottom: innerHeight - r.bottom, top: r.top, w: r.width, h: r.height }; });
    let g = await geo();
    ok(g.left < 40 && g.h > g.w && g.top > 40, "not a tall bar on the left: " + JSON.stringify(g));
    await page.click("#inkSide");
    g = await geo();
    ok(g.right < 40 && g.bottom < 40 && g.w > g.h, "⇄ did not send it to the bottom-right: " + JSON.stringify(g));
    ok((await page.evaluate(() => window.Deckhand.config.ui.inkSide)) === "right", "side not kept");
    await page.click("#inkSide");
    g = await geo();
    ok(g.left < 40, "⇄ did not bring it back: " + JSON.stringify(g));
    await page.click("#inkDone");
  });
});

/* v7.29 — lunch on the board (Croix: "Can I get a fun lunch graphic for during lunch time?"). */
test.describe("v7.29", () => {
  test("v7.29: during Lunch the clock card has the tray and the milk carton; taps chomp, hop and bite (three bites, then a fresh cookie); outside Lunch they're gone", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T12:50");                           // Black Tuesday: Lunch 12:42–1:12
    await dh.launch();
    await expect(page.locator("#periodNow")).toHaveText("Lunch");
    await expect(page.locator("#lunchArt .lunchTray")).toBeVisible();
    await expect(page.locator("#lunchArt .lunchMilk")).toBeVisible();
    const tray = await page.locator("#lunchArt .lunchTray").boundingBox(), clock = await page.locator("#clock").boundingBox();
    ok(tray.x + tray.width <= clock.x + 10, "the tray sits on the time: " + JSON.stringify([tray, clock]));
    const cookie = page.locator("#lunchArt .lCookie");
    const bites = () => page.evaluate(() => +(document.querySelector("#lunchArt .lCookie").dataset.bites || 0));
    for (const n of [1, 2, 3, 0]) { await cookie.click({ force: true }); ok((await bites()) === n, "bites " + (await bites()) + " not " + n); }
    await page.locator("#lunchArt .lApple").click({ force: true });
    ok(await page.evaluate(() => document.querySelector("#lunchArt .lApple").classList.contains("go")), "the apple did not hop");
    const before = await page.evaluate(() => { const w = document.getElementById("clockWidget"); return w.style.left + "," + w.style.top; });
    ok(before === await page.evaluate(() => { const w = document.getElementById("clockWidget"); return w.style.left + "," + w.style.top; }), "a lunch tap moved the clock");
    await page.evaluate(() => window.Deckhand.shiftClock(30 * 60000));   // 1:20, 4th period
    await page.waitForTimeout(1200);
    await expect(page.locator("#lunchArt .lunchTray")).toBeHidden();
  });
});

/* v7.30 — lunch, haunted (Croix: "it is October tomorrow, so they need to be haunted or spooky for this month"). */
test.describe("v7.30", () => {
  test("v7.30: in October the lunch is haunted — jack-o'-lantern, spider cookie, Franken-sandwich, BOO and a ghost that pops up for the milk; in September it's the everyday lunch", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-06T12:50");                           // Teal Tuesday: Lunch 12:42–1:12
    await dh.launch();
    await expect(page.locator("#lunchArt .lunchTray")).toBeVisible();
    await expect(page.locator("#lunchArt .lPk")).toBeVisible();
    await expect(page.locator("#lunchArt .lAppleBody")).toBeHidden();
    await expect(page.locator("#lunchArt .lLegs")).toBeVisible();
    await expect(page.locator("#lunchArt .lBolt").first()).toBeVisible();
    await expect(page.locator("#lunchArt text.ocOnly")).toHaveText("BOO");
    await expect(page.locator("#lunchArt text.ocNot")).toBeHidden();
    await page.locator("#lunchArt .lMilk").click({ force: true });
    ok(await page.evaluate(() => document.querySelector("#lunchArt .lGhost").classList.contains("go")), "no boo");
    await dh.openAt("#t=2026-09-29T12:50");
    await dh.launch();
    await expect(page.locator("#lunchArt .lAppleBody")).toBeVisible();
    await expect(page.locator("#lunchArt .lPk")).toBeHidden();
    await expect(page.locator("#lunchArt .lGhost")).toBeHidden();
  });
});

/* v7.31 — passing music, and zero goes straight to the slides (Croix: "music to play during passing time, but then
 * fade out during the 30 second settle in. For the last 10 seconds, I want the ticking down. Also remove the still
 * standing comment card action and jump straight into the slides."). */
test.describe("v7.31", () => {
  test("v7.31: passing music starts when a class lets out, fades to silence before the settle-in's last ten seconds, and the count goes straight to the slides", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T11:08:52");                        // Black Tuesday: 5th ends 11:09, passing to HOWL at 11:12
    await dh.launch();
    await page.evaluate(() => { const b = window.Deckhand.config.bell; b.passing = { on: true, side: 0, nature: "", volume: 0.5 }; b.settle.seconds = 20; window.Deckhand.config.sound.enabled = true; });
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets; w[w.length - 1].url = "about:blank#deck"; });
    const pm = () => page.evaluate(() => ({ p: window.Deckhand.passingMusic.playing(), f: window.Deckhand.passingMusic.fading(), l: window.Deckhand.passingMusic.level(), n: window.Deckhand.passingMusic.name() }));
    await expect.poll(async () => (await pm()).p, { timeout: 30000 }).toBe(true);   // the bell at 11:09 lets the class out
    let s = await pm();
    ok(/Passing · Lofi — Rainy window/.test(s.n), "name: " + JSON.stringify(s));
    await expect(page.locator("#nowPlaying")).toBeVisible({ timeout: 3000 });     // the pill can pause it
    await expect(page.locator("#nowPlaying .npName")).toContainText("Passing");
    // jump to just before the next bell (passing is 3 minutes)
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs - 12000); });   // 12 s before HOWL's bell
    await page.waitForTimeout(400);
    ok((await pm()).p && !(await pm()).f, "still passing, should still play");
    await expect.poll(() => page.evaluate(() => window.Deckhand.settle.running()), { timeout: 30000 }).toBe(true);   // the bell: the count
    await expect.poll(async () => (await pm()).f, { timeout: 3000 }).toBe(true);
    // the fade: gone by the time 10 s remain (20 s count → a 10 s fade)
    await expect.poll(async () => (await pm()).p, { timeout: 14000 }).toBe(false);
    const rem = await page.evaluate(() => +document.querySelector("#clockSettle .stBig").textContent);
    ok(rem >= 8, "the music outlasted the ticking's start: " + rem + " s left");
    // zero → no message card: the stage goes straight to the slides
    await expect.poll(() => page.evaluate(() => window.Deckhand.settle.live()), { timeout: 15000 }).toBe(false);
    ok(!(await page.evaluate(() => /comment card/i.test(document.querySelector("#clockSettle").textContent))), "the comment card showed");
  });
});

/* v7.32 — Comment Cards (Croix: "A comment card tracker. Let me pull students up and put them on warning. Then
 * I'll tag them as comment card. And I'll hit it at the end of class." … "a reminder at the end of class for
 * whatever students to bring me their comment cards"). Synthetic names only. */
test.describe("v7.32", () => {
  test("v7.32: the class as tiles — a tap is a warning, the next the card, the next another, the tile's − steps back; three minutes out the reminder fills the screen on its own; the cards are in the log as they are given; the wrap-up lists those still owed; marks and log survive a reload; works locked", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");                           // Black Tuesday, 5th period
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Dee","Ava","Cal","Ben"] }, { period: "HOWL Time", names: ["Eli","Fay"] }]; });
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const marks = () => page.evaluate(() => document.querySelector(".w-ccard")._entry.api.marks());
    const logd = () => page.evaluate(() => window.Deckhand.config.cards.log);
    const tile = n => page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    const tap = n => tile(n).locator(".ccTileMain").click();
    const minus = n => tile(n).locator(".ccMinus");
    await expect(page.locator(".w-ccard .ccTile")).toHaveCount(4);
    ok((await page.locator(".w-ccard .ccTileName").allTextContents()).join() === "Ava,Ben,Cal,Dee", "v7.40: the class is A to Z whatever the roster's order");
    await expect(page.locator(".w-ccard .ccTile.isWarn, .w-ccard .ccTile.isCard")).toHaveCount(0);
    await expect(minus("Ben")).toBeHidden();                          // nothing to take back yet
    await tap("Ben");
    await expect(tile("Ben")).toHaveClass(/isWarn/);
    await expect(tile("Ben").locator(".ccTileTag")).toHaveText("Warning");
    await tap("Ben");
    await expect(tile("Ben")).toHaveClass(/isCard/);
    await expect(tile("Ben").locator(".ccTileTag")).toHaveText("Card");
    await tap("Dee"); await tap("Dee"); await tap("Dee");             // v7.36: a third tap is a SECOND card
    await expect(tile("Dee").locator(".ccTileTag")).toHaveText("2 cards");
    await expect(minus("Dee")).toBeVisible();                         // v7.40: the way back is on the tile (no timed hold)
    await page.waitForTimeout(700);                                   // (a tap there straight after a tap up is still a tap up)
    await minus("Dee").click();
    await expect(tile("Dee").locator(".ccTileTag")).toHaveText("Card");
    await minus("Dee").click();
    await expect(tile("Dee")).toHaveClass(/isWarn/);
    await minus("Dee").click();
    await expect(tile("Dee")).not.toHaveClass(/isWarn|isCard/);
    await expect(minus("Dee")).toBeHidden();
    await tap("Cal");                                                 // a warning stays a warning
    ok(JSON.stringify(await marks()) === JSON.stringify({ Ben: 1, Cal: "warn" }), "marks: " + JSON.stringify(await marks()));
    await expect(page.locator(".w-ccard .ccSum")).toContainText("1 on warning");
    await expect(page.locator(".w-ccard .ccSum")).toContainText("1 card");
    // v7.40: the log holds the card the moment it is given — and only cards
    let L = await logd();
    ok(L.length === 1 && L[0].p === "5th" && L[0].d === "2026-09-29" && L[0].names.join() === "Ben" && Array.isArray(L[0].in) && !L[0].in.length, "log as given: " + JSON.stringify(L));
    // locked: still a live action
    await page.click("#lockBtn");
    await tap("Ava"); await tap("Ava"); await tap("Ava");             // two cards for Ava
    await expect(tile("Ava").locator(".ccTileTag")).toHaveText("2 cards");
    await expect(page.locator(".w-ccard .ccSum")).toContainText("3 cards");
    await dh.unlock();
    // the wrap-up, three minutes out, lists the cards due
    await page.evaluate(() => { window.Deckhand.config.bell.wrapup.on = true; window.Deckhand.config.bell.wrapup.minutes = 3; });
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs - 170000); });   // 2:50 to the bell
    await expect(page.locator("#clockWrap")).toBeVisible({ timeout: 4000 });
    await expect(page.locator("#clockWrap .wuCards")).toContainText("Ava ×2 · Ben");
    await page.keyboard.press("r");                                   // stand it down
    // v7.37: three minutes out the reminder comes up on its own — the cards (not the warning), the screen fills
    await expect(page.locator("#ccRemFull")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveCount(2);
    await expect(page.locator("#ccRemFull .ccRemName").first()).toHaveText("Ava ×2");
    await expect(page.locator("#ccRemFull .ccRemMsg")).toContainText("Bring yours to Mr. Shaffer");
    L = await logd();
    ok(L.length === 1 && L[0].names.join() === "Ava,Ava,Ben", "log: " + JSON.stringify(L));
    // v7.40: a name is tapped when its card is handed in — both of Ava's
    await page.waitForTimeout(800);
    await page.locator("#ccRemFull .ccRemName", { hasText: "Ava" }).click();
    await expect(page.locator("#ccRemFull .ccRemName", { hasText: "Ava" })).toHaveClass(/isIn/);
    await expect(page.locator("#ccRemFull .ccRemTop")).toContainText("1 of 2 handed in");
    L = await logd();
    ok(L[0].in.join() === "Ava,Ava", "handed in: " + JSON.stringify(L));
    await page.click("#ccRemFull .ccRemDone");
    await expect(page.locator("#ccRemFull")).toBeHidden();
    await expect(page.locator(".w-ccard .ccTile.isCard")).toHaveCount(2);   // v7.40: the board still says what happened this class
    await expect(page.locator(".w-ccard .ccTile.isWarn")).toHaveCount(1);
    await page.evaluate(() => document.querySelector(".w-ccard").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));   // the card back on top
    // the log view: totals, the day (who is in, who owes), and the list of those still owed
    await page.click(".w-ccard .ccLogBtn");
    await expect(page.locator(".w-ccard .ccTotals")).toContainText("Ava ×2");
    await expect(page.locator(".w-ccard .ccLogBody li").first()).toContainText("Ava ×2 ✓, Ben");
    await expect(page.locator(".w-ccard .ccOwe")).toHaveCount(1);
    await expect(page.locator(".w-ccard .ccOwe")).toContainText("Ben");
    await page.click(".w-ccard .ccLogClose");
    // a card given after the reminder is in the log at once (no second reminder)
    await tap("Cal");                                                 // warn → card
    L = await logd();
    ok(L.length === 1 && L[0].names.join() === "Ava,Ava,Ben,Cal" && L[0].in.join() === "Ava,Ava", "Cal's late card: " + JSON.stringify(L));
    await page.evaluate(() => window.Deckhand.shiftClock(5 * 60000));   // past the bell — HOWL Time
    await page.evaluate(() => window.Deckhand.ccardPop._bellWatch());
    await expect(page.locator("#ccRemFull")).toBeHidden();
    await page.evaluate(() => window.Deckhand.settle.reset());      // the jump also rang HOWL's bell
    await expect(page.locator(".w-ccard .ccTile")).toHaveCount(2);    // HOWL's roster now
    // survives a reload: the log, AND (v7.40) the marks on the tiles
    await page.waitForTimeout(1200);
    await dh.reopen("#t=2026-09-29T10:30");
    await dh.launch();
    L = await logd();
    ok(L.length === 1 && L[0].names.length === 4 && L[0].in.length === 2, "lost on reload: " + JSON.stringify(L));
    await expect(page.locator(".w-ccard .ccTile.isCard")).toHaveCount(3);
    ok(JSON.stringify(await marks()) === JSON.stringify({ Ben: 1, Cal: 1, Ava: 2 }), "marks after the reload: " + JSON.stringify(await marks()));
    // still owed: a tap when the card comes in the next morning, a second tap takes it back
    await page.click(".w-ccard .ccLogBtn");
    await expect(page.locator(".w-ccard .ccOwe")).toHaveCount(2);
    await page.locator(".w-ccard .ccOwe", { hasText: "Ben" }).click();
    await expect(page.locator(".w-ccard .ccOwe", { hasText: "Ben" })).toHaveClass(/isIn/);
    ok((await logd())[0].in.slice().sort().join() === "Ava,Ava,Ben", "Ben handed in from the log: " + JSON.stringify(await logd()));
    await page.locator(".w-ccard .ccOwe", { hasText: "Ben" }).click();
    await expect(page.locator(".w-ccard .ccOwe", { hasText: "Ben" })).not.toHaveClass(/isIn/);
    ok((await logd())[0].in.join() === "Ava,Ava", "and taken back: " + JSON.stringify(await logd()));
    // Clear today needs a second tap; it takes the marks with the entry
    await page.click(".w-ccard .ccClear");
    await expect(page.locator(".w-ccard .ccClear")).toHaveClass(/armed/);
    await page.click(".w-ccard .ccClear");
    ok((await logd()).length === 0, "Clear today did not clear: " + JSON.stringify(await logd()));
    await expect(page.locator(".w-ccard .ccTile.isCard, .w-ccard .ccTile.isWarn")).toHaveCount(0);
  });
});

/* v7.33 — Cadence on the board, and Mathle (Croix: "Add this as a tool. Also my kids go absolutely nuts over wordle. Can
 * you make your own version with all of the big math vocabulary words. Cadence should have all of the words."). */
test.describe("v7.33", () => {
  test("v7.33: the Cadence card opens cadence.html from Deckhand's own folder with nothing set, takes a link from ✎, stages with Refresh, and is sanitized", async ({ page, dh }) => {
    const stub = path.join(dh.fixtureDir, "tmp_cadence_stub.html");
    fs.writeFileSync(stub, '<!DOCTYPE html><title>Cadence stub</title><body><h1 id="n">Cadence</h1>');
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addCadenceBtn"); await page.keyboard.press("Escape");
    const src = await page.evaluate(() => document.querySelector(".w-cadence .cdFrame").getAttribute("src"));
    ok(/\/cadence\.html$/.test(src) && src.indexOf("file://") === 0, "no link set should mean the file beside Deckhand: " + src);
    await page.click(".w-cadence .wEdit");
    await page.fill(".w-cadence .cdIn", "file://" + stub);
    await page.keyboard.press("Enter");
    await expect(page.frameLocator(".w-cadence .cdFrame").locator("#n")).toHaveText("Cadence");
    ok((await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(x => x.type === "cadence").url)) === "file://" + stub, "the link was not kept");
    await page.evaluate(() => document.querySelector(".w-cadence .wFocus").click());
    await expect(page.locator("#reloadStageBtn")).toBeVisible();
    await page.click("#unfocusBtn");
    const bad = await page.evaluate(() => window.Deckhand.sanitize({ schemaVersion: 4, appVersion: "7.33.0", scenes: [{ name: "Daily Board", widgets: [{ type: "cadence", url: "javascript:alert(1)" }, { type: "cadence", url: "https://example.com/cadence.html" }] }] }).scenes[0].widgets.map(w => w.url));
    ok(bad[0] === "" && bad[1] === "https://example.com/cadence.html", "sanitize: " + JSON.stringify(bad));
  });

  test("v7.33: Mathle — the word of the day is the same for every period, the keyboard types into the selected card (M no longer mutes), Wordle's colours with repeats, a hint, the reveal with the definition, New word, and the grade band", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-05T10:30");
    await dh.launch();
    await dh.addW("addMathleBtn"); await page.keyboard.press("Escape");
    const api = fn => page.evaluate(fn);
    const word = () => api(() => document.querySelector(".w-mathle")._entry.api.word());
    const state = () => api(() => document.querySelector(".w-mathle")._entry.api.state());
    const w1 = await word();
    ok(/^[a-z]{4,13}$/.test(w1), "not a word: " + w1);
    // the same word for every period that day
    await page.evaluate(() => window.Deckhand.shiftClock(4 * 3600000));
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.Deckhand.settle.reset(); window.Deckhand.canvas.unfocus(); });   // the jump rang a bell; stand it down
    await page.evaluate(() => document.querySelector(".w-mathle")._entry.api.reset());
    ok((await word()) === w1, "the word changed within the day");
    // the keyboard goes to the game while it's selected: m types, it does not mute
    await page.evaluate(() => document.querySelector(".w-mathle").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    const soundBefore = await api(() => window.Deckhand.config.sound.enabled);
    await page.keyboard.type("m");
    ok((await api(() => window.Deckhand.config.sound.enabled)) === soundBefore, "M muted the board instead of typing");
    ok((await state()).cur === "m", "the letter did not land: " + JSON.stringify(await state()));
    await page.keyboard.press("Backspace");
    ok((await state()).cur === "", "Backspace did not delete");
    // a short guess shakes, not submits
    await page.keyboard.type("ab"); await page.keyboard.press("Enter");
    ok((await state()).guesses.length === 0, "a short guess was taken");
    await expect(page.locator(".w-mathle .mlMsg")).toContainText("Not enough letters");
    for (let i = 0; i < 2; i++) await page.keyboard.press("Backspace");
    // v7.34: not a word — the dictionary says no (the right number of letters, but nonsense)
    const junk = "xq".repeat(7).slice(0, w1.length);
    await page.keyboard.type(junk); await page.keyboard.press("Enter");
    ok((await state()).guesses.length === 0, "nonsense was taken as a guess");
    await expect(page.locator(".w-mathle .mlMsg")).toContainText("Not a word");
    for (let i = 0; i < w1.length; i++) await page.keyboard.press("Backspace");
    const has = w => page.evaluate(w => document.querySelector(".w-mathle")._entry.api.has(w), w);
    ok((await has("house")) && (await has("triangle")) && !(await has("triang")) && !(await has("xqxqxq")), "the dictionary");
    ok(await page.evaluate(() => window.Deckhand.mathleWords.every(x => document.querySelector(".w-mathle")._entry.api.has(x.w))), "a vocabulary word is missing from the dictionary");
    // Wordle's colouring with a repeated letter: play the word with its first two letters swapped (when they differ)
    // Wordle's colouring with repeats, checked on the scorer directly (a guess now has to be a real word)
    const colours = await page.evaluate(() => {
      const api = document.querySelector(".w-mathle")._entry.api, st = api.state();
      return { w: st.w };
    });
    ok(colours.w === w1, "state");
    // a real word of the right length as the first guess: the first dictionary word of that length that isn't the answer
    const guess1 = await page.evaluate(w => { const a = document.querySelector(".w-mathle")._entry.api; const cands = ["rational", "triangle", "equation", "function", "fraction", "diameter", "integers", "quadrant", "percent", "variable", "polygon", "outlier", "median", "volume", "radius", "slope", "range", "mean", "mode", "area", "data", "cube", "cone", "circle", "sample", "random", "linear", "origin", "scale", "surface", "theorem", "exponent", "constant", "domain", "inverse", "identity", "probability", "coefficient", "proportional", "distributive", "circumference", "parallelogram", "quadrilateral"]; return cands.find(c => c.length === w.length && c !== w && a.has(c)) || null; }, w1);
    if (guess1){
      await page.keyboard.type(guess1); await page.keyboard.press("Enter");
      await expect.poll(() => page.evaluate(() => document.querySelector(".w-mathle")._entry.api.revealing()), { timeout: 6000 }).toBe(false);   // the tiles turn one by one
      const tiles = await api(() => [...document.querySelectorAll(".w-mathle .mlRow")[0].children].map(t => (t.className.match(/\b(hit|near|miss)\b/) || [""])[0]));
      const expect2 = await page.evaluate(([g, w]) => { const res = [], left = {}; for (let i = 0; i < w.length; i++){ if (g[i] === w[i]) res[i] = "hit"; else { left[w[i]] = (left[w[i]] || 0) + 1; res[i] = "miss"; } } for (let i = 0; i < w.length; i++){ if (res[i] !== "hit" && left[g[i]]){ res[i] = "near"; left[g[i]]--; } } return res; }, [guess1, w1]);
      ok(tiles.join() === expect2.join(), "colouring " + guess1 + " vs " + w1 + ": " + tiles.join() + " expected " + expect2.join());
    }
    // the hint blanks the word
    await page.click(".w-mathle .mlHint");
    const hint = await page.locator(".w-mathle .mlMsg").textContent();
    ok(hint.toLowerCase().indexOf(w1) < 0, "the hint gives the word away: " + hint);
    // the solve: the reveal carries the definition
    await page.evaluate(() => document.querySelector(".w-mathle").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await page.keyboard.type(w1); await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => document.querySelector(".w-mathle")._entry.api.revealing()), { timeout: 6000 }).toBe(false);
    const st = await state();
    ok(st.done && st.won && st.guesses.length === (guess1 ? 2 : 1), "not won: " + JSON.stringify(st));
    await expect(page.locator(".w-mathle .mlMsg")).toContainText(guess1 ? "Got it in 2!" : "First try!");
    await expect(page.locator(".w-mathle .mlMsg .mlDef")).toBeVisible();
    // done: the keys go back to the board (M mutes now)
    await page.keyboard.type("m");
    ok((await api(() => window.Deckhand.config.sound.enabled)) !== soundBefore, "after the game M should mute again");
    await page.keyboard.type("m");
    // New word deals another; the band changes the pool
    await page.click(".w-mathle .mlNew");
    const w2 = await word();
    ok(w2 !== w1 && !(await state()).done, "New word did not deal: " + w2);
    await page.selectOption(".w-mathle .mlBand", "6");
    const w3 = await word();
    const g = await page.evaluate(w => window.Deckhand.mathleWords.find(x => x.w === w).g, w3);
    ok(!g.length || g.indexOf(6) >= 0, "a grade-6 band dealt " + w3 + " " + JSON.stringify(g));
    ok((await api(() => window.Deckhand.config.scenes[0].widgets.find(x => x.type === "mathle").band)) === "6", "band not kept");
  });
});

/* v7.35 — the comment cards as a quick draw (Croix: "Can you make it a quick draw like the pen. So I can pull it up quickly
 * even if slides are on the screen"). Synthetic names only. */
test.describe("v7.35", () => {
  test("v7.35: on a staged deck a blob opens the comment cards over the slides; marks are the card's marks; three minutes out the reminder fills the screen over the slides; the badge counts the cards still owed; the pen closes it", async ({ page, dh }) => {
    const deck = path.join(dh.fixtureDir, "tmp_cc_deck.html");
    fs.writeFileSync(deck, '<!DOCTYPE html><title>Deck</title><body><h1>Slide 1</h1>');
    await dh.openAt("#t=2026-09-29T10:30");                           // Black Tuesday, 5th
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee"] }]; });
    await expect(page.locator("#ccBlob")).toBeHidden();               // only on the stage
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn"); inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets; w[w.length - 1].url = u; document.querySelector(".w-embed .embFrame").src = u;
    }, "file://" + deck);
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("#ccBlob")).toBeVisible();
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await expect(page.locator("#ccScrim")).toBeVisible();
    await expect(page.locator("#ccPop .ccPopPer")).toHaveText("5th");
    const tile = n => page.locator("#ccPop .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    const tap = n => tile(n).locator(".ccTileMain").click();
    await expect(page.locator("#ccPop .ccTile")).toHaveCount(4);
    await tap("Ben"); await tap("Ben");                               // card
    await tap("Cal");                                                 // warning
    await expect(tile("Ben")).toHaveClass(/isCard/);
    await expect(page.locator("#ccBlob .ccBadge")).toHaveText("1");
    // the same marks the card on the board holds
    await page.click("#ccPop .ccPopX");
    await expect(page.locator("#ccPop")).toBeHidden();
    await expect(page.locator("#ccScrim")).toBeHidden();
    await page.click("#unfocusBtn");
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const cardTile = n => page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    await expect(cardTile("Ben")).toHaveClass(/isCard/);
    await expect(cardTile("Cal")).toHaveClass(/isWarn/);
    // back on the stage: three minutes out the reminder fills the screen over the slides; the card is in the log
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs - 170000); });
    await expect(page.locator("#ccRemFull")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveCount(1);
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveText("Ben");
    const logd = await page.evaluate(() => window.Deckhand.config.cards.log);
    ok(logd.length === 1 && logd[0].names.join() === "Ben", "log: " + JSON.stringify(logd));
    await expect(page.locator("#ccBlob .ccBadge")).toHaveText("1");   // v7.40: owed until it is handed in
    await page.waitForTimeout(800);                                   // (it came up by itself: a finger in flight is not a hand-in)
    await page.click("#ccRemFull .ccRemName");                        // handed in
    await expect(page.locator("#ccRemFull .ccRemMsg")).toContainText("All handed in");
    await page.click("#ccRemFull .ccRemDone");
    await expect(page.locator("#ccRemFull")).toBeHidden();
    await expect(page.locator("#ccBlob .ccBadge")).toBeHidden();
    // the sheet's Reminder brings it back (a card handed in late), quietly
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await page.click("#ccPop .ccRemBtn");
    await expect(page.locator("#ccRemFull")).toBeVisible();
    await expect(page.locator("#ccPop")).toBeHidden();
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveClass(/isIn/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#ccRemFull")).toBeHidden();
    // the pen closes the sheet (the blobs stay above the scrim: one tap)
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await page.click("#inkBlob");
    await expect(page.locator("#ccPop")).toBeHidden();
    await page.click("#inkDone");
  });
});

/* v7.38 — the reminder's minutes are a setting (Croix: "Yeah make it a setting"). */
test.describe("v7.38", () => {
  test("v7.38: Settings → Bells sets when the comment-card reminder comes up, and can turn it off (the bell still records)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben"] }]; });
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.fill("#sCcMin", "6");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    await page.click("#closeBtn");
    const cc = await page.evaluate(() => window.Deckhand.config.bell.ccard);
    ok(cc.on === true && cc.minutes === 6, "setting: " + JSON.stringify(cc));
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const tile = n => page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    await tile("Ben").click(); await tile("Ben").click();
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs - 5.5 * 60000); });   // 5:30 out: inside six minutes
    await expect(page.locator("#ccRemFull")).toBeVisible({ timeout: 10000 });
    await page.click("#ccRemFull .ccRemDone");
    // off: no reminder, the bell records
    await page.evaluate(() => { window.Deckhand.config.bell.ccard.on = false; });
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs + 185000); });   // through the passing: HOWL Time
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.Deckhand.settle.reset(); window.Deckhand.config.rosters.push({ period: "HOWL Time", names: ["Cal"] }); });
    await page.evaluate(() => document.querySelector(".w-ccard")._entry.api.rebuild());
    await page.evaluate(() => document.querySelector(".w-ccard").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));   // the settle-in staged the clock over the card
    await tile("Cal").click(); await tile("Cal").click();
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs - 60000); });   // one minute out
    await page.waitForTimeout(1500);
    await expect(page.locator("#ccRemFull")).toBeHidden();
    await page.evaluate(() => window.Deckhand.shiftClock(70000));   // the bell
    await page.waitForTimeout(1500);
    const logd = await page.evaluate(() => window.Deckhand.config.cards.log.map(e => e.p + ":" + e.names.join()));
    ok(logd.join("|") === "5th:Ben|HOWL Time:Cal", "log: " + JSON.stringify(logd));
  });
});

/* v7.39 — Croix: "The class lists were in the browser because cadence was able to pull them up.
 * Deckhand was not." Cadence keeps its own copy of the roster and shows it by itself; Deckhand only
 * read the Seating Chart's store, and only from a button. Now it reads both and looks at boot.
 * The second half of these tests is the adversarial review's list. Synthetic names only. */
test.describe("v7.39", () => {
  const T = "#t=2026-09-21T10:30";                 // a Monday, 2nd period
  /* what Cadence keeps: its field names (pid, no nick), names as it title-cased them */
  const CADENCE = {
    source: "file", savedAt: null, pinned: true,
    periods: [{ id: "p2", name: "Period 2", course: "1205040-7T2", room: "" }, { id: "p5", name: "Period 5", course: "", room: "" }],
    students: [
      { id: "a", pid: "p2", first: "Ava", last: "Alder", active: true, seat: null },
      { id: "b", pid: "p2", first: "Mary-Kate", last: "Bloom", active: true, seat: null },
      { id: "c", pid: "p5", first: "Cai", last: "Cole", active: true, seat: null },
      { id: "d", pid: "p5", first: "Gone", last: "Grad", active: false, seat: null }
    ]
  };
  /* what the Seating Chart keeps: a Focus export's capitals, numeric ids here to prove they are read, a typed "goes by" */
  const SC = {
    v: 1, layout: {}, charts: {},
    periods: [{ id: 1, sectionId: "s1", name: "Period 1" }, { id: 4, sectionId: "s4", name: "Period 4" }],
    students: [
      { id: "x", periodId: 1, raw: "ONEIL, DEWAYNE", first: "DEWAYNE", last: "ONEILXX", nick: "", active: true },
      { id: "y", periodId: 1, raw: "NGXX, THOMAS", first: "THOMAS", last: "NGXX", nick: "TJ", active: true },
      { id: "z", periodId: 4, raw: "ROYXX, ÉLISE", first: "ÉLISE", last: "ROYXX", nick: "", active: true }
    ]
  };
  const seed = (page, items) => page.evaluate(items => { for (const k in items) localStorage.setItem(k, JSON.stringify(items[k])); }, items);
  const mark = page => page.evaluate(() => localStorage.getItem("deckhand.rosters.auto"));
  const rosters = page => page.evaluate(() => window.Deckhand.config.rosters);

  test("v7.39: the Seating Chart's lists load by themselves on a board with no rosters — once, saved, with Undo; a typed nickname is kept as typed, capitals are tidied, last names never land; the cards open knowing their class", async ({ page, dh }) => {
    await dh.openAt(T);
    await seed(page, { "seatingchart.v1": SC, bwg27roster: CADENCE });
    await dh.launch();
    await dh.addW("addPickerBtn");
    await dh.flush();
    await dh.reopen("#t=2026-09-21T09:30");        // 1st period
    await dh.launch();
    const r = await rosters(page);
    ok(JSON.stringify(r) === JSON.stringify([{ period: "1st", names: ["Dewayne", "TJ"] }, { period: "4th", names: ["Élise"] }]), "rosters (the Seating Chart wins over Cadence's copy): " + JSON.stringify(r));
    ok(!/XX|ONEIL/i.test(JSON.stringify(await page.evaluate(() => window.Deckhand.config))), "a last name reached the board");
    await expect(page.locator("#rosterNote")).toBeVisible({ timeout: 4000 });
    await expect(page.locator("#rosterNote span")).toHaveText("Class lists loaded from the Seating Chart — 3 students, 2 periods");
    ok(!/No roster/i.test(await page.locator(".w-picker").textContent()), "the picker opened without its class");
    ok((await mark(page)) === "auto", "the once-only mark: " + await mark(page));
    ok((await dh.stored()).cfg.rosters.length === 2, "the loaded lists were not saved");
    // the notice waits for an answer (the old five-second toast was gone before anyone read it)
    await page.waitForTimeout(6000);
    await expect(page.locator("#rosterNote")).toBeVisible();
    // Undo empties them, and they do not come back on their own
    await page.locator("#rosterNote button", { hasText: "Undo" }).click();
    await expect(page.locator("#rosterNote")).toHaveCount(0);
    ok((await rosters(page)).length === 0, "Undo left the rosters");
    await dh.flush();
    await dh.reopen(T);
    await dh.launch();
    await page.waitForTimeout(1800);
    ok((await rosters(page)).length === 0 && (await page.locator("#rosterNote").count()) === 0, "the lists came back after an Undo");
  });

  test("v7.39: with only Cadence's copy in the browser the board says what it found and waits — Review fills the boxes for Apply (roster first names, so nothing is projected unseen); Not now is remembered; the button reads it too", async ({ page, dh }) => {
    await dh.openAt(T);
    await seed(page, { bwg27roster: CADENCE });
    await dh.reopen(T);
    await dh.launch();
    ok((await rosters(page)).length === 0, "Cadence's copy must not be committed unseen");
    await expect(page.locator("#rosterNote span")).toHaveText("Class lists found in Cadence’s roster — 3 students, 2 periods", { timeout: 4000 });
    ok((await mark(page)) === null, "no mark before she answers");
    await page.locator("#rosterNote button", { hasText: "Review" }).click();
    await expect(page.locator("#secRosters")).toBeVisible();
    await expect(page.locator("#setErrors")).toContainText("Loaded 3 students into 2 periods from Cadence’s roster.");
    await expect(page.locator("#setErrors")).toContainText("“goes by” name lives in the Seating Chart");
    ok((await page.inputValue('#rosterGrid textarea[data-period="2nd"]')) === "Ava, Mary-Kate", "2nd box");
    ok((await rosters(page)).length === 0, "Review committed before Apply");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    await page.click("#closeBtn");
    ok(JSON.stringify(await rosters(page)) === JSON.stringify([{ period: "2nd", names: ["Ava", "Mary-Kate"] }, { period: "5th", names: ["Cai"] }]), "after Apply");
    ok((await mark(page)) === "had", "mark after Apply: " + await mark(page));
    // she empties every box: they stay empty, and nothing asks again
    await page.click("#setBtn"); await dh.tab("rosters");
    for (const ta of await page.locator("#rosterGrid textarea").all()) await ta.fill("");
    await page.click("#applyBtn"); await page.click("#closeBtn");
    await dh.flush();
    await dh.reopen(T);
    await dh.launch();
    await page.waitForTimeout(1800);
    ok((await rosters(page)).length === 0 && (await page.locator("#rosterNote").count()) === 0, "emptied boxes were refilled or asked about again");
    // the button still reads Cadence's copy when she asks
    await page.click("#setBtn"); await dh.tab("rosters");
    await expect(page.locator("#rosterImportBtn")).toHaveText("Import class lists from this browser");
    await page.click("#rosterImportBtn");
    await expect(page.locator("#setErrors")).toContainText("from Cadence’s roster");
    await page.click("#closeBtn");
    // a fresh board: Not now is an answer too
    await page.evaluate(() => { localStorage.removeItem("deckhand.rosters.auto"); });
    await dh.reopen(T);
    await dh.launch();
    await page.locator("#rosterNote button", { hasText: "Not now" }).click({ timeout: 4000 });
    ok((await mark(page)) === "seen", "Not now should be remembered");
    await dh.reopen(T);
    await dh.launch();
    await page.waitForTimeout(1800);
    ok((await page.locator("#rosterNote").count()) === 0, "asked again after Not now");
  });

  test("v7.39: a board that already has rosters is never touched; two periods that read as one number are named, not merged; renamed periods land where they say; nothing but the two known stores is read; a save that fails leaves no mark", async ({ page, dh }) => {
    // her own rosters stay hers
    await dh.openAt(T);
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "3rd", names: ["Kept"] }]; });
    await seed(page, { "seatingchart.v1": SC });
    await dh.flush();
    await dh.reopen(T);
    ok(JSON.stringify(await rosters(page)) === JSON.stringify([{ period: "3rd", names: ["Kept"] }]) && (await mark(page)) === "had", "existing rosters: " + JSON.stringify(await rosters(page)) + " / " + await mark(page));
    // a clash is never auto-loaded: last semester's "Period 3" beside this one's
    const CLASH = { periods: [{ id: "a", name: "Period 3" }, { id: "b", name: "Period 3" }, { id: "c", name: "Sem 2 - Period 4" }, { id: "d", name: "Grade 7 P6" }, { id: "e", name: "1205040-7T2" }, { id: "f", name: "2nd/3rd block" }],
      students: [{ id: 1, periodId: "a", first: "OLDSEM", active: true }, { id: 2, periodId: "b", first: "NEWSEM", active: true }, { id: 3, periodId: "c", first: "FOUR", active: true },
                 { id: 4, periodId: "d", first: "SIX", active: true }, { id: 5, periodId: "e", first: "CODE", active: true }, { id: 6, periodId: "f", first: "BLOCK", active: true }] };
    await page.evaluate(() => { window.Deckhand.config.rosters = []; localStorage.removeItem("deckhand.rosters.auto"); });
    await seed(page, { "seatingchart.v1": CLASH });
    await dh.flush();
    await dh.reopen(T);
    await dh.launch();
    ok((await rosters(page)).length === 0, "a source with a clash was loaded unseen: " + JSON.stringify(await rosters(page)));
    await page.locator("#rosterNote button", { hasText: "Review" }).click({ timeout: 4000 });
    await expect(page.locator("#setErrors")).toContainText("Loaded 2 students into 2 periods from the Seating Chart.");
    await expect(page.locator("#setErrors")).toContainText("Not loaded: “1205040-7T2”, “2nd/3rd block”, “Period 3”, “Period 3”");
    ok((await page.inputValue('#rosterGrid textarea[data-period="4th"]')) === "Four" && (await page.inputValue('#rosterGrid textarea[data-period="6th"]')) === "Six", "renamed periods");
    ok((await page.inputValue('#rosterGrid textarea[data-period="3rd"]')) === "" && (await page.inputValue('#rosterGrid textarea[data-period="2nd"]')) === "", "a clashing or two-number period was filled");
    await page.click("#closeBtn");
    // the reader itself: bell labels need not start with a digit; one student is "1 student"
    const viaLabels = await page.evaluate(() => { const r = window.Deckhand.settings.seatingToRosters({ periods: [{ id: "a", name: "Period 2" }], students: [{ id: 1, periodId: "a", first: "ANA", last: "ZZTOP", active: true }] }, ["Period 1", "Period 2"]); return JSON.stringify(r.rosters) + "|" + r.count; });
    ok(viaLabels === '{"Period 2":["Ana"]}|1', "labels named Period N: " + viaLabels);
    ok((await page.evaluate(() => ["TJ", "AJ", "JO", "KC", "D'ÁNGELO", "MARY-KATE", "McDonald"].map(window.Deckhand.settings.tidyName).join())) === "TJ,AJ,Jo,KC,D'Ángelo,Mary-Kate,McDonald", "tidyName");
    // a key that merely looks like a roster is somebody else's data
    await page.evaluate(() => { localStorage.removeItem("seatingchart.v1"); localStorage.removeItem("deckhand.rosters.auto");
      localStorage.setItem("gradebook.rosterCache", JSON.stringify({ periods: [{ id: "a", name: "Period 2" }], students: [{ id: 1, periodId: "a", first: "Smith, John Q", active: true }] })); });
    await dh.reopen(T);
    await dh.launch();
    await page.waitForTimeout(1800);
    ok((await rosters(page)).length === 0 && (await page.locator("#rosterNote").count()) === 0 && (await page.evaluate(() => window.Deckhand.settings.classListsHere().length)) === 0, "an unrelated store was read");
    await page.click("#setBtn"); await dh.tab("rosters");
    await page.click("#rosterImportBtn");
    await expect(page.locator("#setErrors")).toContainText("No class lists in this browser");
    await page.click("#closeBtn");
    // a full store: the lists load for this sitting, but the once-only mark is not made, so they are not lost for good
    await seed(page, { "seatingchart.v1": SC });
    await page.evaluate(() => { localStorage.removeItem("gradebook.rosterCache"); sessionStorage.setItem("blockSave", "1"); });
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v){ if (k === "deckhand.config" && this === localStorage && sessionStorage.getItem("blockSave") === "1") throw new DOMException("full", "QuotaExceededError"); return set.call(this, k, v); };
    });
    dh.ignoreErrors(/QuotaExceeded|full/);
    await dh.reopen("#t=2026-09-21T09:30");
    ok((await rosters(page)).length === 2 && (await mark(page)) === null, "a failed save must leave no mark: " + await mark(page));
    await page.evaluate(() => sessionStorage.removeItem("blockSave"));
    await dh.reopen("#t=2026-09-21T09:30");
    // (the unblocked page saved them on its way out, so this boot finds them already there: "had")
    ok((await rosters(page)).length === 2 && /^(had|auto)$/.test(String(await mark(page))), "kept once the store took it: " + await mark(page));
    ok((await dh.stored()).cfg.rosters.length === 2, "not in the saved board");
  });
});

/* v7.40 — Croix: "Can you take a look at the comment card tool. It needs more development. It was
 * awkward and wonky to use." What was off: "Finding the student" and "The pop-up over slides". His
 * picks: big tiles A to Z, everyone at once; a tap steps up and a − steps down, with an Undo; a name
 * tapped on the reminder when the card is handed in. Synthetic names only. */
test.describe("v7.40", () => {
  const T = "#t=2026-09-29T10:30";                 // Black Tuesday, 5th period
  const CLASS = ["Wes","Kai","Aaliyah","Ximena","Ben","Olivia","Camila","Zeke","Dante","Tess","Eli","Rae","Fatima","Yara","Gus","Pip","Hana","Sam","Isaiah","Uma","Jo","Quinn","Leo","Val","Mia","Noah"];
  const AZ = CLASS.slice().sort().join();
  const shape = (page, root) => page.evaluate(root => {
    const g = document.querySelector(root + " .ccGrid"), tiles = [...g.querySelectorAll(".ccTile")];
    const r0 = tiles[0].getBoundingClientRect();
    return {
      order: tiles.map(t => t.querySelector(".ccTileName").textContent).join(),
      cols: tiles.filter(t => Math.abs(t.getBoundingClientRect().top - r0.top) < 2).length,
      scrolls: g.scrollHeight > g.clientHeight + 1 || g.scrollWidth > g.clientWidth + 1,
      w: Math.round(r0.width), h: Math.round(r0.height), f: parseFloat(getComputedStyle(tiles[0]).fontSize),
      clipped: tiles.filter(t => { const n = t.querySelector(".ccTileName"); return n.scrollWidth > n.clientWidth + 1; }).length
    };
  }, root);

  test("v7.40: the whole class shows at once, A to Z, in the same shape in the card, on the stage and in the quick-draw — nothing scrolls, no name is cut, and a tile is never rebuilt under a finger", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(names => { window.Deckhand.config.rosters = [{ period: "5th", names }]; }, CLASS);
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    await expect(page.locator(".w-ccard .ccTile")).toHaveCount(26);
    const card = await shape(page, ".w-ccard");
    ok(card.order === AZ, "the card is not A to Z: " + card.order);
    ok(card.cols === 4 && !card.scrolls && !card.clipped, "the card: " + JSON.stringify(card));
    ok(card.h >= 44 && card.w >= 120 && card.f >= 18, "tiles a finger can find: " + JSON.stringify(card));
    // nothing is rebuilt while the clock ticks
    await page.evaluate(() => { window.__tile = document.querySelector(".w-ccard .ccTile"); });
    await page.waitForTimeout(2300);
    ok(await page.evaluate(() => window.__tile === document.querySelector(".w-ccard .ccTile") && window.__tile.isConnected), "the tiles were rebuilt on the clock");
    // marked, a tile still shows the whole name beside its −
    await page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: "Ximena" }) }).locator(".ccTileMain").click();
    const mk = await page.evaluate(() => { const t = document.querySelector(".w-ccard .ccTile.isWarn"), n = t.querySelector(".ccTileName"), m = t.querySelector(".ccMinus").getBoundingClientRect(); return { cut: n.scrollWidth > n.clientWidth + 1, mw: Math.round(m.width), mh: Math.round(m.height) }; });
    ok(!mk.cut && mk.mw >= 36 && mk.mh >= 44, "the marked tile: " + JSON.stringify(mk));
    // on the stage: the same order and columns, far larger, and its own opener stands down
    await page.evaluate(() => document.querySelector(".w-ccard .wFocus").click());
    await expect.poll(async () => (await shape(page, ".w-ccard")).h, { timeout: 4000 }).toBeGreaterThan(90);
    const stage = await shape(page, ".w-ccard");
    ok(stage.order === AZ && stage.cols === 4 && !stage.scrolls && !stage.clipped && stage.f >= 40, "the stage: " + JSON.stringify(stage));
    await expect(page.locator("#ccBlob")).toBeHidden();
    await page.click("#unfocusBtn");
    // the quick-draw over another staged card: the same again
    await dh.addW("addTextBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => document.querySelector(".w-text .wFocus").click());
    await expect(page.locator("#ccBlob")).toBeVisible();
    const blob = await page.evaluate(() => { const b = document.getElementById("ccBlob"), r = b.getBoundingClientRect(); return { w: Math.round(r.width), op: +getComputedStyle(b).opacity }; });
    ok(blob.w >= 52 && blob.op >= 0.7, "the opener is large and not faint: " + JSON.stringify(blob));
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop .ccTile")).toHaveCount(26);
    const pop = await shape(page, "#ccPop");
    ok(pop.order === AZ && pop.cols === 4 && !pop.scrolls && !pop.clipped, "the sheet: " + JSON.stringify(pop));
    ok(pop.h >= 70 && pop.w >= 170 && pop.f >= 24, "the sheet's tiles: " + JSON.stringify(pop));
    await expect(page.locator("#ccPop .ccTile.isWarn .ccTileName")).toHaveText("Ximena");   // the same marks
  });

  test("v7.40: the sheet gets out of the way — a tap outside closes it without reaching what is under it, it closes itself a few seconds after a mark and when left alone; every tap says what it did, and Undo puts it back", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee"] }]; });
    await dh.addW("addTextBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => document.querySelector(".w-text .wFocus").click());
    const tile = n => page.locator("#ccPop .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    const marks = () => page.evaluate(() => JSON.stringify(window.Deckhand.ccToday.peek("5th") || {}));
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await expect(page.locator("#ccPop .ccStatTxt")).toHaveAttribute("data-hint", /Tap a name/);   // the hint is drawn, not spoken
    await expect(page.locator("#ccPop .ccStatTxt")).toHaveText("");
    await expect(page.locator("#ccPop .ccUndo")).toBeHidden();
    // a tap: what it did, and an Undo
    await tile("Ben").locator(".ccTileMain").click();
    await expect(page.locator("#ccPop .ccStatTxt")).toHaveText("Ben — warning");
    await expect(page.locator("#ccPop .ccUndo")).toBeVisible();
    await tile("Ben").locator(".ccTileMain").click();
    await expect(page.locator("#ccPop .ccStatTxt")).toHaveText("Ben — comment card");
    await page.click("#ccPop .ccUndo");                               // back to the warning, not to nothing
    await expect(tile("Ben")).toHaveClass(/isWarn/);
    ok(await marks() === '{"Ben":"warn"}', "Undo: " + await marks());
    await expect(page.locator("#ccPop .ccUndo")).toBeHidden();
    // the − says what it did too, and can be undone
    await page.waitForTimeout(700);
    await tile("Ben").locator(".ccMinus").click();
    await expect(page.locator("#ccPop .ccStatTxt")).toHaveText("Ben — cleared");
    ok(await marks() === "{}", "the minus: " + await marks());
    await page.click("#ccPop .ccUndo");
    ok(await marks() === '{"Ben":"warn"}', "Undo of a minus: " + await marks());
    // a tap outside: closed, and the tap did not land on the board's button under it
    const exit = await page.locator("#unfocusBtn").boundingBox();
    await page.mouse.click(exit.x + exit.width / 2, exit.y + exit.height / 2);
    await expect(page.locator("#ccPop")).toBeHidden();
    ok(await page.evaluate(() => document.body.classList.contains("focusMode")), "the outside tap reached Exit");
    // it closes itself after a mark…
    await page.evaluate(() => { window.Deckhand.ccardPop.times.after = 700; window.Deckhand.ccardPop.times.idle = 60000; });
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await tile("Cal").locator(".ccTileMain").click();
    await expect(page.locator("#ccPop")).toBeHidden({ timeout: 3000 });
    ok(await marks() === '{"Ben":"warn","Cal":"warn"}', "the mark stayed: " + await marks());
    // …and when nothing is tapped; a touch inside keeps it up
    await page.evaluate(() => { window.Deckhand.ccardPop.times.after = 60000; window.Deckhand.ccardPop.times.idle = 6000; });
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await page.waitForTimeout(2500);
    await page.locator("#ccPop .ccPopPer").click();
    await page.waitForTimeout(4200);                                  // well past six seconds since it opened, four since the touch
    await expect(page.locator("#ccPop")).toBeVisible();
    await expect(page.locator("#ccPop")).toBeHidden({ timeout: 6000 });
    // Escape closes it; the blob toggles it
    await page.evaluate(() => { window.Deckhand.ccardPop.times.idle = 60000; });
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeHidden();
    await page.click("#ccBlob");
    await page.keyboard.press("Escape");
    await expect(page.locator("#ccPop")).toBeHidden();
    ok(await page.evaluate(() => document.body.classList.contains("focusMode")), "Escape closed the stage with the sheet");
  });

  test("v7.40: marks are today's — kept through a reload, gone the next day with the log intact; what the log already held for the class is kept; nine cards is the ceiling", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(() => {
      window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal"] }];
      window.Deckhand.config.cards.log = [{ d: "2026-09-28", p: "5th", names: ["Cal"] }, { d: "2026-09-29", p: "5th", names: ["Zed"] }];   // an older version's entries: no `in`
    });
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const tile = n => page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    const logd = () => page.evaluate(() => window.Deckhand.config.cards.log);
    await tile("Ava").locator(".ccTileMain").click(); await tile("Ava").locator(".ccTileMain").click();
    let L = await logd();
    ok(L.length === 2 && L[1].names.join() === "Zed,Ava" && Array.isArray(L[1].in) && !("in" in L[0]), "today's earlier card is kept, yesterday is untouched: " + JSON.stringify(L));
    await page.waitForTimeout(700);
    await tile("Ava").locator(".ccMinus").click();                    // back to a warning: only Zed is left
    L = await logd();
    ok(L[1].names.join() === "Zed", "the minus reached the log: " + JSON.stringify(L));
    for (let i = 0; i < 12; i++) await tile("Ben").locator(".ccTileMain").click();
    await expect(tile("Ben").locator(".ccTileTag")).toHaveText("9 cards");
    await expect(page.locator(".w-ccard .ccStatTxt")).toContainText("nine cards is the most");
    // the log: yesterday's entry is not chased (untracked), today's is
    await page.click(".w-ccard .ccLogBtn");
    await expect(page.locator(".w-ccard .ccOwe")).toHaveCount(2);     // Zed and Ben, today
    await expect(page.locator(".w-ccard .ccLogBody li").last()).toHaveText(/Cal$/);
    await page.click(".w-ccard .ccLogClose");
    // a reload mid-class
    await dh.flush();
    await dh.reopen(T);
    await dh.launch();
    await expect(tile("Ben")).toHaveClass(/isCard/);
    await expect(tile("Ava")).toHaveClass(/isWarn/);
    L = await logd();
    ok(L.length === 2 && L[1].names.length === 10, "the log after the reload: " + JSON.stringify(L));
    // the next day: clean tiles, the log as it was
    await page.evaluate(() => window.Deckhand.shiftClock(24 * 3600000));
    await expect(page.locator(".w-ccard .ccTile.isCard, .w-ccard .ccTile.isWarn")).toHaveCount(0, { timeout: 4000 });
    L = await logd();
    ok(L.length === 2 && L[1].d === "2026-09-29" && L[1].names.length === 10, "yesterday's cards are still in the log: " + JSON.stringify(L));
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem("deckhand.ccard.today")).d) === "2026-09-30", "the store is today's");
  });

  test("v7.40: the handed-in list is sanitized (never more than the cards given, strings only), an old entry stays untracked, and the reminder skips a class whose cards are all in", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    const out = await page.evaluate(() => window.Deckhand.sanitize({ cards: { log: [
      { d: "2026-09-29", p: "5th", names: ["Ava", "Ava", "Ben"], in: ["Ava", "Ava", "Ava", "Zed", 7, " Ben "] },
      { d: "2026-09-28", p: "5th", names: ["Cal"] },
      { d: "2026-09-27", p: "5th", names: ["Dee"], in: "Dee" }
    ] } }).cards.log);
    ok(out[0].in.join() === "Ava,Ava,Ben" && !("in" in out[1]) && !("in" in out[2]), "sanitized: " + JSON.stringify(out));
    // all in before the bell: no reminder
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben"] }]; });
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const tile = n => page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    await tile("Ben").locator(".ccTileMain").click(); await tile("Ben").locator(".ccTileMain").click();
    await expect(page.locator(".w-ccard .ccRemBtn")).toBeVisible();
    await page.click(".w-ccard .ccRemBtn");                           // the card's own Reminder
    await expect(page.locator("#ccRemFull")).toBeVisible();
    await page.keyboard.press("Tab");                                 // the keyboard on a name checks it off; it does not close the reminder
    await page.locator("#ccRemFull .ccRemName").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveClass(/isIn/);
    await expect(page.locator("#ccRemFull")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#ccRemFull")).toBeHidden();
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs - 170000); });
    await page.waitForTimeout(2200);
    await expect(page.locator("#ccRemFull")).toBeHidden();
  });

  /* the adversarial review's list (20-odd findings; these pin the ones that mattered) */
  test("v7.40 (review): a double tap on a tile's right side is a card, not a warning taken back; marks saved without their bank are not counted twice; Undo of a − keeps the hand-in; a stale Undo changes nothing; a marked student who left the roster keeps a tile; one long name does not shrink the class", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee","Christopher-James"] }]; });
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const A = page.locator(".w-ccard").first();
    const tile = (n, root) => (root || A).locator(".ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    const logd = () => page.evaluate(() => window.Deckhand.config.cards.log);
    // one long name: its own tile is set smaller, the class is not
    const f = await page.evaluate(() => [...document.querySelectorAll(".w-ccard .ccTile")].map(t => ({ n: t.querySelector(".ccTileName").textContent, f: parseFloat(getComputedStyle(t).fontSize), cut: t.querySelector(".ccTileName").scrollWidth > t.querySelector(".ccTileName").clientWidth + 1 })));
    const long = f.find(x => x.n === "Christopher-James"), short = f.find(x => x.n === "Ava");
    ok(short.f >= 26 && long.f < short.f && !long.cut && f.filter(x => x.f === short.f).length === 4, "type sizes: " + JSON.stringify(f));
    // the double tap, on the right side where the − arrives
    const bx = await tile("Ava").boundingBox(), X = bx.x + bx.width * 0.92, Y = bx.y + bx.height / 2;
    await page.mouse.click(X, Y, { clickCount: 2 });                  // the second lands on the − that has just arrived: still a step up
    await expect(tile("Ava")).toHaveClass(/isCard/);
    await page.waitForTimeout(750);
    await page.mouse.click(X, Y);                                     // once it has settled, the − is the way back
    await expect(tile("Ava")).toHaveClass(/isWarn/);
    await page.mouse.click(X, Y);
    await expect(tile("Ava")).not.toHaveClass(/isWarn|isCard/);
    // Undo of a − keeps the hand-in
    await tile("Ben").locator(".ccTileMain").click(); await tile("Ben").locator(".ccTileMain").click();
    await A.locator(".ccRemBtn").click();
    await page.locator("#ccRemFull .ccRemName").click();
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveClass(/isIn/);
    await page.keyboard.press("Escape");
    ok((await logd())[0].in.join() === "Ben", "handed in: " + JSON.stringify(await logd()));
    await page.waitForTimeout(700);
    await tile("Ben").locator(".ccMinus").click();
    ok((await logd()).length === 0, "the card came off the log: " + JSON.stringify(await logd()));
    await A.locator(".ccUndo").click();
    let L = await logd();
    ok(L.length === 1 && L[0].names.join() === "Ben" && L[0].in.join() === "Ben", "Undo put the card back, still handed in: " + JSON.stringify(L));
    // a second comment card: an Undo left standing in the first changes nothing once the mark has moved
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const B = page.locator(".w-ccard").last();
    await page.evaluate(() => document.querySelector(".w-ccard").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await tile("Cal").locator(".ccTileMain").click();                 // A: Cal on warning (Undo offered)
    await expect(A.locator(".ccUndo")).toBeVisible();
    await page.evaluate(() => { const m = window.Deckhand.ccToday.marks("5th"); m.Cal = 2; window.Deckhand.ccToday.save(); document.dispatchEvent(new CustomEvent("deckhand:ccard")); });   // …and two cards given elsewhere
    await expect(tile("Cal", B).locator(".ccTileTag")).toHaveText("2 cards");
    await A.locator(".ccUndo").click();
    await expect(A.locator(".ccStatTxt")).toContainText("nothing undone");
    await expect(tile("Cal").locator(".ccTileTag")).toHaveText("2 cards");
    // a marked student taken off the roster keeps a tile after the class, and can be stepped back
    await page.evaluate(() => { window.Deckhand.config.rosters[0].names = ["Ava","Ben","Dee"]; });
    await expect(A.locator(".ccTile")).toHaveCount(4, { timeout: 4000 });
    ok((await A.locator(".ccTileName").allTextContents()).join() === "Ava,Ben,Dee,Cal", "the tile kept for a mark goes last");
    // marks in the store without their bank (what an early save looked like): the log's own copy is not read as older cards
    await page.evaluate(() => { const m = window.Deckhand.ccToday.marks("5th"); delete m.Cal; window.Deckhand.ccToday.save(); });
    await dh.flush();
    await page.evaluate(() => { const k = "deckhand.ccard.today", s = JSON.parse(localStorage.getItem(k)); delete s.bank; localStorage.setItem(k, JSON.stringify(s)); });
    await dh.reopen(T);
    await dh.launch();
    L = await logd();
    ok(L.length === 1 && L[0].names.join() === "Ben", "counted twice after the reload: " + JSON.stringify(L));
  });

  test("v7.40 (review): a card given after the reminder brings it back once the taps stop; the reminder is not shown twice for nothing; a ringing timer has the screen; the sheet goes with its stage and leaves a moment's cover when it closes itself", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal"] }]; window.Deckhand.ccardPop.times.quiet = 1500; });
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const tile = n => page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    // nobody owes a card when the minutes arrive: no reminder — and the block is not spent
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs - 170000); });
    await page.waitForTimeout(1800);
    await expect(page.locator("#ccRemFull")).toBeHidden();
    await page.evaluate(() => document.querySelector(".w-ccard").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await tile("Ben").locator(".ccTileMain").click(); await tile("Ben").locator(".ccTileMain").click();   // a card while they pack up
    await expect(page.locator("#ccRemFull")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(2500);
    await expect(page.locator("#ccRemFull")).toBeHidden();              // down, and it stays down
    await tile("Cal").locator(".ccTileMain").click(); await tile("Cal").locator(".ccTileMain").click();   // another late one
    await page.waitForTimeout(700);
    await expect(page.locator("#ccRemFull")).toBeHidden();              // not while the taps (and the Undo) are fresh
    await expect(page.locator("#ccRemFull")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveCount(2);
    // a ringing timer has the screen and the keys; the reminder is there again when it is answered
    await page.evaluate(() => document.getElementById("alarm").classList.add("on"));
    await expect(page.locator("#ccRemFull")).toBeHidden();
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.getElementById("alarm").classList.remove("on"));
    await expect(page.locator("#ccRemFull")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#ccRemFull")).toBeHidden();
    // the sheet: closing itself leaves the scrim (unseen) for a moment, so a late tap lands on nothing
    await dh.addW("addTextBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => document.querySelector(".w-text .wFocus").click());
    await page.evaluate(() => { window.Deckhand.ccardPop.times.after = 600; window.Deckhand.ccardPop.times.ghost = 4000; });
    await page.click("#ccBlob");
    await page.locator("#ccPop .ccTile", { has: page.locator(".ccTileName", { hasText: "Ava" }) }).locator(".ccTileMain").click();
    await expect(page.locator("#ccPop")).toBeHidden({ timeout: 3000 });
    ok(await page.evaluate(() => { const s = document.getElementById("ccScrim"); return !s.hidden && s.classList.contains("ghost"); }), "no cover behind the sheet that closed itself");
    await expect(page.locator("#ccScrim")).toBeHidden({ timeout: 8000 });
    // …and it does not outlive its stage
    await page.evaluate(() => { window.Deckhand.ccardPop.times.after = 60000; });
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await page.evaluate(() => document.getElementById("unfocusBtn").click());
    await expect(page.locator("#ccPop")).toBeHidden();
    await expect(page.locator("#ccScrim")).toBeHidden();
    ok(await page.evaluate(() => !window.Deckhand.ccardPop.isOpen()), "the sheet thinks it is still open");
  });
});

/* v7.41 — Croix: "The minimize works, but sometimes when I click on a minimized tab it just deleted
 * instead of popping up. The comment cards and name generator are a little awkward because the flow
 * is expand the bottom menu, add, find it, then I can use it, then I've got to minimize it to get
 * back to the slides. There wasn't much flow." His picks: the picker as a button by the pen; tabs on
 * the stage; and on the comment cards' own button: "I forgot about the one by the pen."
 * Synthetic names only. */
test.describe("v7.41", () => {
  const T = "#t=2026-09-29T10:30";                 // Black Tuesday, 5th period
  const stageDeck = async (page, dh) => {
    const deck = path.join(dh.fixtureDir, "tmp_flow_deck.html");
    fs.writeFileSync(deck, '<!DOCTYPE html><title>Deck</title><body><h1>Slide 1</h1><script>window.clicks = 0; addEventListener("click", () => { window.clicks++; });</scr' + 'ipt>');
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn"); inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets; w[w.length - 1].url = u; document.querySelector(".w-embed .embFrame").src = u;
    }, "file://" + deck);
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("#focusBar")).toBeVisible();
  };
  const onTop = (page, sel) => page.evaluate(sel => {
    const w = document.querySelector(sel), r = w.getBoundingClientRect();
    if (getComputedStyle(w).display === "none") return false;
    const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!(e && e.closest(sel));
  }, sel);
  const deckHasKeys = page => page.evaluate(() => !!document.activeElement && document.activeElement.classList.contains("embFrame"));

  test("v7.41: a minimized card's tab brings it up OVER staged slides (it came back underneath, so the tab just vanished); on the stage the tabs are in the stage bar — a tap up, a tap away, no bottom menu; they go when the stage ends", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee"] }]; });
    await dh.addW("addPickerBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(w => w.type === "picker"); w.x = 60; w.y = 0; document.querySelector(".w-picker")._entry.api.resync(); document.querySelector(".w-picker").style.left = "60%"; document.querySelector(".w-picker").style.top = "0%"; });   // its home is the top edge
    await page.click(".w-picker .wMin");
    await expect(page.locator("#shelf .minChip")).toHaveCount(1);
    await stageDeck(page, dh);
    // the road he took: open the bottom menu, tap the tab
    await page.click("#dockTog");
    await page.click("#shelf .minChip");
    await expect(page.locator("#shelf .minChip")).toHaveCount(0);
    ok(await onTop(page, ".w-picker"), "the card came back under the slides");
    const top = await page.evaluate(() => document.querySelector(".w-picker").getBoundingClientRect().top);
    ok(top >= 60, "the card's strip is under the stage bar: top " + top);
    // the stage bar holds its tab while it is up: the same tap puts it away
    const tab = page.locator("#stageShelf .stTab", { hasText: "Name Picker" });
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    const tap = async () => { await page.waitForTimeout(550); await tab.click(); };   // (two taps inside half a second are one)
    await tap();
    await expect(page.locator(".w-picker")).toBeHidden();
    await expect(tab).toHaveAttribute("aria-pressed", "false");
    ok(await deckHasKeys(page), "the clicker's keys did not go back to the slides");
    await tap();                                                      // …and up again, with the bottom menu shut
    ok(await onTop(page, ".w-picker"), "the stage tab did not bring the card up over the slides");
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    // locked: tabs are a live action
    await page.evaluate(() => { window.Deckhand.config.ui.locked = true; document.body.classList.add("locked"); });
    await tap();
    await expect(page.locator(".w-picker")).toBeHidden();
    await tap();
    ok(await onTop(page, ".w-picker"), "locked: the tab did not bring the card up");
    await page.evaluate(() => { window.Deckhand.config.ui.locked = false; document.body.classList.remove("locked"); });
    // a card added over the slides has a tab too; the summoned timer keeps its own road
    if (await page.evaluate(() => document.body.classList.contains("dockMin"))) await page.click("#dockTog");
    await dh.addW("addTallyBtn");
    await expect(page.locator("#stageShelf .stTab")).toHaveCount(2);
    await expect(page.locator("#stageShelf .stTab", { hasText: "Tally" })).toHaveAttribute("aria-pressed", "true");
    // the stage ends: no tabs. What a tab brought up goes back to its tab (left up, it was under
    // the next slides with no tab); a card added over the slides stays on the board
    await page.click("#unfocusBtn");
    await expect(page.locator("#stageShelf .stTab")).toHaveCount(0);
    await expect(page.locator(".w-picker")).toBeHidden();
    await expect(page.locator("#shelf .minChip")).toHaveCount(1);
    await expect(page.locator(".w-tally")).toBeVisible();
    // …so on the next stage its tab is there again, one tap from the slides
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("#stageShelf .stTab", { hasText: "Name Picker" })).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(550);
    await page.locator("#stageShelf .stTab", { hasText: "Name Picker" }).click();
    ok(await onTop(page, ".w-picker"), "second stage: the tab did not bring the card up");
    await page.locator("#stageShelf .stTab", { hasText: "Name Picker" }).dblclick();   // a double tap is one tap
    ok(await onTop(page, ".w-picker"), "a double tap put the card straight back");
    await page.click("#unfocusBtn");
    // off the stage its chip brings it home: an ordinary card, in its own layer and place
    await page.click("#shelf .minChip");
    await expect(page.locator(".w-picker")).toBeVisible();
    const home = await page.evaluate(() => { const w = document.querySelector(".w-picker"); return { z: +w.style.zIndex, top: w.style.top }; });
    ok(home.z < 250000 && home.top === "0%", "the card did not go home: " + JSON.stringify(home));
  });

  test("v7.41: the name picker by the pen — one tap and a name is over the slides, another tap another name; the class's round is shared with the picker card; absent students are skipped; the slides keep the keys; it puts itself away", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    const NAMES = ["Ava","Ben","Cal","Dee"];
    await page.evaluate(names => { window.Deckhand.config.rosters = [{ period: "5th", names }]; }, NAMES);
    await expect(page.locator("#pkBlob")).toBeHidden();               // only on the stage
    await stageDeck(page, dh);
    await expect(page.locator("#pkBlob")).toBeVisible();
    // the buttons say what they are when a card takes the stage
    ok(await page.evaluate(() => document.body.classList.contains("blobTips")), "no labels when the stage came up");
    await expect(page.locator("#pkBlob .blobTip")).toHaveText("Pick a name");
    await expect(page.locator("#ccBlob .blobTip")).toHaveText("Comment cards");
    const name = () => page.locator("#pkPop .pkPopName").textContent();
    await page.click("#pkBlob");
    await expect(page.locator("#pkPop")).toBeVisible();
    ok(!(await page.evaluate(() => document.body.classList.contains("blobTips"))), "the labels stayed over the open tool");
    await expect(page.locator("#pkPop .pkPopPer")).toHaveText("5th");
    const seen = [await name()];
    ok(NAMES.includes(seen[0]), "one tap did not pick: " + seen[0]);
    await expect(page.locator("#pkPop .pkPopLeft")).toHaveText("3 of 4 left");
    ok(!(await deckHasKeys(page)), "v7.42: the name holds the keys while it is up (the clicker puts it away)");
    for (let i = 0; i < 3; i++){ await page.click("#pkPop .pkPopGo"); seen.push(await name()); }
    ok(seen.slice().sort().join() === NAMES.join(), "a name came twice before everyone had been: " + seen.join());
    await expect(page.locator("#pkPop .pkPopLeft")).toHaveText("0 of 4 left");
    await page.click("#pkBlob");                                      // the button itself picks the next: a fresh round
    ok(NAMES.includes(await name()), "no fresh round");
    await expect(page.locator("#pkPop .pkPopLeft")).toHaveText("3 of 4 left");
    const last = await name();
    // a tap on the slide puts it away, and does not reach the slide
    const slideClicks = () => page.frames().find(f => /tmp_flow_deck/.test(f.url())).evaluate(() => window.clicks);
    await page.mouse.click(1500, 620);
    await expect(page.locator("#pkPop")).toBeHidden();
    ok((await slideClicks()) === 0, "the outside tap turned the slide");
    // …but a tap aimed at one of the board's own buttons still does what it says
    await page.click("#pkBlob");
    await expect(page.locator("#pkPop")).toBeVisible();
    const tb = await page.locator("#focusTimerBtn").boundingBox();
    await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await expect(page.locator("#pkPop")).toBeHidden();
    await expect(page.locator("#focusTimerMenu")).toBeVisible();
    await page.click("#focusTimerBtn");
    await expect(page.locator("#focusTimerMenu")).toBeHidden();
    // absent students are never called
    await page.evaluate(() => { window.Deckhand.absent.toggle("5th", "Ava"); window.Deckhand.absent.toggle("5th", "Ben"); });
    const got = [];
    for (let i = 0; i < 6; i++){ await page.click("#pkBlob"); got.push(await name()); }
    ok(got.every(n => n === "Cal" || n === "Dee"), "an absent student was called: " + got.join());
    await page.evaluate(() => { window.Deckhand.absent.toggle("5th", "Ava"); window.Deckhand.absent.toggle("5th", "Ben"); });
    // it puts itself away, leaving a moment's cover so a late tap does not land on the slide
    await page.evaluate(() => { window.Deckhand.pickPop.times.after = 700; window.Deckhand.pickPop.times.ghost = 4000; });   // (a long cover: the check below must not race it)
    await page.click("#pkPop .pkPopGo");
    const shown = await name();
    await expect(page.locator("#pkPop")).toBeHidden({ timeout: 4000 });
    ok(await page.evaluate(() => { const s = document.getElementById("pkScrim"); return !s.hidden && s.classList.contains("ghost"); }), "no cover behind the picker that closed itself");
    await page.mouse.click(1500, 620); await page.mouse.click(1500, 620);   // two late taps: both land on the cover
    await expect(page.locator("#pkScrim")).toBeHidden({ timeout: 8000 });
    ok((await slideClicks()) === 0, "a tap reached the slide");
    await page.evaluate(() => { window.Deckhand.pickPop.times.ghost = 900; });
    // the pen and the comment cards do not share the corner with it
    await page.evaluate(() => { window.Deckhand.pickPop.times.after = 60000; });
    await page.click("#pkBlob");
    await page.click("#ccBlob");
    await expect(page.locator("#pkPop")).toBeHidden();
    await expect(page.locator("#ccPop")).toBeVisible();
    await page.click("#pkBlob");
    await expect(page.locator("#ccPop")).toBeHidden();
    await expect(page.locator("#pkPop")).toBeVisible();
    const before = await name();
    await page.click("#inkBlob");
    await expect(page.locator("#pkPop")).toBeHidden();
    await page.click("#inkDone");
    // the same round as the picker card: it opens on the last name, with the same count
    await page.click("#unfocusBtn");
    await dh.addW("addPickerBtn"); await page.keyboard.press("Escape");
    await expect(page.locator(".w-picker .pkName")).toHaveText(before);
    const left = await page.locator(".w-picker .pkLeft").textContent();
    await page.click(".w-picker .pkGo");                              // the card picks: one fewer for both
    await expect(page.locator(".w-picker .pkLeft")).not.toHaveText(left);
    // with the picker card itself on the stage its quick button stands down
    await page.evaluate(() => document.querySelector(".w-picker .wFocus").click());
    await expect(page.locator("#pkBlob")).toBeHidden();
    await expect(page.locator("#ccBlob")).toBeVisible();
    ok(shown && last, "names");
  });

  test("v7.41: over staged slides, + Add → Comment Cards or Name Picker opens the quick tool (no card to place or minimize) and its button by the pen draws the eye; off the stage they are cards as before", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee"] }]; });
    await stageDeck(page, dh);
    await page.click("#dockTog");
    await dh.addW("addCcardBtn");
    await expect(page.locator("#ccPop")).toBeVisible();
    await expect(page.locator(".w-ccard")).toHaveCount(0);
    await expect(page.locator("#ccPop .quickNote")).toBeVisible();
    await expect(page.locator("#ccBlob")).toHaveClass(/pulse/);
    ok(await page.evaluate(() => document.body.classList.contains("dockMin")), "the bottom menu stayed open over the slides");
    await page.click("#ccPop .ccPopX");
    await page.click("#ccBlob");                                      // opened from its own button: no note
    await expect(page.locator("#ccPop .quickNote")).toBeHidden();
    await page.click("#ccPop .ccPopX");
    await page.click("#dockTog");
    await dh.addW("addPickerBtn");
    await expect(page.locator("#pkPop")).toBeVisible();
    await expect(page.locator(".w-picker")).toHaveCount(0);
    await expect(page.locator("#pkPop .quickNote")).toBeVisible();
    ok(["Ava","Ben","Cal","Dee"].includes(await page.locator("#pkPop .pkPopName").textContent()), "the menu's picker did not pick");
    await page.click("#pkPop .pkPopX");
    // off the stage: cards
    await page.click("#unfocusBtn");
    await dh.addW("addPickerBtn"); await page.keyboard.press("Escape");
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    await expect(page.locator(".w-picker")).toHaveCount(1);
    await expect(page.locator(".w-ccard")).toHaveCount(1);
    await expect(page.locator("#pkPop")).toBeHidden();
  });

  /* the adversarial review's list (15 findings; these pin the ones that mattered) */
  test("v7.41 (review): a Stage-only deck's tab stages it in one tap; + Add falls back to the card when the quick tool cannot open; a ringing timer stands the picker down; a name put away mid-shuffle keeps its turn (two students, one first name); the reminder takes a name that was up; a minimized timer summoned from the stage bar is seen", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Sam","Sam","Lee"] }]; });
    await dh.addW("addTimerBtn"); await page.keyboard.press("Escape");
    await page.click(".w-timer .wMin");
    await stageDeck(page, dh);
    // the minimized timer, summoned: it used to count down unseen
    await page.click("#focusTimerBtn");
    await page.click("#focusTimerMenu [data-min]");
    ok(await page.evaluate(() => { const w = document.querySelector(".w-timer"); return !w.classList.contains("wMinned") && getComputedStyle(w).display !== "none"; }), "the summoned timer stayed in its tab");
    // a ringing timer: nothing of the picker sits on "tap anywhere", and its button spends nobody's turn
    await page.evaluate(() => document.getElementById("alarm").classList.add("on"));
    await expect(page.locator("#pkBlob")).toBeHidden();
    await page.evaluate(() => window.Deckhand.pickPop.open());
    ok(!(await page.evaluate(() => window.Deckhand.pickPop.isOpen())), "the picker opened under the alarm");
    await page.evaluate(() => document.getElementById("alarm").classList.remove("on"));
    // put away mid-shuffle (twice): nobody loses a turn, and neither Sam is lost
    await page.evaluate(() => { const t = window.Deckhand.pickPop.times; t.force = true; t.spin = 6000; t.after = 60000; });
    for (let i = 0; i < 2; i++){
      await page.click("#pkBlob");
      await expect(page.locator("#pkPop .pkPopName")).toHaveClass(/spin/);
      await page.click("#pkPop .pkPopX");
      await expect(page.locator("#pkPop")).toBeHidden();
    }
    await page.evaluate(() => { window.Deckhand.pickPop.times.force = false; });
    const got = [];
    for (let i = 0; i < 3; i++){ await page.click("#pkBlob"); got.push(await page.locator("#pkPop .pkPopName").textContent()); }
    ok(got.slice().sort().join() === "Lee,Sam,Sam", "the round after two shuffles put away: " + got.join());
    await expect(page.locator("#pkPop .pkPopLeft")).toHaveText("0 of 3 left");
    // the reminder comes up over a name: the name goes, and the slides do not get the keys back
    await page.evaluate(() => { const m = window.Deckhand.ccToday.marks("5th"); m.Lee = 1; window.Deckhand.ccToday.save(); });
    await page.click("#ccBlob"); await page.locator("#ccPop .ccTile", { has: page.locator(".ccTileName", { hasText: "Lee" }) }).locator(".ccTileMain").click();   // a second card: the log has it
    await page.click("#ccPop .ccPopX");
    await page.click("#pkBlob");
    await expect(page.locator("#pkPop")).toBeVisible();
    await page.evaluate(() => window.Deckhand.ccardPop.remind("5th"));
    await expect(page.locator("#ccRemFull")).toBeVisible();
    await expect(page.locator("#pkPop")).toBeHidden();
    ok(!(await deckHasKeys(page)), "the slides took the keys from under the reminder");
    await page.evaluate(() => window.Deckhand.pickPop.open());
    ok(!(await page.evaluate(() => window.Deckhand.pickPop.isOpen())), "the picker opened under the reminder");
    await page.click("#ccRemFull .ccRemDone");
    // + Add with the slide zoomed: the quick tool cannot come up, so the card is added (not nothing)
    await page.click("#zoomBlob");
    ok(await page.evaluate(() => document.body.classList.contains("zooming")), "not zoomed");
    await page.click("#dockTog");
    await dh.addW("addPickerBtn");
    await expect(page.locator(".w-picker")).toHaveCount(1);
    await expect(page.locator("#pkPop")).toBeHidden();
    await expect(page.locator("#pkPop .quickNote")).toBeHidden();
    await page.locator("#zoomBar .zmDone").click();
    // a Stage-only deck: minimized from the stage, its tab stages it again in one tap
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(w => w.type === "embed"); w.stageOnly = true; window.Deckhand.canvas.syncShelf(document.querySelector(".w-embed")._entry); });
    await page.click("#minStageBtn");
    ok(!(await page.evaluate(() => document.body.classList.contains("focusMode"))), "Minimize did not leave the stage");
    await page.locator("#shelf .minChip", { hasText: "Slides" }).click();
    await expect(page.locator(".w-embed")).toHaveClass(/wFull/);
    ok(await page.evaluate(() => document.body.classList.contains("focusMode")), "the Stage-only deck's tab did not stage it");
  });
});

/* v7.42 — Croix: "Will it dismiss the stuff if I click my clicker? I also had a ton of issues with
 * it losing that. Sometimes when I'd draw it wouldn't work until I physically clicked the slides.
 * Sometimes when I used the tools it was the same thing." Asked what a click should do with a name,
 * the comment cards or the reminder up: "Put it away." And: "the tools menu is exactly where the
 * slides number is, so it's tough when I have to navigate to later units." Synthetic names only. */
test.describe("v7.42", () => {
  const T = "#t=2026-09-29T10:30";                 // Black Tuesday, 5th period
  /* A deck that counts the clicker: PageDown / ArrowRight turn its page. It is served from
     http://127.0.0.1 so that, like Google Slides in a file:// Deckhand, its frame lives in ANOTHER
     PROCESS — a file:// deck shares the board's process and cannot show the real fault (the frame
     navigates, the keyboard falls back to the board's window, and document.activeElement still
     names the frame). The adversarial review found this; every focus test here uses it. */
  const http = require("http");
  let srv = null, DECK = "";
  test.beforeAll(async () => {
    const html = '<!DOCTYPE html><title>Deck</title><body><h1 id="n">Slide 1</h1><script>window.slide = 1; addEventListener("keydown", e => { if (e.key === "PageDown" || e.key === "ArrowRight") window.slide++; if (e.key === "PageUp" || e.key === "ArrowLeft") window.slide--; });</scr' + 'ipt>';
    srv = http.createServer((q, r) => { r.writeHead(200, { "content-type": "text/html" }); r.end(html); });
    await new Promise(r => srv.listen(0, "127.0.0.1", r));
    DECK = "http://127.0.0.1:" + srv.address().port + "/keys_deck.html";
  });
  test.afterAll(async () => { if (srv) await new Promise(r => srv.close(r)); });
  const stageDeck = async (page, dh) => {
    dh.ignoreErrors && dh.ignoreErrors(/127\.0\.0\.1/);
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn"); inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets; w[w.length - 1].url = u; document.querySelector(".w-embed .embFrame").src = u;
    }, DECK);
    await expect.poll(() => !!page.frames().find(f => /keys_deck/.test(f.url()))).toBe(true);
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("#focusBar")).toBeVisible();
    /* the test is only worth anything if the deck really is out of process */
    const cdp = await page.context().browser().newBrowserCDPSession();
    const oop = (await cdp.send("Target.getTargets")).targetInfos.some(x => x.type === "iframe" && /keys_deck/.test(x.url));
    await cdp.detach();
    ok(oop, "the fixture deck is not an out-of-process frame — these tests would prove nothing");
  };
  const slide = async page => { const f = page.frames().find(f => /keys_deck/.test(f.url())); try { return f ? await f.evaluate(() => window.slide) : 0; } catch (e) { return 0; } };   // (0 while the frame is between documents)
  /* the frame is the active element AND the board's window has heard its own blur: the keys really are in the frame
     (activeElement alone names a frame that has since dropped them — that was the fault) */
  const deckHasKeys = page => page.evaluate(() => !!document.activeElement && document.activeElement.classList.contains("embFrame") && !window.Deckhand.canvas.keys().winFocused);
  /* one press of the clicker must turn the page — the keys are back with the slides within a moment of any touch */
  const turns = async (page, what) => {
    await expect.poll(() => deckHasKeys(page), { timeout: 4000, message: "the keys never went back to the slides after: " + what }).toBe(true);
    const was = await slide(page);
    await page.keyboard.press("PageDown");
    await expect.poll(() => slide(page), { timeout: 2000, message: "the clicker was dead after: " + what }).toBe(was + 1);
  };

  test("v7.42: the clicker is never dead on staged slides — after a card over them is tapped, dragged or typed in, the keys go back to the slides by themselves; someone typing keeps them; a press that lands on the board is the last one lost", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await dh.addW("addTallyBtn"); await page.keyboard.press("Escape");
    await dh.addW("addTextBtn"); await page.keyboard.press("Escape");
    await page.click(".w-tally .wMin"); await page.click(".w-text .wMin");
    await stageDeck(page, dh);
    await turns(page, "the slides took the stage");
    // Refresh: the frame navigates, and in another process that dropped the keys while it still LOOKED focused
    await page.click("#reloadStageBtn");
    await expect.poll(() => slide(page), { timeout: 6000 }).toBe(1);
    await turns(page, "Refresh");
    // the deck put away and brought back (what the bell does with the next class's slides)
    await page.click("#minStageBtn");
    await page.locator("#shelf .minChip", { hasText: "Slides" }).click();
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect.poll(() => slide(page), { timeout: 6000 }).toBe(1);
    await turns(page, "the deck minimized, brought back and staged");
    // a card up from its tab, and its button tapped: this left the clicker dead until the slide was tapped
    await page.locator("#stageShelf .stTab", { hasText: "Tally" }).click();
    await turns(page, "a card came up from its tab");
    await page.locator(".w-tally button", { hasText: "+1" }).first().click();
    await turns(page, "a button on the card over the slides");
    const body = await page.locator(".w-tally .wBody").boundingBox();
    await page.mouse.click(body.x + 14, body.y + 14);
    await turns(page, "a tap on the card itself");
    const strip = await page.locator(".w-tally .strip").boundingBox();
    await page.mouse.move(strip.x + 40, strip.y + strip.height / 2); await page.mouse.down();
    await page.mouse.move(strip.x - 160, strip.y + 120, { steps: 5 }); await page.mouse.up();
    await turns(page, "a drag of the card");
    // someone typing in a note over the slides keeps the keys; the clicker gets them when they tap away
    await page.waitForTimeout(550);
    await page.locator("#stageShelf .stTab", { hasText: "Text" }).click();
    await page.locator(".w-text .txBody").click();                     // a tap starts the note
    const before = await slide(page);
    await page.keyboard.type("Quiz Friday");
    await page.waitForTimeout(900);                                   // (two looks of the keeper)
    ok(!(await deckHasKeys(page)), "the slides took the keys from someone typing");
    await expect(page.locator(".w-text")).toContainText("Quiz Friday");
    ok((await slide(page)) === before, "typing turned the slide");
    // a note someone walked away from: the clicker's page key takes the keys back (that press is spent)
    await page.keyboard.type("!");
    const s1 = await slide(page);
    await page.keyboard.press("PageDown");
    ok((await slide(page)) === s1, "(the press that left the note cannot also turn the page)");
    await turns(page, "the clicker pressed with the caret still in a note");
    // the safety net: with the keys on the board (a keyboard user's key held them there), the press
    // that lands on the board sends them back — the next turns the page
    await page.evaluate(() => { window.Deckhand.canvas.holdKeys(5000); const f = document.activeElement; if (f && f.blur) f.blur(); window.focus(); });
    ok(!(await deckHasKeys(page)), "(the keys are on the board for this step)");
    const s0 = await slide(page);
    await page.keyboard.press("PageDown");
    ok((await slide(page)) === s0, "(that press cannot be passed into the frame)");
    await turns(page, "a clicker press that landed on the board");
    // a list left open and closed is not the clicker's to work: the scene list would change the scene
    await page.click("#dockTog");
    await page.locator("#sceneSel").focus();
    const scene = await page.evaluate(() => window.Deckhand.config.activeScene);
    await page.keyboard.press("PageDown");
    ok((await page.evaluate(() => window.Deckhand.config.activeScene)) === scene && await page.evaluate(() => document.body.classList.contains("focusMode")), "the clicker worked the scene list");
    await turns(page, "the clicker pressed on a list");
    // an unfinished entry on a timer under the stage held the keys for good
    await page.click("#focusTimerBtn"); await page.click("#focusTimerMenu [data-custom]");
    await page.keyboard.press("5"); await page.keyboard.press("0");
    await page.mouse.click(4, 300);                                   // (the board's edge — clear of the stage bar)
    await turns(page, "digits typed on a timer and never started");
  });

  test("v7.42: the clicker puts away what is up — a name, the comment cards, the reminder (the pen already) — and the next press turns the slide", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee"] }]; });
    await stageDeck(page, dh);
    const away = async (what, isUp) => {
      const was = await slide(page);
      ok(await isUp(), what + " is not up");
      await page.keyboard.press("PageDown");
      await expect.poll(isUp, { timeout: 2000, message: "the clicker did not put away " + what }).toBe(false);
      ok((await slide(page)) === was, what + ": the press that put it away also turned the slide");
      await turns(page, what + " was put away by the clicker");
    };
    await page.click("#pkBlob");
    await expect(page.locator("#pkPop")).toBeVisible();
    await away("the name", () => page.evaluate(() => window.Deckhand.pickPop.isOpen()));
    await page.click("#pkBlob"); await page.click("#pkPop .pkPopGo");  // after "Pick another" too (the tap left the keys on the board)
    await away("the second name", () => page.evaluate(() => window.Deckhand.pickPop.isOpen()));
    await page.click("#ccBlob");
    await page.locator("#ccPop .ccTile", { has: page.locator(".ccTileName", { hasText: "Ben" }) }).locator(".ccTileMain").click();
    await page.locator("#ccPop .ccTile", { has: page.locator(".ccTileName", { hasText: "Ben" }) }).locator(".ccTileMain").click();
    await away("the comment cards", () => page.evaluate(() => window.Deckhand.ccardPop.isOpen()));
    await page.evaluate(() => window.Deckhand.ccardPop.remind("5th"));
    await expect(page.locator("#ccRemFull")).toBeVisible();
    await away("the reminder", () => page.evaluate(() => window.Deckhand.ccardPop.reminding()));
    await page.click("#inkBlob");
    await away("the pen", () => page.evaluate(() => document.body.classList.contains("inking")));
    // a ringing timer: the clicker answers it
    await dh.summonCard();
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await expect(page.locator("#alarm")).toHaveClass(/on/, { timeout: 6000 });
    await page.keyboard.press("PageDown");
    await expect(page.locator("#alarm")).not.toHaveClass(/on/);
    await turns(page, "the alarm was answered with the clicker");
  });

  test("v7.43: a note being written over the staged slides stays open while the teacher thinks — the keeper no longer shuts it after twenty seconds; the clicker's page key still closes it and turns on", async ({ page, dh }) => {
    test.setTimeout(90000);
    await dh.openAt(T);
    await dh.launch();
    await dh.addW("addTextBtn"); await page.keyboard.press("Escape");
    await page.click(".w-text .wMin");
    await stageDeck(page, dh);
    await turns(page, "the slides took the stage");
    await page.locator("#stageShelf .stTab", { hasText: "Text" }).click();
    await page.locator(".w-text .txBody").click();
    await page.keyboard.type("Exit ticket:");
    await page.waitForTimeout(23000);                                  // past the old twenty seconds, no key pressed
    await expect(page.locator(".w-text")).toHaveClass(/txEditing/);
    ok(!(await deckHasKeys(page)), "the slides took the keys from a note still being written");
    await page.keyboard.type(" #4");
    await page.locator(".w-text .txBtn").click();
    await expect(page.locator(".w-text")).not.toHaveClass(/txEditing/);
    await expect(page.locator(".w-text .txInner")).toHaveText("Exit ticket: #4");
    await turns(page, "Done on a note over the slides");
  });

  test("v7.42: on the stage the folded menu handle leaves the bottom-left corner (the Slides player's page number is there) and sits with the other tools; unfolded it opens along the bottom; off the stage it is home", async ({ page, dh }) => {
    await dh.openAt(T);
    await dh.launch();
    const box = () => page.evaluate(() => { const r = document.getElementById("dock").getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), b: Math.round(r.bottom) }; });
    const inCorner = b => b.x < 320 && b.b > 1080 - 110;             // where the player keeps ‹ › and its page list
    await stageDeck(page, dh);
    let b = await box();
    ok(!inCorner(b), "the folded handle is on the Slides player's corner: " + JSON.stringify(b));
    const pk = await page.locator("#pkBlob").boundingBox();
    ok(b.x < 80 && b.y >= pk.y + pk.height, "left-hand pen: the handle is not under the tools: " + JSON.stringify(b));
    await page.evaluate(() => document.body.classList.remove("inkLeft"));   // the pen on the right: first in the bottom-right row
    b = await box();
    const pk2 = await page.locator("#pkBlob").boundingBox();
    ok(!inCorner(b) && b.r <= pk2.x + 4 && b.b > 1000, "right-hand pen: the handle is not in the row: " + JSON.stringify(b));
    await page.evaluate(() => document.body.classList.add("inkLeft"));
    await page.click("#dockTog");                                     // it still opens the bar, along the bottom
    await expect(page.locator("#addBtn")).toBeVisible();
    b = await box();
    ok(b.b > 1000 && b.x < 80, "the unfolded bar is not along the bottom: " + JSON.stringify(b));
    await page.click("#dockTog");
    await page.click("#inkBlob");                                     // the pen out: its own bar has Done
    await expect(page.locator("#dock")).toBeHidden();
    await page.click("#inkDone");
    await expect(page.locator("#dock")).toBeVisible();
    await page.click("#unfocusBtn");
    b = await box();
    ok(inCorner(b), "off the stage the bar is not home: " + JSON.stringify(b));
  });
});

test.describe("v7.43", () => {
  /* Croix: "The text box tool was super weird. The title wouldn't go away when I clicked done. Then it
     worked. Then it didn't. Then I held down done and it worked. I want to be able to just tap done."
     Done shut the editor on the finger's DOWN; the tap's click then landed on the note that slid up
     under the finger and opened it again. Only a finger shows it — a mouse click never did. */
  const editing = page => page.evaluate(() => document.querySelector(".w-text").classList.contains("txEditing"));
  const tapOn = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  for (const staged of [false, true]){
    test("@touch v7.43: one tap on Done closes the note" + (staged ? " (on the stage)" : "") + " — every time; a double tap does not open it again; held or slid, it closes; a tap elsewhere on the note opens it straight away", async ({ page, dh }) => {
      await dh.openAt("#t=2026-10-06T10:30:00");
      await dh.launch();
      await dh.addW("addTextBtn"); await page.keyboard.press("Escape");
      if (staged){ await page.evaluate(() => document.querySelector(".w-text .wFocus").click()); await page.waitForTimeout(400); }
      for (let i = 0; i < 5; i++){
        await tapOn(page, ".w-text .txDisplay");
        await expect.poll(() => editing(page), { message: "a tap on the note did not open it (round " + (i + 1) + ")" }).toBe(true);
        await page.keyboard.type(i ? " " + i : "Quiz Friday");
        if (staged && !i){                      // on the stage the bar (Timer · Minimize · Exit) covered the top of Done
          const d = await page.locator(".w-text .txBtn").boundingBox(), f = await page.locator("#focusBar").boundingBox();
          ok(d.y >= f.y + f.height + 4 || d.x >= f.x + f.width || d.x + d.width <= f.x, "the stage bar covers Done");
        }
        await tapOn(page, ".w-text .txBtn");
        await page.waitForTimeout(300);
        ok(!(await editing(page)), "one tap on Done left the editor open (round " + (i + 1) + ")");
        await page.waitForTimeout(150);
      }
      await expect(page.locator(".w-text .txInner")).toHaveText("Quiz Friday 1 2 3 4");
      ok((await page.evaluate(() => document.querySelector(".w-text")._entry.cfg.html)).includes("Quiz Friday 1 2 3 4"), "the note was not saved");
      // a double tap on Done: the second tap lands on the note — it must not open it again
      await tapOn(page, ".w-text .txDisplay");
      await expect.poll(() => editing(page)).toBe(true);
      const b = await page.locator(".w-text .txBtn").boundingBox();
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(90);
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(300);
      ok(!(await editing(page)), "a double tap on Done opened the note again");
      await expect(page.locator(".w-text .txBar")).toBeHidden();
      // a press held on Done (what worked for him before), and a tap whose finger slid: both close it
      const cdp = await page.context().newCDPSession(page);
      const touchAt = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
      for (const [hold, slide] of [[900, 0], [60, 18]]){
        await page.waitForTimeout(600);
        await tapOn(page, ".w-text .txDisplay");
        await expect.poll(() => editing(page)).toBe(true);
        const d = await page.locator(".w-text .txBtn").boundingBox(), x = d.x + d.width / 2, y = d.y + d.height / 2;
        await touchAt("touchStart", x, y); await page.waitForTimeout(hold);
        if (slide) await touchAt("touchMove", x + slide * 0.6, y + slide * 0.8);
        await touchAt("touchEnd"); await page.waitForTimeout(300);
        ok(!(await editing(page)), slide ? "a tap on Done that slid " + slide + "px left the editor open" : "a press held on Done left the editor open");
      }
      await cdp.detach();
      // the half-second guard is only where Done was: a tap elsewhere on the note right away opens it
      await tapOn(page, ".w-text .txDisplay");
      await expect.poll(() => editing(page)).toBe(true);
      await tapOn(page, ".w-text .txBtn");
      const n = await page.locator(".w-text .txDisplay").boundingBox();
      await page.touchscreen.tap(n.x + n.width / 2, n.y + n.height * 0.75);
      await expect.poll(() => editing(page), { message: "a tap on the note away from Done, just after Done, did not open it" }).toBe(true);
      await tapOn(page, ".w-text .txBtn");
      await expect(page.locator(".w-text .txInner")).toHaveText("Quiz Friday 1 2 3 4");
    });
  }
});

test.describe("v7.44", () => {
  /* Croix: "That saved your board and rosters message, can you have it go away after a few seconds" */
  const olderCopy = async (page, bells) => page.evaluate(b => {
    const o = JSON.parse(localStorage.getItem("deckhand.config"));
    o.fileVersion = "6.33.0";
    if (b) o.cfg.bell.groups[0].name = "Old Week";
    localStorage.setItem("deckhand.config", JSON.stringify(o));
  }, bells);
  test("v7.44: the 'board and rosters were kept' banner goes away by itself in a few seconds — longer when it offers the new bells; a touch keeps it; the other-window warning in the same banner stays", async ({ page, dh }) => {
    test.setTimeout(90000);
    // plain: gone by itself in about six seconds
    await dh.openAt("#t=2026-09-21T10:30");
    await olderCopy(page, false);
    await dh.reopen("#t=2026-09-21T10:30");
    await expect(page.locator("#verNudgeText")).toContainText("rosters were kept");
    await page.waitForTimeout(4500);
    await expect(page.locator("#verNudge")).toBeVisible();
    await expect(page.locator("#verNudge")).toBeHidden({ timeout: 4000 });
    // offering the new bell schedule: still there at eight seconds, gone by itself after
    await olderCopy(page, true);
    await dh.reopen("#t=2026-09-21T10:30");
    await expect(page.locator("#verNudgeBells")).toBeVisible();
    await page.waitForTimeout(8000);
    await expect(page.locator("#verNudge")).toBeVisible();
    await expect(page.locator("#verNudge")).toBeHidden({ timeout: 9000 });
    // a tap on "Use the new bell schedule" while it is fading still adopts the bells (it used to fall through to the card below)
    await olderCopy(page, true);
    await dh.reopen("#t=2026-09-21T10:30");
    await expect(page.locator("#verNudgeBells")).toBeVisible();
    await page.waitForFunction(() => document.getElementById("verNudge").classList.contains("vnFade"), null, { timeout: 17000 });
    await page.click("#verNudgeBells", { force: true });
    await expect(page.locator("#verNudge")).toBeHidden();
    ok((await page.evaluate(() => window.Deckhand.config.bell.groups[0].name)) === "Teal Week", "the bells tap during the fade was lost");
    // a touch on it keeps it until × or the button
    await olderCopy(page, false);
    await dh.reopen("#t=2026-09-21T10:30");
    await page.locator("#verNudgeText").click();
    await page.waitForTimeout(7500);
    await expect(page.locator("#verNudge")).toBeVisible();
    await page.click("#verNudgeKeep");
    await expect(page.locator("#verNudge")).toBeHidden();
    // the update banner up, then another window saves: that warning must not fade with it
    await olderCopy(page, false);
    await dh.reopen("#t=2026-09-21T10:30");
    await page.evaluate(() => {
      const o = JSON.parse(localStorage.getItem("deckhand.config")); o.cfg.ownerName = "Ms. Other";
      const str = JSON.stringify(o); localStorage.setItem("deckhand.config", str);
      window.dispatchEvent(new StorageEvent("storage", { key: "deckhand.config", newValue: str, oldValue: "x" }));
    });
    await expect(page.locator("#verNudgeText")).toContainText("another window");
    await page.waitForTimeout(8000);
    await expect(page.locator("#verNudge")).toBeVisible();
    await expect(page.locator("#verNudgeText")).toContainText("another window");
  });
});
