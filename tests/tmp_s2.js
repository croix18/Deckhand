const { chromium } = require("@playwright/test");
const S = "/tmp/claude-0/-home-claude/9c263194-4534-5f52-899e-1d11311f20aa/scratchpad/s2/";
const fs = require("fs"); fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; page.on("pageerror", e => errs.push(String(e))); page.on("console", m => { if (m.type()==="error" && !/ERR_TUNNEL/.test(m.text())) errs.push(m.text()); });
  await page.goto("file:///home/claude/deckhand/Deckhand.html#t=2026-09-28T09:40:00");
  await page.waitForFunction(() => !!window.Deckhand);
  await page.click("#launchBtn"); await page.waitForTimeout(600);
  const info = await page.evaluate(() => ({
    weather: document.body.dataset.sea,
    boatAnim: getComputedStyle(document.querySelector("#boat .btSwell")).animationName,
    boatDur: getComputedStyle(document.querySelector("#boat .btSwell")).animationDuration,
    boatDelay: getComputedStyle(document.querySelector("#boat .btSwell")).animationDelay,
    wv1: getComputedStyle(document.getElementById("wv1")).animationDuration,
    wv1tf: getComputedStyle(document.querySelector("#boat .btSwell")).animationTimingFunction,
    rect: document.getElementById("boat").getBoundingClientRect().toJSON(),
    current: window.Deckhand.seaCurrent ? window.Deckhand.seaCurrent() : "n/a"
  }));
  console.log(JSON.stringify(info));
  for (let i = 0; i < 12; i++) { await page.screenshot({ path: `${S}ride-${String(i).padStart(2,"0")}.png`, clip: { x: 640, y: 990, width: 500, height: 90 } }); await page.waitForTimeout(700); }
  await page.screenshot({ path: `${S}full.png` });
  console.log("errors:", errs);
  await b.close();
})();
