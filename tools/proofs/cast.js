/* Close-ups via the CDP screencast (compositor-rate frames at 2x), cropped afterwards. */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const OUT = "tools/proofs/out/cast";
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
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
  const cdp = await ctx.newCDPSession(page);
  const record = async (name, durMs, events) => {
    const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    const frames = []; let i = 0;
    const onFrame = async ev => {
      fs.writeFileSync(path.join(dir, "f" + String(i).padStart(5, "0") + ".jpg"), Buffer.from(ev.data, "base64"));
      frames.push({ i, t: ev.metadata.timestamp }); i++;
      try { await cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }); } catch (e) {}
    };
    cdp.on("Page.screencastFrame", onFrame);
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 3840, maxHeight: 2160, everyNthFrame: 1 });
    const t0 = Date.now(); const pending = events.slice();
    while (Date.now() - t0 < durMs) {
      while (pending.length && pending[0].at <= Date.now() - t0) await pending.shift().fn();
      await page.waitForTimeout(20);
    }
    await cdp.send("Page.stopScreencast"); cdp.off("Page.screencastFrame", onFrame);
    let list = "";
    for (let k = 0; k < frames.length; k++) {
      const d = k + 1 < frames.length ? frames[k + 1].t - frames[k].t : 0.05;
      list += `file 'f${String(frames[k].i).padStart(5, "0")}.jpg'\nduration ${Math.max(0.005, d).toFixed(4)}\n`;
    }
    list += `file 'f${String(frames[frames.length - 1].i).padStart(5, "0")}.jpg'\n`;
    fs.writeFileSync(path.join(dir, "list.txt"), list);
    console.log(name, frames.length, "frames,", ((frames[frames.length - 1].t - frames[0].t)).toFixed(1), "s");
  };
  const wb = await page.locator("#ocWeb").boundingBox();
  fs.writeFileSync(path.join(OUT, "web-box.json"), JSON.stringify(wb));
  // the web: glint from waveMotion-on (6 s), the drop at 7.5 s, a re-drop at 10.5 s
  await record("web", 16000, [
    { at: 100, fn: () => page.evaluate(() => document.body.classList.add("waveMotion")) },
    { at: 7500, fn: () => page.locator("#ocWeb .ocSpider").dispatchEvent("pointerdown") },
    { at: 10500, fn: () => page.locator("#ocWeb .ocSpider").dispatchEvent("pointerdown") }
  ]);
  await page.waitForTimeout(500);
  await record("flock", 11800, [{ at: 100, fn: () => page.evaluate(() => window.Deckhand.sea("bats")) }]);
  await br.close();
})();
