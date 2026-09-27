/* frame grabs of October 2.0 on the real board. node grab.js <out-dir> */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const OUT = process.argv[2] || "tools/proofs/out/frames";
fs.mkdirSync(OUT, { recursive: true });
const URL = "file://" + require("path").resolve(__dirname, "../../Deckhand.html") + "";
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  const open = async hash => {
    await page.goto("about:blank"); await page.goto(URL + hash);
    await page.waitForFunction(() => !!window.Deckhand);
    if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
    await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });
    await page.waitForTimeout(300);
  };
  const shot = async (name, clip) => page.screenshot({ path: path.join(OUT, name + ".png"), clip });
  const box = async sel => page.locator(sel).first().boundingBox();
  const pad = (b, p) => ({ x: Math.max(0, b.x - p), y: Math.max(0, b.y - p), width: b.width + 2 * p, height: b.height + 2 * p });

  await open("#t=2026-10-14T10:30");
  await shot("board-oct14");
  await shot("pumpkins-idle", pad(await box("#ocPumpkins"), 30));
  await shot("web-idle", pad(await box("#ocWeb"), 10));
  // tap two pumpkins, hold the third's tap for the sprout nudge
  await page.locator("#ocPumpkins .ocPumpkin.p1").dispatchEvent("pointerdown");
  await page.waitForTimeout(70);
  await shot("pumpkin-tap-070", pad(await box("#ocPumpkins"), 30));
  await page.waitForTimeout(120);
  await shot("pumpkin-tap-190", pad(await box("#ocPumpkins"), 30));
  await page.waitForTimeout(600);
  await page.locator("#ocPumpkins .ocPumpkin.p2").dispatchEvent("pointerdown");
  await page.locator("#ocPumpkins .ocPumpkin.p3").dispatchEvent("pointerdown");
  await page.waitForTimeout(160);
  await shot("pumpkin-p3-sprout-160", pad(await box("#ocPumpkins"), 30));
  await page.waitForTimeout(1500);
  await shot("pumpkins-lit", pad(await box("#ocPumpkins"), 30));
  // spider drop
  const wb0 = pad(await box("#ocWeb"), 10); const wb = { x: wb0.x - 40, y: wb0.y, width: wb0.width + 40, height: wb0.height + 230 };
  const t0 = Date.now();
  await page.locator("#ocWeb .ocSpider").dispatchEvent("pointerdown");
  for (const t of [220, 720, 860, 1100, 1320, 1520, 2600, 3850, 4800, 5750, 7000]) {
    const wait = t - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
    await shot("spider-drop-" + String(t).padStart(4, "0"), wb);
  }
  // redrop: tap again at 2.5 s of a new drop
  await page.waitForTimeout(500);
  await page.locator("#ocWeb .ocSpider").dispatchEvent("pointerdown");
  await page.waitForTimeout(2500);
  await page.locator("#ocWeb .ocSpider").dispatchEvent("pointerdown");
  const cls = await page.evaluate(() => document.querySelector("#ocWeb .ocSpiderRig").className.baseVal + " sy=" + document.querySelector("#ocWeb .ocSpiderRig").style.getPropertyValue("--sy"));
  console.log("after redrop tap:", cls);
  await shot("spider-redrop-000", wb);
  await page.waitForTimeout(400);
  await shot("spider-redrop-400", wb);
  await page.waitForTimeout(5000);
  await shot("spider-home", wb);
  // bats
  await page.evaluate(() => window.Deckhand.sea("bats"));
  const b0 = Date.now();
  for (const t of [100, 1200, 2000, 2400, 3900, 4700, 5400, 6200, 7400, 9000]) {
    const wait = t - (Date.now() - b0); if (wait > 0) await page.waitForTimeout(wait);
    await shot("bats-" + String(t).padStart(5, "0"), { x: 0, y: 940, width: 1920, height: 140 });
  }
  await page.waitForTimeout(2500);
  // ghost (with the gull perched)
  await page.evaluate(() => window.Deckhand.seaModule.clear());
  await page.evaluate(() => window.Deckhand.sea("gull"));
  await page.waitForTimeout(7000);
  const g0 = Date.now();
  console.log("ghost:", await page.evaluate(() => window.Deckhand.sea("ghost")));
  for (const t of [100, 6200, 8800, 20000, 22000, 22100, 23200, 24000, 25500, 28400, 30700, 35000, 40000, 43900]) {
    const wait = t - (Date.now() - g0); if (wait > 0) await page.waitForTimeout(wait);
    await shot("ghost-" + String(t).padStart(5, "0"), { x: 0, y: 940, width: 1920, height: 140 });
  }
  await page.waitForTimeout(1000);
  // castaway, windy
  await page.evaluate(() => { document.body.dataset.sea = "windy"; document.getElementById("sea").dataset.weather = "windy"; });
  console.log("castaway:", await page.evaluate(() => window.Deckhand.sea("castaway", "near")));
  const c0 = Date.now();
  for (const t of [5500, 12000, 31500, 34900, 35100, 40000]) {
    const wait = t - (Date.now() - c0); if (wait > 0) await page.waitForTimeout(wait);
    await shot("castaway-" + String(t).padStart(5, "0"), { x: 0, y: 860, width: 1920, height: 220 });
  }
  await page.waitForTimeout(7000);
  // haunt
  await page.evaluate(() => { document.body.dataset.sea = "breezy"; document.getElementById("sea").dataset.weather = "breezy"; });
  console.log("haunt:", await page.evaluate(() => window.Deckhand.sea("haunt")));
  const h0 = Date.now();
  for (const t of [2300, 3200, 3700, 8900]) {
    const wait = t - (Date.now() - h0); if (wait > 0) await page.waitForTimeout(wait);
    await shot("haunt-" + String(t).padStart(5, "0"), { x: 0, y: 860, width: 1920, height: 220 });
  }
  await page.waitForTimeout(7000);
  // Halloween boot: all lit
  await open("#t=2026-10-30T10:30");
  await shot("board-halloween");
  console.log("halloween lit:", await page.evaluate(() => [...document.querySelectorAll("#ocPumpkins .ocPumpkin")].map(p => p.classList.contains("lit"))));
  await open("#t=2026-10-27T10:30");
  console.log("oct27 lit:", await page.evaluate(() => [...document.querySelectorAll("#ocPumpkins .ocPumpkin")].map(p => p.classList.contains("lit"))));
  // 8 m check: one third
  await page.setViewportSize({ width: 640, height: 360 });
  await page.waitForTimeout(400);
  await shot("board-third");
  console.log("errors:", errs);
  await br.close();
})();
