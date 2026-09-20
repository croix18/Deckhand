/* Deckhand v5 (2026-27 Teal/Black bells) — automated browser tests */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const errors = [];
  const watchErrors = p => {
    p.on('console', m => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
        errors.push('console: ' + m.text());
    });
    p.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  };
  watchErrors(page);

  const url = 'file://' + path.resolve(__dirname, 'Deckhand_v5.3.3.html');
  const openAt = async hash => {
    await page.goto('about:blank');
    await page.goto(url + (hash || ''));
    await page.waitForTimeout(350);
  };
  const launch = async () => { await page.click('#launchBtn'); await page.waitForTimeout(150); };
  const openScheds = async () => page.evaluate(() => { document.getElementById('secScheds').open = true; });

  const results = [];
  let failCount = 0;
  const t = async (name, fn) => {
    try { await fn(); results.push('PASS  ' + name); }
    catch (e) { failCount++; results.push('FAIL  ' + name + '  :: ' + e.message); }
  };
  const text = async sel => (await page.textContent(sel)).trim();
  const attr = async (sel, a) => await page.getAttribute(sel, a);
  const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
  // period hero + week tag + countdown, joined (day-strip text excluded)
  const bellText = async () => {
    const a = (await page.textContent('#periodNow')).trim();
    const b = (await page.textContent('#weekTag')).trim();
    const c = (await page.locator('#bellSub').isHidden()) ? '' : (await page.textContent('#bellSub')).trim();
    return a + ' | ' + b + ' | ' + c;
  };

  /* ---------- landing ---------- */
  await openAt('');

  await t('landing: greeting, Teal/Black/No-bells chips, hint 1–3', async () => {
    expect(/^Good (morning|afternoon|evening), Mr\. Shaffer$/.test(await text('#greet')),
      'greeting: ' + await text('#greet'));
    const names = await page.locator('#schedChips .chip').allTextContents();
    expect(names.join('|') === 'Teal Week|Black Week|No bells', 'names: ' + names.join('|'));
    expect((await text('#landHint')).includes('1–3'), 'hint: ' + await text('#landHint'));
  });

  await t('auto-rotation pre-picks: Aug 31 wk = Black, Sep 7 wk = Teal', async () => {
    await openAt('#t=2026-08-31T08:00');
    let pressed = await page.locator('#schedChips .chip[aria-pressed="true"]').textContent();
    expect(pressed.trim() === 'Black Week', 'Aug31 pressed: ' + pressed);
    await openAt('#t=2026-09-08T08:00');
    pressed = await page.locator('#schedChips .chip[aria-pressed="true"]').textContent();
    expect(pressed.trim() === 'Teal Week', 'Sep8 pressed: ' + pressed);
    const wk = await page.evaluate(() => window.Deckhand.autoWeekIndexAt('2026-09-14T10:00'));
    expect(wk === 1, 'Sep14 parity: ' + wk);
  });

  await t('manual chip overrides the auto pick for the day', async () => {
    await openAt('#t=2026-08-31T10:30');       // auto = Black
    await page.keyboard.press('1');            // override to Teal
    await launch();
    const line = await bellText();
    expect(line.includes('Teal Week') && line.includes('2nd'), 'line: ' + line);
  });

  /* ---------- 2026-27 bell math (Sep 1 2026 = Tue, Sep 2 = Wed) ---------- */

  await t('Wed sim + Teal: Wednesday times, "(Wed)", 2nd 19:00 left', async () => {
    await openAt('#t=2026-09-09T10:30');
    expect((await text('#brand')).includes('SIM'), 'no SIM badge');
    await launch();
    const line = await bellText();
    expect(line.includes('Teal Week (Wed)') && line.includes('2nd') && line.includes('19 min'),
      'line: ' + line);                        // tealWed 2nd 10:06-10:49
    const w = await page.$eval('#bellFill', n => n.style.width);
    expect(parseFloat(w) > 0, 'no bar fill');
  });

  await t('Tue sim + Teal: regular times, no "(Wed)", 2nd 39:00 left', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    const line = await bellText();
    expect(line.includes('Teal Week') && !line.includes('(Wed)') &&
           line.includes('2nd') && line.includes('39 min'),
      'line: ' + line);                        // tealReg 2nd 10:16-11:09
  });

  await t('Black Week auto on its Wednesday: mirrored order (5th at 10:30)', async () => {
    await openAt('#t=2026-09-02T10:30');       // Wed of the Black anchor week
    await launch();
    const line = await bellText();
    expect(line.includes('Black Week (Wed)') && line.includes('5th'), 'line: ' + line);
  });

  await t('passing between HOWL and 3rd on a regular day', async () => {
    await openAt('#t=2026-09-08T11:44');       // HOWL ends 11:43, 3rd at 11:46
    await launch();
    const line = await bellText();
    expect(line.includes('Passing') && line.includes('3rd') && line.includes('2 min'),
      'line: ' + line);
  });

  await t('lunch block + PM heuristic (12:42-1:12 read as PM)', async () => {
    await openAt('#t=2026-09-08T12:50');
    await launch();
    const line = await bellText();
    expect(line.includes('Lunch') && line.includes('22 min'), 'line: ' + line);
  });

  await t('No bells (chip 3) hides readout; debug API agrees', async () => {
    await page.keyboard.press('h');
    await page.keyboard.press('3');
    await launch();
    expect(await page.locator('#bellWrap').isHidden(), 'readout visible');
    const st = await page.evaluate(() => window.Deckhand.bellStatusAt('2026-09-08T10:30'));
    expect(st.type === 'off', 'not off: ' + JSON.stringify(st));
    await page.evaluate(() => window.Deckhand.setSchedule(0));
    const st2 = await page.evaluate(() => window.Deckhand.bellStatusAt('2026-09-09T10:30'));
    expect(st2.sched === 'Teal Week (Wed)' && st2.label === '2nd', JSON.stringify(st2));
  });

  /* ---------- board behavior ---------- */

  await t('board: clock, presets, entry, reset target, chip deselect', async () => {
    await openAt('');
    await launch();
    await page.mouse.click(960, 990);
    expect(/^\d{1,2}:\d{2}$/.test(await text('#clock')), 'clock');
    expect(await text('#timer') === '5:00', 'timer: ' + await text('#timer'));
    await page.keyboard.press('7');
    await page.keyboard.press('3');
    expect(await text('#timer') === '0:73', 'entry: ' + await text('#timer'));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
    expect(await text('#timer') === '1:13', 'reset target');
    expect(await attr('[data-min="5"]', 'aria-pressed') === 'false', 'chip still pressed');
  });

  await t('alarm rings; Enter dismisses; focused button suppressed', async () => {
    await page.mouse.click(960, 990);
    await page.keyboard.press('2');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2900);
    expect((await attr('#alarm', 'class')).includes('on'), 'no alarm');
    await page.focus('#tabWatch');
    await page.keyboard.press('Enter');
    expect(!(await attr('#alarm', 'class')).includes('on'), 'not dismissed');
    expect(await attr('#tabTimer', 'aria-pressed') === 'true', 'mode switched behind overlay');
  });

  await t('stopwatch independent; background timer rings; H home', async () => {
    await page.mouse.click(960, 990);
    await page.keyboard.press('s');
    await page.keyboard.press(' ');
    await page.waitForTimeout(1300);
    expect((await text('#timer')) !== '0:00', 'not counting');
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
    await page.keyboard.press('s');
    await page.keyboard.press('3');
    await page.keyboard.press('Enter');
    await page.keyboard.press('s');
    await page.waitForTimeout(3600);
    expect((await attr('#alarm', 'class')).includes('on'), 'no background ring');
    await page.keyboard.press('Escape');
    await page.keyboard.press('h');
    expect(await page.evaluate(() => document.body.classList.contains('landing')), 'H failed');
  });

  /* ---------- settings ---------- */

  await t('settings: rename + nudge; pick preserved; clock untouched', async () => {
    await openAt('#t=2026-09-08T10:45');       // Teal Tue: 2nd ends 11:09 -> 24:00 left
    await launch();
    expect((await bellText()).includes('24 min'), 'precondition: ' + await bellText());
    const clockBefore = await text('#clock');
    await page.click('#setBtn');
    await openScheds();
    await page.fill('#sGrpName1', 'Teal');
    await page.fill('#sNudge', '600');
    await page.click('#applyBtn');
    expect((await text('#setErrors')) === 'Applied.', 'msg: ' + await text('#setErrors'));
    await page.click('#closeBtn');
    const line = await bellText();
    expect(line.includes('Teal') && line.includes('2nd') && line.includes('14 min'),
      'line: ' + line);
    expect(await text('#clock') === clockBefore, 'nudge moved clock');
  });

  await t('settings: Wednesday-only group rejected; invalid atomic', async () => {
    await page.click('#setBtn');
    await openScheds();
    await page.fill('#taGrpWed3', '1st 9:20-10:03');
    await page.click('#applyBtn');
    expect((await text('#setErrors')).includes('regular times too'), 'err: ' + await text('#setErrors'));
    await page.fill('#taGrpWed3', '');
    const ta = await page.inputValue('#taGrpReg1');
    await page.fill('#taGrpReg1', ta + '\ngarbage');
    await page.click('#applyBtn');
    expect((await text('#setErrors')).includes('line'), 'err2: ' + await text('#setErrors'));
    await page.keyboard.press('Escape');
    await page.keyboard.press('h');
    const chips = await page.locator('#schedChips .chip').count();
    expect(chips === 3, 'bad apply mutated groups: ' + chips);
    await launch();
  });

  await t('no-op Apply preserves explicit No bells', async () => {
    await openAt('#t=2026-09-08T10:30');
    await page.keyboard.press('3');
    await launch();
    expect(await page.locator('#bellWrap').isHidden(), 'precondition');
    await page.click('#setBtn');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await page.locator('#bellWrap').isHidden(), 'bells resurrected');
  });

  await t('settings: Tab trapped; focus restored; typing inert', async () => {
    await page.click('#setBtn');
    await page.click('#sPresets');
    await page.keyboard.type('5');
    const cls = (await attr('#timer', 'class')) || '';
    expect(!cls.includes('entry'), 'digit leaked to timer');
    for (let i = 0; i < 50; i++) await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      !!(document.activeElement && document.activeElement.closest('#settingsCard')));
    expect(inside, 'focus escaped');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.activeElement.id) === 'setBtn', 'focus not restored');
  });

  await t('settings: flip anchor week recomputes; disabling falls to default', async () => {
    await openAt('#t=2026-09-01T10:30');       // Black week Tue: 5th 10:16-11:09
    await launch();
    expect((await bellText()).includes('5th'), 'precondition: ' + await bellText());
    await page.click('#setBtn');
    await page.selectOption('#sAnchorWeek', '0');   // week of Aug 31 was actually Teal
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    let line = await bellText();
    expect(line.includes('Teal Week') && line.includes('2nd'), 'flip failed: ' + line);
    await page.click('#setBtn');
    await page.uncheck('#sAuto');              // rotation off -> startup default governs
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    line = await bellText();
    expect(line.includes('Teal Week'), 'default not applied: ' + line);
    const c = await page.evaluate(() => window.Deckhand.config);
    expect(c.bell.autoWeek === false, 'autoWeek still on');
  });

  await t('day strip: order shown, current lit, passing shows next, toggleable', async () => {
    await openAt('#t=2026-09-08T10:30');       // Teal Tue, in 2nd
    await launch();
    expect(!(await page.locator('#dayStrip').isHidden()), 'strip hidden');
    const chips = await page.locator('#dayStrip .dayChip').allTextContents();
    expect(chips.join('|') === '1st|2nd|HOWL|3rd|Lunch|4th|5th|6th',
      'order: ' + chips.join('|'));
    expect((await page.locator('#dayStrip .dayChip.current').textContent()).trim() === '2nd',
      'current wrong');
    expect((await page.locator('#dayStrip .dayChip.past').allTextContents()).join('') === '1st',
      'past wrong');
    await openAt('#t=2026-09-08T11:44');       // passing toward 3rd
    await launch();
    expect((await page.locator('#dayStrip .dayChip.next').textContent()).trim() === '3rd',
      'next wrong');
    await page.click('#setBtn');
    await page.uncheck('#sStrip');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await page.locator('#dayStrip').isHidden(), 'strip toggle failed');
  });

  await t('Black Wednesday strip runs backwards (6th first)', async () => {
    await openAt('#t=2026-09-02T10:30');
    await launch();
    const chips = await page.locator('#dayStrip .dayChip').allTextContents();
    expect(chips.join('|') === '6th|5th|HOWL|3rd|Lunch|4th|2nd|1st',
      'order: ' + chips.join('|'));
    expect((await page.locator('#dayStrip .dayChip.current').textContent()).trim() === '5th',
      'current wrong');
  });

  await t('renaming the ANCHOR group does not disturb a No-bells pick', async () => {
    await openAt('#t=2026-09-01T10:00');       // Black week auto
    await page.keyboard.press('3');            // No bells
    await launch();
    expect(await page.locator('#bellWrap').isHidden(), 'precondition');
    await page.click('#setBtn');
    await openScheds();
    await page.fill('#sGrpName2', 'Gold Week');   // rename the anchor group
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await page.locator('#bellWrap').isHidden(), 'rename resurrected bells');
  });

  await t('turning rotation OFF preserves the current pick', async () => {
    await openAt('#t=2026-09-01T10:00');
    await page.keyboard.press('3');            // No bells
    await launch();
    await page.click('#setBtn');
    await page.uncheck('#sAuto');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await page.locator('#bellWrap').isHidden(), 'auto-off resurrected bells');
  });

  await t('weekend rollover adopts the new week (no manual override)', async () => {
    await openAt('#t=2026-09-06T23:59:57');    // Sunday night, Black week
    expect(await page.evaluate(() => window.Deckhand.activeIndex) === 1, 'precondition');
    await page.waitForTimeout(4500);           // cross into Monday (Teal week)
    expect(await page.evaluate(() => window.Deckhand.activeIndex) === 0,
      'did not adopt new week');
    const pressed = await page.locator('#schedChips .chip[aria-pressed="true"]').textContent();
    expect(pressed.trim() === 'Teal Week', 'landing chips stale: ' + pressed);
  });

  await t('weekend rollover respects a manual override', async () => {
    await openAt('#t=2026-09-06T23:59:57');
    await page.keyboard.press('3');            // No bells, manually
    await page.waitForTimeout(4500);
    expect(await page.evaluate(() => window.Deckhand.activeIndex) === -1,
      'rollover clobbered the override');
  });

  /* ---------- v5.2: readability + visual timers ---------- */

  await t('period hero: big label, week tag, countdown as separate line', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    expect(await text('#periodNow') === '2nd Period', 'hero: ' + await text('#periodNow'));
    expect(await text('#weekTag') === 'Teal Week', 'tag: ' + await text('#weekTag'));
    expect((await text('#bellSub')).includes('39 min until bell'), 'sub: ' + await text('#bellSub'));
    await openAt('#t=2026-09-08T11:12');       // HOWL Time (non-numeric label)
    await launch();
    expect(await text('#periodNow') === 'HOWL Time', 'hero: ' + await text('#periodNow'));
  });

  await t('bell countdown toggle hides the ticking line, keeps the period', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    await page.click('#setBtn');
    await page.uncheck('#sCount');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await page.locator('#bellSub').isHidden(), 'countdown still visible');
    expect(await text('#periodNow') === '2nd Period', 'period lost');
    expect(!(await page.locator('#bellBar').isHidden()), 'bar should be untouched');
  });

  await t('ring style default: visual shown, digits element hidden but synced', async () => {
    await openAt('');
    await launch();
    expect(!(await page.locator('#visWrap').isHidden()), 'visual hidden');
    expect(await page.locator('#timer').isHidden(), 'digits element visible');
    expect(await text('#visDigits') === '5:00', 'vis digits: ' + await text('#visDigits'));
    await page.click('[data-min="1"]');
    expect(await text('#visDigits') === '1:00', 'vis not synced');
    const off = await page.$eval('#visProgC', n => n.getAttribute('stroke-dashoffset'));
    expect(parseFloat(off) < 1, 'ring should be full when reset: ' + off);
  });

  await t('entry + stopwatch fall back to digits; low state colors visual', async () => {
    await page.mouse.click(960, 990);
    await page.keyboard.press('7');            // entry mode
    expect(await page.locator('#visWrap').isHidden(), 'visual during entry');
    expect(!(await page.locator('#timer').isHidden()), 'entry digits hidden');
    await page.keyboard.press('Escape');
    await page.keyboard.press('s');            // stopwatch
    expect(await page.locator('#visWrap').isHidden(), 'visual during stopwatch');
    await page.keyboard.press('s');
    await page.keyboard.press('9');            // 0:09 -> low immediately
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect((await attr('#visWrap', 'class') || '').includes('low'), 'no low state');
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
  });

  await t('timer styles switch live: tide fills, disc thickens, digits return', async () => {
    await page.click('#setBtn');
    await page.selectOption('#sTimerStyle', 'tide');
    await page.click('#applyBtn');
    expect(!(await page.locator('#tideTank').isHidden()), 'tank hidden');
    const h = await page.$eval('#tideWater', n => n.style.height);
    expect(parseFloat(h) > 99, 'water not full on reset: ' + h);
    await page.selectOption('#sTimerStyle', 'disc');
    await page.click('#applyBtn');
    expect(await page.locator('#tideTank').isHidden(), 'tank lingers');
    const w = await page.$eval('#visProgC', n => n.getAttribute('stroke-width'));
    expect(w === '64', 'disc thickness: ' + w);
    await page.selectOption('#sTimerStyle', 'digits');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await page.locator('#visWrap').isHidden(), 'visual lingers');
    expect(!(await page.locator('#timer').isHidden()), 'digits missing');
  });

  await t('Space right after pointer-closing Settings starts the timer', async () => {
    await openAt('');
    await launch();
    await page.click('#setBtn');
    await page.click('#closeBtn');             // pointer close: no focus restore
    await page.keyboard.press(' ');
    await page.waitForTimeout(250);
    expect(await page.locator('#settingsWrap').isHidden(), 'Settings reopened');
    expect(await text('#startBtn') === 'Pause', 'timer did not start');
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
    await page.click('#setBtn');               // Esc close still restores focus
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.activeElement.id) === 'setBtn',
      'keyboard focus not restored');
  });

  await t('labels already containing "Period" are not doubled', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    await page.click('#setBtn');
    await openScheds();
    const ta = await page.inputValue('#taGrpReg1');
    await page.fill('#taGrpReg1', ta.replace('2nd 10:16-11:09', '2nd Period 10:16-11:09'));
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await text('#periodNow') === '2nd Period', 'hero: ' + await text('#periodNow'));
  });

  await t('keyboard Close restores focus; pointer close blurs', async () => {
    await openAt('');
    await launch();
    await page.click('#setBtn');
    await page.focus('#closeBtn');
    await page.keyboard.press('Enter');        // keyboard activation
    expect(await page.evaluate(() => document.activeElement.id) === 'setBtn',
      'keyboard close lost focus');
  });

  await t('disc digits fit the hole, including 10:00 and 100:39', async () => {
    await page.click('#setBtn');
    await page.selectOption('#sTimerStyle', 'disc');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    const fits = async () => await page.evaluate(() => {
      const w = document.getElementById('visWrap').clientWidth;
      const d = document.getElementById('visDigits');
      const r = document.createRange();
      r.selectNodeContents(d);
      return { hole: w * 0.30, text: r.getBoundingClientRect().width };
    });
    await page.click('[data-min="10"]');
    let m = await fits();
    expect(m.text <= m.hole + 2, '10:00 overflows: ' + JSON.stringify(m));
    await page.mouse.click(960, 990);
    await page.keyboard.press('9'); await page.keyboard.press('9');
    await page.keyboard.press('9'); await page.keyboard.press('9');
    await page.keyboard.press('Enter');        // 100:39, running
    await page.waitForTimeout(300);
    await page.keyboard.press(' ');            // pause
    m = await fits();
    expect(m.text <= m.hole + 2, '100:39 overflows: ' + JSON.stringify(m));
    await page.keyboard.press('r');
  });

  await t('+1:00 while running: visual drains truthfully (no pegged-full ring)', async () => {
    await page.click('#setBtn');
    await page.selectOption('#sTimerStyle', 'ring');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    await page.click('[data-min="1"]');
    await page.mouse.click(960, 990);
    await page.keyboard.press(' ');            // start 1:00
    await page.click('#plusBtn');              // now ~2:00 of visMax 2:00
    await page.waitForTimeout(1600);
    const off = await page.$eval('#visProgC', n => parseFloat(n.getAttribute('stroke-dashoffset')));
    expect(off > 0.5, 'ring pegged full after +1:00: ' + off);
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
  });

  /* ---------- v5.3: next class, warning, bathroom, settings reorg ---------- */

  await t('Sunday counts down to Monday 1st period (next week auto-resolved)', async () => {
    await openAt('#t=2026-09-06T15:00');       // Sunday of the Black week
    await launch();
    expect(!(await page.locator('#bellWrap').isHidden()), 'bell hidden on Sunday');
    expect(await text('#periodNow') === 'Next: 1st Period', 'hero: ' + await text('#periodNow'));
    expect(await text('#weekTag') === 'Teal Week', 'tag: ' + await text('#weekTag'));
    const sub = await text('#bellSub');
    expect(sub.includes('Monday 9:20') && sub.includes('in 18h 20m'), 'sub: ' + sub);
    expect(!(await page.locator('#bellBar').isHidden()), 'weekend bar hidden');
    const wk = await page.$eval('#bellFill', n => ({ w: parseFloat(n.style.width), sand: n.classList.contains('passing') }));
    // Fri 4:00pm -> Mon 9:20 is 65h20m; Sun 3pm has 18h20m left = ~28.1% remains
    expect(wk.sand && wk.w > 26 && wk.w < 30, 'weekend drain: ' + JSON.stringify(wk));
    expect(await page.locator('#bathPill').isHidden(), 'bathroom shown for next');
    const next = await page.locator('#dayStrip .dayChip.next').textContent();
    expect(next.trim() === '1st', 'strip next: ' + next);
  });

  await t('after school counts down to tomorrow (Wed variant honored)', async () => {
    await openAt('#t=2026-09-08T16:30');       // Tue after last bell
    await launch();
    expect(await text('#periodNow') === 'Next: 1st Period', 'hero: ' + await text('#periodNow'));
    expect(await text('#weekTag') === 'Teal Week (Wed)', 'tag: ' + await text('#weekTag'));
    expect((await text('#bellSub')).includes('Wednesday 9:20'), 'sub: ' + await text('#bellSub'));
  });

  await t('early morning (beyond 90-min window) counts down to same day', async () => {
    await openAt('#t=2026-09-08T06:00');
    await launch();
    const sub = await text('#bellSub');
    expect(sub.startsWith('9:20') && sub.includes('in 3h 20m'), 'sub: ' + sub);
  });

  await t('next-class countdown is toggleable', async () => {
    await openAt('#t=2026-09-06T15:00');
    await launch();
    expect(!(await page.locator('#bellWrap').isHidden()), 'precondition');
    await page.click('#setBtn');
    await page.uncheck('#sNext');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await page.locator('#bellWrap').isHidden(), 'toggle failed');
  });

  await t('5-minute warning: warn class, coral sub forced visible', async () => {
    await openAt('#t=2026-09-08T11:05');       // 2nd ends 11:09 -> 4:00 left
    await launch();
    expect(((await attr('#bellWrap', 'class')) || '').includes('warn'), 'no warn class');
    await page.click('#setBtn');
    await page.uncheck('#sCount');             // countdown off...
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(!(await page.locator('#bellSub').isHidden()), 'warning hidden with countdown off');
    expect((await text('#bellSub')).includes('until bell'), 'sub: ' + await text('#bellSub'));
  });

  await t('warning minutes configurable (15 -> warns at 39:00 left... no; at 10:55)', async () => {
    await openAt('#t=2026-09-08T10:55');       // 14:00 left in 2nd
    await launch();
    expect(!((await attr('#bellWrap', 'class')) || '').includes('warn'), 'warn too early');
    await page.click('#setBtn');
    await page.fill('#sWarn', '15');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(((await attr('#bellWrap', 'class')) || '').includes('warn'), 'custom warn failed');
  });

  await t('bathroom window: closed first 10, open middle, closed last 10, toggleable', async () => {
    await openAt('#t=2026-09-08T10:20');       // 2nd began 10:16
    await launch();
    let bp = await text('#bathPill');
    expect((await attr('#bathPill', 'class')) === 'closed' && bp.includes('opens 10:26'),
      'early: ' + bp + ' / ' + await attr('#bathPill', 'class'));
    await openAt('#t=2026-09-08T10:35');
    await launch();
    bp = await text('#bathPill');
    expect((await attr('#bathPill', 'class')) === 'open' && bp.includes('closes 10:59'),
      'mid: ' + bp);
    await openAt('#t=2026-09-08T11:02');
    await launch();
    expect((await attr('#bathPill', 'class')) === 'closed', 'late not closed');
    await page.click('#setBtn');
    await page.uncheck('#sBath');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect(await page.locator('#bathPill').isHidden(), 'bathroom toggle failed');
  });

  await t('seconds hidden by default; settings option restores them', async () => {
    await openAt('');
    await launch();
    expect(/^(AM|PM)$/.test(await text('#clockSub')), 'sub: ' + await text('#clockSub'));
    await page.click('#setBtn');
    await page.check('#sSeconds');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    await page.waitForTimeout(400);
    expect(/^:\d{2} (AM|PM)$/.test(await text('#clockSub')), 'sub: ' + await text('#clockSub'));
  });

  await t('volume slider writes config; passing gets its mode class', async () => {
    await page.click('#setBtn');
    await page.fill('#sVolume', '60');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    const v = await page.evaluate(() => window.Deckhand.config.sound.volume);
    expect(Math.abs(v - 0.6) < 0.001, 'volume: ' + v);
    await openAt('#t=2026-09-08T11:44');
    await launch();
    expect(((await attr('#bellWrap', 'class')) || '').includes('passing'), 'no passing class');
  });

  await t('settings organized in 4 sections; schedules collapsed by default', async () => {
    await page.click('#setBtn');
    const n = await page.locator('details.setSec').count();
    expect(n === 4, 'sections: ' + n);
    expect(!(await page.evaluate(() => document.getElementById('secScheds').open)),
      'schedules open by default');
    expect(await page.evaluate(() => document.getElementById('secGeneral').open),
      'general collapsed');
    await page.keyboard.press('Escape');
  });

  await t('Tab reaches Apply/Close with Schedules collapsed', async () => {
    await openAt('');
    await launch();
    await page.click('#setBtn');
    const seen = new Set();
    for (let i = 0; i < 40; i++){
      await page.keyboard.press('Tab');
      seen.add(await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));
    }
    expect(seen.has('applyBtn') && seen.has('closeBtn'), 'never reached buttons: ' + [...seen].join(','));
    await page.keyboard.press('Escape');
  });

  await t('reopening settings with General collapsed still focuses inside dialog', async () => {
    await page.click('#setBtn');
    await page.evaluate(() => { document.getElementById('secGeneral').open = false; });
    await page.click('#closeBtn');
    await page.click('#setBtn');
    const inside = await page.evaluate(() =>
      !!(document.activeElement && document.activeElement.closest('#settingsCard')));
    expect(inside, 'focus not inside dialog');
    await page.evaluate(() => { document.getElementById('secGeneral').open = true; });
    await page.keyboard.press('Escape');
  });

  await t('nudge across midnight cannot freeze or skip the next-class scan', async () => {
    await openAt('#t=2026-09-04T23:55');       // Fri night + bells 10 min ahead
    await launch();
    await page.evaluate(() => { window.Deckhand.config.bell.nudgeSeconds = 600;
      window.Deckhand.config.bell.countdownSeconds = true; });
    await page.waitForTimeout(700);
    let sub = await text('#bellSub');
    expect(sub.includes('Monday 9:20') && !sub.includes('in 0:00'), 'pos nudge: ' + sub);
    await openAt('#t=2026-09-01T00:05');       // just past midnight + bells behind
    await launch();
    await page.evaluate(() => { window.Deckhand.config.bell.nudgeSeconds = -600;
      window.Deckhand.config.bell.countdownSeconds = true; });
    await page.waitForTimeout(700);
    sub = await text('#bellSub');
    expect(sub.includes('Tuesday 9:20') && !sub.includes('Wednesday'), 'neg nudge: ' + sub);
  });

  await t('Saturday shows the weekend bar (Fri 4:00 -> Mon 9:20, ~30% by noon)', async () => {
    await openAt('#t=2026-09-05T12:00');       // Saturday noon
    await launch();
    expect(!(await page.locator('#bellWrap').isHidden()), 'hidden on Saturday');
    expect(await text('#periodNow') === 'Next: 1st Period', 'hero: ' + await text('#periodNow'));
    const sub = await text('#bellSub');
    expect(sub.includes('Monday 9:20') && sub.includes('in 45h 20m'), 'sub: ' + sub);
    const w = await page.$eval('#bellFill', n => parseFloat(n.style.width));
    expect(w > 67 && w < 72, 'Saturday drain: ' + w);  // 45h20m of 65h20m left = 69.4%
  });

  await t('after the 4:00 bell the bar spans overnight to tomorrow', async () => {
    await openAt('#t=2026-09-08T16:30');       // Tue evening
    await launch();
    expect(!(await page.locator('#bellBar').isHidden()), 'no overnight bar');
    const w = await page.$eval('#bellFill', n => parseFloat(n.style.width));
    expect(w > 94 && w < 99, 'overnight drain: ' + w); // 16h50m of 17h20m left = 97.1%
  });

  await t('seconds-in-countdown toggle restores m:ss', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    expect((await text('#bellSub')) === '39 min until bell', 'default: ' + await text('#bellSub'));
    await page.click('#setBtn');
    await page.check('#sCountSecs');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    expect((await text('#bellSub')).includes('39:00 until bell'), 'toggle: ' + await text('#bellSub'));
  });

  await t('final minute shows "< 1 min" in coarse mode', async () => {
    await openAt('#t=2026-09-08T11:08:30');    // 30s left in 2nd
    await launch();
    expect((await text('#bellSub')).includes('< 1 min until bell'), 'sub: ' + await text('#bellSub'));
  });

  /* ---------- migrations (inline fixtures) + hostility + round trip ---------- */

  const inject = (src, cfgText) => src.replace(
    /(<script id="deckhand-config"[^>]*>)[\s\S]*?(<\/script>)/,
    (_, a, b) => a + '\n' + cfgText + '\n' + b
  );
  const v5src = fs.readFileSync(path.resolve(__dirname, 'Deckhand_v5.3.3.html'), 'utf8');
  const BLK = [{ label: "1st", start: "9:20", end: "10:15" }];
  const v1cfg = enabled => JSON.stringify({
    schemaVersion: 1, appVersion: "3.0.0",
    sound: { enabled: true, volume: 0.25 },
    timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300 },
    bell: {
      enabled, nudgeSeconds: 30, showProgressBar: true,
      anchorMonday: "2026-08-10", anchorWeekType: "blue",
      templates: {
        blueReg: { label: "Blue Week", blocks: BLK },
        blueWed: { label: "Blue Week", blocks: BLK },
        blackReg: { label: "Black Week", blocks: BLK },
        blackWed: { label: "Black Week", blocks: BLK }
      }
    }
  }, null, 2);
  const v2cfg = (schedules, def) => JSON.stringify({
    schemaVersion: 2, appVersion: "4.0.0", ownerName: "Mr. Shaffer",
    sound: { enabled: true, volume: 0.25 },
    timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300 },
    bell: { nudgeSeconds: 0, showProgressBar: true, defaultSchedule: def, schedules }
  }, null, 2);
  const loadFixture = async (fname, cfgText) => {
    const p = path.resolve(__dirname, fname);
    fs.writeFileSync(p, inject(v5src, cfgText));
    const pg = await ctx.newPage(); watchErrors(pg);
    await pg.goto('file://' + p);
    await pg.waitForTimeout(350);
    return pg;
  };

  await t('v1 config migrates 1->2->3: paired groups, nudge kept, enabled honored', async () => {
    const pg = await loadFixture('tmp_mig1.html', v1cfg(true));
    let c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.schemaVersion === 3 && c.bell.groups.length === 2,
      'groups: ' + c.bell.groups.length);
    expect(c.bell.groups[0].name === 'Blue Week' && c.bell.groups[0].wednesday.length === 1,
      'pairing: ' + JSON.stringify(c.bell.groups[0].name));
    expect(c.bell.nudgeSeconds === 30, 'nudge: ' + c.bell.nudgeSeconds);
    expect(c.bell.defaultGroup === 'Blue Week', 'default: ' + c.bell.defaultGroup);
    await pg.close();
    const pg2 = await loadFixture('tmp_mig1off.html', v1cfg(false));
    c = await pg2.evaluate(() => window.Deckhand.config);
    expect(c.bell.defaultGroup === 'none', 'disabled resurrected: ' + c.bell.defaultGroup);
    await pg2.close();
  });

  await t('v2: 4 unpaired schedules keep all 4 groups + default', async () => {
    const pg = await loadFixture('tmp_mig4.html', v2cfg([
      { name: "Blue", blocks: BLK }, { name: "Black", blocks: BLK },
      { name: "Assembly", blocks: BLK }, { name: "Finals", blocks: BLK }
    ], "Finals"));
    const c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.bell.groups.length === 4, 'groups: ' + c.bell.groups.length);
    expect(c.bell.defaultGroup === 'Finals', 'default: ' + c.bell.defaultGroup);
    await pg.close();
  });

  await t('v2: unpaired "Lab Wednesday" default maps to itself; dup names deduped', async () => {
    const pg = await loadFixture('tmp_miglab.html', v2cfg([
      { name: "Blue Regular", blocks: BLK }, { name: "Blue Wednesday", blocks: BLK },
      { name: "Lab Wednesday", blocks: BLK }
    ], "Lab Wednesday"));
    const c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.bell.defaultGroup === 'Lab Wednesday', 'default: ' + c.bell.defaultGroup);
    await pg.close();
    const pg2 = await loadFixture('tmp_migdup.html', v2cfg([
      { name: "Blue Regular", blocks: BLK }, { name: "Blue Week", blocks: BLK }
    ], "none"));
    const names = await pg2.evaluate(() => window.Deckhand.config.bell.groups.map(g => g.name));
    expect(new Set(names).size === names.length, 'dupes: ' + names.join('|'));
    await pg2.click('#launchBtn');
    await pg2.click('#setBtn');
    await pg2.click('#applyBtn');
    expect((await pg2.textContent('#setErrors')).trim() === 'Applied.',
      'no-op apply failed: ' + await pg2.textContent('#setErrors'));
    await pg2.close();
  });

  await t('hostile config + string schemaVersion tolerated', async () => {
    const pg = await loadFixture('tmp_host.html',
      '{"schemaVersion":"3","ownerName":42,"sound":null,"timer":{"presetsMinutes":"x"},"bell":{"groups":"oops"}}');
    expect(/^Good (morning|afternoon|evening)!$/.test((await pg.textContent('#greet')).trim()),
      'greet: ' + await pg.textContent('#greet'));
    await pg.click('#launchBtn');
    await pg.click('#startBtn');
    await pg.waitForTimeout(250);
    expect((await pg.textContent('#startBtn')).trim() === 'Pause', 'timer dead');
    await pg.close();
  });

  await t('round trip: download keeps schema-3 Teal/Black config', async () => {
    await openAt('');
    await launch();
    await page.click('#setBtn');
    await page.fill('#sNudge', '45');
    const [ dl ] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#dlBtn')
    ]);
    expect(/^Deckhand_v5\.3\.3_\d{4}-\d{2}-\d{2}\.html$/.test(dl.suggestedFilename()),
      'filename: ' + dl.suggestedFilename());
    const saved = path.resolve(__dirname, 'tmp_rt.html');
    await dl.saveAs(saved);
    const pg = await ctx.newPage(); watchErrors(pg);
    await pg.goto('file://' + saved);
    await pg.waitForTimeout(350);
    const c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.schemaVersion === 3 && c.bell.nudgeSeconds === 45 &&
           c.bell.groups.length === 2 && c.bell.groups[0].name === 'Teal Week' &&
           c.bell.autoWeek === true && c.bell.anchorMonday === '2026-08-31' &&
           c.timer.style === 'ring' && c.bell.showCountdown === true &&
           c.bell.warnMinutes === 5 && c.bell.bathroom.enabled === true &&
           c.bell.showNextClass === true && c.clock.showSeconds === false,
      JSON.stringify({ s: c.schemaVersion, n: c.bell.nudgeSeconds,
                       g: c.bell.groups.map(g => g.name) }));
    await pg.close();
  });

  /* ---------- screenshots ---------- */
  await openAt('#t=2026-09-08T10:30');
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'shot_landing.png' });
  await launch();
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'shot_board_wed.png' });

  console.log(results.join('\n'));
  console.log('\nJS errors: ' + (errors.length ? '\n' + errors.join('\n') : 'none'));
  console.log('\n' + (failCount === 0 && errors.length === 0 ? 'ALL GREEN' : failCount + ' FAILURES'));
  await browser.close();
  process.exit(failCount === 0 && errors.length === 0 ? 0 : 1);
})();
