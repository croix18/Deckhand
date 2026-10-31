/* v7.55 (audit): the harness itself. helpers.js clears localStorage on every navigation (fresh
 * boot), and every file:// page shares ONE localStorage origin — so the clear used to run inside
 * an Embed iframe too, and loading a file:// deck wiped the board's autosave mid-test. The clear
 * now runs in the top document only; these pin both halves of that. */
const { test, expect, ok, QUIET } = require("./helpers");
const path = require("path");
const fs = require("fs");

test.describe("harness", () => {
  test("harness: a file:// deck in an Embed frame leaves the board's autosave alone", async ({ page, dh }) => {
    const deck = path.join(dh.fixtureDir, "tmp_harness_deck.html");
    fs.writeFileSync(deck, "<!DOCTYPE html><title>HarnessDeck</title><body><h1>Slide 1</h1>");
    await dh.openAt("");
    await dh.launch();
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await dh.flush();
    ok((await dh.stored()) !== null, "precondition: the flush wrote nothing");
    await page.evaluate(u => {
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      const f = document.querySelector(".w-embed .embFrame");
      f.hidden = false; f.src = u;
    }, "file://" + deck);
    await expect.poll(() => page.frames().some(f => f.url() === "file://" + deck)).toBe(true);
    await expect.poll(() => page.frameLocator(".w-embed .embFrame").locator("h1").textContent()).toBe("Slide 1");
    ok((await dh.stored()) !== null, "the deck's document cleared the board's store");
    await dh.flush();
    ok((await dh.stored()) !== null, "store gone after a second flush");
  });

  test("harness: a top-level openAt still boots fresh, at QUIET unless told otherwise", async ({ page, dh }) => {
    await dh.openAt("");
    await page.evaluate(() => localStorage.setItem("dh.harnessProbe", "1"));
    await dh.openAt("");
    ok(await page.evaluate(() => localStorage.getItem("dh.harnessProbe")) === null, "openAt kept the store");
    ok(page.url().endsWith(QUIET), "openAt('') did not land on QUIET: " + page.url());
    const d = await page.evaluate(() => { const n = window.Deckhand.now(); return { day: n.getDay(), h: n.getHours(), m: n.getMonth() }; });
    ok(d.day === 6 && d.h === 12 && d.m === 8, "QUIET is not Saturday Sep 26 noon: " + JSON.stringify(d));
  });
});
