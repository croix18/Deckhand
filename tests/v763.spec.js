/* v7.63 — the warm-up in one tap (Croix: "I didn't have a warm up ready and I tried to use deckhand and cadence to
 * generate one and it epically failed. Can you integrate the two better so that this is an easier process for me?" —
 * "Too many steps to set up", "Hard to use on the panel", "Hard to see when all the questions were out and only one at
 * a time is too slow"). + Add → Warm-up, the Cadence card's Warm-up, or W: the Cadence card shows Cadence's warm-up
 * board ("#warmup&p=<period>&d=<date>&v=1") on the stage. On the website Deckhand finds Cadence in the folder beside
 * its own, and writes localStorage["cadence.pacing"] from the course calendars the site publishes.
 * cadence.html is Croix's own file and is never in this repo: these tests use a stub that writes into its own page
 * when it was born and every hashchange it hears. */
const { test, expect, ok, stageBtn, offered } = require("./helpers");
const fs = require("fs"); const path = require("path");

const STUB = '<!DOCTYPE html><title>Cadence stub</title><body><h1 id="n">Cadence</h1><p id="born"></p><p id="hc">0</p><p id="last"></p>' +
  '<script>document.getElementById("born").textContent = String(Date.now()) + "-" + Math.random();' +
  'var h = 0; addEventListener("hashchange", function(){ h++; document.getElementById("hc").textContent = String(h); document.getElementById("last").textContent = location.hash; });' +
  'document.getElementById("last").textContent = location.hash;</script>';
/* a copy of the board in a folder with the stub as cadence.html beside it: the card's automatic address */
const openBeside = async (page, dh, hash) => {
  const app = path.join(dh.fixtureDir, "Deckhand.html");
  fs.writeFileSync(app, dh.SRC);
  fs.writeFileSync(path.join(dh.fixtureDir, "cadence.html"), STUB);
  await page.goto("about:blank");
  await page.goto("file://" + app + hash);
  await page.waitForFunction(() => !!window.Deckhand);
  await dh.launch();
  return "file://" + app.replace(/Deckhand\.html$/, "cadence.html");
};
const src = page => page.evaluate(() => { const f = document.querySelector(".w-cadence .cdFrame"); return f ? f.getAttribute("src") : null; });
const cadFrame = page => page.frameLocator(".w-cadence .cdFrame");
const staged = page => page.evaluate(() => { const f = window.Deckhand.canvas.focused(); return f ? (f._entry && f._entry.type) : null; });
const cadCards = page => page.evaluate(() => window.Deckhand.config.scenes.find(s => s.name === window.Deckhand.config.activeScene).widgets.filter(w => w.type === "cadence"));

test.describe("v7.63 warm-up", () => {
  test("+ Add → Warm-up adds a Cadence card, stages it with the class in the room; a second warm-up changes only the hash; the saved link stays empty; Refresh keeps the warm-up", async ({ page, dh }) => {
    const beside = await openBeside(page, dh, "#t=2026-09-29T10:30");        // a Tuesday, 5th period by the bell
    ok((await cadCards(page)).length === 0, "a Cadence card already");
    await page.click("#addBtn");
    await expect(page.locator("#addWarmupBtn")).toBeVisible();
    await page.click("#addWarmupBtn");
    await expect(page.locator("#addMenu")).toBeHidden();
    await expect.poll(() => staged(page)).toBe("cadence");
    const s1 = await src(page);
    ok(s1 === beside + "#warmup&p=5th&d=2026-09-29&v=1", "the warm-up address: " + s1);
    await expect(cadFrame(page).locator("#last")).toHaveText("#warmup&p=5th&d=2026-09-29&v=1");
    const born = await cadFrame(page).locator("#born").textContent();
    ok((await cadCards(page)).length === 1 && (await cadCards(page))[0].url === "", "the saved link changed: " + JSON.stringify(await cadCards(page)));
    // a later class: the same card, the same page, a new hash — Cadence hears it, nothing reloads
    await page.evaluate(() => window.Deckhand.shiftClock(4 * 3600000 + 20 * 60000));   // 2:50 — 2nd period on a Black Week Tuesday
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.Deckhand.settle.reset(); window.Deckhand.canvas.unfocus(); });   // the jump rang a bell; stand it down
    await page.evaluate(() => window.Deckhand.warmup());
    const p2 = await page.evaluate(() => window.Deckhand.warmupModule.period());
    ok(p2 === "2nd", "the class in the room at 2:50: " + p2);
    await expect(cadFrame(page).locator("#hc")).toHaveText("1");
    await expect(cadFrame(page).locator("#last")).toHaveText("#warmup&p=2nd&d=2026-09-29&v=1");
    ok((await cadFrame(page).locator("#born").textContent()) === born, "the frame reloaded for a hash change");
    ok((await cadCards(page)).length === 1, "a second card was added");
    ok(await staged(page) === "cadence", "the warm-up left the stage");
    // Refresh on the stage goes back to what it showed, not the plain address
    ok(await offered(page, "reloadStageBtn"), "Refresh not offered");
    await stageBtn(page, "reloadStageBtn");
    await expect.poll(() => cadFrame(page).locator("#born").textContent()).not.toBe(born);
    await expect(cadFrame(page).locator("#last")).toHaveText("#warmup&p=2nd&d=2026-09-29&v=1");
    await dh.flush();
    const st = (await dh.stored()).cfg;                                     // the device copy: {v, savedAt, fileVersion, cfg}
    const w = st.scenes.find(s => s.name === st.activeScene).widgets.filter(x => x.type === "cadence");
    ok(w.length === 1 && w[0].url === "" && JSON.stringify(w[0]).indexOf("warmup") === -1, "the saved card remembers the warm-up: " + JSON.stringify(w));
  });

  test("no class in the room (the quiet Saturday): no p; W is the shortcut; a minimized Cadence card comes back and takes the stage", async ({ page, dh }) => {
    const beside = await openBeside(page, dh, dh.QUIET);
    await dh.addW("addCadenceBtn"); await page.keyboard.press("Escape");
    ok((await src(page)) === beside, "the plain address: " + (await src(page)));
    await page.evaluate(() => window.Deckhand.canvas.minimize(document.querySelector(".w-cadence")));
    await expect(page.locator(".w-cadence")).toHaveClass(/wMinned/);
    ok((await src(page)) === null, "a minimized card kept its frame loaded");
    await page.locator("body").click({ position: { x: 900, y: 300 } });
    await page.keyboard.press("w");
    await expect.poll(() => staged(page)).toBe("cadence");
    await expect(page.locator(".w-cadence")).not.toHaveClass(/wMinned/);
    ok((await src(page)) === beside + "#warmup&d=2026-09-26&v=1", "Saturday's address: " + (await src(page)));
    ok((await cadCards(page)).length === 1 && !(await cadCards(page))[0].min, "the card: " + JSON.stringify(await cadCards(page)));
    // the stage's Exit: the card is an ordinary card again, still showing the warm-up
    await stageBtn(page, "unfocusBtn");
    ok((await staged(page)) === null, "still staged");
    ok((await src(page)).endsWith("#warmup&d=2026-09-26&v=1"), "the card lost the warm-up on Exit");
  });

  test("the Cadence card's own Warm-up button (unlocked strip) stages that card", async ({ page, dh }) => {
    const beside = await openBeside(page, dh, "#t=2026-09-29T10:30");
    await dh.addW("addCadenceBtn"); await page.keyboard.press("Escape");
    const btn = page.locator(".w-cadence .strip .wWarm");
    await expect(btn).toBeVisible();
    await expect(btn).toContainText("Warm-up");
    // it sits just before the pencil
    ok(await page.evaluate(() => { const b = document.querySelector(".w-cadence .strip .wWarm"); return !!b.nextElementSibling && b.nextElementSibling.classList.contains("wEdit"); }), "not beside the pencil");
    await btn.click();
    await expect.poll(() => staged(page)).toBe("cadence");
    ok((await src(page)) === beside + "#warmup&p=5th&d=2026-09-29&v=1", "the card's warm-up: " + (await src(page)));
    // locked: no strip buttons, the Stage chip only
    await stageBtn(page, "unfocusBtn");
    await page.click("#lockBtn");
    await expect(btn).toBeHidden();
  });

  test("over staged slides: the warm-up takes the stage and the deck keeps a tab that brings it back", async ({ page, dh }) => {
    await openBeside(page, dh, "#t=2026-09-29T10:30");
    const deck = path.join(dh.fixtureDir, "tmp_warm_deck.html");
    fs.writeFileSync(deck, '<!DOCTYPE html><title>Deck</title><body><h1 id="s">Slide 1</h1>');
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.evaluate(u => {
      const inp = document.querySelector(".w-embed .embIn"); inp.value = "https://example.com/x"; inp.dispatchEvent(new Event("blur"));
      const w = window.Deckhand.config.scenes[0].widgets; w[w.length - 1].url = u; document.querySelector(".w-embed .embFrame").src = u;
    }, "file://" + deck);
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect.poll(() => staged(page)).toBe("embed");
    // + Add over the stage
    await page.evaluate(() => window.Deckhand.canvas.dockMin(false));
    await page.click("#addBtn");
    await page.click("#addWarmupBtn");
    await expect.poll(() => staged(page)).toBe("cadence");
    await expect(cadFrame(page).locator("#last")).toHaveText("#warmup&p=5th&d=2026-09-29&v=1");
    // the deck was put away, and the stage bar has its tab
    await expect(page.locator(".w-embed")).toHaveClass(/wMinned/);
    const tab = page.locator("#stageShelf .stTab", { hasText: "Slides" });
    await expect(tab).toHaveCount(1);
    await tab.click();
    await expect(page.locator(".w-embed")).not.toHaveClass(/wMinned/);
    await expect(page.locator(".w-embed")).toBeVisible();
    await expect(page.frameLocator(".w-embed .embFrame").locator("#s")).toHaveText("Slide 1");
    ok((await staged(page)) === "cadence", "the warm-up left the stage when the deck came up");
  });

  test("the automatic address on file:// is cadence.html beside Deckhand; sanitize still takes no javascript: link", async ({ page, dh }) => {
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addCadenceBtn"); await page.keyboard.press("Escape");
    const a = await page.evaluate(() => document.querySelector(".w-cadence")._entry.api.address());
    ok(a === new URL("cadence.html", "file://" + dh.APP).href, "file:// address: " + a);
    await expect(page.locator(".w-cadence .cdEmpty .embHint")).toContainText("cadence/");
    const bad = await page.evaluate(() => window.Deckhand.sanitize({ schemaVersion: 4, appVersion: "7.63.0", scenes: [{ name: "Daily Board", widgets: [{ type: "cadence", url: "javascript:alert(1)" }, { type: "cadence", url: "https://example.com/cadence/" }] }] }).scenes[0].widgets.map(w => w.url));
    ok(bad[0] === "" && bad[1] === "https://example.com/cadence/", "sanitize: " + JSON.stringify(bad));
    // the warm-up's hash is checked too: no quote or space reaches the frame
    const h = await page.evaluate(() => document.querySelector(".w-cadence")._entry.api.warmup('#warmup&p="x"'));
    ok(h === a, "a bad hash was taken: " + h);
  });

  test("file://: Pacing fetches nothing and writes nothing", async ({ page, dh }) => {
    const urls = [];
    page.on("request", r => { if (/schedule\.json/.test(r.url())) urls.push(r.url()); });
    await dh.openAt("#t=2026-09-29T10:30");
    await page.waitForTimeout(2000);                                         // past the boot refresh's moment
    ok(!(await page.evaluate(() => window.Deckhand.pacing.refresh())), "refresh said it wrote");
    ok((await page.evaluate(() => localStorage.getItem("cadence.pacing"))) === null, "written on file://");
    ok(urls.length === 0, "fetched on file://: " + urls.join(" "));
    // the code rules, on their own
    const c = await page.evaluate(() => ["10.05", "10.09+10", "5.08+09", "6.01+02", "6.01+7.02", "Thread B", "10", "105.1", " 3.4 "].map(x => window.Deckhand.pacing.codes(x)));
    ok(JSON.stringify(c) === JSON.stringify([["10.5"], ["10.9", "10.10"], ["5.8", "5.9"], ["6.1", "6.2"], ["6.1", "7.2"], [], [], [], ["3.4"]]), "codes: " + JSON.stringify(c));
  });
});

/* ---- over http: the website's layout and the calendars ---- */
const M7 = { v: 1, course: "m7", asOf: "2026-10-31", days: [
  { date: "2026-11-17", kind: "lesson", code: "10.09+10", unit: 10 },
  { date: "2026-11-10", kind: "lesson", label: "Lesson 10.5", code: "10.05", unit: 10 },
  { date: "2026-11-02", kind: "test", label: "Unit 9 test", code: "9.T" },
  { date: "2026-11-18", kind: "lesson", label: "Thread B review", unit: 6 },
  { date: "2026-11-19", kind: "lesson", code: "Thread B", unit: 6 },
  { date: "2026-13-40", kind: "lesson", code: "10.11", unit: 10 },
  { date: "2026-11-12", kind: "lesson", code: "5.08+09", unit: 5 }
] };
const A7 = { v: 1, course: "a7", asOf: "2026-11-01", days: [
  { date: "2026-11-09", kind: "lesson", code: "6.01+02", unit: 6 },
  { date: "2026-11-03", kind: "holiday", label: "No school" }
] };
const ON_DAYS = [{ d: "2026-11-10", codes: ["10.5"] }, { d: "2026-11-12", codes: ["5.8", "5.9"] }, { d: "2026-11-17", codes: ["10.9", "10.10"] }];
const ACC_DAYS = [{ d: "2026-11-09", codes: ["6.1", "6.2"] }];
const routes = async (page, m7, a7) => {
  await page.unroute("**/m7/schedule.json").catch(() => {});
  await page.unroute("**/a7/schedule.json").catch(() => {});
  await page.route("**/m7/schedule.json", r => m7 ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(m7) }) : r.fulfill({ status: 500, body: "no" }));
  await page.route("**/a7/schedule.json", r => a7 ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(a7) }) : r.fulfill({ status: 500, body: "no" }));
};
const pacing = page => page.evaluate(() => JSON.parse(localStorage.getItem("cadence.pacing")));

test.describe("v7.63 on the website", () => {
  test("@http served as a folder's index, the automatic address is ../cadence/ and the warm-up opens there; as Deckhand.html it is cadence.html beside it", async ({ page, dh, baseURL }) => {
    await routes(page, M7, A7);
    await page.route(baseURL + "teacher/deckhand/", r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: dh.SRC }));
    await page.route(baseURL + "teacher/cadence/", r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: STUB }));
    await page.goto("about:blank");
    await page.goto(baseURL + "teacher/deckhand/#t=2026-09-29T10:30");
    await page.waitForFunction(() => !!window.Deckhand);
    await dh.launch();
    await page.click("#addBtn"); await page.click("#addWarmupBtn");
    await expect.poll(() => staged(page)).toBe("cadence");
    await expect.poll(() => src(page)).toBe(baseURL + "teacher/cadence/#warmup&p=5th&d=2026-09-29&v=1");
    await expect(cadFrame(page).locator("#last")).toHaveText("#warmup&p=5th&d=2026-09-29&v=1");
    ok((await page.evaluate(() => document.querySelector(".w-cadence")._entry.api.address())) === baseURL + "teacher/cadence/", "folder address");
    // the plain file name over http
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    await dh.addW("addCadenceBtn"); await page.keyboard.press("Escape");
    ok((await page.evaluate(() => document.querySelector(".w-cadence")._entry.api.address())) === baseURL + "cadence.html", "Deckhand.html address");
  });

  test("@http Pacing writes the normalized lesson codes for both courses, skips tests and days with no code, keeps a course that failed, and leaves the copy alone when nothing loads", async ({ page, dh }) => {
    const seen = [];
    page.on("request", r => { if (/schedule\.json/.test(r.url())) seen.push({ url: r.url(), cache: r.headers()["cache-control"] || "" }); });
    await routes(page, M7, A7);
    await dh.openAt("#t=2026-09-29T10:30");
    await expect.poll(() => pacing(page), { timeout: 8000 }).not.toBeNull();   // the boot refresh, after the board is up
    let p = await pacing(page);
    ok(p.v === 1 && !isNaN(Date.parse(p.at)), "head: " + JSON.stringify(p));
    ok(JSON.stringify(p.courses.on) === JSON.stringify({ src: "m7", asOf: "2026-10-31", days: ON_DAYS }), "on: " + JSON.stringify(p.courses.on));
    ok(JSON.stringify(p.courses.acc) === JSON.stringify({ src: "a7", asOf: "2026-11-01", days: ACC_DAYS }), "acc: " + JSON.stringify(p.courses.acc));
    ok(seen.length >= 2 && seen.every(s => new URL(s.url).origin === new URL(page.url()).origin), "requests: " + JSON.stringify(seen));
    // the accelerated calendar fails: its last entry stays, on-level is new
    const M7b = JSON.parse(JSON.stringify(M7)); M7b.asOf = "2026-11-07"; M7b.days.push({ date: "2026-11-20", kind: "lesson", code: "10.11" });
    await routes(page, M7b, null);
    ok(await page.evaluate(() => window.Deckhand.pacing.refresh()), "refresh with one course said it wrote nothing");
    p = await pacing(page);
    ok(p.courses.on.asOf === "2026-11-07" && p.courses.on.days[p.courses.on.days.length - 1].codes[0] === "10.11", "on not refreshed: " + JSON.stringify(p.courses.on));
    ok(JSON.stringify(p.courses.acc) === JSON.stringify({ src: "a7", asOf: "2026-11-01", days: ACC_DAYS }), "acc lost: " + JSON.stringify(p.courses.acc));
    // nothing loads (a block page that is not the calendar counts as nothing): the stored copy is left alone
    const lz = await page.evaluate(() => JSON.parse(localStorage.getItem("deckhand.lessons")));
    ok(lz.courses.acc && lz.courses.acc.days.length === 2 && lz.courses.on.days.some(d => d.d === "2026-11-20"), "deckhand.lessons did not keep the failed course: " + JSON.stringify(lz));
    const before = await page.evaluate(() => localStorage.getItem("cadence.pacing"));
    const beforeL = await page.evaluate(() => localStorage.getItem("deckhand.lessons"));
    await routes(page, null, { v: 1, course: "m7", days: [] });
    ok(!(await page.evaluate(() => window.Deckhand.pacing.refresh())), "refresh said it wrote");
    ok((await page.evaluate(() => localStorage.getItem("cadence.pacing"))) === before, "the copy changed when nothing loaded");
    ok((await page.evaluate(() => localStorage.getItem("deckhand.lessons"))) === beforeL, "the lessons copy changed when nothing loaded");
  });

  test("@http Warm-up refreshes a stale copy without waiting, and waits a moment (at most) when there is none", async ({ page, dh, baseURL }) => {
    let hits = 0;
    await page.route("**/m7/schedule.json", async r => { hits++; await new Promise(res => setTimeout(res, 300)); r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(M7) }); });
    await page.route("**/a7/schedule.json", async r => { await new Promise(res => setTimeout(res, 300)); r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(A7) }); });
    await page.route(baseURL + "cadence.html", r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: STUB }));
    await dh.openAt("#t=2026-09-29T10:30");
    await dh.launch();
    // no copy yet (before the boot refresh): the warm-up opens once the calendars are in, within ~1.2 s
    await page.evaluate(() => localStorage.removeItem("cadence.pacing"));
    const t0 = Date.now();
    await page.evaluate(() => window.Deckhand.warmup());
    await expect.poll(() => staged(page), { timeout: 3000 }).toBe("cadence");
    ok(Date.now() - t0 < 2500, "waited too long: " + (Date.now() - t0));
    ok((await pacing(page)) !== null, "opened before the calendars were in");
    // a copy seven hours old: the warm-up opens at once and the copy is refreshed behind it
    await stageBtn(page, "unfocusBtn");
    await page.waitForTimeout(1800);                                         // past the boot refresh
    await expect.poll(() => pacing(page).then(p => p && p.courses.on.asOf)).toBe("2026-10-31");
    await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("cadence.pacing")); p.at = new Date(Date.now() - 7 * 3600000).toISOString(); p.courses.on.asOf = "old"; localStorage.setItem("cadence.pacing", JSON.stringify(p)); });
    const h0 = hits;
    await page.evaluate(() => window.Deckhand.warmup());
    ok((await staged(page)) === "cadence", "a stale copy made the warm-up wait");
    await expect.poll(() => pacing(page).then(p => p.courses.on.asOf)).toBe("2026-10-31");
    ok(hits > h0, "no refresh for a stale copy");
    // a fresh copy: no fetch at all
    await stageBtn(page, "unfocusBtn");
    const h1 = hits;
    await page.evaluate(() => window.Deckhand.warmup());
    await page.waitForTimeout(500);
    ok(hits === h1, "a fresh copy was fetched again");
  });
});

/* ---- v7.63: Today's lesson (Croix: "While at it, can you have deckhand have the relevant slides locked and loaded so
 * I don't have to do the whole html process every time.") — the site's calendars name each course's periods and each
 * day's slides page; the Slides card frames it for the class in the room. Synthetic calendars, same shape as the site's. */
const M7L = { v: 1, course: "m7", asOf: "2026-10-31", periods: [2, 4, 5], days: [
  { date: "2026-11-16", kind: "lesson", label: "Solving Real-World Problems With Two-Step Equations", code: "10.08", unit: 10, slides: "slides/10.08/" },
  { date: "2026-11-17", kind: "lesson", label: "Writing and Solving Two-Step Equations", code: "10.09+10", unit: 10, slides: "slides/10.09-10/" },
  { date: "2026-11-19", kind: "test", label: "Unit 10 Test — day 1", unit: 10 },
  { date: "2026-11-30", kind: "lesson", code: "13.01", slides: "../x/" },
  { date: "2026-12-01", kind: "lesson", code: "13.02", slides: "/abs/" },
  { date: "2026-12-02", kind: "lesson", code: "13.03", slides: "https://evil.example/x/" },
  { date: "2026-12-03", kind: "lesson", code: "13.04", slides: "javascript:alert(1)" },
  { date: "2026-02-30", kind: "lesson", code: "13.05", slides: "slides/13.05/" }
] };
const A7L = { v: 1, course: "a7", asOf: "2026-11-01", periods: [1, 3, 99, "4", 2.5], days: [
  { date: "2026-11-16", kind: "lesson", label: "Similar triangles; indirect measurement", code: "6.07+08", unit: 6, slides: "slides/6.07-08/" },
  { date: "2026-11-18", kind: "lesson", label: "  Thread B: angle pairs — supplementary, complementary, vertical, adjacent  ", unit: 6, slides: "slides/T-B1/" }
] };
const DECK = '<!DOCTYPE html><title>Slides stub</title><body><h1 id="where"></h1><p id="born"></p>' +
  '<script>document.getElementById("where").textContent = location.pathname; document.getElementById("born").textContent = String(Date.now()) + "-" + Math.random();</script>';
const siteRoutes = async (page, baseURL, cfgText) => {
  await page.route("**/m7/schedule.json", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(M7L) }));
  await page.route("**/a7/schedule.json", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(A7L) }));
  await page.route(/\/(m7|a7)\/slides\//, r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: DECK }));
  await page.route(baseURL + "own-deck.html", r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: DECK }));
  if (cfgText) await page.route(baseURL + "Deckhand.html", r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: cfgText }));
};
/* boot at a moment and wait for the calendars to be in */
const bootSite = async (page, dh, hash) => {
  await dh.openAt(hash);
  await dh.launch();
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem("deckhand.lessons")), { timeout: 8000 }).toBe(true);
};
const embSrc = page => page.evaluate(() => { const f = document.querySelector(".w-embed .embFrame"); return f && !f.hidden ? f.getAttribute("src") : null; });
const noAuto = page => page.evaluate(() => JSON.stringify(window.Deckhand.config).indexOf("/slides/") === -1);
const seedWith = (dh, widgets) => {
  const m = /<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/.exec(dh.SRC);
  const c = JSON.parse(m[1]);
  c.scenes[0].widgets = c.scenes[0].widgets.concat(widgets);
  return dh.inject(dh.SRC, JSON.stringify(c));
};

test.describe("v7.63 today's lesson", () => {
  test("@http deckhand.lessons: periods, every dated day with its kind and label, slides only when it is a plain relative path; cadence.pacing unchanged in shape", async ({ page, dh, baseURL }) => {
    await siteRoutes(page, baseURL);
    await bootSite(page, dh, "#t=2026-11-16T10:30");
    const L = await page.evaluate(() => JSON.parse(localStorage.getItem("deckhand.lessons")));
    ok(L.v === 1 && !isNaN(Date.parse(L.at)), "head: " + JSON.stringify(L).slice(0, 200));
    ok(JSON.stringify(L.courses.on.periods) === "[2,4,5]" && JSON.stringify(L.courses.acc.periods) === "[1,3]", "periods: " + JSON.stringify([L.courses.on.periods, L.courses.acc.periods]));
    ok(L.courses.on.src === "m7" && L.courses.acc.src === "a7", "src");
    const on = L.courses.on.days, acc = L.courses.acc.days;
    ok(on.length === 7 && !on.some(d => d.d === "2026-02-30"), "on days (the bad date dropped): " + JSON.stringify(on.map(d => d.d)));
    ok(JSON.stringify(on[0]) === JSON.stringify({ d: "2026-11-16", kind: "lesson", label: "Solving Real-World Problems With Two-Step Equations", slides: "slides/10.08/" }), "a lesson: " + JSON.stringify(on[0]));
    ok(JSON.stringify(on.find(d => d.d === "2026-11-19")) === JSON.stringify({ d: "2026-11-19", kind: "test", label: "Unit 10 Test — day 1", slides: null }), "the test day: " + JSON.stringify(on.find(d => d.d === "2026-11-19")));
    ok(["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03"].every(k => on.find(d => d.d === k).slides === null), "a bad slides value was kept: " + JSON.stringify(on.slice(3)));
    ok(JSON.stringify(acc[1]) === JSON.stringify({ d: "2026-11-18", kind: "lesson", label: "Thread B: angle pairs — supplementary, complementary, vertical, adjacent", slides: "slides/T-B1/" }), "the no-code lesson with slides: " + JSON.stringify(acc[1]));
    const P = await pacing(page);
    ok(Object.keys(P).sort().join() === "at,courses,v" && Object.keys(P.courses.on).sort().join() === "asOf,days,src" && P.courses.acc.days.length === 1, "cadence.pacing changed shape: " + JSON.stringify(P));
    // the helpers
    const h = await page.evaluate(() => ({
      a: window.Deckhand.pacing.courseFor("2nd"), b: window.Deckhand.pacing.courseFor("Period 3"), c: window.Deckhand.pacing.courseFor("1st Period"),
      d: window.Deckhand.pacing.courseFor("HOWL Time"), e: window.Deckhand.pacing.courseFor("6th"),
      f: window.Deckhand.pacing.lessonFor("2nd", "2026-11-16"), g: window.Deckhand.pacing.lessonFor("4th", "2026-11-19"),
      i: window.Deckhand.pacing.lessonFor("2nd", "2026-11-30"), j: window.Deckhand.pacing.lessonFor("2nd", "2026-11-28")
    }));
    ok(JSON.stringify([h.a, h.b, h.c, h.d, h.e]) === JSON.stringify([{ course: "on", src: "m7" }, { course: "acc", src: "a7" }, { course: "acc", src: "a7" }, null, null]), "courseFor: " + JSON.stringify(h));
    ok(h.f.url === baseURL + "m7/slides/10.08/" && h.f.course === "on" && h.f.kind === "lesson", "lessonFor: " + JSON.stringify(h.f));
    ok(h.g.url === null && h.g.label === "Unit 10 Test — day 1" && h.i.url === null && h.j === null, "no slides: " + JSON.stringify([h.g, h.i, h.j]));
    // the warm-up names the course for a known class, and not otherwise
    ok((await page.evaluate(() => window.Deckhand.warmupModule.hash())) === "#warmup&p=2nd&c=on&d=2026-11-16&v=1", "hash: " + (await page.evaluate(() => window.Deckhand.warmupModule.hash())));
    await page.evaluate(() => window.Deckhand.shiftClock(50 * 60000));      // 11:20, HOWL Time
    ok((await page.evaluate(() => window.Deckhand.warmupModule.hash())) === "#warmup&p=HOWL%20Time&d=2026-11-16&v=1", "HOWL: " + (await page.evaluate(() => window.Deckhand.warmupModule.hash())));
  });

  test("@http a new Slides card frames the class in the room's slides: 1st (accelerated), then 2nd (on-level) when the bell moves on; the frame is not reloaded when the address is the same; nothing is saved", async ({ page, dh, baseURL }) => {
    await siteRoutes(page, baseURL);
    await bootSite(page, dh, "#t=2026-11-16T09:40");                     // Teal Week Monday, 1st period
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await expect.poll(() => embSrc(page)).toBe(baseURL + "a7/slides/6.07-08/");
    await expect(page.frameLocator(".w-embed .embFrame").locator("#where")).toHaveText("/a7/slides/6.07-08/");
    ok(await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "embed").today === true), "a new card is not on");
    // the pencil row shows the address, read-only, and a blur does not save it
    await page.click(".w-embed .wEdit");
    await expect(page.locator(".w-embed .embTodayLbl")).toBeVisible();
    await expect(page.locator(".w-embed .embTodayCk")).toBeChecked();
    await expect(page.locator(".w-embed .embIn")).toHaveValue(baseURL + "a7/slides/6.07-08/");
    ok(await page.evaluate(() => document.querySelector(".w-embed .embIn").readOnly), "the address is editable");
    await page.evaluate(() => { const i = document.querySelector(".w-embed .embIn"); i.focus(); i.blur(); });
    ok(await noAuto(page), "today's deck was written into the config");
    await page.click(".w-embed .wEdit");
    // he moved within the deck; a re-resolve to the same address leaves it there
    const born = await page.frameLocator(".w-embed .embFrame").locator("#born").textContent();
    const fr = page.frames().find(f => /\/a7\/slides\//.test(f.url()));
    await fr.evaluate(() => { location.hash = "#slide-3"; });
    await page.evaluate(() => window.Deckhand.pacing.refresh());            // writes, and tells the cards
    await page.evaluate(() => document.dispatchEvent(new CustomEvent("deckhand:lessons")));
    await page.waitForTimeout(5600);                                         // and a tick of the card's own
    ok((await page.frameLocator(".w-embed .embFrame").locator("#born").textContent()) === born, "the deck reloaded on a re-resolve to the same address");
    ok((await fr.evaluate(() => location.hash)) === "#slide-3", "the slide was reset");
    // 2nd period: the on-level slides
    await page.evaluate(() => window.Deckhand.shiftClock(50 * 60000));      // 10:30
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.Deckhand.settle.reset(); window.Deckhand.canvas.unfocus(); });   // the jump rang a bell; stand it down
    await expect.poll(() => embSrc(page), { timeout: 8000 }).toBe(baseURL + "m7/slides/10.08/");
    ok(await noAuto(page), "today's deck was written into the config");
    await dh.flush();
    ok(JSON.stringify(await dh.stored()).indexOf("/slides/") === -1, "today's deck reached the device copy");
    // Warm-up names the course too
    await page.evaluate(() => window.Deckhand.warmup());
    await expect.poll(() => src(page)).toContain("#warmup&p=2nd&c=on&d=2026-11-16&v=1");
  });

  test("@http in passing before 3rd the card already holds 3rd's (accelerated) slides; staged and minimized it behaves like a pasted deck", async ({ page, dh, baseURL }) => {
    await siteRoutes(page, baseURL);
    await bootSite(page, dh, "#t=2026-11-16T11:44");                     // HOWL Time is over, 3rd at 11:46
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await expect.poll(() => embSrc(page)).toBe(baseURL + "a7/slides/6.07-08/");
    await page.evaluate(() => document.querySelector(".w-embed .wFocus").click());
    await expect.poll(() => staged(page)).toBe("embed");
    ok(await offered(page, "reloadStageBtn"), "Refresh not offered");
    await stageBtn(page, "minStageBtn");
    await expect(page.locator(".w-embed")).toHaveClass(/wMinned/);
    ok((await page.evaluate(() => document.querySelector(".w-embed .embFrame").getAttribute("src"))) === null, "a minimized deck kept its frame");
    await page.evaluate(() => window.Deckhand.canvas.restore(document.querySelector(".w-embed")));
    await expect.poll(() => embSrc(page)).toBe(baseURL + "a7/slides/6.07-08/");
    ok(await noAuto(page), "saved");
  });

  test("@http a test day: the card falls back to its own deck, and its empty state says why", async ({ page, dh, baseURL }) => {
    await siteRoutes(page, baseURL);
    await bootSite(page, dh, "#t=2026-11-19T10:30");                     // 2nd period, Unit 10 Test day 1
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await expect(page.locator(".w-embed .embEmpty")).toBeVisible();
    await expect(page.locator(".w-embed .embWhy")).toHaveText("No slides today: Unit 10 Test — day 1");
    ok((await embSrc(page)) === null, "a frame on a test day");
    // a pasted deck still loads under it
    await page.fill(".w-embed .embBigIn", baseURL + "own-deck.html");
    await page.click(".w-embed .embLoad");
    await expect.poll(() => embSrc(page)).toBe(baseURL + "own-deck.html");
    await expect(page.locator(".w-embed .embWhy")).toBeHidden();
    // a class with no course (HOWL Time): the deck, no line
    ok(await noAuto(page), "saved");
  });

  test("@http a card holding another deck is left alone until Today's lesson is turned on; off returns to the saved deck; the default rule", async ({ page, dh, baseURL }) => {
    const own = baseURL + "own-deck.html";
    await siteRoutes(page, baseURL, seedWith(dh, [{ type: "embed", x: 50, y: 4, w: 48, h: 72, label: "Slides", url: own }]));
    await bootSite(page, dh, "#t=2026-11-16T10:30");
    await expect.poll(() => embSrc(page)).toBe(own);
    ok(await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.find(w => w.type === "embed").today === false), "a card with its own deck defaulted on");
    await page.click(".w-embed .wEdit");
    await expect(page.locator(".w-embed .embTodayCk")).not.toBeChecked();
    await page.click(".w-embed .embTodayCk");
    await expect.poll(() => embSrc(page)).toBe(baseURL + "m7/slides/10.08/");
    ok(await page.evaluate(() => { const w = window.Deckhand.config.scenes[0].widgets.find(w => w.type === "embed"); return w.today === true && w.url === "own-deck.html".replace(/^/, location.origin + "/"); }), "the saved deck changed");
    await page.click(".w-embed .embTodayCk");
    await expect.poll(() => embSrc(page)).toBe(own);
    ok(await noAuto(page), "saved");
    // the default rule (sanitize): no deck → on; the site's own slides pages → on; anything else → off; a choice is kept
    const d = await page.evaluate(o => ["", o + "/m7/slides/10.07/", "https://docs.google.com/presentation/d/abc/embed", "https://evil.example/m7/slides/1/"].map(u =>
      window.Deckhand.sanitize({ schemaVersion: 4, appVersion: "7.63.0", scenes: [{ name: "Daily Board", widgets: [{ type: "embed", url: u }] }] }).scenes[0].widgets[0].today)
      .concat([window.Deckhand.sanitize({ schemaVersion: 4, appVersion: "7.63.0", scenes: [{ name: "Daily Board", widgets: [{ type: "embed", url: "", today: false }, { type: "embed", perPeriod: true, decks: { "2nd": o + "/m7/slides/1/", "4th": "https://docs.google.com/presentation/d/x/embed" } }] }] }).scenes[0].widgets.map(w => w.today)]), new URL(baseURL).origin);
    ok(JSON.stringify(d) === JSON.stringify([true, true, false, false, [false, false]]), "default rule: " + JSON.stringify(d));
  });

  test("file://: no Today's lesson — no checkbox, the card as it was", async ({ page, dh }) => {
    await dh.openAt("#t=2026-11-16T10:30");
    await dh.launch();
    await dh.addW("addEmbedBtn"); await page.keyboard.press("Escape");
    await page.click(".w-embed .wEdit");
    await expect(page.locator(".w-embed .embRow")).toBeVisible();
    await expect(page.locator(".w-embed .embTodayLbl")).toBeHidden();
    await expect(page.locator(".w-embed .embWhy")).toBeHidden();
    ok((await embSrc(page)) === null, "a frame on file://");
    ok((await page.evaluate(() => localStorage.getItem("deckhand.lessons"))) === null, "lessons written on file://");
    ok((await page.evaluate(() => window.Deckhand.pacing.lessonFor("2nd", "2026-11-16"))) === null, "lessonFor on file://");
  });
});
