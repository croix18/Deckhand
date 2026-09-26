# Changelog

The full per-version story lives in `docs/HANDOFF.md`; this is the short form.

## 7.3.0 — 2026-09-26

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
