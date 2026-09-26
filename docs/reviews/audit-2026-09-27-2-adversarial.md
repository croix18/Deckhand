# Deckhand v7.5.0 — Adversarial review of the engineering audit (Sep 27, 2026)

Reviewer: a second engineering agent briefed to test every claim in
`audit-2026-09-27-1-engineer.md`, agree where right, knock down what's overstated, find
what it missed, and re-rank the fixes for a teacher building this in evenings. Everything
was reproduced headless against the real file over `file://`; the `file` suite ran green,
"and that result is itself evidence for the main finding".

## A. Verdict on the audit: B−

Its data-safety findings are real (C1, C2, C4, C5, C6 reproduced exactly as written) and its
central claim — bugs live at the seams between features — is correct. It falls short in
five ways: it missed a release-blocking regression visible in any screenshot of a timer;
its performance numbers are mostly headless software rasterization (right direction,
overstated magnitude); it frames Lock as a security boundary when Lock was designed to
protect layout (and the real bug hiding behind one "hole" — switching scenes destroys
running timers — happens unlocked too); its C7 fix (`performance.now()`) could make timers
worse on ChromeOS; and it reviewed the code more than the room. "Would ship as an
internal tool": not v7.5 as it stands, because the default timer is blank; 7.5.1 with the
one-line fix would.

## B. Claim by claim

- **C1 device copy overwritten — CONFIRMED, and worse.** The damage happens today without a
  schema bump: opening the v7.0 file over a v7.5 device copy emptied the rich note, dropped
  `pledge`, `perPeriod`, `saved`, `stageOnly`, `ui.seaWeather`, and re-stamped
  `fileVersion` 7.0.0 — the nudge's unconditional re-stamp write saves the old release's
  sanitized-down config. README says Export (same filename every time) is the backup, so
  opening an old Export is a realistic trigger.
- **C2 full quota — CONFIRMED.** 5.2 MB under other keys, reload: `Store.ok:false`, source
  `file`, 0 rosters, the real board still stored, no banner, "This browser blocks saving".
  Moderate likelihood (needs the Seating Chart or Cadence to fill the shared origin); a
  few-line fix.
- **C3 Lock — PARTLY CONFIRMED, missed context.** Settings and Home do open while locked on
  touch. Scene switching while locked is deliberate and commented ("a VIEW action"). The
  timer reset on scene switch is a scene bug, not a lock bug. Keyboard attacks need the
  Chromebox keyboard, not the panel. The one realistic kid attack: tap Settings, two-tap
  "Use this file's settings".
- **C4 duplicate `#resetBtn` — CONFIRMED and visible on the board.** Settings boots before
  Canvas so the destructive action stays wired; but the armed coral state lands on the
  timer button, and after Settings closes the timer's Reset **stays labelled "Use this
  file's settings"** in front of students.
- **C5 privacy guard — CONFIRMED, plus wider.** A note "Detention: Synth A., Synth B.", an
  `embed.saved` URL and team names passed `check.sh`. Also `push.sh` runs `git add -A`
  while `check.sh` inspects only `.html` config blocks: a Seating Chart backup JSON or a
  board photo dropped into the folder would publish unchecked.
- **C6 mid-period schedule edits — CONFIRMED, and worse.** Tapping "Regular times" to undo
  the Wednesday switch **fires the Pledge flag mid-class at 10:08**.
- **C7 clock changes — OVERSTATED; the fix is wrong for this platform.** NTP corrections
  after wake are sub-second; `performance.now()` on ChromeOS doesn't count sleep, so a timer
  across a device sleep would come back wrong. A bell-driven tool should stay on wall-clock.
- **C8 crash mid-alarm — CONFIRMED but LOW.** `beforeunload` protects against a keyboard the
  kids rarely touch. What matters is that every boot lands on the landing page (C.4 below).
- **C9 — Absent undated confirmed; prompt and export fidelity real but low.**
- **D performance — direction CONFIRMED, magnitude OVERSTATED.** 8 s windows at 6× throttle:
  idle 0.7 s busy; ring timers 6.2 s (≈4.8 s of it paint/raster in headless *software*
  rendering — the panel rasterizes on its GPU); one ring costs the same as three (the cost
  is the 60 Hz redraw); capping the loop at 4 Hz cut it 62–64%. Still worth 15 minutes.
- **E accessibility — CONFIRMED, widened.** `#alarmWho` white on coral 2.47:1 in both the
  full-screen alarm and the badge. 34 controls under 44 px; physical size isn't the problem.
- **F security — MIXED.** XSS analysis holds. Adding `sandbox` to the Slides/YouTube
  iframes is field risk for near-zero benefit; don't without a panel test. The
  professional-risk point about publicly documenting the Apps Script workaround is right.
- **G tests — CONFIRMED, stronger evidence.** A suite that asserts `display !== "none"` but
  never opacity or pixels passed with the timer invisible. The missing test is "what the
  kids see".

## C. What the audit missed

1. **Ring timers, Next Bell and ghost timers are invisible (critical, new in 7.5).** The sea
   CSS `.ring{… opacity:0 …}` is unscoped and matches the timer's `.visWrap.ring` and Next
   Bell's. Computed opacity 0 in 7.5, 1 in 7.4. The ghosted timer over a staged view shows
   nothing; the alarm still rings at zero.
2. **The alarm is hidden behind a fullscreened deck (breaks hard constraint 4).**
   `allow="fullscreen *"` lets the player go fullscreen on its iframe; browser fullscreen
   sits above every z-index. Fix: at the top of `Alarm.ring`, `document.exitFullscreen()`
   if the fullscreen element isn't `documentElement`.
3. **Two open copies erase each other's changes.** No `storage` listener; a stale tab's
   layout nudge overwrote the other tab's rosters.
4. **The Pledge runs invisibly behind the landing page.** Booted at 9:19:50 without
   launching: at 9:20 the settle-in went flag-only behind "Good morning".
5. **The settle-in fires at Lunch (and HOWL).** "FIND YOUR SEAT 26" at 12:42; the per-period
   editor already excludes Lunch, so this looks unintended. Ask about HOWL.
6. **The back wave has a seam.** `#wv3` scrolls −80vw of a 160vw layer; for the last ~25% of
   each cycle the back wave is missing on the right. Fix: width 180vw.
7. **Ink gets slower the more you draw** — every pointer move redraws every stroke (31 ms
   with one stroke, 98 ms with 150 at 6× throttle).
8. **`tools/serve.js`** listens on all interfaces, serves dotfiles, and a malformed URL
   kills it.
9. **Week rotation is calendar parity.** If the district counts school weeks rather than
   calendar weeks, every week after Thanksgiving is flipped. Check the official sheet.

Non-issues checked: DST; the director with periods under 13 minutes; the music
AudioContext (created on a gesture); the noise meter (environmental, already closed).

## D. Re-ranked for this builder

**Evening 1 (7.5.1, before Monday):** scope the sea's `.ring` and add a pixel test for a
timer, Next Bell and a ghost; alarm exits deck fullscreen; rename the Settings reset id;
settle-in skips Lunch; a bell transition while the landing page is up launches the board;
`#wv3` to 180vw; `#alarmWho` to navy.

**Evening 2 (data safety):** if `storedFileVersion` is newer than this file, write nothing —
suspend autosave, banner "Saved by vX: open the newer file"; treat an unknown schema or a
corrupt copy the same way instead of seeding over it; a `storage` listener that suspends
autosave and says "changed in another window, reload"; read the store even when the write
probe fails, with a quota banner; re-baseline the settle-in when the TODAY row changes.

**Evening 3 (cheap hardening):** Settings and Home require the hold while locked; scene
switching asks first or keeps running timers; cap the ring/tide redraw at 4 Hz; date-key
Absent; `check.sh` requires the config block to equal the canonical seed plus a refusal
fixture; `push.sh` stages an allowlist; `serve.js` binds 127.0.0.1 and refuses dotfiles;
move the Apps Script write-up to a private doc.

**Evening 4:** Ink draws incrementally.

**Explicitly don't:** the tick-bus refactor or per-widget schema registration;
`performance.now()` durations; iframe `sandbox`; rewriting the suite on `page.clock`; a
shortcut off-switch; 44 px everywhere; `beforeunload` prompts; pruning the sea tests.

**Process:** freeze decorative features until the above lands. The sea release is what
broke the timer.

## E. If he reads nothing else

v7.5's sea styling accidentally hid every ring timer, the Next Bell widget, and the timer
floated over the slides. The suite and the first audit both missed it. Fix that line and
add a test that checks the ring's pixels. Next, stop the board from quietly overwriting
itself (an older copy opened over a newer one, two windows, the storage quota). Then: the
alarm must beat a fullscreened deck; the settle-in shouldn't run at Lunch; the first bell
shouldn't fire behind the landing page; Settings should need the hold when locked. About
two evenings. Skip the big refactors. Before Thanksgiving, check whether Teal/Black counts
calendar weeks or school weeks.
