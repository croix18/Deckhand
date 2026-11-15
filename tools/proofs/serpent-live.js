/* v7.64: the year-round serpent ON THE BOARD (Deckhand.html, not the prototype), at 1× and 1920 × 1080.
   node tools/proofs/serpent-live.js cost                — script time per frame (Serpent.render inclusive), 1× and 4× CPU throttle,
                                                           the pass and four battles stepped across the whole act at 60 fps, three runs (the last reported)
   node tools/proofs/serpent-live.js clip OUT pass|SEED  — a frame-exact 60 fps MP4 of the board's bottom strip: every CSS animation on
                                                           the page (the waves, the boat's swell) is paused and stepped with the act's clock
   node tools/proofs/serpent-live.js shot OUT HASH       — a 1920 × 1080 screenshot of the board at the #t= moment
   CHROME=/path/to/chrome uses a system Chrome. */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), os = require("os"), { execSync } = require("child_process");
const APP = "file://" + path.join(__dirname, "..", "..", "Deckhand.html");
const FF = fs.existsSync("/usr/local/bin/ffmpeg") ? "/usr/local/bin/ffmpeg" : "ffmpeg";
const launchOpts = process.env.CHROME ? { executablePath: process.env.CHROME } : {};
async function board(br, hash){
  const p = await (await br.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  p.on("pageerror", e => console.error("pageerror:", e.message));
  await p.goto(APP + hash); await p.waitForFunction(() => !!window.Deckhand);
  await p.evaluate(() => { const l = document.getElementById("launchBtn"); if (document.body.classList.contains("landing") && l) l.click(); });
  await p.waitForTimeout(1200);
  return p;
}
/* start an act by hand: the pass, or a battle with this seed (Serpent.start takes the seed through Math.random's next draw) */
async function begin(p, which){
  /* straight to Serpent (not through Sea.play): the director's end-of-act timer runs on the wall clock, and a
     frame-exact recording takes far longer than the act */
  return p.evaluate(which => {
    const M = window.Deckhand.seaModule, S = M.serpent; M.clear(); S.hold(true);
    const host = document.getElementById(which === "pass" ? "sea-serpent" : "sea-attack");
    host.classList.add("go"); if (which !== "pass") document.getElementById("boat").classList.add("battle");   // the sea is busy: nothing else plays
    S.start(which === "pass" ? "pass" : "battle", host, which === "pass" ? {} : { seed: +which, gullHome: false });
    return S.act();
  }, which);
}
(async () => {
  const cmd = process.argv[2], br = await chromium.launch(launchOpts);
  if (cmd === "cost"){
    const p = await board(br, "#t=2026-12-09T10:30"), cdp = await p.context().newCDPSession(p);
    for (const which of ["pass", "1000", "2000", "3000", "4000"]){
      const a = await begin(p, which);
      for (const rate of (process.env.RATES || "1,4").split(",").map(Number)){
        await cdp.send("Emulation.setCPUThrottlingRate", { rate });
        /* paced as on the board: one frame per requestAnimationFrame (the browser keeps its idle time between frames) */
        /* warmed first (every beat's code compiled: 200 frames across the act, unpaced), then one paced run */
        await p.evaluate(d => { const S = window.Deckhand.seaModule.serpent; for (let i = 0; i < 200; i++) S.render(i / 200 * d); }, a.dur);
        const r = await p.evaluate(d => new Promise(done => { const S = window.Deckhand.seaModule.serpent, n = Math.round(d * 60), ts = [], big = [];
          let i = 0; (function f(){ const a = performance.now(); S.render(i / 60); const x = performance.now() - a; ts.push(x); if (x > 8) big.push(i + ":" + x.toFixed(0)); if (++i < n) requestAnimationFrame(f); else {
            ts.sort((x, y) => x - y); const q = f => +ts[Math.min(n - 1, Math.floor(n * f))].toFixed(2);
            done({ frames: n, mean: +(ts.reduce((s, x) => s + x, 0) / n).toFixed(2), p95: q(.95), p99: q(.99), max: +ts[n - 1].toFixed(2), over8: big.join(" ") }); } })(); }), a.dur);
        console.log((which === "pass" ? "pass" : "battle " + which + " " + a.plan.join(">")).padEnd(40), rate + "×", JSON.stringify(r));
      }
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    }
  }
  if (cmd === "clip"){
    const out = path.resolve(process.argv[3]), which = process.argv[4] || "pass", p = await board(br, "#t=2026-12-09T10:30");
    const a = await begin(p, which), dir = fs.mkdtempSync(path.join(os.tmpdir(), "srp-")), n = Math.round(a.dur * 60);
    /* every CSS animation on the page (the waves, the boat's swell and chop) paused, then stepped with the act */
    await p.evaluate(() => { window.__anims = document.getAnimations().filter(x => x.playState !== "finished"); window.__base = window.__anims.map(x => x.currentTime || 0); window.__anims.forEach(x => x.pause()); });
    for (let i = 0; i < n; i++){
      await p.evaluate(t => { window.__anims.forEach((x, k) => { if (x.animationName !== "boatDrift") x.currentTime = window.__base[k] + t * 1000; }); window.Deckhand.seaModule.serpent.render(t); }, i / 60);
      await p.screenshot({ path: path.join(dir, "f" + String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 90, clip: { x: 0, y: 800, width: 1920, height: 280 } });
    }
    execSync(`${FF} -y -loglevel error -framerate 60 -i ${dir}/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 26 -preset slow -tune animation -movflags +faststart ${out}`);
    console.log(path.basename(out), (fs.statSync(out).size / 1048576).toFixed(2) + " MB", n + " frames", a.plan ? a.plan.join(" > ") + " (" + a.winner + " wins)" : "pass", "frames in " + dir);
  }
  if (cmd === "shot"){ const p = await board(br, process.argv[4]); await p.screenshot({ path: path.resolve(process.argv[3]) }); }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
