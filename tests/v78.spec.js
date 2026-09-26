/* v7.8 — the math room's tools: Sketch Pad backgrounds (grid, dot paper,
 * number line, coordinate plane) and the probability kit (coin, spinner,
 * cards, plus a tally on the dice). And the clock takes the whole default
 * board, a size up (Croix: "Yes it is empty… make my main clock a little bit
 * bigger now that I have more space"). */
const { test, expect, ok } = require("./helpers");

const place = (page, sel, box) => page.evaluate(([s, b]) => {
  const en = document.querySelector(s)._entry;
  en.cfg.x = b[0]; en.cfg.y = b[1]; en.cfg.w = b[2]; en.cfg.h = b[3];
  en.el.style.left = b[0] + "%"; en.el.style.top = b[1] + "%";
  en.el.style.width = b[2] + "%"; en.el.style.height = b[3] + "%";
}, [sel, box]);

test.describe("v7.8 the clock", () => {
  test("v7.8: the default board is the clock alone at full width, a size up; a retired settle card's row goes to the clock", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    const c = await page.evaluate(() => ({
      cfg: window.Deckhand.config.scenes[0].widgets[0],
      size: parseFloat(getComputedStyle(document.getElementById("clock")).fontSize),
      w: document.getElementById("clockWidget").getBoundingClientRect().width
    }));
    ok(c.cfg.type === "clock" && c.cfg.w === 100 && c.cfg.h === 100, "default clock box: " + JSON.stringify(c.cfg));
    ok(c.size >= 240 && c.w > 1800, "the clock did not get bigger: " + JSON.stringify(c));
    // a 7.6 board: clock 0–58 beside settle 61–100 → the clock spans the row
    const pg = await dh.loadFixture("tmp_clock_grow.html", JSON.stringify({
      schemaVersion: 4, appVersion: "7.6.0", ownerName: "",
      scenes: [
        { name: "Daily Board", widgets: [
          { type: "clock", x: 0, y: 0, w: 58, h: 100 },
          { type: "settle", x: 61, y: 0, w: 39, h: 100, label: "Settle-in", seconds: 30 }
        ]},
        { name: "Corner", widgets: [
          { type: "clock", x: 0, y: 0, w: 40, h: 50 },
          { type: "settle", x: 60, y: 50, w: 40, h: 50 }        // not on the clock's row: untouched
        ]}
      ],
      bell: { groups: [] }
    }));
    const grown = await pg.evaluate(() => window.Deckhand.config.scenes.map(s => s.widgets.map(w => w.type + ":" + w.x + "/" + w.w).join(",")));
    ok(grown[0] === "clock:0/100", "the clock did not grow into the settle card's row: " + grown[0]);
    ok(grown[1] === "clock:0/40", "a clock on another row was resized: " + grown[1]);
    await pg.close();
  });
});

test.describe("v7.8 the Sketch Pad", () => {
  test("v7.8: backgrounds — grid, dot paper, number line, coordinate plane — under the ink, kept by Clear, saved in the config", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addW("addDrawBtn");
    await place(page, ".w-draw", [2, 2, 60, 90]);
    await page.waitForTimeout(200);
    const opts = await page.$$eval(".w-draw .dwBgSel option", os => os.map(o => o.value));
    ok(opts.join() === "blank,grid,dots,line,plane", "background choices: " + opts.join());
    const inkAt = async (x, y) => page.evaluate(([x, y]) => {
      const c = document.querySelector(".w-draw .dwBg");
      return [...c.getContext("2d").getImageData(Math.round(x * c.width), Math.round(y * c.height), 1, 1).data];
    }, [x, y]);
    // blank: nothing painted
    ok((await inkAt(0.5, 0.5))[3] === 0, "blank background has paint");
    const nonEmpty = () => page.evaluate(() => {
      const c = document.querySelector(".w-draw .dwBg"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n;
    });
    for (const k of ["grid", "dots", "line", "plane"]){
      await page.selectOption(".w-draw .dwBgSel", k);
      await page.waitForTimeout(80);
      ok((await nonEmpty()) > 500, k + " painted nothing");
      ok((await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "draw").bg)) === k, k + " not in config");
    }
    // the plane's axes cross at the centre in navy; the number line sits at mid-height
    const axis = await inkAt(0.5, 0.25);
    ok(axis[3] > 0 && axis[0] < 60, "the y axis is not navy at the centre column: " + axis);
    await page.selectOption(".w-draw .dwBgSel", "line");
    await page.waitForTimeout(80);
    ok((await inkAt(0.5, 0.5))[3] > 0, "the number line is not at mid-height");
    // ink over it, Clear the ink, the background stays
    const box = await page.locator(".w-draw .dwCanvas").boundingBox();
    await page.mouse.move(box.x + 100, box.y + 100); await page.mouse.down(); await page.mouse.move(box.x + 300, box.y + 120); await page.mouse.up();
    const inked = await page.evaluate(() => {
      const c = document.querySelector(".w-draw .dwCanvas"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n;
    });
    ok(inked > 100, "no ink drawn");
    await page.click(".w-draw .dwClear");
    ok((await page.evaluate(() => {
      const c = document.querySelector(".w-draw .dwCanvas"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n;
    })) === 0, "Clear left ink");
    ok((await nonEmpty()) > 500, "Clear wiped the background");
    // the background survives a reload; a junk value sanitizes to blank
    await dh.flush();
    await dh.reopen("#t=2026-09-28T10:30");
    await dh.launch();
    ok(await page.inputValue(".w-draw .dwBgSel") === "line", "background not restored");
    const pg = await dh.loadFixture("tmp_draw_bg.html", JSON.stringify({
      schemaVersion: 4, appVersion: "7.8.0", ownerName: "",
      scenes: [{ name: "Daily Board", widgets: [{ type: "clock", x: 0, y: 0, w: 58, h: 100 }, { type: "draw", x: 61, y: 0, w: 39, h: 100, bg: "javascript:alert(1)" }] }],
      bell: { groups: [] }
    }));
    ok((await pg.evaluate(() => window.Deckhand.config.scenes[0].widgets[1].bg)) === "blank", "junk bg not sanitized");
    await pg.close();
  });
});

test.describe("v7.8 the probability kit", () => {
  test("v7.8: coin — 1–3 coins, a heads/tails tally that adds up, Space flips, R clears", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addW("addCoinBtn");
    await place(page, ".w-coin", [61, 2, 36, 60]);
    const t = () => page.evaluate(() => document.querySelector(".w-coin")._entry.api.tally());
    await expect(page.locator(".w-coin .coin")).toHaveCount(1);
    for (let i = 0; i < 6; i++) await page.click(".w-coin .cnGo");
    let s = await t();
    ok(s.flips === 6 && s.heads + s.tails === 6, "one-coin tally: " + JSON.stringify(s));
    await expect(page.locator(".w-coin .prTally")).toContainText("6 flips");
    await page.click('.w-coin .chip[data-n="3"]');
    await expect(page.locator(".w-coin .coin")).toHaveCount(3);
    await page.keyboard.press(" ");                      // the coin is the selected card
    s = await t();
    ok(s.flips === 7 && s.heads + s.tails === 9, "three-coin flip: " + JSON.stringify(s));
    await page.keyboard.press("r");
    s = await t();
    ok(s.flips === 0 && s.heads === 0 && s.tails === 0, "R did not clear: " + JSON.stringify(s));
    ok((await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "coin").count)) === 3, "count not in config");
  });

  test("v7.8: spinner — 2–8 equal sectors, the result is the sector under the pointer, a per-sector tally", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addW("addSpinBtn");
    await place(page, ".w-spin", [61, 2, 36, 90]);
    await expect(page.locator(".w-spin .spSeg")).toHaveCount(4);
    await page.click('.w-spin .chip[data-n="6"]');
    await expect(page.locator(".w-spin .spSeg")).toHaveCount(6);
    const t = () => page.evaluate(() => document.querySelector(".w-spin")._entry.api.tally());
    for (let i = 0; i < 5; i++){
      await page.click(".w-spin .spGo");
      await expect.poll(async () => (await t()).spins, { timeout: 4000 }).toBe(i + 1);
      const s = await t();
      const under = Math.floor(((360 - (s.angle % 360)) % 360) / 60) + 1;
      ok(s.result === under && s.result >= 1 && s.result <= 6, "result is not the sector under the pointer: " + JSON.stringify(s));
      ok(s.counts.reduce((a, b) => a + (b || 0), 0) === i + 1, "tally drift: " + JSON.stringify(s));
      await expect(page.locator(".w-spin .spResult")).toHaveText(String(s.result));
    }
    ok((await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "spin").sectors)) === 6, "sectors not in config");
    await page.click('.w-spin .chip[data-n="8"]');
    ok((await t()).spins === 0, "a new wheel kept the old tally");
  });

  test("v7.8: cards — 52 without replacement (no repeats, the count drops), Shuffle/R resets, Put it back keeps the deck whole", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addW("addCardsBtn");
    await place(page, ".w-cards", [61, 2, 36, 80]);
    const t = () => page.evaluate(() => document.querySelector(".w-cards")._entry.api.tally());
    await expect(page.locator(".w-cards .cdGo")).toHaveText("Draw · 52 left");
    await expect(page.locator(".w-cards .pcard.cdDown")).toHaveCount(1);
    const seen = new Set();
    for (let i = 0; i < 52; i++){
      await page.click(".w-cards .cdGo");
      const s = await t();
      const key = s.drawn.s + ":" + s.drawn.r;
      ok(!seen.has(key), "a card repeated without replacement: " + key);
      seen.add(key);
      ok(s.left === 51 - i, "count wrong after draw " + (i + 1) + ": " + s.left);
    }
    ok(seen.size === 52, "not a full deck");
    const suits = (await t()).suits;
    ok(suits.join() === "13,13,13,13", "suit tally: " + suits.join());
    await expect(page.locator(".w-cards .cdGo")).toBeDisabled();
    await expect(page.locator(".w-cards .cdGo")).toContainText("shuffle");
    await page.keyboard.press("r");
    await expect(page.locator(".w-cards .cdGo")).toHaveText("Draw · 52 left");
    ok((await t()).draws === 0, "R did not reshuffle");
    // with replacement the deck stays whole
    await page.click(".w-cards .cdReplace");
    await expect(page.locator(".w-cards .cdReplace")).toHaveAttribute("aria-pressed", "true");
    for (let i = 0; i < 5; i++) await page.keyboard.press(" ");
    const r = await t();
    ok(r.left === 52 && r.draws === 5, "replacement drew down the deck: " + JSON.stringify(r));
    ok((await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "cards").replace)) === true, "replace not in config");
    await expect(page.locator(".w-cards .pcard.red, .w-cards .pcard.black")).toHaveCount(1);
  });

  test("v7.8: dice keep a tally (per total), a new die count starts it over; the + Add menu has a Probability heading; sanitize clamps the kit", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addW("addDiceBtn");
    await place(page, ".w-dice", [61, 2, 36, 70]);
    const t = () => page.evaluate(() => document.querySelector(".w-dice")._entry.api.tally());
    for (let i = 0; i < 4; i++){ await page.click(".w-dice .dcGo"); await page.waitForTimeout(80); }
    let s = await t();
    const sum = Object.values(s.counts).reduce((a, b) => a + b, 0);
    ok(s.rolls === 4 && sum === 4 && Object.keys(s.counts).every(k => +k >= 2 && +k <= 12), "two-dice tally: " + JSON.stringify(s));
    await page.click('.w-dice .chip[data-n="1"]');
    s = await t();
    ok(s.rolls === 0, "a new die count kept the tally");
    await page.click(".w-dice .dcGo");
    s = await t();
    ok(s.rolls === 1 && Object.keys(s.counts).every(k => +k >= 1 && +k <= 6), "one-die tally: " + JSON.stringify(s));
    await page.click("#addBtn");
    const labels = await page.$$eval("#addMenu .menuLabel", ls => ls.map(l => l.textContent));
    ok(labels.join() === "Time,Students,Classroom,Board,Probability", "menu headings: " + labels.join());
    for (const id of ["addDiceBtn", "addCoinBtn", "addSpinBtn", "addCardsBtn"]) await expect(page.locator("#" + id)).toBeVisible();
    await page.keyboard.press("Escape");
    const pg = await dh.loadFixture("tmp_kit.html", JSON.stringify({
      schemaVersion: 4, appVersion: "7.8.0", ownerName: "",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "coin", x: 0, y: 0, w: 30, h: 40, count: 9 },
        { type: "spin", x: 30, y: 0, w: 30, h: 40, sectors: 1 },
        { type: "cards", x: 60, y: 0, w: 30, h: 40, replace: "yes" }
      ]}],
      bell: { groups: [] }
    }));
    const w = await pg.evaluate(() => window.Deckhand.config.scenes[0].widgets.map(x => x.type + ":" + (x.count || x.sectors || x.replace)));
    ok(w.join() === "coin:3,spin:2,cards:false", "kit not clamped: " + w.join());
    await expect(pg.locator(".w-coin .coin")).toHaveCount(3);
    await expect(pg.locator(".w-spin .spSeg")).toHaveCount(2);
    await pg.close();
  });
});

test.describe("v7.8.1 the panel's small words", () => {
  test("v7.8.1: the lock says how to open it; shortcut hints leave the room while locked; the startup pick yields to the rotation", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-28T10:30");
    await dh.launch();
    await dh.addTimer();
    await expect(page.locator("#lockBtn")).toHaveText("Lock");
    ok((await page.evaluate(() => getComputedStyle(document.querySelector(".w-timer .tHint")).display)) !== "none", "hint hidden while editing");
    await page.click("#lockBtn");
    await expect(page.locator("#lockBtn")).toHaveText("Hold to unlock");
    ok((await page.evaluate(() => getComputedStyle(document.querySelector(".w-timer .tHint")).display)) === "none", "keyboard hint shown to the room");
    await dh.unlock();
    await expect(page.locator("#lockBtn")).toHaveText("Lock");
    await page.click("#setBtn");
    await dh.tab("bells");
    await expect(page.locator("#sDefault")).toBeDisabled();          // the seed rotates weeks
    await expect(page.locator("#sDefaultHint")).toBeVisible();
    await page.uncheck("#sAuto");
    await expect(page.locator("#sDefault")).toBeEnabled();
    await expect(page.locator("#sDefaultHint")).toBeHidden();
    await page.check("#sAuto");
    await page.click("#closeBtn");
  });
});
