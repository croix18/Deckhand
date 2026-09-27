/* Render the tape's October side offline: swap AudioContext for an OfflineAudioContext
   that suspends every 0.3 s of audio time; the widget's own tick() (real time, 120 ms)
   resumes it and schedules the next bars. node render-lofi.js <seconds> <out.wav> */
const { chromium } = require("playwright");
const fs = require("fs");
const SECS = +process.argv[2] || 90, OUT = process.argv[3] || "/tmp/graveyard.wav";
(async () => {
  const br = await chromium.launch();
  const page = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", e => console.log("pageerror", String(e)));
  await page.addInitScript(secs => {
    const SR = 44100;
    window.__off = null;
    const Off = function(){ window.__off = new OfflineAudioContext(2, Math.round(SR * secs), SR); return window.__off; };
    window.AudioContext = Off; window.webkitAudioContext = Off;
  }, SECS + 1);
  await page.goto("file://" + require("path").resolve(__dirname, "../../Deckhand.html") + "#t=2026-10-14T10:30");
  await page.waitForFunction(() => !!window.Deckhand);
  if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
  await page.click("#addBtn"); await page.click("#addMusicBtn");
  await page.waitForSelector(".muNext");
  for (let i = 0; i < 10; i++) await page.click(".muNext");
  const name = await page.textContent(".muWhat");
  console.log("side:", name);
  if (!/Graveyard/.test(name)) throw new Error("wrong side");
  await page.click(".muPlay");
  await page.waitForTimeout(200);
  const b64 = await page.evaluate(async secs => {
    const ctx = window.__off;
    if (!ctx) throw new Error("no offline ctx");
    const step = 0.3;
    for (let t = step; t < secs; t += step) ctx.suspend(t).then(() => {});   // the widget's tick resumes each one
    const buf = await ctx.startRendering();
    // 16-bit stereo WAV
    const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate;
    const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); out.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt ");
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
    w(36, "data"); out.setUint32(40, n * ch * 2, true);
    const chans = []; for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    let o = 44, peak = 0;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++){ const v = chans[c][i]; if (Math.abs(v) > peak) peak = Math.abs(v); }
    const g = peak > 0 ? Math.min(1, 0.89 / peak) : 1;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++){ const v = Math.max(-1, Math.min(1, chans[c][i] * g)); out.setInt16(o, v < 0 ? v * 32768 : v * 32767, true); o += 2; }
    const bytes = new Uint8Array(out.buffer); let s = ""; const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return { b64: btoa(s), peak };
  }, SECS);
  fs.writeFileSync(OUT, Buffer.from(b64.b64, "base64"));
  console.log("wrote", OUT, "peak", b64.peak);
  await br.close();
})();
