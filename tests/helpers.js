/* Shared fixtures for the Deckhand suite.
 *
 *   const { test, expect, ok } = require("./helpers");
 *   test("…", async ({ page, dh }) => { await dh.openAt("#t=…"); … });
 *
 * `dh` wraps the page with the helpers the original single-file harness
 * had (openAt, launch, addW, addTimer, unlock, summonCard, loadFixture,
 * openScheds, text, attr, bellText) plus what v7 needs (reopen, storage).
 * `ok(cond, msg)` is the old boolean assertion — bodies port verbatim.
 *
 * Storage: since v7.0 the board AUTOSAVES to localStorage and the device
 * copy wins at boot. Every navigation here clears that store first (an
 * init script), so `openAt` still means "fresh boot from the file" the way
 * the old suite assumed. A test that wants persistence across a reload
 * calls `dh.reopen(hash)` — that navigation keeps the store.
 */
const base = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "Deckhand.html");
const APP_URL = "file://" + APP;
const SRC = fs.readFileSync(APP, "utf8");

const ok = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };

const inject = (src, cfgText) => src.replace(
  /(<script id="deckhand-config"[^>]*>)[\s\S]*?(<\/script>)/,
  (_, a, b) => a + "\n" + cfgText + "\n" + b
);

const test = base.test.extend({
  // per-test error collection: page errors and console errors fail the test at the end
  errors: async ({}, use) => { await use([]); },

  context: async ({ context }, use) => {
    // fresh-boot semantics: wipe the device store on every navigation
    // unless the tab opted into keeping it (dh.reopen sets the flag)
    await context.addInitScript(() => {
      try {
        if (sessionStorage.getItem("dh.keepStore") !== "1") localStorage.clear();
        sessionStorage.removeItem("dh.keepStore");
      } catch (e) {}
    });
    await use(context);
  },

  dh: async ({ page, context, errors, baseURL }, use, testInfo) => {
    const watch = p => {
      p.on("console", m => {
        if (m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|ERR_CONNECTION|net::/.test(m.text()))
          errors.push("console: " + m.text());
      });
      p.on("pageerror", e => errors.push("pageerror: " + String(e)));
    };
    watch(page);
    await page.emulateMedia({ reducedMotion: "reduce" });   // belt + braces (see playwright.config.js)
    const url = baseURL ? baseURL + "Deckhand.html" : APP_URL;
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "deckhand-fx-"));
    const ignore = [];

    const dh = {
      url,
      /** fresh boot from the file at a sim moment ('' = real clock) */
      openAt: async hash => {
        await page.goto("about:blank");
        await page.goto(url + (hash || ""));
        await page.waitForFunction(() => !!window.Deckhand);   // booted (the script runs after the markup parses)
        await page.waitForTimeout(150);
      },
      /** reload KEEPING the device store (autosave persistence tests) */
      reopen: async hash => {
        /* sessionStorage (the keep flag) survives a reload but not an
           about:blank hop, and a hash-only goto is a same-document
           navigation that never reboots the app — so: set the hash in
           place, flag, and reload */
        await page.evaluate(h => {
          try { sessionStorage.setItem("dh.keepStore", "1"); } catch (e) {}
          if (location.hash !== h) location.hash = h;
        }, hash || "");
        await page.reload();
        await page.waitForFunction(() => !!window.Deckhand);   // booted (the script runs after the markup parses)
        await page.waitForTimeout(150);
      },
      launch: async () => { await page.click("#launchBtn"); await page.waitForTimeout(150); },
      addW: async id => { await page.click("#addBtn"); await page.click("#" + id); },
      summonCard: async () => {
        await page.click("#focusTimerBtn");
        await page.click("#focusTimerMenu [data-custom]");
      },
      // v6.29: the default board is clock + settle-in; tests that exercise
      // the primary timer summon one into the OLD right column first.
      addTimer: async () => {
        await dh.addW("addTimerBtn");
        await page.evaluate(() => {
          const en = document.querySelector(".w-timer")._entry;
          en.cfg.x = 61; en.cfg.y = 0; en.cfg.w = 39; en.cfg.h = 100;
          en.el.style.left = "61%"; en.el.style.top = "0%";
          en.el.style.width = "39%"; en.el.style.height = "100%";
        });
      },
      // v6.11: unlocking takes a deliberate 1.5s hold
      unlock: async () => {
        const b = await page.locator("#lockBtn").boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(1750);
        await page.mouse.up();
        await page.waitForTimeout(120);
      },
      // v7.2: Settings is a tab rail — one panel visible at a time. tab()
      // shows one; openScheds() shows Schedules with all four week types
      // in TEXT mode (the textareas the older specs type into).
      tab: async id => page.evaluate(id => window.Deckhand.settings.showTab(id), id),
      openScheds: async () => page.evaluate(() => {
        window.Deckhand.settings.showTab("scheds");
        [0, 1, 2, 3].forEach(i => window.Deckhand.settings.textMode(i, true));
      }),
      text: async sel => (await page.textContent(sel)).trim(),
      attr: async (sel, a) => await page.getAttribute(sel, a),
      bellText: async () => {
        const a = (await page.textContent("#periodNow")).trim();
        const b = (await page.textContent("#weekTag")).trim();
        const c = (await page.locator("#bellSub").isHidden()) ? "" : (await page.textContent("#bellSub")).trim();
        return a + " | " + b + " | " + c;
      },
      /** write a fixture copy of the app with a replaced config block and open it in a NEW page */
      loadFixture: async (fname, cfgText, opts) => {
        const p = path.join(fixtureDir, fname);
        fs.writeFileSync(p, inject(SRC, cfgText));
        const pg = await context.newPage(); watch(pg);
        await pg.emulateMedia({ reducedMotion: (opts && opts.reducedMotion) || "reduce" });
        await pg.goto("file://" + p + ((opts && opts.hash) || ""));
        await pg.waitForFunction(() => !!window.Deckhand);
        await pg.waitForTimeout(150);
        return pg;
      },
      /** same, but returns the path only (for tests that navigate the main page to it) */
      writeFixture: (fname, cfgText) => {
        const p = path.join(fixtureDir, fname);
        fs.writeFileSync(p, inject(SRC, cfgText));
        return p;
      },
      fixtureDir,
      inject, SRC, APP, ROOT,
      newPage: async opts => {
        const pg = await context.newPage(); watch(pg);
        await pg.emulateMedia({ reducedMotion: (opts && opts.reducedMotion) || "reduce" });
        await pg.bringToFront();               // a background tab throttles rAF
        return pg;
      },
      /** the device store as the app wrote it (null if none) */
      stored: async () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("deckhand.config")); } catch (e) { return null; } }),
      /** let a test EXPECT a console/page error matching re (it is dropped at teardown) */
      ignoreErrors: re => { ignore.push(re); },
      /** force an autosave now */
      flush: async () => page.evaluate(() => window.Deckhand.flush())
    };
    await use(dh);
    try { fs.rmSync(fixtureDir, { recursive: true, force: true }); } catch (e) {}
    const real = errors.filter(e => !ignore.some(re => re.test(e)));
    if (real.length) throw new Error("JS errors during test:\n" + real.join("\n"));
  }
});

module.exports = { test, expect: base.expect, ok, inject, SRC, APP, APP_URL, ROOT };
