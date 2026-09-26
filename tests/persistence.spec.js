/* v7.0 — device persistence (autosave), reset, update nudge, roster import,
   and the bug-fix regressions from the September 2026 review. */
const { test, expect, ok } = require("./helpers");
const fs = require("fs");
const path = require("path");

const SEATING = {
  v: 1,
  periods: [{ id: "p1", sectionId: "s1", name: "Period 1" }, { id: "p3", sectionId: "s3", name: "Period 3" },
            { id: "p9", sectionId: "s9", name: "Homeroom" }],
  students: [
    { id: "a", periodId: "p1", first: "Ava", last: "Alder", nick: "", active: true },
    { id: "b", periodId: "p1", first: "Benjamin", last: "Bloom", nick: "Ben", active: true },
    { id: "c", periodId: "p3", first: "Cai", last: "Cole", active: true },
    { id: "d", periodId: "p3", first: "Gone", last: "Grad", active: false },
    { id: "e", periodId: "p9", first: "Nowhere", last: "Nil", active: true }
  ],
  layout: {}, charts: {}
};

test.describe("autosave on the device", () => {
  test("v7.0: a fresh boot seeds the device copy from the file, and edits persist across a reload", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    ok(await page.evaluate(() => window.Deckhand.configSource) === "device", "boot did not seed the device copy");
    const st = await dh.stored();
    const ver = await page.evaluate(() => window.Deckhand.version);
    ok(st && st.cfg && st.cfg.ownerName === "Mr. Shaffer" && st.fileVersion === ver, "seed: " + JSON.stringify(st && st.fileVersion));

    await dh.launch();
    await page.click("#setBtn");
    await page.fill("#sName", "Ms. Test");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    await dh.tab("device");                       // v7.2: the status line lives on the Device tab
    await expect(page.locator("#storeNote")).toContainText("save automatically");
    await expect(page.locator("#devSource")).toHaveText("Device copy");
    await page.click("#closeBtn");
    await dh.flush();
    ok((await dh.stored()).cfg.ownerName === "Ms. Test", "edit not persisted");

    await dh.reopen("#t=2026-09-21T10:30");
    await expect(page.locator("#greet")).toHaveText("Good morning, Ms. Test");
    ok(await page.evaluate(() => window.Deckhand.config.ownerName) === "Ms. Test", "device copy did not win at boot");
  });

  test("v7.0: rosters and a moved widget survive a reload; a fresh boot (store cleared) is the file again", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await dh.launch();
    await page.click("#setBtn");
    await dh.tab("rosters");
    await page.fill('#rosterGrid textarea[data-period="2nd"]', "Ava, Ben, Cai");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    await page.click("#closeBtn");
    await page.evaluate(() => {
      const en = document.querySelector(".w-settle")._entry;
      en.cfg.x = 50; en.cfg.y = 10;
    });
    await dh.flush();
    await dh.reopen("#t=2026-09-21T10:30");
    const back = await page.evaluate(() => ({
      rosters: window.Deckhand.config.rosters,
      settle: window.Deckhand.config.scenes[0].widgets.filter(w => w.type === "settle")[0]
    }));
    ok(back.rosters.length === 1 && back.rosters[0].names.join() === "Ava,Ben,Cai", "rosters lost: " + JSON.stringify(back.rosters));
    ok(back.settle.x === 50 && back.settle.y === 10, "layout lost: " + JSON.stringify(back.settle));

    await dh.openAt("#t=2026-09-21T10:30");           // helpers clear the store: the file's seed again
    ok((await page.evaluate(() => window.Deckhand.config.rosters.length)) === 0, "store not cleared on fresh boot");
  });

  test("v7.0: the settings action row is visible without scrolling at 1080p", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await dh.launch();
    await page.click("#setBtn");
    const vis = await page.evaluate(() => {
      const r = document.getElementById("setActions").getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && r.height > 40;
    });
    ok(vis, "action row is below the fold");
    await expect(page.locator("#dlBtn")).toHaveText("Export a copy");
    await expect(page.locator("#setResetBtn")).toBeVisible();
  });

  test("v7.0: Use this file's settings is two-tap and wipes the device copy", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await dh.launch();
    await page.click("#setBtn");
    await page.fill("#sName", "Ms. Test");
    await page.click("#applyBtn");
    await dh.flush();
    await page.click("#setResetBtn");
    await expect(page.locator("#setResetBtn")).toHaveClass(/armed/);
    await expect(page.locator("#setErrors")).toContainText("forgets everything");
    // arming disarms itself; a second tap inside the window reloads on the file
    await page.evaluate(() => { try { sessionStorage.setItem("dh.keepStore", "1"); } catch (e) {} window.name = "dh.keepStore"; });
    await Promise.all([page.waitForNavigation(), page.click("#setResetBtn")]);
    await page.waitForSelector("#launchBtn");
    await expect(page.locator("#greet")).toContainText("Mr. Shaffer");
    // (the init script clears storage on that navigation anyway; the real proof is Store.clear ran before reload)
  });

  test("v7.0: a newer release over an older device copy shows the update nudge; 'Use the new bell schedule' adopts the file's bells", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await page.evaluate(() => {
      const o = JSON.parse(localStorage.getItem("deckhand.config"));
      o.fileVersion = "6.33.0";
      o.cfg.ownerName = "Ms. Keep";
      o.cfg.bell.groups[0].name = "Old Week";
      localStorage.setItem("deckhand.config", JSON.stringify(o));
    });
    await dh.reopen("#t=2026-09-21T10:30");
    await expect(page.locator("#verNudge")).toBeVisible();
    await expect(page.locator("#verNudgeText")).toContainText(await page.evaluate(() => window.Deckhand.version));
    await expect(page.locator("#verNudgeBells")).toBeVisible();
    ok((await page.evaluate(() => window.Deckhand.config.bell.groups[0].name)) === "Old Week", "device bells not loaded");
    await page.click("#verNudgeBells");
    await expect(page.locator("#verNudge")).toBeHidden();
    const after = await page.evaluate(() => ({
      g0: window.Deckhand.config.bell.groups[0].name, owner: window.Deckhand.config.ownerName,
      fv: JSON.parse(localStorage.getItem("deckhand.config")).fileVersion
    }));
    ok(after.g0 === "Teal Week", "file bells not adopted: " + after.g0);
    ok(after.owner === "Ms. Keep", "adopting bells clobbered other settings");
    ok(after.fv === (await page.evaluate(() => window.Deckhand.version)), "device copy not re-stamped: " + after.fv);
    // second open of the same release: no nudge
    await dh.reopen("#t=2026-09-21T10:30");
    await expect(page.locator("#verNudge")).toBeHidden();
  });

  test("v7.0: the nudge hides the bells button when the file's schedule is already the device's", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await page.evaluate(() => {
      const o = JSON.parse(localStorage.getItem("deckhand.config"));
      o.fileVersion = "6.33.0";
      localStorage.setItem("deckhand.config", JSON.stringify(o));
    });
    await dh.reopen("#t=2026-09-21T10:30");
    await expect(page.locator("#verNudge")).toBeVisible();
    await expect(page.locator("#verNudgeBells")).toBeHidden();
    await page.click("#verNudgeKeep");
    await expect(page.locator("#verNudge")).toBeHidden();
  });

  test("v7.0/7.5.1: a corrupt device copy boots the file's config (never a defaults board) — and is QUARANTINED, never seeded over", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await page.evaluate(() => localStorage.setItem("deckhand.config", "{not json"));
    await dh.reopen("#t=2026-09-21T10:30");
    ok(await page.evaluate(() => window.Deckhand.configSource) === "file", "should boot from the file, hands off the device copy");
    ok(await page.evaluate(() => !document.getElementById("cfgWarn")), "corrupt STORE must not raise the corrupt FILE banner");
    await expect(page.locator("#greet")).toContainText("Mr. Shaffer");
    await expect(page.locator("#verNudge")).toBeVisible();
    await expect(page.locator("#verNudgeText")).toContainText("could not be read");
    const st = await page.evaluate(() => ({
      raw: localStorage.getItem("deckhand.config"),
      bad: Object.keys(localStorage).filter(k => k.startsWith("deckhand.config.bad-")).length
    }));
    ok(st.raw === "{not json" && st.bad === 1, "the unreadable copy was overwritten or not quarantined: " + JSON.stringify(st));
    // and the autosave stays suspended: an edit changes nothing on the device
    await page.evaluate(() => { window.Deckhand.config.ownerName = "Ms. Edit"; window.Deckhand.flush(); });
    ok((await page.evaluate(() => localStorage.getItem("deckhand.config"))) === "{not json", "a suspended board still wrote");
    // the escape hatch: Use this file's settings clears it and reboots on the seed
    await dh.launch();
    await page.click("#setBtn");
    await dh.tab("device");
    await page.click("#setResetBtn");
    await page.evaluate(() => { try { sessionStorage.setItem("dh.keepStore", "1"); } catch (e) {} window.name = "dh.keepStore"; });
    await Promise.all([page.waitForNavigation(), page.click("#setResetBtn")]);
    await page.waitForFunction(() => !!window.Deckhand);
    await expect.poll(() => page.evaluate(() => window.Deckhand.configSource)).toBe("device");
  });

  test("v7.5.1: an OLDER file never writes over a board saved by a newer release; another window's save suspends this one", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await page.evaluate(() => {
      const o = JSON.parse(localStorage.getItem("deckhand.config"));
      o.fileVersion = "99.0.0"; o.cfg.ownerName = "Ms. Future"; o.cfg.rosters = [{ period: "2nd", names: ["Ava"] }];
      localStorage.setItem("deckhand.config", JSON.stringify(o));
    });
    await dh.reopen("#t=2026-09-21T10:30");
    await expect(page.locator("#verNudgeText")).toContainText("newer than this file");
    await page.evaluate(() => { window.Deckhand.config.ownerName = "Ms. Old"; window.Deckhand.flush(); });
    await page.waitForTimeout(300);
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("deckhand.config")));
    ok(kept.fileVersion === "99.0.0" && kept.cfg.ownerName === "Ms. Future" && kept.cfg.rosters.length === 1, "the newer board was overwritten: " + JSON.stringify(kept).slice(0, 200));
    // a second window: simulate its write with a storage event
    await dh.openAt("#t=2026-09-21T10:30");
    await dh.launch();
    await page.evaluate(() => {
      const o = JSON.parse(localStorage.getItem("deckhand.config")); o.cfg.ownerName = "Ms. Other";
      const str = JSON.stringify(o); localStorage.setItem("deckhand.config", str);
      window.dispatchEvent(new StorageEvent("storage", { key: "deckhand.config", newValue: str, oldValue: "x" }));
    });
    await expect(page.locator("#verNudgeText")).toContainText("another window");
    await page.evaluate(() => { window.Deckhand.config.ownerName = "Ms. Stale"; window.Deckhand.flush(); });
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem("deckhand.config")).cfg.ownerName)) === "Ms. Other", "the stale window overwrote the other window's save");
  });

  test("v7.0: a broken file block with a good device copy runs on the device copy and refuses export", async ({ page, dh }) => {
    // seed a good device copy, then open a copy whose block is unreadable
    await dh.openAt("#t=2026-09-21T10:30");
    await page.evaluate(() => {
      const o = JSON.parse(localStorage.getItem("deckhand.config"));
      o.cfg.ownerName = "Ms. Device";
      localStorage.setItem("deckhand.config", JSON.stringify(o));
      try { sessionStorage.setItem("dh.keepStore", "1"); } catch (e) {}
      window.name = "dh.keepStore";
    });
    const p = dh.writeFixture("broken.html", "{ this is not json");
    await page.goto("file://" + p + "#t=2026-09-21T10:30");
    await page.waitForSelector("#launchBtn");
    ok(await page.evaluate(() => window.Deckhand.configSource) === "device", "device copy should rescue a broken file");
    await expect(page.locator("#greet")).toContainText("Ms. Device");
    ok(await page.evaluate(() => !document.getElementById("cfgWarn")), "no defaults banner when the device copy is good");
    await dh.launch();
    await page.click("#setBtn");
    await dh.tab("device");
    await expect(page.locator("#storeNote")).toContainText("damaged");
    await page.click("#dlBtn");
    await expect(page.locator("#setErrors")).toContainText("Export disabled");
  });
});

test.describe("rosters from the Seating Chart", () => {
  test("v7.0: Import from Seating Chart fills the period boxes by number, skips inactive and unmatched", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await page.evaluate(S => localStorage.setItem("seatingchart.v1", JSON.stringify(S)), SEATING);
    await dh.launch();
    await page.click("#setBtn");
    await dh.tab("rosters");
    await page.click("#rosterImportBtn");
    await expect(page.locator("#setErrors")).toContainText("Loaded 3 students into 2 periods");
    ok((await page.inputValue('#rosterGrid textarea[data-period="1st"]')) === "Ava, Ben", "1st box");
    ok((await page.inputValue('#rosterGrid textarea[data-period="3rd"]')) === "Cai", "3rd box (inactive skipped)");
    ok((await page.inputValue('#rosterGrid textarea[data-period="2nd"]')) === "", "2nd untouched");
    // nothing committed until Apply
    ok((await page.evaluate(() => window.Deckhand.config.rosters.length)) === 0, "import committed without Apply");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    await dh.flush();
    const r = (await dh.stored()).cfg.rosters;
    ok(r.length === 2 && r[0].period === "1st" && r[1].names[0] === "Cai", "rosters after Apply: " + JSON.stringify(r));
  });

  test("v7.0: no Seating Chart on the device says so; a backup file imports the same way; a wrong file is refused", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await dh.launch();
    await page.click("#setBtn");
    await dh.tab("rosters");
    await page.click("#rosterImportBtn");
    await expect(page.locator("#setErrors")).toContainText("No Seating Chart data on this device");

    const good = path.join(dh.fixtureDir, "seating-chart-backup-2026-09-21.json");
    fs.writeFileSync(good, JSON.stringify(SEATING));
    await page.setInputFiles("#rosterImportFile", good);
    await expect(page.locator("#setErrors")).toContainText("Loaded 3 students");
    ok((await page.inputValue('#rosterGrid textarea[data-period="1st"]')) === "Ava, Ben", "backup import");

    const bad = path.join(dh.fixtureDir, "notes.json");
    fs.writeFileSync(bad, JSON.stringify({ hello: "world" }));
    await page.setInputFiles("#rosterImportFile", bad);
    await expect(page.locator("#setErrors")).toContainText("No students found");
    ok((await page.inputValue('#rosterGrid textarea[data-period="1st"]')) === "Ava, Ben", "a bad file must not clear the boxes");
  });
});

test.describe("review fixes", () => {
  test("v7.0: a manual week override expires at the date change (rotation resumes)", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T23:59:57");        // Tuesday of a Teal week (auto = 0)
    await page.keyboard.press("2");                    // override to Black for the day
    ok((await page.evaluate(() => window.Deckhand.activeIndex)) === 1, "override not applied");
    await expect.poll(() => page.evaluate(() => window.Deckhand.activeIndex), { timeout: 9000 }).toBe(0);
    const pressed = await page.locator('#schedChips .chip[aria-pressed="true"]').textContent();
    ok(pressed.trim() === "Teal Week", "landing chip stale after rollover: " + pressed);
  });

  test("v7.0: one broken widget fails alone — the rest of the scene still mounts", async ({ page, dh }) => {
    const cfg = JSON.stringify({
      schemaVersion: 4, appVersion: "7.0.0", ownerName: "Mr. Shaffer", rosters: [],
      ui: { locked: false, motion: "auto" }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 58, h: 100, label: "Clock", pin: false },
        { type: "text", x: 61, y: 0, w: 39, h: 50, label: "Note", pin: false, text: "hello" },
        { type: "timer", x: 61, y: 50, w: 39, h: 50, label: "Timer", pin: false }
      ] }],
      sound: { enabled: true, volume: 0.25 }, clock: { showSeconds: false },
      timer: { presetsMinutes: [1, 3, 5, 10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none", groups: [] }
    }, null, 2);
    const p = dh.writeFixture("broken-widget.html", cfg);
    dh.ignoreErrors(/widget failed to build text/);   // the app logs the failure on purpose
    // the text widget builds a ResizeObserver at mount — make that constructor throw
    await page.addInitScript(() => { window.ResizeObserver = function () { throw new Error("boom: sabotaged RO"); }; });
    await page.goto("file://" + p + "#t=2026-09-21T10:30");
    await page.waitForSelector("#launchBtn");
    await dh.launch();
    const state = await page.evaluate(() => ({
      widgets: document.querySelectorAll("main#canvas .widget:not([hidden])").length,
      broken: document.querySelectorAll(".w-text .wBroken").length,
      timer: !!document.querySelector(".w-timer #startBtn"),
      dockOk: !document.getElementById("addBtn").disabled
    }));
    ok(state.widgets === 3 && state.broken === 1 && state.timer && state.dockOk, "scene half-mounted: " + JSON.stringify(state));
    // the broken card is removable like any other
    await page.click(".w-text .wClose");
    await expect(page.locator(".w-text")).toHaveCount(0);
  });

  test("v7.0: a completed hold-to-unlock whose finger slides off does not eat the next Lock tap", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await dh.launch();
    await page.click("#lockBtn");
    await expect(page.locator("body")).toHaveClass(/locked/);
    const b = await page.locator("#lockBtn").boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect(page.locator("body")).not.toHaveClass(/locked/, { timeout: 4000 });   // hold completed
    await page.mouse.move(b.x + b.width + 200, b.y - 200);                            // slide off — no click will fire
    await page.mouse.up();
    await page.click("#lockBtn");                                                     // next tap must LOCK
    await expect(page.locator("body")).toHaveClass(/locked/);
  });

  test("v7.0: YouTube channel pages are rejected; nocookie must be the embed player", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-21T10:30");
    await dh.launch();
    await dh.addW("addYtBtn");
    const feed = async u => {
      await page.fill(".w-yt .ytIn", u);
      await page.locator(".w-yt .ytIn").dispatchEvent("blur");
    };
    const good = "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk";
    await feed("https://www.youtube.com/watch?v=jfKfPfyJRdk");
    await expect.poll(() => page.evaluate(() => document.querySelector(".w-yt")._entry.cfg.url)).toBe(good);
    await feed("https://www.youtube.com/@MathAntics");
    await expect(page.locator(".w-yt .ytNote, .w-yt .embNote").first()).toBeVisible();
    ok((await page.evaluate(() => document.querySelector(".w-yt")._entry.cfg.url)) === good, "channel URL replaced a good station");
    await feed("https://www.youtube-nocookie.com/watch?v=jfKfPfyJRdk");
    ok((await page.evaluate(() => document.querySelector(".w-yt")._entry.cfg.url)) === good, "non-player nocookie URL accepted");
  });
});
