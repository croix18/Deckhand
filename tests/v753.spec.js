/* v7.53 — the name picker picks a group (Croix: "multi pick a number, like 4 or 5, and it would do the
   dramatic roll with the wheel… for that number of names instead of me having to click it that many
   times. Also, I need a way on the individual roll to say absent. Also, on the multi select, I'd like a
   way to reroll an individual but not the whole group. Also, when I click the next slide button on the
   clicker, I would like the names to clear like the drawings do." Absent: out for the whole day, in the
   group too — "Yes and yes".) */
const { test, expect, ok } = require("./helpers");
const fs = require("fs"); const path = require("path");

const NAMES = ["Ava", "Ben", "Cal", "Dee", "Eli", "Fay", "Gus", "Hal"];
const stageDeck = async (page, dh) => {
  const deck = path.join(dh.fixtureDir, "tmp_pick_deck.html");
  fs.writeFileSync(deck, '<!DOCTYPE html><title>Deck</title><body><h1>Slide 1</h1>');
  await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
  await page.evaluate(u => {
    const inp = document.querySelector(".w-embed .embIn"); inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
    const w = window.Deckhand.config.scenes[0].widgets; w[w.length - 1].url = u; document.querySelector(".w-embed .embFrame").src = u;
  }, "file://" + deck);
  await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
  await expect(page.locator("#focusBar")).toBeVisible();
};
const setup = async (page, dh) => {
  await dh.openAt("#t=2026-09-29T10:30");                   // 5th period
  await dh.launch();
  await page.evaluate(names => { window.Deckhand.config.rosters = [{ period: "5th", names }]; }, NAMES);
  await stageDeck(page, dh);
  await page.evaluate(() => { const t = window.Deckhand.pickPop.times; t.spin = 0; t.after = 60000; });
};
const slots = page => page.evaluate(() => [...document.querySelectorAll("#pkPop .pkSlot")].map(s => ({ name: s.querySelector(".pkSlotName").textContent, num: s.querySelector(".pkSlotNum").textContent })));
const list = page => page.evaluate(() => window.Deckhand.boardList.items().map(i => i.num + ":" + i.name).join(" "));
const left = page => page.evaluate(() => document.querySelector("#pkPop .pkPopLeft").textContent);
const out = page => page.evaluate(names => names.filter(n => window.Deckhand.absent.isOut("5th", n)), NAMES);

test.describe("v7.53 the picker picks a group", () => {
  test("a count in the head: Pick 3 rolls three names one after another, all different, each off the round; Problems #1–3 numbers them all; the count is remembered", async ({ page, dh }) => {
    await setup(page, dh);
    await page.click("#pkBlob");
    await expect(page.locator("#pkPop .pkPopName")).not.toBeEmpty();                  // count 1: the big name, as before
    await expect(page.locator("#pkPop .pkPopGo")).toHaveText("Pick another");
    await expect(page.locator("#pkPop .pkPopAbs")).toBeEnabled();                     // v7.53: Absent beside Refused
    await page.click('#pkPop .pkPopN [data-n="3"]');
    await expect(page.locator("#pkPop .pkPopGo")).toHaveText("Pick 3");
    ok((await page.evaluate(() => window.Deckhand.config.ui.pickN)) === 3, "the count is not kept in the config");
    ok((await page.evaluate(() => window.Deckhand.sanitize(JSON.parse(JSON.stringify(window.Deckhand.config))).ui.pickN)) === 3, "the count did not survive sanitize");
    await page.click("#pkPop .pkPopGo");
    await expect(page.locator("#pkPop .pkSlot")).toHaveCount(3);
    await expect(page.locator("#pkPop .pkPopName")).toBeEmpty();                      // the big name gives way to the lines
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(3);                   // all landed (spin 0)
    const s = await slots(page);
    ok(new Set(s.map(x => x.name)).size === 3 && s.every(x => NAMES.includes(x.name)), "three different names expected: " + JSON.stringify(s));
    ok(s.every(x => x.num === ""), "numbered before Problems was tapped");
    ok(/^4 of 8 left/.test(await left(page)), "the round did not spend three turns (the first pick spent one): " + await left(page));
    await expect(page.locator("#pkPop .pkPopRef")).toBeDisabled();                    // a group's lines carry their own buttons
    await expect(page.locator("#pkPop .pkPopAbs")).toBeDisabled();
    await expect(page.locator("#pkPop .pkPopBd")).toHaveText("Problems #1–3");
    await page.click("#pkPop .pkPopBd");
    ok((await list(page)) === s.map((x, i) => (i + 1) + ":" + x.name).join(" "), "the board list: " + await list(page));
    ok(JSON.stringify((await slots(page)).map(x => x.num)) === '["1","2","3"]', "the lines show their numbers");
    await expect(page.locator("#pkPop .pkPopBd")).toHaveText("Done numbering");
    // the next pick, in the run, numbers on from 4
    await page.click('#pkPop .pkPopN [data-n="2"]');
    await page.click("#pkPop .pkPopGo");
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(2);
    ok(JSON.stringify((await slots(page)).map(x => x.num)) === '["4","5"]', "the run did not number on: " + JSON.stringify(await slots(page)));
    ok((await list(page)).split(" ").length === 5, "five on the board: " + await list(page));
  });

  test("the roll: with motion, the lines shuffle one after another (the first at full length, the rest shorter) and the buttons wait until the last has landed", async ({ page, dh }) => {
    await setup(page, dh);
    await page.evaluate(() => { const t = window.Deckhand.pickPop.times; t.spin = 700; t.force = true; });
    await page.evaluate(() => { window.Deckhand.config.ui.pickN = 3; });
    await page.click("#pkBlob");                                                       // (setCount read the config at init: set it through the head instead)
    await page.click('#pkPop .pkPopN [data-n="3"]');
    await page.click("#pkPop .pkPopGo");
    await expect(page.locator("#pkPop .pkSlot")).toHaveCount(3);
    await page.waitForTimeout(200);
    const mid = await page.evaluate(() => ({ spinning: document.querySelectorAll("#pkPop .pkSlotName.spin").length, landed: document.querySelectorAll("#pkPop .pkSlot.on").length, go: document.querySelector("#pkPop .pkPopGo").disabled, bd: document.querySelector("#pkPop .pkPopBd").disabled }));
    ok(mid.spinning === 1 && mid.landed === 0 && mid.go && mid.bd, "while the first line rolls: " + JSON.stringify(mid));
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(1, { timeout: 3000 });
    const second = await page.evaluate(() => document.querySelectorAll("#pkPop .pkSlotName.spin").length);
    ok(second === 1, "the second line did not start rolling when the first landed");
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(3, { timeout: 4000 });
    await expect(page.locator("#pkPop .pkPopGo")).toBeEnabled();
    const s = await slots(page);
    ok(new Set(s.map(x => x.name)).size === 3, "three different names after the roll: " + JSON.stringify(s));
    // put away mid-roll: nobody saw those names, so nobody loses a turn
    const before = await page.evaluate(() => window.Deckhand.dayStore.get("picker:5th").pool.length);
    await page.click("#pkPop .pkPopGo");
    await page.waitForTimeout(150);
    await page.click("#pkPop .pkPopX");
    await expect(page.locator("#pkPop")).toBeHidden();
    const after = await page.evaluate(() => window.Deckhand.dayStore.get("picker:5th").pool.length);
    ok(after === before, "a roll put away mid-shuffle spent turns: " + before + " → " + after);
  });

  test("one line's ↻ rolls someone else into that spot alone — the other lines stay, the spot keeps its problem number and the board list follows; the student goes back into the round", async ({ page, dh }) => {
    await setup(page, dh);
    await page.click("#pkBlob");
    await page.click('#pkPop .pkPopN [data-n="3"]');
    await page.click("#pkPop .pkPopGo");
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(3);
    await page.click("#pkPop .pkPopBd");
    const s0 = await slots(page), l0 = await left(page);
    await page.locator("#pkPop .pkSlot").nth(1).locator(".pkSlotRe").click();
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(3);
    const s1 = await slots(page);
    ok(s1[0].name === s0[0].name && s1[2].name === s0[2].name, "the other lines moved: " + JSON.stringify([s0, s1]));
    ok(s1[1].name !== s0[1].name && !s0.map(x => x.name).includes(s1[1].name), "the spot did not get someone new: " + JSON.stringify([s0, s1]));
    ok(s1[1].num === "2", "the spot lost its number: " + JSON.stringify(s1));
    ok((await list(page)) === "1:" + s1[0].name + " 2:" + s1[1].name + " 3:" + s1[2].name, "the board list did not follow: " + await list(page));
    ok((await left(page)) === l0, "a re-roll spent a turn (the first student went back in, the new one came out): " + l0 + " → " + await left(page));
    ok(!(await out(page)).length, "a re-roll marked someone absent");
  });

  test("Absent on a line: out for the rest of the day (the roster's mark), their turn kept, another student rolls into the spot; on the single name the same, and the next name rolls in", async ({ page, dh }) => {
    await setup(page, dh);
    await page.click("#pkBlob");
    // the single name
    const one = await page.locator("#pkPop .pkPopName").textContent();
    await page.click("#pkPop .pkPopBd");                                               // Problem #1
    await page.click("#pkPop .pkPopAbs");
    await expect(page.locator("#pkPop .pkPopName")).not.toHaveText(one);
    const two = await page.locator("#pkPop .pkPopName").textContent();
    ok(JSON.stringify(await out(page)) === JSON.stringify([one]), "the absent mark: " + JSON.stringify(await out(page)));
    ok((await list(page)) === "1:" + two, "the absent student's problem did not go to the next name: " + await list(page));
    await expect(page.locator("#pkPop .pkPopNum")).toHaveText("Problem 1");
    ok(/of 7 left · 1 out/.test(await left(page)), "the head does not count them out: " + await left(page));
    // the group
    await page.click('#pkPop .pkPopN [data-n="3"]');
    await page.click("#pkPop .pkPopGo");
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(3);
    const s0 = await slots(page);
    ok(!s0.map(x => x.name).includes(one), "the absent student was picked into the group");
    await page.locator("#pkPop .pkSlot").nth(0).locator(".pkSlotAbs").click();
    await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(3);
    const s1 = await slots(page);
    ok(s1[0].name !== s0[0].name && s1[1].name === s0[1].name && s1[2].name === s0[2].name, "only the first line should change: " + JSON.stringify([s0, s1]));
    ok((await out(page)).sort().join() === [one, s0[0].name].sort().join(), "two should be out: " + JSON.stringify(await out(page)));
    ok(/of 6 left · 2 out/.test(await left(page)), "the head: " + await left(page));
    // for the rest of the day: a later pick never lands on them
    const seen = new Set();
    for (let i = 0; i < 6; i++){ await page.click("#pkPop .pkPopGo"); await expect(page.locator("#pkPop .pkSlot.on")).toHaveCount(3); (await slots(page)).forEach(x => seen.add(x.name)); }
    ok(!seen.has(one) && !seen.has(s0[0].name), "an absent student was picked again: " + [...seen].join());
  });

  test("the clicker's press puts the names away — the card and the board list both, like the ink; Escape and ✕ leave the list for the students at the board", async ({ page, dh }) => {
    await setup(page, dh);
    await page.click("#pkBlob");
    await page.click("#pkPop .pkPopBd");
    await page.click("#pkPop .pkPopGo");
    await expect(page.locator("#bdList .bdItem")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await expect(page.locator("#pkPop")).toBeHidden();
    await expect(page.locator("#bdList .bdItem")).toHaveCount(2);                     // Escape: the list stays
    await page.click("#pkBlob");
    await page.click("#pkPop .pkPopX");
    await expect(page.locator("#bdList .bdItem")).toHaveCount(2);                     // ✕: the list stays
    await page.click("#pkBlob");
    await page.keyboard.press("PageDown");                                             // the clicker
    await expect(page.locator("#pkPop")).toBeHidden();
    await expect(page.locator("#bdList")).toBeHidden();
    ok((await list(page)) === "", "the clicker left the names on the board: " + await list(page));
  });
});
