/* v7.62 — scribble out to erase (Croix: "Scribble out to erase", then "I've experienced other apps that claim scribble
 * to erase works and it sucks. I want nib and by extension deckhand to work super well. Double check and harden it to
 * make sure it's up to my standards."). A pen or marker stroke scribbled back and forth over the drawing — over the
 * slides or on the Sketch Pad — rubs out what it lies over and is not kept, as one step of Undo, with Undo on the toast
 * too. Nib decides (the same test as the Board's): a scribble over nothing is ink, the highlighter shades, a dot filled
 * in on a number line stays, a ring round an answer stays, and Settings › Drawing turns it off. */
const { test, expect, ok } = require("./helpers");

/* handwriting made of lines and arcs (no student wrote it): digits, +, = — about 60 px tall at scale 1 */
const seg = (pts, n = 6) => { const out = [pts[0]]; for (let k = 1; k < pts.length; k++) for (let i = 1; i <= n; i++) out.push([pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * i / n, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * i / n]); return out; };
const arc = (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const H = 60, Y = 0;
const GLYPH = {
  1: x => [seg([[x - 10, Y + 14], [x, Y], [x, Y + H]])],
  2: x => [arc(x, Y + 16, 16, 16, Math.PI * 1.1, Math.PI * 2.15).concat(seg([[x + 14, Y + 26], [x - 16, Y + H], [x + 18, Y + H]]).slice(1))],
  3: x => [arc(x, Y + 15, 15, 15, Math.PI * 1.15, Math.PI * 2.5).concat(arc(x, Y + 44, 17, 16, Math.PI * 1.5, Math.PI * 2.85).slice(1))],
  0: x => [arc(x, Y + H / 2, 16, H / 2, -Math.PI / 2, Math.PI * 1.5, 24)],
  4: x => [seg([[x + 6, Y], [x - 16, Y + 40], [x + 18, Y + 40]]), seg([[x + 8, Y + 18], [x + 8, Y + H]])],
  "+": x => [seg([[x - 18, Y + 30], [x + 18, Y + 30]]), seg([[x, Y + 12], [x, Y + 48]])],
  "=": x => [seg([[x - 18, Y + 22], [x + 18, Y + 22]]), seg([[x - 18, Y + 38], [x + 18, Y + 38]])],
};
/* the strokes of `text` with its top left at (x0, y0), k times the size; and each character's strokes */
const glyphs = (text, x0, y0, k = 1) => { const out = []; let x = 0; for (const ch of text) { out.push(GLYPH[ch](x + 20).map(s => s.map(p => [x0 + p[0] * k, y0 + p[1] * k]))); x += 50; } return out; };
const written = (text, x0, y0, k = 1) => [].concat(...glyphs(text, x0, y0, k));
const boxOf = list => { let b = [Infinity, Infinity, -Infinity, -Infinity]; for (const s of list) for (const p of s) b = [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])]; return b; };
/* a scribble: a zig-zag over box b, legs left-right ('h') or up-down ('v'), past the box by `over` each way */
const zig = (b, legs, dir = "h", over = 10) => {
  const out = [];
  for (let k = 0; k <= legs; k++) {
    const t = k / legs, side = k % 2;
    const p = dir === "h" ? [side ? b[2] + over : b[0] - over, b[1] - over + (b[3] - b[1] + 2 * over) * t] : [b[0] - over + (b[2] - b[0] + 2 * over) * t, side ? b[3] + over : b[1] - over];
    if (out.length) { const q = out[out.length - 1]; for (let i = 1; i <= 6; i++) out.push([q[0] + (p[0] - q[0]) * i / 6, q[1] + (p[1] - q[1]) * i / 6]); } else out.push(p);
  }
  return out;
};
async function strokes(page, list){
  for (const s of list){
    await page.mouse.move(s[0][0], s[0][1]); await page.mouse.down();
    for (const p of s.slice(1)) await page.mouse.move(p[0], p[1]);
    await page.mouse.up();
  }
}
const toast = page => page.evaluate(() => { const t = document.getElementById("undoToast"); return t && !t.hidden ? t.querySelector("span").textContent : ""; });
const settledOn = (page, which) => page.waitForFunction(which => {
  const el = which === "ink" ? window.Deckhand.ink.nib() : document.querySelector(".w-draw .dwPad"), P = el && el.pad;
  return P && !P.anim && (P.strokes.length ? P.result && P.resultStrokes.length === P.strokes.length && P.resultStrokes.every((s, i) => s === P.strokes[i]) : true);
}, which, { timeout: 30000 });

test.describe("v7.62 scribble out", () => {
  test("v7.62: over the slides, a scribble over the 3 of 12+3= rubs it out and is not kept — one step of Undo, a toast with Undo; over nothing it is ink; the highlighter shades; a ring round the answer stays; Settings › Drawing turns it off", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    await expect(page.locator("#inkBar")).toBeVisible();
    const count = () => page.evaluate(() => window.Deckhand.ink.count());
    const depth = () => page.evaluate(() => window.Deckhand.ink.undoDepth());
    const G = glyphs("12+3=", 420, 330, 1.1), prob = [].concat(...G), three = G[3];
    await strokes(page, prob);
    ok((await count()) === prob.length, "the pen made " + await count() + " items for " + prob.length + " strokes");
    await settledOn(page, "ink"); await page.waitForTimeout(200);
    const d0 = await depth();
    // the scribble
    await strokes(page, [zig(boxOf(three), 9, "h", 12)]);
    ok((await count()) === prob.length - three.length, "the 3 did not go, or the scribble stayed: " + await count() + " items");
    ok((await depth()) === d0 + 1, "not one step of Undo");
    ok(/Scribbled out/.test(await toast(page)), "no toast: " + await toast(page));
    await page.waitForTimeout(150);
    await settledOn(page, "ink");
    ok(await page.evaluate(() => window.Deckhand.ink.nib().pad.strokes.length) === prob.length - three.length, "Nib still reads the 3");
    // the toast's Undo
    await page.click("#undoToast button");
    ok((await count()) === prob.length, "the toast's Undo did not bring the 3 back");
    // up and down this time, with the marker; the bar's Undo
    await page.click('#inkBar [data-tool="marker"]');
    await strokes(page, [zig(boxOf(three), 9, "v", 12)]);
    ok((await count()) === prob.length - three.length, "the marker's scribble did not rub it out");
    await page.click("#inkUndo");
    ok((await count()) === prob.length, "the bar's Undo did not bring it back");
    await page.click('#inkBar [data-tool="pen"]');
    // over nothing: ink
    await strokes(page, [zig([900, 150, 1000, 210], 9, "h", 6)]);
    ok((await count()) === prob.length + 1, "a scribble over clear space is not ink");
    await page.click("#inkUndo");
    // the highlighter shades: it never rubs out
    await page.click('#inkBar [data-color="#FFE45C"]');
    await strokes(page, [zig(boxOf(three), 9, "h", 12)]);
    ok((await count()) === prob.length + 1, "the highlighter rubbed out");
    await page.click("#inkUndo");
    await page.click('#inkBar [data-color="#17324D"]');
    // a ring round the answer, three times: ink
    const ab = await page.evaluate(() => { const P = window.Deckhand.ink.nib().pad, it = P.plan && P.plan.items.find(q => q.answer); return it ? it.box : null; });
    ok(!!ab, "no answer to ring");
    if (ab){
      const c = [(ab[0] + ab[2]) / 2, (ab[1] + ab[3]) / 2], r = Math.max(ab[2] - ab[0], ab[3] - ab[1]) * 0.7 + 14;
      await strokes(page, [Array.from({ length: 145 }, (_, k) => { const a = 2 * Math.PI * k / 48; return [c[0] + (r + k * 0.06) * Math.cos(a), c[1] + (r + k * 0.06) * 0.75 * Math.sin(a)]; })]);
      ok((await count()) === prob.length + 1, "a ring round the answer rubbed something out");
      await page.click("#inkUndo");
    }
    // Settings › Drawing: off, a scribble is ink
    await page.evaluate(() => { window.Deckhand.config.ui.scribble = false; });
    await strokes(page, [zig(boxOf(three), 9, "h", 12)]);
    ok((await count()) === prob.length + 1, "with scribble off, the scribble rubbed out");
    await page.click("#inkUndo");
    await page.evaluate(() => { window.Deckhand.config.ui.scribble = true; });
    await page.click("#inkDone");
  });

  test("v7.62: over the slides, an answer shown by a tap goes back out of focus under a scribble, and Undo shows it again; a dot filled in on a number line stays, and so do the line and its ticks", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    const count = () => page.evaluate(() => window.Deckhand.ink.count());
    const prob = written("12+30=", 420, 330, 1.1);
    await strokes(page, prob);
    await settledOn(page, "ink"); await page.waitForTimeout(200);
    const A = await page.evaluate(() => { const P = window.Deckhand.ink.nib().pad, it = P.plan && P.plan.items.find(q => q.answer); return it ? { box: it.box, key: it.revealKey } : null; });
    ok(!!A, "no answer");
    await page.evaluate(k => window.Deckhand.ink.nib().pad.showAnswer(k), A.key);
    ok(await page.evaluate(k => window.Deckhand.ink.nib().pad.revealed.has(k), A.key), "the answer is not shown");
    await strokes(page, [zig(A.box, 9, "h", 8)]);
    ok(await page.evaluate(k => !window.Deckhand.ink.nib().pad.revealed.has(k), A.key), "the scribble left the answer shown");
    ok((await count()) === prob.length, "the scribble over the answer took writing, or stayed");
    ok(/Answer hidden again/.test(await toast(page)), "the toast says: " + await toast(page));
    await page.click("#inkUndo");
    ok(await page.evaluate(k => window.Deckhand.ink.nib().pad.revealed.has(k), A.key), "Undo did not show the answer again");
    await page.click("#inkClear");
    // a number line, ticks, a dot on it, filled in with the pen
    const line = [[150, 600], [950, 600]], ticks = Array.from({ length: 9 }, (_, k) => [[150 + 100 * k, 588], [150 + 100 * k, 612]]);
    const dot = Array.from({ length: 41 }, (_, k) => [450 + 13 * Math.cos(2 * Math.PI * k / 40), 600 + 13 * Math.sin(2 * Math.PI * k / 40)]);
    await strokes(page, [line, ...ticks, dot]);
    const n0 = await count();
    const fill = [];
    for (let k = 0; k <= 12; k++){ const y = 588 + 24 * k / 12, w = Math.sqrt(Math.max(0, 144 - (y - 600) * (y - 600))); fill.push(k % 2 ? [450 + w, y] : [450 - w, y]); }
    await strokes(page, [seg(fill, 4)]);
    ok((await count()) === n0 + 1, "filling in the dot rubbed out " + (n0 + 1 - await count()) + " of the line, its ticks or the dot");
    await page.click("#inkDone");
  });

  test("v7.62: a scribble the panel heard in pieces (the pen off the glass for a moment at a turn) is one scribble — over the slides and on the Sketch Pad: the pieces together rub out what they lie over, as one step of Undo; pieces 400 ms apart are ink", async ({ page, dh }) => {
    /* the strokes, `gap` ms between one's lift and the next's touch */
    const pieces = async (list, gap) => {
      for (let i = 0; i < list.length; i++){
        if (i) await page.waitForTimeout(gap);
        const s = list[i];
        await page.mouse.move(s[0][0], s[0][1]); await page.mouse.down();
        for (const p of s.slice(1)) await page.mouse.move(p[0], p[1]);
        await page.mouse.up();
      }
    };
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    const count = () => page.evaluate(() => window.Deckhand.ink.count());
    const depth = () => page.evaluate(() => window.Deckhand.ink.undoDepth());
    const G = glyphs("12+3=", 420, 330, 1.1), prob = [].concat(...G), three = G[3];
    await strokes(page, prob);
    await settledOn(page, "ink"); await page.waitForTimeout(200);
    const Z = zig(boxOf(three), 8, "h", 12), A = Z.slice(0, 25), B = Z.slice(26);   // four legs each, a sample lost between
    await pieces([A], 0);
    ok((await count()) === prob.length + 1, "four legs on their own rubbed something out");
    await page.click("#inkUndo");
    const d0 = await depth();
    await pieces([A, B], 30);
    ok((await count()) === prob.length - three.length, "in two pieces 30 ms apart, the 3 did not go (or a piece stayed): " + await count());
    ok((await depth()) === d0 + 1, "not one step of Undo: " + (await depth() - d0));
    ok(/Scribbled out/.test(await toast(page)), "no toast: " + await toast(page));
    await page.click("#inkUndo");
    ok((await count()) === prob.length && (await depth()) === d0, "Undo did not put the board back as it was before the scribble began");
    await pieces([A, B], 400);
    ok((await count()) === prob.length + 2, "pieces 400 ms apart were not two strokes of ink");
    await page.click("#inkUndo"); await page.click("#inkUndo");
    await page.click("#inkDone");
    // the Sketch Pad (Nib's own pad puts the pieces together)
    await dh.addW("addDrawBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "draw"); [w.x, w.y, w.w, w.h] = [1, 2, 60, 80]; window.Deckhand.canvas.loadScene(); });
    await page.waitForTimeout(300);
    const b = await page.locator(".w-draw .dwPad canvas").boundingBox();
    const n = () => page.evaluate(() => document.querySelector(".w-draw .dwPad").pad.strokes.length);
    const G2 = glyphs("12+3", b.x + 60, b.y + 80, 1.2), prob2 = [].concat(...G2), three2 = G2[3];
    await strokes(page, prob2);
    const Z2 = zig(boxOf(three2), 8, "h", 12);
    await page.waitForTimeout(200);
    await pieces([Z2.slice(0, 25), Z2.slice(26)], 30);
    ok((await n()) === prob2.length - three2.length, "the Sketch Pad: in two pieces, the 3 did not go (or a piece stayed): " + await n());
    await page.click(".w-draw .dwUndo");
    ok((await n()) === prob2.length, "the Sketch Pad's Undo did not put back the board as it was before the scribble began: " + await n());
  });

  test("v7.62: the Sketch Pad — a scribble rubs out, as one step of the pad's Undo, with Undo on the toast; Settings › Drawing off makes it ink", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addDrawBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "draw"); [w.x, w.y, w.w, w.h] = [1, 2, 60, 80]; window.Deckhand.canvas.loadScene(); });
    await page.waitForTimeout(300);
    const b = await page.locator(".w-draw .dwPad canvas").boundingBox();
    const n = () => page.evaluate(() => document.querySelector(".w-draw .dwPad").pad.strokes.length);
    const G = glyphs("12+3", b.x + 60, b.y + 80, 1.2), prob = [].concat(...G), three = G[3];
    await strokes(page, prob);
    ok((await n()) === prob.length, "the pad has " + await n() + " strokes for " + prob.length);
    await strokes(page, [zig(boxOf(three), 9, "h", 12)]);
    ok((await n()) === prob.length - three.length, "the Sketch Pad's scribble did not rub out the 3 (or stayed): " + await n());
    ok(/Scribbled out/.test(await toast(page)), "no toast: " + await toast(page));
    await page.click("#undoToast button");
    ok((await n()) === prob.length, "the toast's Undo did not bring it back");
    await strokes(page, [zig(boxOf(three), 9, "v", 12)]);
    ok((await n()) === prob.length - three.length, "up and down did not rub it out");
    await page.click(".w-draw .dwUndo");
    ok((await n()) === prob.length, "the pad's Undo did not bring it back");
    // Settings › Drawing: off
    await page.click("#setBtn");
    await page.waitForTimeout(200);
    await page.uncheck("#sScribble");
    await page.click("#applyBtn");
    await page.waitForTimeout(300);
    ok((await page.evaluate(() => window.Deckhand.config.ui.scribble)) === false, "the setting did not save");
    await page.keyboard.press("Escape");
    ok(await page.evaluate(() => document.querySelector(".w-draw .dwPad").getAttribute("scribble")) === "false", "the Sketch Pad did not take the setting");
    await strokes(page, [zig(boxOf(three), 9, "h", 12)]);
    ok((await n()) === prob.length + 1, "with scribble off, the Sketch Pad's scribble rubbed out");
  });
});
