const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const OUT = "tools/proofs/out/flock"; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log("pageerror", String(e)));
  await page.goto("file://" + require("path").resolve(__dirname, "../../Deckhand.html") + "#t=2026-10-14T10:30");
  await page.waitForFunction(() => !!window.Deckhand);
  if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
  await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });
  const wb = await page.locator("#ocWeb").boundingBox();
  const clip = { x: wb.x - 10, y: wb.y - 10, width: wb.width + 20, height: wb.height + 40 };
  // the glint runs in the first 4.5 s after waveMotion; catch it, then the web at rest
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, "web-glint-a.png"), clip });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, "web-glint-b.png"), clip });
  await page.waitForTimeout(4000); await page.screenshot({ path: path.join(OUT, "web-rest.png"), clip });
  // the flock
  await page.evaluate(() => window.Deckhand.sea("bats"));
  const t0 = Date.now();
  for (const t of [1200, 3000, 4200, 4900, 5600, 6300, 7000, 7700, 8400]) {
    const wait = t - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(OUT, "bats-" + String(t).padStart(5, "0") + ".png"), clip: { x: 0, y: 980, width: 1920, height: 100 } });
  }
  await br.close();
})();
