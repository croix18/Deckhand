# Sea 2.0 — character design review (Sep 27, 2026)

Reviewer: a character-design agent (flat-vector, two-color register). Read the v7.4 sea
markup/CSS and five frame grabs; rendered every replacement at full size and at 24–57 px.
The live proof sheet is `sea-2.0-creature-proofs.html` / `.png` beside this file.
All of section C–E's paths were adopted verbatim in v7.5.

## A. Diagnosis (v7.4)

**Whale.** A half-lens over a flat bottom: the outline of a hill, a helmet or a mouse. No head
(a humpback's head is a third of its length), no mouth line, the eye mid-slope, the
waterline through the widest part so what surfaces is a symmetric speed-bump; the fluke
parked at 34° reads as a shark fin trailing a rock; in the dive it becomes cat ears.

**Serpent (glide).** Constant-width strokes with round caps are lettering ("ʌʌʌ", a cursive
m). The head is a hook the same weight as the body; no mass, no taper.

**Serpent (attack).** Reads best of the set because the story carries it; the rear pose is a
candy cane, the jaw a sliver you can't see open from 3 m, no coil to suggest a strike.

**Turtle.** Four identical flippers around a dome is a tick or a ladybug; on the near lane the
shell lines are, literally, a peace sign; `transform-origin:center` makes the flippers orbit
the shell instead of hinging.

**School.** Fine — the emoji fish reads instantly — but every body is the same lemon, and the
front wave crops two of them.

**Skipper.** A dot at 20 px; the trail at opacity .3 is invisible. The motion is the gag; it
needs one silhouette feature that flashes at the top of each hop.

**Buoy.** A bullet / tombstone with π set in a web font; none of the buoy cues (float, tower, light).

**Paper boat.** Right call; the flat hull top loses the two raised tips that make it a paper
boat, and the outline scales with the lane.

**Sailboat.** Right size and hero, but a symmetric trapezoid hull (a bathtub), a jib floating
off the mast with no forestay, and a paleturq jib that vanishes against the water.

## B. Shape-language rules

1. One line of action per creature; everything hangs off it.
2. Silhouette first: solid navy, no outline, must read as a shadow at 24 px. Only made
   objects get a navy outline, with `vector-effect:non-scaling-stroke`.
3. Interior detail is paleturq line, 1–1.2 units, following the form; never a closed or
   crossing figure that could read as a symbol. Far-lane detail lines go to opacity 0.
4. One eye, one dot: paleturq, radius ≈1.5% of body length, front third, above the mouth
   line. Navy on a cream body. Coral only on the attacking serpent.
5. Everything tapers; chains of shapes shrink front to back; never a constant-width stroke.
6. Nothing is symmetric: back ≠ belly, front flipper ≠ rear, fluke lobes differ by ≥1 unit.
7. The front is unmistakable: blunt and massive (rostrum, melon, beak, bow), tapering back.
   The head always leads the motion.
8. Joints are real: anything that moves is its own element with a `transform-origin` at its
   root in view-box units. Never `center`.

## C–E. The drawings

See the proof sheet. The humpback: flat rostrum, mouth line kinking up under the eye, throat
pleats, a long knobbled flipper, a dorsal knob two-thirds back, a peduncle, and a fluke
drawn as the full top-view butterfly and flattened with `scaleY(.3)` at rest (the true
edge-on view) that opens to `scaleY(1)` as it rotates up for the dive. Blowhole (38, 36.5),
eye (39.5, 45.6), fluke origin 130 51, flipper origin 42 57, waterline y≈52 in a 0 0 160 80 box.

The serpent's humps became filled arches tapering to a spade tail, a frill on the middle
hump and a real head (brow, snout, nape fin, relaxed mouth line). The attack serpent's neck
is a filled S, 13 units at the water and 9 at the head; the head is twice the neck's width
with a brow, teeth on the upper jaw, a separate lower jaw (origin 34 20) and two frill fins.

The turtle is a side profile: a big wing-like near front flipper, a small rear paddle, the
tip of the far flipper, a beaked head, a scute band. The school got a humped-back fish
template at five sizes. The skipper grew a flying-fish wing that snaps open on every hop.
The buoy's lattice tower is itself a π, with a blinking turquoise lamp. The paper boat got
its hull tips. The sailboat got a raised pointed bow, a raked transom, a forestay, a curved
leech and a masthead burgee.

Two new visitors: a dolphin pair on one damped arc a quarter-hop apart (a sine and a
cosine), and a black-backed gull that flies in as the classic navy "M", lands on the
masthead as a white-bodied gull, turns around once, and leaves. Jellyfish (low contrast
under the front wave), crab (the sand line is a dune, not a beach) and pelican (depends on
the buoy being on screen) were considered and dropped.
