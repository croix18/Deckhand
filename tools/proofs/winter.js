/* Winter design proofs (docs/reviews/winter-design.md, winter-animation.md).
   node tools/proofs/winter.js capture   — opens the real Deckhand.html at four winter dates (the
                                            #t= override the tests use), pauses its motion at a fixed
                                            time, photographs the board and writes the geometry the
                                            proof sheet overlays its drawings on
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
const FRAMES = [
  { name: "dec09", hash: "#t=2026-12-09T10:40", sea: "breezy" },   // an ordinary December day (week 2)
  { name: "jan13", hash: "#t=2027-01-13T13:20", sea: "windy" },    // a January day with wind and snow (the squall)
  { name: "jan20", hash: "#t=2027-01-20T09:50", sea: "breezy" },   // the caper week
  { name: "feb26", hash: "#t=2027-02-26T14:10", sea: "calm" }      // the last school day of February
];

async function capture(){
  fs.mkdirSync(FR, { recursive: true });
  const br = await chromium.launch();
  const geo = {};
  for (const f of FRAMES){
    const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "no-preference" });
    const page = await ctx.newPage();
    await page.goto(APP + f.hash);
    await page.waitForFunction(() => !!window.Deckhand);
    if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
    await page.waitForTimeout(400);
    await page.addStyleTag({ content: "#greetToast{display:none !important} #dateline .sim{display:none !important}" });   // the boot toast and the coral SIM tag the #t= override shows
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
      return { boat: m, clock: r(clock), waves: r(document.getElementById("waves")), dock: r(document.getElementById("dock")),
               fs: r(document.getElementById("fsBtn")), face: r(document.getElementById("clockFace")),
               W: innerWidth, H: innerHeight };
    });
    await page.screenshot({ path: path.join(FR, f.name + ".png") });
    geo[f.name] = Object.assign({ hash: f.hash, sea: f.sea }, g);
    console.log(f.name, JSON.stringify(g));
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

(async () => {
  const cmd = process.argv[2] || "all";
  if (cmd === "capture" || cmd === "all") await capture();
  if (cmd === "render" || cmd === "all") await render(process.argv[3]);
})().catch(e => { console.error(e); process.exit(1); });
