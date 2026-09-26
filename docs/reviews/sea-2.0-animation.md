# Sea 2.0 — animation review (Sep 27, 2026)

Reviewer: an animation agent (the twelve principles, in CSS keyframes for a Chromebox).
Read the v7.4 keyframes, markup, scheduler, and four frame sheets. The replacement
keyframes in B and the wave model in C were adopted in v7.5 with small retimings.

## The two faults behind most of it

1. **Easing on every segment.** `animation: X 19s ease-in-out` eases *each* keyframe
   segment, so speed drops to zero at every percentage: the whale's ten keyframes were ten
   pauses; the strike hit the boat at zero speed. Fix: a timing function on each keyframe,
   and ease-in-out only where a stop is wanted.
2. **The clocks didn't agree.** Heave 11.2 s, sway 6.4 s, buoy rock 6.8 s and bob 5.2 s,
   paper boat 6.2 s; no rotation tied to the wave slope; the wave didn't travel, it slid.

## Per act (v7.4)

- **Boat idle:** ±6° of roll against ±4 px of heave is a metronome; sway on its own clock
  heeled against the slope half the time; the lurch and the sway both wrote `transform`, so
  the sway froze and then jumped; `boatHop` animated `margin-bottom` (layout every frame).
- **Attack:** one ease-out over 8 s = a sled; humps bobbed on a 1.15 s cycle unrelated to
  speed and sat under the front wave; the rear-up had no overshoot and no hold; the strike
  was 0.96 s of ease-in-out (zero speed at contact); the jaw was widest *after* contact; the
  navy head landed on the navy hull (aim at the turquoise sail); the lurch peaked 470 ms after
  contact (should be ~120) and its sync was a hand-copied ratio; the exit dropped like an
  elevator.
- **Whale:** a straight vertical rise, 4.9 s of dead hold, the fluke lifted *before* the body
  rolled and never went vertical, the breach apex was −6 px (it "rose up" again), the fall
  took 2.4 s with two stalls (moon gravity), the splash was a fence.
- **Serpent glide:** the hump wave ran tail→head; positive delays froze the head for 0.84 s;
  the dive sank the whole body level like a submarine; ±3 px of bob is invisible from 5 m.
- **Turtle:** flippers pivoted about the shell's centre; a tortoise's diagonal gait; no
  surge; drawn top-down in a side-view sea.
- **School:** each dart was a 4.5 s cruise; the fish moved as one rigid block; ±2 px wiggle.
- **Skipper:** constant speed along the parabolas (no gravity), equal hop times, the tail
  flapped in the air, no rings; keep the dotted parabola (the best math joke in the sea).
- **Buoy / paper boat:** three unrelated clocks; the paper boat has no story — make it sink.
- **Pennant:** the mast grew like a plant (scaleY, stroke scaling too); scaleX squashed the
  letters; ±2° skew every 2.2 s is a lazy flag; the feTurbulence filter inside a rotating
  rig was redrawn 60 times a second for 22 s.

## B. Replacement keyframes (adopted)

Attack on a 20 s clock: four slither strokes with a speed pulse per coil, arrival with
weight, the head's nods per stroke, "sees the boat" (eye pop), rear with overshoot, a slow-in
wind-up and a 200 ms snap, a bounce off the sail, a second coil and the miss, the take, a
head-first dive on an arc; the jaw opens on the wind-up and snaps shut ON contact; the boat's
lurch peaks 120 ms after the hit and rides on the rig's own `rotate`/`translate` so it adds to
the idle motion; spray as x on one element and y on another (a true parabola).

Whale on a 24 s clock, split across the individual `translate` (height), `rotate` (pitch) and
`scale` (squash) properties so each has its own easing: surfaces on an arc nose-up with a
double settle, an inhale/blow on each spout, a breath before the dive, the roll forward with
the fluke dragged then flicked LATE and hung for a second, a launch that is fastest at the
surface, an apex hang, an accelerating fall, a belly-slap squash, a crown splash that
collapses outward.

## C. The sea

Three travelling layers, one wavelength scrolled per period, periods by deep-water
dispersion; the boat phase-locked by geometry (troughs at x = 20 + 400n and 100 + 160n of
1600 under a boat at 42vw), pitch leading heave by −T/4 via `animation-delay`; nested
wrappers (`#boat` drift → `.btSwell` → `.btChop` → rig); foam only on crests as separate
layers on the same scroll; visitors on the same sea with their heave `startTime` aligned.

## D. Tempo

Attack 16–20 s (8 s of slither is the upper limit; the head is visible from ~1 s). Whale
20–24 s with two peaks so a glance after 9 s catches one. Serpent 24–26 s. Turtle 32–34 s
with a head-up breath. School 12 s with four real 200 ms darts. Skipper 5.5 s. Paper boat
adds the sink in the last third. Pennant is fine.

## E. Performance (Chromebox)

Never animate `d`, long dashoffsets, filters, box-shadow, width/height/left/bottom/margin,
background-position. Animated SVG children repaint their containing svg on the main thread:
keep them inside small svgs, never in the wave svgs. `offset-distance` is main-thread (fine
for a 20 px fish). When several animations write the same property the last wins — use the
individual properties so they add. Budget: 5 wave/foam layers; ≤8 moving GPU-layer
wrappers for one visitor plus the boat; ~20 animated SVG children at once; 0 filters;
<60 000 px² repainted per frame; <4 ms of main-thread work per frame.
