/* A ~78 s tour of October 2.0 on the real board, recorded by Playwright. node tour.js <dir> */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const DIR = process.argv[2] || "tools/proofs/out/video";
fs.mkdirSync(DIR, { recursive: true });
const URL = "file://" + require("path").resolve(__dirname, "../../Deckhand.html") + "";
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "no-preference", recordVideo: { dir: DIR, size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  await page.goto("about:blank");
  await page.goto(URL + "#t=2026-10-14T10:30");
  await page.waitForFunction(() => !!window.Deckhand);
  if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
  await page.evaluate(() => {
    window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion");
    document.body.dataset.sea = "breezy"; document.getElementById("sea").dataset.weather = "breezy";
    const t = document.getElementById("greetToast"); if (t) t.hidden = true;   // the toast is for the teacher, not the tour
    // hide the SIM tag and the mouse: it's a glimpse, not a test
    const st = document.createElement("style"); st.textContent = ".sim{display:none !important} *{cursor:none !important}"; document.head.appendChild(st);
  });
  const t0 = Date.now();
  const at = async (ms, fn) => { const w = ms - (Date.now() - t0); if (w > 0) await page.waitForTimeout(w); await fn(); };
  const tap = sel => page.locator(sel).first().dispatchEvent("pointerdown");
  await at(3500, () => tap("#ocPumpkins .ocPumpkin.p1"));
  await at(5200, () => tap("#ocPumpkins .ocPumpkin.p2"));
  await at(6900, () => tap("#ocPumpkins .ocPumpkin.p3"));
  await at(9000, () => tap("#ocWeb .ocSpider"));                                   // the drop
  await at(10500, () => page.evaluate(() => window.Deckhand.sea("bats")));
  await at(12400, () => tap("#ocWeb .ocSpider"));                                  // a re-drop from the hang
  await at(20000, () => page.evaluate(() => window.Deckhand.sea("gull")));
  await at(27000, () => page.evaluate(() => { document.body.dataset.sea = "windy"; document.getElementById("sea").dataset.weather = "windy"; }));
  await at(28000, () => page.evaluate(() => window.Deckhand.sea("castaway")));      // Wilson: surfaces at 29, over at 51, gone by 74
  await at(60000, () => tap("#ocWeb .ocSpider"));
  await at(75000, () => page.evaluate(() => { document.body.dataset.sea = "breezy"; document.getElementById("sea").dataset.weather = "breezy"; }));
  await at(76000, () => page.evaluate(() => window.Deckhand.sea("haunt")));
  await at(91000, () => page.evaluate(() => window.Deckhand.sea("ghost")));         // hang at ~113–121
  await at(154000, async () => {});
  await ctx.close();
  await br.close();
  const f = fs.readdirSync(DIR).filter(x => x.endsWith(".webm"))[0];
  console.log("video:", path.join(DIR, f));
})();
