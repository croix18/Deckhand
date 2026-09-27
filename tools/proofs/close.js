/* Close-ups at 2x: the web (glint, then the spider's drop) and the flock, captured as
   timestamped frames so the hairlines survive — Playwright's recorder can't zoom. */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const OUT = "tools/proofs/out/close";
fs.rmSync(OUT + "/flock", { recursive: true, force: true }); fs.mkdirSync(OUT + "/flock", { recursive: true }); if (process.argv[2] !== "flock"){ fs.rmSync(OUT + "/web", { recursive: true, force: true }); fs.mkdirSync(OUT + "/web", { recursive: true }); }
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto("file://" + require("path").resolve(__dirname, "../../Deckhand.html") + "#t=2026-10-14T10:30");
  await page.waitForFunction(() => !!window.Deckhand);
  if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
  await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.dataset.sea = "breezy"; document.getElementById("sea").dataset.weather = "breezy";
    const t = document.getElementById("greetToast"); if (t) t.hidden = true;
    const st = document.createElement("style"); st.textContent = ".sim{display:none !important}"; document.head.appendChild(st); });
  const capture = async (dir, clip, durMs, events) => {
    const times = []; let i = 0; const t0 = Date.now();
    const pending = events.slice();
    while (Date.now() - t0 < durMs) {
      const ts = Date.now() - t0;
      while (pending.length && pending[0].at <= ts) { await pending.shift().fn(); }
      await page.screenshot({ path: path.join(dir, "f" + String(i++).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92, clip });
      times.push(ts);
    }
    // concat list with real durations
    let list = "";
    for (let k = 0; k < times.length; k++) {
      const d = ((k + 1 < times.length ? times[k + 1] : Date.now() - t0) - times[k]) / 1000;
      list += `file 'f${String(k).padStart(5, "0")}.jpg'\nduration ${Math.max(0.01, d).toFixed(3)}\n`;
    }
    list += `file 'f${String(times.length - 1).padStart(5, "0")}.jpg'\n`;
    fs.writeFileSync(path.join(dir, "list.txt"), list);
    console.log(dir, times.length, "frames in", (Date.now() - t0) / 1000, "s");
  };
  // 1. the web: waveMotion on starts the glint (6 s); the spider drops at 7.5 s; a re-drop at 10.5
  const wb = await page.locator("#ocWeb").boundingBox();
  const webClip = { x: wb.x - 40, y: wb.y - 12, width: wb.width + 52, height: wb.height + 250 };
  await page.evaluate(() => document.body.classList.add("waveMotion"));
  if (process.argv[2] !== "flock") await capture(OUT + "/web", webClip, 16000, [
    { at: 7500, fn: () => page.locator("#ocWeb .ocSpider").dispatchEvent("pointerdown") },
    { at: 10500, fn: () => page.locator("#ocWeb .ocSpider").dispatchEvent("pointerdown") }
  ]);
  // 2. the flock: the strip under the board, full width
  await page.waitForTimeout(500);
  await page.evaluate(() => window.Deckhand.sea("bats"));
  await capture(OUT + "/flock", { x: 0, y: 950, width: 1920, height: 130 }, 11500, []);
  await br.close();
})();
