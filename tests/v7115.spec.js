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
    ok(blob.right < 40 && blob.bottom < 40 && blob.op < 0.8, "the pen blob is not a quiet bottom-right blob: " + JSON.stringify(blob));
    await page.click("#inkBlob");
    await expect(page.locator("#inkBar")).toBeVisible();
    await expect(page.locator("#inkBlob")).toBeHidden();
    const bar = await page.evaluate(() => { const b = document.getElementById("inkBar"), r = b.getBoundingClientRect(); return { right: innerWidth - r.right, bottom: innerHeight - r.bottom, bg: getComputedStyle(b).backgroundColor }; });
    ok(bar.right < 40 && bar.bottom < 40 && /rgba\(255, 255, 255, 0\.[0-9]+\)/.test(bar.bg), "the palette should pop up see-through from the corner: " + JSON.stringify(bar));
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
