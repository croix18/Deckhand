# Changelog

The full per-version story lives in `docs/HANDOFF.md`; this is the short form.

## 7.8.1 — 2026-09-28

**Batch C — the verify list, and the design lens's small words.** The school-hosting
mirror (`hosting/apps-script/`) left the public repo (it is with Croix; `.gitignore`
keeps it out) and the README and handoff no longer describe it. The lock pill says
"Hold to unlock" while locked; the widgets' keyboard hints ("Space rolls · R clears")
hide in the locked, room-facing view; "Bells at startup" is disabled with a note while
the week rotation is picking. One test added; 217 green. Still open, and only Croix can
answer it: whether Teal/Black alternate by calendar week or by school week across a break.

## 7.8.0 — 2026-09-28

**The math room's tools** (batch C of the audit plan — the two things Croix asked to
build out instead of cut).

**The clock owns the board.** "Yes it is empty… make my main clock a little bit bigger
now that I have more space." The default Daily Board is the clock at full width, and a
board upgraded from 7.6 gets the same: the clock grows into the retired settle card's row.
The clock's size caps grew about a third (the time to 250 px, the period line, the bell
countdown, the day chips, the date with them).

**Sketch Pad backgrounds.** A Background picker beside Clear: Blank, Grid (16 square
cells across), Dot paper, Number line (−10 to 10, every integer labelled, arrowheads),
Coordinate plane (−10 to 10 both ways, square units, light grid, navy axes, labels every
2). The background is its own layer under the ink, drawn at the card's real pixel size
so squares stay square whatever the card's shape, repainted on resize, untouched by
Clear and the eraser, and saved with the card.

**The probability kit** — a new + Add heading beside Dice, each with a session tally
because experimental-vs-theoretical is the lesson: **Coin** (1–3 coins, a flip animation,
Heads/Tails counts and the number of flips; Space flips, R clears); **Spinner** (2, 3, 4,
5, 6 or 8 equal sectors in the palette, a fixed pointer, a 3–6-turn spin with a random
offset, the result is the sector under the pointer, a per-sector tally; Space spins, R
clears; a new sector count starts the tally over); **Cards** (a shuffled 52, drawn without
replacement so the count drops — "Draw · 49 left" — or with "Put it back" on, a suit tally,
Shuffle/R resets; Space draws). **Dice** gained the same tally: per face for one die, per
total for two or three (why 7 wins), cleared by R or by changing the die count.

**Also.** The + Add menu (23 tiles under five headings) runs five columns at 1080p and six
on a 768-high screen so it never scrolls. Tests: `v78.spec.js` (6 new); 216 green.

## 7.7.0 — 2026-09-28

**The room-facing release** (batch B of the audit plan; the design-lens review's three
big asks, in the order Croix chose them).

**The settle-in is a moment of the clock.** The Settle-in card is gone. At a bell the
clock card takes the stage and *becomes* the count — "Find your seat · 30 · seconds" —
or, at the day's first bell, the flag alone; runs the routine exactly as before (the
swelling ticks, the soft note, the consequence spell, per-period seconds, the Pledge
minutes); hands off to a Slides card; and the face comes back. Between bells the clock is
just the clock — no "AT THE BELL 30s" stale instruction on 40% of the wall all period.
While it runs, Space restarts it and R stands it down. Its settings moved to **Settings →
Bells → Settle-in at the bell** (on/off, seconds, message, flag on/minutes, seconds by
period). A board opened from an older file keeps its card's settings (migrated into
`bell.settle`); a board whose owner had removed the card gets the routine off. A scene
needs a clock to run it. The default Daily Board is the clock (58%) with the right of the
board left to the teacher.

**One chrome bar.** The navy header is gone: the date is on the clock (with the SIM badge
on a simulated clock); Settings is a dock pill (its coral dot is still the store's health
light); Home, Sound and Fullscreen live under the dock's new ⋮ with the brand. The board
gained the header's height. On the landing page the dock keeps only Settings and ⋮.

**The landing page asks only when there is a question.** When the week rotation already
picked the week (or there is only one week type, or no bells), the board opens straight
away and says hello in one line — "Good morning, Mr. Shaffer · Black Week · tap anywhere
for sound" — which the first tap takes away. The sound nudge is real: the page has no
gesture until you tap, and the settle-in's ticks need one. Rotation off with two week
types still asks. Home (H, or ⋮ → Home) opens the page any time; the TODAY row lives
there as before.

**Also.** A long press on the drifting boat now captures the pointer (the hold survives
the drift); the version nudge is a box, not a circle, on a phone. Tests: `v77.spec.js`
(6 new) and the settle/Pledge/landing tests rewritten for the moment model; 210 green.

## 7.6.0 — 2026-09-28

**Robustness, no visible change.** Batch A of the audit round's plan (`docs/reviews/audit-2026-09-27-*`);
the settle-in-as-a-moment and the one chrome bar are 7.7, the sketch backgrounds and the
probability kit are 7.8.

**A scene switch keeps a running timer.** A timer or stopwatch that is counting rides along
to the next scene as a floated card, still counting, and is handed back to its own scene on
return (never duplicated, never written into the other scene's config). Idle cards are
dropped as before. Stopwatches gained `running()` for this.

**The timer face paints at 10 Hz.** The ring and tide faces used to repaint every animation
frame (60 style + layout passes a second on the Chromebox); they now paint at most ten
times a second, and the tide is a `transform: scaleY()` instead of a height, so it never
forces layout.

**Absent marks are for today.** The board runs for weeks without a reload; a mark made
Tuesday no longer skips that student on Wednesday — the marks are keyed to the (simulated)
calendar date and clear at midnight.

**☆ names a deck in a row of ours.** The deck library's `window.prompt` (a system dialog the
panel draws off-theme, off-keyboard and sometimes not at all) is replaced by an inline
"Name this deck" row: Save / Enter keeps it, ✕ / Escape drops it, the ✎ row folds it away.

**Ink draws incrementally.** Finished strokes live on an offscreen copy; a pen move draws
one new segment (the highlighter, translucent, repaints only its own stroke), so the pen
no longer lags more the longer the lesson (98 ms a move at 150 strokes, per the adversarial
audit). Undo, Clear and a resize rebuild once.

**Small things.** The scoreboard sanitizer filters junk entries *before* it takes the first
four (a junk entry used to cost a real team its place); the bathroom-closed pill is sand,
not coral (coral is for alarms); the alarm says "Tap anywhere to dismiss". The Pledge flag
was measured centred at three viewports (the review's "runs past its right edge" did not
reproduce) — left alone. 204 tests.

## 7.5.1 — 2026-09-27

**The audit round.** Four reviews of the whole project (`docs/reviews/audit-2026-09-27-*`):
an engineering audit, an adversarial rebuttal of it, a design review through the
"whole product" lens, and a technical review through the "read every line" lens. This
release is their evening one.

**Fixed: the blank timers.** 7.5's sea styling used an unscoped `.ring` class that matched
the timer's ring face, so every Ring timer, the Next Bell widget and the ghost timer over
a staged deck rendered invisible. Every sea effect class is scoped under `#sea` now, and a
test checks the faces are painted, not just present.

**The strips (Croix: "We all know it's a clock").** Locked (teaching): no title strip at
all — the card is its content, 30 px taller; a custom name shows as a small caption inside;
⛶ Stage stays as a faint round button at the top-right that brightens and says "Stage" for
four seconds when the card is tapped. Unlocked (editing): a slim neutral handle band with a
grabber mark, the label only for custom names, the icons on 44 px hit boxes. The per-type
strip colours are retired.

**Data safety.** An unreadable device copy is quarantined (`deckhand.config.bad-<time>`),
never seeded over; a board saved by a newer release makes an older file read-only with a
banner (an old Export can no longer overwrite the current board); a save from another
window suspends this one with a banner; the store is read even when the write probe fails
(a full quota no longer looks like data loss), and a blocked store shows the coral dot at
once. Settings is behind the lock (the lock pill nods). `#setResetBtn` — the timer's legacy
`resetBtn` id no longer shadows Settings' reset (the armed "Really replace…" state landed on
the timer's button). `check.sh` refuses free text (notes, agenda, teams, tally, titles, the
saved-deck library); `push.sh` stages an allowlist, never `-A`; `serve.js` binds loopback
and refuses dotfiles.

**In the room.** The alarm leaves a deck's fullscreen before it rings (it sat behind the
video). The settle-in skips Lunch, re-baselines when the TODAY row changes (switching to
Wednesday times mid-class started a count; undoing it fired the Pledge), and a bell behind
the landing page opens the board. Alarm text is navy on coral (8:1; white was 2.47:1).

**The sea and the tape.** The boat's mast, not its left edge, is the phase reference. The
back wave layer is three wavelengths wide (it had a seam). The director's memory excludes
today (a reload mid-period re-planned the show). The Rhodes tremolo is its own gain stage
(notes decayed to a plateau and clicked); the pluck answer is an octave down (a "third"
was three semitones); Brushes runs a diatonic progression (its motif clashed with the
borrowed iv); bass is a triangle (a panel's speakers can't play a 40 Hz sine); the chime
never ramps to 0 (it threw).


**Sea 2.0.** Built after a three-part review (`docs/reviews/sea-2.0-*.md`) and written up
in `docs/SEA.md`. The water is three travelling wave layers with periods by deep-water
dispersion; the boat rides them phase-locked by geometry (heave and pitch on the swell's
clock, so the hull's waterline never changes), with foam on the crests and calm / breezy /
windy weather drawn per class period. Every creature was redrawn as a proper silhouette
(the whale is a humpback now, with a fluke that opens on the dive), the boat grew a bow, a
forestay and a burgee, and every act was retimed against the twelve principles. New: a
gull that lands on the masthead and sits — and leaves first when something loud is coming;
a dolphin pair on one arc (a sine and a cosine), and the chase (the skipper, then the
dolphins). The attack has a story: bubbles, a periscope look, the slither, the rear, ONE hit
with spray off the sail and the boat shoved, a MISS into the water, a look at the room, a
head-first dive, a victory flick of the burgee. The whale has an act: footprint, surface,
spouts, the late fluke, gone, bubbles, the breach, the splash, the ripple reaching the boat,
a wave goodbye. The pennant hoists in hitches and pops back up once on the way down. The
paper boat sinks in windy weather.

**The director.** Each class period gets a setlist from a generator seeded by the date and
the period (deterministic, testable, different for every class): a greeting 45 s after the
bell, ten minutes of hush, rares only in the last third, nothing in the last three minutes,
commons only while a timer runs, the attack only after a serpent sighting, and a memory of
what each period has seen. A tap hops the boat at once and answers with a show (with a
one-minute cooldown); a 1.5 s long press queues the next rare. Settings → Sea weather:
varies / always calm. `tools/aquarium.html` plays any act on demand.


**The sea, with depth.** The front wave now heaves and sways, and the boat heaves on the
same clock, so its hull rides the swell instead of sinking under it. Visitors pass in
two lanes: far (small, behind the boat) or near (large, in front) — the buoy, the
turtle and the paper boat pick a lane per show. The boat grew a mast, a waterline
stripe and a little wake.

**The visitors.** The school of fish swims head-first and stays under the waterline
(it was crossing the sand dune tail-first). The message-in-a-bottle is gone; a paper
boat folded from a ruled worksheet drifts by instead. The serpent glides head-first.
The ATTACK slithers in from the right edge over eight seconds, head low and coils
rolling, then rears up behind the sails, strikes twice (the boat lurches on the first)
and goes under — sixteen seconds. The whale has an act: it surfaces heading left,
spouts twice, arches and dives fluke-up, then breaches nose-first and lands in a splash.


**Nine more sides on the tape.** The lofi tape had four sides that shared one e-piano
and one beat; it has ten now, each with its own key, tempo, progression, motif, voice
(e-piano, glass rhodes, kalimba pluck, pad), drum feel (boom-bap, halftime, brushes,
bossa, none) and echo. Side A is the original, untouched. The first listen walks the
sides in order; after that they shuffle. A **Next ›** chip skips to another side
without a gap, live while locked.


**The Pledge, take two.** At the day's first bell the flag now has the screen to
itself — no count, no words — with a fabric ripple and a slow sway; when its minutes
are up, the slides. It keys off the day's *first block*, so on a reversed (Black) week
it flies for 6th at 9:20 and never for 1st at 3:07.

**Seconds by period.** The settle-in's ✎ row has a box per bell period; a number there
overrides the default for that class only (blank = default). The armed readout shows
the figure for whichever class is in the room.

**The pennant.** Now and then the boat runs up a "Mr. Shaffer Rules" pennant (it reads
the greeting name), lets it fly for twenty seconds, and hauls it down. A boat tap can
summon it.

**Ink.** *Draw* (dock pill, the stage bar, or **D**) puts a transparent drawing layer
over everything — the board or a staged deck — with a floating palette: six pens
including a highlighter, three widths, eraser, undo, clear. *Done* folds the palette
and keeps the ink so you can keep working underneath it; Escape does the same.
Session-only.

## 7.1.0 — 2026-09-26

The week-of-notes release (Croix's notebook, Sep 21–25).

**Bells.** A TODAY row on the home screen: *Regular times* / *Wednesday times* / *Custom
day…* — run the Wednesday schedule on any day, or build a one-off day in a touch editor
(rows of label + time pickers, start from a schedule, shift all ±5, no text syntax).
Dated, so it expires by itself; a custom day runs even with No bells picked. The same
row editor replaces the schedule textareas in Settings ("Edit as text" keeps them).

**Note widget → rich text.** Bold, italic, underline, six colors, four fonts, bullets,
alignment, per-selection A+/A−, and whole-note sizes S/M/L/XL/Fit. Base type is much
bigger (students couldn't read it) and notes spawn at 40×60%. Stored as sanitized HTML
(allowlisted tags, validated inline styles — sanitized on every load and commit; hostile
markup is inert); old `# / - / 1)` notes convert once.

**Noise game.** *Strike after* ½/1/2/3 s (was a fixed 2 s), strikes repeat while the
room stays loud, and a per-period tally for the day shows under the strikes.

**Slides card.** Big paste box + Load in the empty state; ☆ saves the showing deck to a
library of up to 8 (chips in the ✎ row); *Stage only* hides the card on the board and
gives it a ▶ chip in the dock — the settle-in still hands off to it at the bell, and
Exit puts it away. Iframes carry `allow="fullscreen *; autoplay *; …"` so a YouTube
video inside an embedded deck can go fullscreen.

**The Pledge.** At the day's first bell the settle-in shows the flag with the count,
holds the stage after the count for N minutes (default 2, ✎ row), then hands off to
the slides.

**The sea.** The boat sways (3 s heel on the rig; the 45 s drift stays). Four new
visitors — turtle, a darting school, a message in a bottle, and the ATTACK: the
serpent surfaces behind the hull, strikes the sails twice, the boat lurches. A tap on
the boat favors it.

**Design pass.** Settings is a tabbed preferences panel (General · Bells · Timer ·
Rosters · Schedules · Device) with one field grid, 48 px controls, and a fixed footer;
the + Add menu is icon tiles with descriptions; the scene manager and ⏱ preset menu are
sheets in the same language.

## 7.0.0 — 2026-09-25

**Persistence.** The board autosaves to the device (localStorage `deckhand.config`) —
layout, bells, rosters — and the device copy wins at boot over the file's baked block.
"Download configured copy" became **Export a copy** (backup / move to another machine);
new **Use this file's settings** (two-tap reset to the baked config); a one-time update
nudge when a newer release opens over an older device copy, with "Use the new bell
schedule". The coral dot on Settings now means only "saving failed — export".

**Rosters from the Seating Chart.** Settings → Class Rosters → *Import from Seating Chart*
(same-machine device store) or *Import a Seating Chart backup…* (its JSON export).
Names land by period number; Apply keeps them.

**Fixes.** Unknown `schemaVersion` now shows the corrupt-config banner and disables
export instead of silently booting defaults with export live. A malformed `#t=` hash
no longer takes the whole board down. The YouTube card goes quiet under the landing
page like the Slides card. A manual week-chip override expires at the date change
("overrides for the day" is now true). One throwing widget no longer aborts the whole
scene. Bell-schedule lists refuse a 21st block at Apply (matching what reload keeps);
the noise game never writes a 13th record. A finger sliding off after a completed
hold-to-unlock no longer eats the next Lock tap. YouTube channel/user URLs are rejected
cleanly instead of framing a blank page; `youtube-nocookie` URLs must be the embed player.

**Design.** Settings' action row is sticky (it sat below the fold at 1080p). Contrast
pass: end-of-class warning, settle-in states, settings errors and the selected-widget
outline are all navy-on-coral or teal now (turquoise-on-white was 1.64:1, coral-on-white
2.47:1). Header, dock and menu pills grew to ≥40px. Dynamic widgets carry accessible
names, iframes have titles, the dock is a `nav`, popovers are groups, the bell line is a
live region. Last off-palette colors tokenized; four dead v5 rules removed.

**Name.** The release file is `Deckhand.html` (version-free); `Deckhand_v6.html` and `index.html` forward to it, and Export writes `Deckhand.html`. The header badge reads the real version.

**Repo.** Test suite ported to `@playwright/test` (feature files, fresh context per test,
parallel, traces on failure, `touch` and `http` projects). GitHub Actions runs the
privacy guard and the suite. `tools/check.sh` refuses to push a configured copy.
`tools/push.sh` keeps the token out of argv. Old versions → `archive/`, screenshots →
`screenshots/`, handoff → `docs/`. LICENSE (MIT), `.nojekyll`, playwright declared.

## 6.33.0 — 2026-09-20
YouTube library 8 categories / 39 entries; roster privacy rail; GitHub Pages hosting.

## 6.x — Aug 31 – Sep 20, 2026
Widget canvas with scenes (6.0) → rosters/picker/groups (6.2) → text, dice, scoreboard,
work mode (6.3) → QR, noise meter, sketch (6.4) → Slides embed (6.5) → scene manager,
per-period decks (6.6) → focus mode (6.7) → noise game (6.8) → pin (6.9) → countdown,
tally, agenda (6.10) → hardening, teaching-day, design passes from the triple review
(6.11–6.13) → stage mode, ghost timers, ⏱ menu (6.14–6.17) → the sea (6.18–6.21) →
classroom-failure fixes (6.22) → settle-in routine (6.23–6.24) → music + YouTube
(6.25–6.28) → settle-in default, ticks, soft chime (6.29–6.32).

## 5.x — Aug 30–31, 2026
Real 2026-27 bell schedule, week rotation, day strip, visual timers, next-class
countdown, bathroom window, warnings.

## 1–4 — Aug 2026
Clock + preset timer → module architecture → config core, settings, download-copy,
bell engine → landing page.
