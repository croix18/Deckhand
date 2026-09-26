/* v7.7 — the room-facing release of the audit plan: the settle-in is a
 * moment of the clock (no card), the header folded into the dock (one
 * chrome bar), and the landing page is skipped on a day that needs no
 * decision. The settle routine itself is covered in settle-and-media and
 * v71 (rewritten for the moment model); this file covers what is NEW. */
const { test, expect, ok, launch } = require("./helpers");

const FIX = extra => JSON.stringify(Object.assign({
  schemaVersion: 4, appVersion: "7.7.0", ownerName: "Ms. Fixture",
  ui: { locked: false, motion: "off" }, activeScene: "Daily Board",
  scenes: [{ name: "Daily Board", widgets: [{ type: "clock", x: 0, y: 0, w: 58, h: 100 }] }],
  bell: {
    nudgeSeconds: 0, defaultGroup: "Teal Week", autoWeek: true, anchorMonday: "2026-08-31", anchorWeekName: "Black Week",
    groups: [
      { name: "Teal Week", regular: [{ label: "1st", start: "9:20", end: "10:13" }, { label: "2nd", start: "10:16", end: "11:09" }], wednesday: [] },
      { name: "Black Week", regular: [{ label: "6th", start: "9:20", end: "10:13" }, { label: "5th", start: "10:16", end: "11:09" }], wednesday: [] }
    ]
  }
}, extra || {}));

test.describe("v7.7 the landing page, on demand", () => {
  test("v7.7: a rotation-picked week skips the landing page and says hello in one line; H / ⋮ Home bring it back", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T09:05");           // Monday of a Black week, before school
    const boot = await page.evaluate(() => ({
      landing: document.body.classList.contains("landing"),
      canvas: getComputedStyle(document.getElementById("canvas")).display,
      toast: document.getElementById("greetToast").textContent,
      toastHidden: document.getElementById("greetToast").hidden,
      needsPick: window.Deckhand.landing.needsPick()
    }));
    ok(!boot.landing && boot.canvas !== "none", "the board did not open straight away: " + JSON.stringify(boot));
    ok(!boot.needsPick, "needsPick true with the rotation on");
    ok(!boot.toastHidden && /Good morning, Mr\. Shaffer/.test(boot.toast) && /Black Week/.test(boot.toast),
      "the greeting toast should carry the week the rotation picked: " + boot.toast);
    ok(/tap anywhere for sound/.test(boot.toast), "no sound nudge before any gesture: " + boot.toast);
    // the first tap takes the toast away
    await page.mouse.click(1500, 600);
    await expect(page.locator("#greetToast")).toBeHidden();
    // Home is a keystroke, or ⋮ → Home
    await page.keyboard.press("h");
    await expect(page.locator("body")).toHaveClass(/landing/);
    await expect(page.locator("#greet")).toContainText("Good morning, Mr. Shaffer");
    await dh.launch();
    await expect(page.locator("body")).not.toHaveClass(/landing/);
    await page.click("#moreBtn");
    await expect(page.locator("#moreMenu")).toBeVisible();
    await page.click("#homeBtn");
    await expect(page.locator("body")).toHaveClass(/landing/);
    await expect(page.locator("#moreMenu")).toBeHidden();       // a pick closes ⋮
    await expect(page.locator("#homeBtn")).toBeHidden();        // and Home is not offered on Home
  });

  test("v7.7: the landing page still asks when the week is a real question (rotation off, two week types); one week type never asks", async ({ dh }) => {
    const ask = await dh.loadFixture("tmp_land_ask.html", FIX({ bell: {
      nudgeSeconds: 0, defaultGroup: "Teal Week", autoWeek: false,
      groups: [
        { name: "Teal Week", regular: [{ label: "1st", start: "9:20", end: "10:13" }], wednesday: [] },
        { name: "Black Week", regular: [{ label: "6th", start: "9:20", end: "10:13" }], wednesday: [] }
      ] } }), { hash: "#t=2026-09-28T09:05" });
    ok(await ask.evaluate(() => document.body.classList.contains("landing") && window.Deckhand.landing.needsPick()), "rotation off should ask");
    await expect(ask.locator("#greetToast")).toBeHidden();
    await ask.close();
    const one = await dh.loadFixture("tmp_land_one.html", FIX({ bell: {
      nudgeSeconds: 0, defaultGroup: "Only Week", autoWeek: false,
      groups: [{ name: "Only Week", regular: [{ label: "1st", start: "9:20", end: "10:13" }], wednesday: [] }] } }),
      { hash: "#t=2026-09-28T09:05" });
    ok(await one.evaluate(() => !document.body.classList.contains("landing")), "one week type has nothing to ask");
    ok(/Good morning, Ms\. Fixture/.test(await one.textContent("#greetToast")) && !/Only Week/.test(await one.textContent("#greetToast")),
      "a single week type should not be announced: " + await one.textContent("#greetToast"));
    await one.close();
    const none = await dh.loadFixture("tmp_land_none.html", FIX({ bell: { groups: [] } }), { hash: "#t=2026-09-28T09:05" });
    ok(await none.evaluate(() => !document.body.classList.contains("landing")), "no bells has nothing to ask");
    await none.close();
  });
});

test.describe("v7.7 one chrome bar", () => {
  test("v7.7: no header — the date is on the clock, Settings is a dock pill, Home/Sound/Fullscreen live under ⋮ with the brand", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    ok((await page.evaluate(() => document.querySelector("header"))) === null, "a header is still in the markup");
    const date = page.locator("#clockWidget #dateline");
    await expect(date).toBeVisible();
    await expect(date).toContainText("Monday, September 28");
    await expect(date.locator(".sim")).toHaveText("SIM");           // the simulated clock says so on the board
    await expect(page.locator("#dock #setBtn")).toBeVisible();
    await expect(page.locator("#dock #moreBtn")).toBeVisible();
    await expect(page.locator("#homeBtn")).toBeHidden();
    await expect(page.locator("#soundBtn")).toBeHidden();
    // the board itself gained the header's height
    const top = await page.evaluate(() => document.getElementById("clockWidget").getBoundingClientRect().top);
    ok(top < 40, "the clock does not start near the top of the screen: " + top);
    await page.click("#moreBtn");
    await expect(page.locator("#moreMenu")).toBeVisible();
    await expect(page.locator("#moreMenu #brand")).toContainText("DECKHAND");
    await expect(page.locator("#moreMenu #brandVer")).toHaveText("v7");
    await expect(page.locator("#moreMenu #homeBtn")).toBeVisible();
    await expect(page.locator("#moreMenu #fsBtn")).toBeVisible();
    // Sound toggles from there (and closes the menu); M still works
    await expect(page.locator("#soundBtn")).toHaveText("Sound On");
    await page.click("#soundBtn");
    await expect(page.locator("#moreMenu")).toBeHidden();
    await page.click("#moreBtn");
    await expect(page.locator("#soundBtn")).toHaveText("Sound Off");
    await expect(page.locator("#soundBtn")).toHaveAttribute("aria-pressed", "false");
    // an outside tap closes ⋮; so does Escape
    await page.mouse.click(1500, 500);
    await expect(page.locator("#moreMenu")).toBeHidden();
    await page.click("#moreBtn");
    await page.keyboard.press("Escape");
    await expect(page.locator("#moreMenu")).toBeHidden();
    await page.keyboard.press("m");
    await page.click("#moreBtn");
    await expect(page.locator("#soundBtn")).toHaveText("Sound On");
    await page.click("#moreBtn");
    // + Add, ⋯ and ⋮ are one open menu at a time
    await page.click("#addBtn");
    await expect(page.locator("#addMenu")).toBeVisible();
    await page.click("#moreBtn");
    await expect(page.locator("#addMenu")).toBeHidden();
    await expect(page.locator("#moreMenu")).toBeVisible();
    await page.click("#sceneBtn");
    await expect(page.locator("#moreMenu")).toBeHidden();
    await expect(page.locator("#sceneMenu")).toBeVisible();
    await page.keyboard.press("Escape");
    // the landing page keeps only Settings and ⋮ of the dock
    await page.keyboard.press("h");
    const onHome = await page.evaluate(() => {
      const vis = id => getComputedStyle(document.getElementById(id)).display !== "none";
      return { dock: vis("dock"), set: vis("setBtn"), more: vis("moreWrap"), add: vis("addWrap"), lock: vis("lockBtn"), ink: vis("inkBtn"), tog: vis("dockTog"), scene: vis("sceneWrap") };
    });
    ok(onHome.dock && onHome.set && onHome.more && !onHome.add && !onHome.lock && !onHome.ink && !onHome.tog && !onHome.scene,
      "landing dock wrong: " + JSON.stringify(onHome));
    await page.click("#setBtn");                        // Settings opens from the landing page
    await expect(page.locator("#settingsWrap")).toBeVisible();
    await page.click("#closeBtn");
  });

  test("v7.7: stage mode folds the dock and the ⋮ menu with it; the settle moment counts as a running timer for the sea", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await page.click("#moreBtn");
    await expect(page.locator("#moreMenu")).toBeVisible();
    await page.click("#clockWidget .wFocus");
    await expect(page.locator("body")).toHaveClass(/dockMin/);
    await expect(page.locator("#moreMenu")).toBeHidden();
    await page.keyboard.press("Escape");
    ok(!(await page.evaluate(() => window.Deckhand.canvas.timerRunning())), "nothing should be running");
    await page.evaluate(() => window.Deckhand.settle.start());
    ok(await page.evaluate(() => window.Deckhand.canvas.timerRunning()), "the count should hold the sea to its commons");
    await page.evaluate(() => window.Deckhand.settle.reset());
  });

  test("v7.7: + Add has no Settle-in tile; a scene without a clock cannot run the moment; removing the clock ends a live one", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:15:52");         // 5th (Black week) begins at 10:16
    await dh.launch();
    await page.click("#addBtn");
    await expect(page.locator("#addSettleBtn")).toHaveCount(0);
    await page.keyboard.press("Escape");
    // a clockless scene: the bell passes, nothing runs (there is no card to hold the moment)
    await page.click("#sceneBtn");
    await page.fill("#sceneName", "Blank");
    await page.click("#sceneNewBtn");
    await page.click("#clockWidget .wClose");
    ok(!(await page.evaluate(() => window.Deckhand.canvas.clockMounted())), "clock still mounted");
    await page.waitForTimeout(9000);                    // 10:16 comes and goes (negative check)
    ok(!(await page.evaluate(() => window.Deckhand.settle.live())), "the moment ran with no clock on the board");
    ok(!(await page.evaluate(() => document.body.classList.contains("focusMode"))), "something was staged");
    // back on the Daily Board a manual run works; ✕ on the clock stands it down
    await page.selectOption("#sceneSel", "Daily Board");
    await page.evaluate(() => window.Deckhand.settle.start());
    await expect(page.locator("#clockWidget")).toHaveClass(/stLive/);
    await page.keyboard.press("Escape");                 // leave the stage, keep counting
    ok(await page.evaluate(() => window.Deckhand.settle.running()), "Escape should not end the count");
    await page.click("#clockWidget .wClose");
    ok(!(await page.evaluate(() => window.Deckhand.settle.live())), "removing the clock left the moment live");
  });

  test("v7.7: on a phone the ⋮ menu pins inside the viewport and hides Fullscreen; the clock sheds the date when short", async ({ dh }) => {
    const pg = await dh.newPage();
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.goto(dh.url + "#t=2026-09-28T10:30");
    await pg.waitForFunction(() => !!window.Deckhand);
    await launch(pg);
    await pg.click("#moreBtn");
    const m = await pg.evaluate(() => {
      const r = document.getElementById("moreMenu").getBoundingClientRect();
      return { left: r.left, right: r.right, fs: getComputedStyle(document.getElementById("fsBtn")).display,
               kbd: getComputedStyle(document.querySelector("#homeBtn .kbd")).display };
    });
    ok(m.left >= 0 && m.right <= 390, "⋮ menu overflows a 390px phone: " + JSON.stringify(m));
    ok(m.fs === "none" && m.kbd === "none", "phone shows fullscreen/keyboard hints: " + JSON.stringify(m));
    await pg.close();
    // a short clock card drops the date before it drops the time
    const p2 = await dh.newPage();
    await p2.goto(dh.url + "#t=2026-09-28T10:30");
    await p2.waitForFunction(() => !!window.Deckhand);
    await launch(p2);
    await p2.evaluate(() => {
      const en = document.getElementById("clockWidget")._entry;
      en.cfg.h = 28; en.el.style.height = "28%";
    });
    await p2.waitForTimeout(150);
    const short = await p2.evaluate(() => ({
      date: getComputedStyle(document.getElementById("dateline")).display,
      clock: getComputedStyle(document.getElementById("clock")).display
    }));
    ok(short.date === "none" && short.clock !== "none", "short card kept the date over the time: " + JSON.stringify(short));
    await p2.close();
  });
});
