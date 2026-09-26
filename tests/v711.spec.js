/* v7.11 — October 2.0 (Croix: "I need better than that last effort… well
 * thought out and intelligent designs"). Two expert reviews
 * (docs/reviews/october-2.0-design.md, -animation.md) redrew every piece and
 * wrote the month's dramaturgy; this spec pins the behaviour they specified:
 * the spider's re-drop from where it hangs and its three-a-minute cap, the
 * third pumpkin's vine nudge, the ghost's hold on the boat, the director's
 * October rules (cap, day-of-month weight, no ghost before the 12th, the
 * Halloween promise) and the pre-lit pumpkins of the last week. */
const { test, expect, ok } = require("./helpers");

const motionOn = page => page.evaluate(() => { window.Deckhand.config.ui.motion = "on"; document.body.classList.add("waveMotion"); });

test.describe("v7.11 October 2.0", () => {
  test("v7.11: the spider — a tap mid-fall is swallowed, a tap while it hangs re-drops from THERE, the fourth re-drop in a minute is a twitch", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-14T10:30");
    await dh.launch();
    await motionOn(page);
    const rig = page.locator("#ocWeb .ocSpiderRig"), spider = page.locator("#ocWeb .ocSpider");
    await spider.dispatchEvent("pointerdown");
    await expect(rig).toHaveClass(/drop/);
    await spider.dispatchEvent("pointerdown");                         // ~0.1 s: committed to the air
    ok(!/redrop/.test(await rig.evaluate(e => e.className.baseVal)), "a tap mid-fall was answered");
    await page.waitForTimeout(2500);                                    // hanging at 112
    await spider.dispatchEvent("pointerdown");
    await expect(rig).toHaveClass(/redrop/);
    const sy = await rig.evaluate(e => e.style.getPropertyValue("--sy"));
    ok(/^1[01]\d(\.\d+)?px$/.test(sy), "the re-drop did not start from the hang: --sy=" + sy);
    await expect(rig).not.toHaveClass(/redrop/, { timeout: 7000 });
    // three re-drops a minute, then a twitch
    await spider.dispatchEvent("pointerdown");
    await page.waitForTimeout(2600);   // past the 1.7 s commit even on a loaded runner
    await spider.dispatchEvent("pointerdown");                         // re-drop 2
    await page.waitForTimeout(2600);   // past the 1.7 s commit even on a loaded runner
    await spider.dispatchEvent("pointerdown");                         // re-drop 3
    await expect(rig).toHaveClass(/redrop/);
    await page.waitForTimeout(2600);   // past the 1.7 s commit even on a loaded runner
    await spider.dispatchEvent("pointerdown");                         // the fourth: a poke only
    await expect(rig).toHaveClass(/poke/);
    await expect(rig).not.toHaveClass(/poke/, { timeout: 1500 });
  });

  test("v7.11: the pumpkins — the third one nudges the vine; from the 26th two load lit, on Halloween all three; the castaway greets Halloween", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-14T10:30");
    await dh.launch();
    ok((await page.evaluate(() => document.querySelectorAll("#ocPumpkins .ocPumpkin.lit").length)) === 0, "mid-month pumpkins loaded lit");
    await page.locator("#ocPumpkins .ocPumpkin.p3").dispatchEvent("pointerdown");
    await expect(page.locator("#ocPumpkins")).toHaveClass(/p3tap/);
    await expect(page.locator("#ocPumpkins")).not.toHaveClass(/p3tap/, { timeout: 2000 });
    await page.locator("#ocPumpkins .ocPumpkin.p1").dispatchEvent("pointerdown");
    ok(!(await page.evaluate(() => document.getElementById("ocPumpkins").classList.contains("p3tap"))), "the first pumpkin nudged the vine");
    const lit = () => page.evaluate(() => [...document.querySelectorAll("#ocPumpkins .ocPumpkin")].map(p => p.classList.contains("lit")).join());
    await dh.openAt("#t=2026-10-27T10:30");
    await dh.launch();
    ok((await lit()) === "true,false,true", "Oct 27 should light P1 and P3: " + await lit());
    await dh.openAt("#t=2026-10-30T10:30");                            // Halloween on the board: the Friday before the 31st
    await dh.launch();
    ok((await lit()) === "true,true,true", "Halloween should light all three: " + await lit());
    const hd = await page.evaluate(() => [2025, 2026, 2027].map(y => window.Deckhand.seaModule.halloweenDay(y)).join());
    ok(hd === "31,30,29", "halloweenDay: " + hd);                       // Fri 31 · Sat 31 → Fri 30 · Sun 31 → Fri 29
    await dh.openAt("#t=2026-11-02T10:30");
    await dh.launch();
    ok((await page.evaluate(() => document.querySelectorAll("#ocPumpkins .ocPumpkin.lit").length)) === 0, "November pumpkins lit");
  });

  test("v7.11: the ghost holds the boat (haunted) and refuses the pennant's water; the bats spook the gull first", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-14T10:30");
    await dh.launch();
    await motionOn(page);
    ok(await page.evaluate(() => window.Deckhand.sea("ghost")), "ghost refused");
    await expect(page.locator("#boat")).toHaveClass(/haunted/);
    ok(!(await page.evaluate(() => window.Deckhand.sea("pennant"))), "the pennant played over the ghost");
    ok((await page.evaluate(() => getComputedStyle(document.querySelector("#sea-ghost")).width)) === "150px", "the galleon is sized to the strip under the board");
    await page.evaluate(() => window.Deckhand.seaModule.clear());
    ok(!(await page.evaluate(() => document.getElementById("boat").classList.contains("haunted"))), "clear() left the boat haunted");
    // the gull leaves before the bats (loud)
    ok(await page.evaluate(() => window.Deckhand.sea("gull")), "gull refused");
    await page.waitForTimeout(6500);
    await expect(page.locator("#boat")).toHaveClass(/gull/);
    ok(await page.evaluate(() => window.Deckhand.sea("bats")), "bats refused");
    await expect(page.locator("#boat")).toHaveClass(/gullOut/);
    await expect(page.locator("#sea-bats")).toHaveClass(/go/, { timeout: 5000 });
    await page.evaluate(() => window.Deckhand.seaModule.clear());
  });

  test("v7.11: the director's October — at most two October crossings a period (three on Halloween) plus the ghost once, no ghost before the 12th, a ghost promised on Halloween, the greeting pool by season", async ({ page, dh }) => {
    await dh.openAt("#t=2026-10-14T10:30");
    const OCT = new Set(["bats", "ghost", "castaway", "bones", "haunt"]);
    const plans = await page.evaluate(() => {
      const M = window.Deckhand.seaModule, out = [];
      for (let d = 1; d <= 31; d++) for (let p = 0; p < 7; p++) for (const len of [50, 53, 90])
        out.push({ d, p, len, ev: M.plan("2026-10-" + String(d).padStart(2, "0"), p, len, 1 + (d % 5), null).events.map(e => e.act) });
      return out;
    });
    for (const pl of plans){
      const n = pl.ev.slice(1).filter(a => OCT.has(a) && a !== "ghost").length;   // the greeting slot and the ghost (the headline) are outside the cap
      const cap = pl.d === 30 ? 3 : 2;
      ok(n <= cap, `Oct ${pl.d} p${pl.p} (${pl.len} min): ${n} October acts: ${pl.ev.join()}`);
      ok(pl.ev.filter(a => a === "ghost").length <= 1, `Oct ${pl.d} p${pl.p}: the ghost twice`);
      if (pl.d < 12) ok(!pl.ev.includes("ghost"), `Oct ${pl.d}: a ghost before the 12th`);
      if (pl.d === 30){
        ok(pl.ev[0] === "castaway", `Halloween p${pl.p}: greeting ${pl.ev[0]}`);
        ok(pl.ev.includes("ghost"), `Halloween p${pl.p} (${pl.len} min): no ghost: ${pl.ev.join()}`);
      }
    }
    const rate = (a, b) => { const ps = plans.filter(pl => pl.d >= a && pl.d <= b); return ps.reduce((n, pl) => n + pl.ev.slice(1).filter(x => OCT.has(x)).length, 0) / ps.length; };
    const early = rate(1, 11), mid = rate(12, 23), late = rate(26, 29);
    ok(early > 0 && early < .6 && mid > early * 2 && late > mid, `the month should build: early=${early.toFixed(2)} mid=${mid.toFixed(2)} late=${late.toFixed(2)}`);
    ok(plans.filter(pl => pl.d >= 12 && pl.d <= 29 && pl.ev.includes("ghost")).length > 0, "no ghost anywhere from the 12th to the 29th");
    // a 20-minute Halloween advisory has no last third worth a ship
    const short = await page.evaluate(() => window.Deckhand.seaModule.plan("2026-10-30", 2, 20, 5, null).events.map(e => e.act));
    ok(!short.includes("ghost"), "a ghost in a 20-minute period: " + short.join());
    // the greeting pool: castaway never greets a November period; the pre-7.11 pool still does
    const nov = await page.evaluate(() => { const M = window.Deckhand.seaModule; const s = new Set(); for (let d = 1; d <= 30; d++) for (let p = 0; p < 7; p++) s.add(M.plan("2026-11-" + String(d).padStart(2, "0"), p, 53, 1 + (d % 5), null).events[0].act); return [...s]; });
    ok(!nov.includes("castaway") && nov.length === 3, "November greetings: " + nov.join());
    // the free-time pool: October's laned, non-rare acts qualify; the ghost never
    const w = await page.evaluate(() => window.Deckhand.seaModule.octoberWeight("2026-10-30"));
    ok(w.halloween && w.cap === 3 && w.w === 2.5, "octoberWeight on Halloween: " + JSON.stringify(w));
    ok((await page.evaluate(() => window.Deckhand.seaModule.octoberWeight("2026-11-02").w)) === 0, "November has an October weight");
  });
});
