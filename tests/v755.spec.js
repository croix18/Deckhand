/* v7.55 — the audit fixes: timers and tools, the bells and the store, the canvas, the pen and
   Settings. One test per group where the harness reaches it cheaply. Names are synthetic. */
const { test, expect, ok, stageBtn } = require("./helpers");
const fs = require("fs"); const path = require("path");

const NAMES6 = ["Ava", "Ben", "Cal", "Dee", "Eli", "Fay"];
const setRoster = (page, names) => page.evaluate(n => { window.Deckhand.config.rosters = [{ period: "5th", names: n }]; }, names);
const pickerCard = page => page.evaluate(() => {
  const en = document.querySelector(".w-picker")._entry;
  en.api.startPause();                            // reduced motion: the name lands at once
  return document.querySelector(".w-picker .pkName").textContent;
});

test.describe("v7.55 group 1: timers and tools", () => {
  test("1a: a running timer that is deleted never rings the alarm at 0:00", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addTimer();
    /* started and removed in one go — a slow click on a loaded machine must not let 0:00 come first */
    const ran = await page.evaluate(() => {
      const api = document.querySelector(".w-timer")._entry.api;
      api.startSeconds(1);
      const r = api.running();
      document.querySelector(".w-timer .wClose").click();
      return r;
    });
    ok(ran, "the timer did not start");
    await expect(page.locator(".w-timer")).toHaveCount(0);
    await page.waitForTimeout(1400);               // past its 0:00
    ok(!(await page.evaluate(() => document.getElementById("alarm").classList.contains("on"))), "a deleted timer rang the alarm");
  });

  test("1j: a typed \"9999\" runs as 100:39, and the running face says so", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addTimer();
    const face = await page.evaluate(() => {
      const api = document.querySelector(".w-timer")._entry.api;
      api.entryStart("9"); api.entryDigit("9"); api.entryDigit("9"); api.entryDigit("9");
      api.commitEntryAndStart();
      const f = document.querySelector(".w-timer .tDisplay").textContent;
      api.reset();
      return f;
    });
    ok(/^100:3\d$/.test(face), "the running face: " + face);
  });

  test("1b: a student un-marked absent mid-round is drawn before the round ends, and counts as waiting", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");        // 5th period
    await dh.launch();
    await setRoster(page, NAMES6);
    await dh.addW("addPickerBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => window.Deckhand.absent.toggle("5th", "Fay"));
    const first = [await pickerCard(page), await pickerCard(page)];
    ok(!first.includes("Fay"), "an absent student was drawn: " + first);
    await page.evaluate(() => window.Deckhand.absent.toggle("5th", "Fay"));   // back from the nurse
    await page.evaluate(() => document.querySelector(".w-picker")._entry.api.resync());
    await expect(page.locator(".w-picker .pkLeft")).toHaveText(/^4 of 6 left/);
    const rest = [];
    for (let i = 0; i < 4; i++) rest.push(await pickerCard(page));
    ok(rest.includes("Fay"), "Fay waited for the next round: " + rest);
    ok(new Set(first.concat(rest)).size === 6, "a repeat inside one round: " + first.concat(rest));
    await expect(page.locator(".w-picker .pkLeft")).toHaveText(/^0 of 6 left/);
  });

  test("1c: across the round boundary nobody is called twice in a row", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await setRoster(page, ["Ava", "Ben"]);
    await dh.addW("addPickerBtn"); await page.keyboard.press("Escape");
    const seq = await page.evaluate(() => {
      const api = document.querySelector(".w-picker")._entry.api, out = [];
      for (let i = 0; i < 60; i++){ api.startPause(); out.push(document.querySelector(".w-picker .pkName").textContent); }
      return out;
    });
    ok(seq.every((n, i) => i === 0 || n !== seq[i - 1]), "called twice in a row: " + seq.join(","));
  });
});

test.describe("v7.55 group 2: the bells and the store", () => {
  test("2a: on a Wednesday, \"Regular times instead\" runs the regular blocks", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-23T10:30");        // Wednesday, Teal
    await dh.launch();
    await expect(page.locator("#weekTag")).toHaveText("Teal Week (Wed)");
    await page.evaluate(() => window.Deckhand.setToday("regular", []));
    await expect(page.locator("#weekTag")).toHaveText("Teal Week");
    const st = await page.evaluate(() => window.Deckhand.bellStatusAt("2026-09-23T10:30"));
    ok(st.sched === "Teal Week", "the status still read the Wednesday schedule: " + JSON.stringify(st));
    await dh.home();
    await expect(page.locator('#todayChips [data-today="regular"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('#todayChips [data-today="regular"]')).toHaveText("Regular times instead");
  });

  test("2e: a board with no schemaVersion but the v4 shape keeps its scenes", async ({ page, dh }) => {
    const m = dh.SRC.match(/<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/);
    const c = JSON.parse(m[1]);
    delete c.schemaVersion;
    c.scenes[0].name = "Kept scene";
    const pg = await dh.loadFixture("tmp_v755_nosv.html", JSON.stringify(c));
    const got = await pg.evaluate(() => ({ src: window.Deckhand.configSource, name: window.Deckhand.config.scenes[0].name }));
    ok(got.src !== "defaults" && got.name === "Kept scene", "the board reset to the defaults: " + JSON.stringify(got));
  });

  test("2i + 2d + 2f: repeated roster names are told apart; a 24-hour afternoon block is kept; the cards log caps after dropping junk", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    const r = await page.evaluate(() => {
      const S = window.Deckhand.sanitize;
      const a = S({ rosters: [{ period: "5th", names: ["Sam", "Sam", "Ava", "Sam", "Sam (2)"] }] }).rosters[0].names;
      const b = S({ rosters: [{ period: "5th", names: a }] }).rosters[0].names;
      const blocks = S({ schemaVersion: 4, bell: { groups: [{ name: "G", regular: [{ label: "1st", start: "8:00", end: "8:50" }, { label: "6th", start: "13:15", end: "14:05" }, { label: "Bad", start: "19:00", end: "20:00" }], wednesday: [] }] } }).bell.groups[0].regular;
      const log = [];
      for (let i = 0; i < 600; i++) log.push({ d: "2026-09-01", p: "5th", names: ["Ava"] });
      for (let i = 0; i < 50; i++) log.push({ d: "junk" });
      const kept = S({ cards: { log } }).cards.log.length;
      return { a, b, blocks, kept };
    });
    ok(JSON.stringify(r.a.slice(0, 4)) === JSON.stringify(["Sam", "Sam (2)", "Ava", "Sam (3)"]), "repeats not numbered: " + JSON.stringify(r.a));
    ok(new Set(r.a).size === 5, "a repeat survived: " + JSON.stringify(r.a));
    ok(JSON.stringify(r.a) === JSON.stringify(r.b), "a second pass changed the list: " + JSON.stringify(r.b));
    ok(r.blocks.length === 2 && r.blocks[1].start === "1:15" && r.blocks[1].end === "2:05", "blocks: " + JSON.stringify(r.blocks));
    ok(r.kept === 600, "the junk pushed real entries out: " + r.kept);
  });
});

test.describe("v7.55 group 3: the canvas", () => {
  test("3d: Undo of a stage removal does nothing once the board is locked", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addDrawBtn"); await page.keyboard.press("Escape");
    await page.evaluate(() => document.querySelector(".w-draw .wFocus").click());
    await expect(page.locator(".w-draw")).toHaveClass(/wFull/);
    await stageBtn(page, "removeStageBtn");
    await expect(page.locator(".w-draw")).toHaveCount(0);
    await expect(page.locator("#undoToast")).toBeVisible();
    await page.evaluate(() => { window.Deckhand.config.ui.locked = true; });   // Lock went on in the five seconds
    await page.evaluate(() => document.querySelector("#undoToast button").click());
    await expect(page.locator(".w-draw")).toHaveCount(0);
    ok(!(await page.evaluate(() => window.Deckhand.config.scenes.some(s => s.widgets.some(w => w.type === "draw")))), "the card came back into a locked board");
  });

  test("3l: a group with an empty spot numbers only the named lines", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await setRoster(page, ["Ava", "Ben"]);
    const deck = path.join(dh.fixtureDir, "tmp_v755_deck.html");
    fs.writeFileSync(deck, "<!DOCTYPE html><title>Deck</title><body><h1>Slide 1</h1>");
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn"); inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets; w[w.length - 1].url = u; document.querySelector(".w-embed .embFrame").src = u;
    }, "file://" + deck);
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect(page.locator("#focusBar")).toBeVisible();
    await page.evaluate(() => { const t = window.Deckhand.pickPop.times; t.spin = 0; t.after = 60000; });
    await page.click("#pkBlob");
    await page.click('#pkPop .pkPopN [data-n="2"]');
    await page.click("#pkPop .pkPopGo");
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(2);
    const names = await page.evaluate(() => [...document.querySelectorAll("#pkPop .pkSlotName")].map(e => e.textContent));
    await page.evaluate(n => window.Deckhand.absent.toggle("5th", n), names[1]);   // the second is out too: nobody is left to roll in
    await page.click("#pkPop .pkSlot:nth-child(1) .pkSlotAbs");
    await expect.poll(() => page.evaluate(() => document.querySelector("#pkPop .pkSlotName").textContent)).toBe("");
    await page.click("#pkPop .pkPopBd");
    const list = await page.evaluate(() => window.Deckhand.boardList.items().map(i => i.num + ":" + i.name).join(" "));
    ok(list === "1:" + names[1], "the board list: " + list);
  });
});

test.describe("v7.55 group 5: the pen and Settings", () => {
  test("5a: Clear mid-stroke does not kill the pen", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");
    await dh.launch();
    await page.click("#inkBtn");
    await expect(page.locator("body")).toHaveClass(/inking/);
    await page.mouse.move(400, 400); await page.mouse.down();
    await page.mouse.move(500, 420); await page.mouse.move(600, 440);
    await page.evaluate(() => window.Deckhand.ink.clear());   // cleared under the finger
    await page.mouse.move(650, 450); await page.mouse.up();
    ok((await page.evaluate(() => window.Deckhand.ink.count())) === 0, "the cleared stroke came back");
    await page.mouse.move(500, 700); await page.mouse.down(); await page.mouse.move(900, 690); await page.mouse.up();
    ok((await page.evaluate(() => window.Deckhand.ink.count())) === 1, "the pen was dead after Clear mid-stroke");
  });

  test("5c: a held (repeating) Tab stays inside Settings", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-24T10:30");
    await dh.launch();
    await page.click("#setBtn");
    await expect(page.locator("#settingsWrap")).toBeVisible();
    await page.evaluate(() => document.activeElement.setAttribute("data-v755-first", "1"));
    await page.keyboard.down("Shift");
    await page.keyboard.down("Tab");                // the first press wraps to the end
    ok(await page.evaluate(() => document.getElementById("settingsWrap").contains(document.activeElement)), "the first Shift+Tab left Settings");
    await page.evaluate(() => document.querySelector("[data-v755-first]").focus());
    await page.keyboard.down("Tab");                // held: a repeat
    await page.keyboard.down("Tab");
    await page.keyboard.up("Tab"); await page.keyboard.up("Shift");
    ok(await page.evaluate(() => document.getElementById("settingsWrap").contains(document.activeElement)), "a repeated Tab walked out of Settings");
  });
});
