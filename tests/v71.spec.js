/* v7.1 — the week-of-notes release: today override + day editor, noise
   game tally, embed shelf/library/paste box/fullscreen delegation, the
   Pledge flag, and the sea's new visitors. */
const { test, expect, ok, launch } = require("./helpers");
const fs = require("fs");
const path = require("path");

test.describe("today override + day editor", () => {
  test("v7.1: Wednesday times on a Thursday, regular again the next day, custom day with No bells", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");          // Thursday, Teal
    await dh.home();                                  // v7.7: the TODAY row lives on the landing page, now on demand
    await expect(page.locator('#todayChips [data-today="regular"]')).toHaveAttribute("aria-pressed", "true");
    await page.click('[data-today="wednesday"]');
    await dh.launch();
    await expect(page.locator("#weekTag")).toHaveText("Teal Week (Wed)");
    await expect(page.locator("#bellSub")).toContainText("19 min until bell");   // Wed 2nd ends 10:49
    // dated: the override does not leak into tomorrow's scan
    const tomorrow = await page.evaluate(() => window.Deckhand.bellStatusAt("2026-09-25T10:30"));
    ok(tomorrow.type === "in" && tomorrow.sched === "Teal Week", "override leaked: " + JSON.stringify(tomorrow));
    await dh.flush();
    ok((await dh.stored()).cfg.bell.today.mode === "wednesday", "override not persisted");
    // a custom day runs even with No bells picked
    await page.keyboard.press("h");
    await page.keyboard.press("3");                   // No bells
    await page.click('[data-today="custom"]');
    await expect(page.locator("#dayEditorWrap")).toBeVisible();
    await page.click("#dayEditorFill .btn");           // Start from Teal Week
    await expect(page.locator("#dayEditorBlocks .blkRow")).toHaveCount(8);
    await page.click('[data-shift="5"]');
    await page.click("#dayEditorUse");
    await expect(page.locator("#dayEditorWrap")).toBeHidden();
    await dh.launch();
    await expect(page.locator("#weekTag")).toContainText("(Custom)");
    await expect(page.locator("#bellSub")).toContainText("44 min until bell");   // 2nd shifted to 10:21–11:14
    ok((await page.evaluate(() => window.Deckhand.config.bell.customLast.length)) === 8, "customLast not kept");
    // Regular clears it
    await page.keyboard.press("h");
    await page.keyboard.press("1");
    await page.click('[data-today="regular"]');
    await dh.launch();
    await expect(page.locator("#weekTag")).toHaveText("Teal Week");
  });

  test("v7.1: the day editor validates — blank rows ignored, end before start and overlaps refused", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");
    await dh.home();
    await page.click('[data-today="custom"]');
    await page.click("#dayEditorAdd");
    await page.fill("#dayEditorBlocks .blkRow:last-child .blkLabel", "Assembly");
    await page.fill("#dayEditorBlocks .blkRow:last-child .blkStart", "10:00");
    await page.fill("#dayEditorBlocks .blkRow:last-child .blkEnd", "09:30");
    await page.click("#dayEditorUse");
    await expect(page.locator("#dayEditorErr")).toContainText("end must be after start");
    await expect(page.locator("#dayEditorWrap")).toBeVisible();
    await page.fill("#dayEditorBlocks .blkRow:last-child .blkEnd", "10:30");
    await page.click("#dayEditorAdd");
    await page.fill("#dayEditorBlocks .blkRow:last-child .blkLabel", "Overlap");
    await page.fill("#dayEditorBlocks .blkRow:last-child .blkStart", "10:15");
    await page.fill("#dayEditorBlocks .blkRow:last-child .blkEnd", "11:00");
    await page.click("#dayEditorUse");
    await expect(page.locator("#dayEditorErr")).toContainText("overlap");
    await page.click("#dayEditorBlocks .blkRow:last-child .blkX");
    await page.click("#dayEditorAdd");                 // an untouched blank row is nothing
    await page.click("#dayEditorUse");
    await expect(page.locator("#dayEditorWrap")).toBeHidden();
    const t = await page.evaluate(() => window.Deckhand.config.bell.today);
    ok(t.mode === "custom" && t.blocks.length === 1 && t.blocks[0].label === "Assembly" &&
       t.blocks[0].start === "10:00" && t.blocks[0].end === "10:30", "custom blocks: " + JSON.stringify(t));
    // Escape closes without applying
    await page.click('[data-today="custom"]');
    await page.keyboard.press("Escape");
    await expect(page.locator("#dayEditorWrap")).toBeHidden();
  });
});

test.describe("noise game", () => {
  test("v7.1: strike sensitivity chips persist; the daily tally sanitizes and expires by date", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");
    await dh.launch();
    await dh.addW("addMeterBtn");
    await expect(page.locator('.w-meter [data-secs="1"]')).toHaveAttribute("aria-pressed", "true");
    await page.click('.w-meter [data-secs="0.5"]');
    await dh.flush();
    const w = (await dh.stored()).cfg.scenes[0].widgets.filter(x => x.type === "meter")[0];
    ok(w.strikeSecs === 0.5, "strikeSecs not saved: " + w.strikeSecs);
    // a tally from another day is dropped at boot; today's is kept and shown
    const fx = dh.writeFixture("meter.html", JSON.stringify({
      schemaVersion: 4, appVersion: "7.1.0", ownerName: "Mr. Shaffer", rosters: [],
      ui: { locked: false, motion: "auto" }, activeScene: "A",
      scenes: [{ name: "A", widgets: [
        { type: "clock", x: 0, y: 0, w: 50, h: 100, label: "Clock", pin: false },
        { type: "meter", x: 50, y: 0, w: 50, h: 100, label: "Noise", pin: false, limit: 60, strikeSecs: 9,
          tally: { date: "2026-09-24", byPeriod: { "2nd": 3, "__proto__": 9, "": 4, "3rd": "x" } } }
      ] }],
      sound: { enabled: true, volume: 0.25 }, clock: { showSeconds: false },
      timer: { presetsMinutes: [1, 3, 5, 10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none", groups: [] }
    }));
    await page.goto("file://" + fx + "#t=2026-09-24T10:30");
    await page.waitForFunction(() => !!window.Deckhand);
    const m = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets[1]);
    ok(m.strikeSecs === 1 && m.tally.date === "2026-09-24" && JSON.stringify(m.tally.byPeriod) === '{"2nd":3}',
      "sanitize: " + JSON.stringify(m));
    await dh.launch();
    await expect(page.locator(".w-meter .mtTally")).toHaveText("Today: 2nd 3");
  });
});

test.describe("embed", () => {
  test("v7.1: the big paste box loads a deck; ☆ saves it to the library; a library tap reloads it", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");
    await dh.launch();
    await dh.addW("addEmbedBtn");
    await expect(page.locator(".w-embed .embBigIn")).toBeVisible();
    await expect(page.locator(".w-embed .embRow")).toBeHidden();       // the small row waits for ✎
    await page.fill(".w-embed .embBigIn", "https://docs.google.com/presentation/d/abc123/edit");
    await page.click(".w-embed .embLoad");
    await expect(page.locator(".w-embed .embFrame")).toHaveAttribute("src", /\/d\/abc123\/embed/);
    await page.click(".w-embed .wEdit");
    await page.click(".w-embed .embStar");                              // v7.6: an inline name row, not window.prompt
    await page.fill(".w-embed .embName", "Cube deck");
    await page.click(".w-embed .embNameOk");
    const saved = await page.evaluate(() => document.querySelector(".w-embed")._entry.cfg.saved);
    ok(saved.length === 1 && saved[0].name === "Cube deck" && /abc123/.test(saved[0].url), "library: " + JSON.stringify(saved));
    await expect(page.locator(".w-embed .embSaved2 .embDeck")).toHaveText("Cube deck");
    // a second deck, then the library tap brings the first back
    await page.fill(".w-embed .embIn", "https://docs.google.com/presentation/d/zzz999/edit");
    await page.locator(".w-embed .embIn").dispatchEvent("blur");
    await expect(page.locator(".w-embed .embFrame")).toHaveAttribute("src", /zzz999/);
    await expect(page.locator(".w-embed .embRow2")).toBeHidden();       // a NEW deck tucks the rows
    await page.click(".w-embed .wEdit");
    await page.click(".w-embed .embSaved2 .embDeck");
    await expect(page.locator(".w-embed .embFrame")).toHaveAttribute("src", /abc123/);
    // the frame delegates fullscreen etc. to whatever is inside it
    const allow = await page.getAttribute(".w-embed .embFrame", "allow");
    ok(/fullscreen \*/.test(allow) && /autoplay \*/.test(allow), "allow attribute: " + allow);
  });

  test("v7.1: a stage-only deck hides on the board, gets a dock chip, and the settle-in hands off to it", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:15:50");       // 2nd starts at 10:16
    await dh.launch();
    await dh.addW("addEmbedBtn");
    await page.fill(".w-embed .embBigIn", "https://docs.google.com/presentation/d/abc123/edit");
    await page.click(".w-embed .embLoad");
    await page.click(".w-embed .wEdit");
    await page.check(".w-embed .embShelfCk");
    // editing keeps the card on screen; closing the row shelves it
    await expect(page.locator(".w-embed")).toBeVisible();
    await page.click(".w-embed .wEdit");
    await expect(page.locator(".w-embed")).toBeHidden();
    await expect(page.locator("#shelf .pill")).toHaveText("▶ Slides");
    await page.click("#shelf .pill");
    await expect(page.locator(".w-embed")).toHaveClass(/wFull/);
    await expect(page.locator("body")).toHaveClass(/focusMode/);
    await page.click("#unfocusBtn");
    await expect(page.locator(".w-embed")).toBeHidden();
    // the bell routine: the clock takes the stage as the count, then the shelved deck
    await page.evaluate(() => { window.Deckhand.config.bell.settle.seconds = 5; window.Deckhand.settle._doneMs(1200); });
    await expect(page.locator("#clockWidget")).toHaveClass(/wFull/, { timeout: 15000 });
    await expect(page.locator("#clockWidget")).toHaveClass(/stLive/);
    await expect(page.locator(".w-embed")).toHaveClass(/wFull/, { timeout: 12000 });
    await expect(page.locator(".w-embed")).toBeVisible();
    await dh.flush();
    ok((await dh.stored()).cfg.scenes[0].widgets.filter(w => w.type === "embed")[0].stageOnly === true, "stageOnly not saved");
  });

  test("v7.1: nested fullscreen is delegated through the deck frame @http", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");
    await dh.launch();
    await dh.addW("addEmbedBtn");
    // outer fixture embeds an inner one; the inner page can only go fullscreen if every frame delegates
    const root = dh.ROOT;
    const inner = path.join(root, "tests", "tmp_fx_inner.html"), outer = path.join(root, "tests", "tmp_fx_outer.html");
    fs.writeFileSync(inner, '<!doctype html><script>document.title="enabled="+document.fullscreenEnabled</script>');
    fs.writeFileSync(outer, '<!doctype html><h1>DECK</h1><iframe id="in" src="/tests/tmp_fx_inner.html" allow="fullscreen *"></iframe>');
    try {
      await page.fill(".w-embed .embBigIn", "http://localhost:4173/tests/tmp_fx_outer.html");
      await page.click(".w-embed .embLoad");
      await expect.poll(async () => {
        const f = page.frames().find(fr => fr.url().endsWith("tmp_fx_inner.html"));
        return f ? await f.title() : "";
      }, { timeout: 8000 }).toBe("enabled=true");
    } finally {
      try { fs.unlinkSync(inner); fs.unlinkSync(outer); } catch (e) {}
    }
  });
});

test.describe("the Pledge", () => {
  test("v7.1/7.2: the day's first bell is the flag ALONE — no count, no text — then the slides", async ({ page, dh }) => {
    test.setTimeout(150000);                          // a real one-minute Pledge window
    await dh.openAt("#t=2026-09-24T09:19:38");        // 1st period starts 9:20 — the first bell (setup takes a while under load)
    await dh.launch();
    await dh.addW("addEmbedBtn");
    await page.fill(".w-embed .embBigIn", "https://docs.google.com/presentation/d/abc123/edit");
    await page.click(".w-embed .embLoad");
    await page.click(".w-embed .wEdit"); await page.check(".w-embed .embShelfCk"); await page.click(".w-embed .wEdit");
    await page.evaluate(() => {
      const st = window.Deckhand.config.bell.settle;
      st.seconds = 5; st.pledge.minutes = 1; window.Deckhand.settle._doneMs(1200);
    });
    await expect(page.locator("#clockWidget")).toHaveClass(/wFull/, { timeout: 30000 });
    await expect(page.locator("#clockSettle .stFlag")).toBeVisible();
    await expect(page.locator("#clockWidget")).toHaveClass(/stPledgeOnly/);
    ok(!!(await page.evaluate(() => window.Deckhand.settle._pledgeUntil())), "pledge window not opened");
    // v7.2: no count runs and nothing is written — the flag has the screen to itself
    ok((await page.evaluate(() => window.Deckhand.settle.running())) === false, "the count ran during the Pledge");
    await expect(page.locator("#clockSettle .stTop")).toHaveText("");
    await expect(page.locator("#clockSettle .stBig")).toHaveText("");
    ok((await page.evaluate(() => getComputedStyle(document.getElementById("clockFace")).display)) === "none", "the clock face showed under the flag");
    const sway = await page.evaluate(() => getComputedStyle(document.querySelector("#clockSettle .flagWave")).animationName);
    ok(sway === "none" || /flagSway/.test(sway), "flag wave rule missing: " + sway);   // reduced motion in the suite → none
    await expect(page.locator(".w-embed")).not.toHaveClass(/wFull/);
    // …and hands off when the minute is up; the clock is a clock again
    await expect(page.locator(".w-embed")).toHaveClass(/wFull/, { timeout: 70000 });
    await expect(page.locator("#clockWidget")).not.toHaveClass(/stLive/);
    await expect(page.locator("#clockSettle .stFlag")).toBeHidden();
  });

  test("v7.2: on a reversed (Black) week the flag flies for 6th at 9:20, never for 1st at 3:07 — and 1st gets its own 25 seconds", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T15:06:52");        // Black Monday: 1st is the LAST block
    await dh.launch();
    await page.evaluate(() => { window.Deckhand.config.bell.settle.perPeriod = { "1st": 25 }; });
    ok((await page.evaluate(() => window.Deckhand.settle.secsFor("1st"))) === 25, "per-period seconds not honoured");
    await expect(page.locator("#clockWidget")).toHaveClass(/wFull/, { timeout: 15000 });
    await expect(page.locator("#clockSettle .stFlag")).toBeHidden();
    ok((await page.evaluate(() => window.Deckhand.settle._pledgeUntil())) === null, "flag flew for 1st at the end of the day");
    await expect(page.locator("#clockSettle .stTop")).toHaveText("Find your seat");
    const secs = await page.evaluate(() => +document.querySelector("#clockSettle .stBig").textContent);
    ok(secs >= 20 && secs <= 25, "1st did not get 25 seconds: " + secs);
    await dh.flush();
    ok((await dh.stored()).cfg.bell.settle.perPeriod["1st"] === 25, "perPeriod not saved");
    // Settings → Bells shows one box per period; a blank box means the default
    await page.keyboard.press("r");
    await page.click("#setBtn");
    await dh.tab("bells");
    await expect(page.locator("#sStPer .stPerCell")).toHaveCount(7);   // the bell periods, Lunch excluded
    ok(await page.inputValue('#sStPer input[data-period="1st"]') === "25", "override not shown");
    await page.fill('#sStPer input[data-period="1st"]', "");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    ok(!("1st" in (await page.evaluate(() => window.Deckhand.config.bell.settle.perPeriod))), "blank did not clear the override");
    ok((await page.evaluate(() => window.Deckhand.settle.secsFor("1st"))) === 30, "default not restored");
    await page.click("#closeBtn");
  });

  test("v7.1: a later bell shows no flag; the ✎ row turns the Pledge off; sanitize bounds the minutes", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:15:52");        // 2nd period — not the first bell
    await dh.launch();
    await page.evaluate(() => { const st = window.Deckhand.config.bell.settle; st.seconds = 5; st.perPeriod = {}; });
    await expect(page.locator("#clockWidget")).toHaveClass(/wFull/, { timeout: 15000 });
    await expect(page.locator("#clockSettle .stFlag")).toBeHidden();
    ok((await page.evaluate(() => window.Deckhand.settle._pledgeUntil())) === null, "pledge opened on a later bell");
    await page.keyboard.press("r");
    await page.click("#setBtn");
    await dh.tab("bells");
    await expect(page.locator("#sStPledge")).toBeChecked();
    await page.uncheck("#sStPledge");
    await page.fill("#sStPledgeMin", "40");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toContainText("Flag minutes");   // Settings refuses 40; sanitize would clamp a file's
    await page.fill("#sStPledgeMin", "10");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    const p = await page.evaluate(() => window.Deckhand.config.bell.settle.pledge);
    ok(p.on === false && p.minutes === 10, "pledge cfg: " + JSON.stringify(p));
    // sanitize bounds a file's minutes and keeps a retired settle CARD's settings (the v7.6 → 7.7 migration)
    const pg = await dh.loadFixture("tmp_settle_mig.html", JSON.stringify({
      schemaVersion: 4, appVersion: "7.6.0", ownerName: "",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 58, h: 100 },
        { type: "settle", x: 61, y: 0, w: 39, h: 100, label: "Settle-in", seconds: 45, msgDone: "Sit.", pledge: { on: true, minutes: 40 }, perPeriod: { "2nd": 20 } }
      ]}],
      bell: { groups: [] }
    }));
    const mig = await pg.evaluate(() => ({ st: window.Deckhand.config.bell.settle, widgets: window.Deckhand.config.scenes[0].widgets.map(w => w.type) }));
    ok(mig.widgets.join() === "clock", "the settle card survived migration: " + mig.widgets.join());
    ok(mig.st.on === true && mig.st.seconds === 45 && mig.st.msgDone === "Sit." && mig.st.pledge.minutes === 10 && mig.st.perPeriod["2nd"] === 20,
      "card settings not carried into bell.settle: " + JSON.stringify(mig.st));
    await pg.close();
    // a board whose owner had REMOVED the card gets the routine off
    const pg2 = await dh.loadFixture("tmp_settle_off.html", JSON.stringify({
      schemaVersion: 4, appVersion: "7.6.0", ownerName: "",
      scenes: [{ name: "Daily Board", widgets: [{ type: "clock", x: 0, y: 0, w: 58, h: 100 }] }],
      bell: { groups: [] }
    }));
    ok((await pg2.evaluate(() => window.Deckhand.config.bell.settle.on)) === false, "a card-less board turned the routine on");
    await pg2.close();
  });
});

test.describe("the sea", () => {
  test("v7.1/7.4/7.5: nine visitors, the attack rocks the boat, the boat rides the swell, the sea has depth", async ({ page, dh }) => {
    const pg = await dh.newPage({ reducedMotion: "no-preference" });
    await pg.goto(dh.url + "#t=2026-09-24T10:30");
    await pg.waitForFunction(() => !!window.Deckhand);
    await launch(pg);
    const things = await pg.evaluate(() => [...document.querySelectorAll("#sea .seaThing")].map(t => t.id.replace("sea-", "")));
    ok(things.sort().join() === "serpent,fish,turtle,school,paper,attack,whale,buoy,dolphins".split(",").sort().join(),
       "visitors: " + things.join());                      // v7.4: the bottle became a paper boat; v7.5: dolphins
    const sway = await pg.evaluate(() => getComputedStyle(document.querySelector("#boat .btSwell")).animationName);
    ok(/heave1/.test(sway) && /pitch1/.test(sway), "the boat does not ride the swell: " + sway);
    await pg.evaluate(() => window.Deckhand.sea("attack"));
    await expect(pg.locator("#sea-attack")).toHaveClass(/go/);
    // v7.5: the boat wears .struck for the act's whole clock (its lurch keyframes are timed to the hit at 12s)
    await expect(pg.locator("#boat")).toHaveClass(/struck/);
    ok(/btStruck/.test(await pg.evaluate(() => getComputedStyle(document.querySelector("#boat .btRig")).animationName)), "no lurch keyframes on the rig");
    await expect(pg.locator("#sea-attack")).not.toHaveClass(/go/, { timeout: 25000 });
    await expect(pg.locator("#boat")).not.toHaveClass(/struck/, { timeout: 5000 });
    // a tap on the boat while something plays is refused; the school and turtle play too
    for (const n of ["turtle", "school", "paper"]){
      await pg.evaluate(x => window.Deckhand.sea(x), n);
      await expect(pg.locator("#sea-" + n)).toHaveClass(/go/);
      await pg.evaluate(x => document.getElementById("sea-" + x).classList.remove("go"), n);
    }
    // v7.4 DEPTH: a laned visitor plays far (small, behind the boat) or near (big, in front)
    await pg.evaluate(() => window.Deckhand.sea("buoy", "near"));
    let lane = await pg.evaluate(() => {
      const b = document.getElementById("sea-buoy");
      return { near: b.classList.contains("near"), box: b.parentElement.className,
               ls: getComputedStyle(b).getPropertyValue("--ls").trim(),
               afterBoat: !!(document.getElementById("boat").compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    ok(lane.near && lane.box === "seaNear" && lane.ls === "1.2" && lane.afterBoat, "near lane: " + JSON.stringify(lane));
    await pg.evaluate(() => document.getElementById("sea-buoy").classList.remove("go"));
    await pg.evaluate(() => window.Deckhand.sea("buoy", "far"));
    lane = await pg.evaluate(() => {
      const b = document.getElementById("sea-buoy");
      return { far: b.classList.contains("far"), box: b.parentElement.className,
               ls: getComputedStyle(b).getPropertyValue("--ls").trim(),
               beforeBoat: !!(document.getElementById("boat").compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) };
    });
    ok(lane.far && lane.box === "seaFar" && lane.ls === ".62" && lane.beforeBoat, "far lane: " + JSON.stringify(lane));
    await pg.evaluate(() => document.getElementById("sea-buoy").classList.remove("go"));
    // the three wave layers scroll on their own clocks; the boat's swell wrapper shares the front one
    const heave = await pg.evaluate(() => ({
      d1: getComputedStyle(document.querySelector("#boat .btSwell")).animationDuration,
      w1: getComputedStyle(document.getElementById("wv1")).animationDuration,
      w2: getComputedStyle(document.getElementById("wv2")).animationDuration,
      w3: getComputedStyle(document.getElementById("wv3")).animationDuration,
      names: [1, 2, 3].map(i => getComputedStyle(document.getElementById("wv" + i)).animationName).join(),
      wake: getComputedStyle(document.querySelector("#boat .btWakeBow")).animationName,
      delay: getComputedStyle(document.querySelector("#boat .btSwell")).animationDelay
    }));
    ok(/wvScroll/.test(heave.names) && heave.w1 === "11.2s" && heave.w2 === "7.1s" && heave.w3 === "15.8s", "wave layers: " + JSON.stringify(heave));
    ok(heave.d1 === "5.6s, 5.6s" && heave.delay === "0s, -2.8s", "boat not phase-locked to the swell: " + JSON.stringify(heave));
    ok(/wake/.test(heave.wake), "no wake: " + heave.wake);
  });
});
