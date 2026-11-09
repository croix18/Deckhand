/* v7.61 — Nib comes aboard (Croix: "Is it possible to integrate nib into the drawing tools of deckhand?" … "Yes
 * absolutely. That's an excellent idea. Do it!" and "Leave it all and bring the solver. Both done to absoluteness.
 * Can you also change the symbol from the yellow question mark circle to just a blurry version of the answer.").
 * The Sketch Pad is a Nib pad: it reads, solves (answers blurred until tapped), shows the writing four ways, fixes a
 * misread symbol, copies LaTeX — and keeps every tool it had. The pen over the slides keeps every tool too, and gains
 * Solve: what the pen and the marker write is read, a line ending in "=" gets its answer after it, blurred until
 * tapped, and the answers go with the drawing (Undo, Clear, Done and its Undo, the eraser, a lasso move). */
const { test, expect, ok } = require("./helpers");
const fs = require("fs");
const path = require("path");

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
  5: x => [seg([[x + 16, Y], [x - 12, Y], [x - 14, Y + 26]]).concat(arc(x, Y + 42, 17, 18, Math.PI * 1.35, Math.PI * 2.8).slice(1))],
  "+": x => [seg([[x - 18, Y + 30], [x + 18, Y + 30]]), seg([[x, Y + 12], [x, Y + 48]])],
  "=": x => [seg([[x - 18, Y + 22], [x + 18, Y + 22]]), seg([[x - 18, Y + 38], [x + 18, Y + 38]])],
};
/* the strokes of `text` with its top left at (x0, y0), k times the size */
const written = (text, x0, y0, k = 1) => { const st = []; let x = 0; for (const ch of text) { st.push(...GLYPH[ch](x + 20)); x += 50; } return st.map(s => s.map(p => [x0 + p[0] * k, y0 + p[1] * k])); };
async function strokes(page, list){
  for (const s of list){
    await page.mouse.move(s[0][0], s[0][1]); await page.mouse.down();
    for (const p of s.slice(1)) await page.mouse.move(p[0], p[1]);
    await page.mouse.up();
  }
}
/* the answers' pixels on a canvas, inside their box: how many are drawn, and the sharpest step in alpha between
   neighbours (writing in focus steps from nothing to the gold within a pixel or two; out of focus it eases in) */
const look = (page, which) => page.evaluate(which => {
  const el = which === "ink" ? window.Deckhand.ink.nib() : document.querySelector(".w-draw .dwPad"), P = el.pad, c = P.canvas;
  const A = P.plan ? P.plan.items.filter(i => i.answer) : [];
  if (!A.length) return null;
  const b = A.map(i => i.box || i.group).reduce((u, q) => [Math.min(u[0], q[0]), Math.min(u[1], q[1]), Math.max(u[2], q[2]), Math.max(u[3], q[3])]);
  const k = c.width / c.getBoundingClientRect().width, a = P.toScreen([b[0], b[1]]), z = P.toScreen([b[2], b[3]]);
  const x0 = Math.max(0, Math.floor(a[0] * k)), y0 = Math.max(0, Math.floor(a[1] * k)), w = Math.max(1, Math.min(c.width, Math.ceil(z[0] * k)) - x0), h = Math.max(1, Math.min(c.height, Math.ceil(z[1] * k)) - y0);
  const d = c.getContext("2d").getImageData(x0, y0, w, h).data;
  let gold = 0, step = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const i = (y * w + x) * 4;
    if (d[i + 3] > 40 && d[i] - d[i + 2] > 60) gold++;
    if (x) step = Math.max(step, Math.abs(d[i + 3] - d[i - 1]));
    if (y) step = Math.max(step, Math.abs(d[i + 3] - d[i + 3 - 4 * w]));
  }
  return { gold, step, hidden: A.every(i => i.hidden), shown: A.every(i => !i.hidden), box: b };
}, which);
/* the reading has caught up with the ink */
const settledOn = (page, which) => page.waitForFunction(which => {
  const el = which === "ink" ? window.Deckhand.ink.nib() : document.querySelector(".w-draw .dwPad"), P = el && el.pad;
  return P && !P.anim && (P.strokes.length ? P.result && P.resultStrokes.length === P.strokes.length && P.resultStrokes.every((s, i) => s === P.strokes[i]) : true);
}, which, { timeout: 30000 });
const answersOf = (page, which) => page.evaluate(which => (which === "ink" ? window.Deckhand.ink.nib() : document.querySelector(".w-draw .dwPad")).answers.map(a => a.latex).sort().join(), which);
/* where on the page the middle of an answer's tap target is */
const chipAt = (page, which) => page.evaluate(which => {
  const el = which === "ink" ? window.Deckhand.ink.nib() : document.querySelector(".w-draw .dwPad"), P = el.pad, c = P.plan.chips[0];
  if (!c) return null;
  const r = P.canvas.getBoundingClientRect(), s = P.toScreen([c.cx, c.cy]);
  return { x: r.left + s[0], y: r.top + s[1] };
}, which);

test.describe("v7.61 Nib aboard", () => {
  test("v7.61: the Sketch Pad reads and works it out — 12 + 30 = is answered 42, blurred until tapped; the tap shows it and writes nothing; Solve off and on; the day's sketch keeps it shown across a scene switch", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addDrawBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "draw"); [w.x, w.y, w.w, w.h] = [1, 2, 60, 80]; window.Deckhand.canvas.loadScene(); });
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => !!customElements.get("nib-pad") && !!document.querySelector(".w-draw .dwPad").pad), "the Sketch Pad is not a Nib pad");
    const solve = () => page.evaluate(() => document.querySelector(".w-draw .dwSolve").getAttribute("aria-pressed"));
    ok((await solve()) === "true" && (await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "draw").solve)) === true, "Solve is not on from the start");
    const b = await page.locator(".w-draw .dwPad canvas").boundingBox();
    const api = () => page.evaluate(() => document.querySelector(".w-draw")._entry.api.strokes());
    const prob = written("12+30=", b.x + 60, b.y + 80, 1.2);
    await strokes(page, prob);
    ok((await api()) === prob.length, "strokes: " + await api());
    await settledOn(page, "draw"); await page.waitForTimeout(200);
    ok((await answersOf(page, "draw")) === "42", "12 + 30 = was answered " + await answersOf(page, "draw"));
    let L = await look(page, "draw");
    ok(L && L.hidden && L.gold > 60 && L.step <= 40, "the answer is not drawn out of focus where it goes: " + JSON.stringify(L));
    await page.screenshot({ path: test.info().outputPath("sketch-blurred.png") });
    const c = await chipAt(page, "draw");
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(500);
    L = await look(page, "draw");
    ok(L && L.shown && L.step >= 120 && (await api()) === prob.length, "a tap did not bring it into focus (or wrote a dot): " + JSON.stringify(L) + " " + await api());
    await page.screenshot({ path: test.info().outputPath("sketch-shown.png") });
    // Solve off: no answers; on: the same answer, still shown (the tap is remembered with the line)
    await page.click(".w-draw .dwSolve");
    ok((await solve()) === "false" && (await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "draw").solve)) === false, "Solve did not go off");
    await page.waitForTimeout(300);
    ok((await answersOf(page, "draw")) === "" && (await look(page, "draw")) === null, "answers are still there with Solve off");
    await page.click(".w-draw .dwSolve");
    await settledOn(page, "draw"); await page.waitForTimeout(300);
    L = await look(page, "draw");
    ok((await answersOf(page, "draw")) === "42" && L && L.shown, "Solve on again: " + JSON.stringify(L));
    // Undo takes back the tap's reveal? No — Undo takes back the last thing done: the answer shown goes out of focus again
    // (the pad's own history), and Redo is not a Sketch Pad tool: tap again
    // the day's sketch: a scene switch away and back keeps the writing, its reading and the answer shown
    const scenes = await page.evaluate(() => window.Deckhand.config.scenes.map(s => s.name));
    await page.selectOption("#sceneSel", scenes[1]); await page.waitForTimeout(300);
    await page.selectOption("#sceneSel", scenes[0]); await page.waitForTimeout(400);
    await settledOn(page, "draw"); await page.waitForTimeout(300);
    L = await look(page, "draw");
    ok((await api()) === prob.length && (await answersOf(page, "draw")) === "42" && L && L.shown, "after a scene switch: " + (await api()) + " strokes, " + JSON.stringify(L));
    // Clear (with its Undo): the answer goes and comes back shown
    await page.click(".w-draw .dwClear");
    ok((await api()) === 0 && (await answersOf(page, "draw")) === "", "Clear left something");
    await page.click("#undoToast button");
    await settledOn(page, "draw"); await page.waitForTimeout(300);
    L = await look(page, "draw");
    ok((await api()) === prob.length && L && L.shown, "the toast's Undo did not bring the sketch back as it was: " + JSON.stringify(L));
  });

  test("v7.61: Nib ▾ — the writing shown four ways, Fix (a tap offers what a symbol could be; a choice changes the reading and its answer; writing leaves Fix), Copy LaTeX with the answer", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addDrawBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "draw"); [w.x, w.y, w.w, w.h] = [1, 2, 60, 80]; window.Deckhand.canvas.loadScene(); });
    await page.waitForTimeout(300);
    const b = await page.locator(".w-draw .dwPad canvas").boundingBox();
    await strokes(page, written("12+30=", b.x + 60, b.y + 80, 1.2));
    await settledOn(page, "draw"); await page.waitForTimeout(200);
    await expect(page.locator(".w-draw .dwNib")).toBeHidden();
    await page.click(".w-draw .dwMore");
    await expect(page.locator(".w-draw .dwNib")).toBeVisible();
    ok((await page.locator(".w-draw .dwView").allTextContents()).join() === "Ink,Tidy,My hand,Typeset", "the views: " + (await page.locator(".w-draw .dwView").allTextContents()).join());
    for (const v of ["typeset", "tidy", "hand", "ink"]){
      await page.click('.w-draw .dwView[data-view="' + v + '"]');
      const st = await page.evaluate(() => ({ el: document.querySelector(".w-draw .dwPad").view, cfg: window.Deckhand.config.scenes[0].widgets.find(w => w.type === "draw").view }));
      ok(st.el === v && st.cfg === v && (await page.getAttribute('.w-draw .dwView[data-view="' + v + '"]', "aria-pressed")) === "true", v + ": " + JSON.stringify(st));
      if (v === "typeset") await page.screenshot({ path: test.info().outputPath("sketch-typeset.png") });
    }
    // Fix: a tap on the 3
    await page.click(".w-draw .dwFix");
    ok((await page.getAttribute(".w-draw .dwFix", "aria-pressed")) === "true" && (await page.evaluate(() => document.querySelector(".w-draw .dwPad").mode)) === "fix", "Fix is not on");
    const three = await page.evaluate(() => {
      const P = document.querySelector(".w-draw .dwPad").pad, s = P.result.symbols.find(q => q.label === "3"), r = P.canvas.getBoundingClientRect();
      const m = P.toScreen([s.box.x + s.box.w / 2, s.box.y + s.box.h / 2]);
      return { x: r.left + m[0], y: r.top + m[1] };
    });
    await page.mouse.click(three.x, three.y);
    await expect(page.locator(".w-draw .dwFixPop")).toBeVisible();
    const offered = await page.$$eval(".w-draw .dwFixPop button", bs => bs.map(b => [b.dataset.label, b.getAttribute("aria-pressed")]));
    ok(offered.length >= 2 && offered[0][0] === "3" && offered[0][1] === "true", "what the 3 could be: " + JSON.stringify(offered));
    const pick = offered.find(o => /^[0-9]$/.test(o[0]) && o[0] !== "3") || offered[1];
    await page.click('.w-draw .dwFixPop button[data-label="' + pick[0].replace(/\\/g, "\\\\") + '"]');
    await expect(page.locator(".w-draw .dwFixPop")).toBeHidden();
    await settledOn(page, "draw"); await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ latex: document.querySelector(".w-draw .dwPad").latex.replace(/\s/g, ""), answers: document.querySelector(".w-draw .dwPad").answers.map(a => a.latex) }));
    ok(after.latex.indexOf("12+" + pick[0]) === 0, "the fix did not change the reading: " + JSON.stringify(after) + " (picked " + pick[0] + ")");
    if (/^[0-9]$/.test(pick[0])) ok(after.answers.join() === String(12 + 10 * +pick[0]), "the answer did not follow the fix: " + JSON.stringify(after));
    ok((await page.getAttribute(".w-draw .dwFix", "aria-pressed")) === "true", "Fix went off after one fix");
    // writing leaves Fix
    await strokes(page, [[[b.x + 500, b.y + 300], [b.x + 560, b.y + 330], [b.x + 600, b.y + 360]]]);
    await page.waitForTimeout(200);
    ok((await page.getAttribute(".w-draw .dwFix", "aria-pressed")) === "false" && (await page.evaluate(() => document.querySelector(".w-draw .dwPad").mode)) === "draw", "writing did not leave Fix");
    await page.click(".w-draw .dwUndo");
    await settledOn(page, "draw"); await page.waitForTimeout(300);
    // Copy LaTeX: the reading with its answer written in
    await page.evaluate(() => { window.__copied = null; try { Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: t => { window.__copied = t; return Promise.resolve(); } }); } catch (e) {} });
    await page.click(".w-draw .dwCopy");
    await expect(page.locator("#undoToast")).toContainText("LaTeX copied");
    const copied = await page.evaluate(() => window.__copied);
    ok(copied && copied.replace(/\s/g, "") === after.latex + after.answers[0], "copied: " + copied + " for " + JSON.stringify(after));
  });

  test("v7.61: the Sketch Pad on the panel is as it was — every touch writes, however wide the panel says it is, and one finger at a time", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addDrawBtn"); await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const el = document.querySelector(".w-draw .dwPad"), cv = el.pad.canvas, b = cv.getBoundingClientRect();
      const ev = (type, id, x, y, o) => cv.dispatchEvent(new PointerEvent("pointer" + type, Object.assign({ pointerId: id, pointerType: "touch", clientX: b.left + x, clientY: b.top + y,
        bubbles: true, cancelable: true, isPrimary: true, button: type === "down" ? 0 : -1, buttons: type === "up" ? 0 : 1, width: 1, height: 1, pressure: 0.5 }, o || {})));
      const n = () => el.pad.strokes.length, n0 = n();
      // a finger the panel reports 40 px wide
      ev("down", 11, 60, 60, { width: 40, height: 40 }); for (let i = 1; i <= 6; i++) ev("move", 11, 60 + 12 * i, 60 + 5 * i, { width: 40, height: 40 }); ev("up", 11, 132, 90, { width: 40, height: 40 });
      const wide = n() - n0;
      // a second finger while the first is writing
      ev("down", 12, 60, 160); ev("move", 12, 80, 170);
      ev("down", 13, 260, 160); ev("move", 13, 290, 175); ev("move", 12, 100, 180);
      ev("up", 13, 300, 180); ev("up", 12, 120, 190);
      const two = n() - n0 - wide;
      return { wide, two };
    });
    ok(r.wide === 1, "a wide touch did not write: " + JSON.stringify(r));
    ok(r.two === 1, "a second finger wrote too: " + JSON.stringify(r));
  });

  test("v7.61 (review): the Sketch Pad as a teacher uses it — a pen resting at the end of a line leaves a line, not a shape; Undo works after Clear's Undo and after a scene switch; a fix is kept for the day; an empty pad's paper fills the card", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addDrawBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "draw"); [w.x, w.y, w.w, w.h] = [1, 2, 60, 80]; window.Deckhand.canvas.loadScene(); });
    await page.waitForTimeout(400);
    // an empty pad's page is the card's shape: the number line runs nearly the card's width
    await page.selectOption(".w-draw .dwBgSel", "line");
    await page.waitForTimeout(200);
    const span = await page.evaluate(() => {
      const c = document.querySelector(".w-draw .dwBg"), g = c.getContext("2d"), y = Math.round(c.height / 2), d = g.getImageData(0, y - 2, c.width, 5).data;
      let lo = -1, hi = -1; for (let x = 0; x < c.width; x++){ let ink = false; for (let k = 0; k < 5; k++){ const i = (k * c.width + x) * 4; if (d[i + 3] > 100 && d[i + 2] > d[i]) ink = true; } if (ink){ if (lo < 0) lo = x; hi = x; } }
      return { frac: (hi - lo) / c.width, page: document.querySelector(".w-draw .dwPad").getAttribute("page") };
    });
    ok(span.frac > 0.85, "the empty pad's number line does not run the card's width: " + JSON.stringify(span));
    const b = await page.locator(".w-draw .dwPad canvas").boundingBox();
    const api = () => page.evaluate(() => document.querySelector(".w-draw")._entry.api.strokes());
    const P = fn => page.evaluate(fn);
    // a line drawn and held still at its end: a pen stroke, never a shape
    await page.mouse.move(b.x + 80, b.y + 120); await page.mouse.down();
    await page.mouse.move(b.x + 520, b.y + 130, { steps: 12 });
    await page.waitForTimeout(900);
    await page.mouse.up();
    const held = await P(() => { const s = document.querySelector(".w-draw .dwPad").getState(); return { n: s.strokes.length, shapes: (s.meta || []).filter(m => m && m.k === "shape").length }; });
    ok(held.n === 1 && held.shapes === 0, "a held line became a shape: " + JSON.stringify(held));
    // the page holds once there is writing: a resize keeps it
    const page0 = await P(() => document.querySelector(".w-draw .dwPad").getAttribute("page"));
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "draw"); [w.x, w.y, w.w, w.h] = [1, 2, 40, 80]; window.Deckhand.canvas.loadScene(); });
    await page.waitForTimeout(400);
    ok((await P(() => document.querySelector(".w-draw .dwPad").getAttribute("page"))) === page0 && (await api()) === 1, "the page changed under the writing, or the writing went");
    await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === "draw"); [w.x, w.y, w.w, w.h] = [1, 2, 60, 80]; window.Deckhand.canvas.loadScene(); });
    await page.waitForTimeout(400);
    const b2 = await page.locator(".w-draw .dwPad canvas").boundingBox();
    const stroke = async (x0, y0, x1, y1) => { await page.mouse.move(b2.x + x0, b2.y + y0); await page.mouse.down(); await page.mouse.move(b2.x + x1, b2.y + y1, { steps: 6 }); await page.mouse.up(); };
    await stroke(80, 260, 300, 300); await stroke(80, 340, 300, 380);
    ok((await api()) === 3, "three strokes: " + await api());
    // Clear, the toast's Undo, then Undo still takes the last stroke back
    await page.click(".w-draw .dwClear");
    ok((await api()) === 0, "Clear");
    await page.click("#undoToast button");
    ok((await api()) === 3 && (await P(() => document.querySelector(".w-draw .dwPad").getAttribute("page"))) === page0, "the toast's Undo did not bring the sketch back on its page");
    ok(!(await page.locator(".w-draw .dwUndo").isDisabled()), "Undo is greyed after Clear's Undo");
    await page.click(".w-draw .dwUndo");
    ok((await api()) === 2, "Undo after Clear's Undo: " + await api());
    // a scene switch away and back: the same pad, Undo still working
    const scenes = await P(() => window.Deckhand.config.scenes.map(s => s.name));
    await page.selectOption("#sceneSel", scenes[1]); await page.waitForTimeout(300);
    await page.selectOption("#sceneSel", scenes[0]); await page.waitForTimeout(400);
    ok((await api()) === 2 && !(await page.locator(".w-draw .dwUndo").isDisabled()), "after a scene switch: " + (await api()) + " strokes, Undo " + (await page.locator(".w-draw .dwUndo").isDisabled() ? "greyed" : "live"));
    await page.click(".w-draw .dwUndo");
    ok((await api()) === 1, "Undo after a scene switch: " + await api());
    // a fix is kept for the day: write 1+1=, fix the second 1 to a 4, switch scenes, the fix is still there
    await page.click(".w-draw .dwClear");
    const pb = await page.locator(".w-draw .dwPad canvas").boundingBox();
    await strokes(page, written("1+1=", pb.x + 60, pb.y + 80, 1.2));
    await settledOn(page, "draw"); await page.waitForTimeout(200);
    await page.click(".w-draw .dwMore"); await page.click(".w-draw .dwFix");
    const one = await P(() => { const p = document.querySelector(".w-draw .dwPad").pad, ss = p.result.symbols.filter(q => q.label === "1"), s = ss[ss.length - 1], r = p.canvas.getBoundingClientRect(), m = p.toScreen([s.box.x + s.box.w / 2, s.box.y + s.box.h / 2]); return { x: r.left + m[0], y: r.top + m[1] }; });
    await page.mouse.click(one.x, one.y);
    await expect(page.locator(".w-draw .dwFixPop")).toBeVisible();
    await page.evaluate(() => { const p = document.querySelector(".w-draw .dwPad").pad, ss = p.result.symbols.filter(q => q.label === "1"); document.querySelector(".w-draw .dwPad").relabel(ss[ss.length - 1], "4"); });
    await settledOn(page, "draw"); await page.waitForTimeout(300);
    await page.selectOption("#sceneSel", scenes[1]); await page.waitForTimeout(300);
    await page.selectOption("#sceneSel", scenes[0]); await page.waitForTimeout(400);
    await settledOn(page, "draw"); await page.waitForTimeout(300);
    const fx = await P(() => ({ fixes: document.querySelector(".w-draw .dwPad").getState().fixes.length, parked: (function(){ return document.querySelector(".w-draw .dwPad").latex.replace(/\s/g, ""); })(), answers: document.querySelector(".w-draw .dwPad").answers.map(a => a.latex) }));
    /* (these 1s are drawn alike, and Nib learns the shape it was told: the first may now read as a 4 too) */
    const first = +fx.parked[0];
    ok(fx.fixes === 1 && /^[14]\+4=/.test(fx.parked) && fx.answers.join() === String(first + 4), "the fix after a scene switch: " + JSON.stringify(fx));
  });

  test("v7.61: the pen over the board reads too — Solve on the bar, the answer after the =, blurred; a tap shows it (its dot goes); a lasso move carries it, still shown; the eraser over the = takes it; Undo, Done and the toast's Undo keep it with the drawing; Solve off is remembered", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    await expect(page.locator("#inkBar")).toBeVisible();
    ok((await page.getAttribute("#inkSolve", "aria-pressed")) === "true" && await page.evaluate(() => window.Deckhand.ink.solving()), "Solve is not on from the start");
    const count = () => page.evaluate(() => window.Deckhand.ink.count());
    const prob = written("12+30=", 520, 330, 1.1);
    await strokes(page, prob);
    ok((await count()) === prob.length, "the pen made " + await count() + " items for " + prob.length + " strokes");
    await settledOn(page, "ink"); await page.waitForTimeout(200);
    ok((await answersOf(page, "ink")) === "42", "12 + 30 = over the board was answered " + await answersOf(page, "ink"));
    let L = await look(page, "ink");
    ok(L && L.hidden && L.gold > 60 && L.step <= 40, "not out of focus where it goes: " + JSON.stringify(L));
    ok(await page.evaluate(() => { const c = window.Deckhand.ink.nib().pad.canvas, d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30 && d[i + 2] > d[i] + 25) return false; return true; }), "the layer draws ink of its own");
    await page.screenshot({ path: test.info().outputPath("ink-blurred.png") });
    // a tap on it: shown, and the tap left no dot
    let c = await chipAt(page, "ink");
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(500);
    L = await look(page, "ink");
    ok(L && L.shown && L.step >= 120 && (await count()) === prob.length, "the tap: " + JSON.stringify(L) + ", " + await count() + " items");
    await page.screenshot({ path: test.info().outputPath("ink-shown.png") });
    // the lasso carries the line and its answer, still shown
    const before = L.box;
    await page.click('#inkBar [data-tool="lasso"]');
    const xs = prob.flat().map(p => p[0]), ys = prob.flat().map(p => p[1]);
    const X0 = Math.min(...xs) - 20, Y0 = Math.min(...ys) - 20, X1 = Math.max(...xs) + 20, Y1 = Math.max(...ys) + 20;
    await page.mouse.move(X0, Y0); await page.mouse.down();
    for (const [x, y] of [[X1, Y0], [X1, Y1], [X0, Y1], [X0, Y0 + 4]]) await page.mouse.move(x, y, { steps: 6 });
    await page.mouse.up();
    ok((await page.evaluate(() => window.Deckhand.ink.select())).n === prob.length, "the lasso did not take the line");
    await page.mouse.move((X0 + X1) / 2, (Y0 + Y1) / 2); await page.mouse.down();
    await page.mouse.move((X0 + X1) / 2 + 100, (Y0 + Y1) / 2 + 60, { steps: 8 }); await page.mouse.up();
    await page.waitForFunction(b0 => { const P = window.Deckhand.ink.nib().pad, it = P.plan && P.plan.items.find(i => i.answer); return it && Math.abs(it.box[0] - b0 - 100) < 15; }, before[0], { timeout: 30000 }).catch(() => {});
    await settledOn(page, "ink"); await page.waitForTimeout(300);
    L = await look(page, "ink");
    ok(L && L.shown && Math.abs(L.box[0] - before[0] - 100) < 15 && Math.abs(L.box[1] - before[1] - 60) < 15, "the answer did not go with its line, shown: " + JSON.stringify({ L, before }));
    // Undo of the move: the line goes back, and its answer with it (still shown)
    await page.click("#inkUndo");
    await page.waitForFunction(b0 => { const P = window.Deckhand.ink.nib().pad, it = P.plan && P.plan.items.find(i => i.answer); return it && Math.abs(it.box[0] - b0) < 15; }, before[0], { timeout: 30000 }).catch(() => {});
    await settledOn(page, "ink"); await page.waitForTimeout(300);
    L = await look(page, "ink");
    ok(L && L.shown && Math.abs(L.box[0] - before[0]) < 15 && Math.abs(L.box[1] - before[1]) < 15, "Undo of the move left the answer behind: " + JSON.stringify({ L, before }));
    // the eraser over the shown answer (not the =): out of focus again; Undo shows it
    await page.click("#inkEraser");
    const ab = L.box;
    await page.mouse.move(ab[0] + 4, (ab[1] + ab[3]) / 2); await page.mouse.down();
    await page.mouse.move(ab[2] - 4, (ab[1] + ab[3]) / 2, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(400);
    L = await look(page, "ink");
    ok(L && L.hidden, "the eraser over the shown answer did not put it out of focus: " + JSON.stringify(L));
    await page.click("#inkUndo");
    await page.waitForTimeout(500);
    L = await look(page, "ink");
    ok(L && L.shown, "Undo of that eraser did not show it again: " + JSON.stringify(L));
    await page.click('#inkBar [data-tool="pen"]');
    // the eraser over the "=": the line no longer ends with "=", the answer goes; Undo brings it back shown
    await page.click('#inkBar [data-tool="pen"]');
    const eq = await page.evaluate(() => { const P = window.Deckhand.ink.nib().pad, s = P.result.symbols.filter(q => q.label === "=").pop(); return [s.box.x + s.box.w / 2, s.box.y + s.box.h / 2, s.box.w]; });
    await page.click("#inkEraser");
    await page.mouse.move(eq[0] - eq[2], eq[1] - 6); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(eq[0] - eq[2] + i * eq[2] / 5, eq[1] + (i % 2 ? 8 : -8));
    await page.mouse.up();
    await settledOn(page, "ink"); await page.waitForTimeout(300);
    ok((await answersOf(page, "ink")) === "", "erasing the = left the answer: " + await answersOf(page, "ink"));
    await page.click("#inkUndo");
    await settledOn(page, "ink"); await page.waitForTimeout(300);
    L = await look(page, "ink");
    ok((await answersOf(page, "ink")) === "42" && L && L.shown, "Undo did not bring the answer back shown: " + JSON.stringify(L));
    // Done takes it with the drawing; the toast's Undo brings both back
    await page.click("#inkDone");
    await page.waitForTimeout(200);
    ok((await answersOf(page, "ink")) === "" && (await look(page, "ink")) === null, "Done left an answer");
    await page.click("#undoToast button");
    await settledOn(page, "ink"); await page.waitForTimeout(300);
    L = await look(page, "ink");
    ok((await answersOf(page, "ink")) === "42" && L && L.shown, "the toast's Undo: " + JSON.stringify(L));
    // Solve off: nothing read; remembered after a reload
    await page.click("#inkBtn");
    await expect(page.locator("#inkBar")).toBeVisible();
    await page.click("#inkSolve");
    ok((await page.getAttribute("#inkSolve", "aria-pressed")) === "false" && (await page.evaluate(() => window.Deckhand.config.ui.inkSolve)) === false, "Solve did not go off");
    await page.waitForTimeout(300);
    ok((await answersOf(page, "ink")) === "" && (await page.evaluate(() => window.Deckhand.ink.nib().pad.strokes.length)) === 0, "Solve off still reads");
    await page.click("#inkDone");
    await dh.flush();
    await dh.reopen("#t=2026-10-21T10:30");
    await dh.launch();
    ok((await page.evaluate(() => window.Deckhand.config.ui.inkSolve)) === false && !(await page.evaluate(() => window.Deckhand.ink.solving())), "Solve off was not remembered");
    await page.click("#inkBtn");
    ok((await page.getAttribute("#inkSolve", "aria-pressed")) === "false", "the bar does not show Solve off");
    await page.click("#inkSolve");
    await page.click("#inkDone");
  });

  test("v7.61 (review): a thin eraser's quick cut through a quick line breaks it for Nib too, though no sample of the line is under it", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    await page.mouse.move(300, 600); await page.mouse.down(); await page.mouse.move(700, 600, { steps: 2 }); await page.mouse.up();   // samples 200 px apart
    await page.click('#inkBar [data-size="3"]');
    await page.click("#inkEraser");
    await page.mouse.move(410, 560); await page.mouse.down(); await page.mouse.move(410, 640, { steps: 2 }); await page.mouse.up();   // through the gap between two samples
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => ({ items: window.Deckhand.ink.count(), read: window.Deckhand.ink.nib().pad.strokes.map(s => [Math.round(s[0][0]), Math.round(s[s.length - 1][0])]) }));
    ok(st.items === 2 && st.read.length === 2 && st.read[0][1] <= 410 && st.read[1][0] >= 410, "Nib still reads the line whole: " + JSON.stringify(st));
    await page.click("#inkDone");
  });

  test("v7.61: a highlighter, a shape and white space are not read; a marker is; the answers sit over the ink but never catch the pen", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    await page.click('#inkBar [data-color="#FFE45C"]');            // the highlighter
    await strokes(page, [[[300, 200], [500, 200]]]);
    await page.click('#inkBar [data-tool="rect"]');
    await strokes(page, [[[300, 260], [420, 330]]]);
    await page.click('#inkBar [data-color="#17324D"]');
    await page.click('#inkBar [data-tool="marker"]');
    await strokes(page, written("1+1=", 600, 420, 1.0));
    await settledOn(page, "ink"); await page.waitForTimeout(200);
    const st = await page.evaluate(() => ({ items: window.Deckhand.ink.count(), read: window.Deckhand.ink.nib().pad.strokes.length, pe: getComputedStyle(document.getElementById("inkNib")).pointerEvents, z: getComputedStyle(document.getElementById("inkNib")).zIndex }));
    ok(st.items === 2 + written("1+1=", 0, 0).length && st.read === written("1+1=", 0, 0).length, "what Nib reads: " + JSON.stringify(st));
    ok((await answersOf(page, "ink")) === "2", "the marker's 1 + 1 = was answered " + await answersOf(page, "ink"));
    ok(st.pe === "none" && st.z === "14", "the layer could catch the pen: " + JSON.stringify(st));
    const top = await page.evaluate(() => document.elementFromPoint(700, 300).id);
    ok(top === "ink", "a pointer lands on " + top + ", not the pen's canvas");
    await page.click("#inkDone");
  });

  test("v7.61: Export a copy carries Nib (one engine, before the board's script) and the copy's Sketch Pad reads", async ({ page, dh }) => {
    await dh.openAt("");
    await dh.launch();
    await page.click("#setBtn");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#dlBtn")]);
    const html = fs.readFileSync(await dl.path(), "utf8");
    const tag = '<script id="nib-engine">\n/*! Nib ', engines = html.split(tag).length - 1, at = html.indexOf(tag), main = html.indexOf("<script>\n(function(){");
    ok(engines === 1 && at > 0 && main > at && /\/\*! Nib \d+\.\d+\.\d+/.test(html), "the copy's engine: " + engines + " at " + at + ", the board's script at " + main);
    ok(html.indexOf('<div id="inkNib" aria-hidden="true"></div>') > 0, "the copy carries the pen's Nib layer as it was at run time (a pad and its canvas), not empty");
    const saved = path.join(dh.fixtureDir, "tmp_nib_copy.html");
    fs.writeFileSync(saved, html);
    const pg = await dh.newPage();
    await pg.goto("file://" + saved);
    await pg.waitForFunction(() => !!window.Deckhand);
    ok(await pg.evaluate(() => !!customElements.get("nib-pad") && !!window.Nib && typeof window.Nib.recognize === "function"), "the copy has no Nib");
    const r = await pg.evaluate(s => window.Nib.recognize(s, { times: false }).latex, written("2+3=", 100, 100));
    ok(r.replace(/\s/g, "") === "2+3=", "the copy's Nib read " + r);
    await pg.close();
  });
});
