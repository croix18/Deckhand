/* Winter design proofs (docs/reviews/winter-design.md, winter-animation.md).
   node tools/proofs/winter.js capture   — opens the real Deckhand.html at four winter dates (the
                                            #t= override the tests use), pauses its motion at a fixed
                                            time, photographs the board and writes the geometry the
                                            proof sheet overlays its drawings on
   node tools/proofs/winter.js measure      — the frost's paint cost, written to winter-frames/cost.js
   node tools/proofs/winter.js render [crops-dir]
                                         — renders docs/reviews/winter-proofs.html to winter-proofs.png
                                            and the one-third sheet (the 8 m check), and optionally
                                            one PNG per section for a close look
   Deckhand itself is not touched: the season is null in December today, so every frame is the
   plain board, and the winter pieces are the sheet's own drawings laid over it. */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../..");
const APP = "file://" + path.join(ROOT, "Deckhand.html");
const FR = path.join(ROOT, "docs/reviews/winter-frames");
const SHEET = path.join(ROOT, "docs/reviews/winter-proofs.html");
const FRAMES = [   // v2 (Nov 14): the redesign's dates — every beat runs several days, so each composite is a typical day of its stretch
  { name: "dec02", hash: "#t=2026-12-02T10:40", sea: "breezy" },   // early December: the first week (the snowball, first frost, 3 of 14 bulbs)
  { name: "dec16", hash: "#t=2026-12-16T09:40", sea: "breezy" },   // the last week before break: the snowman finished, 12 of 14 bulbs
  { name: "jan13", hash: "#t=2027-01-13T13:20", sea: "windy" },    // mid-January: the frost at its peak, a snowing period
  { name: "jan20", hash: "#t=2027-01-20T10:40", sea: "calm", hideBoat: true },   // the full freeze: the sheet's own level, iced boat is drawn by the sheet
  { name: "jan27", hash: "#t=2027-01-27T09:50", sea: "breezy" },   // the caper week (Jan 25–29)
  { name: "feb24", hash: "#t=2027-02-24T14:10", sea: "calm" },     // late February: the puddle week, the serpent in the pail
  { name: "m1280dec", hash: "#t=2026-12-16T09:40", sea: "breezy", w: 1280, h: 800 },
  { name: "m1280jan", hash: "#t=2027-01-13T13:20", sea: "breezy", w: 1280, h: 800 },
  { name: "steward", hash: "#t=2026-12-16T09:40", sea: "breezy", steward: true },   // a dense board: every card's area is off-limits
  { name: "nov18", hash: "#t=2026-11-18T10:40", sea: "breezy", live: true }         // the live November board, the standard winter is held to
];
async function capture(){
  fs.mkdirSync(FR, { recursive: true });
  const br = await chromium.launch();
  const geo = {};
  for (const f of FRAMES){
    const ctx = await br.newContext({ viewport: { width: f.w || 1920, height: f.h || 1080 }, reducedMotion: "no-preference" });
    const page = await ctx.newPage();
    await page.goto(APP + f.hash);
    await page.waitForFunction(() => !!window.Deckhand);
    if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
    await page.waitForTimeout(400);
    await page.addStyleTag({ content: "#greetToast{display:none !important} #dateline .sim{display:none !important}" + (f.live ? "" : " #boat .btGull{visibility:hidden !important}") + (f.hideBoat ? " #boat{visibility:hidden !important}" : "") });
    if (f.steward){   // a Steward-like dense board: the clock shrinks to a card and five cards share the board
      for (const id of ["addTimerBtn", "addTextBtn", "addScoreBtn", "addTallyBtn", "addPickerBtn"]){
        try { await page.click("#addBtn", { timeout: 2000 }); await page.click("#" + id, { timeout: 2000 }); await page.waitForTimeout(150); } catch(e){ console.log("steward add", id, String(e).slice(0, 80)); }
        await page.keyboard.press("Escape").catch(() => {});
      }
      await page.evaluate(() => {
        const L = [[0, 0, 48, 62], [50, 0, 50, 46], [0, 64, 31, 36], [33, 64, 33, 36], [68, 48, 32, 52], [50, 48, 16, 14]];
        const els = Array.from(document.querySelectorAll("*")).filter(e => e._entry && e.offsetParent);
        els.sort((a, b) => (a._entry.cfg.type === "clock" ? -1 : 0) - (b._entry.cfg.type === "clock" ? -1 : 0));
        els.forEach((el, i) => { const r = L[i % L.length], c = el._entry.cfg; c.x = r[0]; c.y = r[1]; c.w = r[2]; c.h = r[3];
          el.style.left = r[0] + "%"; el.style.top = r[1] + "%"; el.style.width = r[2] + "%"; el.style.height = r[3] + "%"; });
        window.dispatchEvent(new Event("resize"));
      });
      await page.waitForTimeout(600);
    }   // the gull is the sheet's own (it moves to the snowman on Dec 18)   // the boot toast and the coral SIM tag the #t= override shows
    if (!(await page.evaluate(() => document.body.classList.contains("locked")))) await page.click("#lockBtn");   // teaching mode: no handle band
    await page.evaluate(sea => {
      window.Deckhand.config.ui.motion = "on";
      document.body.classList.add("waveMotion");
      document.body.dataset.sea = sea;
      try { window.Deckhand.seaModule.clear(); } catch(e){}
    }, f.sea);
    await page.waitForTimeout(1500);
    await page.evaluate(sea => { document.body.dataset.sea = sea; }, f.sea);   // again: the director sets the period's weather on its tick
    await page.waitForTimeout(200);
    /* the same moment in every frame: every running animation paused at 2.8 s (the boat and the
       waves started together, so the phase lock holds) */
    const g = await page.evaluate(() => {
      document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = 2800; } catch(e){} });
      const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      /* the boat's SVG → screen transform, from three markers in the rig (no reaction is running) */
      const rig = document.querySelector("#boat .btRig"), NS = "http://www.w3.org/2000/svg";
      const pts = [[0, 0], [40, 0], [0, 40]].map(p => {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", ".01"); rig.appendChild(c);
        const b = c.getBoundingClientRect(); c.remove();
        return [b.x + b.width / 2, b.y + b.height / 2];
      });
      const m = { a: (pts[1][0] - pts[0][0]) / 40, b: (pts[1][1] - pts[0][1]) / 40,
                  c: (pts[2][0] - pts[0][0]) / 40, d: (pts[2][1] - pts[0][1]) / 40, e: pts[0][0], f: pts[0][1] };
      const clock = document.querySelector(".w-clock");
      /* the clock card's free corner: every visible text/bar box in the face (the content) and every control
         on the card; the frost must keep 28 px from the content and 12 px from a control */
      const vis = el => { const b = el.getBoundingClientRect(), s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > .05; };
      const face = document.getElementById("clockFace"), content = [];
      face.querySelectorAll("*").forEach(el => { if (!vis(el) || el.closest("svg")) return;
        const own = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim()); const leaf = !el.children.length;
        if (own || leaf) content.push(Object.assign({ k: (el.id ? "#" + el.id : "") + "." + String(el.className).split(" ")[0] }, r(el))); });
      const controls = [];
      clock.querySelectorAll("button, a, input, select, [role=button], [class*=chip], [class*=Chip], [class*=stage], [class*=Stage]").forEach(el => {
        if (vis(el) && !el.closest("#clockFace")) controls.push(Object.assign({ k: (el.id ? "#" + el.id : "") + "." + String(el.className).split(" ")[0] }, r(el))); });
      const C = r(clock), right = C.x + C.w, top = C.y;
      const cR = Math.max.apply(null, content.map(b => b.x + b.w)), cT = Math.min.apply(null, content.map(b => b.y));
      const free = { uMax: Math.round(right - (cR + 28)), vTop: Math.round(cT - 28 - top), contentRight: Math.round(cR), contentTop: Math.round(cT),
                     cardH: Math.round(C.h), cardW: Math.round(C.w) };
      const cards = Array.from(document.querySelectorAll("*")).filter(e => e._entry && e.offsetParent).map(e => Object.assign({ t: e._entry.cfg.type }, r(e)));
      return { cards: cards, boat: m, clock: C, waves: r(document.getElementById("waves")), dock: r(document.getElementById("dock")),
               fs: r(document.getElementById("fsBtn")), face: r(face), content: content, controls: controls, free: free,
               W: innerWidth, H: innerHeight };
    });
    await page.screenshot({ path: path.join(FR, f.name + ".png") });
    geo[f.name] = Object.assign({ hash: f.hash, sea: f.sea }, g);
    console.log(f.name, JSON.stringify(g.free), "controls:", JSON.stringify(g.controls.map(c => [c.k, Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h)])));
    await ctx.close();
  }
  fs.writeFileSync(path.join(FR, "geometry.js"), "/* written by tools/proofs/winter.js capture */\nwindow.GEO = " + JSON.stringify(geo, null, 1) + ";\n");
  await br.close();
}

async function render(crops){
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1960, height: 1200 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto("file://" + SHEET);
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]));
  await page.waitForTimeout(300);
  const png = SHEET.replace(/\.html$/, ".png");
  await page.screenshot({ path: png, fullPage: true });
  if (crops){
    fs.mkdirSync(crops, { recursive: true });
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll("section[id]")).map(s => s.id));
    for (const id of ids) await page.locator("#" + id).screenshot({ path: path.join(crops, id + ".png") });
  }
  /* the 8 m check: the same sheet at one third */
  const dim = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  const p2 = await ctx.newPage();
  await p2.setViewportSize({ width: Math.round(dim.w / 3), height: 800 });
  /* a file:// wrapper page (Chrome's own image viewer shrinks the image to the window and undoes any
     restyling when the screenshot resizes it; setContent's about:blank may not load a file:// image) */
  const wrap = path.join(require("os").tmpdir(), "winter-8m.html");
  fs.writeFileSync(wrap, '<body style="margin:0;background:#F8F2E4"><img src="file://' + png + '" style="display:block;width:' + Math.round(dim.w / 3) + 'px;height:auto"></body>');
  await p2.goto("file://" + wrap);
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: SHEET.replace(/\.html$/, "-8m.png"), fullPage: true });
  console.log("sheet", dim, errs.length ? "ERRORS: " + errs.join(" | ") : "no errors");
  await br.close();
}

/* today's serpent, for comparison: Deckhand's own act summoned on the live board and photographed at eight
   moments of one 26 s pass (every animation in the act paused at that time) */
async function serpentLive(){
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto(APP + "#t=2026-11-18T13:00");
  await page.waitForFunction(() => !!window.Deckhand);
  if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
  await page.waitForTimeout(400);
  await page.addStyleTag({ content: "#greetToast{display:none !important} #dateline .sim{display:none !important}" });
  await page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); document.body.dataset.sea = "breezy"; try { window.Deckhand.seaModule.clear(); } catch(e){} });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.Deckhand.sea("serpent"));
  await page.waitForTimeout(300);
  const out = [];
  for (const t of [2, 5, 8, 11, 14, 17, 20, 23]){
    const box = await page.evaluate(t => {
      const el = document.getElementById("sea-serpent");
      document.getAnimations().forEach(a => { try { a.pause(); if (a.effect && a.effect.target && el.contains(a.effect.target)) a.currentTime = t * 1000; else a.currentTime = 2800; } catch(e){} });
      const b = el.querySelector(".ssSwim").getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, t);
    await page.screenshot({ path: path.join(FR, "serp-live-" + t + ".png"), clip: { x: 0, y: 990, width: 1920, height: 90 } });
    out.push(Object.assign({ t }, box));
  }
  fs.writeFileSync(path.join(FR, "serp-live.js"), "/* written by tools/proofs/winter.js serpent */\nwindow.SERP_LIVE = " + JSON.stringify(out) + ";\n");
  console.log("serpent", JSON.stringify(out.map(b => [b.t, Math.round(b.x), Math.round(b.y)])));
  await br.close();
}

/* the frost's paint cost: each stage's SVG decoded and drawn to a board-size canvas, ten times, median ms,
   with no throttle and with 4× CPU throttling (the Chromebox stand-in); written to winter-frames/cost.js */
async function measure(){
  const br = await chromium.launch();
  const page = await (await br.newContext({ viewport: { width: 1960, height: 1200 } })).newPage();
  await page.goto("file://" + SHEET);
  await page.waitForTimeout(800);
  const cdp = await page.context().newCDPSession(page);
  const stages = [["dec02", .25], ["dec16", .55], ["jan20", 1], ["feb24", .22], ["m1280jan", 1]];
  const out = {};
  for (const rate of [1, 4]){
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    for (const [name, sc] of stages){
      const r = await page.evaluate(([name, sc]) => {   // the frost generator drawing the stage into a canvas, as the build will
        const G = window.GEO[name], times = []; let res;
        for (let i = 0; i < 11; i++){ const t0 = performance.now(); res = window.frostPaint(G, sc); res.canvas.getContext("2d").getImageData(0, 0, 1, 1); if (i) times.push(performance.now() - t0); }
        times.sort((a, b) => a - b); return { ms: Math.round(times[5] * 10) / 10, segs: res.segs, px: res.canvas.width + " × " + res.canvas.height };
      }, [name, sc]);
      const k = name + "@" + sc; out[k] = out[k] || { segs: r.segs, px: r.px }; out[k][rate === 1 ? "ms1" : "ms4"] = r.ms;
    }
  }
  fs.writeFileSync(path.join(FR, "cost.js"), "/* written by tools/proofs/winter.js measure */\nwindow.COST = " + JSON.stringify(out) + ";\n");
  console.log("cost", JSON.stringify(out));
  await br.close();
}

(async () => {
  const cmd = process.argv[2] || "all";

  if (cmd === "capture" || cmd === "all") await capture();
  if (cmd === "serpent" || cmd === "all") await serpentLive();
  if (cmd === "measure" || cmd === "all") await measure();
  if (cmd === "render" || cmd === "all") await render(process.argv[3]);
})().catch(e => { console.error(e); process.exit(1); });
