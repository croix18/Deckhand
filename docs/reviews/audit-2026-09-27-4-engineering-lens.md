# Deckhand v7.5.0 — Read as a machine (Sep 27, 2026)

Reviewer: a technical-review agent briefed to apply the engineering sensibility associated
with Steve Wozniak — elegance as few parts doing much, understanding the whole machine,
reading every line — in its own voice. It read the JavaScript top to bottom (2937–10905),
the sea CSS/markup, SEA.md, the helpers and both earlier audits (and left their findings
alone). Every number came from a probe run headless against the real file.

## A. The parts count

10,907 lines: 2,045 CSS, ~780 markup, 7,968 JS (~7,000 code, ~850 block comments), carrying
20 widget types, a bell engine, a synthesizer, a QR encoder, an ink layer, a sea with a
director and a settings app — roughly 350 lines per real capability, fair for vanilla DOM
code. Long because it does a lot, not because of cleverness.

Tight: Clock (27 lines), Alarm (59), Keys (91; a real priority ladder, documented),
SaveState (106), `statusAt` (~30 lines answer every "where are we in the day" question),
the QR encoder (230 lines of GF(256) Reed–Solomon, interleaving and BCH codes — format-bit
placement checked against the spec bit by bit), `sanitizeNoteHTML` (~60).

Sprawl: Canvas (1,069 lines: drag, stage, ghosts, floats, summon, dock, scenes, lock),
Settings (619), Slides (400), settle-in (378). The sea is ~1,100 lines across CSS, markup
and JS — ~10% of the file for decoration against ~400 for the Bell, which is the product.

Fat: 82 `createElement` calls and 35 `type="button"` lines; Score and Tally are near
twins; Agenda and Slides each carry their own `resolvedPeriod`/`draftFor`/`fillPer`; one
`{label,start,end}` shape is validated four times; 31 prologue lines in the factories
re-check config shape; 16 near-identical keydown handlers; hand-written UTF-8 where
`TextEncoder` would do. Estimate: 700–900 JS lines (10–12%) could go with identical
behaviour; Canvas's stage logic and Settings could each lose close to half.

## B. The clever bits, judged on correctness

**The wave phase lock** is careful work: each half-wave's Bézier control at 0.364 (the
sine-approximation constant, within 0.03%); the heave easing matches (1−cos πx)/2 within
0.2%; the pitch sign and −T/4 delay derived independently and correct. The flaw is the
reference point: troughs sit at 42vw where `#boat` *begins*; the mast is 19 px further
right, and the drift adds up to 20 px more — 9–18° off on the swell, 22–46° on the chop
(31–64° at 1366 px). Fix: `left: calc(42vw - 19px)`. Zero-JavaScript phase lock is still
the right mechanism.

**Timers from timestamps**: correct; don't touch. **The sanitizer**: correct and in the
right order. **The config pipeline**: fuzzed with 3,000 hostile configs, `sanitize` is a
true fixed point (`sanitize(sanitize(x)) === sanitize(x)` every time) — "a real
achievement". Two holes: runtime-added widgets never pass through `sanitize` (hence the
31 prologue lines); the Score clause keeps the first four entries before discarding junk,
ten lines below the Tally clause whose comment explains why that order is wrong.

**The mulberry32 director**: constants right; `hash` is xmur3's loop without its
finalizer but mulberry32's mixing covers it; over 2,920 plans weather came out
19.7/55.6/24.7 against 20/55/25. The purity claim is broken by its own memory:
`seenFactor` counts *today's* sightings and `record` writes them as acts play, so a reload
mid-period re-plans against a different memory (758 of 1,040 simulated periods changed).
Fix: exclude the current date from `seenFactor`.

**The lofi engine**: the scheduler is right (audio-clock lookahead, no drift); the bus swap
is the correct way to cancel scheduled nodes; the voice leading has real craft (the
ii–V–I holds B and resolves F→E; progression 0 is idiomatic planing). Bugs: the Rhodes
tremolo LFO is added straight into the envelope gain, so a note decays only to −18 dB, sits
on a pulsing plateau, and cuts off with a click (put the tremolo in series as its own gain
stage: −55 dB, no click) — affects every note on Glass rhodes and Brushes; Brushes plays
an A natural over the borrowed F minor chord in bars 3 and 7 of every phrase; the pluck
sides' "answer a third down" subtracts 3 semitones, not a scale degree (C# against Cmaj7,
F# against G7); the chord labelled IV(add9) is an Fmaj7 voicing; 32 of 40 bass roots are
pure sines below 80 Hz and Fog's IV lands at 32.7 Hz — on a panel's speakers the bass is
mostly not there (use a triangle, or add the second harmonic).

**The chime**: click-free envelope, but the volume slider allows 0 and
`exponentialRampToValueAtTime(0)` throws; `tick()` guards it, its two siblings don't.
**Ink**: the midpoint-quadratic smoothing is correct; eraser as a `destination-out` stroke
makes Undo free; but the highlighter's `multiply` blends only with ink beneath it (no
`mix-blend-mode` on `#ink`) — over the slides it is plain 45% yellow. **Drag/resize/snap**:
correct in every piece; it snaps in pixels but stores percentages, so grid alignment holds
only at the placing resolution (harmless). **Bell math**: `parseClock` reads 6:00–5:59 as
the school day (no AM/PM field needed); week parity is DST-safe; the 90-minute pre-school
window is the one odd semantic (at 7:50 the header flips to "Passing → 1st" and the
progress bar reverses).

## C. Three traces

**A bell → settle → stage → sea.** The settle's own 250 ms watch sees the transition;
`start(true, idx===0)`; `tell("start")`; Canvas stages it (`Sea.clear()`, focusMode, dock
folded); the count; `tell("end")`; Canvas stages the first Slides widget and re-floats
ghost timers. The Sea's tick plans the period — but `ok()` rejects focusMode, and with a
deck staged all period focusMode stays on: **in the teacher's normal flow none of the
in-class dramaturgy ever plays.** About 200 lines aimed at a state the room rarely sees.

**A key press**: `document` keydown → `Sound.ensure` (capture; resumes audio) →
`Keys.onKey` → alarm, Tab trap, form field, Settings, landing, digits, then global
shortcuts. The most legible thing in the file.

**A drag on the IR panel**: pointerdown on the strip → capture → one transform update per
frame → release → snap → 2-decimal percentages → glide → SaveState's 2.5 s poll. Sound.

One person can hold the whole thing; a newcomer gets lost at "what is on screen right
now?", which has no owner (settle: `endAt`, `doneUntil`, `pledgeUntil`, `halfTid`; Canvas:
`focusedEntry`, `float`, `stageBox`, `ghostHold`, `pin`, `wShelf`, `stageOnly`, `dockMin`;
Sea: `ok()`). `r2.ghostHold = 1; // truthy` is the tell. Test shims live in production (the
Settings `open` shim; `timerRunning` checking a "countdown" kind no widget has).

## D. Robustness by design vs by patch

14 "adversarial find" comments, ~10 field notes, 9 "used to" notes. About half were
absorbed into a better design (the YouTube path reusing `embedURL`; settle phases report
and Canvas decides; "the bell always wins"; `hush()` at the bus; `Sea.clear` on stage). The
other half accreted where state is scattered ("floats expire" needed a riders exception —
a patch on a patch; the `bellWatch` re-baseline lists cases one by one; the empty-field fix
re-implemented in three commit functions). Four upstream shape problems: **blur equals
commit** (hence the alarm guard, `pencilSkip` twice, `setTimeout(0)` deferrals, a dead
`blurCommitted`); **plain `{}` maps keyed by period label** (hence 15 `__proto__` guards —
`sanitize` and Absent already use `Object.create(null)`); **runtime widgets skip
`sanitize`**; **16 redundant keydown handlers** each needing an `Alarm.isOn()` guard to undo
its own `stopPropagation`.

## E. Proud / embarrassed

Proud: the QR encoder from the spec; a `sanitize` that is a fixed point; water that holds
its phase with zero JavaScript and the right constants; a transport that cancels by
swapping buses; Undo that works because erasing is a stroke; the flag drawn to spec
(1.9:1, canton 0.76 of the hoist, 12×10 star grid, inner radius 0.382); a pure
`statusAt(Date)` with a `#t=` hook; comments that record why and what failed before.

Embarrassed: a Rhodes that never decays and clicks; a major third over the minor iv on the
side built around that chord; a "third down" that is three semitones; bass below the
speakers; a phase lock anchored to the boat's edge instead of its mast; a "pure" director
whose memory breaks its purity; the Score clause breaking the rule ten lines above it;
sixteen guards that cancel themselves.

## F. Build differently / leave alone

Differently: (1) a period model with stable ids and one block parser — one null-prototype
`PeriodMap` serving decks, agenda, per-period seconds, tallies, rosters (~250 lines out);
(2) stage as one state value `{focused, riders[]}` with z-order and ghosting computed by a
pure function, the settle emitting intents (~300 lines out of Canvas and settle); (3) one
commit-on-intent editing primitive plus a tiny `h()` helper — commit on Done/Enter, keys
through Keys alone; Score and Tally collapse. Leave alone: `statusAt` and the `#t=`
clock; `sanitize` as the read-time gate; the water's CSS-only clock (move the trough 19 px
and never add JavaScript to it).

## G. For the builder

The load-bearing parts are the simplest parts: a 27-line clock, a bell answer that is a
pure function of a date, timers that only ask "how long until `endAt`?". The bugs almost all
live where a flag was added instead of a shape, or a guard instead of removing the thing
guarded against — and the better move was already used elsewhere in the same file
(`Object.create(null)`, the bus swap, eraser-as-stroke, a phase lock drawn into the
geometry). The end-to-end habit — from the bell to the speaker cone, from the synth voice
to 32 Hz on a TV panel, from a phase lock to where the mast actually stands — is the part
worth keeping.
