/* v7.65: December's winter ON THE BOARD (Deckhand.html), 1920 × 1080, the clock faked with the #t= override.
   node tools/proofs/winter-december.js shots [OUT]     — the board at Nov 24, Nov 30, Dec 3, Dec 7, Dec 10, Dec 14, Dec 18, Jan 6
                                                           (locked, the motion paused at a fixed moment), plus 3× crops of the frost,
                                                           a flake, the snowman and the frost at its designed peak (s = 1, Frost.paintAt)
   node tools/proofs/winter-december.js clip OUT snow|manatee|visit
                                                         — a frame-exact MP4: every animation on the page paused and stepped together
                                                           (snow: a flurry over the frost, the right edge; manatee: the whole act; visit:
                                                           its arrival and its leaving)
   node tools/proofs/winter-december.js cost            — script time per frame at 1× and 4× CPU throttle with snow falling and the
                                                           frost showing (a trace: every main-thread task between two frames), and the
                                                           style / layout passes per frame
   CHROME=/path/to/chrome uses a system Chrome. */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), os = require("os"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..", "..");
const APP = "file://" + path.join(ROOT, "Deckhand.html");
const OUT = path.join(ROOT, "docs/reviews/winter-build/december");
const FF = fs.existsSync("/usr/local/bin/ffmpeg") ? "/usr/local/bin/ffmpeg" : "ffmpeg";
const launchOpts = process.env.CHROME ? { executablePath: process.env.CHROME } : {};
const DATES = [["2026-11-24", "T10:30"], ["2026-11-30", "T10:30"], ["2026-12-03", "T10:30"], ["2026-12-07", "T10:30"],
               ["2026-12-10", "T10:30"], ["2026-12-14", "T10:30"], ["2026-12-18", "T10:30"], ["2027-01-06", "T10:30"]];
async function board(br, hash, opts){
  opts = opts || {};
  const p = await (await br.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "no-preference" })).newPage();
  p.on("pageerror", e => console.error("pageerror:", e.message));
  await p.goto(APP + hash); await p.waitForFunction(() => !!window.Deckhand);
  await p.evaluate(() => { const l = document.getElementById("launchBtn"); if (document.body.classList.contains("landing") && l) l.click(); });
  await p.waitForTimeout(600);
  if (!opts.unlocked && !(await p.evaluate(() => document.body.classList.contains("locked")))) await p.click("#lockBtn").catch(() => {});
  await p.addStyleTag({ content: "#greetToast{display:none !important} #dateline .sim{display:none !important}" });
  await p.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); try { window.Deckhand.seaModule.clear(); } catch(e){} });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const S = window.Deckhand.season; S.frost.reset(); S.frost.step(true); });
  await p.waitForTimeout(5200);   // the idle paint and its 4 s fade
  return p;
}
async function freeze(p, ms){ await p.evaluate(ms => { document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = ms; } catch(e){} }); }, ms || 2800); }
async function zoom(src, out, crop, k){
  /* a crop of a screenshot at k× (nearest neighbor, so every pixel is seen as it is) */
  execSync(`${FF} -y -loglevel error -i ${src} -vf "crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=iw*${k}:ih*${k}:flags=neighbor" ${out}`);
}
(async () => {
  const cmd = process.argv[2], br = await chromium.launch(launchOpts);
  fs.mkdirSync(OUT, { recursive: true });
  if (cmd === "shots"){
    const dir = process.argv[3] ? path.resolve(process.argv[3]) : OUT;
    for (const [d, t] of DATES){
      const p = await board(br, "#t=" + d + t);
      await freeze(p);
      const f = path.join(dir, "board-" + d + ".png");
      await p.screenshot({ path: f });
      const info = await p.evaluate(() => { const S = window.Deckhand.season, st = S.winterStages(); return { st, frost: S.frost.stats(), sm: S.snowman.stage(), lit: (S.lights.count() || {}).lit,
}; });
      console.log(d, JSON.stringify({ st: info.st, frost: info.frost, sm: info.sm, lit: info.lit }));
      if (d === "2026-12-14"){
        /* the frost at 3× and the snowman at 3× */
        const fb = await p.evaluate(() => { const c = document.querySelector("#wnFrostBox .wnFrost.on"); if (!c) return null; const b = c.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; });
        if (fb){ await zoom(f, path.join(dir, "frost-dec14-3x.png"), { x: Math.max(0, fb.x + fb.w - 300), y: fb.y, w: Math.min(300, fb.w), h: Math.min(260, fb.h) }, 3); }
        const sb = await p.evaluate(() => { const b = document.getElementById("wnSnowman").getBoundingClientRect(); return { x: Math.round(b.left) - 10, y: Math.round(b.top) - 10, w: Math.round(b.width) + 20, h: Math.round(b.height) + 20 }; });
        await zoom(f, path.join(dir, "snowman-dec14-3x.png"), sb, 3);
        /* the frost at its designed peak (s = 1): the generator the January version will use, painted now */
        await p.evaluate(() => window.Deckhand.season.frost.paintAt(1));
        await p.waitForTimeout(4400);
        await p.screenshot({ path: path.join(dir, "frost-peak-s1.png"), clip: { x: 1180, y: 0, width: 740, height: 720 } });
        console.log("peak", JSON.stringify(await p.evaluate(() => window.Deckhand.season.frost.stats())));
      }
      if (d === "2026-11-30" || d === "2026-12-07"){
        const sb = await p.evaluate(() => { const b = document.getElementById("wnSnowman").getBoundingClientRect(); return { x: Math.round(b.left) - 10, y: Math.round(b.top) - 10, w: Math.round(b.width) + 20, h: Math.round(b.height) + 20 }; });
        await zoom(f, path.join(dir, "snowman-" + d.slice(5) + "-3x.png"), sb, 3);
      }
      if (d === "2026-12-10"){
        /* a flake at 3×: one of each kind laid still in the right column */
        await p.evaluate(() => { const S = window.Deckhand.season.snow; S.spawn({ kind: "dendrite", size: 24, x: .9, at: .3 }); S.spawn({ kind: "plate", size: 20, x: .95, at: .36 }); S.spawn({ kind: "fleck", x: .87, at: .42 }); });
        await freeze(p, 9000);
        await p.waitForTimeout(100);
        const g = path.join(dir, "flakes-dec10.png");
        await p.screenshot({ path: g });
        const fr = await p.evaluate(() => [...document.querySelectorAll(".wnFlake.on")].map(e => { const b = e.querySelector(e.dataset.k === "f" ? ".wnFleck" : ".wnCrys").getBoundingClientRect(); return { k: e.dataset.k, x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; }));
        console.log("flakes", JSON.stringify(fr));
        fr.forEach(b => { zoom(g, path.join(dir, "flake-" + b.k + "-3x.png"), { x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 }, 3); });
        fs.unlinkSync(g);
      }
      await p.context().close();
    }
  }
  if (cmd === "clip"){
    const out = path.resolve(process.argv[3]), which = process.argv[4] || "snow";
    const p = await board(br, which === "visit" ? "#t=2026-12-15T10:30" : "#t=2026-12-10T10:30");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wnclip-"));
    /* the director's end-of-act timers run on the wall clock, and a frame-exact recording takes far longer than the act:
       drop the long ones (the act's end, the boat's reaction, the gull's return) while the act is started */
    await p.evaluate(() => { const st = window.setTimeout; window.__st = st; window.setTimeout = function(f, ms){ return ms > 20000 ? 0 : st.apply(window, arguments); }; });
    let n, clip, fps = 30, step;
    if (which === "snow"){
      /* a flurry's worth in 22 s: three flakes started at staggered points of their fall, over the frost's column */
      await p.evaluate(() => { const S = window.Deckhand.season.snow; S.spawn({ kind: "dendrite", size: 24, x: .9, at: .0 }); S.spawn({ kind: "fleck", x: .95, at: .38 }); S.spawn({ kind: "plate", size: 20, x: .875, at: .7 }); });
      n = 22 * fps; clip = { x: 1180, y: 0, width: 740, height: 1080 }; step = (t) => t;
    } else if (which === "manatee"){
      await p.evaluate(() => { const M = window.Deckhand.seaModule; M.clear(); M.residents.gull = true; document.getElementById("boat").classList.add("gull"); M.play("manatee", "near"); });
      n = 50 * fps; clip = { x: 560, y: 900, width: 1360, height: 180 }; step = (t) => t;
    } else {
      await p.evaluate(() => { const M = window.Deckhand.seaModule; M.clear(); M.residents.gull = true; document.getElementById("boat").classList.add("gull"); M.play("visit"); });
      n = 16 * fps; clip = { x: 1080, y: 380, width: 840, height: 700 }; step = (t) => t < 9 ? t : 231 + (t - 9);   // the arrival, then the leaving
    }
    await p.evaluate(() => { window.setTimeout = window.__st; });
    await p.evaluate(() => { window.__a = document.getAnimations(); window.__b = window.__a.map(x => x.currentTime || 0); window.__a.forEach(x => x.pause()); });
    for (let i = 0; i < n; i++){
      const t = step(i / fps);
      await p.evaluate(t => { window.__a.forEach((x, k) => { try { x.currentTime = window.__b[k] + t * 1000; } catch(e){} }); }, t);
      await p.screenshot({ path: path.join(dir, "f" + String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 90, clip });
    }
    execSync(`${FF} -y -loglevel error -framerate ${fps} -i ${dir}/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 27 -preset slow -tune animation -movflags +faststart ${out}`);
    console.log(path.basename(out), (fs.statSync(out).size / 1048576).toFixed(2) + " MB", n + " frames, frames in " + dir);
  }
  if (cmd === "cost"){
    /* three runs: the board on Nov 18 (November, the baseline), Dec 14 with the frost and no snow, Dec 14 with the frost and
       three flakes falling (the cap) */
    for (const [label, hash, snow] of [["nov18 (baseline)", "#t=2026-11-18T10:30", false], ["dec14 frost", "#t=2026-12-14T10:30", false], ["dec14 frost+snow", "#t=2026-12-14T10:30", true]]){
    const p = await board(br, hash), cdp = await p.context().newCDPSession(p);
    for (const rate of [1, 4]){
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await p.evaluate(snow => { const S = window.Deckhand.season.snow; S.clear(); if (snow){ S.spawn({ kind: "dendrite", x: .9, at: 0 }); S.spawn({ kind: "plate", x: .06, at: .05 }); S.spawn({ kind: "fleck", x: .94, at: .1 }); } }, snow);
      await p.waitForTimeout(1000);
      const ev = [];
      cdp.on("Tracing.dataCollected", d => ev.push(...d.value));
      const done = new Promise(r => cdp.once("Tracing.tracingComplete", r));
      await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline.frame", transferMode: "ReportEvents" });
      await p.waitForTimeout(10000);
      await cdp.send("Tracing.end"); await done;
      const main = ev.find(e => e.name === "TracingStartedInBrowser") || {};
      /* the renderer's main thread: the thread that ran the frames' BeginMainThreadFrame */
      const bm = ev.filter(e => e.name === "BeginMainThreadFrame"), tid = bm.length ? bm[0].tid : null, pid = bm.length ? bm[0].pid : null;
      const frames = bm.filter(e => e.tid === tid).map(e => e.ts).sort((a, b) => a - b);
      const SCRIPT = new Set(["FunctionCall", "EvaluateScript", "TimerFire", "FireAnimationFrame", "EventDispatch", "RunMicrotasks", "v8.callFunction", "FireIdleCallback"]);
      const top = ev.filter(e => e.pid === pid && e.tid === tid && e.ph === "X" && SCRIPT.has(e.name));
      const per = new Array(Math.max(0, frames.length - 1)).fill(0);
      top.forEach(e => { let lo = 0, hi = frames.length - 1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (frames[m] <= e.ts) lo = m; else hi = m - 1; } if (lo < per.length) per[lo] += e.dur / 1000; });
      /* nested script events would double count: keep only top-level ones (not inside another script event) */
      const style = ev.filter(e => e.pid === pid && e.tid === tid && e.name === "UpdateLayoutTree").length, layout = ev.filter(e => e.pid === pid && e.tid === tid && e.name === "Layout").length;
      const sorted = per.slice().sort((a, b) => a - b), q = f => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))].toFixed(2) : 0;
      const byName = {}; top.forEach(e => { const d = (e.args && e.args.data) || {}; const k = e.name + " " + (d.functionName || d.type || "") + " " + (d.url ? d.url.split("/").pop() : "") + ":" + (d.lineNumber || ""); byName[k] = (byName[k] || 0) + e.dur / 1000; });
      const heavy = Object.entries(byName).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => k.trim() + " " + v.toFixed(1) + "ms").join(" | ");
      console.log(label.padEnd(18), rate + "×", JSON.stringify({ frames: per.length, mean: +(per.reduce((s, x) => s + x, 0) / Math.max(1, per.length)).toFixed(3), p95: q(.95), p99: q(.99), max: q(1),
        styleRecalcs: style, layouts: layout, perFrameStyle: +(style / Math.max(1, per.length)).toFixed(3), perFrameLayout: +(layout / Math.max(1, per.length)).toFixed(3), flakes: await p.evaluate(() => window.Deckhand.season.snow.count()) }));
      console.log("   top script:", heavy);
      cdp.removeAllListeners("Tracing.dataCollected");
    }
    await p.context().close();
    }
  }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
