/* Settle-in routine, tick swell, lofi tape, Slides/YouTube embeds, the
 * YouTube library, and the sea's motion. Ported from test_deckhand_v6.js
 * (v6.18 – v6.33 tests) onto @playwright/test; every test boots its own
 * page. Fixed sleeps survive only where the assertion is NEGATIVE ("the
 * clock did NOT start", "the sea stayed quiet") — nothing else can prove
 * that time passed with nothing happening.
 */
const { test, expect, ok, launch } = require("./helpers");
const fs = require("fs");
const path = require("path");

/* The yt card frames real youtube-nocookie.com players. None of these
 * tests read the player — only the iframe's src attribute and the config —
 * so the embed is served locally: 39 library picks in a row stay fast and
 * the run never depends on the network. */
const stubYouTube = async page => {
  await page.route(/youtube-nocookie\.com/, r => r.fulfill({
    status: 200, contentType: "text/html", body: "<!doctype html><title>yt stub</title>"
  }));
};

/* v7.7: the settle-in is a MOMENT OF THE CLOCK — no card, no ✎ row, no Start
 * chip. Its state is window.Deckhand.settle; its settings are
 * config.bell.settle (Settings → Bells); the clock card (#clockWidget) is
 * .stLive while the count / spell / flag has it, and .wFull when the bell
 * staged it. */
const settle = page => ({
  running: () => page.evaluate(() => window.Deckhand.settle.running()),
  live: () => page.evaluate(() => window.Deckhand.settle.live()),
  start: () => page.evaluate(() => window.Deckhand.settle.start()),
  reset: () => page.evaluate(() => window.Deckhand.settle.reset()),
  doneMs: ms => page.evaluate(ms => window.Deckhand.settle._doneMs(ms), ms),
  seconds: n => page.evaluate(n => { window.Deckhand.config.bell.settle.seconds = n; }, n),
  big: () => page.locator("#clockSettle .stBig"),
  top: () => page.locator("#clockSettle .stTop"),
  sub: () => page.locator("#clockSettle .stSub")
});

test.describe("settle-in routine", () => {

  test("v6.23 → v7.7 settle-in: armed it is just the clock; a re-pick never fires it; Settings → Bells edits it; the count runs and the face comes back", async ({ page, dh }) => {
    const st = settle(page);
    await dh.openAt("#t=2026-09-08T10:30");       // mid 2nd period: must NOT autostart
    await dh.launch();
    await page.waitForTimeout(600);                // a few bell-watch ticks (negative check)
    const armed = await page.evaluate(() => ({
      live: window.Deckhand.settle.live(),
      running: window.Deckhand.settle.running(),
      stLive: document.getElementById("clockWidget").classList.contains("stLive"),
      face: getComputedStyle(document.getElementById("clockFace")).display,
      stage: getComputedStyle(document.getElementById("clockSettle")).display,
      big: document.querySelector("#clockSettle .stBig").textContent
    }));
    ok(!armed.live && !armed.running && !armed.stLive && armed.face !== "none" && armed.stage === "none" && armed.big === "",
      "armed, the clock should be just the clock: " + JSON.stringify(armed));
    // a WEEK RE-PICK mid-period flips the label with no bell — never fire
    await page.evaluate(() => {
      const cur = window.Deckhand.activeIndex;
      window.Deckhand.setSchedule(cur === 0 ? 1 : 0);
    });
    await page.waitForTimeout(800);                // bell-watch ticks at 250ms (negative check)
    ok(!(await st.running()), "a schedule re-pick started the settle clock");
    await page.evaluate(() => window.Deckhand.setSchedule(-1));  // No bells…
    await page.waitForTimeout(600);                // let the watch SEE No bells
    await page.evaluate(() => window.Deckhand.setSchedule(0));   // …and back
    await page.waitForTimeout(800);                // (negative check)
    ok(!(await st.running()), "No-bells → bells-back fired the clock");
    // Settings → Bells: 5 seconds and a custom message, committed into config
    await page.click("#setBtn");
    await dh.tab("bells");
    await page.fill("#sStSecs", "5");
    await page.fill("#sStMsg", "Cards out if standing");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toHaveText("Applied.");
    const cw = await page.evaluate(() => window.Deckhand.config.bell.settle);
    ok(cw.seconds === 5 && cw.msgDone === "Cards out if standing" && cw.on === true,
      "edit did not commit: " + JSON.stringify(cw));
    // an EMPTIED seconds field is not a choice — Apply refuses it, the value stands
    await page.fill("#sStSecs", "");
    await page.click("#applyBtn");
    await expect(page.locator("#setErrors")).toContainText("Settle-in seconds");
    ok((await page.evaluate(() => window.Deckhand.config.bell.settle.seconds)) === 5, "blank seconds overwrote the value");
    await page.click("#closeBtn");
    // a run: the clock becomes the count, hits zero, shows the consequence, then is the clock again
    await st.doneMs(1200);
    await st.start();
    await expect(st.top()).toHaveText(/seat/i);
    const run = await page.evaluate(() => ({
      top: document.querySelector("#clockSettle .stTop").textContent,
      big: document.querySelector("#clockSettle .stBig").textContent,
      running: window.Deckhand.settle.running(),
      stLive: document.getElementById("clockWidget").classList.contains("stLive"),
      face: getComputedStyle(document.getElementById("clockFace")).display
    }));
    ok(run.running && run.stLive && run.face === "none" && /seat/i.test(run.top) && +run.big >= 1 && +run.big <= 5,
      "countdown wrong: " + JSON.stringify(run));
    // past zero → consequence up
    await expect(st.big()).toHaveText("Cards out if standing", { timeout: 10000 });
    // done spell ends → the face is back
    await expect(page.locator("#clockWidget")).not.toHaveClass(/stLive/, { timeout: 10000 });
    ok(!(await st.live()), "still live after the spell");
    // LOCKED: the routine is a play action — it runs; R stands it down
    await page.click("#lockBtn");
    await st.start();
    ok(await st.running(), "start dead while locked");
    await page.keyboard.press("r");
    ok(!(await st.live()), "R did not stand the moment down");
    await dh.unlock();
  });

  test("v6.23/24 settle-in: the BELL makes the CLOCK the count FULL SCREEN, then hands the stage to the slides", async ({ page, dh }) => {
    const st = settle(page);
    // 10s before 2nd period (10:16). The old suite booted at 10:15:56; a
    // 4s pre-bell window is eaten by a loaded CI box before the widget is
    // even configured, so the bell now has room — same sim moment, more air.
    await dh.openAt("#t=2026-09-08T10:15:50");
    await dh.launch();
    await dh.addW("addEmbedBtn");                  // the deck the routine hands to
    await st.seconds(3);                           // quick routine for the test
    await st.doneMs(700);
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    ok(!(await st.running()), "started before the bell");
    // the bell rings at 10:16:00
    await expect.poll(() => st.running(), { timeout: 15000 }).toBe(true);
    const auto = await page.evaluate(() => ({
      running: window.Deckhand.settle.running(),
      top: document.querySelector("#clockSettle .stTop").textContent,
      stagedClock: document.getElementById("clockWidget").classList.contains("wFull") &&
                   document.getElementById("clockWidget").classList.contains("stLive"),
      mode: document.body.classList.contains("focusMode")
    }));
    ok(auto.running && /seat/i.test(auto.top),
      "bell did not start the settle clock: " + JSON.stringify(auto));
    ok(auto.stagedClock && auto.mode,
      "bell start did not take the screen: " + JSON.stringify(auto));
    // 3s count + 0.7s spell → the slides own the stage; the clock is a clock again
    await expect(page.locator(".w-embed.wFull")).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator("#clockWidget")).not.toHaveClass(/stLive/);
    await page.click("#unfocusBtn");               // staged embed owns Escape
    ok(await page.evaluate(() =>
      !document.body.classList.contains("focusMode")), "Exit did not exit");
  });

  test("v6.24 hardening: bell beats a manual run, reclaims keys, restarts hand off, ghosts ride along", async ({ page, dh }) => {
    const st = settle(page);
    const deck = path.join(dh.fixtureDir, "tmp_clicker_deck.html");
    fs.writeFileSync(deck, "<!DOCTYPE html><title>ClickerDeck</title><body><h1>DECK</h1>");
    await dh.openAt("#t=2026-09-08T10:15:50");    // 10s before 2nd period (was :55 — see above)
    await dh.launch();
    await dh.addW("addEmbedBtn");
    const target = "file://" + deck;
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn");
      inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector(".w-embed .embFrame").src = u;
    }, target);
    await st.seconds(40);
    await st.doneMs(700);
    await st.start();                              // a run is already in flight pre-bell…
    await page.click("#unfocusBtn");               // (the clock came back to the front, over the deck's strip)
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());   // …while the DECK is staged
    ok(await page.evaluate(() =>
      document.activeElement &&
      document.activeElement.classList.contains("embFrame")),
      "precondition: deck should own the keys");
    // 10:16:00 — the bell
    await expect(page.locator("#clockWidget.wFull.stLive")).toHaveCount(1, { timeout: 15000 });
    const bell = await page.evaluate(() => ({
      staged: document.getElementById("clockWidget").classList.contains("wFull"),
      running: window.Deckhand.settle.running(),
      keysInFrame: document.activeElement &&
        document.activeElement.classList.contains("embFrame")
    }));
    ok(bell.staged && bell.running,
      "a pre-bell manual run suppressed the routine: " + JSON.stringify(bell));
    ok(!bell.keysInFrame, "takeover left the keyboard in the deck");
    // a ghost timer summoned OVER the count…
    await page.click("#focusTimerBtn");
    await page.click('#focusTimerMenu [data-min="1"]');
    // …and a MANUAL restart mid-routine (Space) must still hand off
    await page.mouse.click(200, 300);
    await st.seconds(2);
    await page.keyboard.press(" ");                // restart at 2s (Space while live = the routine's)
    // 2s + 0.7s spell → the slides own the stage
    await expect(page.locator(".w-embed.wFull")).toHaveCount(1, { timeout: 10000 });
    const after = await page.evaluate(() => {
      const tEl = document.querySelector(".w-timer");
      const b = tEl.getBoundingClientRect();
      const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return {
        embStaged: !!document.querySelector(".w-embed.wFull"),
        timerOver: hit ? !!hit.closest(".w-timer") : false,
        timerFloat: tEl._entry.float,
        timerRuns: tEl._entry.api.running()
      };
    });
    ok(after.embStaged,
      "manual restart stranded the stage: " + JSON.stringify(after));
    ok(after.timerRuns && after.timerFloat && after.timerOver,
      "ghost timer buried by the handoff: " + JSON.stringify(after));
    // ghostSync tick
    await expect(page.locator(".w-timer")).toHaveClass(/wGhost/, { timeout: 6000 });
    await page.click("#unfocusBtn");
    // R while the clock is the count: the stage stands DOWN and the face returns
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await st.start();
    await expect(page.locator("#clockWidget")).toHaveClass(/wFull/);
    await page.keyboard.press("r");                // …and stands the stage down
    ok(await page.evaluate(() =>
      !document.body.classList.contains("focusMode")),
      "R left the stage stuck on the clock");
    await expect(page.locator("#clockWidget")).not.toHaveClass(/stLive/);
  });

  test("v6.29/30: ticks swell to zero, one SOFT note lands, no lyrics anywhere", async ({ page, dh }) => {
    const st = settle(page);
    await dh.openAt("#t=2026-09-08T10:30");       // mid-period: no bell interference
    await dh.launch();
    // instrument the tick + both end-sounds (levels are the CALL args;
    // the audio itself is gated inside Sound)
    await page.evaluate(() => {
      window.__ticks = []; window.__soft = 0; window.__chime = 0;
      const S = window.Deckhand.sound;
      const oT = S.tick, oS = S.soft, oC = S.chime;
      S.tick = function (l) { window.__ticks.push(l); return oT(l); };
      S.soft = function () { window.__soft++; return oS(); };
      S.chime = function () { window.__chime++; return oC(); };
    });
    await st.seconds(8);
    await st.doneMs(1500);
    await st.start();
    await expect.poll(() => page.evaluate(() =>          // mid-count
      +document.querySelector("#clockSettle .stBig").textContent), { timeout: 8000 }).toBeLessThanOrEqual(4);
    // v6.30/31: no lyrics — the sub just says what the number IS
    const mid = await page.evaluate(() => ({
      big: document.querySelector("#clockSettle .stBig").textContent,
      sub: document.querySelector("#clockSettle .stSub").textContent
    }));
    ok(/^\d+$/.test(mid.big) && (mid.sub === "seconds" || (mid.big === "1" && mid.sub === "second")),
      "mid-count sub is not the units line: " + JSON.stringify(mid));
    // zero → the consequence spell
    await expect(st.top()).toHaveText(/time.s up/i, { timeout: 10000 });
    const done = await page.evaluate(() => ({
      top: document.querySelector("#clockSettle .stTop").textContent,
      soft: window.__soft, chime: window.__chime
    }));
    // v6.30: ONE pleasant note — the soft bell, never the 3-note chime
    ok(done.soft === 1 && done.chime === 0,
      "wrong end sound: " + JSON.stringify(done));
    // the swell: whisper at the top, a real knock near zero, halves between
    const ticks = await page.evaluate(() => window.__ticks);
    ok(ticks.length >= 10,
      "too few ticks for an 8s count with half-beats: " + ticks.length);
    ok(ticks[0] < 0.15, "first tick was not a whisper: " + ticks[0]);
    ok(Math.max.apply(null, ticks) > 0.6,
      "the swell never got loud: " + Math.max.apply(null, ticks));
    // after the spell the clock is the clock again — nothing written on the stage
    await expect(page.locator("#clockWidget")).not.toHaveClass(/stLive/, { timeout: 10000 });
    const rearmed = await page.evaluate(() => ({
      big: document.querySelector("#clockSettle .stBig").textContent,
      face: getComputedStyle(document.getElementById("clockFace")).display
    }));
    ok(rearmed.big === "" && rearmed.face !== "none",
      "spell did not hand the card back: " + JSON.stringify(rearmed));
  });

  test("v6.32: ticks hold their tongue until 10 remain, whatever the length", async ({ page, dh }) => {
    const st = settle(page);
    await dh.openAt("#t=2026-09-08T10:30");
    await dh.launch();
    await page.evaluate(() => {
      window.__ticks2 = [];
      const S = window.Deckhand.sound;
      const orig = S.tick;
      S.tick = function (l) { window.__ticks2.push(l); return orig(l); };
    });
    await st.seconds(14);
    await st.doneMs(700);
    await st.start();
    // (the count is polled as a NUMBER, not an exact second: a starved
    // runner can skip a repaint, and 14 → 12 must not fail the test)
    const rem = () => page.evaluate(() => +document.querySelector("#clockSettle .stBig").textContent);
    const snap = () => page.evaluate(() => ({
      rem: +document.querySelector("#clockSettle .stBig").textContent,
      n: window.__ticks2.length,
      max: window.__ticks2.length ? Math.max.apply(null, window.__ticks2) : -1,
      ticks: window.__ticks2.slice()
    }));
    await expect.poll(rem, { timeout: 6000 }).toBeLessThanOrEqual(13);   // ~1s in
    // a mid-run settings edit must not matter either — the window is on remS
    await st.seconds(300);
    await expect.poll(rem, { timeout: 6000 }).toBeLessThanOrEqual(11);   // remS 11: still SILENT
    const quiet = await snap();
    ok(quiet.rem <= 10 || quiet.n === 0,             // (a skip past 11 may legitimately have ticked)
      "ticked before 10 remained: " + JSON.stringify(quiet));
    await expect.poll(rem, { timeout: 6000 }).toBeLessThanOrEqual(9);    // remS 9: the window opened
    const m = await snap();
    ok(m.n >= 1 && m.n <= 4, "window entry miscounted: " + JSON.stringify(m));
    ok(m.max >= 0 && m.max < 0.3,
      "early-window ticks are not whispers: " + JSON.stringify(m));
    await st.reset();
  });
});

test.describe("music", () => {

  test("v6.25/26 music: the lofi tape plays, ducks under the alarm, works locked", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addTimer();
    await dh.addW("addMusicBtn");
    const st = () => page.evaluate(() => ({
      running: document.querySelector(".w-music")._entry.api.running(),
      what: document.querySelector(".muWhat").textContent,
      btn: document.querySelector(".muPlay").textContent,
      duck: document.querySelector(".w-music")._entry.api._duck()
    }));
    const duck = () => page.evaluate(() => document.querySelector(".w-music")._entry.api._duck());
    const level = () => page.evaluate(() => document.querySelector(".w-music")._entry.api._level());
    let s = await st();
    ok(!s.running && /lofi/i.test(s.what) && s.btn === "Play",
      "not idle on lofi at birth: " + JSON.stringify(s));
    await page.click(".w-music .muPlay");          // the gesture starts the tape
    await expect(page.locator(".w-music .muPlay")).toHaveText("Pause");
    s = await st();
    ok(s.running && s.btn === "Pause", "Play did not start: " + JSON.stringify(s));
    // volume persists into config (a real edit: it may dirty)
    await page.evaluate(() => {
      const v = document.querySelector(".muVol");
      v.value = 20; v.dispatchEvent(new Event("input"));
    });
    await expect.poll(() => page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === "music").volume))
      .toBeCloseTo(0.2, 2);
    // an alarm DUCKS the music hard, and dismissal restores it
    await page.evaluate(() =>
      document.querySelector(".w-timer")._entry.api.startSeconds(1));
    await expect(page.locator("#alarm")).toHaveClass(/on/, { timeout: 6000 });
    await expect.poll(duck, { timeout: 6000 }).toBeLessThan(0.4);
    await page.click("#alarm");
    await expect.poll(duck, { timeout: 6000 }).toBeGreaterThan(0.6);
    // locked: play/pause stays live (play action); Space toggles; R stops
    await page.click("#lockBtn");
    await page.click(".w-music .muPlay");          // pause while locked
    ok(await page.evaluate(() =>
      !document.querySelector(".w-music")._entry.api.running()),
      "Pause dead while locked");
    await page.click(".w-music .muPlay");          // and back on
    await dh.unlock();
    await page.keyboard.press(" ");                // widget is selected: toggle off
    ok(await page.evaluate(() =>
      !document.querySelector(".w-music")._entry.api.running()),
      "Space did not toggle");
    // pause means SILENCE: the master bus hushes fast, no 3s drum tail
    await expect.poll(level, { timeout: 6000 }).toBeLessThan(0.02);
    await page.click(".w-music .muPlay");          // and play restores the level
    await expect.poll(level, { timeout: 6000 }).toBeGreaterThan(0.1);
    await page.click(".w-music .muPlay");
    await page.click(".w-music .wClose");          // destroy closes the context
  });

  test("v7.3 music: ten named sides, Next › skips live and while locked, every side makes sound", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addMusicBtn");
    const what = () => page.locator(".w-music .muWhat").textContent();
    const running = () => page.evaluate(() => document.querySelector(".w-music")._entry.api.running());
    const level = () => page.evaluate(() => document.querySelector(".w-music")._entry.api._level());
    expect(await what()).toBe("Lofi — Porch swing");     // side A is the original tape
    // Next › before Play just turns the tape over: no context, no sound
    await page.click(".w-music .muNext");
    expect(await what()).toBe("Lofi — Rainy window");
    ok(!(await running()), "Next started playback");
    await page.click(".w-music .muPlay");
    await expect(page.locator(".w-music .muPlay")).toHaveText("Pause");
    await expect.poll(level, { timeout: 6000 }).toBeGreaterThan(0.1);
    // the first pass walks the sides in order; each keeps playing
    const seen = new Set(["Lofi — Porch swing", await what()]);
    for (let i = 0; i < 8; i++) {
      await page.click(".w-music .muNext");
      const name = await what();
      ok(/^Lofi — /.test(name) && !seen.has(name), "side repeated or unnamed: " + name);
      seen.add(name);
      ok(await running(), "Next stopped playback on " + name);
      await expect.poll(level, { timeout: 6000 }).toBeGreaterThan(0.05);
    }
    expect(seen.size).toBe(10);
    await page.click(".w-music .muNext");            // the pass is over: a shuffled side, never the one just played
    ok(/^Lofi — /.test(await what()) && (await what()) !== "Lofi — Corner store", "shuffle repeated the last side");
    // locked, Next is still a play action
    await page.click("#lockBtn");
    const before = await what();
    await page.click(".w-music .muNext");
    expect(await what()).not.toBe(before);
    ok(await running(), "skip while locked killed playback");
    await dh.unlock();
    await page.click(".w-music .muPlay");
    await expect.poll(level, { timeout: 6000 }).toBeLessThan(0.02);
    await page.click(".w-music .wClose");
  });
});

test.describe("embeds", () => {

  test("v6.25 embed: YouTube links normalize to the nocookie player", async ({ page, dh }) => {
    await stubYouTube(page);
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addEmbedBtn");
    const conv = async u => {
      await page.evaluate(url => {
        const inp = document.querySelector(".w-embed .embIn");
        inp.value = url;
        inp.dispatchEvent(new Event("blur"));
      }, u);
      return page.evaluate(() =>
        window.Deckhand.config.scenes[0].widgets.find(x => x.type === "embed").url);
    };
    ok(await conv("https://www.youtube.com/watch?v=jfKfPfyJRdk") ===
      "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk", "watch link");
    ok(await conv("https://youtu.be/jfKfPfyJRdk?t=30") ===
      "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk", "youtu.be link");
    ok(await conv("https://www.youtube.com/watch?v=abc123defg4&list=PLxyz-12_34") ===
      "https://www.youtube-nocookie.com/embed/abc123defg4?list=PLxyz-12_34", "video+list");
    ok(await conv("https://www.youtube.com/playlist?list=PLxyz-12_34") ===
      "https://www.youtube-nocookie.com/embed/videoseries?list=PLxyz-12_34", "bare playlist");
    ok(await conv("https://www.youtube.com/live/abc123defg4") ===
      "https://www.youtube-nocookie.com/embed/abc123defg4", "live link");
    ok(await conv("https://www.youtube.com/embed/jfKfPfyJRdk") ===
      "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk", "youtube.com embed link");
    ok(await conv("https://www.youtube.com/shorts/abc123defg4") ===
      "https://www.youtube-nocookie.com/embed/abc123defg4", "shorts link");
    // bad ids REJECT cleanly (keep-last-good) — never load the raw page
    const last = "https://www.youtube-nocookie.com/embed/abc123defg4";
    ok(await conv("https://youtu.be/ab") === last,
      "too-short youtu.be id was not rejected");
    ok(await conv("https://www.youtube.com/playlist?list=" + "A".repeat(70)) === last,
      "oversize playlist id was truncated instead of rejected");
    // v7.0: any OTHER YouTube page is rejected too — channel, handle,
    // user and search pages used to fall through and frame a blank
    for (const u of [
      "https://www.youtube.com/@lofigirl",
      "https://www.youtube.com/channel/UCSJ4gkVC6NrvII8umztf0Ow",
      "https://www.youtube.com/user/LofiGirl",
      "https://www.youtube.com/c/LofiGirl",
      "https://www.youtube.com/results?search_query=lofi",
      "https://m.youtube.com/@lofigirl",
      "https://www.youtube.com/"
    ]) ok(await conv(u) === last, "non-player YouTube page was framed: " + u);
    // v7.0: youtube-nocookie must be the embed player itself — the exact
    // player shape passes through, anything else on that host is refused
    ok(await conv("https://www.youtube-nocookie.com/embed/jfKfPfyJRdk") ===
      "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk", "nocookie embed pass-through");
    ok(await conv("https://www.youtube-nocookie.com/embed/videoseries?list=PLxyz-12_34") ===
      "https://www.youtube-nocookie.com/embed/videoseries?list=PLxyz-12_34",
      "nocookie playlist pass-through");
    const last2 = "https://www.youtube-nocookie.com/embed/videoseries?list=PLxyz-12_34";
    for (const u of [
      "https://www.youtube-nocookie.com/watch?v=jfKfPfyJRdk",
      "https://www.youtube-nocookie.com/",
      "https://www.youtube-nocookie.com/embed/ab",
      "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1",
      "http://www.youtube-nocookie.com/embed/jfKfPfyJRdk"
    ]) ok(await conv(u) === last2, "non-player youtube-nocookie url was framed: " + u);
    await page.click(".w-embed .wClose");
  });

  test("v6.26 YouTube widget: stations load with one tap, save/remove, YouTube-only, locked-safe", async ({ page, dh }) => {
    await stubYouTube(page);
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addYtBtn");
    // born with the Lofi Girl station seeded
    const seed = await page.evaluate(() => ({
      chips: [...document.querySelectorAll(".ytSt")].map(b => b.textContent),
      frameHidden: document.querySelector(".ytFrame").hidden
    }));
    ok(seed.chips.length === 1 && /lofi girl/i.test(seed.chips[0]) &&
       seed.frameHidden, "bad birth state: " + JSON.stringify(seed));
    // v6.27: the LIBRARY — categorized, one tap loads and closes
    await page.click(".ytLibBtn");
    const libState = await page.evaluate(() => ({
      open: !document.querySelector(".ytLib").hidden,
      cats: [...document.querySelectorAll(".ytLib .menuLabel")].map(l => l.textContent),
      pills: document.querySelectorAll(".ytLib .pill").length
    }));
    // v6.33: 8 categories (Math Antics + scores + pop/jazz joined the 5)
    ok(libState.open && libState.cats.length === 8 && libState.pills >= 30,
      "library wrong: " + JSON.stringify(libState));
    await page.click(".ytLib .pill");              // first entry
    const libPick = await page.evaluate(() => ({
      closed: document.querySelector(".ytLib").hidden,
      src: document.querySelector(".ytFrame").src,
      urls: document.querySelector(".w-yt")._entry.cfg.url
    }));
    ok(libPick.closed && /youtube-nocookie\.com\/embed\//.test(libPick.src),
      "library pick did not load: " + JSON.stringify(libPick));
    await page.evaluate(() => {                    // reset for the station test
      document.querySelector(".w-yt")._entry.cfg.url = "";
      const f = document.querySelector(".ytFrame");
      f.src = "about:blank"; f.hidden = true;
    });
    // one tap = the station is on the card and in config
    await page.click(".ytSt");
    const tapped = await page.evaluate(() => ({
      src: document.querySelector(".ytFrame").src,
      url: document.querySelector(".w-yt")._entry.cfg.url,
      hidden: document.querySelector(".ytFrame").hidden
    }));
    ok(!tapped.hidden && /youtube-nocookie\.com\/embed\/jfKfPfyJRdk/.test(tapped.src) &&
       /jfKfPfyJRdk/.test(tapped.url), "station tap: " + JSON.stringify(tapped));
    // v6.28: ↗ Tab converts the embed back to a real YouTube page URL
    const opened = await page.evaluate(() => {
      const calls = [];
      const orig = window.open;
      window.open = u => { calls.push(u); return null; };
      document.querySelector(".ytOpen").click();
      const en = document.querySelector(".w-yt")._entry;
      en.cfg.url = "https://www.youtube-nocookie.com/embed/videoseries?list=PLabc-123";
      document.querySelector(".ytOpen").click();
      en.cfg.url = "https://www.youtube-nocookie.com/embed/abc123defg4?list=PLxyz90";
      document.querySelector(".ytOpen").click();
      window.open = orig;
      return calls;
    });
    ok(opened.length === 3 &&
       opened[0] === "https://www.youtube.com/watch?v=jfKfPfyJRdk" &&
       opened[1] === "https://www.youtube.com/playlist?list=PLabc-123" &&
       opened[2] === "https://www.youtube.com/watch?v=abc123defg4&list=PLxyz90",
      "↗ Tab conversions wrong: " + JSON.stringify(opened));
    await page.evaluate(() => {                    // restore the tapped station url
      document.querySelector(".w-yt")._entry.cfg.url =
        "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk";
    });
    // v6.28: the ⤡ strip grip — finger-sized resize that covers no content
    const grip = await page.evaluate(() => {
      const g = document.querySelector(".w-yt .wSize");
      const r = g.getBoundingClientRect();
      return { w: r.width, h: r.height,
               cursor: getComputedStyle(g).cursor,
               ta: getComputedStyle(g).touchAction };
    });
    ok(grip.w >= 44 && grip.h >= 44 && grip.cursor === "nwse-resize" &&
       grip.ta === "none", "grip wrong: " + JSON.stringify(grip));
    // (v6.32 flake hardening: read the grip box at the last moment, and
    // record x/y so a mis-aimed tap that starts a MOVE is distinguishable
    // from a real resize regression)
    const gb = await page.locator(".w-yt .wSize").boundingBox();
    const before28 = await page.evaluate(() => {
      const w = document.querySelector(".w-yt")._entry.cfg;
      return { x: w.x, y: w.y, w: w.w, h: w.h };
    });
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down();
    await page.mouse.move(gb.x + gb.width / 2 + 80, gb.y + gb.height / 2 + 60, { steps: 3 });
    // v6.32: mid-drag the iframe SHIELD must be up — a loaded cross-origin
    // embed otherwise steals the pointer stream the moment the drag
    // crosses it (the real cause of the intermittent grip failures here,
    // and of "stretching tiles" dying on the tablet over a live video)
    const shield = await page.evaluate(() => ({
      body: document.body.classList.contains("dragging"),
      pe: getComputedStyle(document.querySelector(".ytFrame")).pointerEvents
    }));
    ok(shield.body && shield.pe === "none",
      "iframe shield down mid-drag: " + JSON.stringify(shield));
    await page.mouse.move(gb.x + gb.width / 2 + 160, gb.y + gb.height / 2 + 120, { steps: 3 });
    await page.mouse.up();
    const after28 = await page.evaluate(() => {
      const w = document.querySelector(".w-yt")._entry.cfg;
      return { x: w.x, y: w.y, w: w.w, h: w.h };
    });
    ok(await page.evaluate(() =>
      !document.body.classList.contains("dragging")),
      "iframe shield stuck after the drop");
    // v6.32 fix: the five classic handles were BURIED under the yt body
    // (.w-yt .wBody position:relative since v6.27) — hSE must work again
    const hb32 = await page.locator(".w-yt .wHandle.hSE").boundingBox();
    await page.mouse.move(hb32.x + hb32.width / 2, hb32.y + hb32.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb32.x - 120, hb32.y - 90, { steps: 4 });
    await page.mouse.up();
    const after32 = await page.evaluate(() => {
      const w = document.querySelector(".w-yt")._entry.cfg;
      return { w: w.w, h: w.h };
    });
    ok(after32.w < after28.w && after32.h < after28.h,
      "hSE handle dead on the yt card: " + JSON.stringify({ after28, after32 }));
    ok(after28.x === before28.x && after28.y === before28.y,
      "⤡ grip drag MOVED the widget (mis-aimed tap hit the strip): " +
      JSON.stringify({ before28, after28 }));
    ok(after28.w > before28.w && after28.h > before28.h,
      "⤡ grip did not resize: " + JSON.stringify({ before28, after28 }));
    // pasting a watch link converts; save keeps it as a named station
    await page.evaluate(() => {
      const inp = document.querySelector(".ytIn");
      inp.value = "https://www.youtube.com/watch?v=abc123defg4";
      inp.dispatchEvent(new Event("blur"));
    });
    await page.fill(".ytName", "Mozart mix");
    await page.click(".ytSave");
    const saved = await page.evaluate(() =>
      document.querySelector(".w-yt")._entry.cfg.stations);
    ok(saved.length === 2 && saved[1].name === "Mozart mix" &&
       /abc123defg4/.test(saved[1].url), "save: " + JSON.stringify(saved));
    // re-saving the same url renames instead of duplicating
    await page.fill(".ytName", "Wolfgang");
    await page.click(".ytSave");
    const renamed = await page.evaluate(() =>
      document.querySelector(".w-yt")._entry.cfg.stations);
    ok(renamed.length === 2 && renamed[1].name === "Wolfgang",
      "re-save duplicated: " + JSON.stringify(renamed));
    // a non-YouTube link is refused with a note (keep-last-good)
    await page.evaluate(() => {
      const inp = document.querySelector(".ytIn");
      inp.value = "https://docs.google.com/presentation/d/xyz123abcd/edit";
      inp.dispatchEvent(new Event("blur"));
    });
    const refused = await page.evaluate(() => ({
      url: document.querySelector(".w-yt")._entry.cfg.url,
      note: document.querySelector(".ytNote").hidden
    }));
    ok(/abc123defg4/.test(refused.url) && !refused.note,
      "non-YouTube link accepted: " + JSON.stringify(refused));
    // ✕ removes a station (unlocked only); locked hides ✕ + row, taps stay
    await page.click(".ytStations .ytDel:last-of-type");
    ok(await page.evaluate(() =>
      document.querySelector(".w-yt")._entry.cfg
        .stations.length) === 1, "✕ did not remove");
    await page.click("#lockBtn");
    const locked = await page.evaluate(() => ({
      row: getComputedStyle(document.querySelector(".ytRow")).display,
      del: getComputedStyle(document.querySelector(".ytDel")).display
    }));
    ok(locked.row === "none" && locked.del === "none",
      "config controls visible while locked: " + JSON.stringify(locked));
    await page.evaluate(() => {                    // park a distinct url first
      document.querySelector(".w-yt")._entry.cfg.url = "";
    });
    await page.click(".ytSt");                     // station tap works locked
    ok(await page.evaluate(() =>
      /jfKfPfyJRdk/.test(document.querySelector(".ytFrame").src)),
      "station tap dead while locked");
    await dh.unlock();
    // staged, the card owns the keyboard (clicker), like slides
    await page.click(".w-yt .wFocus");
    ok(await page.evaluate(() =>
      !!document.activeElement &&
      document.activeElement.classList.contains("ytFrame")),
      "staged YouTube card did not take the keys");
    await page.click("#unfocusBtn");
    // closing the card silences it: the frame is blanked
    await page.click(".w-yt .wClose");
    ok(await page.evaluate(() =>
      !document.querySelector(".ytFrame")), "frame survived close");
    // sanitize agrees with the runtime rule: non-YouTube stations DIE,
    // youtube watch links normalize, on RELOAD of a hand-edited config
    const pg2 = await dh.loadFixture("tmp_yt_hostile.html", JSON.stringify({
      schemaVersion: 4, appVersion: "6.26.0",
      scenes: [{ name: "S", widgets: [
        { type: "clock", x: 0, y: 0, w: 40, h: 50 },
        { type: "yt", x: 45, y: 5, w: 40, h: 60,
          url: "https://evil.example/x",
          stations: [
            { name: "ok", url: "https://www.youtube.com/watch?v=abc123defg4" },
            { name: "bad", url: "https://x.example/0" }
          ] }
      ]}],
      activeScene: "S"
    }));
    const cleaned = await pg2.evaluate(() => {
      const w = document.querySelector(".w-yt")._entry.cfg;
      return { url: w.url, stations: w.stations };
    });
    ok(cleaned.url === "" && cleaned.stations.length === 1 &&
       cleaned.stations[0].url ===
         "https://www.youtube-nocookie.com/embed/abc123defg4",
      "hostile yt config survived sanitize: " + JSON.stringify(cleaned));
    await pg2.close();
  });

  test("v6.33: every library pill is a distinct, valid nocookie embed", async ({ page, dh }) => {
    await stubYouTube(page);
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addYtBtn");
    await page.click(".ytLibBtn");                 // open (a pick closes it)
    const n = await page.locator(".ytLib .pill").count();
    ok(n >= 30, "library shrank: " + n);
    // the first pick goes through the real pointer path…
    await page.locator(".ytLib .pill").first().click();
    await expect(page.locator(".ytLib")).toBeHidden();     // a pick closes the library
    // …then every pill in turn, driven in-page (the handlers are plain
    // synchronous click listeners; 39 round-trips of open → pick → read
    // are what made this the slowest test in the old suite)
    const picks = await page.evaluate(() => {
      const out = [];
      const libBtn = document.querySelector(".ytLibBtn");
      const lib = document.querySelector(".ytLib");
      const frame = document.querySelector(".ytFrame");
      const total = (function(){ libBtn.click(); const c = lib.querySelectorAll(".pill").length; libBtn.click(); return c; })();
      for (let i = 0; i < total; i++) {
        libBtn.click();                            // reopen after each pick
        if (lib.hidden) return { error: "library did not open for pill " + i };
        lib.querySelectorAll(".pill")[i].click();
        out.push({ src: frame.getAttribute("src") || "", closed: lib.hidden });
      }
      return { picks: out };
    });
    ok(!picks.error, picks.error);
    ok(picks.picks.length === n, "pill count drifted: " + picks.picks.length + " vs " + n);
    const seen = new Set();                        // dupes anywhere, not just adjacent
    picks.picks.forEach((p, i) => {
      ok(p.closed, "pill " + i + " left the library open");
      ok(p.src.startsWith("https://www.youtube-nocookie.com/embed/"),
        "pill " + i + " produced a non-nocookie src: " + p.src);
      ok(!seen.has(p.src),
        "pill " + i + " is a dupe or was refused (keep-last-good): " + p.src);
      seen.add(p.src);
    });
    await page.click(".w-yt .wClose");
  });

  test("v7.0 YouTube card goes quiet on Home and comes back with the board", async ({ page, dh }) => {
    await stubYouTube(page);
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addYtBtn");
    const url = "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk";
    await page.evaluate(u => {
      const inp = document.querySelector(".w-yt .ytIn");
      inp.value = u;
      inp.dispatchEvent(new Event("blur"));
    }, url);
    const frame = page.locator(".w-yt .ytFrame");
    await expect(frame).toHaveAttribute("src", url);
    await expect(frame).toBeVisible();
    // H = Home: the board hides, and a video must not keep talking under it
    await page.keyboard.press("h");
    await expect(page.locator("body")).toHaveClass(/landing/);
    ok(await page.evaluate(() =>
      document.querySelector(".w-yt .ytFrame").getAttribute("src") === null),
      "yt iframe kept its src on the landing page");
    // …and Enter/launch brings the same player back
    await dh.launch();
    await expect(page.locator("body")).not.toHaveClass(/landing/);
    await expect(frame).toHaveAttribute("src", url);
    ok(await page.evaluate(() => ({
      hidden: document.querySelector(".w-yt .ytFrame").hidden,
      url: document.querySelector(".w-yt")._entry.cfg.url
    })).then(s => !s.hidden && s.url === url), "player not restored on the board");
    // the Slides card does the same (it always did — a regression fence)
    await dh.addW("addEmbedBtn");
    const deck = "https://docs.google.com/presentation/d/abc123/embed?start=false&loop=false&delayms=60000";
    await page.route(/docs\.google\.com/, r => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html>" }));
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn");
      inp.value = u; inp.dispatchEvent(new Event("blur"));
    }, deck);
    await expect(page.locator(".w-embed .embFrame")).toHaveAttribute("src", deck);
    await page.keyboard.press("h");
    await expect(page.locator("body")).toHaveClass(/landing/);
    ok(await page.evaluate(() =>
      document.querySelector(".w-embed .embFrame").getAttribute("src") === null &&
      document.querySelector(".w-yt .ytFrame").getAttribute("src") === null),
      "a card kept its src on the second trip Home");
    await dh.launch();
    await expect(page.locator(".w-embed .embFrame")).toHaveAttribute("src", deck);
    await expect(frame).toHaveAttribute("src", url);
  });
});

test.describe("motion", () => {

  test("v6.18 motion: serpent glides; the sea sleeps during stage mode", async ({ dh }) => {
    const pg = await dh.newPage({ reducedMotion: "no-preference" });
    await pg.goto(dh.url);
    await pg.waitForSelector("#launchBtn", { state: "attached" });
    await launch(pg);
    await expect(pg.locator("main#canvas")).toBeVisible();
    await pg.evaluate(() => window.Deckhand.sea("serpent"));
    ok(await pg.evaluate(() => {
      const s = document.getElementById("sea-serpent");
      return s.classList.contains("go") &&
             getComputedStyle(s).animationName.includes("ssGlide") &&
             getComputedStyle(s.querySelector(".ssSeg")).animationName.includes("ssDive") &&
             getComputedStyle(s.querySelector(".ssHump")).animationName.includes("ssRoll") &&
             getComputedStyle(s).visibility === "visible";
    }), "serpent not gliding/diving/bobbing");
    // v6.20: the whale surfaces, spouts, and its rig animates
    await pg.evaluate(() => {
      document.getElementById("sea-serpent").classList.remove("go");
      window.Deckhand.sea("whale");
    });
    ok(await pg.evaluate(() => {
      const w = document.getElementById("sea-whale");
      return w.classList.contains("go") &&
             getComputedStyle(w.querySelector(".whSurf")).animationName.includes("whY") &&
             getComputedStyle(w.querySelector(".whSpout")).animationName.includes("whSpout");
    }), "whale not performing");
    await pg.evaluate(() =>
      document.getElementById("sea-whale").classList.remove("go"));
    // staged: entering stage ENDS a live show (display:none cancels the
    // animation; a leftover .go would pop out mid-screen after Exit)…
    await pg.click("#clockWidget .wFocus");         // v7.7: default = the clock alone
    ok(await pg.evaluate(() =>
      !document.getElementById("sea-serpent").classList.contains("go")),
      "stage entry left the serpent playing");
    // …and the scheduler must stay quiet
    await pg.evaluate(() => window.Deckhand.seaEvery(70));
    await pg.waitForTimeout(450);                  // several 70ms beats (negative check)
    ok(await pg.evaluate(() =>
      ![...document.querySelectorAll(".seaThing")].some(el =>
        el.classList.contains("go"))),
      "the sea played during stage mode");
    await pg.keyboard.press("Escape");             // Exit: the sea wakes back up
    await expect.poll(() => pg.evaluate(() =>
      [...document.querySelectorAll(".seaThing")].some(el =>
        el.classList.contains("go"))), { timeout: 6000 }).toBe(true);
    // v6.19: the scheduler never stacks a second visitor on a live one
    await pg.waitForTimeout(300);                  // more beats pass (negative check)
    ok(await pg.evaluate(() =>
      [...document.querySelectorAll(".seaThing")].filter(el =>
        el.classList.contains("go")).length) === 1,
      "two sea things at once");
    await pg.close();
  });
});
