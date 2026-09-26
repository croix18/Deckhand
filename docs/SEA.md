# The Sea

The 88-pixel band of water at the bottom of Deckhand, the sailboat that rides it, and the
visitors that pass through. Since v7.5 it is a system of its own, built after a three-part
review (`docs/reviews/sea-2.0-*.md`): a character designer redrew every creature, an animator
rewrote every act against the twelve principles, and a storyboard director gave the acts a
shape and the scheduler a dramaturgy. Croix's brief: "I seriously want the sea module over
engineered." This is the file to read before touching any of it.

Everything below lives in `Deckhand.html`: the markup (`<!-- THE SEA -->` … the wave layers),
the CSS (`/* THE SEA (v7.5 "Sea 2.0") */` … the dolphins), and `var Sea` (the director).
`tools/aquarium.html` is the review tank: serve the repo (`node tools/serve.js`) and open
`http://localhost:4173/tools/aquarium.html` to play any act on demand, set the weather, and
print a period's plan.

## The rules of the register

The sea is decoration at the edge of vision, seen from desks three to eight metres away.
Only three things read at that distance: silhouette changes, speed changes, and pauses.
Every beat is written in those terms. It never plays during stage mode, over an alarm, on
a phone-sized window, or under reduced motion (Settings → Waterline motion overrides a
managed device's flag). It is wordless; the only text anywhere is the owner's name on the
pennant. Coral is the alert color and appears once: the attacking serpent's eye.

## The water

Three travelling wave layers, each a fixed 160vw-wide SVG scrolled left by exactly one
wavelength per period, so the loop is seamless. Periods follow deep-water dispersion
(T ∝ √λ), which also keeps the layers from ever visibly repeating together (11.2 s and 7.1 s
realign after about fourteen minutes).

| layer | wavelength | period | amplitude | where |
|---|---|---|---|---|
| `#wv3` back swell (light) | 80vw | `--T3` 15.8 s | ±4 units | behind everything afloat |
| `#wv1` front swell (mid) | 40vw | `--T1` 11.2 s | ±6.8 units (±5 px) | over the boat and the visitors |
| `#wv2` chop (mid) | 16vw | `--T2` 7.1 s | ±2.7 units | in front of the front swell |

`#foamA` / `#foamB` are white strokes drawn on the front swell's crests, scrolled on the
same clock, that "break" (fade in and out) every other pass. `#waves` (in flow, the page's
last row) is the static sand dune and a still floor of water under all of it.

**Phase lock, with no JavaScript.** The front swell's troughs sit at x = 20 + 400n of 1600
and the chop's at 100 + 160n; the boat sits at `left: 42vw` = x 420, so at t = 0 there is a
trough under the boat on both layers whatever the window width. The boat's `.btSwell`
wrapper heaves (`translate`, ±`--h1` px) and pitches (`rotate`, ±`--p1`) on `--T1`, and
`.btChop` inside it on `--T2`; the waves run left into the bow, so pitch leads heave by a
quarter period, which is an `animation-delay` of −T/4. All of these start in the same style
recalculation when `body.waveMotion` lands, so they stay locked forever. The drift on
`#boat` is capped at 20 px (a 9° phase error). Result: the hull's waterline never changes,
which is what fixed "the boat regularly dips beneath the waves".

Floating visitors (buoy, turtle, paper boat, whale) run `thingHeave` on the same period;
`Sea.play` aligns their animation's `startTime` to the wave's, so they bob with the water
where they begin and drift out of phase slowly (which reads as a float).

## The weather

Three states, chosen per class period by the director, set as `<body data-sea>` and read
by every keyframe through custom properties: `--h1/--h2` (heave), `--p1/--p2` (pitch),
`--swell/--chop` (the layers' `scaleY` about the mean waterline), `--foam`, `--flut`
(pennant flutter) and `--flutT`.

| state | odds | what changes |
|---|---|---|
| calm | 20% | half the swell, no foam, a 2° heel |
| breezy | 55% | the baseline |
| windy | 25% (35% Fridays) | 1.4× swell, 1.6× chop, a 9° heel, foam on every crest, the pennant snaps, **the paper boat sinks** |

Settings → Sea weather: *Varies by period* / *Always calm* (the lever for testing days).
Overcast, night and real weather were considered and rejected: a palette shift reads as a
display glitch, night doesn't match school hours, and nobody would verify an API.

## The boat

`#boat` (drift on `transform`, the alarm-dismissal hop on `translate`/`scale`) →
`.btSwell` → `.btChop` → `svg.btSvg`. Inside: `.btWake` (bow and stern foam, the bow peaks
as the bow slams down), `.btRig` (the pennant group, forestay, main, jib, mast, burgee, hull
with a raised pointed bow, waterline stripe, and the gull), and `.btSpray` (droplets thrown
off the sail by a hit). The boat's reactions to acts ride on the rig's own `rotate` and
`translate` properties so they add to the idle motion instead of replacing it: `.struck`
(the attack's lurch, timed to the hit), `.rippled` (the whale's splash reaching it),
`.pennant` (a 4° heel as the wind catches the cloth). The class is added in the same call
as the act's `.go`, so the two run on one clock.

**A Chrome rule learned the hard way:** an SVG element with a `transform` animation AND an
individual-property (`translate`/`rotate`/`scale`) animation running at once paints the
`transform` only — `getBoundingClientRect` lies and says both applied. So every creature
that needs two independent motions nests them: `.ssSeg` dives while `.ssHump` rolls,
`.atSeg` sinks while `.atHump` coils, `.scBody` turns while `.scFish` darts, the spray's
`<g>` carries x while its `<circle>` carries y.

## The cast

Every creature is a solid navy silhouette drawn head-first in its direction of travel, one
dominant curve, one paleturq eye in the front third, tapering appendages, nothing
symmetric, and any part that moves on its own is its own `<g>` with a `transform-origin`
at its joint (never `center`). Detail lines are 1–1.2 unit paleturq strokes that follow
the form and never close into a symbol. Made objects (the paper boat, the gull's body) get
a navy outline with `vector-effect: non-scaling-stroke` so the line weight survives the lanes.

| act | tier | length | lane | the moment |
|---|---|---|---|---|
| serpent | common | 26 s | far | glides left head-first, dives head-first with the coils following, resurfaces |
| turtle | common | 34 s | far / near | both front flippers stroke together, the body surges; halfway it lifts its head, dips, comes back |
| school | common | 12 s | far | four real darts (a 200 ms burst, a coast); at the first pause they turn around, think better of it, turn back; s5 is always last |
| paper | common | 50 s | far / near | a boat folded from a ruled worksheet; in windy weather it lists in the last third, soaks, and goes under bow-first |
| buoy | common | 46 s | far / near | the lattice tower IS the π; a lamp blinks; it leans into the drift |
| fish | uncommon | 5.6 s | far | a flying fish, four damped hops with gravity, rings where it lands, the dotted parabola |
| dolphins | uncommon | 9.5 s | far | two on one damped arc a quarter-hop apart: a sine and a cosine |
| chase | uncommon | 11 s | — | the skipper, then the dolphins 1.2 s behind |
| pennant | uncommon | 22 s | boat | mast up, a rolled lump climbs in three hitches, the cloth reveals from the mast (a clip, so the letters never squash), flutters, comes down in hitches; the last hitch sticks and pops back up once |
| gull | uncommon | 6.5 s + | resident | flies in, lands on the masthead, sits three to eight minutes looking about, and is the first to leave when something loud is coming |
| whale | uncommon | 24 s | far | a footprint on the water, surfaces with an overshoot, a puff then a shot from the blowhole, a breath, rolls forward and the fluke lifts LATE and hangs, slips under, bubbles, a foam ring where it will come up, the BREACH (fastest at the surface, a hang at the apex, a fast fall), a crown splash, the ripple reaches the boat, and a wave of the fluke goodbye |
| attack | rare | 20 s | far | bubbles 200 px right of the boat; the periscope (just the head) rises, looks, sinks; four slither strokes in, head low, never stopping; parks 40 px short; sees the boat; rears with an overshoot; a wind-up and ONE hit at 12.0 s (jaw snaps shut on contact, the boat is shoved, spray off the sail); a coil and a MISS at 13.6 s into the water beside the boat that leaned away; the head turns to the room (a front face, two eyes); a head-first dive, the coils following one by one with rings; the burgee flicks in victory |
| scatter | rare | 28 s | — | the school, then the whale surfaces under them 3.5 s later |

Timings the JavaScript depends on: `ACTS[k].dur` is the CSS length plus 500 ms. The
attack's hit (60%), miss (68%) and the boat's `btStruck` keyframes share the 20 s clock;
the whale's splash (70%) and `btRipple` share the 24 s clock. Change one, change the other.

## The director

`Sea.plan(dateStr, periodIndex, periodMinutes, weekday, memory)` is pure: a mulberry32
generator seeded by `hash(date|period)` builds the period's setlist, so the same date and
period always give the same show and every period sees a different one. The arc:

- a **greeting** (turtle, school or paper) 45 s after the bell, as kids sit down;
- **hush** through the first ten minutes (instruction);
- then an act every 3–7 minutes, weighted by tier (common 1, uncommon .4, rare .12),
  thinned by **memory** (×0.5 per sighting of that act by that period in the last five
  school days, kept in `localStorage["deckhand.sea"]`, never in the config) and by
  repeats within the plan (×0.3 each);
- **rares only in the last third**, and the attack only after a serpent sighting that
  period (sightings build to it);
- nothing in the **last three minutes**;
- while a timer or the settle-in is running, only commons play;
- the **weather** for the period is drawn from the same generator.

Outside a class period (passing, before and after school, no bells) the old easy-going
scheduler runs: a single visitor every 3–7 minutes, no rares, no combos, no boat acts.

The boat answers a **tap** at once with a hop; if the sea is free and it hasn't been asked
in the last minute, a show follows from the summon pool (attack .5, whale .2, scatter .15,
chase .15). A **long press** (1.5 s) queues the period's next unseen rare — the "the class
earned it" lever. Both respect `ok()`: never under reduced motion, in stage mode, or over
an alarm.

`Deckhand.sea(name, lane)` plays an act; `Deckhand.seaModule` exposes `plan`, `acts`,
`setWeather`, `weather`, `residents`, `gullLeave`, `history`, `current`, `lastStaged`,
`summon`, `earned`, `clear`. `Deckhand.seaEvery(ms)` hurries the free-time scheduler.

## Performance budget (a Chromebox)

Only `transform`, `translate`, `rotate`, `scale`, `opacity`, `clip-path` and
`offset-distance` animate; nothing forces layout (the hop used to animate `margin-bottom`).
No SVG filters (the pennant's turbulence ripple is gone; the ripple is in the path). Wave
layers are outer `<svg>` elements (their own GPU layers); creature parts animate inside
small SVGs only. `will-change: transform` only on a `.go` visitor. Five wave/foam layers,
at most one visitor plus the boat. The attack's peak is about twenty animated SVG children.
Check on the panel with DevTools → Rendering → Paint flashing, or on a desktop with 4× CPU
throttling.

## How to add an act

1. Draw it in the register (solid navy, head-first, joints as groups) — put a proof on
   `docs/reviews/sea-2.0-creature-proofs.html` and look at it at 24 px.
2. Give it a `.seaThing` div with an id `sea-<name>`, an `svg` for effects (rings, bubbles)
   that does not move with the body, and a wrapper per independent motion.
3. Write the beats as a table first (t, what the eye sees, why), then the keyframes with a
   timing function on every keyframe that changes speed (no global ease-in-out).
4. Add it to `ACTS` with a tier, `dur` = CSS length + 500 ms, lanes, and `boat`/`loud` if
   the boat reacts or the gull should leave.
5. Frame-grab it (`tests/tmp_acts.js` in the history, or the aquarium) before trusting it.
6. Add a test: at minimum that the act's animations land and expire (`v75.spec.js`).
