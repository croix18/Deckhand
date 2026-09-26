# Changelog

The full per-version story lives in `docs/HANDOFF.md`; this is the short form.

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
