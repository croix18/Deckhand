/* Embed widget, scene manager, autosave, focus/pin/stage, noise game, canvas
 * invariants — ported from test_deckhand_v6.js (old lines 1884–2548).
 * Every test boots its own board; the local iframe targets the embed tests
 * need are written into dh.fixtureDir (per-test temp dir) and opened over
 * file://. */
const { test, expect, ok, launch } = require("./helpers");
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

/* a local stand-in for a Slides deck (docs.google.com is unreachable from CI) */
const writeTarget = (dh, fname, title, body) => {
  const p = path.join(dh.fixtureDir, fname);
  fs.writeFileSync(p, "<!DOCTYPE html><title>" + title + "</title><body>" + body);
  return "file://" + p;
};
const frameLoaded = (page, target) => page.frames().some(f => f.url() === target);
const feedURL = (page, u) => page.evaluate(u => {
  const inp = document.querySelector(".w-embed .embIn");
  inp.value = u; inp.dispatchEvent(new Event("blur"));
}, u);
/* point the frame at a fixture directly (the input path only takes https) */
const aimFrame = (page, u) => page.evaluate(u => {
  const w = window.Deckhand.config.scenes[0].widgets;
  w[w.length - 1].url = u;
  const f = document.querySelector(".w-embed .embFrame");
  f.hidden = false; f.src = u;
  const e = document.querySelector(".w-embed .embEmpty"); if (e) e.hidden = true;
}, u);

/* HARNESS NOTE: @playwright/test does not forward `use.reducedMotion` to the
   context (it is not a test option), so the config's "reduce" never reaches
   the main page and widget glides animate. Belt + braces per page, as the
   old suite did, until helpers.js/config pick it up. */
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

test.describe("embed", () => {
  test("embed: Slides links normalize to the /embed player; https-only", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addEmbedBtn");
    ok(await page.locator(".w-embed").count() === 1, "embed widget missing");
    const cases = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets;
      const wc = w[w.length - 1];
      const inp = document.querySelector(".w-embed .embIn");
      const feed = v => { inp.value = v; inp.dispatchEvent(new Event("blur")); return wc.url; };
      return {
        pub: feed("https://docs.google.com/presentation/d/e/2PACX-abc123/pub?start=false&loop=false&delayms=3000"),
        edit: feed("https://docs.google.com/presentation/d/1YwtHc-00h11TMTq3eH4uETxl03ix3UVl/edit?usp=sharing&ouid=1071"),
        multi: feed("https://docs.google.com/presentation/u/0/d/1ABCdefGHI/edit#slide=id.p13"),
        upper: feed("HTTPS://DOCS.GOOGLE.COM/presentation/d/1XYZ/edit"),
        kiosk: feed("https://docs.google.com/presentation/d/e/2PACX-k/embed?start=true&loop=true&delayms=5000"),
        gdoc: feed("https://docs.google.com/document/d/1DOC/edit"),
        phet: feed("https://phet.colorado.edu/sims/html/fractions-intro/latest/fractions-intro_all.html"),
        evil: feed("javascript:alert(1)")
      };
    });
    ok(cases.multi === "https://docs.google.com/presentation/d/1ABCdefGHI/embed?start=false&loop=false&delayms=60000&slide=id.p13",
      "multi-account link: " + cases.multi);
    ok(cases.upper === "https://docs.google.com/presentation/d/1XYZ/embed?start=false&loop=false&delayms=60000",
      "uppercase host: " + cases.upper);
    ok(cases.kiosk === "https://docs.google.com/presentation/d/e/2PACX-k/embed?start=true&loop=true&delayms=5000",
      "kiosk params wiped: " + cases.kiosk);
    ok(cases.gdoc === "https://docs.google.com/document/d/1DOC/edit",
      "Docs link rewritten: " + cases.gdoc);
    ok(cases.pub === "https://docs.google.com/presentation/d/e/2PACX-abc123/embed?start=false&loop=false&delayms=60000",
      "pub: " + cases.pub);
    ok(cases.edit === "https://docs.google.com/presentation/d/1YwtHc-00h11TMTq3eH4uETxl03ix3UVl/embed?start=false&loop=false&delayms=60000",
      "edit: " + cases.edit);
    ok(cases.phet.indexOf("phet.colorado.edu") !== -1, "non-Google URL mangled: " + cases.phet);
    ok(cases.evil !== "" && cases.evil.indexOf("javascript") === -1,
      "javascript: URL survived: " + cases.evil);
    // keep-last-good: garbage typed over a working URL never erases the deck
    const kept = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets;
      const wc = w[w.length - 1];
      const inp = document.querySelector(".w-embed .embIn");
      inp.value = "my slides"; inp.dispatchEvent(new Event("blur"));
      return { url: wc.url, shown: inp.value };
    });
    ok(kept.url.indexOf("phet") !== -1 || kept.url.indexOf("docs.google") !== -1,
      "garbage erased the deck: " + JSON.stringify(kept));
    ok(kept.shown === kept.url, "input not restored: " + JSON.stringify(kept));
    // the row auto-hides once a deck loads; the strip pencil brings it back
    ok(await page.locator(".w-embed .embRow").isHidden(), "row visible with a deck loaded");
    await page.click(".w-embed .wEdit");
    ok(!(await page.locator(".w-embed .embRow").isHidden()), "pencil did not reopen the row");
    // handles must not sit on the reload button or URL input
    const clickable = await page.evaluate(() => {
      const g = document.querySelector(".w-embed .embGo").getBoundingClientRect();
      const el = document.elementFromPoint(g.x + g.width / 2, g.y + g.height / 2);
      const i = document.querySelector(".w-embed .embIn").getBoundingClientRect();
      const el2 = document.elementFromPoint(i.x + i.width / 2, i.bottom - 4);
      // v6.13: the ⟳ is an inline SVG now — resolve to the owning button
      return { go: el && el.closest("button") && el.closest("button").className,
               input: el2 && el2.className };
    });
    ok(String(clickable.go).indexOf("embGo") !== -1, "reload covered by: " + clickable.go);
    ok(String(clickable.input).indexOf("embIn") !== -1, "input covered by: " + clickable.input);
  });

  test("embed: local page loads in the frame; scene switch unloads it", async ({ page, dh }) => {
    const target = writeTarget(dh, "tmp_embed_target.html", "Target", '<h1 id="mark">EMBED TARGET</h1>');
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addEmbedBtn");
    await feedURL(page, "https://example.com/x");      // set config via the input path…
    await page.evaluate(u => {                          // …then point the frame at the fixture
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector(".w-embed .embFrame").src = u;
    }, target);
    await expect.poll(() => frameLoaded(page, target), { message: "frame did not load the target" }).toBe(true);
    // Home must silence the deck; returning to the board restores it
    await page.keyboard.press("h");
    await expect.poll(() => frameLoaded(page, target), { message: "Home left the deck loaded" }).toBe(false);
    await dh.launch();
    await expect.poll(() => frameLoaded(page, target), { message: "deck not restored after Home" }).toBe(true);
    await page.selectOption("#sceneSel", "Stations");
    await expect.poll(() => frameLoaded(page, target), { message: "scene switch left the iframe alive" }).toBe(false);
    await page.selectOption("#sceneSel", "Daily Board");
  });

  test("embed: focus pill appears when the deck has the keys; alarm takes them back", async ({ page, dh }) => {
    const target = writeTarget(dh, "tmp_embed_target.html", "Target", '<h1 id="mark">EMBED TARGET</h1>');
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addEmbedBtn");
    await aimFrame(page, target);
    await expect.poll(() => frameLoaded(page, target)).toBe(true);
    // put a timer on 2s FIRST (keys still ours)…
    await page.keyboard.press("s");              // make sure the TIMER is selected
    for (let i = 0; i < 4; i++){
      if (await page.locator(".w-timer.sel").count() === 1) break;
      await page.keyboard.press("s");
    }
    await page.keyboard.press("2");
    await page.keyboard.press("Enter");
    // …then hand the keyboard to the deck. A raw mouse click: a locator
    // click into a file:// iframe spends seconds on actionability checks
    // here, and the 2s timer would ring before the deck ever had the keys.
    const fb = await page.locator(".w-embed .embFrame").boundingBox();
    await page.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2);
    await expect(page.locator(".embKeys")).toBeVisible();          // focus pill
    ok(await page.evaluate(() =>
      document.activeElement === document.querySelector(".w-embed .embFrame")),
      "frame did not take focus");
    // the timer expires while framed (2s of wall clock)
    await expect(page.locator("#alarm")).toHaveClass(/on/, { timeout: 5000 });
    // the alarm must have reclaimed focus: Space dismisses WITHOUT clicking
    ok(await page.evaluate(() =>
      document.activeElement !== document.querySelector(".w-embed .embFrame")),
      "alarm did not reclaim focus from the iframe");
    await page.keyboard.press(" ");
    ok(!(await dh.attr("#alarm", "class")).includes("on"), "Space did not dismiss");
    ok(await page.locator(".embKeys").isHidden(), "pill lingers after reclaim");
    // lock hides the URL row for a clean student view
    await page.click("#lockBtn");
    ok(await page.locator(".w-embed .embRow").isHidden(), "URL row visible while locked");
    await dh.unlock();
  });

  test("per-period decks: follows the bells, manual override, per-period URLs", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");         // Teal Tue: 2nd period
    await dh.launch();
    await dh.addW("addEmbedBtn");
    const A = "https://phet.colorado.edu/deck-for-2nd";
    const B = "https://phet.colorado.edu/deck-for-3rd";
    await feedURL(page, A);
    await page.click(".w-embed .wEdit");         // row tucked away after the load
    await page.check(".w-embed .embPPck");       // per-period ON seeds 2nd with A
    const s1 = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      const wc = ws[ws.length - 1];
      return { pp: wc.perPeriod, d2: wc.decks["2nd"],
               src: document.querySelector(".w-embed .embFrame").getAttribute("src"),
               auto: document.querySelector(".w-embed .embPer option").textContent };
    });
    ok(s1.pp === true && s1.d2 === A, "seed failed: " + JSON.stringify(s1));
    ok(s1.src === A, "auto not showing 2nd deck: " + s1.src);
    ok(s1.auto === "Auto — 2nd", "auto label: " + s1.auto);
    await page.selectOption(".w-embed .embPer", "3rd");
    ok((await page.locator(".w-embed .embEmpty b").textContent()) === "No deck for 3rd yet.",
      "empty state wrong: " + await page.locator(".w-embed .embEmpty").textContent());
    await feedURL(page, B);
    const s2 = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return { d3: ws[ws.length - 1].decks["3rd"],
               src: document.querySelector(".w-embed .embFrame").getAttribute("src") };
    });
    ok(s2.d3 === B && s2.src === B, "3rd deck: " + JSON.stringify(s2));
    await page.click(".w-embed .wEdit");               // row hid again after B loaded
    await page.selectOption(".w-embed .embPer", "");   // back to Auto -> 2nd
    ok(await page.evaluate(() =>
      document.querySelector(".w-embed .embFrame").getAttribute("src")) === A,
      "auto did not return to the 2nd deck");
    // both decks and the mode survive in config for download
    const wc = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1];
    });
    ok(wc.perPeriod && wc.decks["2nd"] === A && wc.decks["3rd"] === B,
      "config: " + JSON.stringify(wc.decks));
    // the reload button must reload the deck that's SHOWING, not the stale single URL
    if (await page.locator(".w-embed .embRow").isHidden()) await page.click(".w-embed .wEdit");
    await page.click(".w-embed .embGo");
    await expect.poll(() => page.evaluate(() =>
      document.querySelector(".w-embed .embFrame").getAttribute("src")),
      { message: "reload showed the wrong deck" }).toBe(A);
  });
});

test.describe("scenes", () => {
  test("scene manager: new, duplicate, rename, two-tap delete", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#sceneBtn");
    ok(!(await page.locator("#sceneMenu").isHidden()), "menu did not open");
    await page.fill("#sceneName", "Warm-up");
    await page.click("#sceneNewBtn");
    ok(await page.inputValue("#sceneSel") === "Warm-up", "new scene not active");
    ok(await page.locator("#canvas .widget:visible").count() === 1, "new scene not clock-only");
    await dh.addW("addTimerBtn");                // give it something to copy
    await page.click("#sceneBtn");
    await page.click("#sceneDupBtn");
    ok(await page.inputValue("#sceneSel") === "Warm-up copy", "dup name: " +
      await page.inputValue("#sceneSel"));
    ok(await page.locator("#canvas .widget:visible").count() === 2, "widgets not copied");
    await page.click("#sceneBtn");
    await page.fill("#sceneName", "Test Day");
    await page.click("#sceneRenBtn");
    ok(await page.inputValue("#sceneSel") === "Test Day", "rename failed");
    ok(await page.evaluate(() => window.Deckhand.config.activeScene) === "Test Day",
      "config activeScene stale");
    const before = await page.evaluate(() => window.Deckhand.config.scenes.length);
    await page.click("#sceneBtn");
    await page.click("#sceneDelBtn");            // first tap: arm
    ok((await page.locator("#sceneDelBtn").textContent()).trim() === "Really delete?",
      "no confirm step");
    ok(await page.evaluate(() => window.Deckhand.config.scenes.length) === before,
      "deleted without confirming");
    await page.click("#sceneDelBtn");            // second tap: delete
    ok(await page.evaluate(() => window.Deckhand.config.scenes.length) === before - 1,
      "scene not deleted");
    ok(await page.inputValue("#sceneSel") !== "Test Day", "deleted scene still active");
    await page.click("#lockBtn");
    ok(await page.locator("#sceneBtn").isDisabled(), "scene menu usable while locked");
    await dh.unlock();
  });

  test('scene delete: switching scenes disarms an armed "Really delete?"', async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#sceneBtn");
    await page.fill("#sceneName", "KeepMe");
    await page.click("#sceneNewBtn");            // 3 scenes now, KeepMe active
    await page.click("#sceneBtn");
    await page.click("#sceneDelBtn");            // armed on KeepMe
    await page.selectOption("#sceneSel", "Daily Board");
    await expect(page.locator("#sceneDelBtn")).not.toHaveClass(/confirm/);
    const state = await page.evaluate(() => ({
      txt: document.getElementById("sceneDelBtn").textContent.trim(),
      armed: document.getElementById("sceneDelBtn").classList.contains("confirm"),
      n: window.Deckhand.config.scenes.length
    }));
    ok(!state.armed && state.txt === "Delete current",
      "confirm survived a scene switch: " + JSON.stringify(state));
    ok(state.n === 3, "a scene was deleted: " + state.n);
    // closing via the ⋯ button also disarms (menu is still open after the switch)
    await page.click("#sceneDelBtn");            // arm
    await page.click("#sceneBtn");               // close via toggle
    await page.click("#sceneBtn");               // reopen
    ok((await page.locator("#sceneDelBtn").textContent()).trim() === "Delete current",
      "confirm survived the toggle close");
    await page.keyboard.press("Escape");
  });
});

test.describe("persistence", () => {
  /* v7.0: the board AUTOSAVES to the device. The old "dirty dot + leave
     warning + download clears" story becomes: a real edit reaches the
     device copy on flush; view actions leave the config byte-identical
     (a scene switch changes only activeScene — persisted by design);
     Export a copy still downloads and leaves nothing pending. */
  test("unsaved-changes: dot appears on edits, leave-warning arms, download clears", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    ok(await page.evaluate(() => window.Deckhand.dirty) === false, "dirty at boot");
    ok(await page.evaluate(() => window.Deckhand.configSource) === "device", "config not device-sourced after boot");
    ok((await dh.stored()) !== null, "no device copy after boot");
    await dh.addTimer();                         // v6.29: adding one IS an edit
    // any config change counts — move the timer
    const sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 150, sb.y + sb.height / 2, { steps: 5 });
    await page.mouse.up();
    const live = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer"));
    ok(live.x < 61, "move did not change the config: " + JSON.stringify(live));
    // a real edit reaches the device copy
    ok(await dh.flush() === true, "flush failed");
    ok(await page.evaluate(() => window.Deckhand.dirty) === false, "still dirty after flush");
    const st = await dh.stored();
    const savedTimer = st.cfg.scenes[0].widgets.find(x => x.type === "timer");
    ok(savedTimer && savedTimer.x === live.x && savedTimer.y === live.y,
      "device copy missed the move: " + JSON.stringify(savedTimer));
    // the coral dot means "save FAILED" now — a healthy save never lights it
    ok(!((await dh.attr("#setBtn", "class")) || "").includes("dirty"), "dot lit on a successful save");
    // …and a tab close is safe (no leave-warning) once the device holds it
    ok(!(await page.evaluate(() => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    })), "leave-warning armed with nothing pending");
    // view actions: ⛶ focus + Esc leaves the config byte-identical
    const snap = await page.evaluate(() => JSON.stringify(window.Deckhand.config));
    await page.click(".w-timer .wFocus");
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() => JSON.stringify(window.Deckhand.config)) === snap,
      "focus/unfocus changed the config");
    // a scene switch changes activeScene ONLY (persisted by design)
    await page.selectOption("#sceneSel", "Stations");
    const afterSwitch = await page.evaluate(() => window.Deckhand.config);
    const strip = c => { const o = JSON.parse(JSON.stringify(c)); delete o.activeScene; return JSON.stringify(o); };
    ok(afterSwitch.activeScene === "Stations", "activeScene not switched");
    ok(strip(afterSwitch) === strip(JSON.parse(snap)), "scene switch changed more than activeScene");
    await dh.flush();
    ok((await dh.stored()).cfg.activeScene === "Stations", "activeScene not persisted");
    await page.selectOption("#sceneSel", "Daily Board");
    // Export a copy: still a download of the same file name; nothing pending after
    await page.click("#setBtn");
    const [ dl ] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#dlBtn")
    ]);
    ok(dl.suggestedFilename() === "Deckhand.html", "export name: " + dl.suggestedFilename());
    await dl.delete();
    ok((await dh.text("#setErrors")).startsWith("Applied. Exported Deckhand.html"),
      "export message: " + await dh.text("#setErrors"));
    await page.click("#closeBtn");
    ok(await page.evaluate(() => window.Deckhand.dirty) === false, "export left changes pending");
    ok(!((await dh.attr("#setBtn", "class")) || "").includes("dirty"), "dot lit after export");
  });
});

test.describe("focus, pin and stage", () => {
  test("focus mode: ⛶ fills the board, Esc restores, config untouched, works locked", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    // v6.29: addTimer already spent the dirty flag — compare the CONFIG
    const cfgSnapFocus = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config));
    const before = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      return JSON.stringify(w);
    });
    await page.click(".w-timer .wFocus");
    const m = await page.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const w = document.querySelector(".w-timer").getBoundingClientRect();
      return { dw: Math.abs(w.width - c.width), dh: Math.abs(w.height - c.height),
               dx: Math.abs(w.left - c.left), dy: Math.abs(w.top - c.top),
               pressed: document.querySelector(".w-timer .wFocus").getAttribute("aria-pressed") };
    });
    ok(m.dw < 2 && m.dh < 2 && m.dx < 2 && m.dy < 2, "not full-board: " + JSON.stringify(m));
    ok(m.pressed === "true", "button state");
    // v6.14 stage mode: the focused widget's strip (the drag handle)
    // folds away entirely — dragging is inert by construction
    ok(await page.locator(".w-timer .strip").isHidden(),
      "focused strip visible in stage mode");
    const wb = await page.locator(".w-timer").boundingBox();
    await page.mouse.move(wb.x + wb.width / 2, wb.y + 30);
    await page.mouse.down();
    await page.mouse.move(wb.x + 300, wb.y + 200, { steps: 5 });
    await page.mouse.up();
    const still = await page.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const w = document.querySelector(".w-timer").getBoundingClientRect();
      return Math.abs(w.left - c.left) < 2 && Math.abs(w.top - c.top) < 2;
    });
    ok(still, "focused widget moved");
    await page.keyboard.press("Escape");         // collapse
    const after = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      return JSON.stringify(w);
    });
    ok(before === after, "focus dirtied the config");
    ok(await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config)) === cfgSnapFocus,
      "focus marked unsaved");
    const back = await page.evaluate(() => {
      const w = document.querySelector(".w-timer").getBoundingClientRect();
      const c = document.getElementById("canvas").getBoundingClientRect();
      return w.width < c.width * 0.8;
    });
    ok(back, "Esc did not restore the size");
    // focus works while locked (view action), and ⛶ stays visible
    await page.click("#lockBtn");
    ok(!(await page.locator(".w-timer .wFocus").isHidden()), "⛶ hidden while locked");
    await page.click(".w-timer .wFocus");
    const lockedFull = await page.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const w = document.querySelector(".w-timer").getBoundingClientRect();
      return Math.abs(w.width - c.width) < 2;
    });
    ok(lockedFull, "focus dead while locked");
    await page.click("#unfocusBtn");             // v6.14: the strip folds in
    await dh.unlock();                           // stage mode — Exit collapses
    // the clock focuses too, and only one widget can ever be full
    await page.click("#clockWidget .wFocus");
    const one = await page.evaluate(() =>
      document.querySelectorAll(".widget.wFull").length);
    ok(one === 1, "focused count: " + one);
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() =>
      document.querySelectorAll(".widget.wFull").length) === 0, "Esc left focus");
  });

  test("pin: ⇈ floats a widget above a focused deck, drags there, unpin sinks it", async ({ page, dh }) => {
    const target = writeTarget(dh, "tmp_pin_deck.html", "PinDeck", "<h1>DECK</h1>");
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addEmbedBtn");
    await feedURL(page, "https://example.com/x");      // config via the input path…
    await page.evaluate(u => {                          // …then aim the frame at the fixture
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector(".w-embed .embFrame").src = u;
    }, target);
    await expect.poll(() => frameLoaded(page, target)).toBe(true);
    // park the timer clear of the (top-stacked) embed, with room to drag
    await page.evaluate(() => {
      const en = document.querySelector(".w-timer")._entry;
      en.cfg.x = 64; en.cfg.y = 8; en.cfg.w = 24; en.cfg.h = 40;
      en.el.style.left = "64%"; en.el.style.top = "8%";
      en.el.style.width = "24%"; en.el.style.height = "40%";
    });
    await page.click(".w-timer .wPin");
    ok(await dh.attr(".w-timer .wPin", "aria-pressed") === "true", "pin state");
    ok(await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer").pin
    ) === true, "pin not in config");
    // fill the board with the deck — the pinned timer must stay on top of it
    await page.click(".w-embed .wFocus");
    const over = await page.evaluate(() => {
      const b = document.querySelector(".w-timer").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !!el.closest(".w-timer") : false;
    });
    ok(over, "pinned timer buried under the focused deck");
    // and it must actually drag across the deck
    const before = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      return { x: w.x, y: w.y };
    });
    const sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 30, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + 30 - 192, sb.y + sb.height / 2 + 144, { steps: 6 });
    await page.mouse.up();
    const after = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      return { x: w.x, y: w.y };
    });
    ok(after.x < before.x && after.y > before.y,
      "pinned drag inert: " + JSON.stringify({ before, after }));
    // unpin: the timer sinks back under the focused deck
    await page.click(".w-timer .wPin");
    const under = await page.evaluate(() => {
      const b = document.querySelector(".w-timer").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !el.closest(".w-timer") : true;
    });
    ok(under, "unpinned timer still floats over the deck");
    // v6.22: the staged deck OWNS the keyboard now (clicker fix), so
    // Escape dies inside the iframe by design — exit via the pill
    await page.click("#unfocusBtn");
    // ⇈ edits saved config, so it hides while locked (⛶ stays)
    await page.click("#lockBtn");
    ok(await page.locator(".w-timer .wPin").isHidden(), "⇈ visible while locked");
    ok(!(await page.locator(".w-timer .wFocus").isHidden()), "⛶ gone while locked");
    await dh.unlock();
  });

  test("v6.16: + Add while staged floats the widget over the deck — stage stays", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.click(".w-timer .wFocus");        // timer fills the board
    await page.click("#dockTog");                // unfold the staged dock
    await dh.addW("addWatchBtn");
    ok(await page.evaluate(() =>
      document.querySelectorAll(".widget.wFull").length) === 1,
      "+ Add collapsed the stage");              // v6.16: focus RETAINED
    const visible = await page.evaluate(() => {
      const b = document.querySelector(".w-stopwatch").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !!el.closest(".w-stopwatch") : false;
    });
    ok(visible, "new widget born buried");       // the v6.9 bug stays dead
    // the sketch pad — "demonstrate next to the slides" — gets a tall panel
    await dh.addW("addDrawBtn");
    const sk = await page.evaluate(() => {
      const b = document.querySelector(".w-draw").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + 40);
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "draw");
      return { over: el ? !!el.closest(".w-draw") : false,
               tall: cw.h > 70, staged: document.querySelectorAll(".widget.wFull").length };
    });
    ok(sk.over && sk.tall && sk.staged === 1,
      "sketch not a floating panel: " + JSON.stringify(sk));
    await page.keyboard.press("Escape");         // exit: both stay in the scene
    await page.click(".w-draw .wClose");
    await page.click(".w-stopwatch .wClose");
  });

  test("v6.16: three staged adds land on DISTINCT spots (no coincident pile in config)", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#clockWidget .wFocus");
    await page.click("#dockTog");
    await dh.addW("addWatchBtn");
    await dh.addW("addTallyBtn");
    await dh.addW("addScoreBtn");                // all three share the 27×46 default
    const spots = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets
        .filter(w => ["stopwatch", "tally", "score"].indexOf(w.type) !== -1)
        .map(w => w.x + "," + w.y));
    ok(spots.length === 3 && new Set(spots).size === 3,
      "staged adds coincided: " + JSON.stringify(spots));
    await page.keyboard.press("Escape");
    await page.click(".w-score .wClose");
    await page.click(".w-tally .wClose");
    await page.click(".w-stopwatch .wClose");
  });

  test("v6.16: floats EXPIRE on stage exit — a staged add never occludes the next lesson", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#clockWidget .wFocus");
    await page.click("#dockTog");
    await dh.addW("addWatchBtn");                // floats over this stage…
    const during = await page.evaluate(() => {
      const b = document.querySelector(".w-stopwatch").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !!el.closest(".w-stopwatch") : false;
    });
    ok(during, "staged add not floating during its own stage");
    await page.keyboard.press("Escape");         // …but dies with it
    await page.click("#clockWidget .wFocus");    // the NEXT lesson
    const after = await page.evaluate(() => {
      const w = document.querySelector(".w-stopwatch");
      const b = w.getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return { over: el ? !!el.closest(".w-stopwatch") : false,
               float: w._entry.float,
               pin: w._entry.cfg.pin };
    });
    ok(!after.over && !after.float && !after.pin,
      "float outlived its stage: " + JSON.stringify(after));
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.querySelector(".w-stopwatch .wClose").click());   // v7.8: under the full-board clock
  });

  test("v6.16: keyboard-flow timer (add → type → Enter, no touch) gets the full ghost grace", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.evaluate(() => window.Deckhand.ghostFuseMs(1500));
    // v6.29: the default board has no timer — the staged add IS the only one
    await page.click("#clockWidget .wFocus");
    await page.click("#dockTog");
    await dh.addW("addTimerBtn");                // selected, floating, NEVER pointer-touched
    await page.evaluate(() => {                  // Enter must reach the entry, not a button
      if (document.activeElement) document.activeElement.blur();
    });
    await page.keyboard.press("2");
    await page.keyboard.press("0");
    await page.keyboard.press("Enter");          // 20s, running — old bug: ghost in ~0.7s
    await page.waitForTimeout(800);              // one ghostSync tick, still inside the fuse
    ok(await page.evaluate(() =>
      !document.querySelector(".w-timer").classList.contains("wGhost")),
      "keyboard-started timer ghosted inside the grace window");
    // …and once truly idle, it DOES ghost
    await expect(page.locator(".w-timer")).toHaveClass(/wGhost/, { timeout: 5000 });
    await page.keyboard.press("Escape");
    await page.keyboard.press("r");              // stop it
    await page.click(".w-timer .wClose");
  });
});

test.describe("noise game", () => {
  test("noise game: streak climbs when quiet, strike after sustained noise, record sticks", async ({ dh }) => {
    // its own browser: autoplay must be allowed for the oscillator "classroom"
    const b3 = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
    const errs = [];
    try {
      const p3 = await b3.newPage({ viewport: { width: 1920, height: 1080 } });
      p3.on("pageerror", e => errs.push("pageerror: " + String(e)));
      p3.on("console", m => {
        if (m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|ERR_CONNECTION|net::/.test(m.text()))
          errs.push("console: " + m.text());
      });
      await p3.goto(dh.url + "#t=2026-09-08T10:30");   // 2nd period owns this round
      await p3.waitForSelector("#launchBtn", { state: "attached" });
      await p3.waitForTimeout(350);
      await launch(p3);
      await p3.click("#addBtn");
      await p3.click("#addMeterBtn");
      // a controllable oscillator plays the part of the classroom
      await p3.evaluate(() => {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        gain.gain.value = 0.0004;                   // library-quiet
        const dest = ac.createMediaStreamDestination();
        osc.connect(gain); gain.connect(dest);
        osc.start();
        window.__gain = gain;
        navigator.mediaDevices.getUserMedia = () => Promise.resolve(dest.stream);
      });
      await p3.click(".w-meter .mtBtn");
      await expect(p3.locator(".mtStreak")).not.toHaveText("0:00", { timeout: 5000 });
      const quiet = await p3.evaluate(() => ({
        streak: document.querySelector(".mtStreak").textContent,
        lab: document.querySelector(".mtStreakLab").textContent,
        strikes: document.querySelector(".mtStrikes").textContent.trim()
      }));
      ok(quiet.streak !== "0:00", "streak never started: " + JSON.stringify(quiet));
      ok(quiet.lab === "Quiet streak — 2nd", "period label: " + quiet.lab);
      ok(quiet.strikes === "", "phantom strike: " + quiet.strikes);
      // the class gets loud: 2s of grace, then a strike and a dead streak
      await p3.evaluate(() => { window.__gain.gain.value = 0.5; });
      await expect(p3.locator(".mtStrikes")).toHaveText("✖", { timeout: 8000 });
      const loud = await p3.evaluate(() => ({
        streak: document.querySelector(".mtStreak").textContent,
        strikes: document.querySelector(".mtStrikes").textContent.trim(),
        tooLoud: document.querySelector(".w-meter").classList.contains("tooLoud")
      }));
      ok(loud.strikes === "✖", 'strike count: "' + loud.strikes + '"');
      ok(loud.streak === "0:00", "streak survived the strike: " + loud.streak);
      ok(loud.tooLoud, "no TOO LOUD state");
      // quiet returns: the streak restarts and the record was banked
      await p3.evaluate(() => { window.__gain.gain.value = 0.0004; });
      await expect(p3.locator(".mtStreak")).not.toHaveText("0:00", { timeout: 6000 });
      const again = await p3.evaluate(() => {
        const ws = window.Deckhand.config.scenes[0].widgets;
        return {
          streak: document.querySelector(".mtStreak").textContent,
          rec: ws[ws.length - 1].records,
          recLine: document.querySelector(".mtRecord").textContent
        };
      });
      ok(again.streak !== "0:00", "streak did not restart: " + again.streak);
      ok((again.rec["2nd"] || 0) >= 1, "record not banked: " + JSON.stringify(again.rec));
      ok(again.recLine.indexOf("held by 2nd") !== -1, "record line: " + again.recLine);
      // R starts a fresh round: strikes gone, record stays
      await p3.keyboard.press("r");
      const reset = await p3.evaluate(() => ({
        strikes: document.querySelector(".mtStrikes").textContent.trim(),
        recLine: document.querySelector(".mtRecord").textContent
      }));
      ok(reset.strikes === "", "R did not clear strikes");
      ok(reset.recLine.indexOf("held by 2nd") !== -1, "R erased the record");
    } finally {
      await b3.close();
    }
    ok(errs.length === 0, "JS errors in the noise browser:\n" + errs.join("\n"));
  });
});

test.describe("canvas", () => {
  test("canvas: widget cap at 12 — dock disables, config never exceeds it", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    for (let i = 0; i < 14; i++){
      if (await page.locator("#addTimerBtn").isDisabled()) break;
      await dh.addW("addTimerBtn");
    }
    const n = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.length);
    ok(n === 12, "cap breached: " + n);
    ok(await page.locator("#addTimerBtn").isDisabled(), "add still enabled at cap");
    ok(await page.locator("#addWatchBtn").isDisabled(), "watch add enabled at cap");
  });

  test("canvas: close-and-re-add never duplicates auto labels", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addTimerBtn");          // "Timer 2"
    await page.locator(".w-timer").first().locator(".wClose").click();  // drop "Timer"
    await dh.addW("addTimerBtn");          // must reuse "Timer", not mint "Timer 2"
    const labels = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.filter(w => w.type === "timer").map(w => w.label));
    ok(new Set(labels).size === labels.length, "dup labels: " + labels.join("|"));
    ok(labels.indexOf("Timer") !== -1, "freed name not reused: " + labels.join("|"));
  });

  test("canvas: narrow stacked layout never edits stored coordinates", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.setViewportSize({ width: 700, height: 900 });
    // the stacked layout has applied once the strip's box reflects the narrow canvas
    await expect.poll(async () => (await page.locator(".w-timer .strip").boundingBox()).width).toBeLessThan(700);
    const before = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    const sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + 40, sb.y + 160, { steps: 5 });
    await page.mouse.up();
    const after = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    await page.setViewportSize({ width: 1920, height: 1080 });
    ok(before === after, "stacked drag wrote coords");
  });
});
