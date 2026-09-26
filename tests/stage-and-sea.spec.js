/* Stage mode (v6.14–v6.17), the sea (v6.18) and waterline motion / clicker
 * refocus (v6.22). Ported from test_deckhand_v6.js lines 2968–3505.
 *
 * Ghost timing: the app's ghostSync ticks every 700ms and the fuse is
 * shrunk with Deckhand.ghostFuseMs(1500); we poll for .wGhost presence
 * instead of sleeping, and sleep only for NEGATIVE asserts ("did not
 * ghost after the fuse"), which need the wall clock to pass.
 */
const { test, expect, ok } = require("./helpers");
const fs = require("fs");
const path = require("path");

// @playwright/test 1.56 has no `reducedMotion` fixture option: the value in
// playwright.config.js `use` is silently dropped, so the main page boots
// WITHOUT reduced motion. These tests assert on final geometry and on the
// reduce-motion device path (v6.18/v6.22), so opt the context in explicitly.
test.use({ contextOptions: { reducedMotion: "reduce" } });

test.describe("v6.14 stage mode", () => {
  test("v6.14 stage mode: focus hides the header, survives Home, Exit restores", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    const before = await page.evaluate(() =>
      document.querySelector(".w-timer").getBoundingClientRect().width);
    await page.click(".w-timer .wFocus");
    const staged = await page.evaluate(() => ({
      mode: document.body.classList.contains("focusMode"),
      header: getComputedStyle(document.querySelector("header")).display,
      width: document.querySelector(".w-timer").getBoundingClientRect().width,
      top: document.querySelector(".w-timer").getBoundingClientRect().top,
      barBtns: document.querySelectorAll("#focusBar button").length,
      barHidden: document.getElementById("focusBar").hidden
    }));
    ok(staged.mode && staged.header === "none", "header still up: " + JSON.stringify(staged));
    ok(staged.width > before * 2 && staged.top < 20,
      "deck did not take the screen: " + JSON.stringify(staged));
    ok(staged.barBtns === 3 && !staged.barHidden, "focus bar incomplete");   // Timer · Draw (v7.2) · Exit
    // Home mid-focus: the landing gets its header back…
    await page.keyboard.press("Escape");         // …but first: Esc fully restores
    const restored = await page.evaluate(() => ({
      mode: document.body.classList.contains("focusMode"),
      header: getComputedStyle(document.querySelector("header")).display
    }));
    ok(!restored.mode && restored.header !== "none", "stage never struck: "
      + JSON.stringify(restored));
    await page.click(".w-timer .wFocus");        // re-focus, then go Home
    await page.keyboard.press("h");
    ok(await page.evaluate(() =>
      getComputedStyle(document.querySelector("header")).display) !== "none",
      "landing lost its header to stage mode");
    await dh.launch();                           // back to the board: still staged
    ok(await page.evaluate(() =>
      getComputedStyle(document.querySelector("header")).display) === "none",
      "stage dropped across Home/launch");
    await page.keyboard.press("Escape");
  });

  test("v6.14 summon: one tap floats a timer over the deck — locked too, never dirties", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();                         // v6.29: no default timer
    await page.click("#clockWidget .wFocus");    // the clock stands in for a deck
    await page.click("#dockTog");                // v6.15: unfold the staged dock
    const cfgSnap = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config));   // the summon-purity baseline
    await page.click("#lockBtn");                // locked: summon must still work
    await dh.summonCard();
    const m = await page.evaluate(() => {
      const t = document.querySelector(".w-timer").getBoundingClientRect();
      const el = document.elementFromPoint(t.x + t.width / 2, t.y + t.height / 2);
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      return { over: el ? !!el.closest(".w-timer") : false,
               stillFocused: document.querySelectorAll(".widget.wFull").length,
               pin: cw.pin };
    });
    ok(m.over, "summoned timer not over the deck");
    ok(m.stillFocused === 1, "summon collapsed focus");
    ok(m.pin === false, "summon set pin in config");
    // the board-sized timer got a compact STAGE box over the deck…
    const boxed = await page.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const t = document.querySelector(".w-timer").getBoundingClientRect();
      return t.width < c.width * 0.4 && t.height < c.height * 0.55;
    });
    ok(boxed, "summoned timer still blankets the deck");
    await dh.unlock();
    // lock+unlock round-tripped the config — if summon touched NOTHING
    // else, it is byte-identical (float is session-only by design;
    // v6.29: the dirty flag itself is spent by addTimer, so compare JSON)
    ok(await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config)) === cfgSnap,
      "summon dirtied the config");
    await page.keyboard.press("Escape");
    // …and Exit restores its saved box exactly
    const restoredBox = await page.evaluate(() => {
      const c = document.getElementById("canvas").getBoundingClientRect();
      const t = document.querySelector(".w-timer").getBoundingClientRect();
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer");
      return Math.abs(t.width / c.width * 100 - cw.w) < 1.5;
    });
    ok(restoredBox, "stage box leaked past Exit");
    // a mere TAP on the summoned timer (strip, pin) must never adopt the
    // stage box into config — only a real drag does
    await page.click("#clockWidget .wFocus");
    await dh.summonCard();
    const cfgBefore = await page.evaluate(() => JSON.stringify(
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer")));
    await page.locator(".w-timer .wLabel").click();          // raise-tap
    await page.click(".w-timer .wPin");                      // pin toggle
    await page.click(".w-timer .wPin");                      // …and back
    const cfgAfter = await page.evaluate(() => JSON.stringify(
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer")));
    ok(cfgBefore === cfgAfter, "a tap adopted the stage box: " + cfgAfter);
    await page.keyboard.press("Escape");
    // no timer at all: summon CREATES one, floating, focus kept
    await page.click(".w-timer .wClose");
    await page.click("#clockWidget .wFocus");
    const beforeN = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.length);
    await dh.summonCard();
    const created = await page.evaluate(() => {
      const t = document.querySelector(".w-timer");
      const r = t.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { n: window.Deckhand.config.scenes[0].widgets.length,
               over: el ? !!el.closest(".w-timer") : false,
               focused: document.querySelectorAll(".widget.wFull").length };
    });
    ok(created.n === beforeN + 1, "no timer created");
    ok(created.over && created.focused === 1,
      "created timer buried or focus lost: " + JSON.stringify(created));
    await page.keyboard.press("Escape");
  });
});

test.describe("v6.15 stage dock + ghost timer", () => {
  test("v6.15: dock folds in stage (it sat on the Slides arrows), ghost timer, long-press safe", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    const timer = page.locator(".w-timer");
    // stage auto-collapses the dock to its chevron handle…
    await page.click("#clockWidget .wFocus");
    const folded = await page.evaluate(() => ({
      min: document.body.classList.contains("dockMin"),
      addHidden: getComputedStyle(document.getElementById("addWrap")).display === "none",
      dockW: document.getElementById("dock").getBoundingClientRect().width
    }));
    ok(folded.min && folded.addHidden && folded.dockW < 90,
      "dock did not fold: " + JSON.stringify(folded));
    // …the handle re-expands it mid-stage…
    await page.click("#dockTog");
    ok(await page.evaluate(() =>
      !document.body.classList.contains("dockMin")), "handle did not expand");
    await page.click("#dockTog");                // fold it back
    // ghost: summon, start — the card melts to wheel + digits
    await page.evaluate(() => window.Deckhand.ghostFuseMs(1500));  // 8s in class
    await dh.summonCard();
    await page.click(".w-timer .tStart");
    await expect(timer).toHaveClass(/wGhost/);   // fuse (1.5s) + a sync tick
    const ghost = await page.evaluate(() => {
      const w = document.querySelector(".w-timer");
      return { ghost: w.classList.contains("wGhost"),
               strip: getComputedStyle(w.querySelector(".strip")).display,
               bg: getComputedStyle(w).backgroundColor,
               digits: getComputedStyle(w.querySelector(".visDigits, .tDisplay")).display };
    });
    ok(ghost.ghost && ghost.strip === "none" &&
       (ghost.bg === "rgba(0, 0, 0, 0)" || ghost.bg === "transparent") &&
       ghost.digits !== "none",
      "no ghost: " + JSON.stringify(ghost));
    // a tap lifts the ghost (controls back)…
    await page.click(".w-timer");
    ok(await page.evaluate(() =>
      !document.querySelector(".w-timer").classList.contains("wGhost")),
      "tap did not lift the ghost");
    // …idle re-ghosts while still running…
    await expect(timer).toHaveClass(/wGhost/);
    // …and pausing keeps the card (a paused timer needs its controls)
    await page.click(".w-timer");                // lift
    await page.click(".w-timer .tStart");        // pause
    await page.waitForTimeout(2400);             // past the fuse + a sync tick: must NOT re-ghost
    ok(await page.evaluate(() =>
      !document.querySelector(".w-timer").classList.contains("wGhost")),
      "paused timer ghosted");
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() =>
      !document.body.classList.contains("dockMin")), "dock still folded after Exit");
    await page.keyboard.press("r");              // reset the timer
    // long-press: context menu suppressed on controls, kept on text fields
    const cm = await page.evaluate(() => {
      const fire = el => {
        const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
        el.dispatchEvent(ev);
        return ev.defaultPrevented;
      };
      const onLock = fire(document.getElementById("lockBtn"));
      const inp = document.createElement("input");
      document.body.appendChild(inp);
      const onInput = fire(inp);
      inp.remove();
      return { onLock, onInput };
    });
    ok(cm.onLock === true, "long-press callout not suppressed on Lock");
    ok(cm.onInput === false, "paste menu killed on text fields");
    ok(await page.evaluate(() =>
      getComputedStyle(document.getElementById("lockBtn")).userSelect) === "none",
      "Lock button selectable");
    // a stray Escape must not unfold a deliberately folded dock
    await page.click("#dockTog");                // fold, un-staged
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() =>
      document.body.classList.contains("dockMin")), "Escape unfolded the dock");
    await page.click("#dockTog");
    // a slow drag (>2s) must never re-ghost the chrome under the finger
    await page.click("#clockWidget .wFocus");
    await dh.summonCard();
    await page.click(".w-timer .tStart");
    await expect(timer).toHaveClass(/wGhost/);   // ghosted
    await page.click(".w-timer");                // lift
    const sb2 = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb2.x + 40, sb2.y + sb2.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb2.x - 60, sb2.y - 40, { steps: 3 });
    await page.waitForTimeout(2600);             // hold mid-drag past the idle window
    const midDrag2 = await page.evaluate(() => ({
      ghost: document.querySelector(".w-timer").classList.contains("wGhost"),
      dragging: document.querySelector(".w-timer").classList.contains("dragging")
    }));
    await page.mouse.up();
    ok(midDrag2.dragging && !midDrag2.ghost,
      "chrome dissolved mid-drag: " + JSON.stringify(midDrag2));
    ok(await page.evaluate(() =>
      !document.querySelector(".w-timer").classList.contains("wGhost")),
      "just-dropped timer re-ghosted instantly");
    await page.keyboard.press(" ");              // pause the running timer
    await page.keyboard.press("r");
    await page.keyboard.press("Escape");
  });
});

test.describe("v6.17 preset menu", () => {
  test("v6.17: preset pick births a GHOST — running wheel, no card, locked, never dirties", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();                         // v6.29: no default timer
    await page.click("#clockWidget .wFocus");
    await page.click("#dockTog");
    const cfgSnap17 = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config));
    await page.click("#lockBtn");                // locked: presets must still work
    await page.click("#focusTimerBtn");
    const menu = await page.evaluate(() => ({
      open: !document.getElementById("focusTimerMenu").hidden,
      presets: document.querySelectorAll("#focusTimerMenu [data-min]").length,
      custom: !!document.querySelector("#focusTimerMenu [data-custom]")
    }));
    ok(menu.open && menu.presets >= 3 && menu.custom,
      "preset menu wrong: " + JSON.stringify(menu));
    await page.click('#focusTimerMenu [data-min="5"]');
    // the card must NEVER appear: ghosted from the first painted frame
    const born = await page.evaluate(() => {
      const w = document.querySelector(".w-timer");
      return { ghost: w.classList.contains("wGhost"),
               running: w._entry.api.running(),
               strip: getComputedStyle(w.querySelector(".strip")).display,
               staged: document.querySelectorAll(".widget.wFull").length,
               menuClosed: document.getElementById("focusTimerMenu").hidden };
    });
    ok(born.ghost && born.running && born.strip === "none" &&
       born.staged === 1 && born.menuClosed,
      "not born a ghost: " + JSON.stringify(born));
    // …and it survives the next ghostSync tick (the interval must agree)
    await page.waitForTimeout(900);              // one 700ms sync tick must pass
    ok(await page.evaluate(() =>
      document.querySelector(".w-timer").classList.contains("wGhost")),
      "ghostSync lifted the born ghost");
    // a tap still lifts it — pause/reset live there when needed
    await page.click(".w-timer");
    ok(await page.evaluate(() => {
      const w = document.querySelector(".w-timer");
      return !w.classList.contains("wGhost") &&
             getComputedStyle(w.querySelector(".strip")).display !== "none";
    }), "tap did not bring the controls back");
    await dh.unlock();
    ok(await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config)) === cfgSnap17,
      "a locked preset pick dirtied the config");
    await page.keyboard.press("Escape");
    await page.keyboard.press(" ");              // pause
    await page.keyboard.press("r");
  });

  test('v6.17: "Until bell" preset — ghost timer set to the period remainder', async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:30");      // mid 2nd period
    await dh.launch();
    await page.click("#clockWidget .wFocus");
    await page.click("#focusTimerBtn");
    ok(await page.evaluate(() =>
      !!document.querySelector("#focusTimerMenu [data-bell]")),
      "no Until bell option during a period");
    await page.click("#focusTimerMenu [data-bell]");
    const b = await page.evaluate(() => {
      const w = document.querySelector(".w-timer");
      return { ghost: w.classList.contains("wGhost"),
               running: w._entry.api.running() };
    });
    ok(b.ghost && b.running, "bell pick not ghost-running: " + JSON.stringify(b));
    await page.keyboard.press("Escape");
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
  });

  test("v6.17: Escape peels one layer — menu first, the stage only on the next press", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#clockWidget .wFocus");
    await page.click("#focusTimerBtn");
    await page.keyboard.press("Escape");
    const first = await page.evaluate(() => ({
      menu: document.getElementById("focusTimerMenu").hidden,
      staged: document.querySelectorAll(".widget.wFull").length
    }));
    ok(first.menu && first.staged === 1,
      "first Escape hit the wrong layer: " + JSON.stringify(first));
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() =>
      document.querySelectorAll(".widget.wFull").length) === 0,
      "second Escape did not exit the stage");
  });

  test("v6.17 fix: clearing a stale alarm badge never kills a RESTARTED timer", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await page.evaluate(() => {
      window.Deckhand.alarmCalmMs(400);
      document.querySelector(".w-timer")._entry.api.startSeconds(1);
    });
    // rings (1s), then calms to the badge (400ms)
    await expect(page.locator("#alarm")).toHaveClass(/calm/);
    const calm = await page.evaluate(() => ({
      on: document.getElementById("alarm").classList.contains("on"),
      calm: document.getElementById("alarm").classList.contains("calm")
    }));
    ok(calm.on && calm.calm, "no calm badge to test against: " + JSON.stringify(calm));
    // the next activity: a fresh 2-minute run on the SAME timer
    await page.evaluate(() =>
      document.querySelector(".w-timer")._entry.api.startSeconds(120));
    await page.click("#alarm");                  // teacher clears the stale badge
    const after = await page.evaluate(() => ({
      on: document.getElementById("alarm").classList.contains("on"),
      running: document.querySelector(".w-timer")._entry.api.running()
    }));
    ok(!after.on, "badge did not dismiss");
    ok(after.running, "dismissing the stale badge reset the live run");
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
  });

  test("v6.17 fix: infeasible menu says why; custom lifts the ghost; drags round to 2dp", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    // locked + no timer in the scene (v6.29: default board ships timerless): pills disable and SAY why
    await page.click("#clockWidget .wFocus");
    await page.click("#dockTog");
    await page.click("#lockBtn");
    await page.click("#focusTimerBtn");
    const dead = await page.evaluate(() => {
      const m = document.getElementById("focusTimerMenu");
      const btns = [...m.querySelectorAll("button")];
      return { allOff: btns.length > 0 && btns.every(b => b.disabled),
               note: (m.querySelector(".menuLabel") || {}).textContent || "" };
    });
    ok(dead.allOff && /unlock/i.test(dead.note),
      "locked no-timer menu not explained: " + JSON.stringify(dead));
    await page.keyboard.press("Escape");         // menu only (stage stays)
    await dh.unlock();
    // preset → ghost running; "Type a time…" must yield a TYPABLE card NOW
    await page.click("#focusTimerBtn");
    await page.click('#focusTimerMenu [data-min="1"]');
    ok(await page.evaluate(() =>
      document.querySelector(".w-timer").classList.contains("wGhost")),
      "preset did not birth a ghost");
    await page.click("#focusTimerBtn");
    await page.click("#focusTimerMenu [data-custom]");
    const card = await page.evaluate(() => {
      const w = document.querySelector(".w-timer");
      return { ghost: w.classList.contains("wGhost"),
               running: w._entry.api.running() };
    });
    ok(!card.ghost && !card.running,
      "custom did not surface a typable card: " + JSON.stringify(card));
    await page.evaluate(() => {
      if (document.activeElement) document.activeElement.blur();
    });
    await page.keyboard.press("4");
    await page.keyboard.press("5");
    await page.keyboard.press("Enter");
    ok(await page.evaluate(() => {
      const a = document.querySelector(".w-timer")._entry.api;
      return a.running() && !a.entryActive();
    }), "typed time did not start");
    await page.keyboard.press("Escape");         // exit stage
    await page.keyboard.press(" ");
    await page.keyboard.press("r");
    // an ordinary board drag commits 2dp percentages, not 14-decimal floats
    const sb = await page.locator(".w-timer .strip").boundingBox();
    await page.mouse.move(sb.x + 30, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + 30 + 130, sb.y + sb.height / 2 + 90, { steps: 5 });
    await page.mouse.up();
    const cw = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === "timer"));
    const clean = v => Math.round(v * 100) / 100 === v;
    ok(clean(cw.x) && clean(cw.y) && clean(cw.w) && clean(cw.h),
      "drag wrote unrounded floats: " + JSON.stringify(cw));
  });
});

test.describe("v6.18 sea", () => {
  test("v6.18: boat sits IN the water; sea things play on demand and expire", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    const sea = await page.evaluate(() => {
      const wf = document.getElementById("wv1");            // v7.5: the front swell layer
      const wv = document.getElementById("waves");
      const wfr = wf.getBoundingClientRect(), wvr = wv.getBoundingClientRect();
      const boat = document.getElementById("boat").getBoundingClientRect();
      return {
        /* v7.5: the front swell is a 160vw layer that scrolls; it must always cover the band */
        aligned: wfr.left <= wvr.left && wfr.right >= wvr.right &&
                 Math.abs(wfr.bottom - wvr.bottom) < 6,
        pe: getComputedStyle(wf).pointerEvents,
        boatDepth: boat.bottom - wvr.top,        // hull well into the wave band
        things: ["serpent", "fish", "buoy", "whale"].every(n =>
          !!document.getElementById("sea-" + n))
      };
    });
    ok(sea.aligned, "front wave misaligned: " + JSON.stringify(sea));
    ok(sea.pe === "none", "front wave intercepts pointer events");
    ok(sea.boatDepth > 60, "boat still rides the sand: " + JSON.stringify(sea));
    ok(sea.things, "sea things missing");
    // play-by-name: shows, refuses a replay while live, expires on time
    ok(await page.evaluate(() => {
      window.Deckhand.sea("fish");
      window.Deckhand.sea("fish");               // double-tap: one show only
      return document.getElementById("sea-fish").classList.contains("go");
    }), "fish did not play");
    // the skipper runs 5.6s, then expires
    await expect(page.locator("#sea-fish")).not.toHaveClass(/go/, { timeout: 8000 });
    // under reduced motion the SCHEDULER stays quiet even at test cadence
    await page.evaluate(() => window.Deckhand.seaEvery(60));
    await page.waitForTimeout(500);              // several 60ms ticks: nothing may play
    ok(await page.evaluate(() =>
      ![...document.querySelectorAll(".seaThing")].some(el =>
        el.classList.contains("go"))),
      "the sea plays under reduced motion");
    // shrinking to a phone-sized window ends a live show the same way
    await page.evaluate(() => window.Deckhand.sea("buoy"));
    await page.setViewportSize({ width: 700, height: 500 });
    await expect(page.locator("#sea-buoy")).not.toHaveClass(/go/);
    await page.setViewportSize({ width: 1920, height: 1080 });
    // v6.19/7.5: tapping the BOAT summons a show — the boat hops at once; with motion on and the sea
    // free, one act from the summon pool starts; a second tap while it plays is refused
    await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });
    await page.click("#boat", { force: true });
    await expect(page.locator("#boat")).toHaveClass(/hop/);
    const first = await page.evaluate(() => window.Deckhand.seaModule.lastStaged());
    ok(first && first.act, "boat tap summoned nothing");
    await page.waitForTimeout(300);
    await page.click("#boat", { force: true });                   // the sea is busy: no double bill
    const second = await page.evaluate(() => window.Deckhand.seaModule.lastStaged());
    ok(second.at === first.at, "a second tap started another show");
  });
});

test.describe("v6.22 waterline motion + clicker refocus", () => {
  test('v6.22: "Always on" waterline motion beats a reduce-motion device', async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    // Auto on a reduced device (this suite page): still water, as before
    ok(await page.evaluate(() =>
      !document.body.classList.contains("waveMotion")),
      "Auto ignored the device flag");
    await page.click("#setBtn");
    ok(await page.evaluate(() =>
      !document.getElementById("sMotionHint").hidden),
      "no hint about the device asking for reduced motion");
    await page.selectOption("#sMotion", "on");
    await page.click("#applyBtn");
    const on = await page.evaluate(() => ({
      cls: document.body.classList.contains("waveMotion"),
      cfg: window.Deckhand.config.ui.motion,
      boat: getComputedStyle(document.getElementById("boat")).animationName
    }));
    ok(on.cls && on.cfg === "on", "override not applied: " + JSON.stringify(on));
    ok(on.boat.includes("boatDrift"),
      "boat still frozen with motion forced on: " + on.boat);
    // v7.0: "dirty" now means "differs from the last autosave" — a real
    // edit is proven by flushing and reading the device copy back
    await dh.flush();
    ok((await dh.stored()).cfg.ui.motion === "on",
      "motion change did not reach the device copy");
    await page.keyboard.press("Escape");         // close settings
    // …and the SEA wakes up on this reduced device too
    await page.evaluate(() => window.Deckhand.seaEvery(60));
    await expect.poll(() => page.evaluate(() =>
      [...document.querySelectorAll(".seaThing")].some(el =>
        el.classList.contains("go"))), { message: "sea still asleep with motion forced on" })
      .toBe(true);
  });

  test("v6.22: stage hands the keyboard to the deck — the USB clicker drives the slides", async ({ page, dh }) => {
    const deckPath = path.join(dh.fixtureDir, "tmp_clicker_deck.html");
    fs.writeFileSync(deckPath,
      "<!DOCTYPE html><title>ClickerDeck</title><body><h1>DECK</h1>");
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addEmbedBtn");
    const target = "file://" + deckPath;
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn");
      inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector(".w-embed .embFrame").src = u;
    }, target);
    await expect(page.frameLocator(".w-embed .embFrame").locator("h1")).toHaveText("DECK");
    await page.click(".w-embed .wFocus");        // stage: keys go to the deck
    const focused = () => page.evaluate(() =>
      !!document.activeElement &&
      document.activeElement.classList.contains("embFrame"));
    ok(await focused(), "stage entry left the keyboard on the board");
    // the "keys are in the slides" nag stays hidden mid-stage
    ok(await page.evaluate(() =>
      getComputedStyle(document.querySelector(".w-embed .embKeys"))
        .display === "none"),
      "keys pill nags mid-stage");
    // a ghost-timer summon interrupts — and hands the keys straight back
    await page.click("#focusTimerBtn");
    await page.click('#focusTimerMenu [data-min="1"]');
    ok(await focused(), "summon kept the keyboard");
    // the dock chevron round trip too
    await page.click("#dockTog");                // unfold (focus to chevron)
    await page.click("#dockTog");                // fold → keys back to the deck
    ok(await focused(), "dock fold kept the keyboard");
    // an alarm rings through the deck; dismissing it returns the keys
    await page.evaluate(() =>
      document.querySelector(".w-timer")._entry.api.startSeconds(1));
    await expect(page.locator("#alarm")).toHaveClass(/\bon\b/);   // 1s ring
    await page.click("#alarm");
    ok(await focused(), "alarm dismiss kept the keyboard");
    await page.click("#unfocusBtn");             // Escape would die in the iframe
    ok(await page.evaluate(() =>
      document.querySelectorAll(".widget.wFull").length) === 0,
      "Exit pill did not exit");
  });
});
