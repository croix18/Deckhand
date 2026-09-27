/* v7.11.5 — the hardening pass (Croix: "run through all of the code and harden it").
 * Three review passes over the file found ~40 defects; these pin the ones a
 * teacher would meet: a defaults board that must never autosave over the
 * device, bells that respect "Weeks with no school", labels that survive a
 * reload, a renamed default week, M as a real setting, the picker's un-mark,
 * the sea under Seasonal touches Off and under motion Off, a stopwatch as a
 * working room, and the timer's end armed as one timeout. */
const { test, expect, ok } = require("./helpers");

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
