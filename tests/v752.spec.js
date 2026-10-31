/* v7.52 — the stage-only deck's way out (Croix: an embed from a finished unit "triggers at the bell.
   If I turn off that feature, it stays ready as slides 1. There's seemingly no way for me to delete it
   or change it. I've had to add another embed and just open it manually").
   A stage-only card is hidden on the board, and the stage hides its strip (✎, ✕) — so once it was
   shelved nothing could reach it. The stage's ⋯ now holds Change the link, After the bell and Remove. */
const { test, expect, ok, stageBtn, offered } = require("./helpers");

const embeds = page => page.evaluate(() => window.Deckhand.config.scenes[0].widgets.filter(w => w.type === "embed").map(w => ({ label: w.label, url: w.url, bell: !!w.bell, stageOnly: !!w.stageOnly })));
const stagedLabel = page => page.evaluate(() => { const e = document.querySelector(".widget.wFull"); return e ? e.getAttribute("aria-label") : null; });
const addDeck = async (page, dh, url, shelf) => {
  await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
  const card = page.locator(".w-embed").last();
  await card.locator(".embBigIn").fill(url); await card.locator(".embLoad").click();
  if (shelf){ await card.locator(".wEdit").click(); await card.locator(".embShelfCk").check(); await card.locator(".wEdit").click(); await expect(card).toBeHidden(); }
  return card;
};
const bellRun = async page => {
  // set up took its time: jump the simulated clock to 10 s before the 10:16 bell, whatever the real clock did
  await page.evaluate(() => { const want = new Date("2026-09-08T10:15:50").getTime(); window.Deckhand.shiftClock(want - window.Deckhand.now().getTime()); });
  await page.evaluate(() => { window.Deckhand.config.bell.settle.seconds = 5; window.Deckhand.settle._doneMs(600); });
  await expect(page.locator("#clockWidget")).toHaveClass(/stLive/, { timeout: 15000 });
  await expect(page.locator("#clockWidget")).not.toHaveClass(/stLive/, { timeout: 15000 });
  await page.waitForTimeout(300);
};

test.describe("v7.52 the stage-only deck's way out", () => {
  test("Change the link: from the stage's ⋯ a shelved deck opens on the board with its ✎ row — link, library, Stage only and its own ✕ in reach; closing the row shelves it again", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await addDeck(page, dh, "https://docs.google.com/presentation/d/old-unit/edit", true);
    await page.click("#shelf .pill");                                   // staged, as the bell would
    await expect(page.locator(".w-embed")).toHaveClass(/wFull/);
    ok(await offered(page, "editStageBtn"), "Change the link not offered for a staged deck");
    ok(await offered(page, "removeStageBtn"), "Remove not offered for a staged deck");
    ok(await offered(page, "bellStageBtn"), "After the bell not offered for a staged deck");
    await stageBtn(page, "editStageBtn");
    const card = page.locator(".w-embed");
    await expect(card).toBeVisible();                                   // on the board, not the stage
    await expect(card).not.toHaveClass(/wFull/);
    await expect(page.locator("body")).not.toHaveClass(/focusMode/);
    await expect(card.locator(".embIn")).toBeVisible();
    await expect(card.locator(".embIn")).toHaveValue(/old-unit/);           // (the link is kept in its embed form)
    await expect(card.locator(".embShelfCk")).toBeVisible();
    await expect(card.locator(".wClose")).toBeVisible();
    ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("embIn")), "the link box did not take the keyboard");
    // a new link, typed where the row opened
    await card.locator(".embIn").fill("https://docs.google.com/presentation/d/new-unit/edit");
    await card.locator(".embIn").dispatchEvent("blur");
    await page.waitForTimeout(200);
    ok(/new-unit/.test((await embeds(page))[0].url), "the new link did not take: " + JSON.stringify(await embeds(page)));
    await expect(card).toBeHidden();                                    // a NEW deck loaded: the row tucks and the card is shelved again
    await expect(page.locator("#shelf .pill")).toHaveText("▶ Slides");
  });

  test("Remove from board: the stage's ⋯ removes the staged deck (shelved or not) with five seconds of Undo, which puts it back where it was", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await addDeck(page, dh, "https://docs.google.com/presentation/d/old-unit/edit", true);
    await page.click("#shelf .pill");
    await expect(page.locator(".w-embed")).toHaveClass(/wFull/);
    await stageBtn(page, "removeStageBtn");
    await expect(page.locator(".w-embed")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveClass(/focusMode/);
    await expect(page.locator("#shelf .pill")).toHaveCount(0);
    ok((await embeds(page)).length === 0, "the deck is still in the scene");
    await expect(page.locator("#undoToast")).toBeVisible();
    await expect(page.locator("#undoToast span")).toHaveText("Slides removed");
    await page.click("#undoToast button");
    await expect(page.locator(".w-embed")).toHaveCount(1);
    const back = await embeds(page);
    ok(back.length === 1 && back[0].stageOnly && /old-unit/.test(back[0].url), "Undo did not put the deck back: " + JSON.stringify(back));
    await expect(page.locator("#shelf .pill")).toHaveText("▶ Slides");   // shelved again, with its pill
    // gone for good this time, and it survives a reload
    await page.click("#shelf .pill");
    await stageBtn(page, "removeStageBtn");
    await dh.flush();
    await dh.reopen("#t=2026-10-21T10:31");
    await dh.launch();
    ok((await embeds(page)).length === 0, "the removed deck came back on reload");
    // the clock is never removed from the stage, and nothing is removed while locked
    await page.click("#clockWidget .wFocus");
    ok(!(await offered(page, "removeStageBtn")), "Remove offered for the clock");
    await stageBtn(page, "unfocusBtn");
  });

  test("After the bell: with two decks the settle-in hands the room to the marked one (the first, until a mark is set); the mark moves, and survives sanitize; a mark on a removed card falls back to the first", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-08T10:15:40");                          // 20 s before 2nd period
    await dh.launch();
    await addDeck(page, dh, "https://docs.google.com/presentation/d/old-unit/edit", true);
    await addDeck(page, dh, "https://docs.google.com/presentation/d/new-unit/edit", false);
    const names = (await embeds(page)).map(w => w.label);
    ok(names.join() === "Slides,Slides 2", "two decks expected: " + names.join());
    // the second deck is up; its ⋯ shows the bell is NOT its
    await page.locator(".w-embed").last().locator(".wFocus").click();
    await expect(page.locator(".widget.wFull")).toHaveAttribute("aria-label", "Slides 2");
    ok((await page.getAttribute("#bellStageBtn", "aria-pressed")) === "false", "the second deck already had the bell");
    await stageBtn(page, "bellStageBtn");                                // mark it
    ok((await page.getAttribute("#bellStageBtn", "aria-pressed")) === "true", "the mark did not take");
    ok(JSON.stringify((await embeds(page)).map(w => w.bell)) === "[false,true]", "mark not on the second deck: " + JSON.stringify(await embeds(page)));
    const kept = await page.evaluate(() => window.Deckhand.sanitize(JSON.parse(JSON.stringify(window.Deckhand.config))).scenes[0].widgets.filter(w => w.type === "embed").map(w => !!w.bell));
    ok(JSON.stringify(kept) === "[false,true]", "the mark did not survive sanitize: " + JSON.stringify(kept));
    await stageBtn(page, "unfocusBtn");
    // the bell at 10:16: the settle-in, then the MARKED deck, not the first
    await bellRun(page);
    ok((await stagedLabel(page)) === "Slides 2", "the bell staged " + (await stagedLabel(page)));
    // the mark is one card's at a time: marking the first takes it from the second
    await stageBtn(page, "unfocusBtn");
    await page.click("#shelf .pill");
    await expect(page.locator(".widget.wFull")).toHaveAttribute("aria-label", "Slides");
    await stageBtn(page, "bellStageBtn");
    ok(JSON.stringify((await embeds(page)).map(w => w.bell)) === "[true,false]", "the mark did not move: " + JSON.stringify(await embeds(page)));
    // tapping it again on the marked card clears the mark — the first deck is the bell's by default anyway
    await stageBtn(page, "bellStageBtn");
    ok(JSON.stringify((await embeds(page)).map(w => w.bell)) === "[false,false]", "the mark did not clear");
    ok((await page.getAttribute("#bellStageBtn", "aria-pressed")) === "true", "the first deck, unmarked, is still the bell's by default");
    // remove the first (marked by default): the second is the bell's now
    await stageBtn(page, "removeStageBtn");
    await page.waitForTimeout(5200);                                     // let the Undo lapse
    await page.locator(".w-embed").first().locator(".wFocus").click();
    ok((await page.getAttribute("#bellStageBtn", "aria-pressed")) === "true", "the remaining deck is not the bell's");
    await stageBtn(page, "unfocusBtn");
  });

  test("the three live in the stage's ⋯ only where they apply: a staged timer offers Remove but not Change or After the bell; none while locked", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-21T10:30");
    await dh.launch();
    await dh.addW("addTimerBtn"); await page.keyboard.press("Escape");
    await page.click(".w-timer .wFocus");
    ok(await offered(page, "removeStageBtn"), "Remove not offered for a timer");
    ok(!(await offered(page, "editStageBtn")) && !(await offered(page, "bellStageBtn")), "Change / After the bell offered for a timer");
    await stageBtn(page, "unfocusBtn");
    await addDeck(page, dh, "https://docs.google.com/presentation/d/x/edit", false);
    await page.click("#lockBtn");
    await page.locator(".w-embed .wFocus").click();
    ok(!(await offered(page, "removeStageBtn")) && !(await offered(page, "editStageBtn")) && !(await offered(page, "bellStageBtn")), "offered while locked");
    ok(await offered(page, "reloadStageBtn"), "Refresh gone while locked");
  });
});
