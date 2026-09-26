# Sea 2.0 — storyboard and direction review (Sep 27, 2026)

Reviewer: a storyboard/scene-direction agent. Read the scheduler, markup, keyframes and
three frame sheets. Sections A, B (gull spook, chase, scatter), C (the seeded per-period
director, tiers, memory, the tap fix, the long press) and D (calm/breezy/windy) were adopted
in v7.5; the "turtle doesn't care" and "not the homework" combos, the storm, the signal flag
and the gull-hoisted pennant are on the shelf.

**The rule behind everything:** on a 75" panel the boat is about 3 cm wide, seen from 7 m.
Eyes, jaws and fin detail don't read. Silhouette changes, speed changes and pauses do.

## A. Storyboards

**Attack — "It came for Deckhand, and Deckhand put up the flag."** Tell (0–3 s: bubbles
200 px right of the boat) · periscope (3–5: only the head rises, looks, sinks — "it saw us")
· approach (5–10: coils roll in and stop 40 px short, head low) · rear (10–11.5: full height,
hangs 0.6 s) · ONE strike (11.5–12.5, a 22° lurch; one strong hit beats two medium ones) ·
the miss (13–14: the second strike hits water where the boat *was*) · the look (14–15.5: a
front-facing head, two eyes, holds a second — "it LOOKED at us") · exit · button (the boat
rights itself, a short pennant flick). Problems it fixed: no tell, the approach already
touched the boat (the payoff spent early), no button.

**Whale — "The whale jumped ALL the way out and the splash rocked the boat."** Tell (a pale
footprint oval) · setup (back rises; a small puff, then a big spout — escalation) · sink
(no fluke, held back for later) · pause (a foam ring where it will come up: "watch here") ·
BREACH (the whole body clears the water) · splash · ripple (a foam line reaches the boat;
it bobs twice) · button (a single fluke rises, waves once, slides under). Height check: a
190 px whale can't clear the water in ~90 px — breach in the far lane. Dead air cut.

**Pennant — "The flag got stuck and popped back up."** Mast extends with a rolled lump at
its foot · hoist in three hitches (a 6 px jump, a pause) · snaps open with an overshoot, the
boat heels 4° · flutter with the swallowtail flicking harder than the hoist edge · lowered in
hitches · the last hitch sticks, the flag pops back up once, then drops.

**Smaller acts.** Serpent: keep the disappearing act; the head lags and looks back (shelved).
Skipper: 4 s in a 5-minute slot is almost never seen — fold it into the dolphin chase.
School: at the first pause the whole school turns, holds, turns back; s5 lags and scrambles.
Turtle: the straight man; one head-up breath mid-cross. Paper boat: sails through, and in
windy weather lists, soaks, and goes under bow-first. Buoy: scenery — could become a
resident (shelved).

## B. The sea as a world

Choreography as scene state rather than per-element classes; residents (a gull on the
mast) are states, not acts, and loud acts spook them first — that departure is the tell for
every loud act. Combos: gull spook (adopted), turtle doesn't care (cheap; shelved), scatter
(adopted: school then whale), not the homework (expensive; shelved), dolphins chase the
skipper (adopted), breach wave (adopted as the whale's ripple).

## C. Scheduler dramaturgy

Findings: the tap favored the attack only 13% of the time and skipped `ok()`; the only
no-repeat rule was one act deep. Proposal (adopted): setlists per period from a PRNG seeded
by (date, period) — a greeting 45 s after the bell, hush for ten minutes, uncommons in the
middle, rares only in the last third, nothing in the final three minutes, commons only while
a timer runs; the attack needs a serpent sighting that period; per-period memory in
localStorage (×0.5 per sighting in five days); the tap hops at once and draws from a
short-acts pool with a 60 s cooldown; a 1.5 s long press queues the next unseen rare. Day
arc (rares after lunch, Fridays doubled) and the seeded legendary day (the storm) are shelved.

## D. Weather

calm ⇄ breezy ⇄ windy, changed only at a bell (adopted); storm as a 45 s legendary
(shelved). Skip overcast, night, and real weather via API. Surface one Settings line:
varies / always calm (adopted).

## E. Pennant variations (shelved)

The gull hoists it; a windy hoist in two fast hitches with a surge; a signal flag with a
symbol seeded by date (π on 3/14, with the π-buoy parked beside the boat all day); the
victory flick as the attack's button (adopted).

## F. Priorities

1 the tap · 2 the attack · 3 the whale · 4 the seeded director · 5 the pennant hoist ·
6 the school straggler and the turtle combo · 7 the gull · 8 windy.
