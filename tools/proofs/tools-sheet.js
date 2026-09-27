/* Photograph every tool: each one added alone on a fresh Daily Board at 1920×1080, in its
   default size, then the whole board (for the reader's sense of scale) and the card alone.
   Also the + Add menu. Output: tools/proofs/out/tools/<id>-board.png, <id>-card.png, add-menu.png,
   and a contact sheet. node tools/proofs/tools-sheet.js */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const OUT = path.resolve(__dirname, "out/tools"); fs.mkdirSync(OUT, { recursive: true });
const URL = "file://" + path.resolve(__dirname, "../../Deckhand.html");
const TOOLS = (process.env.ONLY ? process.env.ONLY.split(",") : ["addTimerBtn","addWatchBtn","addBellBtn","addEventBtn","addPickerBtn","addGroupsBtn","addScoreBtn","addTallyBtn",
  "addMusicBtn","addWorkBtn","addMeterBtn","addAgendaBtn","addTextBtn","addQrBtn","addEmbedBtn","addYtBtn","addDrawBtn","addDiceBtn","addCoinBtn","addSpinBtn","addCardsBtn","addTalkBtn","addStationsBtn","addNumlineBtn"]);
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  const open = async () => {
    await page.goto("about:blank"); await page.goto(URL + "#t=2026-09-29T10:30");
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto("about:blank"); await page.goto(URL + "#t=2026-09-29T10:30");   // a fresh board every time (autosave would carry the last tool over)
    await page.waitForFunction(() => !!window.Deckhand);
    if (await page.evaluate(() => document.body.classList.contains("landing"))) await page.click("#launchBtn");
    await page.evaluate(() => { const t = document.getElementById("greetToast"); if (t) t.hidden = true; const st = document.createElement("style"); st.textContent = ".sim{display:none !important}"; document.head.appendChild(st); });
    await page.waitForTimeout(200);
  };
  await open();
  await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee","Eli","Fay","Gus","Hal","Ivy","Jon","Kim","Lee"] }]; });
  await page.click("#addBtn");
  await page.screenshot({ path: path.join(OUT, "add-menu.png") });
  await page.keyboard.press("Escape");
  const cards = [];
  for (const id of TOOLS) {
    await open();
    await page.evaluate(() => { window.Deckhand.config.rosters = [{ period: "5th", names: ["Ava","Ben","Cal","Dee","Eli","Fay","Gus","Hal","Ivy","Jon","Kim","Lee"] }]; });
    await page.click("#addBtn"); await page.click("#" + id);
    await page.waitForTimeout(400);
    try { await page.keyboard.press("Escape"); } catch (e) {}
    // a little life in each: pick a name, roll, flip, draw, score a point, write a note
    try {
      if (id === "addPickerBtn"){ await page.selectOption(".w-picker .pkSel", "5th"); await page.click(".w-picker .pkGo"); await page.waitForTimeout(1200); }
      if (id === "addGroupsBtn"){ await page.selectOption(".w-groups .pkSel", "5th"); const b = await page.$(".w-groups .btn"); if (b) await b.click(); await page.waitForTimeout(500); }
      if (id === "addDiceBtn"){ await page.click('.w-dice .chip[data-batch="100"]'); await page.click(".w-dice .btn >> nth=0"); await page.waitForTimeout(800); }   // v7.13: bars vs theory
      if (id === "addCoinBtn"){ await page.click('.w-coin .chip[data-batch="10"]'); await page.click(".w-coin .btn >> nth=0"); await page.waitForTimeout(800); }
      if (id === "addMeterBtn"){ await page.click(".w-meter .mtBtn"); await page.waitForTimeout(2500); await page.click(".w-meter .mtStrike"); await page.waitForTimeout(1000); }   // v7.13: by hand
      if (id === "addWorkBtn"){ await page.click('.w-work .chip[data-mode="whisper"]'); }
      if (id === "addCardsBtn"){ await page.click(".w-cards .cdGo"); await page.waitForTimeout(500); }
      if (id === "addSpinBtn"){ await page.click(".w-spin .spGo"); await page.waitForTimeout(2500); }
      if (id === "addTallyBtn"){ for (let i = 0; i < 3; i++) await page.click(".w-tally .scB:not(.minus) >> nth=0"); }
      if (id === "addScoreBtn"){ for (let i = 0; i < 2; i++) await page.click(".w-score .scB:not(.minus) >> nth=0"); }
      if (id === "addAgendaBtn"){ await page.click(".w-agenda .wEdit"); await page.fill(".w-agenda .agArea", "Warm-up: ratios\nNotes: unit rates\nPractice p. 42\nExit ticket"); await page.click(".w-agenda .agBtn"); await page.click(".w-agenda .agItem >> nth=0"); }
      if (id === "addTextBtn"){ await page.click(".w-text .wEdit"); await page.keyboard.type("Homework: p. 42 #1-15 odd"); await page.click(".w-text .wEdit"); }
      if (id === "addEventBtn"){ await page.click(".w-event .wEdit"); await page.fill(".w-event .evName", "Unit 2 test"); await page.fill(".w-event .evDate", "2026-10-12"); await page.click(".w-event .evBtn"); }   // v7.13: school days
      if (id === "addDrawBtn"){ await page.selectOption(".w-draw .dwBgSel", "line"); await page.waitForTimeout(300); const c = await page.$(".w-draw .dwCanvas"); const b = await c.boundingBox(); await page.mouse.move(b.x + 60, b.y + 60); await page.mouse.down(); await page.mouse.move(b.x + 220, b.y + 140, { steps: 6 }); await page.mouse.up(); }
      if (id === "addQrBtn"){ const i = await page.$(".w-qr input"); if (i){ await i.fill("https://example.org/exit-ticket"); await page.keyboard.press("Enter"); } await page.waitForTimeout(300); }
      if (id === "addTimerBtn"){ await page.keyboard.press("5"); await page.keyboard.press("Enter"); await page.waitForTimeout(400); }
      if (id === "addWatchBtn"){ await page.keyboard.press(" "); await page.waitForTimeout(1300); }
      if (id === "addTalkBtn"){ await page.click(".w-talk .wEdit"); await page.fill(".w-talk .tkPromptIn", "Why is 7 the most common total?"); await page.fill(".w-talk .tkWhoIn", "closest to the window"); await page.click(".w-talk .tkDone"); await page.click(".w-talk .tkGo"); await page.waitForTimeout(1500); }   // v7.14
      if (id === "addStationsBtn"){ await page.selectOption(".w-stations .pkSel", "5th"); await page.click(".w-stations .wEdit"); await page.fill(".w-stations .snNames", "Vocabulary\nPractice\nChallenge\nTeacher table"); await page.click(".w-stations .snDone"); await page.click(".w-stations .snGo"); await page.waitForTimeout(1500); }
      if (id === "addNumlineBtn"){ const c = await page.$(".w-numline .nlSvg"); const b = await c.boundingBox(); const xOf = v => b.x + b.width * ((70 + (v + 10) / 20 * 860) / 1000), y = b.y + b.height * (190 / 300); await page.mouse.click(xOf(-7), y); await page.click('.w-numline .chip[data-mode="jump"]'); await page.mouse.move(xOf(-7), y); await page.mouse.down(); await page.mouse.move(xOf(-3), y, { steps: 5 }); await page.mouse.up(); }
    } catch (e) { console.log(id, "warm-up skipped:", String(e).split("\n")[0]); }
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, id + "-board.png") });
    const w = await page.$(".widget:not(.w-clock)");
    if (w) { const b = await w.boundingBox(); if (b) { await page.screenshot({ path: path.join(OUT, id + "-card.png"), clip: b }); cards.push({ id, b }); } }
  }
  fs.writeFileSync(path.join(OUT, "cards.json"), JSON.stringify(cards, null, 1));
  console.log("errors:", errs.filter(e => !/ERR_TUNNEL|Failed to load/.test(e)));
  await br.close();
})();
