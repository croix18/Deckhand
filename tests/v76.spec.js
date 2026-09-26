/* v7.6 — robustness, no visible change. The audit round's "evening three":
 * a scene switch keeps running timers; the timer face paints at 10 Hz, not
 * 60; Absent marks belong to a date; the deck library names itself in a row
 * of ours, not window.prompt; the Ink overlay draws incrementally; the
 * scoreboard sanitizer filters before it slices; the bathroom pill is
 * never coral. */
const { test, expect, ok } = require("./helpers");

test.describe("v7.6 robustness", () => {
  test("v7.6: a scene switch carries a RUNNING timer along and hands it back; an idle one stays put", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");
    await dh.launch();
    await dh.addW("addTimerBtn");
    await dh.addW("addWatchBtn");
    await page.evaluate(() => {
      const t = document.querySelector(".w-timer")._entry;
      t.api.startSeconds(120);
    });
    await expect.poll(() => page.evaluate(() => document.querySelector(".w-timer")._entry.api.running())).toBe(true);
    ok((await page.evaluate(() => document.querySelector(".w-stopwatch")._entry.api.running())) === false, "stopwatch should be idle");
    // a fresh scene: only the clock lives there…
    await page.click("#sceneBtn");
    await page.fill("#sceneName", "Warm-up");
    await page.click("#sceneNewBtn");
    ok(await page.inputValue("#sceneSel") === "Warm-up", "new scene not active");
    // …plus the timer that was counting, floated on top and still counting
    await expect(page.locator(".w-timer")).toHaveCount(1);
    await expect(page.locator(".w-stopwatch")).toHaveCount(0);
    ok((await page.evaluate(() => document.querySelector(".w-timer")._entry.api.running())) === true, "the switch killed the timer");
    ok((await page.evaluate(() => document.querySelector(".w-timer")._entry.carried)) === true, "not marked as carried");
    ok((await page.evaluate(() => window.Deckhand.config.scenes.find(s => s.name === "Warm-up").widgets.length)) === 1,
      "the carried timer was written into the new scene's config");
    // back home: the same card (not a second one) is re-adopted by its own scene
    await page.selectOption("#sceneSel", "Daily Board");
    await expect(page.locator(".w-timer")).toHaveCount(1);
    await expect(page.locator(".w-stopwatch")).toHaveCount(1);
    ok((await page.evaluate(() => document.querySelector(".w-timer")._entry.api.running())) === true, "the return killed the timer");
    ok((await page.evaluate(() => document.querySelector(".w-timer")._entry.carried)) === false, "still marked as carried at home");
    // reset, and a switch now drops it like any other card
    await page.evaluate(() => document.querySelector(".w-timer")._entry.api.reset());
    await page.selectOption("#sceneSel", "Warm-up");
    await expect(page.locator(".w-timer")).toHaveCount(0);
  });

  test("v7.6: the ring and tide faces repaint at most ten times a second (the loop stays on rAF)", async ({ page, dh }) => {
    const pg = await dh.newPage({ reducedMotion: "no-preference" });   // the face loop is off under reduced motion
    await pg.goto(dh.url + "#t=2026-09-24T10:30");
    await pg.waitForFunction(() => !!window.Deckhand);
    await pg.click("#launchBtn");
    await pg.click("#addBtn"); await pg.click("#addTimerBtn");
    for (const style of ["ring", "tide"]){
      await pg.evaluate(s => {
        window.Deckhand.config.timer.style = s;
        const en = document.querySelector(".w-timer")._entry;
        en.api.rebuild();
        en.api.startSeconds(90);
      }, style);
      const a = await pg.evaluate(() => document.querySelector(".w-timer")._entry.api._visPaints());
      await pg.waitForTimeout(1000);
      const b = await pg.evaluate(() => document.querySelector(".w-timer")._entry.api._visPaints());
      ok(b - a >= 4 && b - a <= 13, style + " face painted " + (b - a) + " times in a second (want ~10)");
      if (style === "tide"){
        const tf = await pg.evaluate(() => document.querySelector(".w-timer .tideWater").style.transform);
        ok(/scaleY\(0\.9/.test(tf), "tide is not a transform: " + tf);
      }
      await pg.evaluate(() => document.querySelector(".w-timer")._entry.api.reset());
    }
    await pg.close();
  });

  test("v7.6: Absent marks are for TODAY — midnight clears them; the picker follows", async ({ page, dh }) => {
    const cfg = JSON.stringify({
      schemaVersion: 4, appVersion: "7.6.0", ownerName: "",
      rosters: [{ period: "1st", names: ["Synth A", "Synth B", "Synth C"] }],
      bell: { groups: [] }
    });
    const pg = await dh.loadFixture("tmp_absent.html", cfg, { hash: "#t=2026-09-24T10:30" });
    await pg.click("#launchBtn");
    await pg.evaluate(() => window.Deckhand.absent.toggle("1st", "Synth B"));
    ok((await pg.evaluate(() => window.Deckhand.absent.isOut("1st", "Synth B"))) === true, "mark not taken");
    ok((await pg.evaluate(() => window.Deckhand.absent.presentFor("1st").join(","))) === "Synth A,Synth C", "present list wrong");
    ok((await pg.evaluate(() => window.Deckhand.absent.day())) === "2026-09-24", "day key");
    // 11 pm the same day: still out
    await pg.evaluate(() => window.Deckhand.shiftClock(12.5 * 3600 * 1000));
    ok((await pg.evaluate(() => window.Deckhand.absent.isOut("1st", "Synth B"))) === true, "cleared too early");
    // 1 am tomorrow: a clean sheet — Synth B is back in the pool
    await pg.evaluate(() => window.Deckhand.shiftClock(2 * 3600 * 1000));
    ok((await pg.evaluate(() => window.Deckhand.absent.isOut("1st", "Synth B"))) === false, "yesterday's mark survived midnight");
    ok((await pg.evaluate(() => window.Deckhand.absent.countOut("1st"))) === 0, "count survived midnight");
    ok((await pg.evaluate(() => window.Deckhand.absent.day())) === "2026-09-25", "day key did not roll");
    await pg.close();
  });

  test("v7.6: ☆ names a deck in a row of ours — Enter saves, Escape drops, no window.prompt", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    let prompted = false;
    page.on("dialog", async d => { prompted = true; await d.dismiss(); });
    await dh.addW("addEmbedBtn");
    await page.fill(".w-embed .embBigIn", "https://docs.google.com/presentation/d/abc123/edit");
    await page.click(".w-embed .embLoad");
    await page.click(".w-embed .wEdit");
    await expect(page.locator(".w-embed .embNameRow")).toBeHidden();
    await page.click(".w-embed .embStar");
    await expect(page.locator(".w-embed .embNameRow")).toBeVisible();
    ok(await page.inputValue(".w-embed .embName") === "Deck 1", "no default name");
    // Escape: nothing saved
    await page.keyboard.press("Escape");
    await expect(page.locator(".w-embed .embNameRow")).toBeHidden();
    ok((await page.evaluate(() => document.querySelector(".w-embed")._entry.cfg.saved.length)) === 0, "Escape saved");
    // a typed name + Enter: saved, chip appears, the row folds
    await page.click(".w-embed .embStar");
    await page.fill(".w-embed .embName", "  Fractions week 3  ");
    await page.keyboard.press("Enter");
    await expect(page.locator(".w-embed .embNameRow")).toBeHidden();
    await expect(page.locator(".w-embed .embSaved2 .embDeck")).toHaveText(["Fractions week 3"]);
    // the same deck again is refused with a note, not a duplicate
    await page.click(".w-embed .embStar");
    await expect(page.locator(".w-embed .embNameRow")).toBeHidden();
    await expect(page.locator(".w-embed .embNote")).toBeVisible();
    ok(!prompted, "window.prompt was used");
    // closing ✎ takes an open name row with it
    await page.evaluate(() => document.querySelector(".w-embed")._entry.cfg.saved.length = 0);
    await page.click(".w-embed .embStar");
    await expect(page.locator(".w-embed .embNameRow")).toBeVisible();
    await page.click(".w-embed .wEdit");
    await expect(page.locator(".w-embed .embNameRow")).toBeHidden();
  });

  test("v7.6: Ink draws incrementally — a long lesson's strokes are not repainted on every move", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    // forty short strokes…
    for (let s = 0; s < 40; s++){
      const y = 200 + s * 12;
      await page.mouse.move(300, y); await page.mouse.down();
      await page.mouse.move(340, y + 3); await page.mouse.move(380, y); await page.mouse.move(420, y + 2);
      await page.mouse.up();
    }
    ok((await page.evaluate(() => window.Deckhand.ink.count())) === 40, "strokes not recorded");
    const before = await page.evaluate(() => window.Deckhand.ink.stats());
    // …then one long one: every move adds a segment; nothing rebuilds the pile
    await page.mouse.move(300, 800); await page.mouse.down();
    for (let i = 1; i <= 60; i++) await page.mouse.move(300 + i * 15, 800 + Math.sin(i / 4) * 30);
    await page.mouse.up();
    const after = await page.evaluate(() => window.Deckhand.ink.stats());
    ok(after.full === before.full, "a pen move rebuilt every stroke (" + (after.full - before.full) + " full redraws)");
    ok(after.seg - before.seg >= 50, "segments not drawn: " + (after.seg - before.seg));
    // and it is really on the canvas, joined up (a point mid-stroke, off any sample)
    const px = await page.evaluate(() => {
      const c = document.getElementById("ink"), k = c.width / innerWidth;
      const x = 300 + 30 * 15 + 7, y = 800 + Math.sin(30.5 / 4) * 30;
      return [...c.getContext("2d").getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data];
    });
    ok(px[3] > 0, "the long stroke has a gap: " + px);
    // undo rebuilds once and the pile shrinks
    await page.click("#inkUndo");
    const undone = await page.evaluate(() => window.Deckhand.ink.stats());
    ok(undone.full === after.full + 1, "undo did not rebuild exactly once");
    ok((await page.evaluate(() => window.Deckhand.ink.count())) === 40, "undo count");
    // the highlighter (translucent multiply) repaints its own stroke, never the pile
    await page.click('#inkBar [data-color="#FFE45C"]');
    await page.mouse.move(300, 900); await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(300 + i * 20, 900);
    await page.mouse.up();
    const hi = await page.evaluate(() => window.Deckhand.ink.stats());
    ok(hi.full === undone.full, "the highlighter rebuilt the pile");
    await page.click("#inkDone");
  });

  test("v7.6: the scoreboard sanitizer filters junk BEFORE it takes four; the closed bathroom pill is sand, not coral", async ({ page, dh }) => {
    const cfg = JSON.stringify({
      schemaVersion: 4, appVersion: "7.6.0", ownerName: "",
      activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 58, h: 100 },
        { type: "score", x: 61, y: 0, w: 39, h: 100,
          teams: [null, "junk", { name: "Red", score: 3 }, { name: "Blue", score: 5 }, { name: "Green", score: 1 }, { name: "Gold", score: 2 }] }
      ]}],
      bell: { bathroom: { enabled: true, firstMinutes: 10, lastMinutes: 10 }, defaultGroup: "Regular",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
              groups: [{ name: "Regular", regular: [{ label: "1st", start: "10:20", end: "11:10" }], wednesday: [] }] }
    });
    const pg = await dh.loadFixture("tmp_score.html", cfg, { hash: "#t=2026-09-24T10:25" });
    const teams = await pg.evaluate(() => window.Deckhand.config.scenes[0].widgets[1].teams.map(t => t.name + ":" + t.score).join(" "));
    ok(teams === "Red:3 Blue:5 Green:1 Gold:2", "junk cost a real team its place: " + teams);
    await pg.click("#launchBtn");
    await expect(pg.locator("#bathPill")).toHaveClass("closed");
    const bg = await pg.evaluate(() => getComputedStyle(document.getElementById("bathPill")).backgroundColor);
    ok(bg === "rgb(230, 213, 184)", "closed pill is not sand: " + bg);   // --sand #E6D5B8; coral is for alarms
    await expect(pg.locator("#alarm p").last()).toHaveText("Tap anywhere to dismiss");
    await pg.close();
  });
});
