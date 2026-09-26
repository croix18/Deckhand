# Deckhand v7.5.0 — Design review through the "whole product" lens (Sep 27, 2026)

Reviewer: a product-design agent briefed to apply the sensibility associated with Steve
Jobs — simplicity as removal, focus, the product as one thing, the first thirty seconds,
what the person sees from where they stand — in its own voice. It ran the board at
1920×1080 through the landing page, the bell, the Pledge, every Settings tab, the menus,
stage mode, timers, the note, lock, the alarm, Ink, 700×500 and 390×844, and looked at
the sea's frame grabs. No project files were changed.

## First: the timer is blank

A new Ring timer running at 3:00 shows nothing; Next Bell is empty; a 1-minute timer
summoned with ⏱ in stage mode doesn't appear at all. Cause: Sea 2.0's global `.ring{…
opacity:0}` matches the timer's `visWrap.ring`. "The decoration broke the tool while it
was being polished." Fix it first; add a visibility test.

## A. The first thirty seconds

9:19: the landing page is a toll booth the teacher pays every morning; rotation already
picked the week, so on a normal day it asks nothing — skip it unless a decision is needed.
The board at 9:19 is right on the left (huge time, "Passing → 6th", "starts in < 1 min",
the day strip); the right 40% says "AT THE BELL / 30s / to be in your seat", which reads
to a 12-year-old as a stuck timer — a description of a future event dressed as a live
number. At the bell the flag is calm and dignified, but its panel runs ~130 px past its
right edge (177 px margin left, ~300 right); an adult notices. After the Pledge the settle
card returns to "AT THE BELL 30s" and stays for the whole 51-minute period: 40% of the wall
showing a stale instruction. The bathroom pill goes coral for a routine 20-minute state;
coral is the alarm colour. From the back row (8 m) the clock, period line and day chips
read; the strip labels ("CLOCK" at 22 px ≈ 1.9 cm) are legible and pointless; the hint
lines ("Starts itself at the bell · Space restarts") and the header's four pills are aimed
at the teacher. Essential: the time, the period, time to the bell, whatever is staged.

## B. Does it feel like one thing?

The core — the room's clock knows the schedule and runs the transitions — is one idea and
a good one. Around it: + Add has 19 tiles (one disabled: why show it?); Noise Meter is
offered though the mic is blocked on the only machine that matters (remove); Sketch Pad
duplicates Draw (remove); Next Bell repeats the clock's own countdown; Tally and Scoreboard
overlap. Ship eight tiles: Timer, Stopwatch, Note, Agenda, Name Picker, Group Maker,
Scoreboard, Slides/YouTube; the rest behind "More…". **The settle-in should not be a widget
at all** — it is a moment, not a place: make it a behaviour of the clock (the clock card
becomes the countdown, or it stages like the Pledge), then gets out of the way; that gives
back 40% of the board. Scenes: keep the switcher, move management into Settings. Stage
mode is the best idea in the product and has no name; it's reached through an expand icon
next to a resize grip that looks almost the same — "Croix's own note calls the four icons
'expand, stage, pin, close'. He reads the resize grip as 'expand'." Two chrome bars (header
and dock) should be one; the date belongs in the clock card; ~120 px back every period.
Settings' six tabs should be four (General with the timer fields; Bells with Schedules;
Rosters; Device).

## C. The design language

The palette works (coastal, calm, right for a grid-paper math room); DM Sans 900 digits
are right; hard-offset shadows and the press-shrink are thoughtful for a panel that never
hovers. Loud: the clock's turquoise title strip is the most saturated surface on the board,
louder than the time; strip colours per widget type mean nothing; the coral bathroom pill.
Precious: the sea's lanes, the storyboarded whale, the pennant hitches, the director's
memory — craft at 88 px tall at the edge of vision. Inconsistent: three button shapes
(pick the pill for "do", the 20 px card for "contain"); "AM" on its own line costs 60 px;
sand resize brackets and nubs plus each card's sand shadow stack into beige clutter at
every bottom corner whenever unlocked. The fix is subtraction, not a new style.

## D. The title strips (the owner's ask)

Today: a 52 px strip at 1080p ≈ 4.5 cm on a 75" panel, 5–15% of every card, carrying a
coloured label, ⤡ ⛶ ⇈ ✕ (and ✎ on three types). Locked, it stays full height to show a label
and one icon. What the strip does and when:

| job | editing (unlocked) | teaching (locked) | staged |
|---|---|---|---|
| move | needed | never | never |
| identity | only ambiguous/custom names | only custom names | never |
| resize | needed | never | never |
| stage ⛶ | occasional | needed | Exit is in the focus bar |
| pin | rare | never | never |
| edit ✎ | needed | never | never |
| close | needed | never | never |

Proposal. **Locked: no strip.** Default names never show — the content identifies the
card; a custom label ("Station 1") shows as an in-body caption top-left (700, teal,
uppercase, `clamp(12px, 2.4cqw, 20px)`, 12 px inset). Tapping a card shows one floating
**⛶ Stage** chip at its top-right (48 px tall, navy 90%, white icon + word) that fades after
4 s. **Unlocked: a slim handle band**, 24 px at 1080p (~2 cm), one neutral fill for every
type (`--grid`), a centred 40×5 navy grabber at 35%, the whole band the move target with
10 px of invisible hit area above; label 11px/900 uppercase navy 60% only for custom
labels or ambiguous types. **Controls only on the selected card**: a white pill cluster
over its top-right holding ✎ (where it applies), ⛶, ✕ at 44×44 each; pin moves into ✎
settings. **Resize**: drop the ⤡ grip; on the selected card only, one 36 px corner knob
centred on the bottom-right corner, half outside the card (needs `overflow:hidden` moved
to `.wBody`); hide the edge handles on unselected cards. **Staged**: no strip. **Phone**:
no band; tap shows the cluster. Net: every card gains 52 px of content in the teaching view;
~20 icons and six coloured bars go; edit chrome halves and appears only where the finger is.

## E. Ease of use at the panel

"Unlock" is a 1.5 s hold but the button doesn't say so (say "Hold to unlock", fill a ring).
Keyboard-only copy on a touch panel: "Home (H)", "Fullscreen (F)", "Space restarts",
"Click anywhere to dismiss" — say "Tap"; drop shortcut hints from student-facing screens.
Needs a keyboard but shouldn't: timer presets as a comma list; settle seconds as seven
boxes; scene rename; "Type a time…" as the only custom path — give steppers. The settle's
✎ row is a settings form living in a display card; move it to Settings → Bells. The Slides
empty state is good. Ink strokes are anchored to the screen, not the content: a line drawn
on the board crossed the clock digits after staging — clear the ink on a view change, or
ask. "Bells at startup: Teal Week" shows while the board says Black Week (rotation wins) —
hide it while rotation is on. Two drawing tools, an unlabelled •••, and near-identical ⤡
and ⛶ are the other day-one confusions.

## F. The sea

It earns its place at its size and under the director's rules. The line between delight
and distraction is about cost, not content: Sea 2.0's CSS blanked the timer; a 20-second
serpent act has a storyboard, the timer's visibility had no test. Consider summon only
when unlocked (tap-to-summon draws kids to the panel between classes). **Freeze the sea**
until the timer, the settle moment and the strips are right; add a CSS guard so the sea's
selectors can't touch anything outside it.

## G. The five changes, in order

1. Fix the blank timer; a "the digits are visible" test on every core widget.
2. Remove the settle-in as a standing card; make it a moment of the clock.
3. Replace the title strips with the locked/unlocked/selected system above.
4. Merge the header into the dock; skip the landing page when there's nothing to decide.
5. Cut Noise Meter, Sketch Pad, Next Bell and Dice from + Add; scene management from the
   dock; Settings to four tabs; the per-type strip colours.

Also: centre the Pledge flag; bathroom-closed from coral to sand; "Click" → "Tap".
