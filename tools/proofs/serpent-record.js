/* Records the serpent prototype (tools/proofs/serpent.html) and today's live serpent (Deckhand.html) frame by frame,
   with the clock stepped exactly (no dropped frames), and assembles 60 fps clips with ffmpeg.
   node tools/proofs/serpent-record.js stills OUTDIR            — a few still frames of each scene
   node tools/proofs/serpent-record.js clips OUTDIR [fps] [parts] — the clips: compare, attack, close (+ a GIF), ice
   node tools/proofs/serpent-record.js cost                     — frame cost of the new serpent, real time, 4× CPU throttle */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "../.."), PROTO = "file://" + path.join(__dirname, "serpent.html"), APP = "file://" + path.join(ROOT, "Deckhand.html");
async function proto(br, q, w, h){ const p = await (await br.newContext({ viewport: { width: w, height: h } })).newPage(); await p.goto(PROTO + "?" + q); await p.waitForFunction(() => !!window.render); return p; }
async function frames(page, dur, fps, dir, clip, t0){
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++){
    await page.evaluate(t => window.render(t), (t0 || 0) + i / fps);
    await page.screenshot({ path: path.join(dir, "f" + String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92, clip });
  }
  return n;
}
async function liveFrames(br, dur, fps, dir){
  fs.mkdirSync(dir, { recursive: true });
  const page = await (await br.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "no-preference" })).newPage();
  await page.goto(APP + "#t=2026-11-18T13:00");
  await page.waitForFunction(() => !!window.Deckhand);
  if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
  await page.waitForTimeout(400);
  await page.addStyleTag({ content: "#greetToast{display:none !important} #nvScarecrow,#nvSquirrel,#nvTurkey,#dock{visibility:hidden !important}" });
  await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); document.body.dataset.sea = "breezy"; try { window.Deckhand.seaModule.clear(); } catch(e){} });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.Deckhand.sea("serpent"));
  await page.waitForTimeout(100);
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++){
    await page.evaluate(t => { const el = document.getElementById("sea-serpent");
      document.getAnimations().forEach(a => { try { a.pause(); const tg = a.effect && a.effect.target; a.currentTime = (tg && el.contains(tg) ? 0 : 2800) + t * 1000; } catch(e){} }); }, i / fps);
    await page.screenshot({ path: path.join(dir, "f" + String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92, clip: { x: 0, y: 880, width: 1920, height: 200 } });
  }
  return n;
}
function mp4(dir, fps, out, extra){ execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${dir}/f%05d.jpg ${extra || ""} -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart ${out}`); }
(async () => {
  const cmd = process.argv[2], out = path.resolve(process.argv[3] || "."), fps = +(process.argv[4] || 60);
  const br = await chromium.launch();
  if (cmd === "stills"){
    fs.mkdirSync(out, { recursive: true });
    for (const [scene, ts] of [["pass", [5, 6.5, 8, 10, 12.5, 14, 17, 19.5]], ["attack", [1.5, 6, 9.5, 10.6, 12, 13.8, 16.5, 18.5]], ["ice", [8, 10, 14]]]){
      const p = await proto(br, "scene=" + scene, 1920, 200);
      for (const t of ts){ await p.evaluate(t => window.render(t), t); await p.screenshot({ path: path.join(out, scene + "-" + t + ".png") }); }
    }
  }
  if (cmd === "clips"){
    const parts = (process.argv[5] || "compare,attack,close,ice").split(","), tmp = path.join(require("os").tmpdir(), "serp-frames");
    let p;
    /* (a) compare: today's live pass on top, the new pass below, the same 1920 × 200 strip, the same 26 s */
    if (parts.includes("compare")){
    await liveFrames(br, 26, fps, tmp + "/live");
    p = await proto(br, "scene=pass", 1920, 200); await frames(p, 26, fps, tmp + "/pass");
    mp4(tmp + "/live", fps, tmp + "/live.mp4"); mp4(tmp + "/pass", fps, tmp + "/pass.mp4");
    execSync(`ffmpeg -y -loglevel error -i ${tmp}/live.mp4 -i ${tmp}/pass.mp4 -filter_complex "[0:v]drawtext=text='TODAY':x=12:y=10:fontsize=18:fontcolor=0xB5542A[a];[1:v]drawtext=text='NEW':x=12:y=10:fontsize=18:fontcolor=0x127A85[b];[a][b]vstack" -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart ${out}/serpent-compare.mp4`); }
    /* (b) the attack, a 960 × 200 window round the boat, drawn at × 2 */
    if (parts.includes("attack")){ p = await proto(br, "scene=attack&vb=520,100,960,100&w=1920", 1920, 200); await frames(p, 20, fps, tmp + "/attack"); mp4(tmp + "/attack", fps, out + "/serpent-attack.mp4"); }
    /* (c) × 3 close-up of the new pass: a 640 × 100 window (x 880–1520), 6 → 16 s */
    if (parts.includes("close")){ p = await proto(br, "scene=pass&vb=880,100,640,100&w=1920", 1920, 300); fs.rmSync(tmp + "/close", { recursive: true, force: true }); await frames(p, 10, fps, tmp + "/close", undefined, 6); mp4(tmp + "/close", fps, out + "/serpent-closeup-x3.mp4");
    execSync(`ffmpeg -y -loglevel error -ss 0 -t 9 -i ${out}/serpent-closeup-x3.mp4 -vf "fps=20,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48[p];[s1][p]paletteuse=dither=none" -loop 0 ${out}/serpent-closeup-x3.gif`); }
    /* (d) one pass on the frozen sea */
    if (parts.includes("ice")){ p = await proto(br, "scene=ice", 1920, 200); await frames(p, 26, 30, tmp + "/ice"); mp4(tmp + "/ice", 30, out + "/serpent-ice.mp4"); }
    fs.readdirSync(out).forEach(f => console.log(f, (fs.statSync(path.join(out, f)).size / 1024).toFixed(0) + " KB"));
  }
  if (cmd === "cost"){
    const p = await proto(br, "scene=pass&play=1", 1920, 200), cdp = await p.context().newCDPSession(p);
    for (const rate of [1, 4]){
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      const r = await p.evaluate(() => new Promise(res => { window.STATS.frames = 0; window.STATS.ms = 0; const d = []; let last = performance.now();
        (function f(now){ d.push(now - last); last = now; if (d.length < 240) requestAnimationFrame(f); else { d.sort((a, b) => a - b); res({ jsPerFrame: +(window.STATS.ms / window.STATS.frames).toFixed(3), medianFrame: +d[120].toFixed(1), p95Frame: +d[228].toFixed(1) }); } })(last); }));
      console.log("throttle " + rate + "×", JSON.stringify(r));
    }
  }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
