const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const OUT = "tools/proofs/out/wilson"; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log("pageerror", String(e)));
  await page.goto("file://" + require("path").resolve(__dirname, "../../Deckhand.html") + "#t=2026-10-14T10:30");
  await page.waitForFunction(() => !!window.Deckhand);
  if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
  await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); document.querySelector(".sim") && (document.querySelector(".sim").style.display = "none"); });
  await page.evaluate(() => window.Deckhand.sea("gull"));
  await page.waitForTimeout(7000);
  for (const weather of ["breezy"]) {
    await page.evaluate(w => { document.body.dataset.sea = w; document.getElementById("sea").dataset.weather = w; }, weather);
    const t0 = Date.now();
    console.log(weather, await page.evaluate(() => window.Deckhand.sea("castaway")));
    const times = weather === "breezy" ? [2200, 5200, 12000, 26000] : [12000, 26500, 30500, 40000];
    for (const t of times) {
      const wait = t - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
      await page.screenshot({ path: path.join(OUT, weather + "-" + String(t).padStart(5, "0") + ".png"), clip: { x: 720, y: 980, width: 900, height: 100 } });
    }
    await page.waitForTimeout(8000);
    console.log("boat:", await page.evaluate(() => document.getElementById("boat").className));
  }
  await br.close();
})();
