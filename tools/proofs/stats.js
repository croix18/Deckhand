const { chromium } = require("playwright");
(async () => {
  const br = await chromium.launch(); const page = await br.newPage();
  await page.goto("file://" + require("path").resolve(__dirname, "../../Deckhand.html") + "#t=2026-10-14T10:30");
  await page.waitForFunction(() => !!window.Deckhand);
  const r = await page.evaluate(() => {
    const M = window.Deckhand.seaModule, OCT = ["bats","ghost","castaway","bones","haunt"];
    const bands = { "1-11": [1,11], "12-23": [12,23], "26-29": [26,29], "30": [30,30] };
    const out = {};
    for (const [k,[a,b]] of Object.entries(bands)){
      let n = 0, withAct = 0, per = {}, greetCw = 0;
      for (let d = a; d <= b; d++) for (let p = 0; p < 7; p++){
        const ev = M.plan("2026-10-" + String(d).padStart(2,"0"), p, 53, 1 + (d % 5), null).events.map(e => e.act);
        n++; if (ev[0] === "castaway") greetCw++;
        const o = ev.slice(1).filter(x => OCT.includes(x)); if (o.length) withAct++;
        o.forEach(x => per[x] = (per[x]||0) + 1);
      }
      out[k] = { periods: n, withOctAct: (withAct/n).toFixed(2), castawayGreets: (greetCw/n).toFixed(2), perPeriod: Object.fromEntries(Object.entries(per).map(([x,v]) => [x, (v/n).toFixed(2)])) };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); await br.close();
})();
