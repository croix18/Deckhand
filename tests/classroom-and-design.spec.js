/* Classroom widgets (spawn, alarm badge, until-bell, absent, groups, agenda,
 * focus pill, embed notes, settings) and the v6.13 design pass (touch
 * targets, grouped menu, motion, phone viewport, fixes).
 * Ported from test_deckhand_v6.js lines 2586–2967.
 */
const { test, expect, ok } = require("./helpers");

/* The suite is meant to run under reduced motion, but `reducedMotion` at the
 * top level of a project's `use` is not a runner option (@playwright/test only
 * forwards it through `use.contextOptions`), so the "file" project's page
 * boots with motion ON. Geometry asserts here need final positions, so this
 * spec pins the media feature on its own page before the first navigation.
 * Pages that opt into motion create their own via dh.newPage(). */
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

/* boot a page that is NOT the fixture's default page (motion/phone tests) */
async function bootPage(pg, dh, hash) {
  await pg.bringToFront();                     // a background tab throttles rAF (motion tests)
  await pg.goto(dh.url + (hash || ""));
  await pg.waitForSelector("#launchBtn", { state: "attached" });
  await pg.click("#launchBtn");
  await expect(pg.locator("main#canvas")).toBeVisible();
}

/* seed a 7-kid roster for 2nd period through Settings */
async function seedRoster(page) {
  await page.click("#setBtn");
  await page.evaluate(() => window.Deckhand.settings.showTab("rosters"));
  await page.fill('#rosterGrid textarea[data-period="2nd"]', "A,B,C,D,E,F,G");
  await page.click("#applyBtn");
  await page.click("#closeBtn");
}

test.describe("spawn + alarm", () => {
  test("spawn: three adds land in three different places, never a pile", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addWorkBtn");
    await dh.addW("addDiceBtn");
    await dh.addW("addTallyBtn");
    const spots = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws.slice(-3).map(w => w.x + "," + w.y);
    });
    ok(new Set(spots).size === 3, "spawn pile: " + spots.join(" | "));
    // fill toward the cap, then a big embed: fallback must stay ON-CANVAS
    for (const id of ["addWatchBtn", "addQrBtn", "addScoreBtn", "addTextBtn", "addEventBtn"]) {
      await dh.addW(id);
    }
    await dh.addW("addEmbedBtn");
    const all = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return { ok: ws.every(w => w.x + w.w <= 100.01 && w.y + w.h <= 100.01),
               spots: ws.map(w => w.x + "," + w.y) };
    });
    ok(all.ok, "fallback spawned off-canvas");
    ok(new Set(all.spots).size === all.spots.length,
      "clamped adds coincide: " + all.spots.join(" | "));
  });

  test("alarm: 45s un-dismissed folds to a corner badge; tap clears; keys return", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.evaluate(() => window.Deckhand.alarmCalmMs(900));
    await page.mouse.click(960, 999);
    await page.keyboard.press("2");              // 0:02 timer
    await page.keyboard.press("Enter");
    // a real 2s timer has to ring: poll for the alarm rather than sleep past it
    await expect(page.locator("#alarm")).toHaveClass(/\bon\b/, { timeout: 5000 });
    // calm threshold (900ms) passes
    await expect(page.locator("#alarm")).toHaveClass(/\bcalm\b/, { timeout: 3000 });
    const calm = await page.evaluate(() => {
      const a = document.getElementById("alarm");
      const r = a.getBoundingClientRect();
      return { cls: a.className, small: r.width < innerWidth / 2 };
    });
    ok(calm.cls.includes("calm") && calm.small, "no badge: " + JSON.stringify(calm));
    // keys belong to the board again (calm alarm no longer swallows)
    await page.keyboard.press("Escape");         // would dismiss a FULL alarm
    ok((await dh.attr("#alarm", "class")).includes("on"), "key killed the badge");
    await page.click("#alarm");                  // tap clears it
    ok(!(await dh.attr("#alarm", "class")).includes("on"), "tap did not clear");
    ok(await dh.text("#startBtn") === "Start", "timer not reset after badge dismiss");
  });

  test('timer: "Until bell" preset arms to the period remainder; dead when no bells', async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");      // mid-2nd-period
    await dh.launch();
    await dh.addTimer();
    ok(!(await page.locator(".w-timer .chipBell").isDisabled()), "chip dead in-period");
    await page.click(".w-timer .chipBell");
    await expect(page.locator("#startBtn")).toHaveText("Pause");
    const m = await page.evaluate(() => {
      const st = window.Deckhand.bellStatusAt("2026-09-08T10:30");
      const d = document.getElementById("timer").textContent.trim();
      const p = d.split(":");
      return { shown: (+p[0]) * 60 + (+p[1]), bell: Math.round(st.remainMs / 1000) };
    });
    ok(Math.abs(m.shown - m.bell) < 90, "wrong remainder: " + JSON.stringify(m));
    await page.keyboard.press(" ");              // pause — leave no ringing timer
    // Sunday: no bells, chip disabled
    await dh.openAt("#t=2026-09-06T10:30");
    await dh.launch();
    await dh.addTimer();                         // v6.29: no default timer
    ok(await page.locator(".w-timer .chipBell").isDisabled(), "chip live on a Sunday");
  });
});

test.describe("students: absent, groups, agenda", () => {
  test("absent today: picker skips them, groups leave them out, session-only", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await seedRoster(page);
    await dh.addW("addPickerBtn");
    await page.click(".w-picker .abBtn");        // open the absent panel
    ok(await page.locator(".w-picker .abName").count() === 7, "roster not listed");
    // mark everyone but D absent — the pick MUST be D
    for (const kid of ["A", "B", "C", "E", "F", "G"]) {
      await page.locator(".w-picker .abName", { hasText: kid }).click();
    }
    ok((await dh.text(".w-picker .pkLeft")).includes("6 out"), "absent count missing: "
      + await dh.text(".w-picker .pkLeft"));
    await page.click(".w-picker .pkGo");
    // reduced motion commits instantly; wait for the spin (if any) to land
    await expect(page.locator(".w-picker .pkName")).not.toHaveClass(/\bspin\b/);
    await expect(page.locator(".w-picker .pkName")).toHaveText("D");
    // bring E and F back (groups need at least two kids)
    await page.locator(".w-picker .abName", { hasText: "E" }).click();
    await page.locator(".w-picker .abName", { hasText: "F" }).click();
    // groups: same marks apply (shared session store)
    await dh.addW("addGroupsBtn");
    await page.click(".w-groups .gpGo");
    const kids = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".w-groups .gpCard"))
        .map(c => c.textContent.replace(/GROUP \d+/, "")).join(","));
    const set = kids.split(",").map(s => s.trim()).filter(Boolean).sort().join("");
    ok(set === "DEF", "absent kids grouped: " + kids);
    // absence never touches config (session-only by design)
    ok((JSON.stringify(await page.evaluate(() => window.Deckhand.config))
      .match(/absent/gi) || []).length === 0, "absence leaked into config");
  });

  test('groups: "3 groups" mode splits 7 kids into exactly 3 groups', async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await seedRoster(page);
    await dh.addW("addGroupsBtn");
    await page.locator(".w-groups .gpSize .chip", { hasText: "3 groups" }).click();
    await page.click(".w-groups .gpGo");
    const sizes = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".w-groups .gpCard"))
        .map(c => c.textContent.replace(/GROUP \d+/, "").split(",").length));
    ok(sizes.length === 3 && sizes.reduce((a, b) => a + b, 0) === 7,
      "count mode: " + sizes.join(","));
    const wcfg = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1];
    });
    ok(wcfg.by === "count" && wcfg.count === 3, "mode not persisted");
  });

  test("agenda: per-period pages follow the select; checks stay per page", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");      // 2nd period
    await dh.launch();
    await dh.addW("addAgendaBtn");
    await page.click(".w-agenda .wEdit");
    await page.fill(".w-agenda .agArea", "Second period plan");
    await page.check(".w-agenda .agPPck");       // per-period ON (draft retargets)
    await page.click(".w-agenda .agBtn");
    ok(await dh.text(".w-agenda .agWho") === "2nd", "who: " + await dh.text(".w-agenda .agWho"));
    // write a different page for 6th via the override select
    await page.click(".w-agenda .wEdit");
    await page.selectOption(".w-agenda .agPer", "6th");
    await page.fill(".w-agenda .agArea", "Sixth period plan\nExit ticket");
    await page.click(".w-agenda .agBtn");
    ok(await page.locator(".w-agenda .agItem").count() === 2, "6th page items");
    ok(await dh.text(".w-agenda .agWho") === "6th", "override who");
    await page.locator(".w-agenda .agItem").first().click();   // check one on 6th
    // back to Auto: 2nd's page returns, unchecked
    await page.click(".w-agenda .wEdit");
    await page.selectOption(".w-agenda .agPer", "");
    await page.click(".w-agenda .agBtn");
    ok(await dh.text(".w-agenda .agWho") === "2nd", "auto did not return");
    ok(await page.locator(".w-agenda .agItem").count() === 1, "2nd page items");
    const pages = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].pages;
    });
    ok(pages["2nd"].length === 1 && pages["6th"].length === 2 &&
       pages["6th"][0].done === true && pages["2nd"][0].done === false,
      "pages: " + JSON.stringify(pages));
  });
});

test.describe("focus pill, embed notes, settings", () => {
  test("focus exit pill: always reachable, even under a pinned widget", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    ok(await page.locator("#unfocusBtn").isHidden(), "pill visible with no focus");
    // pin the timer over the pill's corner, then focus the clock
    await page.evaluate(() => {
      const en = document.querySelector(".w-timer")._entry;
      en.cfg.x = 60; en.cfg.y = 0; en.cfg.w = 40; en.cfg.h = 40; en.cfg.pin = true;
      en.el.style.left = "60%"; en.el.style.top = "0%";
      en.el.style.width = "40%"; en.el.style.height = "40%";
    });
    await page.click(".w-timer .wPin");          // unpin…
    await page.click(".w-timer .wPin");          // …repin (syncs aria + z)
    await page.click("#clockWidget .wFocus");
    ok(!(await page.locator("#unfocusBtn").isHidden()), "pill missing in focus");
    const onTop = await page.evaluate(() => {
      const b = document.getElementById("unfocusBtn").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? el.id === "unfocusBtn" : false;
    });
    ok(onTop, "pinned widget buried the exit pill");
    await page.click("#unfocusBtn");
    ok(await page.evaluate(() =>
      document.querySelectorAll(".widget.wFull").length) === 0, "pill did not unfocus");
    ok(await page.locator("#unfocusBtn").isHidden(), "pill lingers after exit");
  });

  test("embed: a rejected link says WHY instead of silently reverting", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addEmbedBtn");
    // v7.1: the empty card carries a big paste box + Load
    await page.fill(".w-embed .embBigIn", "file:///C:/Users/croix/deck.pptx");
    await page.click(".w-embed .embLoad");
    await expect(page.locator(".w-embed .embNote")).toBeVisible();
    ok((await dh.text(".w-embed .embNote")).includes("Publish to web"), "note unhelpful");
  });

  test("settings: warning chime checkbox round-trips", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    ok(await page.evaluate(() => window.Deckhand.config.bell.warnChime) === false,
      "chime default on");
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.check("#sWarnChime");
    await page.click("#applyBtn");
    ok(await page.evaluate(() => window.Deckhand.config.bell.warnChime) === true,
      "chime not applied");
    await page.click("#closeBtn");
  });
});

test.describe("v6.13 design pass", () => {
  test("v6.13: 44px targets, grouped menu, navy alarm ink, non-coral lock, anchored grid", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    const m = await page.evaluate(() => {
      const b = document.querySelector(".w-timer .wClose").getBoundingClientRect();
      const f = document.querySelector(".w-timer .wFocus").getBoundingClientRect();
      const p = document.querySelector(".w-timer .wPin").getBoundingClientRect();
      return { cw: b.width, ch: b.height, fw: f.width, fh: f.height, pw: p.width, ph: p.height };
    });
    ok(m.cw >= 44 && m.ch >= 44 && m.fw >= 44 && m.fh >= 44 && m.pw >= 44 && m.ph >= 44,
      "strip targets: " + JSON.stringify(m));
    await page.click("#addBtn");
    const labels = await page.locator("#addMenu .menuLabel").allTextContents();
    ok(labels.join("|") === "Time|Students|Classroom|Board",
      "menu groups: " + labels.join("|"));
    // v7.0: the popover is a group, not a menu
    ok(await dh.attr("#addMenu", "role") === "group", "add menu role: " + await dh.attr("#addMenu", "role"));
    await page.keyboard.press("Escape");
    const ink = await page.evaluate(() =>
      getComputedStyle(document.querySelector("#alarm h1")).color);
    ok(ink === "rgb(23, 50, 77)", "alarm ink not navy: " + ink);
    await page.click("#lockBtn");
    const lockBg = await page.evaluate(() =>
      getComputedStyle(document.getElementById("lockBtn")).backgroundColor);
    ok(lockBg !== "rgb(255, 127, 106)", "lock still coral: " + lockBg);
    await dh.unlock();
    // the painted grid follows the canvas origin, so x:0 widgets sit ON lines
    const grid = await page.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      return { bp: getComputedStyle(document.body).backgroundPosition,
               cl: c.left % 48, ct: c.top % 48 };
    });
    const bp = grid.bp.split(" ").map(parseFloat);
    ok(Math.abs(bp[0] - grid.cl) < 1 && Math.abs(bp[1] - grid.ct) < 1,
      "grid not anchored: " + JSON.stringify(grid));
    // drawn icons replaced the fallback-font glyphs (v6.28: +⤡ grip = 4)
    ok(await page.evaluate(() =>
      document.querySelectorAll(".w-timer .strip svg.wIcon").length) === 4,
      "strip icons missing");
  });

  test("v6.13 motion: focus glides for motion-lovers; boat rides the waves", async ({ dh }) => {
    const pg = await dh.newPage({ reducedMotion: "no-preference" });
    await bootPage(pg, dh, "");
    // v6.29: default = settle. The glide lasts 260ms, so the mid-flight sample
    // is taken in-page, synchronously after the click: a forced layout right
    // then reads the transition's START width (a teleport would already be
    // full-width). A round trip through the driver can outlast the whole glide.
    const mid = await pg.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const el = document.querySelector(".w-settle");
      el.querySelector(".wFocus").click();
      return { gliding: el.classList.contains("gliding"),
               midflight: el.getBoundingClientRect().width < c.width - 8 };
    });
    ok(mid.gliding, "no gliding class during focus");
    ok(mid.midflight, "focus teleported despite motion preference");
    await expect.poll(() => pg.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const w = document.querySelector(".w-settle").getBoundingClientRect();
      return Math.abs(w.width - c.width) < 2;
    }), { message: "glide never arrived", timeout: 3000 }).toBe(true);
    ok(await pg.evaluate(() => {
      const b = document.getElementById("boat");
      return !!b && getComputedStyle(b).animationName.includes("boatDrift");
    }), "no boat on the waves");
    await pg.close();
  });

  test("v6.13 phone: menu pinned inside a 390px viewport, keyboard hints gone", async ({ dh }) => {
    const pg = await dh.newPage();
    await pg.setViewportSize({ width: 390, height: 844 });
    await bootPage(pg, dh, "");
    ok(await pg.locator("#fsBtn").isHidden(), "Fullscreen button shown on a phone");
    ok(await pg.evaluate(() =>
      getComputedStyle(document.querySelector("#homeBtn .kbd")).display) === "none",
      "keyboard hint visible on a phone");
    await pg.click("#addBtn");
    const box = await pg.evaluate(() => {
      const r = document.getElementById("addMenu").getBoundingClientRect();
      return { right: r.right, left: r.left };
    });
    ok(box.right <= 391 && box.left >= -1, "menu overflows: " + JSON.stringify(box));
    await pg.close();
  });

  test("v6.13 fixes: bell warn legible, tally rename beats the pop, no glide mid-drag", async ({ page, dh }) => {
    // bell widget in its warn window: the small line must not be coral-on-coral
    await dh.openAt("#t=2026-09-14T11:07");      // ~3 min before the 11:10 bell
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addBellBtn");
    await expect(page.locator(".w-bell .visWrap")).toHaveClass(/\blow\b/);
    const bell = await page.evaluate(() => {
      const w = document.querySelector(".w-bell .visWrap");
      const s = document.querySelector(".w-bell .bellSmall");
      return { low: w.classList.contains("low"),
               ink: getComputedStyle(s).color,
               bg: getComputedStyle(s.closest(".visDigits")).backgroundColor };
    });
    ok(bell.low, "bell not in warn (fixture time drifted?)");
    ok(bell.ink !== bell.bg, "warn label invisible: " + JSON.stringify(bell));
    // tally: rename must open DURING the +1 pop, numeral at full size
    const pg = await dh.newPage({ reducedMotion: "no-preference" });
    await bootPage(pg, dh, "");
    await pg.click("#addBtn"); await pg.click("#addTallyBtn");
    await pg.evaluate(() => {
      const en = document.querySelector(".w-tally")._entry;
      en.cfg.x = 2; en.cfg.y = 2; en.cfg.w = 55; en.cfg.h = 90;
      en.el.style.left = "2%"; en.el.style.top = "2%";
      en.el.style.width = "55%"; en.el.style.height = "90%";
    });
    await pg.locator(".w-tally .scB:not(.minus)").first().click();
    await pg.locator(".w-tally .scName").first().click();   // mid-pop
    ok(await pg.locator(".w-tally .scNameInput").count() === 1,
      "pop swallowed the rename tap");
    await pg.keyboard.press("Escape");
    // a grab mid-settle must drag 1:1 (no lingering .gliding transition)
    // v6.29: this page has no timer — the tally we just built does the job
    const sb = await pg.locator(".w-tally .strip").boundingBox();
    await pg.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await pg.mouse.down();
    await pg.mouse.move(sb.x + 180, sb.y + 60, { steps: 3 });
    await pg.mouse.up();                         // settle glide starts
    await pg.waitForTimeout(60);                 // grab while the glide is still live
    const hb = await pg.locator(".w-tally .wHandle.hSE").boundingBox();
    await pg.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await pg.mouse.down();
    await pg.mouse.move(hb.x - 150, hb.y - 100, { steps: 4 });
    const midDrag = await pg.evaluate(() => {
      const el = document.querySelector(".w-tally");
      return { gliding: el.classList.contains("gliding"),
               dragging: el.classList.contains("dragging") };
    });
    await pg.mouse.up();
    ok(midDrag.dragging && !midDrag.gliding,
      "transition live during drag: " + JSON.stringify(midDrag));
    // phone-landscape: the menu scrolls instead of clipping its top
    await pg.setViewportSize({ width: 844, height: 390 });
    await pg.click("#addBtn");
    await expect.poll(() => pg.evaluate(() =>
      document.getElementById("addMenu").getBoundingClientRect().top),
      { message: "menu top clipped off-screen" }).toBeGreaterThanOrEqual(-1);
    await pg.close();
  });
});
