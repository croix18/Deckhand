# Winter 2.1: the design (Nov 14, 2026; approved)

The drawings are `winter-proofs.html` → `winter-proofs.png` (the 2.1 drawings live in
`winter-proofs-21.js`), and `winter-proofs-8m.png` is the same sheet at one third (the 8 m check).
The motion spec is `winter-animation.md`. Nothing in `Deckhand.html` changes until Croix approves
this. The first design and 2.0 are in git (`3455d0e`, `09ea62f`); the audit that drove 2.0 is
`winter-audit.md`.

## What changed in 2.1, and why

Croix on the 2.0 proofs, verbatim: "Colored bulbs. I want better more realistic looking frost.
Smaller snowflakes. Occasional flurries. Have the ocean freeze and the coldest part of the year. The
serpent is still funky as hell not smooth. I want that thing to slither in and out of the water."

| he said | what changed |
|---|---|
| "Colored bulbs." | The countdown string is classic multicolor: red, amber, green, ice blue and yellow, repeating (C4). |
| "better more realistic looking frost" | 2.0's white feather plumes read as drawn leaves. The frost is now **grown like real window frost**: needle dendrites from nucleation points along the frame, 60° side needles, a dense white crust at the edge thinning to tips, a translucent rime and sparkle points, painted once into a canvas (C1). |
| "Smaller snowflakes." | Crystals are 18–26 px (they were 40–56), flecks 4–5 px, still exact six-fold (C2). |
| "Occasional flurries." | Snow is rare weather: one to three short flurries a week, never more than 3 flakes on the board; most periods are clear (C2). |
| "Have the ocean freeze and the coldest part of the year." | **The sea freezes** Jan 11–29: freeze-in over four days, a full freeze with the boat frozen in, and break-up. It is the season's set piece (C6e). The manatee leaves for the warm spring before the freeze and comes back on Feb 1 with a calf. |
| "The serpent is still funky as hell not smooth. I want that thing to slither in and out of the water." | **The serpent is redrawn for every season**: one continuous body that moves as a traveling wave, so coils rise out of the water, slide back along the body and sink again. It arrives and leaves by slithering up and down, never by appearing. The attack is rebuilt on the same body (C8). |

**Croix's picks on 2.1 (Nov 14), verbatim:** "Yes build it. All year round. Lights countdown. Then reverse countdown. Yeah that's good for freeze." So: build it; **the new serpent is year-round** (C8); **the lights count down to the break, then count down again after it** (C4); **the freeze, Jan 11–29, is approved** (C6e). The serpent has a working prototype, recorded at 60 fps (C8).

Everything else is 2.0's: ice blue as winter's color, navy-edged snow, the Nov 30 start and the
March coda, the beach snowman, the lights across the top, Steward worked piece by piece, silence.

---

## The register and the palette

The register is the sea's and October's.
- **Creatures** are solid navy silhouettes with one paleturq eye and tapers everywhere.
- **Made things** read by their fill.
- **Everything** is judged at board size and at one third.
- **Two motions** on one element are two nested elements.
- **Every motion** sits behind `body.waveMotion`.

**Winter's color is ice blue `#4C7BD9`**, with two tints:
- `#C9D9F7`, the shadow side of snow;
- `#E6EEFD`, frosted glass and sea ice.

It is the one hue the board doesn't already use: teal and turquoise are green-blues, and navy is
near-black. Every snow shape has a **navy edge** (1.6 px, non-scaling).

**The warm notes:**
- the lantern;
- the snowman's beach finds: sargassum `#A8782E`, driftwood `#8F7A60`, cream shells with rust ribs;
- the sprout, in November's green `#4F6B3A`;
- now the **colored bulbs** (C4).

Coral stays the alerts' color.

**Rules (October's).**
- **Never** over the full-board clock's digits (31–69% of the width at 1080p), the bell strip or the
  bathroom pill.
- **Never** on the stage, the landing page or a phone.
- **Reduced motion:** everything holds still.
- **Settings → Seasonal touches → Off** takes all of it.
- **Classes:** everything hangs off `body.winter` and its date classes.
- **Purity:** scheduled things are pure functions of (date, period).
- **Taps** are small.
- **Sand pieces** stand at the right edge.

---

## A. When (2026–27, as Deckhand knows the calendar)

Deckhand knows whole skip weeks (Nov 23, Dec 21, Dec 28, Mar 22), not single days off. Jan 4 is a
student day and Dec 18 a normal class day (Croix: "Yes and yes I think at least").

| | dates | what the room sees |
|---|---|---|
| **Starts** | **Mon Nov 30** (the first school day after the Thanksgiving skip week; fallback Dec 1) | November clears. The first snowflake falls, a snowball sits in the scarecrow's slot, the first frost is in the corner, and the string goes up dark. |
| **December** | Nov 30 → Fri Dec 18 | The frost grows weekly, and the dune gets snow. The snowman is built in three stages (finished Dec 14). One more bulb lights each December school day (Dec 18 → 14). The manatee arrives Dec 7. The serpent tastes the first snow. |
| **Break** | Dec 19 → Jan 3 | The last school day's world holds: 14 lit, the snowman finished. |
| **Back** | Jan 4 → 21 | **The reverse countdown:** one bulb goes dark each school day (Jan 4 → 13 lit, Jan 21 → 0); the string comes down Jan 22. The manatee greets every period on Jan 4–5 and **swims off upriver on Fri Jan 8** (its last act heads out left). |
| **The freeze** | **Jan 11 → Jan 29** | The frost grows to F5 (Jan 11–21) and peaks Jan 22–29, as the last bulb goes out. **The sea freezes**: freeze-in Jan 11–14, the full freeze Jan 15–25, break-up Jan 26–29 (C6e). **Caper week, Jan 25–29**: the serpent wears the snowman's scarf. |
| **The thaw** | Feb 1 → Feb 26 | Open water on Feb 1, with a few floes drifting out Feb 1–5. **The manatee is back with a calf** (the greeting on Feb 1–2). The scarf is back on the snowman. The frost shrinks and drips. The snowman leans (Feb 8–12), slumps (Feb 15–19), and is a puddle with a growing sprout (**puddle week, Feb 22–26**), while the serpent wears his pail. |
| **Coda** | Mar 1–5 | Plain, except the pail back on the sand with the sprout planted in it. The turtle greets every period. |
| **Ends** | Mon Mar 8 | `active()` returns null. |

**Every beat runs several days**, so a class that misses a day misses nothing:

| beat | how long |
|---|---|
| each of the snowman's stages | a week |
| the finished snowman before break | five days |
| the manatee's debut | two days |
| its first-back greeting | two days |
| the reverse countdown | 14 school days |
| the freeze-in | four days |
| the full freeze | nine school days |
| break-up | four days |
| caper week | five days |
| the calf's return greeting | two days |
| the puddle | five days |
| the coda | five days |

**The December counter.**
- **Lit bulbs** are the December school days so far, today included; **dark bulbs** are the school
  days left before break, after today.
- Dec 2 → 2, Dec 16 → 12, Dec 18 → 14. On Nov 30 the string is up and all dark.
- There is one bulb per December school day: 14 in 2026–27.

### A1. The seam with November

Fri Nov 20 is November's feast week; then comes the Thanksgiving skip week. On **Mon Nov 30**:

| November's slot | what takes it |
|---|---|
| the branch, in the clock card's corner | the first frost |
| the leaves' columns | the first snowflake |
| the scarecrow's slot | a snowball, with its track and the gull's prints |

The lantern and the gull's scarf carry over, so it is the same place getting colder.

---

## B. Inclusiveness

Winter stays secular: no trees, wreaths, holly, Santa, reindeer, candy canes, menorahs, kinaras,
stars-on-top or sleigh bells.

**Colored lights are Croix's call.** 2.0 recommended one warm color because multicolored strings can
read as Christmas. With nothing else holiday on the board, a multicolor string over a countdown to
winter break reads as a winter party, not a holiday symbol. The palette avoids a dominant
red-and-green pairing: five colors in rotation, with ice blue and amber between the red and the green.

---

## C. The cast

Sizes are 1080p board pixels. The boat's box is 38 px. On the water, things stay near the boat's
size (Wilson's rule); on the sand, at the scarecrow's scale.

### C1. The clock card's corner: frost grown like real window frost

**The reference.** Real window frost:
- **It starts at the frame.** Ice nucleates on scratches and dust along a window's frame, where the
  glass is coldest, so frost grows **inward from the edges**, never out from one point.
- **It grows as needles.** From each nucleus a straight **needle** grows. Ice is hexagonal, so side
  needles leave at **60°** and branch again. A plume is a feather of needles, not of leaves.
- **It thins inward.** At the frame the plumes crowd into a **white crust** over a soft **translucent
  rime**. Inward they thin to single needles and **delicate tips**.
- **It catches the light.** A few tips catch the light as **sparkle points**.

It must never read as a web (lines from one point) or as foliage (filled leaf shapes, which is what
2.0's plumes were).

**How it is drawn** (`frostPaint()` in the proofs, seeded so every board grows the same frost):
1. **The rime.** A translucent ice-blue haze (`rgba(206,221,247,.78)` at the frame) fading to clear
   across the envelope, and fading out toward the strip's bottom: the frosted pane.
2. **Needle plumes.**
   - **Nuclei:** one every 11–23 px along the card's right edge and its top edge (denser at the
     peak).
   - **Stems:** from each nucleus a stem grows inward in 4 px steps with a slight curl.
   - **Side needles:** every 5–7 px the stem throws a pair of side needles at 60°, longest a quarter
     of the way out (a feather's taper, up to 26 px).
   - **Sub-needles:** side needles over 9 px throw short sub-needles at 60°.
   - **Strokes:** widths 1.3, 0.8 and 0.5 px. Each needle is stroked twice: a faint ice-blue shadow
     0.7 px down-right, then white. That shadow is what gives white needles on a pale pane their
     relief.
3. **The crust.** Hundreds of tiny three-armed needle stars crowd the frame, densest at the edge.
4. **Sparkle points.** A few tips get a small white cross with an ice-blue glint.
5. **Icicles and a snow lip** along the top edge: clear, with a white-to-ice-blue gradient, 5–35 px,
   longest toward the corner. Drops form at their tips in the thaw.

**How big.** The envelope is 2.0's, fitted to the measured free corner: at least 28 px from every
line of the face and 12 px from every control. The stage chip gets a clear ring, cut from the haze
too.

| board | the peak (s = 1) |
|---|---|
| 1920 × 1080 | 496 px in from the right edge × 617 px down it, plus a band 113 px deep along 783 px of the top edge: about 9× November's branch |
| 1280 × 800 | 201 × 438 px, no top band (the date line is 23 px under the card's top) |

| stage | dates | s |
|---|---|---|
| F1 | Nov 30 – Dec 4 | .25 |
| F2 | Dec 7–11 | .40 |
| F3 | Dec 14 → break | .55 |
| F4 | Jan 4–8 | .78 |
| F5 | Jan 11–21 | .90 |
| **peak** | **Jan 22–29** | **1** (the day after the string comes down) |
| T1 | Feb 1–12 | .72, dripping |
| T2 | Feb 15–19 | .45 |
| T3 | Feb 22–26 | .22, a rim |
| | Mar 1 | 0 |

**Cost (measured; proofs §4).** The frost is **one `<canvas>`** in the DOM. The generator draws the
needles into it once per stage change.

| stage | needle segments | canvas (board px) | paint once (Chromium) | 4× CPU throttle |
|---|---|---|---|---|
| F1 | 540 | 200 × 159 | 1.2 ms | 6.3 ms |
| F3 | 2,978 | 435 × 344 | 5.5 ms | 29.4 ms |
| peak (1920) | 15,635 | 787 × 621 | 38.3 ms | 183.9 ms |
| T3 | 383 | 177 × 140 | 1.3 ms | 6.3 ms |
| peak (1280) | 3,249 | 206 × 442 | 7.5 ms | 41.1 ms |

- **Variance:** timings vary about 20% from run to run.
- **When it paints:** at the day's first tick, on a resize, and at a bell only if the face's boxes
  moved. It runs in an idle callback, and the old canvas stays up until the new one is ready.
- **At devicePixelRatio 2:** the canvas has 4× the pixels, and the peak's paint roughly doubles. The
  needle count is the same.
- **After the paint:** nothing about the frost costs a frame. The drip and the breath are separate
  small elements.
- **A pre-rendered texture** was considered and not needed: the generator is the texture, it costs
  nothing in file size, and it refits to any board.

**Tap: a warm breath.** A clear oval about 108 × 92 px opens with a fogged rim, and the nearest
icicle drips twice. The frost grows back over 45 s. **Reduced motion:** the frost holds still at its
stage; a tap clears the spot as a state, and it is gone 45 s later.

### C2. The air: smaller flakes, occasional flurries

**The flakes** (`Snow`, a sibling of `Leaves`, in the outer 15% columns) are exact six-fold (one arm,
mirrored, turned six times), filled white with a 1.3–1.8 px ice-blue edge and a pale rib:
- **the dendrite**, 20–26 px;
- **the stellar plate**, 18–22 px;
- **the fleck**, a solid 4–5 px hexagon, falling in pairs.

At this size a flake is about the boat's sail: snow, not an ornament.

**Flurries are rare weather.** `flurries.times(date)` is pure in the date:

| stretch | flurries a week (the room) |
|---|---|
| Nov 30 – Dec 4 | 1 (the Nov 30 first snowflake, in the morning's first period) |
| Dec 7–18 | 2 |
| Break | 1 a day, free time only |
| Jan 4 – Feb 5 | 3 |
| Feb 8–12 | 1 |
| Feb 15 → | none |

- **A flurry** is one period's **3–6 minutes**, starting 10–35 minutes into the period (never in the
  first ten or the last three), **5–9 flakes in all**, never more than **3 on the board** at once.
- **Every other period is clear**: nothing falls.
- **How often a class sees one:** about every week or two, so it is an event.
- **The dusting:** during a flurry the snowman's pail and the boat's deck get a dusting that stays
  until the bell.

**The first snowflake of the year.** The first spawn on Nov 30 is a 26 px dendrite down the right
column.

**Windy flurries** slant left.

**Landing.** A flake that reaches the water melts with a small ring; on the frozen sea it lands and
fades.

**Reduced motion.** Nothing falls. During a flurry, two crystals lie still on the sand by the
snowman.

### C3. The sand: the dune's snow, and the snowman (2.0's, unchanged)

**The dune's cap** is white, 14 px at its thickest, with a `#C9D9F7` underside and a thin ice-blue
line, clipped under the dock.

| Nov 30 – Dec 4 | Dec 7–11 | Dec 14 → Feb 12 | Feb 15–19 | Feb 22–26 | then |
|---|---|---|---|---|---|
| .45 | .7 | .85 (1 during the freeze, Jan 11–29) | .6 | .3 | none |

**The snowman** stands in the scarecrow's slot: right 3vw, bottom 34 px, 120 × 160 px at 1080p
(`--wnSmW: clamp(84px, min(6.25vw, 11.1vh), 132px)`). He is the gull's beach snowman:
- three lumpy packed-snow balls with navy edges, blue shade crescents and sand flecks on the base;
- pebble eyes of different sizes, an amber cone-shell nose and a pebble smile;
- scallop and sand-dollar buttons and a small spiral shell;
- driftwood arms, a sargassum scarf, and an upside-down sand pail in ice blue.

The stages:

| stage | dates | |
|---|---|---|
| S1 | Nov 30 – Dec 4 | a snowball, its track, the gull's prints |
| S2 | Dec 7–11 | stacked, eyes, arms, one shell |
| S3 | Dec 14 → | finished |
| caper | Jan 25–29 | the scarf is gone; seaweed scraps lead to the water |
| M1 | Feb 8–12 | leaning, drips |
| M2 | Feb 15–19 | slumped, the pail over an eye, an arm fallen |
| M3 | Feb 22–26 | a mound in a puddle, the pail gone (the serpent has it), a sprout that grows each day |
| coda | Mar 1–5 | the pail upright on the sand with the sprout in it |

**The gull's visits** start Dec 14: the first is in the day's first class by the clock, then about
one day in three before break, and one in five through January. During the full freeze the gull walks
out on the ice instead (C6e).

**The tap:** his head slips 6° and stays crooked until the next tap or the next day.

### C4. Colored string lights across the top of the page

**Where it hangs** (2.0's):
- navy tacks with a white glint along the screen's top edge (y 5), from 20 px inside the card's left
  corner to 18 px short of the stage chip;
- one navy wire in seven scallops;
- 14 C9 bulbs, two to a scallop, over the card's empty top band, in front of the frost.

Each scallop sags as far as it can (46 px at 1080p) while every bulb stays **16 px clear of the
face**. At 1280 × 800 (the date line 23 px under the card's top) the scallops over the date line pull
nearly taut, and the bulbs are ×0.74.

**The colors.** Five classic C9 colors repeat along the string: **red** `#E0483E`, **amber**
`#EE8F22`, **green** `#2FA85A`, **ice blue** `#4C7BD9` and **yellow** `#F2C82E`. They are tuned to
the board:
- the red is warmer than the alerts' coral and lighter than the Veterans Day red;
- the green is a clear mid green, not November's olive;
- the blue is winter's own;
- amber and yellow sit with the lantern.

**Lit** is saturated glass (17 × 26 px), a pale hot core and a soft halo of its own color. **Dark**
is the same hue gone to a dull smoke at .8, with the white glint: a dark bulb is plainly a bulb and
plainly off, and its color is still guessable.

**The countdown, then the reverse countdown** (Croix: "Lights countdown. Then reverse countdown.").
- **Up to the break:** the string goes up dark on Nov 30, and one more bulb lights each December
  school day (Dec 1 → 1 … Dec 18 → 14). The dark bulbs are the school days left before break.
- **Over the break:** all 14 lit.
- **After the break:** from the first day back, one bulb goes dark each school day, the last lit one
  first: Jan 4 → 13, Jan 5 → 12, Jan 6 → 11, Jan 7 → 10, Jan 8 → 9, Jan 11 → 8, Jan 12 → 7,
  Jan 13 → 6, Jan 14 → 5, Jan 15 → 4, Jan 18 → 3, Jan 19 → 2, Jan 20 → 1, Jan 21 → 0.
- **Down:** the dark string comes down on Fri Jan 22, and that same morning the frost reaches its
  peak.
- **Why the frost moved:** the frost's peak moved from Jan 11 to Jan 22 (F5, s .9, Jan 11–21) so the
  string finishes as the frost peaks instead of hanging over it. The freeze's dates don't change.
- **Jan 18 (MLK Day):** Deckhand knows whole skip weeks only, so it counts Jan 18 as a school day.
  The board is dark that day, so on Jan 19 the room sees two bulbs gone. Marking Jan 18 as a day off
  in Deckhand's calendar would shift the end to Jan 22 and the take-down to Jan 25.

**No motion.** No breathing, swinging or flicker. The day's new bulb lights at the first tick with a
1.5 s fade. A tap gives one damped 1.2 s swing.

### C5. The boat and the gull

- **The lantern** dims by the month: 4 in December, 3 in January, 2 in February.
- **The gull** keeps its November scarf. It leans to look at the manatee, visits the snowman, rides
  the manatee (rare) and walks on the ice in the full freeze.
- **During a flurry** a white line of snow builds along the deck.
- **In the full freeze the boat is frozen in** (C6e):
  - level, with its heave and pitch stopped;
  - rime along the stay, the mast and the jib's edge;
  - three small icicles under the hull;
  - an ice collar heaped against the hull.

### C6. The sea's winter

At most two winter acts a period (one in the thaw).

**C6a. The manatee: winter's lead** (common, near lane, 50 s, from Dec 7). A Florida manatee in the
sea's register:
- a navy silhouette 92 px long, 18–24 px above the water;
- a squarish whiskered snout, with paleturq whisker dots and nostrils;
- one paleturq eye and a small flipper;
- the **round paddle tail**;
- three paleturq **prop scars** on its back.

It breathes nostrils-first beside the boat (a little spray), lifts its head to look at the boat (the
gull leans), cruises right, and dives with the round tail lifted clear. It debuts Dec 7–8 (every
period) and greets Jan 4–5.

**It leaves before the freeze.** Manatees can't take cold water; in a cold snap Florida's go up the
rivers to the warm springs. On **Fri Jan 8** its act ends differently: it swims off left, out past the
dock, and does not dive. From Jan 11 it is gone.

**C6b. It comes back with a calf** (Feb 1). The greeting on Feb 1–2 is the mother and calf: the calf
at 0.55× follows close behind, breathing a beat after its mother. Through Feb 26 the calf act is
uncommon and the single manatee common. Florida calves are born spring through fall and stay with
their mothers for two years, so the return with a calf is the season's reward for the cold.

**C6c. The ride** (rare, a last third, Dec 14 → Jan 8 and Feb 1 → 19). The gull lands on the
cruising manatee's back and rides it across, then flies home before the dive.

**C6d. The serpent's winter** (on the new body, C8).
- **December, the first snow** (uncommon, flurry periods only): it lifts its head and a flake lands
  on its snout.
- **January, caper week** (Jan 25–29): it wears the snowman's sargassum scarf, in the attack too. Its
  weight is ×2.
- **During the full freeze:** it is the one thing that moves in the sea (C6e).
- **February, puddle week** (Feb 22–26): it wears the pail.

**C6e. The frozen sea: the season's set piece** (Jan 11–29), Croix's ask for the coldest part of the
year.
- **Freeze-in (Jan 11–14).**
  - Day 1: a white shore-ice rim grows along the dune from both ends, and the first pancakes (small
    pale disks) form on the open water.
  - Day 2: the sheet reaches a third of the way in from each side.
  - Days 3–4: one lead of open water is left near the middle.
  - The waves still run in the open water and are stilled under the ice.
- **The full freeze (Jan 15–25).**
  - **The ice:** the water band is one sheet of pale `#E6EFFB`, with a snow-dusted white rim along
    the shore, long white sheen streaks, ice-blue crack lines, frozen bubbles and drifts of dusting.
  - **The waves stop:** their animations pause under `body.wnFrozen`, which also saves their cost.
  - **The boat** is frozen in and iced (C5).
  - **The gull** walks out on the ice (prints behind it) on about one day in two, in a period's
    middle third, and walks back.
- **Break-up (Jan 26–29).** The sheet cracks into slabs; dark turquoise leads open between them, and
  the slabs tilt a degree or two. On Feb 1 the water is open, with a few floes drifting right and out
  (Feb 1–5).
- **The sea's acts while frozen.**
  - **The water acts rest.** The turtle, the school, the paper boat, the buoy, the flying fish, the
    dolphins, the chase and the whale don't play Jan 15–25. They play at half weight in the open
    water of freeze-in and break-up.
  - **The serpent breaks through.** Its coils punch up through the sheet where they rise, with a hole
    and tilted shards at each crossing. The holes stay for the rest of the day (pale refrozen patches
    the next).
  - **The attack still plays.** The serpent bursts up through the ice beside the frozen boat and
    sinks back through its own hole. It is the frozen sea's drama, and caper week overlaps break-up,
    so the serpent swims the leads in its scarf.
- **Reduced motion:** the ice is a still picture at its stage.

### C7. Lunch, the tape, sound (unchanged)

Cocoa with marshmallows on an ice-blue tray, and a cookie iced with a flake. The "Snow day" tape side.
**Winter ships silent.**

### C8. The serpent, redrawn for every season

**What makes today's serpent look funky.** This comes from `#sea-serpent` and `#sea-attack` in
Deckhand.html 7.63.0, and from the live frames on proofs §7.
1. **It is four separate rigid pieces**: a tail hook, two identical inverted-U arches with flat-cut
   bottoms, and a head and neck. Nothing joins them under the water.
2. **The arches pump in place.** `ssRoll` scales each arch's height .8 ↔ 1.12 every 1.6 s, so the
   coils bounce rather than travel, and the scale makes their thickness breathe.
3. **It slides on a stick.** `ssGlide` is one linear translate of the whole group, so the coils never
   move through the water; the water moves past them.
4. **The dive is a drop.** Each piece falls straight down 56 px, a quarter second after the last,
   then pops straight back up.
5. **It appears.** It enters at `left:100vw` already surfaced, and spends its last third behind the
   dock.
6. **The attack is built the same way**: `atCoil` (scaleY .72 ↔ 1.15) coils and `atSink` straight
   drops.

**The new serpent** is one continuous body.
- **Shape.** A centerline is sampled every 2 px from the snout (s = 0) to the tail (s = 164 px) and
  offset by a thickness profile into **one filled navy outline**:
  - a snout of 3 px, swelling to a 10.7 px jaw;
  - a neck narrowing to 7.4 px;
  - a body of even weight;
  - a tail tapering to a point, with a small fin;
  - a backswept horn, small spines on the tops of the coils (only where the body faces up), one
    paleturq eye in the front third, and a paleturq mouth line.

  One fill, so the line weight never breathes.
- **Motion: a traveling wave.**
  `y(s, t) = waterline + D(x) − headUp(s) − A(s) · sin(2π (s/λ + f·t))`
  - λ = 64 px, f = 0.5 Hz, and A = 15 px: 0 at the neck, ramping in by s = 36, easing toward the
    tail.
  - The head swims left at 84 px/s.
  - The wave runs back along the body at 32 px/s, slower than the swim, so each coil rises out of the
    water behind the neck, slides back along the body and sinks near the tail.
  - The head and neck ride 13 px up (headUp), with a gentle 1.2 px bob.
- **Entering and leaving by slithering.** `D(x)` is the sea's depth along the lane: deep (40 px) at
  the entry and the exit, 4 px between, and a 34 px dive mid-pass.
  - It comes up out of the water head-first along a slope, coils following.
  - It dives and resurfaces mid-pass.
  - It goes down head-first at the end, the tail last. It never pops.
- **The waterline** clips everything below it. Where the body crosses the surface there is a small
  white ripple; where the head breaks it, three drops of splash.
- **Costumes** ride on the body: the scarf wraps the neck and streams back along it, and the pail sits
  on the head at the head's angle. The first-snow beat lifts the head 16 px more.
- **On the frozen sea** each span above the surface punches a hole with shards (C6e).
- **The attack** is rebuilt on the same body:
  - the coils roll in toward the boat along the same traveling wave;
  - the head rears (headUp + 34 px) beside the boat, lunges and misses;
  - the whole body slides back down through the water along its path, coils following the head;
  - the front-face moment stays (the face swap is a separate drawing), and coral stays its eye's
    color.

**The prototype** (`tools/proofs/serpent.html`, recorded by `tools/proofs/serpent-record.js`).
- **The strip:** Deckhand's real sea, 1920 × 200: the static `#waves` (sand, light and mid water), the
  back swell `#wv3`, the front layers `#wv1`/`#wv2` and the foam, copied from Deckhand.html and
  scrolled on their own periods (11.2 s, 7.1 s, 15.8 s); the boat on the swell at 42vw.
- **The scenes:** the far-lane pass, the attack and the frozen pass.
- **The clips** are in `docs/reviews/serpent-clips/`, recorded frame by frame with the clock stepped
  exactly (no dropped frames):

  | clip | what it shows | size |
  |---|---|---|
  | `serpent-compare.mp4` | today's live pass from Deckhand.html (top) over the new one (bottom), 1920 × 400, 26 s at 60 fps | 657 KB |
  | `serpent-attack.mp4` | the new attack, × 2 round the boat, 20 s at 60 fps | 490 KB |
  | `serpent-closeup-x3.mp4` | × 3 of the new pass, 10 s at 60 fps | 325 KB |
  | `serpent-closeup-x3.gif` | the same, looping, 9 s, 20 fps, 960 wide | 960 KB |
  | `serpent-ice.mp4` | the frozen pass, 26 s at 30 fps | 209 KB |

**What the prototype changed, so it reads as one animal in the water.**
1. **The waterline is the far lane's real one** (19.3 px above the screen's bottom, where today's
   serpent sits), and Deckhand's front wave layers paint over the body there, so it is in the water,
   not on the sand band. The still frames' strip had put the waterline at the sand's edge.
2. **The submerged body shows.** The whole body is drawn again under the waterline, over the front
   waves, in navy at 20%: the coils are visibly joined under the surface, so two humps and a head read
   as one serpent seen through clear water.
3. **Longer, taller coils and a raised head.** The proportions changed:

   | | before | now |
   |---|---|---|
   | wavelength | 64 px | 80 px |
   | amplitude | 15 px | 17 px |
   | body length | 164 px | 176 px |
   | head and neck lift | 13 px | 19 px |
   | the outline | straight segments | smoothed with quadratic midpoints |

   Fewer, rounder coils, with the head riding clearly above the water.
4. **Entry and exit are depth slopes** (smoothstep 46 px over 12% of the lane), so the head comes up
   and goes down along the body's path. The swim (84 px/s) and the wave (0.42 Hz, running back along
   the body at 34 px/s) are constant.

**The attack on the same body** follows the live act's beats and times:
- **0–2.8 s, the tell:** bubbles, and only the horn and eye showing.
- **2.8–10 s, the slither in:** an ease-out stop 46 px from the mast.
- **10–11 s, the rear:** lift 0 → 40 → 36, the eye coral.
- **11–12.4 s, the lunge:** 20 px toward the boat.
- **12.4–13.6 s, the miss:** the head into the water; the boat's pitch kicks 7° and damps out.
- **13.6–15.7 s:** a look.
- **15.7–20 s, the sink:** the body slides back and down its path, head first.

**Cost (measured, `serpent-record.js cost`, 240 frames real time).** The serpent's JavaScript is
0.24 ms a frame, and 0.97 ms with 4× CPU throttling. Frames held 16.7 ms (60 fps) at both. That
includes rewriting the body, ghost, spine, face and ripple paths every frame. The budget line was
2 ms.

**How it goes into Deckhand.**
- **Replace:** `#sea-serpent`'s and `#sea-attack`'s pieces with the prototype's elements: two body
  paths (above and below the waterline), spines, a face, ripples and a splash.
- **Drive:** a `SerpentBody` module, one `requestAnimationFrame` loop that runs only while
  `.go` is on the act.
- **Stop:** the loop stops at `dur`, on `deckhand:stage`, under reduced motion and when the page is
  hidden.
- **Unchanged:** the act's names, durations and `Sea.play()` entry.
- **Fold in:** the boat's `struck` reaction stays the act's, and the costumes and the ice holes
  become options on the body.

**What it touches.**
- the year-round sea's `serpent` and `attack` acts, and their markup and CSS in Deckhand.html;
- the winter costumes;
- the tests that summon them:
  - `settle-and-media.spec.js`: the serpent glides; the sea sleeps on the stage;
  - `stage-and-sea.spec.js`: the visitor list;
  - `v71.spec.js`: the act names;
  - `v75.spec.js`: the attack only after a serpent sighting.

The act names, durations (26 s and 20 s) and the director's rules don't change, so those tests stand.
A new test checks that the serpent's body is one path, and that the frame loop stops when the act ends
and on the stage.

---

## D. The story, as the room sees it

1. **December: "It snowed."** The Monday back from Thanksgiving the first snowflake falls, and a
   snowball sits in the scarecrow's slot. A string of dark colored bulbs is up across the top of the
   board, and one more lights each morning. Frost creeps in from the clock's edges. The snowball
   becomes a snowman of beach things. A manatee arrives and looks at everyone. Now and then, a short
   flurry.
2. **January: "The freeze."** The first week back the manatee swims off upriver. The lights come
   down, the frost covers the corner, and over four days the sea freezes over. The boat is frozen in,
   and the gull walks out on the ice. Only the serpent moves in the sea, breaking up through the ice.
   In the last week the ice breaks up, and the serpent swims the leads wearing the snowman's scarf.
3. **February: "The thaw."** Open water again, and the manatee is back with a calf. The frost drips
   away. The snowman leans, slumps and becomes a puddle with a sprout growing in it, and the serpent
   wears his pail.
4. **March: "Spring."** For one week: the pail back on the sand, with the sprout planted in it.

---

## E. Steward, piece by piece

The proofs' Steward board (§9) is a dense stand-in built in Deckhand 7.63.0 (the real Steward isn't
in this repo). Measured on it: a 24 px top margin, 38 px gutters, and 45 px of free sand under the
bottom row.

| piece | in Steward | why |
|---|---|---|
| colored lights | a taut string in the top margin at 0.42× (7 × 11 px), every bulb above y 18 | the margin minus the 6 px card area is all there is |
| frost | none | no free corner is 40 px deep |
| flurries | none | only the gutters are free, and a flake passing behind cards would blink |
| dune cap | as Deckhand | the sand band |
| snowman | 45 px in solid shapes at the right edge | the free sand |
| **the frozen sea** | **exactly as Deckhand**: freeze-in, the full freeze, break-up | the water band is free of cards |
| manatee, calf, ride, serpent (new body), attack | unchanged | the water is free |
| the boat frozen in, the lantern | unchanged | |

Check it on the real Steward board before building there.

---

## F. Considered and dropped

- **The arctic cast:** the seal, floes as a visitor, the narwhal, tusking, penguins, a polar bear.
- **The squall** (Croix: "Cut it").
- **Snow every period** (Croix: occasional flurries).
- **A breathing hole for the manatee in the ice.** Manatees can't survive water that cold; leaving
  and coming back with a calf is truer, and a better story.
- **A frozen sea for the whole of January.** Three weeks with no water acts would starve the sea. The
  freeze is the peak's set piece, framed by freeze-in and break-up.
- **A pre-rendered frost texture.** The generator is cheaper in file size and refits to any board.
- **The rest, with 2.0's reasons:** the gull's hat, holiday symbols, an aurora, snow on the cards,
  fireworks, real weather, a snow globe, animating the melt.

---

## G. What the proofs show

`winter-proofs.png`:
1. **True size** beside the boat and the live November pieces.
2. **The colored lights:** the countdown and fully lit at 1920, the countdown at 1280, the five colors
   lit and dark, and both at one third.
3. **The smaller flakes** and the flurry schedule.
4. **The frost:** a × 2 close-up of the peak beside the reference description, the same at 1:1, every
   stage at board size, and the cost table.
5. **The snowman.**
6. **The manatee and calf.**
7. **The serpent:**
   - today's live act beside the new one, one pass, eight frames at true size;
   - the new one's frames at × 3, and today's at × 3;
   - the new body in winter's costumes, on the ice, and in the attack.
8. **The frozen sea** at true size: freeze-in day 1 and day 3, the full freeze, break-up.
9. **Nine composites** on the real board:
   - Dec 2 and Dec 16;
   - Jan 13 (freeze-in), Jan 20 (the full freeze) and Jan 27 (break-up in caper week);
   - Feb 24;
   - 1280 × 800 on Dec 16 and Jan 13;
   - Steward.

**Weak points, honestly.**
- **The frozen sea is a thin set piece on Deckhand's board.** The water band is only about 26 px tall
  at 1080p, so at one third the freeze reads as the sea going pale and white more than as a scene. Its
  detail (cracks, the boat's rime, the gull's prints) is front-row. Making it bigger means raising the
  sea, which is a change to the whole board.
- **The breathing manatee** reads as a sea animal with its head up. The cruise and the round-tailed
  dive are what say "manatee."
- **The new serpent is proven only in still frames.** It needs the aquarium and the Chromebox to
  prove its motion and its per-frame cost.
- **February is the faintest month** at one third (it is the thaw).
- **At 1280 × 800 the boat sits behind the dock** (as it does today), hiding every boat beat.

---

## H. Decisions for Croix

Decided (Nov 14): build it; the serpent year-round; the countdown, then the reverse countdown; the
freeze Jan 11–29. Still open:
1. **The window:** Nov 30 → the Mar 1–5 coda (my pick), or Dec 1 → Feb 28.
2. **Names** for the manatee and the snowman (or a class vote); opt-ins; theme sounds (none).
3. **Jan 18 in Deckhand's calendar** (C4): leave it (my pick), or mark it as a day off.

---

## I. What to carry into the code

- **Season.** `winterStart` and `winterEnd`. `apply()` sets:
  - `body.winter`;
  - `data-wn-frost`, `data-wn-sm` and `data-wn-cap`;
  - `data-wn-bulbs` (0–14: the countdown up to Dec 18, 14 over the break, the reverse countdown Jan 4–21, absent from Jan 22);
  - `data-wn-sea` (`in1` / `in2` / `in3` / `frozen` / `break`, or absent);
  - `wnFrozen`, `wnCaper`, `wnPuddle`, `wnCoda`;
  - `data-nv-lamp`.

  Pure helpers: `winterPhase`, `breakStart`, `decSchoolDay`, `seaFreeze(d)`, `flurries.times(date)`.
- **`Snow`:** the flurry clock and the 3-flake cap.
- **`Winter`:**
  - `frost.paint()`: the generator into a `<canvas>`, in an idle callback, kept until replaced;
  - the drip and the breath;
  - `#wnLights` (colored);
  - the snowman and the visit;
  - `#wnIce`, a fixed SVG over the water band, drawn once per stage;
  - the boat's frozen state and the gull's ice walk.
- **The sea.**
  - `winterWeight`.
  - `ACTS` gains `manatee` (with its Jan 8 leaving variant), `manateeCalf`, `ride`, `serpentSnow`,
    `gullIce` and `visit`.
  - Water acts get `frozen:false`.
- **The serpent, year-round.** `SerpentBody` (the centerline, the thickness profile, the clip, the
  ripples, the costumes, the ice holes), driven by one `requestAnimationFrame` loop per act.
  `#sea-serpent` and `#sea-attack` become one `<path>` each, plus their details.
- **Tests.**
  - **The date helpers:** Nov 30; Dec 2 → 2 bulbs, Dec 16 → 12, Dec 18 → 14; Jan 4 → 13, Jan 13 → 6, Jan 21 → 0, Jan 22 no string; the
    freeze stages; the manatee gone Jan 11–29 and back with the calf Feb 1; caper Jan 25–29; puddle
    Feb 22–26; the coda; null on Mar 8.
  - **Flurries:** purity, at most 3 a week, and 3 flakes on the board.
  - **The freeze:** no water acts in `plan()` during the full freeze.
  - **The lights:** clearances at 1920 × 1080 and 1280 × 800.
  - **The serpent:** one path; its loop stops at the act's end and on the stage.
  - **The existing tests:** the serpent, attack and stage tests.
