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
  test("v7.32: the class as tiles — a tap is a warning, the next the card, the next clears; End of class logs the cards and stages the reminder until Done; the wrap-up lists them; the log totals and survives a reload; the bell records what was forgotten; works locked", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");                           // Black Tuesday, 5th period
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee"] }, { period: "HOWL Time", names: ["Eli","Fay"] }]; });
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const marks = () => page.evaluate(() => document.querySelector(".w-ccard")._entry.api.marks());
    const tile = n => page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    await expect(page.locator(".w-ccard .ccTile")).toHaveCount(4);
    await expect(page.locator(".w-ccard .ccTile.isWarn, .w-ccard .ccTile.isCard")).toHaveCount(0);
    await tile("Ben").click();
    await expect(tile("Ben")).toHaveClass(/isWarn/);
    await tile("Ben").click();
    await expect(tile("Ben")).toHaveClass(/isCard/);
    await tile("Dee").click(); await tile("Dee").click(); await tile("Dee").click();   // round trip: clear
    await expect(tile("Dee")).not.toHaveClass(/isWarn|isCard/);
    await tile("Cal").click();                                        // a warning stays a warning
    ok(JSON.stringify(await marks()) === JSON.stringify({ Ben: "card", Cal: "warn" }), "marks: " + JSON.stringify(await marks()));
    await expect(page.locator(".w-ccard .ccSum")).toContainText("1 on warning");
    await expect(page.locator(".w-ccard .ccSum")).toContainText("1 card");
    // locked: still a live action
    await page.click("#lockBtn");
    await tile("Ava").click(); await tile("Ava").click();
    await expect(tile("Ava")).toHaveClass(/isCard/);
    await dh.unlock();
    // the wrap-up, three minutes out, lists the cards due
    await page.evaluate(() => { window.Deckhand.config.bell.wrapup.on = true; window.Deckhand.config.bell.wrapup.minutes = 3; });
    await page.evaluate(() => { const st = window.Deckhand.bell.statusAt(window.Deckhand.now()); window.Deckhand.shiftClock(st.remainMs - 170000); });   // 2:50 to the bell
    await expect(page.locator("#clockWrap")).toBeVisible({ timeout: 4000 });
    await expect(page.locator("#clockWrap .wuCards")).toContainText("Ava · Ben");
    await page.keyboard.press("r");                                   // stand it down
    await page.evaluate(() => document.querySelector(".w-ccard").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));   // the card back on top
    // End of class: the cards (not the warning) go to the log; the reminder takes the stage; Done brings the board back
    await page.click(".w-ccard .ccEnd");
    await expect(page.locator(".w-ccard")).toHaveClass(/wFull/);
    await expect(page.locator(".w-ccard .ccRemind")).toBeVisible();
    await expect(page.locator(".w-ccard .ccRemName")).toHaveCount(2);
    await expect(page.locator(".w-ccard .ccRemMsg")).toContainText("Bring yours to Mr. Shaffer");
    let logd = await page.evaluate(() => window.Deckhand.config.cards.log);
    ok(logd.length === 1 && logd[0].p === "5th" && logd[0].d === "2026-09-29" && logd[0].names.join() === "Ava,Ben", "log: " + JSON.stringify(logd));
    await page.click(".w-ccard .ccRemDone");
    await expect(page.locator(".w-ccard")).not.toHaveClass(/wFull/);
    await expect(page.locator(".w-ccard .ccRemind")).toBeHidden();
    await expect(page.locator(".w-ccard .ccTile.isCard")).toHaveCount(0);
    await expect(page.locator(".w-ccard .ccTile.isWarn")).toHaveCount(0);
    // no cards: no stage
    await page.click(".w-ccard .ccEnd");
    await expect(page.locator(".w-ccard .ccNote")).toContainText("No cards today");
    ok(!(await page.evaluate(() => document.querySelector(".w-ccard").classList.contains("wFull"))), "staged with nothing to say");
    // the log view: totals and the day
    await page.click(".w-ccard .ccLogBtn");
    await expect(page.locator(".w-ccard .ccTotals")).toContainText("Ava");
    await expect(page.locator(".w-ccard .ccLogBody li").first()).toContainText("Ava, Ben");
    await page.click(".w-ccard .ccLogClose");
    // the bell: a forgotten card is recorded when the class changes
    await tile("Cal").click(); await tile("Cal").click();             // warn → card
    await page.evaluate(() => window.Deckhand.shiftClock(5 * 60000));   // past the bell — HOWL Time
    await page.evaluate(() => document.querySelector(".w-ccard")._entry.api._watchBell());
    await page.waitForTimeout(200);
    logd = await page.evaluate(() => window.Deckhand.config.cards.log);
    ok(logd.length === 1 && logd[0].names.join() === "Ava,Ben,Cal", "the bell did not record Cal: " + JSON.stringify(logd));
    await expect(page.locator(".w-ccard .ccNote")).toContainText("At the bell");
    await page.evaluate(() => window.Deckhand.settle.reset());      // the jump also rang HOWL's bell
    await expect(page.locator(".w-ccard .ccTile")).toHaveCount(2);    // HOWL's roster now
    // survives a reload
    await page.waitForTimeout(1200);
    await dh.reopen("#t=2026-09-29T10:30");
    await dh.launch();
    logd = await page.evaluate(() => window.Deckhand.config.cards.log);
    ok(logd.length === 1 && logd[0].names.length === 3, "lost on reload: " + JSON.stringify(logd));
    // Clear today needs a second tap
    await page.click(".w-ccard .ccLogBtn");
    await page.click(".w-ccard .ccClear");
    await expect(page.locator(".w-ccard .ccClear")).toHaveClass(/armed/);
    await page.click(".w-ccard .ccClear");
    logd = await page.evaluate(() => window.Deckhand.config.cards.log);
    ok(logd.length === 0, "Clear today did not clear: " + JSON.stringify(logd));
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
  test("v7.35: on a staged deck a blob opens the comment-card popover; marks are the card's marks; End of class logs them and fills the screen with the reminder; the badge counts the cards due; the pen closes it", async ({ page, dh }) => {
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
    await expect(page.locator("#ccPop .ccPopPer")).toHaveText("5th");
    const tile = n => page.locator("#ccPop .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    await expect(page.locator("#ccPop .ccTile")).toHaveCount(4);
    await tile("Ben").click(); await tile("Ben").click();             // card
    await tile("Cal").click();                                        // warning
    await expect(tile("Ben")).toHaveClass(/isCard/);
    await expect(page.locator("#ccBlob .ccBadge")).toHaveText("1");
    // the same marks the card on the board holds
    await page.click("#ccPop .ccPopX");
    await expect(page.locator("#ccPop")).toBeHidden();
    await page.click("#unfocusBtn");
    await dh.addW("addCcardBtn"); await page.keyboard.press("Escape");
    const cardTile = n => page.locator(".w-ccard .ccTile", { has: page.locator(".ccTileName", { hasText: n }) });
    await expect(cardTile("Ben")).toHaveClass(/isCard/);
    await expect(cardTile("Cal")).toHaveClass(/isWarn/);
    // back on the stage: End of class from the popover logs the card and fills the screen
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await page.click("#ccBlob");
    await page.click("#ccPop .ccEnd");
    await expect(page.locator("#ccRemFull")).toBeVisible();
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveCount(1);
    await expect(page.locator("#ccRemFull .ccRemName")).toHaveText("Ben");
    const logd = await page.evaluate(() => window.Deckhand.config.cards.log);
    ok(logd.length === 1 && logd[0].names.join() === "Ben", "log: " + JSON.stringify(logd));
    await page.click("#ccRemFull .ccRemDone");
    await expect(page.locator("#ccRemFull")).toBeHidden();
    await expect(page.locator("#ccBlob .ccBadge")).toBeHidden();
    // the pen closes the popover
    await page.click("#ccBlob");
    await expect(page.locator("#ccPop")).toBeVisible();
    await page.click("#inkBlob");
    await expect(page.locator("#ccPop")).toBeHidden();
    await page.click("#inkDone");
  });
});
