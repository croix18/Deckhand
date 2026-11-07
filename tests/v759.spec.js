/* v7.59 — ♪ Keep playing (Croix: "Is there a way I can get the YouTube video to keep playing even
   when I collapse it. For music, it's not really helpful to have the video taking up screen space.").
   A YouTube card with ♪ Keep playing on stays loaded when minimized: the dock chip is the card, the
   ♪ Now Playing pill is the stop. Off, minimizing goes quiet as it has since v7.18. */
const { test, expect, ok } = require("./helpers");

const stubYouTube = async page => {
  await page.route(/youtube-nocookie\.com/, r => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>yt stub</title>" }));
};
const state = page => page.evaluate(() => {
  const w = document.querySelector(".w-yt"), f = w.querySelector(".ytFrame");
  return { src: f.getAttribute("src") || "", min: !!w._entry.cfg.min, bg: !!w._entry.cfg.bg, minned: w.classList.contains("wMinned"),
           pill: window.Deckhand.nowPlaying ? window.Deckhand.nowPlaying.showing() : !document.getElementById("nowPlaying").hidden };
});

test.describe("v7.59 ♪ Keep playing", () => {
  test("off (the default): minimizing a playing card unloads its frame, as before", async ({ page, dh }) => {
    await stubYouTube(page);
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addYtBtn"); await page.keyboard.press("Escape");
    await page.click(".ytSt");
    let s = await state(page);
    ok(/jfKfPfyJRdk/.test(s.src) && !s.bg, "the station did not load: " + JSON.stringify(s));
    ok((await page.getAttribute(".ytBg", "aria-pressed")) === "false", "♪ Keep playing is on by default");
    await page.click(".w-yt .wMin");
    s = await state(page);
    ok(s.min && s.minned && s.src === "", "minimized card kept its frame with ♪ off: " + JSON.stringify(s));
    ok(!s.pill, "the ♪ pill shows for a silent card");
  });

  test("on: the frame stays loaded under the chip, the ♪ pill names it, a tap on the pill stops it; the chip brings it back without a reload; the flag survives sanitize", async ({ page, dh }) => {
    await stubYouTube(page);
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addYtBtn"); await page.keyboard.press("Escape");
    await page.click(".ytSt");
    await page.click(".ytBg");
    ok((await page.getAttribute(".ytBg", "aria-pressed")) === "true", "the toggle did not take");
    await expect(page.locator(".ytNote")).toContainText("keeps the music going");
    await page.click(".w-yt .wMin");
    await page.waitForTimeout(700);                                      // the pill repaints on a half-second clock
    let s = await state(page);
    ok(s.min && s.minned && /jfKfPfyJRdk/.test(s.src), "the frame was unloaded with ♪ on: " + JSON.stringify(s));
    ok(s.pill, "the ♪ pill is not showing for the minimized music");
    await expect(page.locator("#nowPlaying .npName")).toHaveText("YouTube");
    // sanitize keeps the flag
    const kept = await page.evaluate(() => window.Deckhand.sanitize(JSON.parse(JSON.stringify(window.Deckhand.config))).scenes[0].widgets.filter(w => w.type === "yt").map(w => !!w.bg));
    ok(JSON.stringify(kept) === "[true]", "bg did not survive sanitize: " + JSON.stringify(kept));
    // the chip brings the card back, still playing (no reload: same src)
    await page.click("#shelf .minChip");
    await page.waitForTimeout(300);
    s = await state(page);
    ok(!s.min && !s.minned && /jfKfPfyJRdk/.test(s.src), "the chip did not bring the card back playing: " + JSON.stringify(s));
    // minimized again, the pill stops it
    await page.click(".w-yt .wMin");
    await page.waitForTimeout(700);
    await page.click("#nowPlaying");
    await page.waitForTimeout(700);
    s = await state(page);
    ok(s.min && s.src === "", "the pill did not stop the music: " + JSON.stringify(s));
    ok(!s.pill, "the pill stayed after stopping");
  });
});
