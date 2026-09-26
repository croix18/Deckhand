/* Deckhand — dynamic widgets: picker, groups, text, work mode, dice,
 * scoreboard, event countdown, tally, agenda, QR, sketch pad, noise meter,
 * plus the + Add menu, z-order and landing-page checks that live with them.
 * Ported from test_deckhand_v6.js (old lines 1229–1883). */
const { test, expect, ok, launch } = require("./helpers");
const { chromium } = require("@playwright/test");
const jsQR = require("../node_modules/jsqr/dist/jsQR.js");

// rasterize a QR matrix and decode it with an independent reader
function decodeQR(matrix){
  const scale = 8, quiet = 4;
  const dim = (matrix.length + quiet * 2) * scale;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < matrix.length; c++){
      if (!matrix[r][c]) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++){
          const px = ((r + quiet) * scale + dy) * dim + (c + quiet) * scale + dx;
          data[px * 4] = data[px * 4 + 1] = data[px * 4 + 2] = 0;
        }
    }
  return jsQR(data, dim, dim);
}

/* Belt + braces, as the old suite did per page: `reducedMotion` in the
 * project's `use` block is NOT a @playwright/test option (it belongs under
 * `contextOptions`), so the runner's contexts boot with motion ON and the
 * picker spins for 900ms per pick. The app reads matchMedia at boot, so this
 * runs before every openAt. */
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

// the last widget of scene 0 (the one the test just added)
const lastWidget = page => page.evaluate(() => {
  const ws = window.Deckhand.config.scenes[0].widgets;
  return ws[ws.length - 1];
});

// type a roster for one period through Settings and apply it
const setRoster = async (page, period, names, { keepOpen } = {}) => {
  await page.click("#setBtn");
  await page.evaluate(() => { document.getElementById("secRosters").open = true; });
  await page.fill('#rosterGrid textarea[data-period="' + period + '"]', names);
  await page.click("#applyBtn");
  if (!keepOpen) await page.click("#closeBtn");
};

test.describe("rosters, picker, groups", () => {
  test("rosters + picker: follows the bell period, no repeats until the round ends", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");       // Teal Tue: 2nd period in the room
    await dh.launch();
    await page.click("#setBtn");
    await page.evaluate(() => { document.getElementById("secRosters").open = true; });
    await page.fill('#rosterGrid textarea[data-period="2nd"]', "Ava, Ben\nCai, Dee, Eli");
    await page.click("#applyBtn");
    ok((await dh.text("#setErrors")) === "Applied.", "apply: " + await dh.text("#setErrors"));
    await page.click("#closeBtn");
    const ros = await page.evaluate(() => window.Deckhand.config.rosters);
    ok(ros.length === 1 && ros[0].period === "2nd" && ros[0].names.join("|") === "Ava|Ben|Cai|Dee|Eli",
      "rosters: " + JSON.stringify(ros));
    await dh.addW("addPickerBtn");
    ok(await page.locator(".w-picker").count() === 1, "picker missing");
    const auto = (await page.locator(".w-picker .pkSel option").first().textContent()).trim();
    ok(auto === "Auto — 2nd", "auto option: " + auto);
    const left = page.locator(".w-picker .pkLeft");
    // wait for the round counter to land, and read the committed name in
    // the SAME page task so the pair can never straddle a repaint
    const picked = async expected => {
      const h = await page.waitForFunction(exp => {
        const l = document.querySelector(".w-picker .pkLeft").textContent.trim();
        return l === exp ? document.querySelector(".w-picker .pkName").textContent.trim() : null;
      }, expected);
      return h.jsonValue();
    };
    const seen = new Set();
    for (let i = 0; i < 5; i++){
      await page.click(".w-picker .pkGo");
      seen.add(await picked((4 - i) + " of 5 left"));
    }
    ok(seen.size === 5 && ["Ava", "Ben", "Cai", "Dee", "Eli"].every(n => seen.has(n)),
      "round repeated someone: " + [...seen].join("|"));
    await page.click(".w-picker .pkGo");       // 6th pick: a fresh round begins
    await expect(left).toHaveText("4 of 5 left");
    await page.keyboard.press(" ");            // Space picks on the selected widget
    await expect(left).toHaveText("3 of 5 left");
    await page.keyboard.press("r");            // R restarts the round
    await expect(left).toHaveText("5 of 5 left");
    // a tapped period dropdown must not kill the board keys
    await page.focus(".w-picker .pkSel");
    await page.keyboard.press(" ");
    await expect(left).toHaveText("4 of 5 left");
    ok(await page.evaluate(() =>
      document.activeElement !== document.querySelector(".w-picker .pkSel")),
      "select kept focus");
  });

  test("picker refuses to guess: a block with no roster says so instead", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T11:20");       // HOWL Time — deliberately roster-less
    await dh.launch();
    await setRoster(page, "2nd", "Ava, Ben, Cai");
    await dh.addW("addPickerBtn");
    await page.click(".w-picker .pkGo");
    const hintLoc = page.locator(".w-picker .tHint");
    await expect(hintLoc).toHaveText("No roster for this period — pick one above");
    const name = (await page.locator(".w-picker .pkName").textContent()).trim();
    ok(name === "—", "picked from the wrong class: " + name);
    ok(!(await hintLoc.isHidden()), "empty-state hint invisible at spawn size");
    // manual override still works
    await page.selectOption(".w-picker .pkSel", "2nd");
    await page.click(".w-picker .pkGo");
    await expect(page.locator(".w-picker .pkName")).toHaveText(/^(Ava|Ben|Cai)$/);
  });

  test("groups: 7 kids in 4s makes 4+3, never one group of seven", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await setRoster(page, "2nd", "A,B,C,D,E,F,G");
    await dh.addW("addGroupsBtn");
    await page.click(".w-groups .gpSize .chip:nth-child(3)");  // 4s (by-count chips follow)
    await page.click(".w-groups .gpGo");
    const sizes = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".w-groups .gpCard"))
        .map(c => c.childNodes[1].textContent.split(", ").length).sort().join(","));
    ok(sizes === "3,4", "sizes: " + sizes);
  });

  test("renaming a period re-keys the roster grid on Apply (orphan stays visible)", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#setBtn");
    await dh.tab("rosters");
    await page.fill('#rosterGrid textarea[data-period="2nd"]', "Ava, Ben");
    await dh.openScheds();
    const ta = await page.inputValue("#taGrpReg1");
    await page.fill("#taGrpReg1", ta.replace("2nd 10:16-11:09", "Second 10:16-11:09"));
    await page.click("#applyBtn");
    ok((await dh.text("#setErrors")) === "Applied.", "apply: " + await dh.text("#setErrors"));
    ok(await page.locator('#rosterGrid textarea[data-period="Second"]').count() === 1,
      "new label has no box after Apply");
    ok(await page.locator('#rosterGrid textarea[data-period="2nd"]').count() === 1,
      "orphaned roster vanished from the grid");
    ok(await page.evaluate(() =>
      window.Deckhand.config.rosters.some(r => r.period === "2nd" && r.names.length === 2)),
      "orphan roster lost from config");
    await page.keyboard.press("Escape");
  });

  test("group maker: 11 kids in 3s -> 4/4/3, everyone exactly once", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await setRoster(page, "2nd", "N01,N02,N03,N04,N05,N06,N07,N08,N09,N10,N11");
    await dh.addW("addGroupsBtn");
    ok(await page.locator(".w-groups").count() === 1, "groups widget missing");
    ok(await page.locator('.w-groups .gpSize .chip[aria-pressed="true"]').textContent()
      .then(t => t.trim()) === "3s", "default size not 3s");
    await page.click(".w-groups .gpGo");
    const g = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".w-groups .gpCard"))
        .map(c => c.childNodes[1].textContent.split(", ")));
    ok(g.length === 3, "group count: " + g.length);
    const sizes = g.map(x => x.length).sort().join(",");
    ok(sizes === "3,4,4", "sizes: " + sizes);
    const all = g.flat().sort();
    ok(all.length === 11 && new Set(all).size === 11, "names duplicated or lost: " + all.join("|"));
    // pairs: 11 kids -> 5 groups (one of 3), nobody alone
    await page.click(".w-groups .gpSize .chip:first-child");
    await page.click(".w-groups .gpGo");
    const g2 = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".w-groups .gpCard"))
        .map(c => c.childNodes[1].textContent.split(", ").length));
    ok(g2.length === 5 && Math.min(...g2) === 2 && Math.max(...g2) === 3,
      "pairs: " + g2.join(","));
    // widget config remembers the override-able fields
    const wc = await lastWidget(page);
    ok(wc.type === "groups" && wc.size === 2, "config: " + JSON.stringify(wc));
  });
});

test.describe("text box", () => {
  test("text box: editing is keyboard-safe; content persists in config", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addTextBtn");
    ok(await page.locator(".w-text").count() === 1, "text widget missing");
    ok(await page.locator(".w-text .txBtn").isHidden(), "Done visible before editing");
    await page.click(".w-text .wEdit");          // pencil in the strip opens the editor
    ok(!(await page.locator(".w-text .txBtn").isHidden()), "Done missing while editing");
    await page.keyboard.type("Warm-up:");
    await page.keyboard.press("Enter");
    await page.keyboard.type("3r + 5 = 20");
    ok(await dh.text("#startBtn") === "Start", "typing started the timer");
    ok(await dh.text("#timer") === "5:00", "digits leaked to entry: " + await dh.text("#timer"));
    await page.click(".w-text .txBtn");          // Done
    const t1 = (await lastWidget(page)).html;     // v7.1: rich notes live as sanitized html
    ok(/Warm-up:/.test(t1) && /3r \+ 5 = 20/.test(t1) && !/<script|onerror/i.test(t1), "config html: " + JSON.stringify(t1));
    ok(await page.locator(".w-text .txBtn").isHidden(), "Done lingers after commit");
    ok((await page.locator(".w-text .txInner").textContent()).includes("3r + 5"), "display");
    await page.click(".w-text .txDisplay");      // tap text re-opens editing
    await page.keyboard.type("solve for r … ");
    await page.keyboard.press("Escape");         // Esc commits, never leaks
    ok((await lastWidget(page)).html.includes("solve for r"), "escape did not commit");
    ok(await page.locator(".w-text .txBar").isHidden(), "still editing after Esc");
  });

  test("text box: v7.1 rich text — size, bold, color survive a commit; hostile html is inert; legacy notes migrate; lock makes it read-only", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addTextBtn");
    await page.click(".w-text .txDisplay");      // tapping the text edits too
    await page.keyboard.type("Finished?");
    await page.evaluate(() => {                  // select the word, then use the toolbar
      const inner = document.querySelector(".w-text .txInner");
      const r = document.createRange(); r.selectNodeContents(inner);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    await page.click('.w-text [data-cmd="bold"]');
    await page.click('.w-text [data-cmd="color"][data-arg="#FF7F6A"]');
    await page.click('.w-text [data-cmd="size"][data-arg="xl"]');
    await page.click(".w-text .txBtn");
    const w = await lastWidget(page);
    ok(w.size === "xl", "size chip not saved: " + w.size);
    ok(/font-weight:900/.test(w.html) && /rgb\(255, 127, 106\)/.test(w.html), "bold/color lost: " + w.html);
    const scale = await page.evaluate(() => getComputedStyle(document.querySelector(".w-text .txInner")).getPropertyValue("--tx-scale").trim());
    ok(scale === "2", "XL scale not applied: " + scale);
    // hostile config html is sanitized before it ever renders
    const clean = await page.evaluate(() => {
      const en = document.querySelector(".w-text")._entry;
      en.cfg.html = '<img src=x onerror=alert(1)><script>alert(2)</script><b onclick="x()">hi</b>' +
        '<a href="javascript:alert(3)">link</a><span style="color:red;position:fixed;font-size:900px">big</span>';
      en.api.rebuild();
      return document.querySelector(".w-text .txInner").innerHTML;
    });
    ok(!/onerror|onclick|<script|<img|<a |position/.test(clean) && /<b>hi<\/b>/.test(clean) && /font-size:4em/.test(clean),
      "sanitizer let something through: " + clean);
    // a pre-7.1 note ("# heading", "- bullet") converts to markup once
    await page.evaluate(() => {
      const en = document.querySelector(".w-text")._entry;
      en.cfg.html = ""; en.cfg.text = "# Finished?\n- IXL first\n1) unit review\nplain line";
      window.Deckhand.flush();                      // the device copy now carries a legacy note
    });
    await dh.reopen("");
    const mig = await page.evaluate(() => { const ws = window.Deckhand.config.scenes[0].widgets; return ws[ws.length - 1]; });
    ok(/font-size:1.45em/.test(mig.html) && /<ul><li>IXL first<\/li><\/ul>/.test(mig.html) && /<ol><li>unit review/.test(mig.html),
      "legacy note not migrated: " + mig.html);
    await dh.launch();
    ok((await page.locator(".w-text .txInner").textContent()).includes("Finished?"), "migrated note not shown");
    // locked board: pencil hidden, tapping the text does nothing
    await page.click("#lockBtn");
    ok(await page.locator(".w-text .wEdit").isHidden(), "pencil visible while locked");
    await page.click(".w-text .txDisplay");
    ok(await page.locator(".w-text .txBar").isHidden(), "locked text still editable");
    await dh.unlock();
  });
});

test.describe("work mode, dice, scoreboard, tally", () => {
  test("work mode: chips and Space cycle; mode persists", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addWorkBtn");
    ok((await page.locator(".w-work .wkBadge").textContent()) === "SILENT", "default mode");
    await page.click(".w-work .wkChips .chip:nth-child(3)");
    ok((await page.locator(".w-work .wkBadge").textContent()) === "PARTNERS", "chip switch");
    await page.keyboard.press(" ");              // selected widget: cycles
    ok((await page.locator(".w-work .wkBadge").textContent()) === "GROUP WORK", "Space cycle");
    ok((await lastWidget(page)).mode === "groups", "config mode");
  });

  test("dice: rolls stay 1-6, count chips, honest total", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addDiceBtn");
    ok(await page.locator(".w-dice .die").count() === 2, "default dice count");
    await page.click(".w-dice .dcGo");
    const vals = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".w-dice .die"))
        .map(d => d.querySelectorAll("circle").length));
    ok(vals.length === 2 && vals.every(v => v >= 1 && v <= 6), "pips: " + vals.join(","));
    ok((await page.locator(".w-dice .dcTotal").textContent()).trim() ===
      "Total: " + (vals[0] + vals[1]), "total: " + await page.locator(".w-dice .dcTotal").textContent());
    await page.click(".w-dice .dcChips .chip:first-child");
    ok(await page.locator(".w-dice .die").count() === 1, "count chip failed");
    ok((await page.locator(".w-dice .dcTotal").textContent()).trim() === "", "total lingers on one die");
    await page.keyboard.press(" ");
    const v2 = await page.evaluate(() =>
      document.querySelectorAll(".w-dice .die circle").length);
    ok(v2 >= 1 && v2 <= 6, "Space roll: " + v2);
  });

  test("scoreboard: +/− clamps at 0, inline rename is key-safe, R resets", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addScoreBtn");
    const plus = page.locator(".w-score .scTeam").first().locator(".scB:not(.minus)");
    await plus.click(); await plus.click(); await plus.click();
    ok((await page.locator(".w-score .scScore").first().textContent()) === "3", "plus");
    await page.locator(".w-score .scTeam").nth(1).locator(".scB.minus").click();
    ok((await page.locator(".w-score .scScore").nth(1).textContent()) === "0",
      "minus went below zero");
    await page.locator(".w-score .scName").first().click();
    await page.keyboard.type("Sharks");          // replaces the selected text
    await page.keyboard.press("Enter");
    ok((await page.locator(".w-score .scName").first().textContent()) === "Sharks", "rename");
    ok(await dh.text("#startBtn") === "Start", "rename keys leaked to the board");
    await page.click(".w-score .scChips .chip:last-child");
    ok(await page.locator(".w-score .scTeam").count() === 4, "team count");
    await page.keyboard.press("r");              // R zeroes the round
    const scores = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".w-score .scScore")).map(n => n.textContent));
    ok(scores.length === 4 && scores.every(s => s === "0"), "reset: " + scores.join(","));
    const teams = (await lastWidget(page)).teams;
    ok(teams.length === 4 && teams[0].name === "Sharks",
      "config teams: " + JSON.stringify(teams));
  });

  test("scoreboard: +1 tapped while a rename is open still scores", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addScoreBtn");
    await page.locator(".w-score .scName").first().click();   // open rename
    await page.locator(".w-score .scTeam").first().locator(".scB:not(.minus)").click();
    await expect(page.locator(".w-score .scScore").first(), "the point was eaten").toHaveText("1");
  });

  test("tally: +1/−/Space count, rename sticks, 2 counters, R resets", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addTallyBtn");
    const plus = page.locator(".w-tally .tlCard").first().locator(".scB:not(.minus)");
    await plus.click(); await plus.click(); await plus.click();
    ok(await dh.text(".w-tally .tlCount") === "3", "plus: " + await dh.text(".w-tally .tlCount"));
    await page.locator(".w-tally .tlCard").first().locator(".scB.minus").click();
    ok(await dh.text(".w-tally .tlCount") === "2", "minus");
    await page.keyboard.press(" ");              // Space adds one (widget is selected)
    ok(await dh.text(".w-tally .tlCount") === "3", "space +1: " + await dh.text(".w-tally .tlCount"));
    await page.locator(".w-tally .scName").first().click();
    await page.keyboard.type("Points");
    await page.keyboard.press("Enter");
    ok((await page.locator(".w-tally .scName").first().textContent()) === "Points", "rename");
    await page.click(".w-tally .tlChips .chip:last-child");
    ok(await page.locator(".w-tally .tlCard").count() === 2, "counter count");
    ok((await page.locator(".w-tally .scName").first().textContent()) === "Points",
      "rename lost when adding a counter");
    await page.keyboard.press("r");
    const counts = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".w-tally .tlCount")).map(n => n.textContent));
    ok(counts.length === 2 && counts.every(c => c === "0"), "reset: " + counts.join(","));
    const items = (await lastWidget(page)).items;
    ok(items.length === 2 && items[0].name === "Points" && items[0].count === 0,
      "config items: " + JSON.stringify(items));
  });
});

test.describe("event countdown + agenda", () => {
  test("event countdown: days / same-day clock / Today! / Done, local dates", async ({ page, dh }) => {
    await dh.openAt("#t=2026-08-31T08:00");         // SIM: Mon Aug 31, 8:00 AM
    await dh.launch();
    await dh.addW("addEventBtn");
    ok((await page.locator(".w-event .evSub").textContent()).includes("✎"),
      "no empty-state hint");
    await page.click(".w-event .wEdit");         // pencil opens the row
    await page.fill(".w-event .evName", "Unit Test");
    await page.fill(".w-event .evDate", "2026-09-04");
    await page.click(".w-event .evBtn");
    const big = page.locator(".w-event .evBig");
    ok(await dh.text(".w-event .evBig") === "4", "days: " + await dh.text(".w-event .evBig"));
    ok((await dh.text(".w-event .evUnit")).toLowerCase() === "days to go", "unit");
    ok((await dh.text(".w-event .evSub")).includes("Sep 4"), "sub: " + await dh.text(".w-event .evSub"));
    ok(await dh.text(".w-event .evTitle") === "Unit Test", "title");
    const cw = await lastWidget(page);
    ok(cw.title === "Unit Test" && cw.when === "2026-09-04",
      "config: " + JSON.stringify({ title: cw.title, when: cw.when }));
    const setWhen = when => page.evaluate(w => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      ws[ws.length - 1].when = w;
    }, when);
    // same-day with a time: an h:mm:ss clock to the moment (500ms tick repaints)
    await setWhen("2026-08-31T09:30");
    await expect(big, "same-day clock").toHaveText(/^1:(29|30):\d{2}$/);
    // date-only today
    await setWhen("2026-08-31");
    await expect(big, "today").toHaveText("Today!");
    // past date
    await setWhen("2026-08-28");
    await expect(big, "past").toHaveText("Done");
    ok((await dh.text(".w-event .evSub")).startsWith("was "), "past sub");
    // Lock slams an open editor shut — students can't rewrite the event
    await page.click(".w-event .wEdit");
    await page.fill(".w-event .evName", "Hacked by 3rd period");
    await page.click("#lockBtn");
    ok(await page.locator(".w-event .evRow").isHidden(), "editor open while locked");
    const lockedTitle = (await lastWidget(page)).title;
    ok(lockedTitle === "Unit Test", "lock committed the draft: " + lockedTitle);
    await dh.unlock();
  });

  test("agenda: edit, tap-to-check, checks survive edits, R clears, works locked", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addAgendaBtn");
    ok((await page.locator(".w-agenda .agEmpty").textContent()).includes("✎"),
      "no empty state");
    await page.click(".w-agenda .wEdit");
    await page.fill(".w-agenda .agArea", "Warm-up\nNotes: two-step equations\nExit ticket");
    await page.click(".w-agenda .agBtn");
    ok(await page.locator(".w-agenda .agItem").count() === 3, "items");
    await page.locator(".w-agenda .agItem").nth(1).click();     // strike the middle one
    let items = (await lastWidget(page)).items;
    ok(items[1].done === true && !items[0].done && !items[2].done,
      "toggle: " + JSON.stringify(items));
    // re-edit: rename line 1, keep line 2 — its check must survive
    await page.click(".w-agenda .wEdit");
    await page.fill(".w-agenda .agArea", "Warm-up (5 min)\nNotes: two-step equations\nExit ticket");
    await page.click(".w-agenda .agBtn");
    items = (await lastWidget(page)).items;
    ok(items[1].done === true && items[0].done === false,
      "check lost in edit: " + JSON.stringify(items));
    await page.keyboard.press("r");              // R clears the checks
    items = (await lastWidget(page)).items;
    ok(items.every(i => !i.done), "R left checks: " + JSON.stringify(items));
    // locked: ✎ hides, but checking off still works (live teaching)
    await page.click("#lockBtn");
    ok(await page.locator(".w-agenda .wEdit").isHidden(), "✎ visible while locked");
    await page.locator(".w-agenda .agItem").first().click();
    items = (await lastWidget(page)).items;
    ok(items[0].done === true, "toggle dead while locked");
    await dh.unlock();
    // overflow at minimum size: the FIRST item must stay reachable
    // (plain justify-content:center clips the top beyond scroll reach)
    await page.evaluate(() => {
      const en = document.querySelector(".w-agenda")._entry;
      en.cfg.items = Array.from({ length: 12 }, (_, i) =>
        ({ text: "A very long agenda item number " + (i + 1) + " that wraps around", done: false }));
      // h:5% floors at the 140px minimum on ANY viewport → the list is
      // reliably too short for 12 items even at the smallest FIT step
      en.cfg.x = 2; en.cfg.y = 2; en.cfg.w = 30; en.cfg.h = 5;
      en.el.style.left = "2%"; en.el.style.top = "2%";
      en.el.style.width = "30%"; en.el.style.height = "5%";
      en.api.rebuild();
    });
    await expect(page.locator(".w-agenda .agItem")).toHaveCount(12);
    const measure = () => page.evaluate(() => {
      const list = document.querySelector(".w-agenda .agList");
      list.scrollTop = 0;
      const first = list.querySelector(".agItem").getBoundingClientRect();
      const box = list.getBoundingClientRect();
      return { top: first.top - box.top, overflows: list.scrollHeight > list.clientHeight };
    });
    await expect.poll(async () => (await measure()).overflows, { message: "fixture did not overflow — test is vacuous" }).toBe(true);
    const reach = await measure();
    ok(reach.top >= -1, "first item clipped above the scroll area: " + reach.top);
  });
});

test.describe("landing, alarm, add menu, z-order", () => {
  test("landing: the board never paints over the landing page (canvas hidden)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-11T10:15");         // layout that used to collide
    await dh.home();
    const m = await page.evaluate(() => {
      const lb = document.getElementById("launchBtn");
      const r = lb.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { display: getComputedStyle(document.getElementById("canvas")).display,
               hit: el ? (el.id || el.className) : "none" };
    });
    ok(m.display === "none", "canvas visible at landing: " + JSON.stringify(m));
    ok(m.hit === "launchBtn", "launch button covered: " + JSON.stringify(m));
    await dh.launch();                              // and the board still opens
    ok(await page.evaluate(() =>
      getComputedStyle(document.getElementById("canvas")).display) !== "none",
      "canvas hidden after launch");
  });

  test("alarm dismissal beats an open rename input or text editor", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addScoreBtn");
    await page.mouse.click(960, 999);
    await page.keyboard.press("s");              // select the timer... cycle until timer
    // ensure the TIMER is selected: cycle until #timer's widget has .sel
    for (let i = 0; i < 4; i++){
      if (await page.locator(".w-timer.sel").count() === 1) break;
      await page.keyboard.press("s");
    }
    await page.keyboard.press("2");              // 0:02
    await page.keyboard.press("Enter");
    await page.locator(".w-score .scName").first().click();   // rename input open
    // the 2s timer expires while the rename is still open
    await expect(page.locator("#alarm"), "no alarm").toHaveClass(/\bon\b/, { timeout: 8000 });
    await page.keyboard.press(" ");              // must dismiss THROUGH the input
    ok(!(await dh.attr("#alarm", "class")).includes("on"), "rename input shielded the alarm");
  });

  test("add menu: opens, adds, closes; outside tap closes; Esc closes; lock disables", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#addBtn");
    ok(!(await page.locator("#addMenu").isHidden()), "menu did not open");
    await page.click("#addDiceBtn");
    ok(await page.locator("#addMenu").isHidden(), "menu stayed open after add");
    ok(await page.locator(".w-dice").count() === 1, "widget not added");
    await page.click("#addBtn");
    await page.mouse.click(600, 400);            // outside tap
    ok(await page.locator("#addMenu").isHidden(), "outside tap left menu open");
    await page.click("#addBtn");
    await page.keyboard.press("Escape");
    ok(await page.locator("#addMenu").isHidden(), "Escape left menu open");
    await page.click("#lockBtn");
    ok(await page.locator("#addBtn").isDisabled(), "add enabled while locked");
    await dh.unlock();
  });

  test("z-order: a much-tapped widget can never bury the dock or + Add menu", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    // park the timer over the dock area and slam its z-index up
    await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      w.x = 0; w.y = 55; w.w = 40; w.h = 45;
    });
    await page.selectOption("#sceneSel", "Daily Board");
    await expect.poll(() => page.evaluate(() => document.querySelector(".w-timer").style.top)).toBe("55%");
    for (let i = 0; i < 25; i++) await page.click(".w-timer .visWrap");  // z climbs
    const zw = await page.evaluate(() =>
      +document.querySelector(".w-timer").style.zIndex);
    ok(zw > 15, "precondition: z did not climb: " + zw);
    const onTop = await page.evaluate(() => {
      const b = document.getElementById("addBtn").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el && (el.id === "addBtn" || !!el.closest("#dock"));
    });
    ok(onTop, "widget covers the dock");
    await page.click("#addBtn");
    const itemOnTop = await page.evaluate(() => {
      const b = document.getElementById("addTimerBtn").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el && el.id === "addTimerBtn";
    });
    ok(itemOnTop, "widget covers the + Add menu");
    await page.keyboard.press("Escape");
  });
});

test.describe("QR, sketch pad, noise meter", () => {
  test("QR widget: in-page encoder output decodes to the exact URL", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addQrBtn");
    ok(await page.locator(".w-qr").count() === 1, "qr widget missing");
    const url = "https://docs.google.com/forms/d/e/1FAIpQLSft8pXk3JqZw9/viewform?usp=sf_link";
    await page.fill(".w-qr .qrIn", url);
    await page.mouse.click(960, 999);            // blur applies
    await expect(page.locator(".w-qr svg path"), "no QR rendered").toHaveCount(1);
    ok(await page.evaluate(u => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].url === u;
    }, url), "url not in config");
    // decode what the in-page encoder produces, with an independent reader
    for (const probe of [url, "https://kahoot.it/?pin=98765", "A".repeat(250)]){
      const matrix = await page.evaluate(u => window.Deckhand.qr(u), probe);
      const res = decodeQR(matrix);
      ok(res && res.data === probe,
        "decode failed for len " + probe.length + ": " + (res ? res.data.slice(0, 40) : "null"));
    }
    // too-long input degrades to a message, not a broken code
    await page.fill(".w-qr .qrIn", "x".repeat(300));
    await page.mouse.click(960, 999);
    ok(await page.evaluate(() => window.Deckhand.qr("x".repeat(400)) === null),
      "encoder should refuse over-long input");
  });

  test("sketch pad: strokes land, eraser erases, Clear/R wipe, no widget drag", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addDrawBtn");
    const cb = await page.locator(".dwCanvas").boundingBox();
    const inked = () => page.evaluate(() => {
      const c = document.querySelector(".dwCanvas");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n;
    });
    const before = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets.slice(-1)[0]));
    await page.mouse.move(cb.x + 40, cb.y + 40);
    await page.mouse.down();
    await page.mouse.move(cb.x + 200, cb.y + 120, { steps: 8 });
    await page.mouse.up();
    const n1 = await inked();
    ok(n1 > 500, "stroke did not land: " + n1);
    const after = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets.slice(-1)[0]));
    ok(before === after, "drawing dragged/resized the widget");
    await page.click(".w-draw .dwEraser");
    await page.mouse.move(cb.x + 40, cb.y + 40);
    await page.mouse.down();
    await page.mouse.move(cb.x + 200, cb.y + 120, { steps: 8 });
    await page.mouse.up();
    const n2 = await inked();
    ok(n2 < n1, "eraser did nothing: " + n1 + " -> " + n2);
    await page.click(".w-draw .dwClear");
    ok(await inked() === 0, "Clear left ink");
    await page.mouse.move(cb.x + 60, cb.y + 60);
    await page.mouse.down();
    await page.mouse.move(cb.x + 120, cb.y + 90, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.press("r");              // R wipes the selected sketch
    ok(await inked() === 0, "R did not clear");
  });

  test("noise meter: reads the (fake) mic and flags TOO LOUD", async ({ dh }) => {
    // own browser: the fake-mic flags are launch args, not context options
    const b2 = await chromium.launch({ args: [
      "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required"] });
    const errs = [];
    try {
      const p2 = await b2.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
      p2.on("pageerror", e => errs.push("pageerror: " + String(e)));
      p2.on("console", m => {
        if (m.type() === "error" && !/Failed to load resource|net::/.test(m.text()))
          errs.push("console: " + m.text());
      });
      await p2.goto(dh.url);
      await p2.waitForSelector("#launchBtn", { state: "attached" });
      await launch(p2);
      await p2.click("#addBtn");
      await p2.click("#addMeterBtn");
      await p2.click(".w-meter .mtBtn");
      // the stream opens asynchronously; the button hides once it does
      await expect(p2.locator(".w-meter .mtBtn"), "mic never started").toBeHidden({ timeout: 10000 });
      // double-tap must never open a second, unstoppable stream
      await p2.evaluate(() => {
        const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        window.__gum = 0;
        navigator.mediaDevices.getUserMedia = (...a) => { window.__gum++; return orig(...a); };
      });
      await p2.keyboard.press(" ");                // startPause routes to start() (synchronous guard)
      ok(await p2.evaluate(() => window.__gum) === 0,
        "a second start issued another getUserMedia");
      // the fake mic feeds a level; the bar must move off zero
      await expect.poll(() => p2.evaluate(() =>
        parseFloat(document.querySelector(".mtFill").style.width) || 0), { message: "no level from fake mic" })
        .toBeGreaterThan(0);
      // drop the limit to the floor: the tone must trip TOO LOUD + coral
      await p2.locator(".w-meter .mtLimit").fill("10");
      // the fake mic beeps in bursts — poll for the loud phase
      const state = () => p2.evaluate(() => ({
        s: document.querySelector(".mtStatus").textContent,
        cls: document.querySelector(".w-meter").classList.contains("tooLoud"),
        cfg: (() => { const ws = window.Deckhand.config.scenes[0].widgets;
                      return ws[ws.length - 1].limit; })()
      }));
      await expect.poll(async () => { const o = await state(); return o.s === "TOO LOUD" && o.cls; },
        /* the fake device beeps in bursts and the meter needs a sustained
           window over the limit — under a loaded 3-worker run 8s was not
           always enough to catch a burst (passes 12/12 alone) */
        { message: "limit not enforced", timeout: 20000 }).toBe(true);
      const over = await state();
      ok(over.cfg === 10, "limit not saved: " + over.cfg);
    } finally {
      await b2.close();
    }
    ok(errs.length === 0, "JS errors in the meter browser:\n" + errs.join("\n"));
  });
});
