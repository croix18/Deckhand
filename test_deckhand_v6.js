/* Deckhand v6 (canvas + scenes) — automated browser tests */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const jsQR = require('./node_modules/jsqr/dist/jsQR.js');

// rasterize a QR matrix and decode it with an independent reader
function decodeQR(matrix){
  const scale = 8, quiet = 4;
  const dim = (matrix.length + quiet * 2) * scale;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < matrix.length; c++){
      if (!matrix[r][c]) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++){
          const px = ((r + quiet) * scale + dy) * dim + (c + quiet) * scale + dx;
          data[px * 4] = data[px * 4 + 1] = data[px * 4 + 2] = 0;
        }
    }
  return jsQR(data, dim, dim);
}

(async () => {
  const browser = await chromium.launch();
  // v6.13: motion is decoration on top of instant state — the suite runs
  // with reduced motion so every geometry assert sees final positions;
  // dedicated motion tests opt back in with 'no-preference'.
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });   // belt + braces per page
  const errors = [];
  const watchErrors = p => {
    p.on('console', m => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
        errors.push('console: ' + m.text());
    });
    p.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  };
  watchErrors(page);

  const url = 'file://' + path.resolve(__dirname, 'Deckhand_v6.html');
  const openAt = async hash => {
    await page.goto('about:blank');
    await page.goto(url + (hash || ''));
    await page.waitForTimeout(350);
  };
  const launch = async () => { await page.click('#launchBtn'); await page.waitForTimeout(150); };
  // v6.3: adds live in the dock's "+ Add" menu
  const addW = async id => { await page.click('#addBtn'); await page.click('#' + id); };
  // v6.17: ⏱ opens a preset menu; "Type a time…" is the card route
  const summonCard = async () => {
    await page.click('#focusTimerBtn');
    await page.click('#focusTimerMenu [data-custom]');
  };
  // v6.29: the default board is clock + settle-in. Tests that exercise
  // the primary timer summon one into the OLD right column first.
  const addTimer = async () => {
    await addW('addTimerBtn');
    await page.evaluate(() => {
      const en = document.querySelector('.w-timer')._entry;
      en.cfg.x = 61; en.cfg.y = 0; en.cfg.w = 39; en.cfg.h = 100;
      en.el.style.left = '61%'; en.el.style.top = '0%';
      en.el.style.width = '39%'; en.el.style.height = '100%';
    });
  };
  // v6.11: unlocking takes a deliberate 1.5s hold (kid-resistance)
  const unlock = async () => {
    const b = await page.locator('#lockBtn').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1750);
    await page.mouse.up();
    await page.waitForTimeout(120);
  };
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
    await addTimer();
    await page.mouse.click(960, 999);
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

  await t('alarm rings; Enter dismisses; focused dock button suppressed', async () => {
    await page.mouse.click(960, 999);
    await page.keyboard.press('2');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2900);
    expect((await attr('#alarm', 'class')).includes('on'), 'no alarm');
    await page.focus('#lockBtn');
    await page.keyboard.press('Enter');            // must dismiss, NOT toggle lock
    expect(!(await attr('#alarm', 'class')).includes('on'), 'not dismissed');
    expect(await attr('#lockBtn', 'aria-pressed') === 'false', 'lock fired behind overlay');
    expect(await text('#startBtn') === 'Start', 'timer restarted behind overlay');
  });

  await t('stopwatch widget independent; background timer rings with its name', async () => {
    await page.mouse.click(960, 999);
    await page.keyboard.press('3');                // primary timer: 0:03
    await page.keyboard.press('Enter');            // running
    await addW('addWatchBtn');              // stopwatch widget appears, selected
    expect(await page.locator('.w-stopwatch').count() === 1, 'stopwatch not added');
    await page.keyboard.press(' ');                // runs the SELECTED stopwatch
    await page.waitForTimeout(1300);
    const swText = (await page.locator('.w-stopwatch .tDisplay').textContent()).trim();
    expect(swText !== '0:00', 'stopwatch not counting: ' + swText);
    await page.waitForTimeout(2400);               // primary timer expires meanwhile
    expect((await attr('#alarm', 'class')).includes('on'), 'no background ring');
    expect((await text('#alarmWho')) === 'Timer', 'who: ' + await text('#alarmWho'));
    await page.keyboard.press('Escape');
    await page.keyboard.press('h');
    expect(await page.evaluate(() => document.body.classList.contains('landing')), 'H failed');
    await launch();
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
    await addTimer();
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
    await addTimer();
    expect(!(await page.locator('#visWrap').isHidden()), 'visual hidden');
    expect(await page.locator('#timer').isHidden(), 'digits element visible');
    expect(await text('#visDigits') === '5:00', 'vis digits: ' + await text('#visDigits'));
    await page.click('[data-min="1"]');
    expect(await text('#visDigits') === '1:00', 'vis not synced');
    const off = await page.$eval('#visProgC', n => n.getAttribute('stroke-dashoffset'));
    expect(parseFloat(off) < 1, 'ring should be full when reset: ' + off);
  });

  await t('entry falls back to digits; low state colors visual', async () => {
    await page.mouse.click(960, 999);
    await page.keyboard.press('7');            // entry mode
    expect(await page.locator('#visWrap').isHidden(), 'visual during entry');
    expect(!(await page.locator('#timer').isHidden()), 'entry digits hidden');
    await page.keyboard.press('Escape');
    await page.keyboard.press('9');            // 0:09 -> low immediately
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect(((await attr('#visWrap', 'class')) || '').includes('low'), 'no low state');
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
    await addTimer();
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
    await addTimer();
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
    await page.mouse.click(960, 999);
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
    await page.mouse.click(960, 999);
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

  await t('settings organized in 5 sections; schedules + rosters collapsed', async () => {
    await page.click('#setBtn');
    const n = await page.locator('details.setSec').count();
    expect(n === 5, 'sections: ' + n);
    expect(!(await page.evaluate(() => document.getElementById('secScheds').open)),
      'schedules open by default');
    expect(!(await page.evaluate(() => document.getElementById('secRosters').open)),
      'rosters open by default');
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

  /* ---------- v6: canvas, widgets, scenes, lock ---------- */

  const near48 = v => Math.abs(v - Math.round(v / 48) * 48) < 1.5;

  await t('canvas: default scene renders clock + settle-in, dock ready, settle selected', async () => {
    await openAt('');
    await launch();
    expect(await page.inputValue('#sceneSel') === 'Daily Board',
      'scene: ' + await page.inputValue('#sceneSel'));
    expect(await page.locator('#canvas .widget:visible').count() === 2, 'widget count');
    expect(!(await page.locator('#clockWidget').isHidden()), 'clock hidden');
    // v6.29: the settle-in replaced the default timer (Croix)
    expect(await page.locator('.w-settle.sel').count() === 1, 'settle not selected');
    expect(await page.locator('.w-timer').count() === 0, 'a timer snuck back in');
    expect(await page.evaluate(() => window.Deckhand.scene) === 'Daily Board', 'api scene');
    // the summoned-timer path still hands out the legacy ids
    await addTimer();
    expect(await page.locator('.w-timer #timer').count() === 1, 'legacy ids missing');
    // (left on the board: the next two tests drag/resize this timer)
  });

  await t('canvas: strip-drag snaps to the painted 48px grid and writes config', async () => {
    // the default timer is full-height, so shrink it first to free the y axis
    const hb = await page.locator('.w-timer .wHandle.hSE').boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x, hb.y - 320, { steps: 6 });
    await page.mouse.up();
    const sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + 40 - 217, sb.y + sb.height / 2 + 155, { steps: 8 });
    await page.waitForTimeout(80);             // let the drag rAF paint
    const mid = await page.evaluate(() => {
      const el = document.querySelector('.w-timer');
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      return { tf: el.style.transform, drag: el.classList.contains('dragging'), cx: cw.x };
    });
    // buttery: mid-drag the widget follows via transform, unsnapped, config untouched
    expect(mid.tf.includes('translate') && mid.drag, 'not following: ' + JSON.stringify(mid));
    expect(mid.cx === 61, 'config written mid-drag: ' + mid.cx);
    await page.mouse.up();
    const m = await page.evaluate(() => {
      const el = document.querySelector('.w-timer');
      const c = document.getElementById('canvas').getBoundingClientRect();
      const w = el.getBoundingClientRect();
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      // v6.13: the grid is CANVAS-anchored (painted lines shifted to match)
      return { px: w.left - c.left, py: w.top - c.top, cx: cw.x, cy: cw.y, tf: el.style.transform };
    });
    expect(m.tf === '', 'transform lingers after drop');
    expect(near48(m.px) && near48(m.py), 'not on grid: ' + JSON.stringify(m));
    expect(m.cx < 61 && m.cy > 0, 'config not updated: ' + JSON.stringify(m));
  });

  await t('canvas: corner handle resizes on-grid; far over-shrink clamps at 180x140', async () => {
    const hb = await page.locator('.w-timer .wHandle.hSE').boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x - 213, hb.y - 158, { steps: 8 });
    await page.mouse.up();
    let m = await page.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const w = document.querySelector('.w-timer').getBoundingClientRect();
      return { r: w.right - c.left, b: w.bottom - c.top, w: w.width, h: w.height };
    });
    expect(near48(m.r) && near48(m.b), 'edges off grid: ' + JSON.stringify(m));
    expect(m.w >= 179 && m.h >= 139, 'below minimum: ' + JSON.stringify(m));
    const hb2 = await page.locator('.w-timer .wHandle.hSE').boundingBox();
    await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb2.x - 900, hb2.y - 900, { steps: 6 });
    await page.mouse.up();
    m = await page.evaluate(() => {
      const w = document.querySelector('.w-timer').getBoundingClientRect();
      return { w: w.width, h: w.height };
    });
    // snap-on-release lands on the nearest gridline at/above the 180x140 floor
    expect(m.w >= 179 && m.w <= 232 && m.h >= 139 && m.h <= 192,
      'clamp: ' + JSON.stringify(m));
  });

  await t('canvas: west-edge and SW-corner handles resize from the left, on grid', async () => {
    await openAt('');
    await launch();
    await addTimer();
    const before = await page.evaluate(() => {
      const r = document.querySelector('.w-timer').getBoundingClientRect();
      return { l: r.left, r: r.right, b: r.bottom };
    });
    // drag the LEFT edge outward: left edge moves, right edge must not
    const hw = await page.locator('.w-timer .wHandle.hW').boundingBox();
    await page.mouse.move(hw.x + hw.width / 2, hw.y + hw.height / 2);
    await page.mouse.down();
    await page.mouse.move(hw.x - 190, hw.y, { steps: 6 });
    await page.mouse.up();
    let m = await page.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const r = document.querySelector('.w-timer').getBoundingClientRect();
      return { l: r.left, r: r.right, b: r.bottom, gl: r.left - c.left };
    });
    expect(m.l < before.l - 100, 'left edge did not move: ' + JSON.stringify(m));
    expect(near48(m.gl), 'left edge off grid: ' + m.gl);
    expect(Math.abs(m.r - before.r) < 1.5, 'right edge drifted: ' + m.r + ' vs ' + before.r);
    // SW corner: left edge + bottom edge together, right edge still pinned
    const hsw = await page.locator('.w-timer .wHandle.hSW').boundingBox();
    await page.mouse.move(hsw.x + hsw.width / 2, hsw.y + hsw.height / 2);
    await page.mouse.down();
    await page.mouse.move(hsw.x + 130, hsw.y - 170, { steps: 6 });
    await page.mouse.up();
    const m2 = await page.evaluate(() => {
      const w = document.querySelector('.w-timer');
      const c = document.getElementById('canvas').getBoundingClientRect();
      const r = w.getBoundingClientRect();
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      return { l: r.left, r: r.right, b: r.bottom, tf: w.style.transform, cx: cw.x,
               gl: r.left - c.left, gb: r.bottom - c.top };
    });
    expect(m2.l > m.l + 60 && m2.b < before.b - 100, 'SW corner did not resize: ' + JSON.stringify(m2));
    expect(near48(m2.gl) && near48(m2.gb), 'SW edges off grid: ' + JSON.stringify(m2));
    expect(Math.abs(m2.r - before.r) < 1.5, 'right edge drifted on SW: ' + m2.r);
    expect(m2.tf === '' && m2.cx > 0, 'state not committed: ' + JSON.stringify(m2));
  });

  await t('canvas: pointerdown restacks; clicking the clock keeps timer selection', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await page.click('#clock');
    await page.click('.w-timer .visWrap');
    const z = await page.evaluate(() => ({
      c: +document.getElementById('clockWidget').style.zIndex || 0,
      t: +document.querySelector('.w-timer').style.zIndex || 0
    }));
    expect(z.t > z.c && z.c > 0, 'z-order: ' + JSON.stringify(z));
    await page.click('#clock');
    expect(await page.locator('.w-timer.sel').count() === 1, 'clock click stole selection');
  });

  await t('canvas: + Timer adds a selected 2nd timer; keys route to selection; S cycles', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await addW('addTimerBtn');
    expect(await page.locator('.w-timer').count() === 2, 'count');
    expect(await page.locator('.w-timer.sel').count() === 1, 'selection');
    expect((await page.locator('.w-timer.sel .wLabel').textContent()) === 'TIMER 2',
      'label: ' + await page.locator('.w-timer.sel .wLabel').textContent());
    await page.mouse.click(960, 999);
    await page.keyboard.press(' ');            // starts ONLY Timer 2
    await page.waitForTimeout(250);
    expect((await page.locator('.w-timer.sel .tStart').textContent()).trim() === 'Pause',
      'selected timer not running');
    expect(await text('#startBtn') === 'Start', 'unselected timer started');
    await page.keyboard.press(' ');            // pause Timer 2
    await page.keyboard.press('s');            // cycle → the settle-in (v6.29 default)
    expect(await page.locator('.w-settle.sel').count() === 1, 'S skipped the settle');
    await page.keyboard.press('s');            // …then around to the first timer
    expect(await page.locator('.w-timer.sel #timer').count() === 1, 'S did not cycle');
    await page.keyboard.press('7');            // digits go to the selected timer
    expect(await text('#timer') === '0:07', 'entry: ' + await text('#timer'));
    await page.keyboard.press('Escape');
  });

  await t('canvas: closing a widget removes it from the scene config', async () => {
    const before = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.length);
    await page.locator('.w-timer').nth(1).locator('.wClose').click();
    expect(await page.locator('.w-timer').count() === 1, 'widget lingers');
    const after = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.length);
    expect(after === before - 1, 'config kept it: ' + before + '->' + after);
    // v6.29: the settle-in is on the board and next in line — recovery
    // may hand the selection to it (close taps select the dying widget first)
    expect(await page.locator('.w-timer.sel, .w-stopwatch.sel, .w-settle.sel')
      .count() === 1, 'selection not recovered');
  });

  await t('canvas: clock removes, add-clock re-adds, one clock max', async () => {
    expect(await page.locator('#addClockBtn').isDisabled(), 'add-clock enabled with clock up');
    await page.click('#clockWidget .wClose');
    expect(await page.locator('#clockWidget').isHidden(), 'clock still visible');
    expect(await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.some(w => w.type === 'clock')) === false,
      'config kept the clock');
    expect(!(await page.locator('#addClockBtn').isDisabled()), 'add-clock still disabled');
    await addW('addClockBtn');
    expect(!(await page.locator('#clockWidget').isHidden()), 'clock did not return');
    expect(await page.locator('#addClockBtn').isDisabled(), 'second clock allowed');
  });

  await t('lock: freezes drag/close/add, keeps keyboard timer control, unlock restores', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await page.click('#lockBtn');
    expect(await attr('#lockBtn', 'aria-pressed') === 'true', 'not pressed');
    expect(await page.locator('#addTimerBtn').isDisabled(), 'add enabled');
    expect(await page.locator('.w-timer .wClose').isHidden(), 'close visible');
    const before = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    const sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 300, sb.y + 200, { steps: 5 });
    await page.mouse.up();
    const after = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    expect(before === after, 'locked widget moved');
    expect(await page.evaluate(() => window.Deckhand.config.ui.locked) === true, 'config');
    await page.mouse.click(960, 999);
    await page.keyboard.press(' ');            // timers still usable while locked
    await page.waitForTimeout(250);
    expect(await text('#startBtn') === 'Pause', 'locked timer keyboard dead');
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
    // a quick tap must NOT unlock — a labeled button is one poke from a kid
    await page.click('#lockBtn');
    expect(await attr('#lockBtn', 'aria-pressed') === 'true', 'one tap unlocked');
    // scene SWITCHING stays live while locked (view action); the ⋯ manager doesn't
    expect(!(await page.locator('#sceneSel').isDisabled()), 'sceneSel dead while locked');
    expect(await page.locator('#sceneBtn').isDisabled(), '⋯ manager usable while locked');
    // a deliberate 1.5s hold unlocks
    await unlock();
    expect(await attr('#lockBtn', 'aria-pressed') === 'false', 'unlock failed');
    expect(!(await page.locator('.w-timer .wClose').isHidden()), 'close still hidden');
  });

  await t('drag survives mid-drag rug pulls: scene switch and ✕ cannot deadlock it', async () => {
    await openAt('');
    await launch();
    await addTimer();
    const dragWorks = async () => {
      const before = await page.evaluate(() =>
        document.querySelector('.w-timer')._entry.cfg.x);
      const b = await page.locator('.w-timer .strip').boundingBox();
      await page.mouse.move(b.x + 40, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + 40 - 96, b.y + b.height / 2, { steps: 4 });
      await page.mouse.up();
      const after = await page.evaluate(() =>
        document.querySelector('.w-timer')._entry.cfg.x);
      return after !== before;
    };
    // rug pull 1: scene switch while a drag is held
    let sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 140, sb.y + 80, { steps: 4 });
    await page.evaluate(() => {
      const sel = document.getElementById('sceneSel');
      sel.value = 'Stations';
      sel.dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(150);
    await page.mouse.up();                        // lands nowhere — capture is gone
    await page.evaluate(() => {
      const sel = document.getElementById('sceneSel');
      sel.value = 'Daily Board';
      sel.dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(150);
    expect(await dragWorks(), 'dragging dead after scene-switch rug pull');
    // rug pull 2: the dragged widget's own ✕ mid-drag
    sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 140, sb.y + 80, { steps: 4 });
    await page.evaluate(() =>
      document.querySelector('.w-timer .wClose').click());
    await page.waitForTimeout(150);
    await page.mouse.up();
    await addW('addTimerBtn');                    // bring a timer back
    expect(await dragWorks(), 'dragging dead after ✕ rug pull');
  });

  await t('lock mid-drag: the release never writes into a locked config', async () => {
    await openAt('');
    await launch();
    await addTimer();
    const before = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    const sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 200, sb.y + 60, { steps: 4 });
    await page.evaluate(() => document.getElementById('lockBtn').click());
    await page.waitForTimeout(120);
    await page.mouse.up();
    const after = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    expect(before === after, 'locked release still committed the drag');
    expect(await page.evaluate(() => window.Deckhand.config.ui.locked) === true, 'not locked');
    const back = await page.evaluate(() => {
      const en = document.querySelector('.w-timer')._entry;
      const r = en.el.getBoundingClientRect();
      const c = document.getElementById('canvas').getBoundingClientRect();
      return Math.abs((r.left - c.left) / c.width * 100 - en.cfg.x) < 1.5;
    });
    expect(back, 'widget stranded away from its stored box');
    await unlock();
  });

  await t('scenes: Stations swaps the widget set and back without residue', async () => {
    await openAt('');
    await launch();
    await page.selectOption('#sceneSel', 'Stations');
    await page.waitForTimeout(200);
    expect(await page.locator('#canvas .widget:visible').count() === 5,
      'count: ' + await page.locator('#canvas .widget:visible').count());
    const labels = await page.locator('.w-timer .wLabel').allTextContents();
    expect(labels.join('|') === 'STATION 1|STATION 2|STATION 3', 'labels: ' + labels.join('|'));
    expect(await page.locator('.w-stopwatch').count() === 1, 'stopwatch missing');
    expect(await page.locator('#timer').count() === 1, 'legacy ids not reassigned');
    expect(await page.evaluate(() => window.Deckhand.scene) === 'Stations', 'api scene');
    expect(await page.evaluate(() => document.activeElement !== document.getElementById('sceneSel')),
      'scene select kept keyboard focus');
    await page.keyboard.press('s');            // must cycle selection, NOT switch scene
    expect(await page.evaluate(() => window.Deckhand.scene) === 'Stations', 's switched scene');
    await page.keyboard.press(' ');            // run the selected station timer
    await page.waitForTimeout(150);
    await page.selectOption('#sceneSel', 'Daily Board');
    await page.waitForTimeout(400);            // destroyed timer must not tick or ring
    expect(await page.locator('#canvas .widget:visible').count() === 2, 'residue widgets');
    // v6.29: the Daily Board carries a settle-in, not a timer
    expect(await page.locator('.w-timer').count() === 0, 'timer residue');
    expect(await page.locator('.w-settle').count() === 1, 'settle count');
    expect(await page.evaluate(() => window.Deckhand.config.activeScene) === 'Daily Board',
      'config scene');
  });

  await t('Next Bell widget: drains through the period, honors seconds toggle', async () => {
    await openAt('#t=2026-09-08T10:30');       // Teal Tue: in 2nd, 39 of 53 min left
    await launch();
    await addTimer();
    await addW('addBellBtn');
    expect(await page.locator('.w-bell').count() === 1, 'bell widget missing');
    const b = await page.evaluate(() => {
      const w = document.querySelector('.w-bell');
      const cw = window.Deckhand.config.scenes[0].widgets;
      return {
        big: w.querySelector('.bellBig').textContent,
        small: w.querySelector('.bellSmall').textContent,
        off: parseFloat(w.querySelector('.visProg').getAttribute('stroke-dashoffset')),
        cfgType: cw[cw.length - 1].type, label: cw[cw.length - 1].label
      };
    });
    expect(b.big === '39 min', 'big: ' + b.big);
    expect(b.small === 'until bell · 2nd', 'small: ' + b.small);
    // 39/53 remaining -> offset = C * (1 - 0.7358) ~ 139 of C=527.8
    expect(b.off > 130 && b.off < 150, 'drain wrong: ' + b.off);
    expect(b.cfgType === 'bell' && b.label === 'Next Bell', 'config: ' + JSON.stringify(b));
    await page.keyboard.press(' ');            // Space on a bell widget is a safe no-op
    expect(await text('#startBtn') === 'Start', 'Space leaked to a timer');
    await page.click('#setBtn');
    await page.check('#sCountSecs');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    const big2 = await page.locator('.w-bell .bellBig').textContent();
    expect(/^(39:00|38:[45]\d)$/.test(big2), 'seconds toggle: ' + big2);
  });

  await t('Next Bell widget: coral in the warn window, weekend gap drain', async () => {
    await openAt('#t=2026-09-08T11:05');       // 4 min left in 2nd (warn at 5)
    await launch();
    await addW('addBellBtn');
    let s = await page.evaluate(() => {
      const w = document.querySelector('.w-bell .visWrap');
      return { low: w.classList.contains('low'),
               big: w.querySelector('.bellBig').textContent };
    });
    expect(s.low && s.big === '4 min', 'warn state: ' + JSON.stringify(s));
    await openAt('#t=2026-09-06T15:00');       // Sunday 3pm: 18h20m of 65h20m to Mon 9:20
    await launch();
    await addW('addBellBtn');
    s = await page.evaluate(() => {
      const w = document.querySelector('.w-bell .visWrap');
      return { big: w.querySelector('.bellBig').textContent,
               small: w.querySelector('.bellSmall').textContent,
               off: parseFloat(w.querySelector('.visProg').getAttribute('stroke-dashoffset')) };
    });
    expect(s.big === '18h 20m', 'weekend big: ' + s.big);
    expect(s.small === 'until 1st · Monday 9:20', 'weekend small: ' + s.small);
    // ~28% remains -> offset ~ C * 0.719 ~ 380
    expect(s.off > 368 && s.off < 392, 'weekend drain: ' + s.off);
    await page.evaluate(() => window.Deckhand.setSchedule(-1));  // No bells
    await page.waitForTimeout(700);            // widget repaints on its 500ms tick
    s = await page.evaluate(() => {
      const w = document.querySelector('.w-bell .visWrap');
      return { off: w.classList.contains('bellOff'),
               small: w.querySelector('.bellSmall').textContent };
    });
    expect(s.off && s.small === 'No bells today', 'off state: ' + JSON.stringify(s));
  });

  await t('small widget: content never overflows the strip or the card edges', async () => {
    await openAt('');
    await launch();
    await addTimer();
    // shrink the timer widget to its minimum via the corner handle
    const hb = await page.locator('.w-timer .wHandle.hSE').boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x - 1200, hb.y - 1200, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const w = document.querySelector('.w-timer');
      const wr = w.getBoundingClientRect();
      const strip = w.querySelector('.strip').getBoundingClientRect();
      const gone = sel => {
        const el = w.querySelector(sel);
        return !el || getComputedStyle(el).display === 'none';
      };
      // whichever display is active (ring, or plain digits when too short)
      const visGone = gone('.visWrap');
      const disp = w.querySelector(visGone ? '.tDisplay' : '.visWrap').getBoundingClientRect();
      const row = w.querySelector('.row').getBoundingClientRect();
      return { h: wr.height, stripBot: strip.bottom, cardBot: wr.bottom,
               dTop: disp.top, dBot: disp.bottom, rowBot: row.bottom,
               visGone, digitsText: w.querySelector(visGone ? '.tDisplay' : '.visDigits').textContent,
               hintGone: gone('.tHint'), chipsGone: gone('.chips') };
    });
    expect(m.dTop >= m.stripBot - 1, 'display over the strip: ' + JSON.stringify(m));
    expect(m.dBot <= m.cardBot + 1 && m.rowBot <= m.cardBot + 1,
      'content past the card: ' + JSON.stringify(m));
    expect(m.hintGone && m.chipsGone, 'chrome not shed at ' + m.h + 'px: ' + JSON.stringify(m));
    expect(m.digitsText === '5:00', 'digits wrong: ' + m.digitsText);
    // and the timer still works at minimum size
    await page.keyboard.press(' ');
    await page.waitForTimeout(250);
    expect(await text('#startBtn') === 'Pause', 'tiny timer dead');
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
  });

  await t('small clock: sheds bells until only the time remains, never clips', async () => {
    await openAt('#t=2026-09-08T10:30');       // bells active so bellWrap is populated
    await launch();
    const hb = await page.locator('#clockWidget .wHandle.hSE').boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x - 1500, hb.y - 1500, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    let m = await page.evaluate(() => {
      const w = document.getElementById('clockWidget');
      const wr = w.getBoundingClientRect();
      const strip = w.querySelector('.strip').getBoundingClientRect();
      const clk = document.getElementById('clock').getBoundingClientRect();
      const vis = id => getComputedStyle(document.getElementById(id)).display !== 'none';
      return { h: wr.height, stripBot: strip.bottom, cardBot: wr.bottom,
               cTop: clk.top, cBot: clk.bottom, clockText: document.getElementById('clock').textContent,
               bell: vis('bellWrap'), sub: vis('clockSub') };
    });
    expect(!m.bell && !m.sub, 'chrome not shed at ' + m.h + 'px: ' + JSON.stringify(m));
    expect(m.cTop >= m.stripBot - 1 && m.cBot <= m.cardBot + 1,
      'time clipped: ' + JSON.stringify(m));
    expect(/^\d{1,2}:\d{2}$/.test(m.clockText), 'clock text: ' + m.clockText);
    // mid size: time + period survive, extras are gone
    await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'clock');
      w.w = 40; w.h = 34;                      // ~745x300px
      window.Deckhand;
    });
    await page.selectOption('#sceneSel', 'Daily Board');
    await page.waitForTimeout(250);
    m = await page.evaluate(() => {
      const vis = id => getComputedStyle(document.getElementById(id)).display !== 'none';
      const w = document.getElementById('clockWidget').getBoundingClientRect();
      const hero = document.getElementById('periodNow');
      const hr = hero.getBoundingClientRect();
      return { bell: vis('bellWrap'), hero: hero.textContent, strip: vis('dayStrip'),
               bath: vis('bathPill'), bar: vis('bellBar'), tag: vis('weekTag'),
               heroBot: hr.bottom, cardBot: w.bottom };
    });
    expect(m.bell && m.hero === '2nd Period', 'hero lost: ' + JSON.stringify(m));
    expect(!m.strip && !m.bath && !m.bar && !m.tag, 'extras kept: ' + JSON.stringify(m));
    expect(m.heroBot <= m.cardBot + 1, 'hero clipped: ' + JSON.stringify(m));
  });

  await t('rosters + picker: follows the bell period, no repeats until the round ends', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });   // instant picks for the test
    await openAt('#t=2026-09-08T10:30');       // Teal Tue: 2nd period in the room
    await launch();
    await page.click('#setBtn');
    await page.evaluate(() => { document.getElementById('secRosters').open = true; });
    await page.fill('#rosterGrid textarea[data-period="2nd"]', 'Ava, Ben\nCai, Dee, Eli');
    await page.click('#applyBtn');
    expect((await text('#setErrors')) === 'Applied.', 'apply: ' + await text('#setErrors'));
    await page.click('#closeBtn');
    const ros = await page.evaluate(() => window.Deckhand.config.rosters);
    expect(ros.length === 1 && ros[0].period === '2nd' && ros[0].names.join('|') === 'Ava|Ben|Cai|Dee|Eli',
      'rosters: ' + JSON.stringify(ros));
    await addW('addPickerBtn');
    expect(await page.locator('.w-picker').count() === 1, 'picker missing');
    const auto = (await page.locator('.w-picker .pkSel option').first().textContent()).trim();
    expect(auto === 'Auto — 2nd', 'auto option: ' + auto);
    const seen = new Set();
    for (let i = 0; i < 5; i++){
      await page.click('.w-picker .pkGo');
      await page.waitForTimeout(50);
      seen.add((await page.locator('.w-picker .pkName').textContent()).trim());
    }
    expect(seen.size === 5 && ['Ava','Ben','Cai','Dee','Eli'].every(n => seen.has(n)),
      'round repeated someone: ' + [...seen].join('|'));
    expect((await page.locator('.w-picker .pkLeft').textContent()).trim() === '0 of 5 left',
      'left counter: ' + await page.locator('.w-picker .pkLeft').textContent());
    await page.click('.w-picker .pkGo');       // 6th pick: a fresh round begins
    await page.waitForTimeout(50);
    expect((await page.locator('.w-picker .pkLeft').textContent()).trim() === '4 of 5 left',
      'new round: ' + await page.locator('.w-picker .pkLeft').textContent());
    await page.keyboard.press(' ');            // Space picks on the selected widget
    await page.waitForTimeout(50);
    expect((await page.locator('.w-picker .pkLeft').textContent()).trim() === '3 of 5 left',
      'Space did not pick');
    await page.keyboard.press('r');            // R restarts the round
    expect((await page.locator('.w-picker .pkLeft').textContent()).trim() === '5 of 5 left',
      'R did not reset');
    // a tapped period dropdown must not kill the board keys
    await page.focus('.w-picker .pkSel');
    await page.keyboard.press(' ');
    await page.waitForTimeout(50);
    expect((await page.locator('.w-picker .pkLeft').textContent()).trim() === '4 of 5 left',
      'Space died on a focused select');
    expect(await page.evaluate(() =>
      document.activeElement !== document.querySelector('.w-picker .pkSel')),
      'select kept focus');
    await page.emulateMedia({ reducedMotion: 'reduce' });   // back to the suite baseline
  });

  await t('picker refuses to guess: a block with no roster says so instead', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openAt('#t=2026-09-08T11:20');       // HOWL Time — deliberately roster-less
    await launch();
    await page.click('#setBtn');
    await page.evaluate(() => { document.getElementById('secRosters').open = true; });
    await page.fill('#rosterGrid textarea[data-period="2nd"]', 'Ava, Ben, Cai');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    await addW('addPickerBtn');
    await page.click('.w-picker .pkGo');
    await page.waitForTimeout(60);
    const name = (await page.locator('.w-picker .pkName').textContent()).trim();
    const hint = (await page.locator('.w-picker .tHint').textContent()).trim();
    expect(name === '—', 'picked from the wrong class: ' + name);
    expect(hint === 'No roster for this period — pick one above', 'hint: ' + hint);
    expect(!(await page.locator('.w-picker .tHint').isHidden()),
      'empty-state hint invisible at spawn size');
    // manual override still works
    await page.selectOption('.w-picker .pkSel', '2nd');
    await page.click('.w-picker .pkGo');
    await page.waitForTimeout(60);
    expect(['Ava','Ben','Cai'].indexOf(
      (await page.locator('.w-picker .pkName').textContent()).trim()) !== -1,
      'override pick failed');
    await page.emulateMedia({ reducedMotion: 'reduce' });   // back to the suite baseline
  });

  await t('groups: 7 kids in 4s makes 4+3, never one group of seven', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    await page.click('#setBtn');
    await page.evaluate(() => { document.getElementById('secRosters').open = true; });
    await page.fill('#rosterGrid textarea[data-period="2nd"]', 'A,B,C,D,E,F,G');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    await addW('addGroupsBtn');
    await page.click('.w-groups .gpSize .chip:nth-child(3)');  // 4s (by-count chips follow)
    await page.click('.w-groups .gpGo');
    const sizes = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.w-groups .gpCard'))
        .map(c => c.childNodes[1].textContent.split(', ').length).sort().join(','));
    expect(sizes === '3,4', 'sizes: ' + sizes);
  });

  await t('renaming a period re-keys the roster grid on Apply (orphan stays visible)', async () => {
    await openAt('');
    await launch();
    await page.click('#setBtn');
    await page.evaluate(() => {
      document.getElementById('secRosters').open = true;
      document.getElementById('secScheds').open = true;
    });
    await page.fill('#rosterGrid textarea[data-period="2nd"]', 'Ava, Ben');
    const ta = await page.inputValue('#taGrpReg1');
    await page.fill('#taGrpReg1', ta.replace('2nd 10:16-11:09', 'Second 10:16-11:09'));
    await page.click('#applyBtn');
    expect((await text('#setErrors')) === 'Applied.', 'apply: ' + await text('#setErrors'));
    expect(await page.locator('#rosterGrid textarea[data-period="Second"]').count() === 1,
      'new label has no box after Apply');
    expect(await page.locator('#rosterGrid textarea[data-period="2nd"]').count() === 1,
      'orphaned roster vanished from the grid');
    expect(await page.evaluate(() =>
      window.Deckhand.config.rosters.some(r => r.period === '2nd' && r.names.length === 2)),
      'orphan roster lost from config');
    await page.keyboard.press('Escape');
  });

  await t('group maker: 11 kids in 3s -> 4/4/3, everyone exactly once', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    await page.click('#setBtn');
    await page.evaluate(() => { document.getElementById('secRosters').open = true; });
    await page.fill('#rosterGrid textarea[data-period="2nd"]',
      'N01,N02,N03,N04,N05,N06,N07,N08,N09,N10,N11');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    await addW('addGroupsBtn');
    expect(await page.locator('.w-groups').count() === 1, 'groups widget missing');
    expect(await page.locator('.w-groups .gpSize .chip[aria-pressed="true"]').textContent()
      .then(t => t.trim()) === '3s', 'default size not 3s');
    await page.click('.w-groups .gpGo');
    const g = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.w-groups .gpCard'))
        .map(c => c.childNodes[1].textContent.split(', ')));
    expect(g.length === 3, 'group count: ' + g.length);
    const sizes = g.map(x => x.length).sort().join(',');
    expect(sizes === '3,4,4', 'sizes: ' + sizes);
    const all = g.flat().sort();
    expect(all.length === 11 && new Set(all).size === 11, 'names duplicated or lost: ' + all.join('|'));
    // pairs: 11 kids -> 5 groups (one of 3), nobody alone
    await page.click('.w-groups .gpSize .chip:first-child');
    await page.click('.w-groups .gpGo');
    const g2 = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.w-groups .gpCard'))
        .map(c => c.childNodes[1].textContent.split(', ').length));
    expect(g2.length === 5 && Math.min(...g2) === 2 && Math.max(...g2) === 3,
      'pairs: ' + g2.join(','));
    // widget config remembers the override-able fields
    const wc = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1];
    });
    expect(wc.type === 'groups' && wc.size === 2, 'config: ' + JSON.stringify(wc));
  });

  await t('text box: editing is keyboard-safe; content persists in config', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await addW('addTextBtn');
    expect(await page.locator('.w-text').count() === 1, 'text widget missing');
    expect(await page.locator('.w-text .txBtn').isHidden(), 'Done visible before editing');
    await page.click('.w-text .wEdit');          // pencil in the strip opens the editor
    expect(!(await page.locator('.w-text .txBtn').isHidden()), 'Done missing while editing');
    await page.keyboard.type('Warm-up:\n3r + 5 = 20');
    expect(await text('#startBtn') === 'Start', 'typing started the timer');
    expect(await text('#timer') === '5:00', 'digits leaked to entry: ' + await text('#timer'));
    await page.click('.w-text .txBtn');          // Done
    const t1 = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].text;
    });
    expect(t1 === 'Warm-up:\n3r + 5 = 20', 'config text: ' + JSON.stringify(t1));
    expect(await page.locator('.w-text .txBtn').isHidden(), 'Done lingers after commit');
    expect((await page.locator('.w-text .txInner').textContent()).includes('3r + 5'), 'display');
    await page.click('.w-text .txDisplay');      // tap text re-opens editing
    await page.keyboard.type('solve for r … ');
    await page.keyboard.press('Escape');         // Esc commits, never leaks
    expect(await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].text.includes('solve for r');
    }), 'escape did not commit');
    expect(await page.locator('.w-text .txArea').isHidden(), 'still editing after Esc');
  });

  await t('text box: headings/bullets/numbers render; lock makes it read-only', async () => {
    await openAt('');
    await launch();
    await addW('addTextBtn');
    await page.click('.w-text .txDisplay');      // tapping the text edits too
    await page.keyboard.type('# Finished?\n## Next steps\n- IXL first\n- then NHIs\n1) unit review\nplain line');
    await page.click('.w-text .txBtn');
    const f = await page.evaluate(() => {
      const w = document.querySelector('.w-text');
      return {
        h1: w.querySelectorAll('.txH1').length,
        h2: w.querySelectorAll('.txH2').length,
        bullets: w.querySelectorAll('.txBullet').length,
        nums: w.querySelectorAll('.txNum').length,
        left: w.querySelector('.txInner').classList.contains('txLeft'),
        h1text: (w.querySelector('.txH1') || {}).textContent
      };
    });
    expect(f.h1 === 1 && f.h1text === 'Finished?', 'heading: ' + JSON.stringify(f));
    expect(f.h2 === 1 && f.bullets === 2 && f.nums === 1, 'structure: ' + JSON.stringify(f));
    expect(f.left, 'structured note not left-aligned');
    // hashes/dashes are stripped from display but kept in the source text
    expect(await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].text.startsWith('# Finished?');
    }), 'markup lost from config');
    // locked board: pencil hidden, tapping the text does nothing
    await page.click('#lockBtn');
    expect(await page.locator('.w-text .wEdit').isHidden(), 'pencil visible while locked');
    await page.click('.w-text .txDisplay');
    expect(await page.locator('.w-text .txArea').isHidden(), 'locked text still editable');
    await unlock();
  });

  await t('work mode: chips and Space cycle; mode persists', async () => {
    await addW('addWorkBtn');
    expect((await page.locator('.w-work .wkBadge').textContent()) === 'SILENT', 'default mode');
    await page.click('.w-work .wkChips .chip:nth-child(3)');
    expect((await page.locator('.w-work .wkBadge').textContent()) === 'PARTNERS', 'chip switch');
    await page.keyboard.press(' ');              // selected widget: cycles
    expect((await page.locator('.w-work .wkBadge').textContent()) === 'GROUP WORK', 'Space cycle');
    expect(await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].mode;
    }) === 'groups', 'config mode');
  });

  await t('dice: rolls stay 1-6, count chips, honest total', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openAt('');
    await launch();
    await addW('addDiceBtn');
    expect(await page.locator('.w-dice .die').count() === 2, 'default dice count');
    await page.click('.w-dice .dcGo');
    const vals = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.w-dice .die'))
        .map(d => d.querySelectorAll('circle').length));
    expect(vals.length === 2 && vals.every(v => v >= 1 && v <= 6), 'pips: ' + vals.join(','));
    expect((await page.locator('.w-dice .dcTotal').textContent()).trim() ===
      'Total: ' + (vals[0] + vals[1]), 'total: ' + await page.locator('.w-dice .dcTotal').textContent());
    await page.click('.w-dice .dcChips .chip:first-child');
    expect(await page.locator('.w-dice .die').count() === 1, 'count chip failed');
    expect((await page.locator('.w-dice .dcTotal').textContent()).trim() === '', 'total lingers on one die');
    await page.keyboard.press(' ');
    const v2 = await page.evaluate(() =>
      document.querySelectorAll('.w-dice .die circle').length);
    expect(v2 >= 1 && v2 <= 6, 'Space roll: ' + v2);
    await page.emulateMedia({ reducedMotion: 'reduce' });   // back to the suite baseline
  });

  await t('scoreboard: +/− clamps at 0, inline rename is key-safe, R resets', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await addW('addScoreBtn');
    const plus = page.locator('.w-score .scTeam').first().locator('.scB:not(.minus)');
    await plus.click(); await plus.click(); await plus.click();
    expect((await page.locator('.w-score .scScore').first().textContent()) === '3', 'plus');
    await page.locator('.w-score .scTeam').nth(1).locator('.scB.minus').click();
    expect((await page.locator('.w-score .scScore').nth(1).textContent()) === '0',
      'minus went below zero');
    await page.locator('.w-score .scName').first().click();
    await page.keyboard.type('Sharks');          // replaces the selected text
    await page.keyboard.press('Enter');
    expect((await page.locator('.w-score .scName').first().textContent()) === 'Sharks', 'rename');
    expect(await text('#startBtn') === 'Start', 'rename keys leaked to the board');
    await page.click('.w-score .scChips .chip:last-child');
    expect(await page.locator('.w-score .scTeam').count() === 4, 'team count');
    await page.keyboard.press('r');              // R zeroes the round
    const scores = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.w-score .scScore')).map(n => n.textContent));
    expect(scores.length === 4 && scores.every(s => s === '0'), 'reset: ' + scores.join(','));
    const teams = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].teams;
    });
    expect(teams.length === 4 && teams[0].name === 'Sharks',
      'config teams: ' + JSON.stringify(teams));
  });

  await t('event countdown: days / same-day clock / Today! / Done, local dates', async () => {
    await openAt('#t=2026-08-31T08:00');         // SIM: Mon Aug 31, 8:00 AM
    await launch();
    await addW('addEventBtn');
    expect((await page.locator('.w-event .evSub').textContent()).includes('✎'),
      'no empty-state hint');
    await page.click('.w-event .wEdit');         // pencil opens the row
    await page.fill('.w-event .evName', 'Unit Test');
    await page.fill('.w-event .evDate', '2026-09-04');
    await page.click('.w-event .evBtn');
    expect(await text('.w-event .evBig') === '4', 'days: ' + await text('.w-event .evBig'));
    expect((await text('.w-event .evUnit')).toLowerCase() === 'days to go', 'unit');
    expect((await text('.w-event .evSub')).includes('Sep 4'), 'sub: ' + await text('.w-event .evSub'));
    expect(await text('.w-event .evTitle') === 'Unit Test', 'title');
    const cw = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1];
    });
    expect(cw.title === 'Unit Test' && cw.when === '2026-09-04',
      'config: ' + JSON.stringify({ title: cw.title, when: cw.when }));
    // same-day with a time: an h:mm:ss clock to the moment
    await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      ws[ws.length - 1].when = '2026-08-31T09:30';
    });
    await page.waitForTimeout(700);              // 500ms tick repaints
    expect(/^1:(29|30):\d{2}$/.test(await text('.w-event .evBig')),
      'same-day clock: ' + await text('.w-event .evBig'));
    // date-only today
    await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      ws[ws.length - 1].when = '2026-08-31';
    });
    await page.waitForTimeout(700);
    expect(await text('.w-event .evBig') === 'Today!', 'today: ' + await text('.w-event .evBig'));
    // past date
    await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      ws[ws.length - 1].when = '2026-08-28';
    });
    await page.waitForTimeout(700);
    expect(await text('.w-event .evBig') === 'Done', 'past: ' + await text('.w-event .evBig'));
    expect((await text('.w-event .evSub')).startsWith('was '), 'past sub');
    // Lock slams an open editor shut — students can't rewrite the event
    await page.click('.w-event .wEdit');
    await page.fill('.w-event .evName', 'Hacked by 3rd period');
    await page.click('#lockBtn');
    expect(await page.locator('.w-event .evRow').isHidden(), 'editor open while locked');
    const lockedTitle = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].title;
    });
    expect(lockedTitle === 'Unit Test', 'lock committed the draft: ' + lockedTitle);
    await unlock();
  });

  await t('tally: +1/−/Space count, rename sticks, 2 counters, R resets', async () => {
    await openAt('');
    await launch();
    await addW('addTallyBtn');
    const plus = page.locator('.w-tally .tlCard').first().locator('.scB:not(.minus)');
    await plus.click(); await plus.click(); await plus.click();
    expect(await text('.w-tally .tlCount') === '3', 'plus: ' + await text('.w-tally .tlCount'));
    await page.locator('.w-tally .tlCard').first().locator('.scB.minus').click();
    expect(await text('.w-tally .tlCount') === '2', 'minus');
    await page.keyboard.press(' ');              // Space adds one (widget is selected)
    expect(await text('.w-tally .tlCount') === '3', 'space +1: ' + await text('.w-tally .tlCount'));
    await page.locator('.w-tally .scName').first().click();
    await page.keyboard.type('Points');
    await page.keyboard.press('Enter');
    expect((await page.locator('.w-tally .scName').first().textContent()) === 'Points', 'rename');
    await page.click('.w-tally .tlChips .chip:last-child');
    expect(await page.locator('.w-tally .tlCard').count() === 2, 'counter count');
    expect((await page.locator('.w-tally .scName').first().textContent()) === 'Points',
      'rename lost when adding a counter');
    await page.keyboard.press('r');
    const counts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.w-tally .tlCount')).map(n => n.textContent));
    expect(counts.length === 2 && counts.every(c => c === '0'), 'reset: ' + counts.join(','));
    const items = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].items;
    });
    expect(items.length === 2 && items[0].name === 'Points' && items[0].count === 0,
      'config items: ' + JSON.stringify(items));
  });

  await t('agenda: edit, tap-to-check, checks survive edits, R clears, works locked', async () => {
    await openAt('');
    await launch();
    await addW('addAgendaBtn');
    expect((await page.locator('.w-agenda .agEmpty').textContent()).includes('✎'),
      'no empty state');
    await page.click('.w-agenda .wEdit');
    await page.fill('.w-agenda .agArea', 'Warm-up\nNotes: two-step equations\nExit ticket');
    await page.click('.w-agenda .agBtn');
    expect(await page.locator('.w-agenda .agItem').count() === 3, 'items');
    await page.locator('.w-agenda .agItem').nth(1).click();     // strike the middle one
    let items = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].items;
    });
    expect(items[1].done === true && !items[0].done && !items[2].done,
      'toggle: ' + JSON.stringify(items));
    // re-edit: rename line 1, keep line 2 — its check must survive
    await page.click('.w-agenda .wEdit');
    await page.fill('.w-agenda .agArea', 'Warm-up (5 min)\nNotes: two-step equations\nExit ticket');
    await page.click('.w-agenda .agBtn');
    items = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].items;
    });
    expect(items[1].done === true && items[0].done === false,
      'check lost in edit: ' + JSON.stringify(items));
    await page.keyboard.press('r');              // R clears the checks
    items = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].items;
    });
    expect(items.every(i => !i.done), 'R left checks: ' + JSON.stringify(items));
    // locked: ✎ hides, but checking off still works (live teaching)
    await page.click('#lockBtn');
    expect(await page.locator('.w-agenda .wEdit').isHidden(), '✎ visible while locked');
    await page.locator('.w-agenda .agItem').first().click();
    items = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].items;
    });
    expect(items[0].done === true, 'toggle dead while locked');
    await unlock();
    // overflow at minimum size: the FIRST item must stay reachable
    // (plain justify-content:center clips the top beyond scroll reach)
    await page.evaluate(() => {
      const en = document.querySelector('.w-agenda')._entry;
      en.cfg.items = Array.from({ length: 12 }, (_, i) =>
        ({ text: 'A very long agenda item number ' + (i + 1) + ' that wraps around', done: false }));
      // h:5% floors at the 140px minimum on ANY viewport → the list is
      // reliably too short for 12 items even at the smallest FIT step
      en.cfg.x = 2; en.cfg.y = 2; en.cfg.w = 30; en.cfg.h = 5;
      en.el.style.left = '2%'; en.el.style.top = '2%';
      en.el.style.width = '30%'; en.el.style.height = '5%';
      en.api.rebuild();
    });
    await page.waitForTimeout(200);
    const reach = await page.evaluate(() => {
      const list = document.querySelector('.w-agenda .agList');
      list.scrollTop = 0;
      const first = list.querySelector('.agItem').getBoundingClientRect();
      const box = list.getBoundingClientRect();
      return { top: first.top - box.top, overflows: list.scrollHeight > list.clientHeight };
    });
    expect(reach.overflows, 'fixture did not overflow — test is vacuous');
    expect(reach.top >= -1, 'first item clipped above the scroll area: ' + reach.top);
  });

  await t('landing: the board never paints over the landing page (canvas hidden)', async () => {
    await openAt('#t=2026-09-11T10:15');         // layout that used to collide
    const m = await page.evaluate(() => {
      const lb = document.getElementById('launchBtn');
      const r = lb.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { display: getComputedStyle(document.getElementById('canvas')).display,
               hit: el ? (el.id || el.className) : 'none' };
    });
    expect(m.display === 'none', 'canvas visible at landing: ' + JSON.stringify(m));
    expect(m.hit === 'launchBtn', 'launch button covered: ' + JSON.stringify(m));
    await launch();                              // and the board still opens
    expect(await page.evaluate(() =>
      getComputedStyle(document.getElementById('canvas')).display) !== 'none',
      'canvas hidden after launch');
  });

  await t('alarm dismissal beats an open rename input or text editor', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await addW('addScoreBtn');
    await page.mouse.click(960, 999);
    await page.keyboard.press('s');              // select the timer... cycle until timer
    // ensure the TIMER is selected: cycle until #timer's widget has .sel
    for (let i = 0; i < 4; i++){
      if (await page.locator('.w-timer.sel').count() === 1) break;
      await page.keyboard.press('s');
    }
    await page.keyboard.press('2');              // 0:02
    await page.keyboard.press('Enter');
    await page.locator('.w-score .scName').first().click();   // rename input open
    await page.waitForTimeout(2600);             // timer expires while typing
    expect((await attr('#alarm', 'class')).includes('on'), 'no alarm');
    await page.keyboard.press(' ');              // must dismiss THROUGH the input
    expect(!(await attr('#alarm', 'class')).includes('on'), 'rename input shielded the alarm');
  });

  await t('scoreboard: +1 tapped while a rename is open still scores', async () => {
    await openAt('');
    await launch();
    await addW('addScoreBtn');
    await page.locator('.w-score .scName').first().click();   // open rename
    await page.locator('.w-score .scTeam').first().locator('.scB:not(.minus)').click();
    await page.waitForTimeout(100);
    expect((await page.locator('.w-score .scScore').first().textContent()) === '1',
      'the point was eaten: ' + await page.locator('.w-score .scScore').first().textContent());
  });

  await t('add menu: opens, adds, closes; outside tap closes; Esc closes; lock disables', async () => {
    await openAt('');
    await launch();
    await page.click('#addBtn');
    expect(!(await page.locator('#addMenu').isHidden()), 'menu did not open');
    await page.click('#addDiceBtn');
    expect(await page.locator('#addMenu').isHidden(), 'menu stayed open after add');
    expect(await page.locator('.w-dice').count() === 1, 'widget not added');
    await page.click('#addBtn');
    await page.mouse.click(600, 400);            // outside tap
    expect(await page.locator('#addMenu').isHidden(), 'outside tap left menu open');
    await page.click('#addBtn');
    await page.keyboard.press('Escape');
    expect(await page.locator('#addMenu').isHidden(), 'Escape left menu open');
    await page.click('#lockBtn');
    expect(await page.locator('#addBtn').isDisabled(), 'add enabled while locked');
    await unlock();
  });

  await t('z-order: a much-tapped widget can never bury the dock or + Add menu', async () => {
    await openAt('');
    await launch();
    await addTimer();
    // park the timer over the dock area and slam its z-index up
    await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      w.x = 0; w.y = 55; w.w = 40; w.h = 45;
    });
    await page.selectOption('#sceneSel', 'Daily Board');
    await page.waitForTimeout(200);
    for (let i = 0; i < 25; i++) await page.click('.w-timer .visWrap');  // z climbs
    const zw = await page.evaluate(() =>
      +document.querySelector('.w-timer').style.zIndex);
    expect(zw > 15, 'precondition: z did not climb: ' + zw);
    const onTop = await page.evaluate(() => {
      const b = document.getElementById('addBtn').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el && (el.id === 'addBtn' || !!el.closest('#dock'));
    });
    expect(onTop, 'widget covers the dock');
    await page.click('#addBtn');
    const itemOnTop = await page.evaluate(() => {
      const b = document.getElementById('addTimerBtn').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el && el.id === 'addTimerBtn';
    });
    expect(itemOnTop, 'widget covers the + Add menu');
    await page.keyboard.press('Escape');
  });

  await t('QR widget: in-page encoder output decodes to the exact URL', async () => {
    await openAt('');
    await launch();
    await addW('addQrBtn');
    expect(await page.locator('.w-qr').count() === 1, 'qr widget missing');
    const url = 'https://docs.google.com/forms/d/e/1FAIpQLSft8pXk3JqZw9/viewform?usp=sf_link';
    await page.fill('.w-qr .qrIn', url);
    await page.mouse.click(960, 999);            // blur applies
    await page.waitForTimeout(150);
    expect(await page.locator('.w-qr svg path').count() === 1, 'no QR rendered');
    expect(await page.evaluate(u => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].url === u;
    }, url), 'url not in config');
    // decode what the in-page encoder produces, with an independent reader
    for (const probe of [url, 'https://kahoot.it/?pin=98765', 'A'.repeat(250)]){
      const matrix = await page.evaluate(u => window.Deckhand.qr(u), probe);
      const res = decodeQR(matrix);
      expect(res && res.data === probe,
        'decode failed for len ' + probe.length + ': ' + (res ? res.data.slice(0, 40) : 'null'));
    }
    // too-long input degrades to a message, not a broken code
    await page.fill('.w-qr .qrIn', 'x'.repeat(300));
    await page.mouse.click(960, 999);
    expect(await page.evaluate(() => window.Deckhand.qr('x'.repeat(400)) === null),
      'encoder should refuse over-long input');
  });

  await t('sketch pad: strokes land, eraser erases, Clear/R wipe, no widget drag', async () => {
    await openAt('');
    await launch();
    await addW('addDrawBtn');
    const cb = await page.locator('.dwCanvas').boundingBox();
    const inked = () => page.evaluate(() => {
      const c = document.querySelector('.dwCanvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n;
    });
    const before = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets.slice(-1)[0]));
    await page.mouse.move(cb.x + 40, cb.y + 40);
    await page.mouse.down();
    await page.mouse.move(cb.x + 200, cb.y + 120, { steps: 8 });
    await page.mouse.up();
    const n1 = await inked();
    expect(n1 > 500, 'stroke did not land: ' + n1);
    const after = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets.slice(-1)[0]));
    expect(before === after, 'drawing dragged/resized the widget');
    await page.click('.w-draw .dwEraser');
    await page.mouse.move(cb.x + 40, cb.y + 40);
    await page.mouse.down();
    await page.mouse.move(cb.x + 200, cb.y + 120, { steps: 8 });
    await page.mouse.up();
    const n2 = await inked();
    expect(n2 < n1, 'eraser did nothing: ' + n1 + ' -> ' + n2);
    await page.click('.w-draw .dwClear');
    expect(await inked() === 0, 'Clear left ink');
    await page.mouse.move(cb.x + 60, cb.y + 60);
    await page.mouse.down();
    await page.mouse.move(cb.x + 120, cb.y + 90, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.press('r');              // R wipes the selected sketch
    expect(await inked() === 0, 'R did not clear');
  });

  await t('noise meter: reads the (fake) mic and flags TOO LOUD', async () => {
    const b2 = await chromium.launch({ args: [
      '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const p2 = await b2.newPage({ viewport: { width: 1920, height: 1080 } });
    await p2.goto(url);
    await p2.waitForTimeout(350);
    await p2.click('#launchBtn');
    await p2.click('#addBtn');
    await p2.click('#addMeterBtn');
    await p2.click('.w-meter .mtBtn');
    await p2.waitForTimeout(1200);
    // double-tap must never open a second, unstoppable stream
    await p2.evaluate(() => {
      const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      window.__gum = 0;
      navigator.mediaDevices.getUserMedia = (...a) => { window.__gum++; return orig(...a); };
    });
    await p2.keyboard.press(' ');                // startPause routes to start()
    await p2.waitForTimeout(200);
    expect(await p2.evaluate(() => window.__gum) === 0,
      'a second start issued another getUserMedia');
    const m = await p2.evaluate(() => ({
      w: parseFloat(document.querySelector('.mtFill').style.width) || 0,
      btnGone: document.querySelector('.mtBtn').hidden,
      status: document.querySelector('.mtStatus').textContent
    }));
    expect(m.btnGone, 'mic never started: ' + JSON.stringify(m));
    expect(m.w > 0, 'no level from fake mic: ' + JSON.stringify(m));
    // drop the limit to the floor: the tone must trip TOO LOUD + coral
    await p2.locator('.w-meter .mtLimit').fill('10');
    // the fake mic beeps in bursts — poll for the loud phase
    let over = null;
    for (let i = 0; i < 25; i++){
      over = await p2.evaluate(() => ({
        s: document.querySelector('.mtStatus').textContent,
        cls: document.querySelector('.w-meter').classList.contains('tooLoud'),
        cfg: (() => { const ws = window.Deckhand.config.scenes[0].widgets;
                      return ws[ws.length - 1].limit; })()
      }));
      if (over.s === 'TOO LOUD' && over.cls) break;
      await p2.waitForTimeout(200);
    }
    expect(over.s === 'TOO LOUD' && over.cls, 'limit not enforced: ' + JSON.stringify(over));
    expect(over.cfg === 10, 'limit not saved: ' + over.cfg);
    await b2.close();
  });

  await t('embed: Slides links normalize to the /embed player; https-only', async () => {
    await openAt('');
    await launch();
    await addW('addEmbedBtn');
    expect(await page.locator('.w-embed').count() === 1, 'embed widget missing');
    const cases = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets;
      const wc = w[w.length - 1];
      const inp = document.querySelector('.w-embed .embIn');
      const feed = v => { inp.value = v; inp.dispatchEvent(new Event('blur')); return wc.url; };
      return {
        pub: feed('https://docs.google.com/presentation/d/e/2PACX-abc123/pub?start=false&loop=false&delayms=3000'),
        edit: feed('https://docs.google.com/presentation/d/1YwtHc-00h11TMTq3eH4uETxl03ix3UVl/edit?usp=sharing&ouid=1071'),
        multi: feed('https://docs.google.com/presentation/u/0/d/1ABCdefGHI/edit#slide=id.p13'),
        upper: feed('HTTPS://DOCS.GOOGLE.COM/presentation/d/1XYZ/edit'),
        kiosk: feed('https://docs.google.com/presentation/d/e/2PACX-k/embed?start=true&loop=true&delayms=5000'),
        gdoc: feed('https://docs.google.com/document/d/1DOC/edit'),
        phet: feed('https://phet.colorado.edu/sims/html/fractions-intro/latest/fractions-intro_all.html'),
        evil: feed('javascript:alert(1)')
      };
    });
    expect(cases.multi === 'https://docs.google.com/presentation/d/1ABCdefGHI/embed?start=false&loop=false&delayms=60000&slide=id.p13',
      'multi-account link: ' + cases.multi);
    expect(cases.upper === 'https://docs.google.com/presentation/d/1XYZ/embed?start=false&loop=false&delayms=60000',
      'uppercase host: ' + cases.upper);
    expect(cases.kiosk === 'https://docs.google.com/presentation/d/e/2PACX-k/embed?start=true&loop=true&delayms=5000',
      'kiosk params wiped: ' + cases.kiosk);
    expect(cases.gdoc === 'https://docs.google.com/document/d/1DOC/edit',
      'Docs link rewritten: ' + cases.gdoc);
    expect(cases.pub === 'https://docs.google.com/presentation/d/e/2PACX-abc123/embed?start=false&loop=false&delayms=60000',
      'pub: ' + cases.pub);
    expect(cases.edit === 'https://docs.google.com/presentation/d/1YwtHc-00h11TMTq3eH4uETxl03ix3UVl/embed?start=false&loop=false&delayms=60000',
      'edit: ' + cases.edit);
    expect(cases.phet.indexOf('phet.colorado.edu') !== -1, 'non-Google URL mangled: ' + cases.phet);
    expect(cases.evil !== '' && cases.evil.indexOf('javascript') === -1,
      'javascript: URL survived: ' + cases.evil);
    // keep-last-good: garbage typed over a working URL never erases the deck
    const kept = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets;
      const wc = w[w.length - 1];
      const inp = document.querySelector('.w-embed .embIn');
      inp.value = 'my slides'; inp.dispatchEvent(new Event('blur'));
      return { url: wc.url, shown: inp.value };
    });
    expect(kept.url.indexOf('phet') !== -1 || kept.url.indexOf('docs.google') !== -1,
      'garbage erased the deck: ' + JSON.stringify(kept));
    expect(kept.shown === kept.url, 'input not restored: ' + JSON.stringify(kept));
    // the row auto-hides once a deck loads; the strip pencil brings it back
    expect(await page.locator('.w-embed .embRow').isHidden(), 'row visible with a deck loaded');
    await page.click('.w-embed .wEdit');
    expect(!(await page.locator('.w-embed .embRow').isHidden()), 'pencil did not reopen the row');
    // handles must not sit on the reload button or URL input
    const clickable = await page.evaluate(() => {
      const g = document.querySelector('.w-embed .embGo').getBoundingClientRect();
      const el = document.elementFromPoint(g.x + g.width / 2, g.y + g.height / 2);
      const i = document.querySelector('.w-embed .embIn').getBoundingClientRect();
      const el2 = document.elementFromPoint(i.x + i.width / 2, i.bottom - 4);
      // v6.13: the ⟳ is an inline SVG now — resolve to the owning button
      return { go: el && el.closest('button') && el.closest('button').className,
               input: el2 && el2.className };
    });
    expect(String(clickable.go).indexOf('embGo') !== -1, 'reload covered by: ' + clickable.go);
    expect(String(clickable.input).indexOf('embIn') !== -1, 'input covered by: ' + clickable.input);
  });

  await t('embed: local page loads in the frame; scene switch unloads it', async () => {
    // a local stand-in for the deck (docs.google.com is unreachable from CI)
    fs.writeFileSync(path.resolve(__dirname, 'tmp_embed_target.html'),
      '<!DOCTYPE html><title>Target</title><body><h1 id="mark">EMBED TARGET</h1>');
    await openAt('');
    await launch();
    await addW('addEmbedBtn');
    const target = 'file://' + path.resolve(__dirname, 'tmp_embed_target.html');
    await page.evaluate(u => {
      const inp = document.querySelector('.w-embed .embIn');
      inp.value = u; inp.dispatchEvent(new Event('blur'));
    }, 'https://example.com/x');                 // set config via the input path…
    await page.evaluate(u => {                   // …then point the frame at the fixture
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector('.w-embed .embFrame').src = u;
    }, target);
    await page.waitForTimeout(600);
    const loaded = page.frames().some(f => f.url() === target);
    expect(loaded, 'frame did not load the target');
    // Home must silence the deck; returning to the board restores it
    await page.keyboard.press('h');
    await page.waitForTimeout(300);
    expect(!page.frames().some(f => f.url() === target), 'Home left the deck loaded');
    await launch();
    await page.waitForTimeout(500);
    expect(page.frames().some(f => f.url() === target), 'deck not restored after Home');
    await page.selectOption('#sceneSel', 'Stations');
    await page.waitForTimeout(300);
    expect(!page.frames().some(f => f.url() === target), 'scene switch left the iframe alive');
    await page.selectOption('#sceneSel', 'Daily Board');
    await page.waitForTimeout(200);
  });

  await t('embed: focus pill appears when the deck has the keys; alarm takes them back', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await addW('addEmbedBtn');
    const target = 'file://' + path.resolve(__dirname, 'tmp_embed_target.html');
    await page.evaluate(u => {
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      const f = document.querySelector('.w-embed .embFrame');
      f.hidden = false; f.src = u;
      document.querySelector('.w-embed .embEmpty').hidden = true;
    }, target);
    await page.waitForTimeout(500);
    // put a timer on 2s FIRST (keys still ours)…
    await page.keyboard.press('s');              // make sure the TIMER is selected
    for (let i = 0; i < 4; i++){
      if (await page.locator('.w-timer.sel').count() === 1) break;
      await page.keyboard.press('s');
    }
    await page.keyboard.press('2');
    await page.keyboard.press('Enter');
    // …then hand the keyboard to the deck
    await page.frames().find(f => f.url() === target).click('#mark');
    await page.waitForTimeout(150);
    expect(!(await page.locator('.embKeys').isHidden()), 'focus pill never appeared');
    expect(await page.evaluate(() =>
      document.activeElement === document.querySelector('.w-embed .embFrame')),
      'frame did not take focus');
    await page.waitForTimeout(2300);             // timer expires while framed
    expect((await attr('#alarm', 'class')).includes('on'), 'no alarm');
    // the alarm must have reclaimed focus: Space dismisses WITHOUT clicking
    expect(await page.evaluate(() =>
      document.activeElement !== document.querySelector('.w-embed .embFrame')),
      'alarm did not reclaim focus from the iframe');
    await page.keyboard.press(' ');
    expect(!(await attr('#alarm', 'class')).includes('on'), 'Space did not dismiss');
    expect(await page.locator('.embKeys').isHidden(), 'pill lingers after reclaim');
    // lock hides the URL row for a clean student view
    await page.click('#lockBtn');
    expect(await page.locator('.w-embed .embRow').isHidden(), 'URL row visible while locked');
    await unlock();
  });

  await t('scene manager: new, duplicate, rename, two-tap delete', async () => {
    await openAt('');
    await launch();
    await page.click('#sceneBtn');
    expect(!(await page.locator('#sceneMenu').isHidden()), 'menu did not open');
    await page.fill('#sceneName', 'Warm-up');
    await page.click('#sceneNewBtn');
    expect(await page.inputValue('#sceneSel') === 'Warm-up', 'new scene not active');
    expect(await page.locator('#canvas .widget:visible').count() === 1, 'new scene not clock-only');
    await addW('addTimerBtn');                   // give it something to copy
    await page.click('#sceneBtn');
    await page.click('#sceneDupBtn');
    expect(await page.inputValue('#sceneSel') === 'Warm-up copy', 'dup name: ' +
      await page.inputValue('#sceneSel'));
    expect(await page.locator('#canvas .widget:visible').count() === 2, 'widgets not copied');
    await page.click('#sceneBtn');
    await page.fill('#sceneName', 'Test Day');
    await page.click('#sceneRenBtn');
    expect(await page.inputValue('#sceneSel') === 'Test Day', 'rename failed');
    expect(await page.evaluate(() => window.Deckhand.config.activeScene) === 'Test Day',
      'config activeScene stale');
    const before = await page.evaluate(() => window.Deckhand.config.scenes.length);
    await page.click('#sceneBtn');
    await page.click('#sceneDelBtn');            // first tap: arm
    expect((await page.locator('#sceneDelBtn').textContent()).trim() === 'Really delete?',
      'no confirm step');
    expect(await page.evaluate(() => window.Deckhand.config.scenes.length) === before,
      'deleted without confirming');
    await page.click('#sceneDelBtn');            // second tap: delete
    expect(await page.evaluate(() => window.Deckhand.config.scenes.length) === before - 1,
      'scene not deleted');
    expect(await page.inputValue('#sceneSel') !== 'Test Day', 'deleted scene still active');
    await page.click('#lockBtn');
    expect(await page.locator('#sceneBtn').isDisabled(), 'scene menu usable while locked');
    await unlock();
  });

  await t('unsaved-changes: dot appears on edits, leave-warning arms, download clears', async () => {
    await openAt('');
    await launch();
    expect(await page.evaluate(() => window.Deckhand.dirty) === false, 'dirty at boot');
    await addTimer();                            // v6.29: adding one IS an edit
    // any config change counts — move the timer
    const sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x - 150, sb.y + sb.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(await page.evaluate(() => window.Deckhand.dirty) === true, 'move not dirty');
    await page.waitForTimeout(2700);             // paint interval
    expect(((await attr('#setBtn', 'class')) || '').includes('dirty'), 'no dot on Settings');
    expect(await page.evaluate(() => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    }), 'leave-warning not armed');
    await page.click('#setBtn');                 // download = saved
    const [ dl ] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#dlBtn')
    ]);
    await dl.delete();
    await page.click('#closeBtn');
    expect(await page.evaluate(() => window.Deckhand.dirty) === false, 'download did not clear');
    await page.waitForTimeout(2700);
    expect(!((await attr('#setBtn', 'class')) || '').includes('dirty'), 'dot lingers');
  });

  await t('per-period decks: follows the bells, manual override, per-period URLs', async () => {
    await openAt('#t=2026-09-08T10:30');         // Teal Tue: 2nd period
    await launch();
    await addW('addEmbedBtn');
    const A = 'https://phet.colorado.edu/deck-for-2nd';
    const B = 'https://phet.colorado.edu/deck-for-3rd';
    await page.evaluate(u => {
      const inp = document.querySelector('.w-embed .embIn');
      inp.value = u; inp.dispatchEvent(new Event('blur'));
    }, A);
    await page.click('.w-embed .wEdit');         // row tucked away after the load
    await page.check('.w-embed .embPPck');       // per-period ON seeds 2nd with A
    const s1 = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      const wc = ws[ws.length - 1];
      return { pp: wc.perPeriod, d2: wc.decks['2nd'],
               src: document.querySelector('.w-embed .embFrame').getAttribute('src'),
               auto: document.querySelector('.w-embed .embPer option').textContent };
    });
    expect(s1.pp === true && s1.d2 === A, 'seed failed: ' + JSON.stringify(s1));
    expect(s1.src === A, 'auto not showing 2nd deck: ' + s1.src);
    expect(s1.auto === 'Auto — 2nd', 'auto label: ' + s1.auto);
    await page.selectOption('.w-embed .embPer', '3rd');
    expect((await page.locator('.w-embed .embEmpty b').textContent()) === 'No deck for 3rd yet.',
      'empty state wrong: ' + await page.locator('.w-embed .embEmpty').textContent());
    await page.evaluate(u => {
      const inp = document.querySelector('.w-embed .embIn');
      inp.value = u; inp.dispatchEvent(new Event('blur'));
    }, B);
    const s2 = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return { d3: ws[ws.length - 1].decks['3rd'],
               src: document.querySelector('.w-embed .embFrame').getAttribute('src') };
    });
    expect(s2.d3 === B && s2.src === B, '3rd deck: ' + JSON.stringify(s2));
    await page.click('.w-embed .wEdit');               // row hid again after B loaded
    await page.selectOption('.w-embed .embPer', '');   // back to Auto -> 2nd
    expect(await page.evaluate(() =>
      document.querySelector('.w-embed .embFrame').getAttribute('src')) === A,
      'auto did not return to the 2nd deck');
    // both decks and the mode survive in config for download
    const wc = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1];
    });
    expect(wc.perPeriod && wc.decks['2nd'] === A && wc.decks['3rd'] === B,
      'config: ' + JSON.stringify(wc.decks));
    // the reload button must reload the deck that's SHOWING, not the stale single URL
    if (await page.locator('.w-embed .embRow').isHidden()) await page.click('.w-embed .wEdit');
    await page.click('.w-embed .embGo');
    await page.waitForTimeout(150);
    expect(await page.evaluate(() =>
      document.querySelector('.w-embed .embFrame').getAttribute('src')) === A,
      'reload showed the wrong deck');
  });

  await t('scene delete: switching scenes disarms an armed "Really delete?"', async () => {
    await openAt('');
    await launch();
    await page.click('#sceneBtn');
    await page.fill('#sceneName', 'KeepMe');
    await page.click('#sceneNewBtn');            // 3 scenes now, KeepMe active
    await page.click('#sceneBtn');
    await page.click('#sceneDelBtn');            // armed on KeepMe
    await page.selectOption('#sceneSel', 'Daily Board');
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => ({
      txt: document.getElementById('sceneDelBtn').textContent.trim(),
      armed: document.getElementById('sceneDelBtn').classList.contains('confirm'),
      n: window.Deckhand.config.scenes.length
    }));
    expect(!state.armed && state.txt === 'Delete current',
      'confirm survived a scene switch: ' + JSON.stringify(state));
    expect(state.n === 3, 'a scene was deleted: ' + state.n);
    // closing via the ⋯ button also disarms (menu is still open after the switch)
    await page.click('#sceneDelBtn');            // arm
    await page.click('#sceneBtn');               // close via toggle
    await page.click('#sceneBtn');               // reopen
    expect((await page.locator('#sceneDelBtn').textContent()).trim() === 'Delete current',
      'confirm survived the toggle close');
    await page.keyboard.press('Escape');
    // cleanup: delete KeepMe and its sibling copy if present
    await page.evaluate(() => {
      const c = window.Deckhand.config;
      c.scenes = c.scenes.filter(s => s.name === 'Daily Board' || s.name === 'Stations');
      c.activeScene = 'Daily Board';
    });
    await page.selectOption('#sceneSel', 'Daily Board');
  });

  await t('focus mode: ⛶ fills the board, Esc restores, config untouched, works locked', async () => {
    await openAt('');
    await launch();
    await addTimer();
    // v6.29: addTimer already spent the dirty flag — compare the CONFIG
    const cfgSnapFocus = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config));
    const before = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      return JSON.stringify(w);
    });
    await page.click('.w-timer .wFocus');
    const m = await page.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const w = document.querySelector('.w-timer').getBoundingClientRect();
      return { dw: Math.abs(w.width - c.width), dh: Math.abs(w.height - c.height),
               dx: Math.abs(w.left - c.left), dy: Math.abs(w.top - c.top),
               pressed: document.querySelector('.w-timer .wFocus').getAttribute('aria-pressed') };
    });
    expect(m.dw < 2 && m.dh < 2 && m.dx < 2 && m.dy < 2, 'not full-board: ' + JSON.stringify(m));
    expect(m.pressed === 'true', 'button state');
    // v6.14 stage mode: the focused widget's strip (the drag handle)
    // folds away entirely — dragging is inert by construction
    expect(await page.locator('.w-timer .strip').isHidden(),
      'focused strip visible in stage mode');
    const wb = await page.locator('.w-timer').boundingBox();
    await page.mouse.move(wb.x + wb.width / 2, wb.y + 30);
    await page.mouse.down();
    await page.mouse.move(wb.x + 300, wb.y + 200, { steps: 5 });
    await page.mouse.up();
    const still = await page.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const w = document.querySelector('.w-timer').getBoundingClientRect();
      return Math.abs(w.left - c.left) < 2 && Math.abs(w.top - c.top) < 2;
    });
    expect(still, 'focused widget moved');
    await page.keyboard.press('Escape');         // collapse
    const after = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      return JSON.stringify(w);
    });
    expect(before === after, 'focus dirtied the config');
    expect(await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config)) === cfgSnapFocus,
      'focus marked unsaved');
    const back = await page.evaluate(() => {
      const w = document.querySelector('.w-timer').getBoundingClientRect();
      const c = document.getElementById('canvas').getBoundingClientRect();
      return w.width < c.width * 0.8;
    });
    expect(back, 'Esc did not restore the size');
    // focus works while locked (view action), and ⛶ stays visible
    await page.click('#lockBtn');
    expect(!(await page.locator('.w-timer .wFocus').isHidden()), '⛶ hidden while locked');
    await page.click('.w-timer .wFocus');
    const lockedFull = await page.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const w = document.querySelector('.w-timer').getBoundingClientRect();
      return Math.abs(w.width - c.width) < 2;
    });
    expect(lockedFull, 'focus dead while locked');
    await page.click('#unfocusBtn');             // v6.14: the strip folds in
    await unlock();                              // stage mode — Exit collapses
    // the clock focuses too, and only one widget can ever be full
    await page.click('#clockWidget .wFocus');
    const one = await page.evaluate(() =>
      document.querySelectorAll('.widget.wFull').length);
    expect(one === 1, 'focused count: ' + one);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() =>
      document.querySelectorAll('.widget.wFull').length) === 0, 'Esc left focus');
  });

  await t('pin: ⇈ floats a widget above a focused deck, drags there, unpin sinks it', async () => {
    fs.writeFileSync(path.resolve(__dirname, 'tmp_pin_deck.html'),
      '<!DOCTYPE html><title>PinDeck</title><body><h1>DECK</h1>');
    await openAt('');
    await launch();
    await addTimer();
    await addW('addEmbedBtn');
    const target = 'file://' + path.resolve(__dirname, 'tmp_pin_deck.html');
    await page.evaluate(u => {
      const inp = document.querySelector('.w-embed .embIn');
      inp.value = u; inp.dispatchEvent(new Event('blur'));
    }, 'https://example.com/x');                 // config via the input path…
    await page.evaluate(u => {                   // …then aim the frame at the fixture
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector('.w-embed .embFrame').src = u;
    }, target);
    await page.waitForTimeout(400);
    // park the timer clear of the (top-stacked) embed, with room to drag
    await page.evaluate(() => {
      const en = document.querySelector('.w-timer')._entry;
      en.cfg.x = 64; en.cfg.y = 8; en.cfg.w = 24; en.cfg.h = 40;
      en.el.style.left = '64%'; en.el.style.top = '8%';
      en.el.style.width = '24%'; en.el.style.height = '40%';
    });
    await page.click('.w-timer .wPin');
    expect(await attr('.w-timer .wPin', 'aria-pressed') === 'true', 'pin state');
    expect(await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer').pin
    ) === true, 'pin not in config');
    // fill the board with the deck — the pinned timer must stay on top of it
    await page.click('.w-embed .wFocus');
    const over = await page.evaluate(() => {
      const b = document.querySelector('.w-timer').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !!el.closest('.w-timer') : false;
    });
    expect(over, 'pinned timer buried under the focused deck');
    // and it must actually drag across the deck
    const before = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      return { x: w.x, y: w.y };
    });
    const sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 30, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + 30 - 192, sb.y + sb.height / 2 + 144, { steps: 6 });
    await page.mouse.up();
    const after = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      return { x: w.x, y: w.y };
    });
    expect(after.x < before.x && after.y > before.y,
      'pinned drag inert: ' + JSON.stringify({ before, after }));
    // unpin: the timer sinks back under the focused deck
    await page.click('.w-timer .wPin');
    const under = await page.evaluate(() => {
      const b = document.querySelector('.w-timer').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !el.closest('.w-timer') : true;
    });
    expect(under, 'unpinned timer still floats over the deck');
    // v6.22: the staged deck OWNS the keyboard now (clicker fix), so
    // Escape dies inside the iframe by design — exit via the pill
    await page.click('#unfocusBtn');
    // ⇈ edits saved config, so it hides while locked (⛶ stays)
    await page.click('#lockBtn');
    expect(await page.locator('.w-timer .wPin').isHidden(), '⇈ visible while locked');
    expect(!(await page.locator('.w-timer .wFocus').isHidden()), '⛶ gone while locked');
    await unlock();
  });

  await t('v6.16: + Add while staged floats the widget over the deck — stage stays', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await page.click('.w-timer .wFocus');        // timer fills the board
    await page.click('#dockTog');                // unfold the staged dock
    await addW('addWatchBtn');
    expect(await page.evaluate(() =>
      document.querySelectorAll('.widget.wFull').length) === 1,
      '+ Add collapsed the stage');              // v6.16: focus RETAINED
    const visible = await page.evaluate(() => {
      const b = document.querySelector('.w-stopwatch').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !!el.closest('.w-stopwatch') : false;
    });
    expect(visible, 'new widget born buried');   // the v6.9 bug stays dead
    // the sketch pad — "demonstrate next to the slides" — gets a tall panel
    await addW('addDrawBtn');
    const sk = await page.evaluate(() => {
      const b = document.querySelector('.w-draw').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + 40);
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'draw');
      return { over: el ? !!el.closest('.w-draw') : false,
               tall: cw.h > 70, staged: document.querySelectorAll('.widget.wFull').length };
    });
    expect(sk.over && sk.tall && sk.staged === 1,
      'sketch not a floating panel: ' + JSON.stringify(sk));
    await page.keyboard.press('Escape');         // exit: both stay in the scene
    await page.click('.w-draw .wClose');
    await page.click('.w-stopwatch .wClose');
  });

  await t('v6.16: three staged adds land on DISTINCT spots (no coincident pile in config)', async () => {
    await openAt('');
    await launch();
    await page.click('#clockWidget .wFocus');
    await page.click('#dockTog');
    await addW('addWatchBtn');
    await addW('addTallyBtn');
    await addW('addScoreBtn');                   // all three share the 27×46 default
    const spots = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets
        .filter(w => ['stopwatch', 'tally', 'score'].indexOf(w.type) !== -1)
        .map(w => w.x + ',' + w.y));
    expect(spots.length === 3 && new Set(spots).size === 3,
      'staged adds coincided: ' + JSON.stringify(spots));
    await page.keyboard.press('Escape');
    await page.click('.w-score .wClose');
    await page.click('.w-tally .wClose');
    await page.click('.w-stopwatch .wClose');
  });

  await t('v6.16: floats EXPIRE on stage exit — a staged add never occludes the next lesson', async () => {
    await openAt('');
    await launch();
    await page.click('#clockWidget .wFocus');
    await page.click('#dockTog');
    await addW('addWatchBtn');                   // floats over this stage…
    const during = await page.evaluate(() => {
      const b = document.querySelector('.w-stopwatch').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !!el.closest('.w-stopwatch') : false;
    });
    expect(during, 'staged add not floating during its own stage');
    await page.keyboard.press('Escape');         // …but dies with it
    await page.click('#clockWidget .wFocus');    // the NEXT lesson
    const after = await page.evaluate(() => {
      const w = document.querySelector('.w-stopwatch');
      const b = w.getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return { over: el ? !!el.closest('.w-stopwatch') : false,
               float: w._entry.float,
               pin: w._entry.cfg.pin };
    });
    expect(!after.over && !after.float && !after.pin,
      'float outlived its stage: ' + JSON.stringify(after));
    await page.keyboard.press('Escape');
    await page.click('.w-stopwatch .wClose');
  });

  await t('v6.16: keyboard-flow timer (add → type → Enter, no touch) gets the full ghost grace', async () => {
    await openAt('');
    await launch();
    await page.evaluate(() => window.Deckhand.ghostFuseMs(1500));
    // v6.29: the default board has no timer — the staged add IS the only one
    await page.click('#clockWidget .wFocus');
    await page.click('#dockTog');
    await addW('addTimerBtn');                   // selected, floating, NEVER pointer-touched
    await page.evaluate(() => {                  // Enter must reach the entry, not a button
      if (document.activeElement) document.activeElement.blur();
    });
    await page.keyboard.press('2');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');          // 20s, running — old bug: ghost in ~0.7s
    await page.waitForTimeout(800);              // one ghostSync tick, still inside the fuse
    expect(await page.evaluate(() =>
      !document.querySelector('.w-timer').classList.contains('wGhost')),
      'keyboard-started timer ghosted inside the grace window');
    await page.waitForTimeout(2500);             // …and once truly idle, it DOES ghost
    expect(await page.evaluate(() =>
      document.querySelector('.w-timer').classList.contains('wGhost')),
      'keyboard-started timer never ghosted at all');
    await page.keyboard.press('Escape');
    await page.keyboard.press('r');              // stop it for the tests downstream
    await page.click('.w-timer .wClose');
  });

  await t('noise game: streak climbs when quiet, strike after sustained noise, record sticks', async () => {
    const b3 = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const p3 = await b3.newPage({ viewport: { width: 1920, height: 1080 } });
    await p3.goto(url + '#t=2026-09-08T10:30');   // 2nd period owns this round
    await p3.waitForTimeout(350);
    await p3.click('#launchBtn');
    await p3.click('#addBtn');
    await p3.click('#addMeterBtn');
    // a controllable oscillator plays the part of the classroom
    await p3.evaluate(() => {
      const ac = new AudioContext();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      gain.gain.value = 0.0004;                   // library-quiet
      const dest = ac.createMediaStreamDestination();
      osc.connect(gain); gain.connect(dest);
      osc.start();
      window.__gain = gain;
      navigator.mediaDevices.getUserMedia = () => Promise.resolve(dest.stream);
    });
    await p3.click('.w-meter .mtBtn');
    await p3.waitForTimeout(1600);
    const quiet = await p3.evaluate(() => ({
      streak: document.querySelector('.mtStreak').textContent,
      lab: document.querySelector('.mtStreakLab').textContent,
      strikes: document.querySelector('.mtStrikes').textContent.trim()
    }));
    expect(quiet.streak !== '0:00', 'streak never started: ' + JSON.stringify(quiet));
    expect(quiet.lab === 'Quiet streak — 2nd', 'period label: ' + quiet.lab);
    expect(quiet.strikes === '', 'phantom strike: ' + quiet.strikes);
    // the class gets loud: 2s of grace, then a strike and a dead streak
    await p3.evaluate(() => { window.__gain.gain.value = 0.5; });
    await p3.waitForTimeout(3200);
    const loud = await p3.evaluate(() => ({
      streak: document.querySelector('.mtStreak').textContent,
      strikes: document.querySelector('.mtStrikes').textContent.trim(),
      tooLoud: document.querySelector('.w-meter').classList.contains('tooLoud')
    }));
    expect(loud.strikes === '✖', 'strike count: "' + loud.strikes + '"');
    expect(loud.streak === '0:00', 'streak survived the strike: ' + loud.streak);
    expect(loud.tooLoud, 'no TOO LOUD state');
    // quiet returns: the streak restarts and the record was banked
    await p3.evaluate(() => { window.__gain.gain.value = 0.0004; });
    await p3.waitForTimeout(2000);
    const again = await p3.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return {
        streak: document.querySelector('.mtStreak').textContent,
        rec: ws[ws.length - 1].records,
        recLine: document.querySelector('.mtRecord').textContent
      };
    });
    expect(again.streak !== '0:00', 'streak did not restart: ' + again.streak);
    expect((again.rec['2nd'] || 0) >= 1, 'record not banked: ' + JSON.stringify(again.rec));
    expect(again.recLine.indexOf('held by 2nd') !== -1, 'record line: ' + again.recLine);
    // R starts a fresh round: strikes gone, record stays
    await p3.keyboard.press('r');
    const reset = await p3.evaluate(() => ({
      strikes: document.querySelector('.mtStrikes').textContent.trim(),
      recLine: document.querySelector('.mtRecord').textContent
    }));
    expect(reset.strikes === '', 'R did not clear strikes');
    expect(reset.recLine.indexOf('held by 2nd') !== -1, 'R erased the record');
    await b3.close();
  });

  await t('canvas: widget cap at 12 — dock disables, config never exceeds it', async () => {
    await openAt('');
    await launch();
    for (let i = 0; i < 14; i++){
      if (await page.locator('#addTimerBtn').isDisabled()) break;
      await addW('addTimerBtn');
    }
    const n = await page.evaluate(() => window.Deckhand.config.scenes[0].widgets.length);
    expect(n === 12, 'cap breached: ' + n);
    expect(await page.locator('#addTimerBtn').isDisabled(), 'add still enabled at cap');
    expect(await page.locator('#addWatchBtn').isDisabled(), 'watch add enabled at cap');
  });

  await t('canvas: close-and-re-add never duplicates auto labels', async () => {
    await openAt('');
    await launch();
    await addW('addTimerBtn');          // "Timer 2"
    await page.locator('.w-timer').first().locator('.wClose').click();  // drop "Timer"
    await addW('addTimerBtn');          // must reuse "Timer", not mint "Timer 2"
    const labels = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.filter(w => w.type === 'timer').map(w => w.label));
    expect(new Set(labels).size === labels.length, 'dup labels: ' + labels.join('|'));
    expect(labels.indexOf('Timer') !== -1, 'freed name not reused: ' + labels.join('|'));
  });

  await t('canvas: narrow stacked layout never edits stored coordinates', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await page.setViewportSize({ width: 700, height: 900 });
    await page.waitForTimeout(200);
    const before = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    const sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + 40, sb.y + 160, { steps: 5 });
    await page.mouse.up();
    const after = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config.scenes[0].widgets));
    await page.setViewportSize({ width: 1920, height: 1080 });
    expect(before === after, 'stacked drag wrote coords');
  });

  /* ---------- migrations (inline fixtures) + hostility + round trip ---------- */

  const inject = (src, cfgText) => src.replace(
    /(<script id="deckhand-config"[^>]*>)[\s\S]*?(<\/script>)/,
    (_, a, b) => a + '\n' + cfgText + '\n' + b
  );
  const v5src = fs.readFileSync(path.resolve(__dirname, 'Deckhand_v6.html'), 'utf8');
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
    await pg.emulateMedia({ reducedMotion: 'reduce' });
    await pg.goto('file://' + p);
    await pg.waitForTimeout(350);
    return pg;
  };

  await t('spawn: three adds land in three different places, never a pile', async () => {
    await openAt('');
    await launch();
    await addW('addWorkBtn');
    await addW('addDiceBtn');
    await addW('addTallyBtn');
    const spots = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws.slice(-3).map(w => w.x + ',' + w.y);
    });
    expect(new Set(spots).size === 3, 'spawn pile: ' + spots.join(' | '));
    // fill toward the cap, then a big embed: fallback must stay ON-CANVAS
    for (const id of ['addWatchBtn','addQrBtn','addScoreBtn','addTextBtn','addEventBtn']){
      await addW(id);
    }
    await addW('addEmbedBtn');
    const all = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return { ok: ws.every(w => w.x + w.w <= 100.01 && w.y + w.h <= 100.01),
               spots: ws.map(w => w.x + ',' + w.y) };
    });
    expect(all.ok, 'fallback spawned off-canvas');
    expect(new Set(all.spots).size === all.spots.length,
      'clamped adds coincide: ' + all.spots.join(' | '));
  });

  await t('alarm: 45s un-dismissed folds to a corner badge; tap clears; keys return', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await page.evaluate(() => window.Deckhand.alarmCalmMs(900));
    await page.mouse.click(960, 999);
    await page.keyboard.press('2');              // 0:02 timer
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2600);
    expect((await attr('#alarm', 'class')).includes('on'), 'no alarm');
    await page.waitForTimeout(1100);             // calm threshold passes
    const calm = await page.evaluate(() => {
      const a = document.getElementById('alarm');
      const r = a.getBoundingClientRect();
      return { cls: a.className, small: r.width < innerWidth / 2 };
    });
    expect(calm.cls.includes('calm') && calm.small, 'no badge: ' + JSON.stringify(calm));
    // keys belong to the board again (calm alarm no longer swallows)
    await page.keyboard.press('Escape');         // would dismiss a FULL alarm
    expect((await attr('#alarm', 'class')).includes('on'), 'key killed the badge');
    await page.click('#alarm');                  // tap clears it
    expect(!(await attr('#alarm', 'class')).includes('on'), 'tap did not clear');
    expect(await text('#startBtn') === 'Start', 'timer not reset after badge dismiss');
  });

  await t('timer: "Until bell" preset arms to the period remainder; dead when no bells', async () => {
    await openAt('#t=2026-09-08T10:30');         // mid-2nd-period
    await launch();
    await addTimer();
    expect(!(await page.locator('.w-timer .chipBell').isDisabled()), 'chip dead in-period');
    await page.click('.w-timer .chipBell');
    await page.waitForTimeout(300);
    expect(await text('#startBtn') === 'Pause', 'until-bell did not start');
    const m = await page.evaluate(() => {
      const st = window.Deckhand.bellStatusAt('2026-09-08T10:30');
      const d = document.getElementById('timer').textContent.trim();
      const p = d.split(':');
      return { shown: (+p[0]) * 60 + (+p[1]), bell: Math.round(st.remainMs / 1000) };
    });
    expect(Math.abs(m.shown - m.bell) < 90, 'wrong remainder: ' + JSON.stringify(m));
    await page.keyboard.press(' ');              // pause — leave no ringing timer
    // Sunday: no bells, chip disabled
    await openAt('#t=2026-09-06T10:30');
    await launch();
    await addTimer();                            // v6.29: no default timer
    expect(await page.locator('.w-timer .chipBell').isDisabled(), 'chip live on a Sunday');
  });

  await t('absent today: picker skips them, groups leave them out, session-only', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    await page.click('#setBtn');
    await page.evaluate(() => { document.getElementById('secRosters').open = true; });
    await page.fill('#rosterGrid textarea[data-period="2nd"]', 'A,B,C,D,E,F,G');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    await addW('addPickerBtn');
    await page.click('.w-picker .abBtn');        // open the absent panel
    expect(await page.locator('.w-picker .abName').count() === 7, 'roster not listed');
    // mark everyone but D absent — the pick MUST be D
    for (const kid of ['A','B','C','E','F','G']){
      await page.locator('.w-picker .abName', { hasText: kid }).click();
    }
    expect((await text('.w-picker .pkLeft')).includes('6 out'), 'absent count missing: '
      + await text('.w-picker .pkLeft'));
    await page.click('.w-picker .pkGo');
    await page.waitForTimeout(1100);
    expect(await text('.w-picker .pkName') === 'D', 'picked an absent kid: '
      + await text('.w-picker .pkName'));
    // bring E and F back (groups need at least two kids)
    await page.locator('.w-picker .abName', { hasText: 'E' }).click();
    await page.locator('.w-picker .abName', { hasText: 'F' }).click();
    // groups: same marks apply (shared session store)
    await addW('addGroupsBtn');
    await page.click('.w-groups .gpGo');
    const kids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.w-groups .gpCard'))
        .map(c => c.textContent.replace(/GROUP \d+/, '')).join(','));
    const set = kids.split(',').map(s => s.trim()).filter(Boolean).sort().join('');
    expect(set === 'DEF', 'absent kids grouped: ' + kids);
    // absence never touches config (session-only by design)
    expect((JSON.stringify(await page.evaluate(() => window.Deckhand.config))
      .match(/absent/gi) || []).length === 0, 'absence leaked into config');
  });

  await t('groups: "3 groups" mode splits 7 kids into exactly 3 groups', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    await page.click('#setBtn');
    await page.evaluate(() => { document.getElementById('secRosters').open = true; });
    await page.fill('#rosterGrid textarea[data-period="2nd"]', 'A,B,C,D,E,F,G');
    await page.click('#applyBtn');
    await page.click('#closeBtn');
    await addW('addGroupsBtn');
    await page.locator('.w-groups .gpSize .chip', { hasText: '3 groups' }).click();
    await page.click('.w-groups .gpGo');
    const sizes = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.w-groups .gpCard'))
        .map(c => c.textContent.replace(/GROUP \d+/, '').split(',').length));
    expect(sizes.length === 3 && sizes.reduce((a, b) => a + b, 0) === 7,
      'count mode: ' + sizes.join(','));
    const wcfg = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1];
    });
    expect(wcfg.by === 'count' && wcfg.count === 3, 'mode not persisted');
  });

  await t('agenda: per-period pages follow the select; checks stay per page', async () => {
    await openAt('#t=2026-09-08T10:30');         // 2nd period
    await launch();
    await addW('addAgendaBtn');
    await page.click('.w-agenda .wEdit');
    await page.fill('.w-agenda .agArea', 'Second period plan');
    await page.check('.w-agenda .agPPck');       // per-period ON (draft retargets)
    await page.click('.w-agenda .agBtn');
    expect(await text('.w-agenda .agWho') === '2nd', 'who: ' + await text('.w-agenda .agWho'));
    // write a different page for 6th via the override select
    await page.click('.w-agenda .wEdit');
    await page.selectOption('.w-agenda .agPer', '6th');
    await page.fill('.w-agenda .agArea', 'Sixth period plan\nExit ticket');
    await page.click('.w-agenda .agBtn');
    expect(await page.locator('.w-agenda .agItem').count() === 2, '6th page items');
    expect(await text('.w-agenda .agWho') === '6th', 'override who');
    await page.locator('.w-agenda .agItem').first().click();   // check one on 6th
    // back to Auto: 2nd's page returns, unchecked
    await page.click('.w-agenda .wEdit');
    await page.selectOption('.w-agenda .agPer', '');
    await page.click('.w-agenda .agBtn');
    expect(await text('.w-agenda .agWho') === '2nd', 'auto did not return');
    expect(await page.locator('.w-agenda .agItem').count() === 1, '2nd page items');
    const pages = await page.evaluate(() => {
      const ws = window.Deckhand.config.scenes[0].widgets;
      return ws[ws.length - 1].pages;
    });
    expect(pages['2nd'].length === 1 && pages['6th'].length === 2 &&
           pages['6th'][0].done === true && pages['2nd'][0].done === false,
      'pages: ' + JSON.stringify(pages));
  });

  await t('focus exit pill: always reachable, even under a pinned widget', async () => {
    await openAt('');
    await launch();
    await addTimer();
    expect(await page.locator('#unfocusBtn').isHidden(), 'pill visible with no focus');
    // pin the timer over the pill's corner, then focus the clock
    await page.evaluate(() => {
      const en = document.querySelector('.w-timer')._entry;
      en.cfg.x = 60; en.cfg.y = 0; en.cfg.w = 40; en.cfg.h = 40; en.cfg.pin = true;
      en.el.style.left = '60%'; en.el.style.top = '0%';
      en.el.style.width = '40%'; en.el.style.height = '40%';
    });
    await page.click('.w-timer .wPin');          // unpin…
    await page.click('.w-timer .wPin');          // …repin (syncs aria + z)
    await page.click('#clockWidget .wFocus');
    expect(!(await page.locator('#unfocusBtn').isHidden()), 'pill missing in focus');
    const onTop = await page.evaluate(() => {
      const b = document.getElementById('unfocusBtn').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? el.id === 'unfocusBtn' : false;
    });
    expect(onTop, 'pinned widget buried the exit pill');
    await page.click('#unfocusBtn');
    expect(await page.evaluate(() =>
      document.querySelectorAll('.widget.wFull').length) === 0, 'pill did not unfocus');
    expect(await page.locator('#unfocusBtn').isHidden(), 'pill lingers after exit');
    await page.evaluate(() => {                  // unpin for later tests
      const en = document.querySelector('.w-timer')._entry;
      en.cfg.pin = false;
    });
  });

  await t('embed: a rejected link says WHY instead of silently reverting', async () => {
    await openAt('');
    await launch();
    await addW('addEmbedBtn');
    await page.fill('.w-embed .embIn', 'file:///C:/Users/croix/deck.pptx');
    await page.evaluate(() => {
      const inp = document.querySelector('.w-embed .embIn');
      inp.dispatchEvent(new Event('blur'));
    });
    expect(!(await page.locator('.w-embed .embNote').isHidden()), 'no rejection note');
    expect((await text('.w-embed .embNote')).includes('Publish to web'), 'note unhelpful');
  });

  await t('settings: warning chime checkbox round-trips', async () => {
    await openAt('');
    await launch();
    expect(await page.evaluate(() => window.Deckhand.config.bell.warnChime) === false,
      'chime default on');
    await page.click('#setBtn');
    await page.check('#sWarnChime');
    await page.click('#applyBtn');
    expect(await page.evaluate(() => window.Deckhand.config.bell.warnChime) === true,
      'chime not applied');
    await page.click('#closeBtn');
  });

  await t('v6.13: 44px targets, grouped menu, navy alarm ink, non-coral lock, anchored grid', async () => {
    await openAt('');
    await launch();
    await addTimer();
    const m = await page.evaluate(() => {
      const b = document.querySelector('.w-timer .wClose').getBoundingClientRect();
      const f = document.querySelector('.w-timer .wFocus').getBoundingClientRect();
      const p = document.querySelector('.w-timer .wPin').getBoundingClientRect();
      return { cw: b.width, ch: b.height, fw: f.width, fh: f.height, pw: p.width, ph: p.height };
    });
    expect(m.cw >= 44 && m.ch >= 44 && m.fw >= 44 && m.fh >= 44 && m.pw >= 44 && m.ph >= 44,
      'strip targets: ' + JSON.stringify(m));
    await page.click('#addBtn');
    const labels = await page.locator('#addMenu .menuLabel').allTextContents();
    expect(labels.join('|') === 'Time|Students|Classroom|Board',
      'menu groups: ' + labels.join('|'));
    await page.keyboard.press('Escape');
    const ink = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#alarm h1')).color);
    expect(ink === 'rgb(23, 50, 77)', 'alarm ink not navy: ' + ink);
    await page.click('#lockBtn');
    const lockBg = await page.evaluate(() =>
      getComputedStyle(document.getElementById('lockBtn')).backgroundColor);
    expect(lockBg !== 'rgb(255, 127, 106)', 'lock still coral: ' + lockBg);
    await unlock();
    // the painted grid follows the canvas origin, so x:0 widgets sit ON lines
    const grid = await page.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      return { bp: getComputedStyle(document.body).backgroundPosition,
               cl: c.left % 48, ct: c.top % 48 };
    });
    const bp = grid.bp.split(' ').map(parseFloat);
    expect(Math.abs(bp[0] - grid.cl) < 1 && Math.abs(bp[1] - grid.ct) < 1,
      'grid not anchored: ' + JSON.stringify(grid));
    // drawn icons replaced the fallback-font glyphs (v6.28: +⤡ grip = 4)
    expect(await page.evaluate(() =>
      document.querySelectorAll('.w-timer .strip svg.wIcon').length) === 4,
      'strip icons missing');
  });

  await t('v6.13 motion: focus glides for motion-lovers; boat rides the waves', async () => {
    const pg = await ctx.newPage(); watchErrors(pg);
    await pg.emulateMedia({ reducedMotion: 'no-preference' });
    await pg.goto(url);
    await pg.waitForTimeout(350);
    await pg.click('#launchBtn');
    await pg.waitForTimeout(150);
    await pg.click('.w-settle .wFocus');         // v6.29: default = settle
    await pg.waitForTimeout(60);                 // mid-flight
    const mid = await pg.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const el = document.querySelector('.w-settle');
      return { gliding: el.classList.contains('gliding'),
               midflight: el.getBoundingClientRect().width < c.width - 8 };
    });
    expect(mid.gliding, 'no gliding class during focus');
    expect(mid.midflight, 'focus teleported despite motion preference');
    await pg.waitForTimeout(400);
    expect(await pg.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const w = document.querySelector('.w-settle').getBoundingClientRect();
      return Math.abs(w.width - c.width) < 2;
    }), 'glide never arrived');
    expect(await pg.evaluate(() => {
      const b = document.getElementById('boat');
      return !!b && getComputedStyle(b).animationName.includes('boatDrift');
    }), 'no boat on the waves');
    await pg.close();
  });

  await t('v6.13 phone: menu pinned inside a 390px viewport, keyboard hints gone', async () => {
    const pg = await ctx.newPage(); watchErrors(pg);
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.goto(url);
    await pg.waitForTimeout(350);
    await pg.click('#launchBtn');
    await pg.waitForTimeout(150);
    expect(await pg.locator('#fsBtn').isHidden(), 'Fullscreen button shown on a phone');
    expect(await pg.evaluate(() =>
      getComputedStyle(document.querySelector('#homeBtn .kbd')).display) === 'none',
      'keyboard hint visible on a phone');
    await pg.click('#addBtn');
    const box = await pg.evaluate(() => {
      const r = document.getElementById('addMenu').getBoundingClientRect();
      return { right: r.right, left: r.left };
    });
    expect(box.right <= 391 && box.left >= -1, 'menu overflows: ' + JSON.stringify(box));
    await pg.close();
  });

  await t('v6.13 fixes: bell warn legible, tally rename beats the pop, no glide mid-drag', async () => {
    // bell widget in its warn window: the small line must not be coral-on-coral
    await openAt('#t=2026-09-14T11:07');         // ~3 min before the 11:10 bell
    await launch();
    await addTimer();
    await addW('addBellBtn');
    await page.waitForTimeout(600);
    const bell = await page.evaluate(() => {
      const w = document.querySelector('.w-bell .visWrap');
      const s = document.querySelector('.w-bell .bellSmall');
      return { low: w.classList.contains('low'),
               ink: getComputedStyle(s).color,
               bg: getComputedStyle(s.closest('.visDigits')).backgroundColor };
    });
    expect(bell.low, 'bell not in warn (fixture time drifted?)');
    expect(bell.ink !== bell.bg, 'warn label invisible: ' + JSON.stringify(bell));
    // tally: rename must open DURING the +1 pop, numeral at full size
    const pg = await ctx.newPage(); watchErrors(pg);
    await pg.emulateMedia({ reducedMotion: 'no-preference' });
    await pg.goto(url);
    await pg.waitForTimeout(350);
    await pg.click('#launchBtn'); await pg.waitForTimeout(150);
    await pg.click('#addBtn'); await pg.click('#addTallyBtn');
    await pg.evaluate(() => {
      const en = document.querySelector('.w-tally')._entry;
      en.cfg.x = 2; en.cfg.y = 2; en.cfg.w = 55; en.cfg.h = 90;
      en.el.style.left = '2%'; en.el.style.top = '2%';
      en.el.style.width = '55%'; en.el.style.height = '90%';
    });
    await pg.locator('.w-tally .scB:not(.minus)').first().click();
    await pg.locator('.w-tally .scName').first().click();   // mid-pop
    expect(await pg.locator('.w-tally .scNameInput').count() === 1,
      'pop swallowed the rename tap');
    await pg.keyboard.press('Escape');
    // a grab mid-settle must drag 1:1 (no lingering .gliding transition)
    // v6.29: this page has no timer — the tally we just built does the job
    const sb = await pg.locator('.w-tally .strip').boundingBox();
    await pg.mouse.move(sb.x + 40, sb.y + sb.height / 2);
    await pg.mouse.down();
    await pg.mouse.move(sb.x + 180, sb.y + 60, { steps: 3 });
    await pg.mouse.up();                          // settle glide starts
    await pg.waitForTimeout(60);
    const hb = await pg.locator('.w-tally .wHandle.hSE').boundingBox();
    await pg.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await pg.mouse.down();
    await pg.mouse.move(hb.x - 150, hb.y - 100, { steps: 4 });
    const midDrag = await pg.evaluate(() => {
      const el = document.querySelector('.w-tally');
      return { gliding: el.classList.contains('gliding'),
               dragging: el.classList.contains('dragging') };
    });
    await pg.mouse.up();
    expect(midDrag.dragging && !midDrag.gliding,
      'transition live during drag: ' + JSON.stringify(midDrag));
    // phone-landscape: the menu scrolls instead of clipping its top
    await pg.setViewportSize({ width: 844, height: 390 });
    await pg.waitForTimeout(200);
    await pg.click('#addBtn');
    const menu = await pg.evaluate(() => {
      const r = document.getElementById('addMenu').getBoundingClientRect();
      return { top: r.top, scrollable: document.getElementById('addMenu').scrollHeight >
                                        document.getElementById('addMenu').clientHeight + 1 ||
                                        r.top >= 0 };
    });
    expect(menu.top >= -1, 'menu top clipped off-screen: ' + menu.top);
    await pg.close();
  });

  await t('v6.14 stage mode: focus hides the header, survives Home, Exit restores', async () => {
    await openAt('');
    await launch();
    await addTimer();
    const before = await page.evaluate(() =>
      document.querySelector('.w-timer').getBoundingClientRect().width);
    await page.click('.w-timer .wFocus');
    const staged = await page.evaluate(() => ({
      mode: document.body.classList.contains('focusMode'),
      header: getComputedStyle(document.querySelector('header')).display,
      width: document.querySelector('.w-timer').getBoundingClientRect().width,
      top: document.querySelector('.w-timer').getBoundingClientRect().top,
      barBtns: document.querySelectorAll('#focusBar button').length,
      barHidden: document.getElementById('focusBar').hidden
    }));
    expect(staged.mode && staged.header === 'none', 'header still up: ' + JSON.stringify(staged));
    expect(staged.width > before * 2 && staged.top < 20,
      'deck did not take the screen: ' + JSON.stringify(staged));
    expect(staged.barBtns === 2 && !staged.barHidden, 'focus bar incomplete');
    // Home mid-focus: the landing gets its header back…
    await page.keyboard.press('Escape');         // …but first: Esc fully restores
    const restored = await page.evaluate(() => ({
      mode: document.body.classList.contains('focusMode'),
      header: getComputedStyle(document.querySelector('header')).display
    }));
    expect(!restored.mode && restored.header !== 'none', 'stage never struck: '
      + JSON.stringify(restored));
    await page.click('.w-timer .wFocus');        // re-focus, then go Home
    await page.keyboard.press('h');
    expect(await page.evaluate(() =>
      getComputedStyle(document.querySelector('header')).display) !== 'none',
      'landing lost its header to stage mode');
    await launch();                              // back to the board: still staged
    expect(await page.evaluate(() =>
      getComputedStyle(document.querySelector('header')).display) === 'none',
      'stage dropped across Home/launch');
    await page.keyboard.press('Escape');
  });

  await t('v6.14 summon: one tap floats a timer over the deck — locked too, never dirties', async () => {
    await openAt('');
    await launch();
    await addTimer();                            // v6.29: no default timer
    await page.click('#clockWidget .wFocus');    // the clock stands in for a deck
    await page.click('#dockTog');                // v6.15: unfold the staged dock
    const cfgSnap = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config));   // the summon-purity baseline
    await page.click('#lockBtn');                // locked: summon must still work
    await summonCard();
    const m = await page.evaluate(() => {
      const t = document.querySelector('.w-timer').getBoundingClientRect();
      const el = document.elementFromPoint(t.x + t.width / 2, t.y + t.height / 2);
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      return { over: el ? !!el.closest('.w-timer') : false,
               stillFocused: document.querySelectorAll('.widget.wFull').length,
               pin: cw.pin };
    });
    expect(m.over, 'summoned timer not over the deck');
    expect(m.stillFocused === 1, 'summon collapsed focus');
    expect(m.pin === false, 'summon set pin in config');
    // the board-sized timer got a compact STAGE box over the deck…
    const boxed = await page.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const t = document.querySelector('.w-timer').getBoundingClientRect();
      return t.width < c.width * 0.4 && t.height < c.height * 0.55;
    });
    expect(boxed, 'summoned timer still blankets the deck');
    await unlock();
    // lock+unlock round-tripped the config — if summon touched NOTHING
    // else, it is byte-identical (float is session-only by design;
    // v6.29: the dirty flag itself is spent by addTimer, so compare JSON)
    expect(await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config)) === cfgSnap,
      'summon dirtied the config');
    await page.keyboard.press('Escape');
    // …and Exit restores its saved box exactly
    const restoredBox = await page.evaluate(() => {
      const c = document.getElementById('canvas').getBoundingClientRect();
      const t = document.querySelector('.w-timer').getBoundingClientRect();
      const cw = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer');
      return Math.abs(t.width / c.width * 100 - cw.w) < 1.5;
    });
    expect(restoredBox, 'stage box leaked past Exit');
    // a mere TAP on the summoned timer (strip, pin) must never adopt the
    // stage box into config — only a real drag does
    await page.click('#clockWidget .wFocus');
    await summonCard();
    const cfgBefore = await page.evaluate(() => JSON.stringify(
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer')));
    await page.locator('.w-timer .wLabel').click();          // raise-tap
    await page.click('.w-timer .wPin');                      // pin toggle
    await page.click('.w-timer .wPin');                      // …and back
    const cfgAfter = await page.evaluate(() => JSON.stringify(
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer')));
    expect(cfgBefore === cfgAfter, 'a tap adopted the stage box: ' + cfgAfter);
    await page.keyboard.press('Escape');
    // no timer at all: summon CREATES one, floating, focus kept
    await page.click('.w-timer .wClose');
    await page.click('#clockWidget .wFocus');
    const beforeN = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.length);
    await summonCard();
    const created = await page.evaluate(() => {
      const t = document.querySelector('.w-timer');
      const r = t.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { n: window.Deckhand.config.scenes[0].widgets.length,
               over: el ? !!el.closest('.w-timer') : false,
               focused: document.querySelectorAll('.widget.wFull').length };
    });
    expect(created.n === beforeN + 1, 'no timer created');
    expect(created.over && created.focused === 1,
      'created timer buried or focus lost: ' + JSON.stringify(created));
    await page.keyboard.press('Escape');
  });

  await t('v6.15: dock folds in stage (it sat on the Slides arrows), ghost timer, long-press safe', async () => {
    await openAt('');
    await launch();
    await addTimer();
    // stage auto-collapses the dock to its chevron handle…
    await page.click('#clockWidget .wFocus');
    const folded = await page.evaluate(() => ({
      min: document.body.classList.contains('dockMin'),
      addHidden: getComputedStyle(document.getElementById('addWrap')).display === 'none',
      dockW: document.getElementById('dock').getBoundingClientRect().width
    }));
    expect(folded.min && folded.addHidden && folded.dockW < 90,
      'dock did not fold: ' + JSON.stringify(folded));
    // …the handle re-expands it mid-stage…
    await page.click('#dockTog');
    expect(await page.evaluate(() =>
      !document.body.classList.contains('dockMin')), 'handle did not expand');
    await page.click('#dockTog');                // fold it back
    // ghost: summon, start — the card melts to wheel + digits
    await page.evaluate(() => window.Deckhand.ghostFuseMs(1500));  // 8s in class
    await summonCard();
    await page.click('.w-timer .tStart');
    await page.waitForTimeout(3200);             // 2s idle + sync tick
    const ghost = await page.evaluate(() => {
      const w = document.querySelector('.w-timer');
      return { ghost: w.classList.contains('wGhost'),
               strip: getComputedStyle(w.querySelector('.strip')).display,
               bg: getComputedStyle(w).backgroundColor,
               digits: getComputedStyle(w.querySelector('.visDigits, .tDisplay')).display };
    });
    expect(ghost.ghost && ghost.strip === 'none' &&
           (ghost.bg === 'rgba(0, 0, 0, 0)' || ghost.bg === 'transparent') &&
           ghost.digits !== 'none',
      'no ghost: ' + JSON.stringify(ghost));
    // a tap lifts the ghost (controls back)…
    await page.click('.w-timer');
    expect(await page.evaluate(() =>
      !document.querySelector('.w-timer').classList.contains('wGhost')),
      'tap did not lift the ghost');
    // …idle re-ghosts while still running…
    await page.waitForTimeout(3200);
    expect(await page.evaluate(() =>
      document.querySelector('.w-timer').classList.contains('wGhost')),
      'idle did not re-ghost');
    // …and pausing keeps the card (a paused timer needs its controls)
    await page.click('.w-timer');                // lift
    await page.click('.w-timer .tStart');        // pause
    await page.waitForTimeout(3200);
    expect(await page.evaluate(() =>
      !document.querySelector('.w-timer').classList.contains('wGhost')),
      'paused timer ghosted');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() =>
      !document.body.classList.contains('dockMin')), 'dock still folded after Exit');
    await page.keyboard.press('r');              // reset the timer
    // long-press: context menu suppressed on controls, kept on text fields
    const cm = await page.evaluate(() => {
      const fire = el => {
        const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        el.dispatchEvent(ev);
        return ev.defaultPrevented;
      };
      const onLock = fire(document.getElementById('lockBtn'));
      const inp = document.createElement('input');
      document.body.appendChild(inp);
      const onInput = fire(inp);
      inp.remove();
      return { onLock, onInput };
    });
    expect(cm.onLock === true, 'long-press callout not suppressed on Lock');
    expect(cm.onInput === false, 'paste menu killed on text fields');
    expect(await page.evaluate(() =>
      getComputedStyle(document.getElementById('lockBtn')).userSelect) === 'none',
      'Lock button selectable');
    // a stray Escape must not unfold a deliberately folded dock
    await page.click('#dockTog');                // fold, un-staged
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() =>
      document.body.classList.contains('dockMin')), 'Escape unfolded the dock');
    await page.click('#dockTog');
    // a slow drag (>2s) must never re-ghost the chrome under the finger
    await page.click('#clockWidget .wFocus');
    await summonCard();
    await page.click('.w-timer .tStart');
    await page.waitForTimeout(3000);             // ghosted
    await page.click('.w-timer');                // lift
    const sb2 = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb2.x + 40, sb2.y + sb2.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb2.x - 60, sb2.y - 40, { steps: 3 });
    await page.waitForTimeout(2600);             // hold mid-drag past the idle window
    const midDrag2 = await page.evaluate(() => ({
      ghost: document.querySelector('.w-timer').classList.contains('wGhost'),
      dragging: document.querySelector('.w-timer').classList.contains('dragging')
    }));
    await page.mouse.up();
    expect(midDrag2.dragging && !midDrag2.ghost,
      'chrome dissolved mid-drag: ' + JSON.stringify(midDrag2));
    expect(await page.evaluate(() =>
      !document.querySelector('.w-timer').classList.contains('wGhost')),
      'just-dropped timer re-ghosted instantly');
    await page.keyboard.press(' ');              // pause the running timer
    await page.keyboard.press('r');
    await page.keyboard.press('Escape');
  });

  await t('v6.17: preset pick births a GHOST — running wheel, no card, locked, never dirties', async () => {
    await openAt('');
    await launch();
    await addTimer();                            // v6.29: no default timer
    await page.click('#clockWidget .wFocus');
    await page.click('#dockTog');
    const cfgSnap17 = await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config));
    await page.click('#lockBtn');                // locked: presets must still work
    await page.click('#focusTimerBtn');
    const menu = await page.evaluate(() => ({
      open: !document.getElementById('focusTimerMenu').hidden,
      presets: document.querySelectorAll('#focusTimerMenu [data-min]').length,
      custom: !!document.querySelector('#focusTimerMenu [data-custom]')
    }));
    expect(menu.open && menu.presets >= 3 && menu.custom,
      'preset menu wrong: ' + JSON.stringify(menu));
    await page.click('#focusTimerMenu [data-min="5"]');
    // the card must NEVER appear: ghosted from the first painted frame
    const born = await page.evaluate(() => {
      const w = document.querySelector('.w-timer');
      return { ghost: w.classList.contains('wGhost'),
               running: w._entry.api.running(),
               strip: getComputedStyle(w.querySelector('.strip')).display,
               staged: document.querySelectorAll('.widget.wFull').length,
               menuClosed: document.getElementById('focusTimerMenu').hidden };
    });
    expect(born.ghost && born.running && born.strip === 'none' &&
           born.staged === 1 && born.menuClosed,
      'not born a ghost: ' + JSON.stringify(born));
    // …and it survives the next ghostSync tick (the interval must agree)
    await page.waitForTimeout(900);
    expect(await page.evaluate(() =>
      document.querySelector('.w-timer').classList.contains('wGhost')),
      'ghostSync lifted the born ghost');
    // a tap still lifts it — pause/reset live there when needed
    await page.click('.w-timer');
    expect(await page.evaluate(() => {
      const w = document.querySelector('.w-timer');
      return !w.classList.contains('wGhost') &&
             getComputedStyle(w.querySelector('.strip')).display !== 'none';
    }), 'tap did not bring the controls back');
    await unlock();
    expect(await page.evaluate(() =>
      JSON.stringify(window.Deckhand.config)) === cfgSnap17,
      'a locked preset pick dirtied the config');
    await page.keyboard.press('Escape');
    await page.keyboard.press(' ');              // pause
    await page.keyboard.press('r');
  });

  await t('v6.17: "Until bell" preset — ghost timer set to the period remainder', async () => {
    await openAt('#t=2026-09-08T10:30');         // mid 2nd period
    await launch();
    await page.click('#clockWidget .wFocus');
    await page.click('#focusTimerBtn');
    expect(await page.evaluate(() =>
      !!document.querySelector('#focusTimerMenu [data-bell]')),
      'no Until bell option during a period');
    await page.click('#focusTimerMenu [data-bell]');
    const b = await page.evaluate(() => {
      const w = document.querySelector('.w-timer');
      return { ghost: w.classList.contains('wGhost'),
               running: w._entry.api.running() };
    });
    expect(b.ghost && b.running, 'bell pick not ghost-running: ' + JSON.stringify(b));
    await page.keyboard.press('Escape');
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
  });

  await t('v6.17: Escape peels one layer — menu first, the stage only on the next press', async () => {
    await openAt('');
    await launch();
    await page.click('#clockWidget .wFocus');
    await page.click('#focusTimerBtn');
    await page.keyboard.press('Escape');
    const first = await page.evaluate(() => ({
      menu: document.getElementById('focusTimerMenu').hidden,
      staged: document.querySelectorAll('.widget.wFull').length
    }));
    expect(first.menu && first.staged === 1,
      'first Escape hit the wrong layer: ' + JSON.stringify(first));
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() =>
      document.querySelectorAll('.widget.wFull').length) === 0,
      'second Escape did not exit the stage');
  });

  await t('v6.17 fix: clearing a stale alarm badge never kills a RESTARTED timer', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await page.evaluate(() => {
      window.Deckhand.alarmCalmMs(400);
      document.querySelector('.w-timer')._entry.api.startSeconds(1);
    });
    await page.waitForTimeout(2400);             // rings, then calms to the badge
    const calm = await page.evaluate(() => ({
      on: document.getElementById('alarm').classList.contains('on'),
      calm: document.getElementById('alarm').classList.contains('calm')
    }));
    expect(calm.on && calm.calm, 'no calm badge to test against: ' + JSON.stringify(calm));
    // the next activity: a fresh 2-minute run on the SAME timer
    await page.evaluate(() =>
      document.querySelector('.w-timer')._entry.api.startSeconds(120));
    await page.click('#alarm');                  // teacher clears the stale badge
    const after = await page.evaluate(() => ({
      on: document.getElementById('alarm').classList.contains('on'),
      running: document.querySelector('.w-timer')._entry.api.running()
    }));
    expect(!after.on, 'badge did not dismiss');
    expect(after.running, 'dismissing the stale badge reset the live run');
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
  });

  await t('v6.17 fix: infeasible menu says why; custom lifts the ghost; drags round to 2dp', async () => {
    await openAt('');
    await launch();
    // locked + no timer in the scene (v6.29: default board ships timerless): pills disable and SAY why
    await page.click('#clockWidget .wFocus');
    await page.click('#dockTog');
    await page.click('#lockBtn');
    await page.click('#focusTimerBtn');
    const dead = await page.evaluate(() => {
      const m = document.getElementById('focusTimerMenu');
      const btns = [...m.querySelectorAll('button')];
      return { allOff: btns.length > 0 && btns.every(b => b.disabled),
               note: (m.querySelector('.menuLabel') || {}).textContent || '' };
    });
    expect(dead.allOff && /unlock/i.test(dead.note),
      'locked no-timer menu not explained: ' + JSON.stringify(dead));
    await page.keyboard.press('Escape');         // menu only (stage stays)
    await unlock();
    // preset → ghost running; "Type a time…" must yield a TYPABLE card NOW
    await page.click('#focusTimerBtn');
    await page.click('#focusTimerMenu [data-min="1"]');
    expect(await page.evaluate(() =>
      document.querySelector('.w-timer').classList.contains('wGhost')),
      'preset did not birth a ghost');
    await page.click('#focusTimerBtn');
    await page.click('#focusTimerMenu [data-custom]');
    const card = await page.evaluate(() => {
      const w = document.querySelector('.w-timer');
      return { ghost: w.classList.contains('wGhost'),
               running: w._entry.api.running() };
    });
    expect(!card.ghost && !card.running,
      'custom did not surface a typable card: ' + JSON.stringify(card));
    await page.evaluate(() => {
      if (document.activeElement) document.activeElement.blur();
    });
    await page.keyboard.press('4');
    await page.keyboard.press('5');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => {
      const a = document.querySelector('.w-timer')._entry.api;
      return a.running() && !a.entryActive();
    }), 'typed time did not start');
    await page.keyboard.press('Escape');         // exit stage
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
    // an ordinary board drag commits 2dp percentages, not 14-decimal floats
    const sb = await page.locator('.w-timer .strip').boundingBox();
    await page.mouse.move(sb.x + 30, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + 30 + 130, sb.y + sb.height / 2 + 90, { steps: 5 });
    await page.mouse.up();
    const cw = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'timer'));
    const clean = v => Math.round(v * 100) / 100 === v;
    expect(clean(cw.x) && clean(cw.y) && clean(cw.w) && clean(cw.h),
      'drag wrote unrounded floats: ' + JSON.stringify(cw));
  });

  await t('v6.18: boat sits IN the water; sea things play on demand and expire', async () => {
    await openAt('');
    await launch();
    const sea = await page.evaluate(() => {
      const wf = document.getElementById('wavesFront');
      const wv = document.getElementById('waves');
      const wfr = wf.getBoundingClientRect(), wvr = wv.getBoundingClientRect();
      const boat = document.getElementById('boat').getBoundingClientRect();
      return {
        aligned: Math.abs(wfr.left - wvr.left) < 2 &&
                 Math.abs(wfr.width - wvr.width) < 2 &&
                 Math.abs(wfr.bottom - wvr.bottom) < 2,
        pe: getComputedStyle(wf).pointerEvents,
        boatDepth: boat.bottom - wvr.top,        // hull well into the wave band
        things: ['serpent', 'fish', 'buoy', 'whale'].every(n =>
          !!document.getElementById('sea-' + n))
      };
    });
    expect(sea.aligned, 'front wave misaligned: ' + JSON.stringify(sea));
    expect(sea.pe === 'none', 'front wave intercepts pointer events');
    expect(sea.boatDepth > 60, 'boat still rides the sand: ' + JSON.stringify(sea));
    expect(sea.things, 'sea things missing');
    // play-by-name: shows, refuses a replay while live, expires on time
    expect(await page.evaluate(() => {
      window.Deckhand.sea('fish');
      window.Deckhand.sea('fish');               // double-tap: one show only
      return document.getElementById('sea-fish').classList.contains('go');
    }), 'fish did not play');
    await page.waitForTimeout(4800);             // fish runs 4.2s
    expect(await page.evaluate(() =>
      !document.getElementById('sea-fish').classList.contains('go')),
      'fish never expired');
    // under reduced motion the SCHEDULER stays quiet even at test cadence
    await page.evaluate(() => window.Deckhand.seaEvery(60));
    await page.waitForTimeout(500);
    expect(await page.evaluate(() =>
      ![...document.querySelectorAll('.seaThing')].some(el =>
        el.classList.contains('go'))),
      'the sea plays under reduced motion');
    // shrinking to a phone-sized window ends a live show the same way
    await page.evaluate(() => window.Deckhand.sea('buoy'));
    await page.setViewportSize({ width: 700, height: 500 });
    await page.waitForTimeout(150);
    expect(await page.evaluate(() =>
      !document.getElementById('sea-buoy').classList.contains('go')),
      'shrink did not clear the buoy');
    await page.setViewportSize({ width: 1920, height: 1080 });
    // v6.19: tapping the BOAT summons one visitor — and only one at a time
    await page.click('#boat');
    let going = await page.evaluate(() =>
      [...document.querySelectorAll('.seaThing')].filter(el =>
        el.classList.contains('go')).length);
    expect(going === 1, 'boat tap summoned ' + going + ' things');
    await page.click('#boat');                   // the sea is busy: no double bill
    going = await page.evaluate(() =>
      [...document.querySelectorAll('.seaThing')].filter(el =>
        el.classList.contains('go')).length);
    expect(going === 1, 'a second tap overlapped the show: ' + going);
  });

  await t('v6.22: "Always on" waterline motion beats a reduce-motion device', async () => {
    await openAt('');
    await launch();
    // Auto on a reduced device (this suite page): still water, as before
    expect(await page.evaluate(() =>
      !document.body.classList.contains('waveMotion')),
      'Auto ignored the device flag');
    await page.click('#setBtn');
    expect(await page.evaluate(() =>
      !document.getElementById('sMotionHint').hidden),
      'no hint about the device asking for reduced motion');
    await page.selectOption('#sMotion', 'on');
    await page.click('#applyBtn');
    const on = await page.evaluate(() => ({
      cls: document.body.classList.contains('waveMotion'),
      cfg: window.Deckhand.config.ui.motion,
      boat: getComputedStyle(document.getElementById('boat')).animationName,
      dirty: window.Deckhand.dirty
    }));
    expect(on.cls && on.cfg === 'on', 'override not applied: ' + JSON.stringify(on));
    expect(on.boat.includes('boatDrift'),
      'boat still frozen with motion forced on: ' + on.boat);
    expect(on.dirty, 'motion change did not mark the config dirty');
    await page.keyboard.press('Escape');         // close settings
    // …and the SEA wakes up on this reduced device too
    await page.evaluate(() => window.Deckhand.seaEvery(60));
    await page.waitForTimeout(600);
    expect(await page.evaluate(() =>
      [...document.querySelectorAll('.seaThing')].some(el =>
        el.classList.contains('go'))),
      'sea still asleep with motion forced on');
  });

  await t('v6.22: stage hands the keyboard to the deck — the USB clicker drives the slides', async () => {
    fs.writeFileSync(path.resolve(__dirname, 'tmp_clicker_deck.html'),
      '<!DOCTYPE html><title>ClickerDeck</title><body><h1>DECK</h1>');
    await openAt('');
    await launch();
    await addW('addEmbedBtn');
    const target = 'file://' + path.resolve(__dirname, 'tmp_clicker_deck.html');
    await page.evaluate(u => {
      const inp = document.querySelector('.w-embed .embIn');
      inp.value = 'https://example.com/x'; inp.dispatchEvent(new Event('blur'));
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector('.w-embed .embFrame').src = u;
    }, target);
    await page.waitForTimeout(400);
    await page.click('.w-embed .wFocus');        // stage: keys go to the deck
    const focused = () => page.evaluate(() =>
      !!document.activeElement &&
      document.activeElement.classList.contains('embFrame'));
    expect(await focused(), 'stage entry left the keyboard on the board');
    // the "keys are in the slides" nag stays hidden mid-stage
    expect(await page.evaluate(() =>
      getComputedStyle(document.querySelector('.w-embed .embKeys'))
        .display === 'none'),
      'keys pill nags mid-stage');
    // a ghost-timer summon interrupts — and hands the keys straight back
    await page.click('#focusTimerBtn');
    await page.click('#focusTimerMenu [data-min="1"]');
    expect(await focused(), 'summon kept the keyboard');
    // the dock chevron round trip too
    await page.click('#dockTog');                // unfold (focus to chevron)
    await page.click('#dockTog');                // fold → keys back to the deck
    expect(await focused(), 'dock fold kept the keyboard');
    // an alarm rings through the deck; dismissing it returns the keys
    await page.evaluate(() =>
      document.querySelector('.w-timer')._entry.api.startSeconds(1));
    await page.waitForTimeout(1700);
    expect(await page.evaluate(() =>
      document.getElementById('alarm').classList.contains('on')), 'no ring');
    await page.click('#alarm');
    expect(await focused(), 'alarm dismiss kept the keyboard');
    await page.click('#unfocusBtn');             // Escape would die in the iframe
    expect(await page.evaluate(() =>
      document.querySelectorAll('.widget.wFull').length) === 0,
      'Exit pill did not exit');
  });

  await t('v6.23 settle-in: arms quietly, counts down, flips to the consequence, re-arms', async () => {
    await openAt('#t=2026-09-08T10:30');         // mid 2nd period: must NOT autostart
    await launch();                              // v6.29: default board has the settle
    await page.waitForTimeout(600);              // a few bell-watch ticks
    const armed = await page.evaluate(() => ({
      big: document.querySelector('.stBig').textContent,
      top: document.querySelector('.stTop').textContent,
      running: document.querySelector('.w-settle')._entry.api.running()
    }));
    expect(!armed.running && armed.big === '30s' && /bell/i.test(armed.top),
      'not armed on a mid-period boot: ' + JSON.stringify(armed));
    // a WEEK RE-PICK mid-period flips the label with no bell — never fire
    await page.evaluate(() => {
      const cur = window.Deckhand.activeIndex;
      window.Deckhand.setSchedule(cur === 0 ? 1 : 0);
    });
    await page.waitForTimeout(800);
    expect(await page.evaluate(() =>
      !document.querySelector('.w-settle')._entry.api.running()),
      'a schedule re-pick started the settle clock');
    await page.evaluate(() => window.Deckhand.setSchedule(-1));  // No bells…
    await page.waitForTimeout(600);
    await page.evaluate(() => window.Deckhand.setSchedule(0));   // …and back
    await page.waitForTimeout(800);
    expect(await page.evaluate(() =>
      !document.querySelector('.w-settle')._entry.api.running()),
      'No-bells → bells-back fired the clock');
    // ✎: 5 seconds and a custom message, committed into config
    await page.click('.w-settle .stEdit');
    await page.fill('.w-settle .stSecs', '5');
    await page.fill('.w-settle .stMsg', 'Cards out if standing');
    await page.click('.w-settle .stEdit');       // close (blur commits)
    const cw = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'settle'));
    expect(cw.seconds === 5 && cw.msgDone === 'Cards out if standing',
      'edit did not commit: ' + JSON.stringify(cw));
    // an EMPTIED seconds field is not a choice — it must revert, not clamp
    await page.click('.w-settle .stEdit');       // reopen
    await page.fill('.w-settle .stSecs', '');
    await page.click('.w-settle .stMsg');        // blur commits
    expect(await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'settle')
        .seconds) === 5, 'blank seconds overwrote the value');
    await page.click('.w-settle .stEdit');       // close again
    // Start chip: counts down, hits zero, shows the consequence, re-arms
    await page.evaluate(() =>
      document.querySelector('.w-settle')._entry.api._doneMs(1200));
    await page.click('.w-settle .stStart');
    await page.waitForTimeout(400);
    const run = await page.evaluate(() => ({
      top: document.querySelector('.stTop').textContent,
      big: document.querySelector('.stBig').textContent,
      running: document.querySelector('.w-settle')._entry.api.running()
    }));
    expect(run.running && /seat/i.test(run.top) && +run.big >= 4 && +run.big <= 5,
      'countdown wrong: ' + JSON.stringify(run));
    // v6.24: a MANUAL start never steals the screen
    expect(await page.evaluate(() =>
      document.querySelectorAll('.widget.wFull').length) === 0,
      'manual Start took over the stage');
    await page.waitForTimeout(5200);             // past zero → consequence up
    expect(await page.evaluate(() =>
      document.querySelector('.stBig').textContent) === 'Cards out if standing',
      'consequence message missing');
    await page.waitForTimeout(1400);             // done spell ends → re-armed
    expect(await page.evaluate(() =>
      document.querySelector('.stBig').textContent) === '5s', 're-arm failed');
    // LOCKED: Start still works (play action, like +1); ✎ hides
    await page.click('#lockBtn');
    expect(await page.evaluate(() =>
      getComputedStyle(document.querySelector('.w-settle .stEdit'))
        .display === 'none'), '✎ visible while locked');
    await page.click('.w-settle .stStart');
    expect(await page.evaluate(() =>
      document.querySelector('.w-settle')._entry.api.running()),
      'Start dead while locked');
    await unlock();
    await page.keyboard.press('r');              // tap selected it; R re-arms
    await page.click('.w-settle .wClose');
  });

  await t('v6.23/24 settle-in: the BELL starts it FULL SCREEN, then hands the stage to the slides', async () => {
    await openAt('#t=2026-09-08T10:15:56');      // 4s before 2nd period (10:16)
    await launch();
    await addW('addEmbedBtn');                   // the deck the routine hands to
    // v6.29: the default board already carries the settle — configure IT
    await page.evaluate(() => {
      const en = document.querySelector('.w-settle')._entry;
      en.cfg.seconds = 3;                        // quick routine for the test
      en.api._doneMs(700);
      if (document.activeElement) document.activeElement.blur();
    });
    expect(await page.evaluate(() =>
      !document.querySelector('.w-settle')._entry.api.running()),
      'started before the bell');
    await page.waitForTimeout(5500);             // the bell rings at 10:16:00
    const auto = await page.evaluate(() => ({
      running: document.querySelector('.w-settle')._entry.api.running(),
      top: document.querySelector('.stTop').textContent,
      stagedSettle: !!document.querySelector('.w-settle.wFull'),
      mode: document.body.classList.contains('focusMode')
    }));
    expect(auto.running && /seat/i.test(auto.top),
      'bell did not start the settle clock: ' + JSON.stringify(auto));
    expect(auto.stagedSettle && auto.mode,
      'bell start did not take the screen: ' + JSON.stringify(auto));
    await page.waitForTimeout(4600);             // 3s count + 0.7s spell + margin
    expect(await page.evaluate(() =>
      !!document.querySelector('.w-embed.wFull')),
      'routine did not hand the stage to the slides');
    await page.click('#unfocusBtn');             // staged embed owns Escape
    expect(await page.evaluate(() =>
      !document.body.classList.contains('focusMode')), 'Exit did not exit');
    // (no wClose here: on the FULL default board the cascade stacks the
    // settle under the embed, so its ✕ is covered — the reload between
    // tests is the cleanup; destroy-cleanliness is covered in test #1)
  });

  await t('v6.24 hardening: bell beats a manual run, reclaims keys, restarts hand off, ghosts ride along', async () => {
    fs.writeFileSync(path.resolve(__dirname, 'tmp_clicker_deck.html'),
      '<!DOCTYPE html><title>ClickerDeck</title><body><h1>DECK</h1>');
    await openAt('#t=2026-09-08T10:15:55');      // 5s before 2nd period
    await launch();
    await addW('addEmbedBtn');
    const target = 'file://' + path.resolve(__dirname, 'tmp_clicker_deck.html');
    await page.evaluate(u => {
      const inp = document.querySelector('.w-embed .embIn');
      inp.value = 'https://example.com/x'; inp.dispatchEvent(new Event('blur'));
      const w = window.Deckhand.config.scenes[0].widgets;
      w[w.length - 1].url = u;
      document.querySelector('.w-embed .embFrame').src = u;
    }, target);
    await page.evaluate(() => {                  // v6.29: default settle
      const en = document.querySelector('.w-settle')._entry;
      en.cfg.seconds = 40;
      en.api._doneMs(700);
      en.api.startPause();                       // a kid taps Start pre-bell…
    });
    await page.click('.w-embed .wFocus');        // …while the DECK is staged
    expect(await page.evaluate(() =>
      document.activeElement &&
      document.activeElement.classList.contains('embFrame')),
      'precondition: deck should own the keys');
    await page.waitForTimeout(6000);             // 10:16:00 — the bell
    const bell = await page.evaluate(() => ({
      staged: !!document.querySelector('.w-settle.wFull'),
      running: document.querySelector('.w-settle')._entry.api.running(),
      keysInFrame: document.activeElement &&
        document.activeElement.classList.contains('embFrame')
    }));
    expect(bell.staged && bell.running,
      'a pre-bell manual run suppressed the routine: ' + JSON.stringify(bell));
    expect(!bell.keysInFrame, 'takeover left the keyboard in the deck');
    // a ghost timer summoned OVER the count…
    await page.click('#focusTimerBtn');
    await page.click('#focusTimerMenu [data-min="1"]');
    // …and a MANUAL restart mid-routine (Space) must still hand off
    await page.mouse.click(200, 300);            // select the settle, not the timer
    await page.evaluate(() =>
      document.querySelector('.w-settle')._entry.cfg.seconds = 2);
    await page.keyboard.press(' ');              // restart at 2s (keys work now)
    await page.waitForTimeout(3600);             // 2s + 0.7s spell + margin
    const after = await page.evaluate(() => {
      const tEl = document.querySelector('.w-timer');
      const b = tEl.getBoundingClientRect();
      const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return {
        embStaged: !!document.querySelector('.w-embed.wFull'),
        timerOver: hit ? !!hit.closest('.w-timer') : false,
        timerFloat: tEl._entry.float,
        timerRuns: tEl._entry.api.running()
      };
    });
    expect(after.embStaged,
      'manual restart stranded the stage: ' + JSON.stringify(after));
    expect(after.timerRuns && after.timerFloat && after.timerOver,
      'ghost timer buried by the handoff: ' + JSON.stringify(after));
    await page.waitForTimeout(900);              // ghostSync tick
    expect(await page.evaluate(() =>
      document.querySelector('.w-timer').classList.contains('wGhost')),
      'rider timer not ghosted over the slides');
    await page.click('#unfocusBtn');
    // R while the settle itself is staged: the stage stands DOWN
    await openAt('#t=2026-09-08T10:30');
    await launch();                              // v6.29: default settle is on board
    await page.evaluate(() => {                  // park it clear of the deck
      const en = document.querySelector('.w-settle')._entry;
      en.cfg.x = 2; en.cfg.y = 2; en.cfg.w = 30; en.cfg.h = 45;
      en.el.style.left = '2%'; en.el.style.top = '2%';
      en.el.style.width = '30%'; en.el.style.height = '45%';
    });
    await page.click('.w-settle .wFocus');       // teacher stages it by hand
    await page.click('.w-settle .stStart');      // runs (chips live staged)
    await page.keyboard.press('r');              // …and stands the stage down
    expect(await page.evaluate(() =>
      !document.body.classList.contains('focusMode')),
      'R left the stage stuck on the settle');
  });

  await t('v6.29/30: ticks swell to zero, one SOFT note lands, no lyrics anywhere', async () => {
    await openAt('#t=2026-09-08T10:30');         // mid-period: no bell interference
    await launch();
    expect(await page.evaluate(() =>
      /seat/i.test(document.querySelector('.stSub').textContent)),
      'armed sub is not the plain instruction');
    // instrument the tick + both end-sounds (levels are the CALL args;
    // the audio itself is gated inside Sound)
    await page.evaluate(() => {
      window.__ticks = []; window.__soft = 0; window.__chime = 0;
      const S = window.Deckhand.sound;
      const oT = S.tick, oS = S.soft, oC = S.chime;
      S.tick = function (l) { window.__ticks.push(l); return oT(l); };
      S.soft = function () { window.__soft++; return oS(); };
      S.chime = function () { window.__chime++; return oC(); };
      const en = document.querySelector('.w-settle')._entry;
      en.cfg.seconds = 8;
      en.api._doneMs(1500);
    });
    await page.click('.w-settle .stStart');
    await page.waitForTimeout(4200);             // mid-count
    // v6.30/31: no lyrics — the sub just says what the number IS
    expect(await page.evaluate(() =>
      document.querySelector('.stSub').textContent === 'seconds'),
      'mid-count sub is not the units line: ' +
      await page.evaluate(() => document.querySelector('.stSub').textContent));
    await page.waitForTimeout(4500);             // zero → the consequence spell
    const done = await page.evaluate(() => ({
      top: document.querySelector('.stTop').textContent,
      soft: window.__soft, chime: window.__chime
    }));
    expect(/time.s up/i.test(done.top),
      'zero did not land on Time’s up: ' + JSON.stringify(done));
    // v6.30: ONE pleasant note — the soft bell, never the 3-note chime
    expect(done.soft === 1 && done.chime === 0,
      'wrong end sound: ' + JSON.stringify(done));
    // the swell: whisper at the top, a real knock near zero, halves between
    const ticks = await page.evaluate(() => window.__ticks);
    expect(ticks.length >= 10,
      'too few ticks for an 8s count with half-beats: ' + ticks.length);
    expect(ticks[0] < 0.15, 'first tick was not a whisper: ' + ticks[0]);
    expect(Math.max.apply(null, ticks) > 0.6,
      'the swell never got loud: ' + Math.max.apply(null, ticks));
    // after the spell it re-arms with the plain instruction back
    await page.waitForTimeout(1400);
    const rearmed = await page.evaluate(() => ({
      big: document.querySelector('.stBig').textContent,
      sub: document.querySelector('.stSub').textContent
    }));
    expect(rearmed.big === '8s' && /seat/i.test(rearmed.sub),
      'spell did not re-arm cleanly: ' + JSON.stringify(rearmed));
  });

  await t('v6.32: ticks hold their tongue until 10 remain, whatever the length', async () => {
    await openAt('#t=2026-09-08T10:30');
    await launch();
    await page.evaluate(() => {
      window.__ticks2 = [];
      const S = window.Deckhand.sound;
      const orig = S.tick;
      S.tick = function (l) { window.__ticks2.push(l); return orig(l); };
      const en = document.querySelector('.w-settle')._entry;
      en.cfg.seconds = 14;
      en.api._doneMs(700);
    });
    await page.click('.w-settle .stStart');
    await page.waitForTimeout(1000);
    // a mid-run ✎ edit must not matter either — the window is on remS
    await page.evaluate(() => {
      document.querySelector('.w-settle')._entry.cfg.seconds = 300;
    });
    await page.waitForTimeout(2400);             // remS ~ 11: still SILENT
    expect(await page.evaluate(() => window.__ticks2.length) === 0,
      'ticked before 10 remained: ' +
      await page.evaluate(() => JSON.stringify(window.__ticks2)));
    await page.waitForTimeout(2000);             // remS ~ 9: the window opened
    const m = await page.evaluate(() => ({
      n: window.__ticks2.length,
      max: window.__ticks2.length ? Math.max.apply(null, window.__ticks2) : -1
    }));
    expect(m.n >= 1 && m.n <= 4, 'window entry miscounted: ' + JSON.stringify(m));
    expect(m.max >= 0 && m.max < 0.3,
      'early-window ticks are not whispers: ' + JSON.stringify(m));
    await page.evaluate(() =>
      document.querySelector('.w-settle')._entry.api.reset());
  });

  await t('v6.25/26 music: the lofi tape plays, ducks under the alarm, works locked', async () => {
    await openAt('');
    await launch();
    await addTimer();
    await addW('addMusicBtn');
    const st = () => page.evaluate(() => ({
      running: document.querySelector('.w-music')._entry.api.running(),
      what: document.querySelector('.muWhat').textContent,
      btn: document.querySelector('.muPlay').textContent,
      duck: document.querySelector('.w-music')._entry.api._duck()
    }));
    let s = await st();
    expect(!s.running && /lofi/i.test(s.what) && s.btn === 'Play',
      'not idle on lofi at birth: ' + JSON.stringify(s));
    await page.click('.w-music .muPlay');        // the gesture starts the tape
    await page.waitForTimeout(700);
    s = await st();
    expect(s.running && s.btn === 'Pause', 'Play did not start: ' + JSON.stringify(s));
    // volume persists into config (a real edit: it may dirty)
    await page.evaluate(() => {
      const v = document.querySelector('.muVol');
      v.value = 20; v.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(400);
    const cw = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'music'));
    expect(Math.abs(cw.volume - 0.2) < 0.01,
      'volume not committed: ' + JSON.stringify(cw));
    // an alarm DUCKS the music hard, and dismissal restores it
    await page.evaluate(() =>
      document.querySelector('.w-timer')._entry.api.startSeconds(1));
    await page.waitForTimeout(2200);
    expect(await page.evaluate(() =>
      document.getElementById('alarm').classList.contains('on')), 'no ring');
    s = await st();
    expect(s.duck < 0.4, 'music not ducked under the alarm: duck=' + s.duck);
    await page.click('#alarm');
    await page.waitForTimeout(1200);
    s = await st();
    expect(s.duck > 0.6, 'music stayed ducked after dismissal: duck=' + s.duck);
    // locked: play/pause stays live (play action); Space toggles; R stops
    await page.click('#lockBtn');
    await page.click('.w-music .muPlay');        // pause while locked
    expect(await page.evaluate(() =>
      !document.querySelector('.w-music')._entry.api.running()),
      'Pause dead while locked');
    await page.click('.w-music .muPlay');        // and back on
    await unlock();
    await page.keyboard.press(' ');              // widget is selected: toggle off
    expect(await page.evaluate(() =>
      !document.querySelector('.w-music')._entry.api.running()),
      'Space did not toggle');
    // pause means SILENCE: the master bus hushes fast, no 3s drum tail
    await page.waitForTimeout(400);
    expect(await page.evaluate(() =>
      document.querySelector('.w-music')._entry.api._level()) < 0.02,
      'paused bus still hot');
    await page.click('.w-music .muPlay');        // and play restores the level
    await page.waitForTimeout(500);
    expect(await page.evaluate(() =>
      document.querySelector('.w-music')._entry.api._level()) > 0.1,
      'play did not restore the bus');
    await page.click('.w-music .muPlay');
    await page.click('.w-music .wClose');        // destroy closes the context
  });

  await t('v6.25 embed: YouTube links normalize to the nocookie player', async () => {
    await openAt('');
    await launch();
    await addW('addEmbedBtn');
    const conv = async u => {
      await page.evaluate(url => {
        const inp = document.querySelector('.w-embed .embIn');
        inp.value = url;
        inp.dispatchEvent(new Event('blur'));
      }, u);
      await page.waitForTimeout(120);
      return page.evaluate(() =>
        window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'embed').url);
    };
    expect(await conv('https://www.youtube.com/watch?v=jfKfPfyJRdk') ===
      'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk', 'watch link');
    expect(await conv('https://youtu.be/jfKfPfyJRdk?t=30') ===
      'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk', 'youtu.be link');
    expect(await conv('https://www.youtube.com/watch?v=abc123defg4&list=PLxyz-12_34') ===
      'https://www.youtube-nocookie.com/embed/abc123defg4?list=PLxyz-12_34', 'video+list');
    expect(await conv('https://www.youtube.com/playlist?list=PLxyz-12_34') ===
      'https://www.youtube-nocookie.com/embed/videoseries?list=PLxyz-12_34', 'bare playlist');
    expect(await conv('https://www.youtube.com/shorts/abc123defg4') ===
      'https://www.youtube-nocookie.com/embed/abc123defg4', 'shorts link');
    // bad ids REJECT cleanly (keep-last-good) — never load the raw page
    const last = 'https://www.youtube-nocookie.com/embed/abc123defg4';
    expect(await conv('https://youtu.be/ab') === last,
      'too-short youtu.be id was not rejected');
    expect(await conv('https://www.youtube.com/playlist?list=' + 'A'.repeat(70)) === last,
      'oversize playlist id was truncated instead of rejected');
    await page.click('.w-embed .wClose');
  });

  await t('v6.26 YouTube widget: stations load with one tap, save/remove, YouTube-only, locked-safe', async () => {
    await openAt('');
    await launch();
    await addW('addYtBtn');
    // born with the Lofi Girl station seeded
    const seed = await page.evaluate(() => ({
      chips: [...document.querySelectorAll('.ytSt')].map(b => b.textContent),
      frameHidden: document.querySelector('.ytFrame').hidden
    }));
    expect(seed.chips.length === 1 && /lofi girl/i.test(seed.chips[0]) &&
           seed.frameHidden, 'bad birth state: ' + JSON.stringify(seed));
    // v6.27: the LIBRARY — categorized, one tap loads and closes
    await page.click('.ytLibBtn');
    const libState = await page.evaluate(() => ({
      open: !document.querySelector('.ytLib').hidden,
      cats: [...document.querySelectorAll('.ytLib .menuLabel')].map(l => l.textContent),
      pills: document.querySelectorAll('.ytLib .pill').length
    }));
    // v6.33: 8 categories (Math Antics + scores + pop/jazz joined the 5)
    expect(libState.open && libState.cats.length === 8 && libState.pills >= 30,
      'library wrong: ' + JSON.stringify(libState));
    await page.click('.ytLib .pill');            // first entry: Lofi Girl radio
    const libPick = await page.evaluate(() => ({
      closed: document.querySelector('.ytLib').hidden,
      src: document.querySelector('.ytFrame').src,
      urls: window.Deckhand.config.scenes[0].widgets
        .find(x => x.type === 'yt').url
    }));
    expect(libPick.closed && /youtube-nocookie\.com\/embed\//.test(libPick.src),
      'library pick did not load: ' + JSON.stringify(libPick));
    await page.evaluate(() => {                  // reset for the station test
      document.querySelector('.w-yt')._entry.cfg.url = '';
      const f = document.querySelector('.ytFrame');
      f.src = 'about:blank'; f.hidden = true;
    });
    // one tap = the station is on the card and in config
    await page.click('.ytSt');
    const tapped = await page.evaluate(() => ({
      src: document.querySelector('.ytFrame').src,
      url: window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt').url,
      hidden: document.querySelector('.ytFrame').hidden
    }));
    expect(!tapped.hidden && /youtube-nocookie\.com\/embed\/jfKfPfyJRdk/.test(tapped.src) &&
           /jfKfPfyJRdk/.test(tapped.url), 'station tap: ' + JSON.stringify(tapped));
    // v6.28: ↗ Tab converts the embed back to a real YouTube page URL
    const opened = await page.evaluate(() => {
      const calls = [];
      const orig = window.open;
      window.open = u => { calls.push(u); return null; };
      document.querySelector('.ytOpen').click();
      const en = document.querySelector('.w-yt')._entry;
      en.cfg.url = 'https://www.youtube-nocookie.com/embed/videoseries?list=PLabc-123';
      document.querySelector('.ytOpen').click();
      en.cfg.url = 'https://www.youtube-nocookie.com/embed/abc123defg4?list=PLxyz90';
      document.querySelector('.ytOpen').click();
      window.open = orig;
      return calls;
    });
    expect(opened.length === 3 &&
           opened[0] === 'https://www.youtube.com/watch?v=jfKfPfyJRdk' &&
           opened[1] === 'https://www.youtube.com/playlist?list=PLabc-123' &&
           opened[2] === 'https://www.youtube.com/watch?v=abc123defg4&list=PLxyz90',
      '↗ Tab conversions wrong: ' + JSON.stringify(opened));
    await page.evaluate(() => {                  // restore the tapped station url
      document.querySelector('.w-yt')._entry.cfg.url =
        'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk';
    });
    // v6.28: the ⤡ strip grip — finger-sized resize that covers no content
    const grip = await page.evaluate(() => {
      const g = document.querySelector('.w-yt .wSize');
      const r = g.getBoundingClientRect();
      return { w: r.width, h: r.height,
               cursor: getComputedStyle(g).cursor,
               ta: getComputedStyle(g).touchAction };
    });
    expect(grip.w >= 44 && grip.h >= 44 && grip.cursor === 'nwse-resize' &&
           grip.ta === 'none', 'grip wrong: ' + JSON.stringify(grip));
    // (v6.32 flake hardening: let the setURL rebuild's layout settle, read
    // the grip box at the last moment, and record x/y so a mis-aimed tap
    // that starts a MOVE is distinguishable from a real resize regression)
    await page.waitForTimeout(150);
    const gb = await page.locator('.w-yt .wSize').boundingBox();
    const before28 = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt');
      return { x: w.x, y: w.y, w: w.w, h: w.h };
    });
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down();
    await page.mouse.move(gb.x + gb.width / 2 + 80, gb.y + gb.height / 2 + 60, { steps: 3 });
    // v6.32: mid-drag the iframe SHIELD must be up — a loaded cross-origin
    // embed otherwise steals the pointer stream the moment the drag
    // crosses it (the real cause of the intermittent grip failures here,
    // and of "stretching tiles" dying on the tablet over a live video)
    const shield = await page.evaluate(() => ({
      body: document.body.classList.contains('dragging'),
      pe: getComputedStyle(document.querySelector('.ytFrame')).pointerEvents
    }));
    expect(shield.body && shield.pe === 'none',
      'iframe shield down mid-drag: ' + JSON.stringify(shield));
    await page.mouse.move(gb.x + gb.width / 2 + 160, gb.y + gb.height / 2 + 120, { steps: 3 });
    await page.mouse.up();
    const after28 = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt');
      return { x: w.x, y: w.y, w: w.w, h: w.h };
    });
    expect(await page.evaluate(() =>
      !document.body.classList.contains('dragging')),
      'iframe shield stuck after the drop');
    // v6.32 fix: the five classic handles were BURIED under the yt body
    // (.w-yt .wBody position:relative since v6.27) — hSE must work again
    const hb32 = await page.locator('.w-yt .wHandle.hSE').boundingBox();
    await page.mouse.move(hb32.x + hb32.width / 2, hb32.y + hb32.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb32.x - 120, hb32.y - 90, { steps: 4 });
    await page.mouse.up();
    const after32 = await page.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt');
      return { w: w.w, h: w.h };
    });
    expect(after32.w < after28.w && after32.h < after28.h,
      'hSE handle dead on the yt card: ' + JSON.stringify({ after28, after32 }));
    expect(after28.x === before28.x && after28.y === before28.y,
      '⤡ grip drag MOVED the widget (mis-aimed tap hit the strip): ' +
      JSON.stringify({ before28, after28 }));
    expect(after28.w > before28.w && after28.h > before28.h,
      '⤡ grip did not resize: ' + JSON.stringify({ before28, after28 }));
    // pasting a watch link converts; save keeps it as a named station
    await page.evaluate(() => {
      const inp = document.querySelector('.ytIn');
      inp.value = 'https://www.youtube.com/watch?v=abc123defg4';
      inp.dispatchEvent(new Event('blur'));
    });
    await page.fill('.ytName', 'Mozart mix');
    await page.click('.ytSave');
    const saved = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt').stations);
    expect(saved.length === 2 && saved[1].name === 'Mozart mix' &&
           /abc123defg4/.test(saved[1].url), 'save: ' + JSON.stringify(saved));
    // re-saving the same url renames instead of duplicating
    await page.fill('.ytName', 'Wolfgang');
    await page.click('.ytSave');
    const renamed = await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt').stations);
    expect(renamed.length === 2 && renamed[1].name === 'Wolfgang',
      're-save duplicated: ' + JSON.stringify(renamed));
    // a non-YouTube link is refused with a note (keep-last-good)
    await page.evaluate(() => {
      const inp = document.querySelector('.ytIn');
      inp.value = 'https://docs.google.com/presentation/d/xyz123abcd/edit';
      inp.dispatchEvent(new Event('blur'));
    });
    const refused = await page.evaluate(() => ({
      url: window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt').url,
      note: document.querySelector('.ytNote').hidden
    }));
    expect(/abc123defg4/.test(refused.url) && !refused.note,
      'non-YouTube link accepted: ' + JSON.stringify(refused));
    // ✕ removes a station (unlocked only); locked hides ✕ + row, taps stay
    await page.click('.ytStations .ytDel:last-of-type');
    expect(await page.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt')
        .stations.length) === 1, '✕ did not remove');
    await page.click('#lockBtn');
    const locked = await page.evaluate(() => ({
      row: getComputedStyle(document.querySelector('.ytRow')).display,
      del: getComputedStyle(document.querySelector('.ytDel')).display
    }));
    expect(locked.row === 'none' && locked.del === 'none',
      'config controls visible while locked: ' + JSON.stringify(locked));
    await page.evaluate(() => {                  // park a distinct url first
      document.querySelector('.w-yt')._entry.cfg.url = '';
    });
    await page.click('.ytSt');                   // station tap works locked
    expect(await page.evaluate(() =>
      /jfKfPfyJRdk/.test(document.querySelector('.ytFrame').src)),
      'station tap dead while locked');
    await unlock();
    // staged, the card owns the keyboard (clicker), like slides
    await page.click('.w-yt .wFocus');
    expect(await page.evaluate(() =>
      !!document.activeElement &&
      document.activeElement.classList.contains('ytFrame')),
      'staged YouTube card did not take the keys');
    await page.click('#unfocusBtn');
    // closing the card silences it: the frame is blanked
    await page.click('.w-yt .wClose');
    expect(await page.evaluate(() =>
      !document.querySelector('.ytFrame')), 'frame survived close');
    // sanitize agrees with the runtime rule: non-YouTube stations DIE,
    // youtube watch links normalize, on RELOAD of a hand-edited config
    const pg2 = await loadFixture('tmp_yt_hostile.html', JSON.stringify({
      schemaVersion: 4, appVersion: '6.26.0',
      scenes: [{ name: 'S', widgets: [
        { type: 'clock', x: 0, y: 0, w: 40, h: 50 },
        { type: 'yt', x: 45, y: 5, w: 40, h: 60,
          url: 'https://evil.example/x',
          stations: [
            { name: 'ok', url: 'https://www.youtube.com/watch?v=abc123defg4' },
            { name: 'bad', url: 'https://x.example/0' }
          ] }
      ]}],
      activeScene: 'S'
    }));
    const cleaned = await pg2.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'yt');
      return { url: w.url, stations: w.stations };
    });
    expect(cleaned.url === '' && cleaned.stations.length === 1 &&
           cleaned.stations[0].url ===
             'https://www.youtube-nocookie.com/embed/abc123defg4',
      'hostile yt config survived sanitize: ' + JSON.stringify(cleaned));
    await pg2.close();
  });

  await t('v6.33: every library pill is a distinct, valid nocookie embed', async () => {
    await openAt('');
    await launch();
    await addW('addYtBtn');
    await page.click('.ytLibBtn');               // open (a pick closes it)
    const n = await page.locator('.ytLib .pill').count();
    expect(n >= 30, 'library shrank: ' + n);
    const seen = new Set();                      // dupes anywhere, not just adjacent
    for (let i = 0; i < n; i++) {
      if (i > 0) await page.click('.ytLibBtn');  // reopen after each pick
      await page.locator('.ytLib .pill').nth(i).click();
      const src = await page.evaluate(() =>
        document.querySelector('.ytFrame').getAttribute('src') || '');
      expect(src.startsWith('https://www.youtube-nocookie.com/embed/'),
        'pill ' + i + ' produced a non-nocookie src: ' + src);
      expect(!seen.has(src),
        'pill ' + i + ' is a dupe or was refused (keep-last-good): ' + src);
      seen.add(src);
    }
    await page.click('.w-yt .wClose');
  });

  await t('v6.18 motion: serpent glides; the sea sleeps during stage mode', async () => {
    const pg = await ctx.newPage(); watchErrors(pg);
    await pg.emulateMedia({ reducedMotion: 'no-preference' });
    await pg.goto(url);
    await pg.waitForTimeout(350);
    await pg.click('#launchBtn');
    await pg.waitForTimeout(150);
    await pg.evaluate(() => window.Deckhand.sea('serpent'));
    expect(await pg.evaluate(() => {
      const s = document.getElementById('sea-serpent');
      return s.classList.contains('go') &&
             getComputedStyle(s).animationName.includes('ssGlide') &&
             getComputedStyle(s.querySelector('.ssSwim')).animationName.includes('ssDive') &&
             getComputedStyle(s.querySelector('.ssHump')).animationName.includes('ssBob') &&
             getComputedStyle(s).visibility === 'visible';
    }), 'serpent not gliding/diving/bobbing');
    // v6.20: the whale surfaces, spouts, and its rig animates
    await pg.evaluate(() => {
      document.getElementById('sea-serpent').classList.remove('go');
      window.Deckhand.sea('whale');
    });
    expect(await pg.evaluate(() => {
      const w = document.getElementById('sea-whale');
      return w.classList.contains('go') &&
             getComputedStyle(w.querySelector('.whSurf')).animationName.includes('whSurf') &&
             getComputedStyle(w.querySelector('.whSpout')).animationName.includes('whSpout');
    }), 'whale not performing');
    await pg.evaluate(() =>
      document.getElementById('sea-whale').classList.remove('go'));
    // staged: entering stage ENDS a live show (display:none cancels the
    // animation; a leftover .go would pop out mid-screen after Exit)…
    await pg.click('.w-settle .wFocus');         // v6.29: default = settle
    expect(await pg.evaluate(() =>
      !document.getElementById('sea-serpent').classList.contains('go')),
      'stage entry left the serpent playing');
    // …and the scheduler must stay quiet
    await pg.evaluate(() => window.Deckhand.seaEvery(70));
    await pg.waitForTimeout(450);
    expect(await pg.evaluate(() =>
      ![...document.querySelectorAll('.seaThing')].some(el =>
        el.classList.contains('go'))),
      'the sea played during stage mode');
    await pg.keyboard.press('Escape');           // Exit: the sea wakes back up
    await pg.waitForTimeout(700);
    expect(await pg.evaluate(() =>
      [...document.querySelectorAll('.seaThing')].some(el =>
        el.classList.contains('go'))),
      'the sea never woke after stage');
    // v6.19: the scheduler never stacks a second visitor on a live one
    await pg.waitForTimeout(300);
    expect(await pg.evaluate(() =>
      [...document.querySelectorAll('.seaThing')].filter(el =>
        el.classList.contains('go')).length) === 1,
      'two sea things at once');
    await pg.close();
  });

  await t('v1 config migrates 1->2->3->4: paired groups, nudge kept, enabled honored', async () => {
    const pg = await loadFixture('tmp_mig1.html', v1cfg(true));
    let c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.schemaVersion === 4 && c.bell.groups.length === 2,
      'groups: ' + c.bell.groups.length);
    expect(c.scenes.length === 1 && c.scenes[0].name === 'Daily Board' &&
           c.scenes[0].widgets.length === 2, 'scenes not defaulted');
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

  await t('v3 config migrates to 4: scenes defaulted, bells and prefs kept', async () => {
    const pg = await loadFixture('tmp_mig3.html', JSON.stringify({
      schemaVersion: 3, appVersion: "5.3.3", ownerName: "Mr. Shaffer",
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: true },
      timer: { presetsMinutes: [2, 4], defaultSeconds: 240, style: "tide" },
      bell: { nudgeSeconds: 120, showProgressBar: true, defaultGroup: "Teal Week",
              autoWeek: true, anchorMonday: "2026-08-31", anchorWeekName: "Black Week",
              groups: [ { name: "Teal Week", regular: BLK, wednesday: BLK },
                        { name: "Black Week", regular: BLK, wednesday: BLK } ] }
    }));
    const c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.schemaVersion === 4, 'schema: ' + c.schemaVersion);
    expect(c.scenes.length === 1 && c.scenes[0].name === 'Daily Board' &&
           c.scenes[0].widgets.length === 2, 'scenes: ' + JSON.stringify(c.scenes));
    expect(c.activeScene === 'Daily Board' && c.ui.locked === false, 'ui defaults');
    expect(c.bell.groups.length === 2 && c.bell.autoWeek === true &&
           c.bell.nudgeSeconds === 120, 'bell lost');
    expect(c.timer.style === 'tide' && c.clock.showSeconds === true, 'prefs lost');
    await pg.click('#launchBtn');
    await pg.waitForTimeout(150);
    expect(await pg.locator('.w-settle').count() === 1, 'board did not render');
    await pg.close();
  });

  await t('saved clockless scene reopens with NO ghost clock', async () => {
    const pg = await loadFixture('tmp_noclock.html', JSON.stringify({
      schemaVersion: 4, appVersion: "6.0.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Timers Only",
      scenes: [{ name: "Timers Only", widgets: [
        { type: "timer", x: 10, y: 10, w: 40, h: 60, label: "Solo" }
      ]}],
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: false },
      timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
              groups: [] }
    }));
    await pg.click('#launchBtn');
    await pg.waitForTimeout(150);
    expect(await pg.locator('#clockWidget').isHidden(), 'ghost clock visible at boot');
    expect(await pg.locator('#canvas .widget:visible').count() === 1,
      'widgets: ' + await pg.locator('#canvas .widget:visible').count());
    expect(!(await pg.locator('#addClockBtn').isDisabled()), 'add-clock disabled');
    await pg.click('#addBtn');
    await pg.click('#addClockBtn');            // clock can be brought back and managed
    expect(!(await pg.locator('#clockWidget').isHidden()), 'clock did not mount');
    await pg.click('#clockWidget .wClose');
    expect(await pg.locator('#clockWidget').isHidden(), 'remounted clock unmanaged');
    await pg.close();
  });

  await t('pin: saved pin reloads pressed + stacked on top; junk pin values sanitized', async () => {
    const pg = await loadFixture('tmp_pin.html', JSON.stringify({
      schemaVersion: 4, appVersion: "6.9.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 50, h: 60, pin: "yes please" },
        { type: "timer", x: 5, y: 5, w: 30, h: 40, label: "Solo", pin: true },
        { type: "stopwatch", x: 8, y: 8, w: 30, h: 40, label: "Watch", pin: 0 }
      ]}],
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: false },
      timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
              groups: [] }
    }));
    const pins = await pg.evaluate(() =>
      window.Deckhand.config.scenes[0].widgets.map(w => w.pin));
    expect(JSON.stringify(pins) === JSON.stringify([false, true, false]),
      'pins: ' + JSON.stringify(pins));
    await pg.click('#launchBtn');
    await pg.waitForTimeout(200);
    expect(await pg.getAttribute('.w-timer .wPin', 'aria-pressed') === 'true',
      'saved pin not pressed on ⇈');
    // pinned timer stacks above the later-mounted, overlapping stopwatch
    // with zero taps — initial stacking must honor the saved pin
    const onTop = await pg.evaluate(() => {
      const b = document.querySelector('.w-timer').getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el ? !!el.closest('.w-timer') : false;
    });
    expect(onTop, 'saved pin ignored at boot');
    await pg.close();
  });

  await t('pin: try-and-undo on a default (scene-less) board leaves the board clean', async () => {
    const pg = await loadFixture('tmp_pin_clean.html', JSON.stringify({
      schemaVersion: 4, appVersion: "6.9.0", ownerName: "Mr. Shaffer",
      ui: { locked: false },                     // NO scenes key: DEFAULT_SCENES path
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: false },
      timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
              groups: [] }
    }));
    await pg.click('#launchBtn');
    await pg.waitForTimeout(150);
    await pg.click('.w-settle .wPin');           // pin… (v6.29: default = settle)
    expect(await pg.evaluate(() => window.Deckhand.dirty) === true, 'pin not dirty');
    await pg.click('.w-settle .wPin');           // …and undo
    expect(await pg.evaluate(() => window.Deckhand.dirty) === false,
      'pin round trip left a phantom dirty dot');
    await pg.close();
  });

  await t('wave-4 config sanitized: junk dates, count clamps, agenda caps', async () => {
    const junkAgenda = [];
    for (let i = 0; i < 20; i++) junkAgenda.push({ text: 'Item ' + i, done: i === 1 ? 'yes' : (i === 2) });
    junkAgenda[5] = { text: '   ', done: true };            // whitespace-only: dropped
    const pg = await loadFixture('tmp_w4.html', JSON.stringify({
      schemaVersion: 4, appVersion: "6.10.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "event", x: 0, y: 0, w: 30, h: 40, label: "Ev",
          title: 12345, when: "next tuesday" },
        { type: "event", x: 32, y: 0, w: 30, h: 40, label: "Ev2",
          title: "Quarter ends", when: "2026-10-16T14:05" },
        { type: "event", x: 64, y: 0, w: 30, h: 40, label: "Ev3",
          title: "Phantom", when: "2026-13-40" },  // shape-valid, calendar-impossible
        { type: "tally", x: 0, y: 42, w: 30, h: 40, label: "Ta",
          items: ["junk", { name: "A", count: 99999 }, { name: "B", count: -4 },
                  { name: "C", count: 7 }] },
        { type: "agenda", x: 32, y: 42, w: 30, h: 40, label: "Ag", items: junkAgenda },
        { type: "agenda", x: 64, y: 42, w: 30, h: 40, label: "AgP",
          perPeriod: true, period: "__proto__",
          // PROTO_KEY placeholder: a real "__proto__" literal would set the
          // prototype of this fixture object instead of being data
          pages: { "PROTO_KEY": [{ text: "evil", done: false }],
                   "2nd": [{ text: "ok", done: true }] } }
      ]}],
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: false },
      timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
              groups: [] }
    }).replace('"PROTO_KEY"', '"__proto__"'));
    const ws = await pg.evaluate(() => window.Deckhand.config.scenes[0].widgets);
    expect(ws[0].when === '' && ws[0].title === '', 'junk event kept: ' + JSON.stringify(ws[0]));
    expect(ws[1].when === '2026-10-16T14:05', 'good datetime lost');
    expect(ws[2].when === '', 'impossible date kept: ' + ws[2].when);
    // junk entries filter out BEFORE the 2-counter cap: A and B survive
    expect(ws[3].items.length === 2 && ws[3].items[0].name === 'A' &&
           ws[3].items[0].count === 9999 && ws[3].items[1].count === 0,
      'tally clamps: ' + JSON.stringify(ws[3].items));
    // junk lines drop BEFORE the 12-item cap: 12 real items survive
    expect(ws[4].items.length === 12 && ws[4].items[1].done === false &&
           ws[4].items[2].done === true &&
           ws[4].items.every(i => i.text.trim()),
      'agenda caps: ' + JSON.stringify(ws[4].items.map(i => [i.text, i.done])));
    // __proto__ never survives as a period override or a page key
    expect(ws[5].period === '' &&
           !Object.prototype.hasOwnProperty.call(ws[5].pages, '__proto__') &&
           ws[5].pages['2nd'].length === 1,
      'proto page kept: ' + JSON.stringify({ p: ws[5].period, k: Object.keys(ws[5].pages) }));
    expect(await pg.evaluate(() => Object.prototype.text === undefined &&
           !Array.isArray(Object.prototype.items)), 'prototype polluted');
    await pg.click('#launchBtn');
    await pg.waitForTimeout(200);
    expect(await pg.locator('.w-event').count() === 3 &&
           await pg.locator('.w-tally .tlCard').count() === 2 &&
           await pg.locator('.w-agenda .agItem').count() === 12, 'board did not render all three');
    await pg.close();
  });

  await t('sanitize: geometry stays on-canvas, labels dedupe, bell blocks bounded', async () => {
    const blocks = [];
    for (let i = 0; i < 30; i++){
      blocks.push({ label: 'P' + i, start: '9:0' + (i % 10), end: '10:0' + (i % 10) });
    }
    blocks.push({ label: 'BadStart', start: 'nine am', end: '10:00' });
    blocks.push({ label: 'HugeEnd', start: '9:00', end: 'x'.repeat(100000) });
    const pg = await loadFixture('tmp_hard.html', JSON.stringify({
      schemaVersion: 4, appVersion: "6.11.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "timer", x: 95, y: 90, w: 100, h: 100, label: "Timer" },
        { type: "stopwatch", x: 4, y: 4, w: 30, h: 40, label: "Timer" }
      ]}],
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: false },
      timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "Teal Week",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
              groups: [{ name: "Teal Week", regular: blocks, wednesday: [] }] }
    }));
    const c = await pg.evaluate(() => window.Deckhand.config);
    const w0 = c.scenes[0].widgets[0], w1 = c.scenes[0].widgets[1];
    expect(w0.x + w0.w <= 100 && w0.y + w0.h <= 100,
      'off-canvas geometry kept: ' + JSON.stringify(w0));
    expect(w1.label === 'Timer 2', 'duplicate label kept: ' + w1.label);
    expect(c.bell.groups[0].regular.length === 20 &&
           c.bell.groups[0].regular.every(b => /^\d{1,2}:\d{2}$/.test(b.start) &&
                                               /^\d{1,2}:\d{2}$/.test(b.end)),
      'bell blocks unbounded: ' + c.bell.groups[0].regular.length);
    await pg.click('#launchBtn');
    await pg.waitForTimeout(200);
    expect(await pg.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 1),
      'board scrolls sideways');
    await pg.close();
  });

  await t('corrupted config block: visible banner, defaults load, download refuses', async () => {
    const pg = await loadFixture('tmp_bad.html', '{"schemaVersion": 4, THIS IS NOT JSON');
    expect(!(await pg.locator('#cfgWarn').isHidden()), 'no fallback banner');
    expect((await pg.locator('#cfgWarn').textContent()).includes('unchanged'),
      'banner does not reassure about the file on disk');
    const c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.scenes[0].name === 'Daily Board' && c.bell.groups.length === 0,
      'not on defaults');
    await pg.evaluate(() => document.getElementById('dlBtn').click());
    expect((await pg.locator('#setErrors').textContent()).includes('Download disabled'),
      'download not refused: ' + await pg.locator('#setErrors').textContent());
    // the banner is informational: it must never eat taps (it covered the
    // stage-mode focus bar and stranded a touch-only teacher)
    expect(await pg.evaluate(() =>
      getComputedStyle(document.getElementById('cfgWarn')).pointerEvents) === 'none',
      'cfgWarn banner intercepts taps');
    await pg.close();
  });

  await t('dirty dot: noise-game records never light it; real edits still do', async () => {
    const pg = await loadFixture('tmp_rec.html', JSON.stringify({
      schemaVersion: 4, appVersion: "6.11.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 50, h: 60 },
        { type: "meter", x: 52, y: 0, w: 40, h: 60, label: "Noise",
          limit: 60, records: {} }
      ]}],
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: false },
      timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "",
              groups: [] }
    }));
    await pg.click('#launchBtn');
    await pg.waitForTimeout(150);
    expect(await pg.evaluate(() => window.Deckhand.dirty) === false, 'dirty at boot');
    await pg.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'meter');
      w.records['3rd'] = 300;                    // the game setting a record
    });
    expect(await pg.evaluate(() => window.Deckhand.dirty) === false,
      'a quiet-streak record lit the dirty dot');
    await pg.evaluate(() => {
      const w = window.Deckhand.config.scenes[0].widgets.find(x => x.type === 'meter');
      w.limit = 70;                              // a real teacher edit
    });
    expect(await pg.evaluate(() => window.Deckhand.dirty) === true,
      'real change missed with records excluded');
    await pg.close();
  });

  await t('roster config sanitized: duplicate periods, junk names, caps', async () => {
    const pg = await loadFixture('tmp_ros.html', JSON.stringify({
      schemaVersion: 4, appVersion: "6.2.0", ownerName: "Mr. Shaffer",
      ui: { locked: false }, activeScene: "Daily Board",
      scenes: [{ name: "Daily Board", widgets: [
        { type: "clock", x: 0, y: 0, w: 58, h: 100 },
        { type: "picker", x: 61, y: 0, w: 39, h: 100, period: 7, size: "huge" },
        { type: "text", x: 5, y: 5, w: 20, h: 20, text: 12345 },
        { type: "embed", x: 55, y: 5, w: 20, h: 20, perPeriod: "yes", period: 42,
          decks: { "__proto__": "https://evil.example/x", "2nd": "javascript:alert(1)",
                   "3rd": "https://ok.example/deck", "": "https://ok.example/empty" } },
        { type: "score", x: 30, y: 5, w: 20, h: 20, teams: [{ name: 9, score: "x" }, null, { name: "Reds", score: 4.7 }] }
      ]}],
      rosters: [
        { period: "2nd", names: ["Ava", "", "Ben", 5, "  Cai  "] },
        { period: "2nd", names: ["Dupe"] },
        { period: "", names: ["X"] },
        "junk",
        { period: "3rd", names: "oops" }
      ],
      sound: { enabled: true, volume: 0.25 },
      clock: { showSeconds: false },
      timer: { presetsMinutes: [1,3,5,10], defaultSeconds: 300, style: "ring" },
      bell: { nudgeSeconds: 0, showProgressBar: true, defaultGroup: "none",
              autoWeek: false, anchorMonday: "2026-08-31", anchorWeekName: "", groups: [] }
    }));
    const c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.rosters.length === 1, 'rosters kept: ' + JSON.stringify(c.rosters));
    expect(c.rosters[0].period === '2nd' && c.rosters[0].names.join('|') === 'Ava|Ben|Cai',
      'names: ' + JSON.stringify(c.rosters[0]));
    const w = c.scenes[0].widgets[1];
    expect(w.type === 'picker' && w.period === '' && w.size === undefined,
      'widget fields not scrubbed: ' + JSON.stringify(w));
    expect(c.scenes[0].widgets[2].text === '', 'junk text kept: ' +
      JSON.stringify(c.scenes[0].widgets[2]));
    const em = c.scenes[0].widgets[3];
    expect(em.type === 'embed' && em.perPeriod === false && em.period === '',
      'embed flags not scrubbed: ' + JSON.stringify(em));
    expect(Object.keys(em.decks).join('|') === '3rd' && em.decks['3rd'] === 'https://ok.example/deck',
      'hostile decks kept: ' + JSON.stringify(em.decks));
    expect(Object.getPrototypeOf(em.decks) === Object.prototype &&
           !Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'),
      'prototype touched');
    const sc = c.scenes[0].widgets[4];
    expect(sc.teams.length === 2 && sc.teams[0].name === 'Team 1' && sc.teams[0].score === 0 &&
           sc.teams[1].name === 'Reds' && sc.teams[1].score === 5,
      'score teams not scrubbed: ' + JSON.stringify(sc.teams));
    await pg.click('#launchBtn');
    await pg.waitForTimeout(150);
    expect(await pg.locator('.w-picker').count() === 1, 'picker did not render');
    await pg.close();
  });

  await t('hostile config + string schemaVersion + garbage scenes tolerated', async () => {
    const pg = await loadFixture('tmp_host.html',
      '{"schemaVersion":"3","ownerName":42,"sound":null,"timer":{"presetsMinutes":"x"},"bell":{"groups":"oops"},' +
      '"ui":7,"activeScene":42,"scenes":[{"widgets":[{"type":"clock","x":-40,"y":"a","w":9000,"h":2},' +
      '{"type":"evil"},{"type":"timer"},"junk"]},null]}');
    expect(/^Good (morning|afternoon|evening)!$/.test((await pg.textContent('#greet')).trim()),
      'greet: ' + await pg.textContent('#greet'));
    await pg.click('#launchBtn');
    await pg.click('#startBtn');
    await pg.waitForTimeout(250);
    expect((await pg.textContent('#startBtn')).trim() === 'Pause', 'timer dead');
    const c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.scenes.length === 1 && c.scenes[0].widgets.length === 2, 'scene not scrubbed');
    const cl = c.scenes[0].widgets[0];
    expect(cl.type === 'clock' && cl.x === 0 && cl.y === 4 && cl.w === 100 && cl.h === 10,
      'clock coords not clamped: ' + JSON.stringify(cl));
    await pg.close();
  });

  await t('round trip: download keeps schema-4 config + canvas layout', async () => {
    await openAt('');
    await launch();
    await page.selectOption('#sceneSel', 'Stations');
    await page.waitForTimeout(200);
    await page.click('#lockBtn');
    await page.click('#setBtn');
    await page.fill('#sNudge', '45');
    const [ dl ] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#dlBtn')
    ]);
    // v6.12: STABLE filename — same name in, same name out, so the browser
    // offers to replace the old copy instead of forcing a rename ritual
    expect(dl.suggestedFilename() === 'Deckhand_v6.html',
      'filename: ' + dl.suggestedFilename());
    const saved = path.resolve(__dirname, 'tmp_rt.html');
    await dl.saveAs(saved);
    const pg = await ctx.newPage(); watchErrors(pg);
    await pg.goto('file://' + saved);
    await pg.waitForTimeout(350);
    const c = await pg.evaluate(() => window.Deckhand.config);
    expect(c.schemaVersion === 4 && c.bell.nudgeSeconds === 45 &&
           c.bell.groups.length === 2 && c.bell.groups[0].name === 'Teal Week' &&
           c.bell.autoWeek === true && c.bell.anchorMonday === '2026-08-31' &&
           c.timer.style === 'ring' && c.bell.showCountdown === true &&
           c.bell.warnMinutes === 5 && c.bell.bathroom.enabled === true &&
           c.bell.showNextClass === true && c.clock.showSeconds === false,
      JSON.stringify({ s: c.schemaVersion, n: c.bell.nudgeSeconds,
                       g: c.bell.groups.map(g => g.name) }));
    expect(c.activeScene === 'Stations' && c.ui.locked === true &&
           c.scenes.length === 2 && c.scenes[1].widgets.length === 5,
      'canvas state: ' + JSON.stringify({ a: c.activeScene, l: c.ui.locked }));
    expect(await pg.evaluate(() => document.body.classList.contains('locked')),
      'saved copy did not reopen locked');
    await pg.close();
  });

  /* ---------- screenshots ---------- */
  await openAt('#t=2026-09-08T10:30');
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'shot_landing.png' });
  await launch();
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'shot_board.png' });
  await page.selectOption('#sceneSel', 'Stations');
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'shot_stations.png' });
  await page.click('#lockBtn');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'shot_locked.png' });

  console.log(results.join('\n'));
  console.log('\nJS errors: ' + (errors.length ? '\n' + errors.join('\n') : 'none'));
  console.log('\n' + (failCount === 0 && errors.length === 0 ? 'ALL GREEN' : failCount + ' FAILURES'));
  await browser.close();
  process.exit(failCount === 0 && errors.length === 0 ? 0 : 1);
})();
