/* Records the serpent prototype (tools/proofs/serpent.html) frame by frame, the clock stepped exactly (no dropped
   frames), and assembles 60 fps clips with ffmpeg.
   node tools/proofs/serpent-record.js clips OUTDIR [parts]  — parts: pass,battle-a,battle-b,battle-c,battle-d,ice
   node tools/proofs/serpent-record.js plans [n]             — the battle each seed 1…n plays (opener > exchanges > finisher)
   node tools/proofs/serpent-record.js cost                  — script time per frame (render() inclusive), 1× and 4× CPU throttle */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), os = require("os"), { execSync } = require("child_process");
const PROTO = "file://" + path.join(__dirname, "serpent.html");
const FF = fs.existsSync("/usr/local/bin/ffmpeg") ? "/usr/local/bin/ffmpeg" : "ffmpeg";
/* the recorded battles: two the boat wins, two the serpent wins, no two alike */
const BATTLES = { "battle-a": 1, "battle-b": 2, "battle-c": 3, "battle-d": 4 };
const CLIPS = {
  /* × 2 close-up of a normal pass: a 960 × 100 window, the arcs and the stop to look round */
  "pass": { q: "scene=pass&vb=900,100,960,100&w=1920", w: 1920, h: 200, t0: .5, dur: 16 },
  /* × 2 on the frozen sea: under the ice, under the boat, up through the ice on the far side, back under */
  "ice": { q: "scene=ice&vb=480,100,960,100&w=1920", w: 1920, h: 200, t0: 0, dur: 20 }
};
for (const [k, seed] of Object.entries(BATTLES)) CLIPS[k] = { q: "scene=battle&seed=" + seed + "&vb=446,30,880,170&w=1920", w: 1920, h: 370, t0: 0, dur: null };
async function open(br, q, w, h){ const p = await (await br.newContext({ viewport: { width: w, height: h } })).newPage(); await p.goto(PROTO + "?" + q); await p.waitForFunction(() => !!window.render); return p; }
(async () => {
  const cmd = process.argv[2], br = await chromium.launch();
  if (cmd === "clips"){
    const out = path.resolve(process.argv[3] || "."), parts = (process.argv[4] || Object.keys(CLIPS).join(",")).split(",");
    fs.mkdirSync(out, { recursive: true });
    for (const name of parts){ const c = CLIPS[name], p = await open(br, c.q, c.w, c.h), dir = path.join(os.tmpdir(), "serp-" + name);
      const dur = c.dur || await p.evaluate(() => window.SCENE_DUR), n = Math.round(dur * 60);
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
      for (let i = 0; i < n; i++){ await p.evaluate(t => window.render(t), c.t0 + i / 60); await p.screenshot({ path: path.join(dir, "f" + String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 }); }
      const file = path.join(out, "serpent-" + name + ".mp4");
      execSync(`${FF} -y -loglevel error -framerate 60 -i ${dir}/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 24 -preset slow -tune animation -movflags +faststart ${file}`);
      const plan = await p.evaluate(() => (window.PLAN || []).filter(x => x[0] !== "@").join(" > "));
      console.log(path.basename(file), (fs.statSync(file).size / 1048576).toFixed(2) + " MB", n + " frames", plan); await p.context().close(); }
  }
  if (cmd === "plans"){ const p = await open(br, "scene=battle&seed=1", 400, 100);
    for (let s = 1; s <= +(process.argv[3] || 20); s++){ await p.goto(PROTO + "?scene=battle&seed=" + s); await p.waitForFunction(() => !!window.render);
      console.log(s, await p.evaluate(() => window.PLAN.filter(x => x[0] !== "@").join(" > ") + " | " + window.SCENE_DUR.toFixed(1) + " s")); } }
  if (cmd === "cost"){
    for (const q of ["scene=pass", "scene=battle&seed=1", "scene=battle&seed=3", "scene=battle&seed=4", "scene=ice"]){
      const p = await open(br, q, 1920, 200), cdp = await p.context().newCDPSession(p);
      for (const rate of [1, 4]){
        await cdp.send("Emulation.setCPUThrottlingRate", { rate });
        /* step the clock across the whole act so every beat is costed, not just the first seconds */
        let r; for (let rep = 0; rep < 3; rep++) r = await p.evaluate(() => { const d = window.SCENE_DUR, ts = []; window.STATS.frames = 0; window.STATS.ms = 0;   /* the last of three runs: warmed up */
          for (let i = 0; i < 600; i++){ const a = performance.now(); window.render(i / 600 * d); ts.push(performance.now() - a); }
          ts.sort((x, y) => x - y); return { mean: +(window.STATS.ms / window.STATS.frames).toFixed(3), p95: +ts[570].toFixed(2), max: +ts[599].toFixed(2) }; });
        console.log(q.padEnd(22), "throttle " + rate + "×", JSON.stringify(r)); }
      await p.context().close(); }
  }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
