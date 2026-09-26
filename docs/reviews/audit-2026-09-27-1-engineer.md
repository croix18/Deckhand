# Deckhand v7.5.0 — Engineering audit (Sep 27, 2026)

Reviewer: an engineering-audit agent briefed as a senior Apple software engineer. It read the
whole repo (the config pipeline, Store/SaveState, Bell, Canvas, Settings and Keys line by
line; the rest sampled), ran the app at 1920×1080, in stage mode and at 700×500, ran the
suite (194/194), profiled under 6× CPU throttle, and wrote a repro script for every bug
below. Repro scripts and screenshots were kept in the session scratchpad; the findings
are reproduced here. No project files were changed by the audit.

## A. Verdict

As an internal tool used by one expert operator, this would ship after a short, specific
punch list. It would not ship as a product in its current form. For a one-person,
one-month project it is unusually disciplined: config is sanitized when read, field by
field; every user string goes through `textContent`; timers compute from timestamps
instead of decrementing counters; the alarm always takes focus back; drags survive the
element being removed mid-drag; the handoff records the failed approaches as well as the
working ones.

The weak spots are at the seams between features added on different days. Every real bug
found sits between two features that each have green tests: the suite's legacy timer ids
collide with a Settings button; the TODAY row doesn't talk to the settle-in's bell watch;
the saved-deck library shipped without a matching update to the privacy guard; Lock
doesn't cover Settings. It also ships decoration faster than it hardens the parts that
must not fail (five minor releases in about 48 hours). Tier: excellent indie/prosumer
tool; at Apple, "internal tool, ship with fixes", one hardening pass short of first-party.

## B. Architecture

**The single file is correct for the constraints** (file:// from DriveFS, no build, no
accounts, github.io blocked). The cost is review surface: 10,907 lines, 540 KB, 2,150
lines of CSS, ~8,000 lines of JS in one strict-mode IIFE. Boot is not the problem: ready
in 352 ms, 791 ms under 6× throttle.

**The IIFE modules** are sound at this size. The real coupling is shared mutable state:
`cfg` mutated in place from ~100 sites; modules calling each other directly (`Alarm.isOn`
from Ink, Sea and the embed card; `Canvas.refocusDeck` from Alarm; `Settings.isOpen` from
the settle factory); the `typeof Settings !== "undefined"` guard (~6510) shows how much
depends on boot order. The boot loop isolates each `init` in try/catch, but a failure only
reaches `console.error`, and nobody reads the console on a classroom panel.

**The config pipeline** (parse → migrate → sanitize → boot, device store wins).
`sanitize()` (~2993–3337) is the best code in the file: every field type-checked with its
own fallback, lists capped, prototype-poisoning keys refused, geometry invariants enforced,
rich-note HTML re-sanitized on load. The fragile part: `sanitize()` is the only schema for
20 widget types, 350 lines, far from the factories that own those fields, and its
allowlist drops any field it doesn't know — every new widget field needs a matching clause
or it silently vanishes on reload. Periods are joined by display label in at least six
maps (rosters, decks, agenda pages, settle `perPeriod`, noise tally, noise records);
renaming a period orphans all of them. `schemaVersion` has been 4 since v6 while the
shape roughly doubled.

**Widget factory contract** `(host, wcfg) → {kind, label, startPause, reset, canEnter,
entryActive, rebuild, resync, destroy, running?}` is duck-typed and applied consistently;
cleanup in `destroy` is careful. The timer is special-cased at `buildDynamic`, which is
exactly where bug C4 comes from.

**Z strata** are correct and well commented (sea 0, canvas 1, ink 14, dock 15, ink bar 16,
settings 20, sheets 21, banners 25, alarm 30; inside the canvas taps from 0, focused
250,000, pinned/floating 500,000, focus bar 900,000). `zTop` is never renormalized.

**Event plumbing:** four document-level CustomEvents plus about twelve independent polling
loops (Clock 250 ms, Bell 500 ms, each Next-Bell widget 500 ms, each settle 250 ms, each
timer's until-bell check 5 s, each embed 5 s, ghostSync 700 ms, Sea 10 s, SaveState
2.5 s), each recomputing `Bell.statusAt()` from scratch and re-parsing time strings.

**Refactor first:** (1) one tick bus — a single 250 ms scheduler computing one status
snapshot and publishing transitions (period start, schedule change, clock jump), which
fixes C6 and C9 by construction; (2) per-widget schema registration `{defaults, sanitize,
make}` so a widget's shape lives next to its factory.

## C. Reliability and data safety (all reproduced)

1. **"Device store wins" also means "device store gets overwritten".** When the stored copy
   fails to parse or migrate it is ignored (~3624–3639) with a comment promising it is never
   deleted; then `SaveState.init` sees `cfgSource !== "device"` and writes the file's seed
   over it (~10583). Repro: a device copy with `schemaVersion: 5` and two rosters, after
   one boot, has `schemaVersion: 4` and no rosters. The day a release bumps the schema,
   opening any older Drive copy silently wipes the newer board. The update nudge also fires
   on downgrades.
2. **A full storage quota looks like total data loss.** The store's write probe also gates
   reads. On `file://` every local file shares one origin (the Seating Chart, Cadence, the
   sea memory, Deckhand's config share one ~5 MB quota). Filling the quota and reloading
   gives `Store.ok:false`, source `file`, no rosters, with the real board still in storage;
   no warning at boot; Settings says "This browser blocks saving", which is wrong.
3. **Lock is not a boundary.** A locked board still allows: Settings (rename the owner —
   the pennant then flies "<name> Rules" — edit rosters and bells, export, two-tap wipe the
   device copy); H → landing, where digits 1–3 re-pick the week; the scene dropdown
   (`loadScene → clearScene` destroys running timers: a running timer, locked, switched to
   Stations and back, comes back at 5:00 stopped); the empty-state paste box on a Slides
   card (a locked board accepted `https://example.com/`); the boat's long press
   (`earned()`), which has no cooldown.
4. **Duplicate `id="resetBtn"`.** The first timer receives legacy ids "so the long-standing
   test suite keeps working" (~4547), including `resetBtn`, which is also the Settings
   reset button. `$("resetBtn")` returns the timer's. Opening Settings relabels the timer's
   Reset button "Use this file's settings"; the first tap on the real reset turns the
   timer's button coral and relabels it "Really replace the device copy?" while the actual
   destructive button shows no armed state. The ⏱ summon always creates the first timer, so
   this hits every lesson with a timer and a trip to Settings. Test infrastructure leaking
   into production caused a user-visible bug.
5. **Privacy guard gaps.** `tools/check.sh` scans only `w.url`, `decks` and `stations`. It
   passed a config containing a saved-deck library URL (`embed.saved[]`, added in 7.1), a
   note reading "Detention: Maria G., Tyler P.", and scoreboard teams "Ava + Ben". Notes,
   agenda items, tally and score names, event titles and `msgDone` are free text where
   student names naturally end up.
6. **Schedule edits mid-period.** `bellWatch` (~6504) re-baselines only on a new week index
   or while Settings is open. `Bell.setToday` (the TODAY chips and the Custom-day sheet)
   does neither. Repro: Black Monday 10:08, tap "Wednesday times": the label flips 6th →
   5th and the settle-in starts "Find your seat 29" mid-class, with ticks and then the
   comment-card message; if the new block is index 0 the Pledge flag fires too.
7. **Clock changes.** Every duration uses `Date.now()` (timer `endAt`, settle, stopwatch).
   An NTP correction after wake shifts running timers; a backwards jump across a period
   start re-fires the settle routine. Use `performance.now()` for durations and watch
   drift in one place.
8. **Crash mid-alarm.** Alarm state is a CSS class and dismissal is a plain `click`, so
   nothing in-page blocks it — correct. A reload loses every running timer and the alarm;
   config is at most 2.5 s stale; boot returns to the landing page. `beforeunload` prompts
   only when a save failed, so a kid pressing F5 or Ctrl+W during a quiz kills every timer
   silently.
9. **Smaller:** Absent marks are session-only and undated (yesterday's absences carry into
   today on a machine left on); `window.prompt` blocks the main thread (no bell, settle or
   alarm fires while it's open); Export re-serializes `outerHTML` captured at boot, not the
   source bytes (a different file every time; any node a managed extension injects at
   `document_start` would be baked into every export); the note sanitizer's `.slice(0,
   20000)` can split a tag (harmless, but the tail is dropped with no warning).

Praise that held up under test: `sanitize()`'s hostility handling, the "serializer must
never lie" check, `<` escaped in the baked JSON, `cancelDrag` and lost-capture teardown,
the iframe drag shield, the alarm's focus steal, the 45 s de-escalation to a corner badge.

## D. Performance (headless Chromium, 6× CPU throttle, main-thread seconds per 8 s)

| State | Busy | Style+layout/s |
|---|---|---|
| Idle board, sea on | 0.91 (11%) | ~4.5 |
| Pledge flag | 0.70 | ~6 |
| Music playing | 0.88 | ~5 |
| 3 ring timers running | **6.76 (85%)** | ~52 |
| 3 tide timers running | 6.00 | ~46 |
| Digits timers running | 2.58 | ~15 |
| Whale act | 4.60 (58%) | ~59 |
| Attack act | 5.42 (68%) | ~57 |

Startup is fine. The 2.5 s flush is not a performance issue (one write in 20 s of idle).
**Timers are the hotspot:** `visFrame` runs `requestAnimationFrame` every frame to write
`stroke-dashoffset` on a ring that moves about a pixel every half second; tide writes
`style.height`, which forces layout; the baked config ships `style: "ring"`, so this is
the classroom default. Drive the ring with a CSS animation or cap it at 4–10 Hz; scale
tide with `transform: scaleY`. **The sea:** idle waves are compositor-only (good), but
acts animate `<g>` elements inside inline SVG, which Chrome runs on the main thread;
layout count climbs ~57/s during an act; `ok()` keeps the sea out of stage mode, which
bounds the damage. **Music:** the scheduler has 350 ms of lookahead; a stall longer than
~230 ms leaves `nextTime` in the past and whole bars get scheduled at stale times (resync
when `nextTime < currentTime`); `noiseBurst` allocates a new `AudioBuffer` per hit; each
music widget owns a separate AudioContext. **Embeds:** out-of-process iframes, so the cost
is memory; a Slides deck plus YouTube on a 4 GB Chromebox is the ceiling; shelved cards
(`display:none`) keep their frames loaded, and a shelved YouTube card keeps playing audio
with no visible control. Profile first on the panel itself: the Stations scene with ring
timers over a staged deck with the clicker in use; then the five minutes around a bell.

## E. Accessibility and input

39 controls measure under 44 CSS px (header pills 40, timer chips 30, Start/+1/Reset 38,
scene select 29, ink swatches 34, resize handles 14–28); on a 65–75" panel 30 px is ~25
mm, so physical size is fine — the real IR problem is accuracy near the bezel: the dock
hugs the bottom-left edge and Exit/Timer sit in the top-right corner. Inset critical
controls by ≥24 px. Contrast: the calm alarm badge renders `#alarmWho` white on coral,
2.47:1, the exact pairing the 7.0 contrast pass says it fixed; teal on pale turquoise is
4.43:1 (the + Add descriptions). Settings is a real `role=dialog aria-modal` with a Tab
trap and focus restore; the tab rail is a proper tablist; the alarm is `role=alert` and
takes focus. Single-letter shortcuts have no off switch (WCAG 2.1.4). The alarm still says
"Click anywhere to dismiss" on a touch panel. Reduced motion has two sources of truth
(`REDUCED` read once at load vs the live `waveMotionOn()`), and the "Waterline motion: On"
override also enables the flag sway and sheen. The suite runs under reduced motion by
default, so the classroom's motion-on path is the less-tested one. `#bellSub` is
`aria-live` and rewritten every 500 ms.

## F. Security and privacy

**XSS:** every `innerHTML`/`insertAdjacentHTML` sink is static or numeric; user strings go
through `textContent`. `sanitizeNoteHTML` is correct: inert DOMParser document; `svg`,
`math`, `template` dropped with their contents (the namespace-confusion mXSS vectors);
unknown tags unwrapped so raw-text element contents are re-escaped; styles rebuilt from the
CSSOM against an allowlist; every attribute stripped. No bypass found. **Embeds:** the
allowlist applies only to YouTube (normalized to the nocookie player); the Slides card
accepts any http(s) URL, and both iframes have no `sandbox` attribute and grant `autoplay
*; fullscreen *`. Add `sandbox="allow-scripts allow-same-origin allow-popups
allow-presentation"` (no top-navigation) and verify Slides. `window.open` lacks `noopener`.
**The 7th grader with the keyboard:** everything in C3, plus F5/Ctrl+W with no guard, M to
mute, D to draw. Lock protects geometry, not configuration. **Public repo:** no tokens or
rosters in history; `push.sh` keeps the PAT out of argv; HANDOFF records PATs pasted into
chat — use a fine-grained single-repo short-expiry token or a deploy key. The larger
exposure is prose: README, HANDOFF and `hosting/apps-script/` publicly document, under a
real name at a named school, how to route around the district's github.io block through a
personal Apps Script deployment (`Code.gs` sets `XFrameOptionsMode.ALLOWALL`). That is a
professional-policy risk; move it to a private doc.

## G. Test suite

Strengths: 194 tests across file/touch/http, fresh context per test, errors collected from
every page, hostile-config fixtures; bell math, migrations, drag edge cases, alarm focus and
persistence basics covered well. **Every confirmed bug is a seam between features, and
there are no seam tests.** Untested and important: Lock as a boundary; storage full at
boot; a device copy with a future schema; the TODAY row against the bell watch; clock
jumps; overnight rollover of session state; performance budgets; `check.sh` has no
fixture it must refuse; export byte fidelity; no axe/contrast pass. Over-tested: ~12
timing-sensitive tests on the sea's decoration; tests named by version that encode history
rather than behavior; 485 `page.evaluate` calls reaching into `_entry` and `window.Deckhand`
— the white-box coupling that produced the legacy-id aliasing behind C4. 22 real sleeps and
a Pledge test that waits one real minute; `page.clock` would make every timer/settle/alarm
test deterministic. CI is a signal, not a gate.

## H. Ten most important fixes, ranked

1. **Make Lock a real boundary** (M): gate Settings, Home, landing digits and chips, scene
   switching and the empty-embed paste behind the 1.5 s hold; give the boat's long press a
   cooldown.
2. **Never overwrite an unreadable device copy** (S): quarantine it to
   `deckhand.config.bad-<ts>`, skip the auto-seed, banner, refuse to downgrade a newer schema.
3. **Read the store regardless of the write probe; boot banner on quota errors** (S).
4. **Delete the legacy timer ids** (S) and fix the tests.
5. **Turn `check.sh` into an allowlist diff against the canonical seed, plus a refusal
   test** (S).
6. **One schedule epoch for the bell watch** (S) covering the TODAY row, the Custom-day
   sheet and clock jumps.
7. **Throttle or composite the timer visuals** (S): ring via CSS animation or ≤10 Hz, tide
   via transform.
8. **Monotonic durations, plus a `beforeunload` guard while any timer runs** (S/M).
9. **Sandbox the embed iframes, replace `window.prompt` with the sheet pattern, date-key
   Absent** (S).
10. **Resync the lofi scheduler after stalls and reuse one noise buffer** (S).

Fix the calm-badge contrast in the same pass as #4; it's a one-line change.
