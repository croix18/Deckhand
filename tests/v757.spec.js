/* v7.57 — the pen grows up (Croix: "more colors, markers, pen options for my drawing feature when
 * I have my embed slides out. Shapes: line, arrow, rays, rectangles, circles, triangles, a fill
 * toggle. A lasso tool to move or resize anything drawn."). Ten pen colors and three highlighters,
 * pen · marker · eraser · lasso, four sizes, six shapes with a fill toggle, a lasso that moves and
 * resizes, a real Undo history — and the bar still fits a laptop screen and a staged deck. */
const { test, expect, ok } = require("./helpers");

const ink = (page, fn) => page.evaluate(fn);
const items = page => page.evaluate(() => window.Deckhand.ink.items());
const tool = page => page.evaluate(() => window.Deckhand.ink.tool());
const pressed = (page, sel) => page.evaluate(s => document.querySelector("#inkBar " + s).getAttribute("aria-pressed"), sel);
async function drag(page, x0, y0, x1, y1, steps){
  await page.mouse.move(x0, y0); await page.mouse.down();
  await page.mouse.move(x1, y1, { steps: steps || 8 });
  await page.mouse.up();
}
async function loop(page, x0, y0, x1, y1){             // a lasso: round the box and back
  await page.mouse.move(x0, y0); await page.mouse.down();
  for (const [x, y] of [[x1, y0], [x1, y1], [x0, y1], [x0, y0 + 4]]) await page.mouse.move(x, y, { steps: 6 });
  await page.mouse.up();
}
async function penOut(page, dh){
  await dh.openAt("#t=2026-10-21T10:30");
  await dh.launch();
  await page.click("#inkBtn");
  await expect(page.locator("#inkBar")).toBeVisible();
}

test.describe("v7.57 the pen", () => {
  test("v7.57: thirteen swatches and four sizes; a highlighter swatch is the highlighter, a pen color brings the pen back; marker and shapes keep their tool", async ({ page, dh }) => {
    await penOut(page, dh);
    ok((await page.locator("#inkBar .inkSwatch").count()) === 13, "13 swatches");
    ok((await page.locator("#inkBar .inkSwatch.inkHi").count()) === 3, "3 highlighters");
    ok((await page.locator("#inkBar [data-size]").count()) === 4, "4 sizes");
    ok((await page.locator('#inkBar [data-color="#FF7F6A"]').count()) === 0, "coral is the alarms', not a pen");
    ok((await page.locator("#inkBar [data-tool]").count()) === 10, "pen, marker, eraser, lasso + six shapes");
    ok((await pressed(page, '[data-color="#17324D"]')) === "true" && (await pressed(page, '[data-size="10"]')) === "true" && (await pressed(page, '[data-tool="pen"]')) === "true", "the defaults are not pressed");
    ok((await tool(page)) === "pen", "starts on the pen");
    await page.click('#inkBar [data-color="#9BF28C"]');
    ok((await tool(page)) === "hi" && (await pressed(page, '[data-color="#9BF28C"]')) === "true" && (await pressed(page, '[data-tool="pen"]')) === "false", "a highlighter swatch did not pick the highlighter");
    await page.click('#inkBar [data-color="#2F6FE4"]');
    ok((await tool(page)) === "pen" && (await pressed(page, '[data-color="#2F6FE4"]')) === "true", "a pen color after the highlighter did not bring the pen back");
    await page.click('#inkBar [data-tool="marker"]');
    await page.click('#inkBar [data-color="#D7263D"]');
    ok((await tool(page)) === "marker", "a color took the marker away");
    await page.click('#inkBar [data-tool="arrow"]');
    await page.click('#inkBar [data-color="#2E9E5B"]');
    ok((await tool(page)) === "arrow" && (await pressed(page, '[data-tool="arrow"]')) === "true", "a color took the shape tool away");
    await page.click('#inkBar [data-size="3"]');
    ok((await pressed(page, '[data-size="3"]')) === "true" && (await pressed(page, '[data-size="10"]')) === "false", "size pressed state");
    // the eraser still toggles; a highlighter, then a pen tool, takes back the last pen color
    await page.click("#inkEraser");
    ok((await tool(page)) === "erase", "eraser");
    await page.click("#inkEraser");
    ok((await tool(page)) === "pen", "the eraser did not toggle back to the pen");
    await page.click('#inkBar [data-color="#FFE45C"]');
    await page.click('#inkBar [data-tool="pen"]');
    ok((await tool(page)) === "pen" && (await pressed(page, '[data-color="#2E9E5B"]')) === "true", "the pen came back in highlighter yellow");
    await page.click("#inkDone");
  });

  test("v7.57: the marker, the highlighter and the eraser are strokes of their own mode", async ({ page, dh }) => {
    await penOut(page, dh);
    await page.click('#inkBar [data-tool="marker"]');
    await page.click('#inkBar [data-color="#F28C28"]');
    await drag(page, 400, 300, 800, 320);
    await page.click('#inkBar [data-color="#FF9BD6"]');
    await drag(page, 400, 400, 800, 420);
    await page.click("#inkEraser");
    await drag(page, 600, 280, 600, 440);
    const it = await items(page);
    ok(it.length === 3 && it.every(x => x.kind === "stroke"), "three strokes: " + JSON.stringify(it.map(x => x.kind)));
    ok(it[0].mode === "marker" && it[0].color === "#F28C28", "marker: " + it[0].mode + " " + it[0].color);
    ok(it[1].mode === "hi" && it[1].color === "#FF9BD6", "highlighter: " + it[1].mode + " " + it[1].color);
    ok(it[2].mode === "erase", "eraser: " + it[2].mode);
    // the marker is broad and opaque on the canvas
    const px = await page.evaluate(() => { const c = document.getElementById("ink"), k = c.width / innerWidth; return [...c.getContext("2d").getImageData(Math.round(450 * k), Math.round(303 * k), 1, 1).data]; });
    ok(px[3] === 255 && px[0] > 200, "the marker is not painted opaque orange: " + px);
    await page.click("#inkDone");
  });

  test("v7.57: each shape is a drag — line, arrow, ray, rectangle, circle, triangle; Fill fills; Shift keeps it square", async ({ page, dh }) => {
    await penOut(page, dh);
    const shapes = ["line", "arrow", "ray", "rect", "ellipse", "tri"];
    for (let i = 0; i < shapes.length; i++){
      await page.click('#inkBar [data-tool="' + shapes[i] + '"]');
      const x = 300 + i * 220;
      await drag(page, x, 300, x + 150, 420);
    }
    let it = await items(page);
    ok(it.length === 6, "six shapes: " + it.length);
    it.forEach((s, i) => {
      ok(s.kind === "shape" && s.shape === shapes[i], "kind/shape " + i + ": " + s.kind + " " + s.shape);
      const x = 300 + i * 220;
      ok(Math.abs(s.a.x - x) < 2 && Math.abs(s.a.y - 300) < 2 && Math.abs(s.b.x - (x + 150)) < 2 && Math.abs(s.b.y - 420) < 2, "a/b " + shapes[i] + ": " + JSON.stringify([s.a, s.b]));
      ok(s.fill === false, "filled without Fill: " + shapes[i]);
    });
    // a tap with a shape tool is not a shape
    await page.mouse.click(900, 700);
    ok((await items(page)).length === 6, "a tap made a shape");
    // Fill
    await page.click("#inkFill");
    ok((await pressed(page, "#inkFill")) === "true", "Fill not pressed");
    await page.click('#inkBar [data-tool="rect"]');
    await drag(page, 400, 600, 600, 760);
    it = await items(page);
    ok(it[6].fill === true && it[6].shape === "rect", "Fill did not fill: " + JSON.stringify(it[6]));
    const px = await page.evaluate(() => { const c = document.getElementById("ink"), k = c.width / innerWidth; return [...c.getContext("2d").getImageData(Math.round(500 * k), Math.round(680 * k), 1, 1).data]; });
    ok(px[3] > 40 && px[3] < 140, "the fill is not a light wash: " + px);
    // Shift: a square
    await page.click("#inkFill");
    await page.click('#inkBar [data-tool="ellipse"]');
    await page.keyboard.down("Shift");
    await drag(page, 800, 600, 1000, 700);
    await page.keyboard.up("Shift");
    const c = (await items(page))[7];
    ok(Math.abs(Math.abs(c.b.x - c.a.x) - Math.abs(c.b.y - c.a.y)) < 1 && !c.fill, "Shift did not make a circle: " + JSON.stringify(c));
    await page.click("#inkDone");
  });

  test("v7.57: the lasso picks what it rings, moves it, resizes it from a corner, recolors it; Delete removes it and Undo brings it back; an empty lasso lets go", async ({ page, dh }) => {
    await penOut(page, dh);
    await drag(page, 500, 500, 700, 520, 10);                    // a stroke
    await page.click('#inkBar [data-tool="rect"]');
    await drag(page, 1100, 300, 1300, 450);                      // a rectangle far away
    await page.click('#inkBar [data-tool="lasso"]');
    ok((await tool(page)) === "lasso", "lasso tool");
    await loop(page, 460, 460, 740, 560);
    let s = await ink(page, () => window.Deckhand.ink.select());
    ok(s && s.n === 1, "the lasso did not pick the stroke alone: " + JSON.stringify(s));
    const before = (await items(page))[0];
    // drag inside: it moves
    const depth0 = await ink(page, () => window.Deckhand.ink.undoDepth());
    await drag(page, s.x + s.w / 2, s.y + s.h / 2, s.x + s.w / 2 + 100, s.y + s.h / 2 + 50, 10);
    let after = (await items(page))[0];
    ok(after.pts.every((p, i) => Math.abs(p.x - before.pts[i].x - 100) < 0.01 && Math.abs(p.y - before.pts[i].y - 50) < 0.01), "the points did not move by the drag");
    ok((await items(page))[1].a.x === 1100, "the rectangle moved too");
    ok((await ink(page, () => window.Deckhand.ink.undoDepth())) === depth0 + 1, "a move is one Undo step");
    s = await ink(page, () => window.Deckhand.ink.select());
    ok(s && s.n === 1, "the move lost the selection");
    // the bottom-right handle: it grows
    await drag(page, s.x + s.w, s.y + s.h, s.x + s.w + 120, s.y + s.h + 80, 10);
    const s2 = await ink(page, () => window.Deckhand.ink.select());
    ok(s2 && s2.w > s.w + 100 && s2.h > s.h + 60 && Math.abs(s2.x - s.x) < 3 && Math.abs(s2.y - s.y) < 3, "the corner did not resize about the opposite corner: " + JSON.stringify([s, s2]));
    after = (await items(page))[0];
    ok(after.size > before.size, "the stroke's width did not scale: " + after.size);
    // a color tap recolors the selection and keeps it
    await page.click('#inkBar [data-color="#7E5FC5"]');
    ok((await items(page))[0].color === "#7E5FC5" && (await items(page))[1].color === "#17324D", "recolor: " + JSON.stringify((await items(page)).map(x => x.color)));
    ok((await ink(page, () => window.Deckhand.ink.select())) !== null && (await tool(page)) === "lasso", "the recolor dropped the selection");
    // Delete, then Undo
    await page.keyboard.press("Delete");
    ok((await items(page)).length === 1 && (await items(page))[0].kind === "shape", "Delete did not remove the selection");
    ok((await ink(page, () => window.Deckhand.ink.select())) === null, "the selection outlived Delete");
    await page.click("#inkUndo");
    ok((await items(page)).length === 2 && (await items(page))[0].color === "#7E5FC5", "Undo did not bring it back");
    await page.click("#inkUndo");                                 // and the history keeps going: the recolor
    ok((await items(page))[0].color === "#17324D", "Undo did not step back through the recolor");
    // a lasso that rings nothing lets go
    await loop(page, 420, 420, 1060, 800);
    ok((await ink(page, () => window.Deckhand.ink.select())) !== null, "re-select");
    await loop(page, 200, 800, 300, 900);
    ok((await ink(page, () => window.Deckhand.ink.select())) === null, "an empty lasso kept the selection");
    // the rectangle by its outline; Escape lets go before it ends the drawing
    await loop(page, 1080, 280, 1320, 470);
    ok((await ink(page, () => window.Deckhand.ink.select()) || {}).n === 1, "the lasso did not pick the rectangle");
    await page.keyboard.press("Escape");
    ok((await ink(page, () => window.Deckhand.ink.select())) === null && (await ink(page, () => window.Deckhand.ink.isArmed())), "Escape should let go of the selection first");
    await page.keyboard.press("Escape");
    ok(!(await ink(page, () => window.Deckhand.ink.isArmed())), "the second Escape did not end the drawing");
  });

  test("v7.57: Done still clears everything with an Undo; D still toggles; Clear has an Undo", async ({ page, dh }) => {
    await penOut(page, dh);
    await drag(page, 400, 400, 700, 420);
    await page.click('#inkBar [data-tool="tri"]');
    await drag(page, 800, 300, 950, 450);
    await page.click("#inkClear");
    ok((await ink(page, () => window.Deckhand.ink.count())) === 0, "clear");
    await page.click("#inkUndo");
    ok((await ink(page, () => window.Deckhand.ink.count())) === 2, "Undo after Clear");
    await page.click("#inkDone");
    await expect(page.locator("body")).not.toHaveClass(/inking/);
    ok((await ink(page, () => window.Deckhand.ink.count())) === 0, "Done kept the ink");
    await page.click("#undoToast button");
    ok((await ink(page, () => window.Deckhand.ink.count())) === 2, "the toast's Undo did not bring it back");
    await page.keyboard.press("d");
    await expect(page.locator("body")).toHaveClass(/inking/);
    await page.click("#inkUndo");                                 // the history came back with the drawing
    ok((await ink(page, () => window.Deckhand.ink.count())) === 1, "Undo after the toast");
    await page.keyboard.press("d");
    await expect(page.locator("body")).not.toHaveClass(/inking/);
  });

  for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]){
    test("v7.57: the bar fits the screen on both sides at " + vp.width + "×" + vp.height, async ({ page, dh }) => {
      await page.setViewportSize(vp);
      await penOut(page, dh);
      const fits = () => page.evaluate(() => {
        const r = document.getElementById("inkBar").getBoundingClientRect(), b = document.getElementById("inkBar");
        const last = document.getElementById("inkDone").getBoundingClientRect();
        return { l: r.left, t: r.top, r: r.right, b: r.bottom, W: innerWidth, H: innerHeight, scroll: b.scrollHeight > b.clientHeight + 1, doneB: last.bottom, w: r.width, h: r.height };
      });
      let g = await fits();
      ok(await page.evaluate(() => document.body.classList.contains("inkLeft")), "the pen starts on the left");
      ok(g.l >= 0 && g.t >= 0 && g.r <= g.W && g.b <= g.H && !g.scroll && g.doneB <= g.H, "the left column does not fit: " + JSON.stringify(g));
      ok(g.h > g.w, "not a column: " + JSON.stringify(g));
      await page.click("#inkSide");
      g = await fits();
      ok(g.l >= 0 && g.t >= 0 && g.r <= g.W && g.b <= g.H && !g.scroll && g.w > g.h, "the bottom-right band does not fit: " + JSON.stringify(g));
      await page.click("#inkSide");
      await page.click("#inkDone");
    });
  }

  test("v7.57: over a staged Slides deck the pop-up bar is see-through, fits, and the shapes draw over the slide", async ({ page, dh }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await dh.addW("addEmbedBtn");
    await page.keyboard.press("Escape");
    await page.fill(".w-embed .embBigIn", "https://docs.google.com/presentation/d/abc123/edit");
    await page.click(".w-embed .embLoad");
    await expect(page.locator(".w-embed .embFrame")).toHaveAttribute("src", /\/d\/abc123\/embed/);
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("body")).toHaveClass(/focusMode/);
    await expect(page.locator("#inkBlob")).toBeVisible();
    await page.click("#inkBlob");
    await expect(page.locator("#inkBar")).toBeVisible();
    const g = await page.evaluate(() => { const b = document.getElementById("inkBar"), r = b.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, W: innerWidth, H: innerHeight, bg: getComputedStyle(b).backgroundColor, scroll: b.scrollHeight > b.clientHeight + 1 }; });
    ok(g.l >= 0 && g.t >= 0 && g.r <= g.W && g.b <= g.H && !g.scroll, "the pop-up does not fit over the deck: " + JSON.stringify(g));
    ok(/rgba\(255, 255, 255, 0\.[0-9]+\)/.test(g.bg), "the pop-up is not see-through: " + g.bg);
    await page.click('#inkBar [data-tool="ray"]');
    await drag(page, 500, 400, 800, 300);
    const it = await items(page);
    ok(it.length === 1 && it[0].shape === "ray", "no ray over the slide: " + JSON.stringify(it));
    await page.click("#inkDone");
    await expect(page.locator("body")).not.toHaveClass(/inking/);
  });
});
