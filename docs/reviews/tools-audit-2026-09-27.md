# The tools — an audit (Sep 27, 2026)

Croix: "Let's now focus on the tools. Do an audit of them. What's good, what's bad, what can be
added or improved?"

**How this was done.** Every tool was added alone to a fresh Daily Board at 1920×1080 and
photographed at its default size, with a little life in it (a name picked, dice rolled, an
agenda written) — `tools/proofs/tools-sheet.js`, output in `tools/proofs/out/tools/`. Two
independent reviewers then went through the shots and the code: a veteran 7th-grade math
teacher (usefulness: what gets used weekly, what gets in the way, what's missing) and a
product designer who ships for interactive panels (touch targets, legibility at eight metres,
consistency, first use). Their sharpest claims were checked against the shots before anything
here was written. The 22nd tile, the Clock, was out of scope.

**Found on the way, fixed in 7.11.6:** tapping **+1** on the Scoreboard or the Tally has thrown
the number out of its card since 7.2 — the "+1 spring" used the class `pop`, which is also the
popover sheets' class (`position:absolute; bottom:calc(100% + 12px)`). It is `scPop` now, with a
test that the number stays inside its card. Same family as the `.ring`/`.chip`/`.card`
collisions: a two-word class in a 12,000-line file will collide.

---

## 1. Verdict, tool by tool

| Tool | Grade | What it does well | The one thing in the way |
|---|---|---|---|
| Timer | **Improve** | Ring/disc/tide faces, Until bell, +1:00, the ⏱ menu | A custom time can only be typed — no touch path for "45 seconds" or "7 minutes"; a preset chip *resets* a running timer silently |
| Stopwatch | **Improve** | The biggest, cleanest digits on the board (96 px) | No laps, no memory — a transition can't be a record to beat |
| Next Bell | **Keep** | Earns its tile on clockless scenes; coral at the warning | "until bell · 5th" is 16 px |
| Countdown | **Improve** | "12 days" reads from the back | Counts calendar days, not class days; the empty state tells locked kids to "tap ✎" (hidden while locked); the event's *name* is 19 px |
| Name Picker | **Improve** | No repeats until everyone's had a turn; absent kids skipped; follows the bells | The round dies on a scene switch (Gus gets called again); shows only the current name |
| Group Maker | **Rethink** | The sizing rule is right (7 in 4s = 4+3) | Output is **12 px** chips over an empty half-card; not saved; gone on a scene switch; no roles; ignores what the Seating Chart knows |
| Scoreboard | **Improve** | Big tap targets, rename by tap, the spring | Scores are 53 px in a 318 px panel; +1 only; no touch reset; rename works while locked |
| Tally | **Rethink** | 115 px count | Overlaps Scoreboard so much nobody knows which to add; a huge empty panel; Space only feeds counter 1 |
| Music | **Keep** | Generated in the browser — no network, no license, ducks under alarms | Knows nothing about the timer; Play is a chip while Next is bigger |
| Work Mode | **Improve** | The badge the whole room reads; Space cycles | Four hard-coded modes; 42 px badge with half the card empty; doesn't drive the meter or the tape |
| Noise Meter | **Rethink** | The best kid-facing game on the board: streak, escalating strikes, per-period records | **The Chromebox denies the mic to file://** — in Croix's room it never starts; the stakes ("Record 12:05 — held by 4th") are 12 px |
| Agenda | **Keep** | Per-period pages, check-off while locked, the stroke, shrink-to-fit | 22 px items with a third of the card empty; the FIT only shrinks, never grows |
| Text Box | **Keep** | Fit-to-box, plain-text paste, the toolbar hides until ✎ | — |
| QR Code | **Improve** | A real encoder in the file | A 20 cm code scans from ~2 m, not 8; phones are mostly banned in Florida middle schools — kids type the link, which is 12 px; empty-state text vanishes when locked |
| Slides / Embed | **Keep** | The headliner: per-period decks, the library, stage-only, keep-last-good, the keys pill | The 12 px hint under the paste box |
| YouTube | **Keep** | The library and ↗ Tab for Error 153 are honest engineering | A 55-word empty state the kids read all period |
| Sketch Pad | **Improve** | Grid, dots, number line, plane — exactly the math paper | No undo (Ink has one), one pen width, the number line is fixed at −10…10 by 1, 22 px tools, lost on a scene switch |
| Dice | **Improve** | Tally by total ("why is 7 most common") | The total is the smallest thing on the card (18 px); no batch roll, no relative frequency |
| Coin | **Improve** | 150 px coin | No batch, no percentage — "18 of 30, is that weird?" can't be answered |
| Spinner | **Improve** | Lands honestly | **Clipped under its own strip at the default size; Spin collides with the resize nub**; equal numbered sectors only; two coral sectors (coral is for alerts) |
| Cards | **Keep** | "Draw · 51 left" + "Put it back" is the conditional-probability lesson in one button | The rank is a 27 px corner index; the centre shows only the suit |

Two tools had real defects beyond design: the Spinner's clipping (a layout bug) and the
`tallyLine` format in all four probability cards, which prints the key and the count with one
space ("8 1", "1 0 2 0 3 0 4 1") so it reads as *81* and *10 20 30 41*.

---

## 2. The five things that run through everything

1. **Some things need a keyboard, and the panel has none.** Typing a custom time. Renaming a
   team. Clearing a scoreboard, a tally, or the dice/coin/spinner tallies (only "R resets" — no
   button). Pasting a link. The board was built at a laptop and it shows in exactly these
   places.
2. **A scene switch wipes a tool's work.** `clearScene()` carries running timers and stopwatches
   and nothing else. Picker rounds, groups, tallies, the sketch — gone. Daily Board → Stations
   → back is a normal minute of a lesson, and it costs work every time.
3. **The payoff is in small type.** The number a kid needs is often the smallest thing on the
   card: the dice total, the countdown's event name, the meter's record, the group lists, the
   scores. Meanwhile half of several cards is empty.
4. **The vocabulary is inconsistent.** A selected option and the primary action look the same
   (solid turquoise: "2 dice" vs "Roll"). R means reset, restart, clear, shuffle or stop
   depending on the card. The tile says "Name Picker", the card says "PICKER 2". Every
   per-tool strip colour rule is dead code (loses to `.card.widget .strip`), so every strip is
   sand. Hover styles stick on touch (the highlighted agenda row in the shot is that).
5. **The Noise Meter can't hear.** Policy denies the mic to `file://` on the Chromebox. The
   game — the part the kids care about — needs an input that isn't a microphone.

---

## 3. Improvements, ranked by value per hour

S = an hour or two, M = an afternoon, L = a release.

1. **(S) Spinner: unclip it and fix the tally format** in all four probability cards — face on
   top, count below, so "8 1" stops reading as 81. Replace the two coral sectors.
2. **(S) Group Maker: readable.** One name per line in a grid of cards at `clamp(14px, 6cqmin,
   48px)`; "Make groups" becomes "Shuffle" once made; hide the size chips after making.
3. **(S) Type-scale pass on the secondary payoffs.** Dice total, Countdown title/unit, Meter
   strikes/record, Next Bell's sub-line, Work Mode's badge (13cqw), Agenda base (6cqw, and let
   FIT grow), Cards' rank in the centre, Scoreboard numbers via a container query on the team
   panel (~110 px at two teams).
4. **(S) Touch resets and locked setup.** A "Reset"/"Clear" button beside every primary action
   that only R could do; a five-second "Cleared · Undo" toast for both; hide team-count chips,
   the meter limit and the QR input while locked; refuse the rename while locked.
5. **(S) Empty states that survive the lock.** Picker/QR/Countdown messages out of `.tHint`
   into a `.wEmpty` line that stays; Countdown drops the "✎" when locked; YouTube's copy to
   one sentence with the Error-153 note on the ↗ Tab pill.
6. **(S) One name table.** Tile, card label and the "PICKER 2" caption from the same source;
   "Days Until" for the Countdown (a timer is a countdown too); "Math Paper" for Sketch Pad;
   "Voice Level" for Work Mode; the dock's "Draw" becomes "Ink" — two drawing things should not
   have near-identical names. Delete the dead strip-colour rules or make them win.
7. **(S) Minimum targets and no sticky hover.** Chips 44 px, buttons 48 px, selects 44 px,
   Sketch tools 44 px and swatches 40 px, sliders with a 28 px thumb; every `:hover` inside
   `@media (hover:hover)`.
8. **(S) + Add menu and spawn.** One row per group with the heading on the left (Text Box and
   QR move to the "show" group so nothing orphans); the Clock tile says "Already on this board"
   and brings the clock forward; new cards spawn clear of the clock's face — in every board
   shot the new card covers the "1" of 10:30.
9. **(M) Timer by touch.** A keypad or ±10 s / ±1 min steppers on the face; presets take
   seconds (`0:30, 1:30, 3, 5`); a card preset sets *and starts* like Until bell and the ⏱
   menu do; chips hide while running (which also ends the silent-reset mis-tap); the low-time
   band inside the ring goes (the coral ring is the alert).
10. **(M) Work survives a scene switch.** A per-day store for picker rounds, groups, tallies
    and the sketch — `Absent` already has the pattern (date-keyed, session-only).
11. **(M) Noise Meter without a mic.** With the mic denied, the streak runs on its own, a big
    ✖ (or a clicker key) adds a strike, records still go by period. The game is the deterrent.
12. **(M) Probability: experimental vs theoretical.** ×10 / ×100 batches on Roll/Flip/Spin/Draw
    and a small bar chart of relative frequency beside the theoretical percentage — that is
    MA.7.DP.2 in one card. Spinner sectors get labels and unequal sizes.
13. **(M) Countdown in school days.** The board knows weekends and the no-school weeks; "3
    class days" is the number kids plan by.
14. **(M) Work Mode drives the room.** Each mode sets the meter limit and can start/stop the
    tape; the four modes are editable (label, sub-line, "Help: ask three before me"); the
    timer can offer "music while it runs, fade at 0".
15. **(M) Sketch Pad: undo, three widths, a number line with a set range and step**
    (−1 to 1 by ¼, 0 to 2 by 0.1, −50 to 50 by 10) — borrowed from Ink.
16. **(M) Group Maker, second pass:** roles (Facilitator, Recorder, Reporter, Materials), "→
    Scoreboard" makes the teams, keep-apart pairs from the Seating Chart import.
17. **(M) Tally becomes Class Goal.** A target, a jar that fills, per period, carried across
    days; a second mode "Hands Up" with A/B/C/D counters and bars. That is a tool with a job
    and no overlap with Scoreboard.
18. **(S) Picker shows the last three names** in small type under the current one.

---

## 4. What's missing

Ranked by weekly use × how much it needs the front-of-room screen. The reviewers and I agree
on the top three.

1. **Wrap-up at the bell** — the settle-in's twin, a moment of the clock, not a tile. N minutes
   before the bell the clock takes the stage with the exit-ticket prompt or link, a pack-up
   checklist and "the teacher dismisses you, not the bell", and hands back at the bell. Six
   times a day, timed to the bell, and Deckhand is the only thing in the room that knows the
   bell. Settings → Routines, beside the settle-in. (L, but the settle-in's plumbing is
   already there.)
2. **Talk Timer** — turn-and-talk / Think–Pair–Share: a prompt or sentence stem, "Partner A
   speaks first (closest to the window)", a chime and a visible switch to B halfway, then
   "Share". Several times a day; the switch has to be public. (M)
3. **Number Line, interactive** — drag points, draw jumps (−7 + 4 as an arc), any range and
   step, fractions and decimals. Weekly through integers and rational numbers; the physical
   drag on the panel is the point. Could start as a mode of Sketch Pad. (M–L)
4. **Stations** — Group Maker's groups × named stations × a rotating timer with a chime,
   showing who is where. Every week or two; "where do I go" is exactly what the board should
   absorb. (M)
5. **Coordinate Plane, plot mode** — tap to place points, a live (x, y) table, "line through
   the origin", k = y/x. Heavy for the proportional-relationships unit, quiet after. (M)
6. **Percent Bar / double number line** — 0–100 % over 0–whole with a draggable split, for
   percent, markup, tax and tip. Seasonal but the best visual for that unit. (M)
7. **Bellwork from Cadence** — agreed for the Slides route; a *card* could do what a slide
   can't (randomize, run a timer, reveal the answer on tap). Decide which before building.
8. **Seating chart display** — today's chart from the Seating Chart data, for new-seats day
   and the sub. Occasional, but that is when the screen is needed. (S–M, the import exists)

**Connections, not tiles:** Bathroom Pass → "1 out" in the existing bathroom-window line if
the two share storage; the Desmos scientific calculator (what FAST uses) as a pre-saved Embed
link.

**Honest gimmicks — do not build:** a standalone random integer/fraction generator (Cadence
does it properly; at most a custom range on Dice); an on-screen calculator; a static formula
sheet (that is a slide); a "3-2-1 show me" countdown (the timer); a student help queue (kids
walking to the panel in a 28-desk room is worse than raised hands — a "presentation order"
mode on the Picker covers the real need); a hall-pass log (Bathroom Pass owns it).

---

## 5. The + Add menu and Settings

The grouping is close. "Classroom" is a junk drawer, "Board" means nothing when everything is
on the board, "Probability" is too narrow to take the math tools coming. Proposed:

- **Time** — Timer, Stopwatch, Next Bell, Clock, Days Until
- **Class** — Name Picker, Group Maker, Scoreboard, Class Goal
- **Room** — Voice Level, Noise Meter, Music
- **Post** — Agenda, Text Box, Link & QR
- **Media** — Slides / Embed, YouTube
- **Math** — Math Paper, Dice, Coin, Spinner, Cards (+ Number Line, Plane, Percent Bar later)

One row per group, heading on the left, so the menu is ~490 px tall and stays below the clock's
digits instead of covering them.

Settings: **Bells** mixes the schedule with the routines. Keep times, rotation, no-school weeks
and the nudge under **Schedules**; make **Routines** for the settle-in, the wrap-up, the
bathroom window and the warning; **Timer** grows into **Tools** (presets with seconds, timer
style, Voice Level labels and meter limits, spinner labels, batch defaults); **Rosters** gets
"last imported …" and a one-tap re-import, because rosters change all through the fall.

---

## 6. Leave alone

The settle-in as a moment of the clock. The sea and the attack. The lock model (hold to
unlock; play actions live while locked; editing hidden). Absent being session-only and shared.
Until bell, the ⏱ menu, the ghost timer over a focused deck. Slides/Embed's per-period decks,
keep-last-good, the keys pill, stage-only. Cards' "51 left". Dice's tally by total. Group
Maker's sizing rule. The Meter's game rules. Agenda's and Text Box's shrink-to-fit. The lofi
tape. The Add tiles (160×84 — exemplary targets). The design language: coral only for alerts,
hard shadows, DM Sans.

---

## 7. A way to sequence it

- **7.12 "Read from the back row"** — §3 items 1–8 (all S): the fixes with the best value per
  hour, no new behaviour, one afternoon, one release. Re-shoot the contact sheet as the proof.
- **7.13 "Work survives, and touch does everything"** — §3 items 9–15: the timer by touch,
  the per-day store, the meter without a mic, the probability batches, school-day countdown,
  Work Mode driving the room, Sketch Pad's number line.
- **7.14 "Routines and math"** — §4: the wrap-up, the Talk Timer, the Number Line, then
  Stations; the menu regrouping lands with the first new Math tile.
- Cadence and the Seating Chart connections stay where Croix has them: agreed, not yet.
