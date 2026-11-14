# Winter — design review of the winter theme (Nov 13, 2026)

Croix, Nov 13: "Can you get started on building winter." He chose to build it in Deckhand first and
then carry it to Steward, the ESE teacher's fork. This is the design pass. Nothing in `Deckhand.html`
changes until he approves it. The motion spec is `winter-animation.md`. The drawings are
`winter-proofs.html` / `.png`, and `winter-proofs-8m.png` is the same sheet at one third (the 8 m
check). The six board composites in the sheet are the real `Deckhand.html` (7.62.0), opened at winter dates with
the `#t=` override the tests use, photographed by `tools/proofs/winter.js`, with the winter drawings
laid over them.

This doc follows the October 2.0 bar (`october-2.0-design.md`, `-animation.md`) and the November 2.0
format (`november-2.0-design.md`). I read HANDOFF's seasonal entries (v7.10–7.11.4, v7.56, v7.58), the
version log's sound decisions, `SEA.md`, and the Season, Leaves, Fall and Sea code (`Season.active`,
`apply`, `Leaves.step/spawn/fling/rest`, the `Fall` tick, `ACTS`, `inSeason`, `seasonWeight`,
`geeseTimes`, `fogMorning`) so that winter plugs into the existing system rather than adding a new one.

**Revised Nov 14, after Croix's review of the proofs:** "I like the freeze and thaw idea. The freeze
looks like the web. I want the freeze to be a bit bigger as it ices over then thaws out. Also can you
make perfect snowflakes instead of imperfect ones. And I don't see the lights." The frost is redrawn as
real frost and fitted to the clock card's measured free corner (C1); the snowflakes are perfect (C2);
the countdown lights moved from the boat to the beach (C3b); and the scarf caper moved to the last full
week of January (C3, C5).

**The verdict in one line:** winter needs one thing October and November didn't have, which is time.
It is up for three months, so it has to change while it is up. The design is a world that gets colder
through December, holds in January and thaws in February. One character's story runs the whole length:
a snowman somebody builds on the beach before the break, who loses his scarf to the serpent in January
and melts into a puddle with a sprout in it at the end of February.

---

## The register and the palette

The register is the sea's and October's. Creatures are solid navy silhouettes with one paleturq eye,
tapers everywhere and nothing symmetric (the snowflakes are the exception: Croix asked for perfect
ones, C2). Made things (the snowman, the floes, the lights) have no navy
outline, but snow has one thing they don't: **white on the white card is invisible**. So every white
thing gets a 1.1 px teal edge, the way the gull's white body carries a navy one. Everything is judged
at board size and again at one third. When two motions land on one element, they go on two nested
elements. Every motion sits behind `body.waveMotion`.

**Winter adds no colors.** Snow is the board's white. Its shadow side is pale turquoise `#D8F6F1`, and
shadow cast on snow is turq-light `#BFEFEA`. Ice is the sea's own pale turquoise with a teal `#127A85`
edge. Frost is teal hairlines over a pale-turquoise haze. The warm notes are the ones the board already
owns: November's rust `#B5542A` (the knit: the gull's scarf, the snowman's matching scarf), amber
`#D98E2B` (the carrot, the light bulbs' bodies) and October's lit yellow `#FFE45C` (the bulbs' cores,
the lantern). The teal of the hats is the board's deep teal. The sprout is teal too, like October's
pumpkin leaves. Coral stays the alerts' color. The one red in the file stays the Veterans Day flag's.

**Rules (October's, unchanged).** Edges only. Never over the full-board clock's digits (31–69% of the
width at 1080p), the bell strip or the bathroom pill. Never on the stage (`body.focusMode`, the
settle-in included), the landing page or a phone (under 780 px). Still under reduced motion. Settings
→ Seasonal touches → Off takes all of it. Everything hangs off `body.winter` and its date classes, set
by Season from the board's own clock. Scheduled things are pure functions of the date (and the
period), seeded like `geeseTimes`. Taps are small and change nothing that matters.

---

## A. When

| | dates (2026–27) | why |
|---|---|---|
| **Starts** | **Tue Dec 1** | November clears itself on December 1 (`active()` returns null today). Winter takes the slot the same morning. The board is never plain between the two seasons. |
| **December: the cold comes in** | Dec 1 → the last school day before break (**Fri Dec 18**) | The building month. Frost and icicles grow week by week, the first ground snow comes, a snowman is built on the beach in stages, and the countdown lights on the beach come on one bulb a school day. It all completes on the last day. |
| **Winter break** | **Dec 19 → Sun Jan 3** | The weeks of Dec 21 and Dec 28 are already in `bell.skipWeeks` (Lake County's seed), so the board knows them. If the board is up over break (Croix working), it **holds the last school day's world**: the finished snowman, all nine bulbs, flurries. There are no bells, so only the free-time scheduler plays. Nothing is staged for an empty room. The solstice (Dec 21) falls inside the break, so the lantern is at its brightest here. |
| **January: deep winter** | **Mon Jan 4** → Sun Feb 14 | The first day back, the lights are down and a new visitor arrives (the seal greets every period that day). This is the cold peak: the frost peaks Jan 11–29 and starts to thaw on Feb 1, the dune is white, snowfall periods are at their most frequent, the squall comes on windy snowfall periods, and the narwhals pass. In the last full week of January (Jan 25–28) the scarf caper happens. |
| **February: the thaw** | Mon Feb 15 → Sun Feb 28 | It is Florida. The frost keeps shrinking to a rim, the icicles shorten and drip, the snow days thin out, and the snowman leans (week of Feb 15), slumps (week of Feb 22) and is a puddle on the last school day of February (**Fri Feb 26**). The turtle is back. |
| **Ends** | **Mon Mar 1** | `active()` returns null and the board is plain (or spring, if one is ever built). |

**Why three months, and why it ends with February.** Meteorological winter is December to February,
and the board's seasons are already months (`active()` reads the month). By March the room is at 85°F
and spring break is three weeks away (the week of Mar 22 is a skip week). A theme that stayed up into
March would be decoration for its own sake. Three months is long for one look, which is why the look
changes: December builds, January holds, February thaws. Each month has acts the others don't (floes
and narwhals from Dec 7, the seal and the squall in January, the turtle's return in late February), so
no two months are the same board.

**The school-day counter.** Several beats count *school days left before the break*. Call it
`n(d)`: weekdays after `d`, up to the Friday before the first December skip Monday, not counting days
in a skip week. In 2026, Dec 4 → 10, Dec 7 → 9, Dec 9 → 7, Dec 14 → 4, Dec 18 → 0. If `skipWeeks` has
no December entry (another district, a changed config), the break is taken as starting on the Monday
of the week holding Dec 24. Deckhand knows whole weeks off, not single days off, so a Monday holiday counts as a school day.
That is harmless here, because the board is dark that day.

---

## B. Inclusiveness: a secular winter, by default

It is a public-school classroom, so the default is a **secular winter**: snow, ice, frost, light,
cold-weather clothes, cocoa. There are no religious or holiday symbols. That rules out trees, wreaths,
holly, stockings, Santa, reindeer, candy canes, gingerbread people, stars-on-top, menorahs, kinaras,
sleigh bells and the red-and-green scheme. The boat's lights are warm (amber bodies, yellow cores), not
multicolored, because colored strings read as Christmas. This is a default Croix can change; the opt-ins are listed in
**H**. A snowman is winter, not a holiday. The lights are a Florida December (the harbors and the boat
parades all light up) and stay secular because of their color.

---

## C. The cast

Sizes are given against the boat. Its box is 38 px at 1080p, its hull about 30 px, and its masthead
about 26 px above the waterline. Things **on the water** are the boat's size or smaller (Croix: Wilson
must be "the boat's size, not massive next to the sailboat"). Things **on the sand** are nearer the
room and stand at the scarecrow's scale, which Croix accepted in November.

### C1. The clock card's corner: the frost

Croix, Nov 14: "The freeze looks like the web. I want the freeze to be a bit bigger as it ices over
then thaws out." The first pass grew six fronds out of one corner, with branches at 60° and a radial
haze: October's web, in teal. It is redrawn as real window frost, and it is now the season's clock.

**What it is.** Four things, all generated by rules (seeded, so every board grows the same frost), none
of them radiating from a point:

- **Frost ferns.** Feathery dendrites, each from its own point along the card's top edge or its right
  edge (one every 26–42 px), growing inward with a slight lean and curl. Each has barbs on both sides
  at 60°, longest a third of the way out (a feather's plume). From mid-December they have sub-barbs,
  and about half the long ferns fork once. Ferns from the two edges overlap in the corner, where real
  frost is densest. Teal hairlines at .42 / .34 / .26 ink.
- **Rime.** A band of tiny crystals along both edges, up to 20 px deep: three-line stars and single
  needles, 3–7 px, teal at .3. It is the grain a frosted pane has at its frame.
- **The frosted haze.** Four layers of pale turquoise at .24, each hugging the edges, one inside the
  next, so the haze is densest at the frame and thins inward. The haze is what carries to the back of
  the room.
- **Icicles** under a white snow lip along the top edge, from just left of the stage chip to the end
  of the frost: pale turquoise with a teal edge and a white highlight, 8–50 px long, longest near the
  corner.

**How big: fitted to the free corner.** The frost's envelope is fitted, at layout time, to the part of
the clock card at least **28 px from every line of the face** (the date line, the digits, the period
line, the bar, the strip, the pill) and **12 px from every control** (the ⛶ stage chip, which gets a
clear ring). Measured on 7.62.0 (`tools/proofs/winter.js capture` reads the face's boxes):

| board | the free corner | the peak |
|---|---|---|
| 1920 × 1080 | a strip 539 px wide right of the face (its right edge at x 1325), plus a band 123 px deep above the date line (its top at y 175) | **485 px in from the right edge, running 598 px down it, and 113 px deep along 783 px of the top edge**; about 4.5× the area of the branch's 200 px box |
| 1280 × 800 | only the strip: 219 px wide (the date line sits 23 px under the card's top, so there is no band above it) | a 197 px strip running 424 px down the right edge, no top band |

The rule: the side lobe is 0.9 of the free strip's width (at most 520 px) and runs 0.62 of the card's
height. The top band is 0.92 of the free band's depth (at most 130 px; none if the band is under 20 px)
and runs 0.42 of the card's width. The fit is redone on resize and at each bell, because a wider period
pill or a "Passing → 2nd" line moves the face's edge. The frost is regenerated, never scaled. Unlocked,
the envelope starts under the 30 px handle band, as the web's and the branch's boxes did.

**The freeze and the thaw** (`body[data-wn-frost]`; `s` is the envelope's size):

| | dates | s | what the room sees |
|---|---|---|---|
| F1 | Dec 1–4 | .2 | first frost: rime and short ferns along both edges near the corner |
| F2 | Dec 7–11 | .35 | the ferns lengthen; the first icicles |
| F3 | Dec 14 → the break | .5 | a frosted corner: plumes with sub-barbs, a row of icicles |
| F4 | Jan 4–8 | .75 | it has grown over the break |
| **peak** | **Jan 11–29** | **1** | **the free corner frosted over** |
| T1 | Feb 1–12 | .72 | the thaw: shrinking, the icicles dripping |
| T2 | Feb 15–19 | .45 | dripping faster |
| T3 | Feb 22–28 | .22 | a rim along the edges, short icicles dripping |
| | Mar 1 | 0 | gone |

**Calm/windy.** Frost and ice do not sway. The icicles drip a few times an hour (seeded: 2–4 an hour
through January, 10–14 an hour in the thaw). On a windy day, snow sifts off the lip a couple of times an
hour: a small puff blows left, and a flake is spawned at the lip with `Snow.from()` (the branch's
let-go mechanism).

**Tap: a warm breath.** A round clear spot about 50 px across opens in the frost where the finger
touched, with a pale ring at its melting edge. The nearest icicle drips twice, and the frost grows back
over the spot across 45 s. It is the window-frost game every kid has played with their breath.

**Reduced motion.** The frost at its stage, still, with no drips. A tap still clears the spot (a state,
no motion), and the spot is gone 45 s later.

**Never.** Within 28 px of the date line, the digits or any line of the face; within 12 px of a
control; on a live settle-in card; on the stage.

**Steward.** Steward's clock card is smaller, its board denser, and a card's area is off-limits there,
so **Steward's clock card gets no frost on its face.** Steward's frost is the screen's own frame: the
same generator run along the screen's top and right edges inside the free margin (rime and short ferns
no deeper than the margin minus 6 px: 18 px at 1920 with a 24 px margin), icicles from the screen's top
edge, and the haze only in a screen corner whose 64 px square is clear of every card area.

### C2. The air: snowfall

This is the leaves' machinery with a flake in it. It is a sibling of `Leaves` (call it `Snow`), so
November stays untouched. It uses the same outer 15% columns each side (sway and size included, so
every box stays left of 18% and right of 82%), the same tick, the same rates and caps, the same windy
doubling and the same tap.

**The flakes are perfect.** Croix, Nov 14: "Can you make perfect snowflakes instead of imperfect
ones." Each is built from one half-arm, mirrored across its axis into a whole arm, and the arm turned
six times by exactly 60°, so every flake is six-fold and mirror-symmetric by construction. The seed
varies the design from flake to flake (its branch lengths), never from arm to arm. The register's
"nothing symmetric" is for creatures; a snowflake is a crystal. Four kinds:

- the *dendrite* (tapered arms, three pairs of branches);
- the *fern* (fine arms, six pairs of short branches: the lacy one, kept for "the first snowflake");
- the *plate* (six broad paddles around a hexagonal hub with sector chevrons: the heaviest-looking);
- the *tipped* (arms ending in small hexagonal plates, one pair of side spikes).

Each is white with a teal edge (an underlay at .6) and a turq-mid ridge line along each arm, so it
reads on the white card, on the grid and over the water. **Flecks** fall between them: tiny six-armed
stars, 8–12 px. A ringed dot read as a bubble on the proof sheet, so the flecks are stars.

**Size.** The crystals are 44–62 px, at the leaves' scale. Croix found 34–46 px leaves "small". The
flecks give the snow its density without adding big shapes.

**Rate and caps.** These are the leaves' numbers. The first flake comes 3–7 s after the board is up,
then one every 10–25 s, with a second a quarter of the time. The cap is 6 on the board. The kind mix
is 60% a crystal and 40% a fleck pair or triple.

- December's first week and the last thaw week (Feb 22–25): half as often.
- **Windy**: the leaves' doubling (half the gap, a cap of 10).
- A **snowfall period** (below): the same doubling.
- Windy and snowing together: a third of the gap, still a cap of 10.
- From the last school day of February on, nothing falls.
- On December 1, the day's first spawn is the big fern crystal, falling at the slowest speed down the
  right column: **the first snowflake of the year**.

**Snowfall periods** (`body.wnSnowing`) are a per-period draw from the director's own generator,
pure in (date, period), like the weather:

| phase | chance per period |
|---|---|
| December, n ≥ 10 | 0 (flurries only) |
| December, n ≤ 9 | 15% |
| The last school day before break | every period: **it snows on the last day** |
| January → Feb 14 | 30% |
| Feb 15–21 | 10% |
| After that | 0 |

A snowfall period also turns on the small snow tells: fresh snow building on the snowman, snow on the
boat's deck and the gull's hat (C4).

**Calm/windy.** Calm and breezy snow falls straight, drifting only on its own sway. Windy snow falls
**slanted to the left**, the waves' wind, by 80–160 px over the fall (clamped so a flake stays in its
column), 30% faster, and spinning faster.

**Landing.** A flake that reaches the water **melts**: it shrinks and fades in under a second, with a
small white ring where it touched. That is different from the leaves, which float. Snow doesn't float.

**Tap.** The leaves' fling: out past the nearer edge, spinning (870° instead of 620°: a flake is
lighter), in 1.1 s.

**Layer.** Snow uses the leaves' layer and z: `z-index:3`, fixed, over the canvas (`main#canvas` is
z 1), under the dock (15), the ink (14) and the alarm (30). It is in front of the snowman, which is
7.58.1's "leaves in front" rule. Note that leaves today do **not** fall behind the cards. They fall
over the clock card's outer columns and are kept off the content by the column rule, not by layering.
Winter keeps that in Deckhand. Steward is the place where the layer moves *behind* the cards (below).

**Reduced motion.** Nothing falls. Three crystals lie still on the sand at the right edge, on the snow
patch by the snowman once he exists. Tapping them does nothing (the leaves' rest state).

**Steward.** The snow layer goes **under the canvas** (z 0, between the body's grid and
`main#canvas`). Flakes then show only in the gaps and margins and pass behind every card, so no card
area is ever covered. Crystals are drawn at ×.7 (31–43 px), the cap is 4 (7 windy), and the flakes
are untappable (the canvas takes the taps, which on a dense board is right).

### C3. The sand: the snowman, and the dune's snow

**The dune's cap.** Snow lies along the dune's crest wherever it stands above the water: white, about
7 px at its thickest, lumpy, with a pale-turquoise underside. It is computed from `#waves`' own dune
path, so it stretches with the window exactly as the dune does. Its coverage follows the date:

| Dec, n ≥ 10 | Dec, n 5–9 | Dec, n 1–4 | Dec 18 → Feb 14 | Feb 15–21 | Feb 22–25 | Feb 26 → |
|---|---|---|---|---|---|---|
| none ("first frost") | patches (.55) | most (.8) | white (1) | .6 | .3 | none |

It is a separate fixed SVG over `#waves` at z 1, under the water layers, clipped clear of the dock. In
the composites it is the single biggest "it's winter" signal from across the room.

**The snowman** stands in the scarecrow's slot at the right edge (`right: 4vw`, feet at the
scarecrow's line, bottom 34 px). He is 96 × 134 px at 1080p (`--wnSmW: clamp(68px, min(5vw, 8.9vh),
112px)`), about 3.5× the boat's height, at the scarecrow's scale, and like the scarecrow his top
overlaps the clock card's empty bottom-right corner.

- **Body.** Three unequal balls: base, middle, head, each a lumpy packed-snow outline rather than a
  circle. The base is flattened where it sits. Each ball is white with a teal edge (the edge is what
  keeps the head from vanishing against the white card behind it). Each has a pale-turquoise shade
  crescent at the lower right, because the board's light comes from the upper left (the hard shadows
  fall bottom-right). Where one ball sits on another there is a contact shade.
- **Face.** Two coal eyes of different sizes. A carrot nose in amber, pointing left, toward the boat
  and the sea. A five-coal smile that rises to one side.
- **Body details.** Three coal buttons. Stick arms in navy that taper, with forked twigs: the left arm
  raised toward the boat (a wave), the right one down.
- **Clothes.** A rust scarf with cream knit bars, the **same knit as the gull's scarf**, and a teal
  bobble hat with a cream pom-pom. The gull wears the same hat on snowy days.
- **Ground.** A snow patch around his base. His contact shadow on the snow is turq-light (a shadow on
  snow is blue). A trail of four three-toed **gull prints** crosses the patch.

**The build** (by `n`, the school days to break, in `body[data-wn-sm]`):

| | 2026 | what is on the sand |
|---|---|---|
| S0 | Dec 1–4 | nothing yet (first frost) |
| S1 | Dec 7–11 | a rolled snowball, its **track** a sand-colored stripe through the snow behind it where the snow was picked up; gull prints beside it |
| S2 | Dec 14–17 | stacked: base, middle and head; coal eyes, smile and buttons; the stick arms. No nose, no hat, no scarf: he is half dressed |
| S3 | **Dec 18 →** | the carrot, the scarf and the hat: finished |

He stands complete through January. Then:

- **Caper** (Mon–Thu of the last full week of January, Jan 25–28, 2027): his scarf is gone. On Friday
  the 29th it is back (C5).
- **The thaw:**
  - M1 (Feb 15–21): he leans 4°, the carrot droops, the head settles, drops fall from the carrot's tip
    and the right stick, and the patch shrinks into a turq-light slush puddle.
  - M2 (Feb 22–25): he slumps. The base squats, the middle and head sink and tilt, the hat slips over
    an eye, the right arm has fallen to the sand, and the puddle grows.
  - M3 (the last weekday of February → Feb 28): a low mound in a puddle, with his hat on top, the
    carrot and the coal in the water, the two sticks crossed on the sand, the scarf draped over the
    mound, and a **teal sprout** with two leaves beside the puddle.

The stages change **between days**, not in front of a class. A snowman visibly melting during a lesson
would be a show. A snowman that is a little lower each morning is a story. Each change is a 4 s
crossfade at the day's first tick, the branch's regrow timing.

**Calm/windy.** A snowman doesn't move. The only idle motion is the scarf's two ends: they hang and
drift ±2° when calm, and stream left and flutter on the sea's `--flut` when windy. Hat and pom are
rigid. On a windy day, a puff of snow blows off the hat's brim every 8–12 s. On a snowfall period,
fresh snow builds on the hat's crown and along the tops of the sticks over the first 20 minutes of the
period, and it is gone at the next period.

**Tap.** His head slips: it slides about 7° on the middle ball, overshoots, and settles crooked at 6°.
A puff of snow pops off the brim and the carrot wobbles. The **next tap rights it**. A head that rolls
on a snowball is what a real one does. During the thaw (M1/M2) a tap shakes two drops loose. In M3 a
tap on the puddle sends one ring.

**The builder.** Who made him is never shown. It happens between days. But the clues are drawn: the
gull's prints in the snow, and the matching scarf and hat. On the last school day before break, in
the first period, **the gull is found sitting on his hat**. From then on, about one day in five
(seeded) the gull leaves the masthead in a period's middle third, flies to the snowman, sits on the
pom-pom for two to four minutes looking about, and flies home. This is a beach act built on the
trawler's `gullBack` machinery. The kids will work it out.

**Reduced motion.** He stands still at his stage. The scarf hangs. A tap switches his head between
straight and crooked with no motion. No visit is staged.

**Never.** In front of the boat. Over the bell strip or the pill. On the stage, the landing page or a
phone (the November media query gains `#wnSnowman`).

**Steward.** He stands on the free sand at **0.32× (31 × 43 px at 1920)**, at the right edge. Every
stage was drawn to survive that size: at 31 px he is three white balls with a teal edge, a teal hat, a
rust band and an amber point. The face is gone at that size, which is right. The visit scales with
him. See the Steward row on the proof sheet.

### C3b. The countdown lights, on the beach (December)

Croix: "I don't see the lights." He's right: at true size the boat is 38 px, and nine bulbs on its
forestay can be at most 2.3 px across. Nobody in the room can see them. The countdown moves to the
beach.

**Option A (recommended): a string on the beach.** Four navy posts, 30 px tall, stand on the dune from
just right of the boat toward the snowman (at 46%, 59%, 72% and 86% of the width), each with a cap of
snow. A wire sags between them in three scallops, and nine bulbs hang from it, three to a scallop. Each
bulb is about 10 × 16 px with its socket and hangs a few degrees off true:

- **lit**: warm amber glass, a yellow core, a soft 17 px halo;
- **unlit**: dark glass with a white highlight.

A cord comes out from behind the dock and runs along the sand, behind the boat, to the first post: the
lights are plugged in at the dock. The string stands on the sand at z 2 like the snowman, behind the
water and the boat. Its post tops sit at about y 1000 at 1080p, below the clock card's shadow (which
ends at 996).

**The story is the same.** The string goes up on Dec 7 (nine school days left), all dark. One more bulb
lights each school day, from the dock end toward the snowman, and all nine are lit on the last day
before break, reaching him on the day he is finished. Over break it stays lit. **On the first day back
it is down.** The boat keeps its lantern glow, so it still feels lit.

**Motion.** Lit bulbs breathe on their own periods; one is loose and flickers once a minute; on a windy
day the bulbs swing a few degrees on their sockets. A tap on a bulb makes it flicker twice and come
back. Under reduced motion they are lit and still.

**Option B, for comparison: the boat's own string,** at the biggest bulbs nine can be (2.4 units, 2.3
px). The proof sheet shows A and B side by side at true size on December 18 (§2). Lit, B is a faint
warm line on the stay from the front row and nothing from anywhere else.

**Steward.** The string at 0.6× on its 76 px of free sand: bulbs 9 px, posts 18 px, the whole string
30 px tall, keeping 6 px under every card's area. It still reads, and the snowman stands beside it at
0.32×.

### C4. The boat and its gull

- **The lantern stays.** November's lantern hangs on all winter and tracks the night's length:
  - December: brightest, lamp 4.
  - January: lamp 3.
  - February: lamp 2.
  - March 1: gone.
  
  The solstice is in the break, so the lantern is at its fullest when the nights are longest. It is
  `body[data-nv-lamp]` as it is today, set by Season through the winter too.
- **No lights on the boat.** The countdown moved to the beach (C3b): nine bulbs on the forestay could
  be at most 2.3 px across. The boat keeps its lantern glow.
- **Snow on the deck.** On a snowfall period, one white line along the top of the navy hull, fading in
  over ten minutes. It is the boat's clearest winter tell at 38 px: white on navy.
- **The gull.** Its November scarf (on since Nov 15) **stays on all winter**. On snowfall periods it
  wears the snowman's teal bobble hat. It leans to look at the seal and the narwhal (the
  `nvGullDucks` lean). It hunkers in the squall. It is the snowman's builder and visits him (C3).

### C5. The sea's winter visitors

They are fitted to the strip under the full-board clock: the far lane behind the boat, the near lane
in front. `dur` is the CSS length + 500 ms. At most two winter acts play a period (the October and
November cap).

**C5a. Pancake floes** (common, greeting from Dec 7, far or near, 44 s). Three round floes with the
raised rims of pancake ice, 44, 28 and 18 px wide (near), each white on top with a pale-turquoise side
and a teal edge. Each carries its own front band of water, so its waterline never changes (Wilson's
rule). They drift **right** with the current, as flotsam does in this sea (the buoy, the paper boat,
Wilson), each bobbing on its own phase. Windy: the fast small one catches the middle one, they knock,
both rock, and a few white sparks fly.

**C5b. The seal** (common, the January greeting, near, 48 s), winter's Wilson. A harbor seal: a navy
banana with a dog's muzzle, a paleturq eye and whiskers, and a few paleturq spots along the back.
Lying, it is 36 px long on a 47 px floe, so seal and floe together are the boat's size. The story:

- A ring beside the boat (Wilson's spot), and its head comes up ("bottling").
- It tilts its head at the boat, the curious seal tilt. The gull leans over to look.
- A floe drifts out from behind the dock. The seal ducks under and **hauls out** onto the floe as it
  passes, with a flop: the floe dips and rocks under the weight.
- It rides the floe away to the right, and halfway it does the **banana pose**: head and tail up
  together, which is what a cold seal really does.
- **Windy:** the floe tips and the seal slides off the low side with a splash, surfaces behind it,
  watches its floe drift off without it, and dives. That is the sad-funny beat, like Wilson's drowned
  candle.

The seal debuts on **the first day back** (the greeting in every period: something new happened over
break) and plays through Feb 14. In the thaw it has gone north. It is drawn as two overlapping halves,
so the banana pose is two rotations.

**C5c. The narwhal** (uncommon, far, 26 s, from Dec 7). The arctic's unicorn, the one winter creature
every seventh grader already loves. It is 60 px in the far lane, behind a 38 px boat: a 43 px body with
a mottled back (paleturq spots) and no dorsal fin (narwhals have none), and a 15 px tusk with a
paleturq spiral hatch. The sequence:

- **The tusk breaks the water first** and glides left alone. "What's that stick?"
- The head and back rise, and it blows a **white breath that hangs**: a cold day.
- It swims, and as it passes behind the boat it **lifts its tusk** at it, a salute; the gull leans.
- It breathes again, rolls and dives, and the heart-shaped flukes lift late and slip under.
- A ring, and one last glint of the tusk far to the left.

**C5d. Tusking** (rare, far, a last third, 30 s, never before Jan 11). Two narwhals meet, stop face to
face, raise their heads, and **cross tusks in an X** above the water. They hold it while the tusks
tap three times, then lower them and dive. One comes up again farther on. An X over the water is the
whole picture, findable at one third in a glance (proof sheet §6). It is not loud: the gull stays and
watches.

**C5e. The squall** (January's weather event: windy snowfall periods only, at most once a period, the
middle third, 40 s). A wall of driven snow crosses the water from right to left. It is a
pale-turquoise haze with a soft lumpy top, up to 108 px tall (the fog's place: over the boat and the
front waves, under the sand pieces' tops and the dock), full of white streaks slanting down-left.
While it passes, the boat wears `squall`:

- the rig heels 5° more and the sails' top edges collect snow (which stays for the period);
- the gull hunkers down in its hat;
- the column snow runs at its densest.

It exits behind the dock. The fog was November's weather. This is January's.

**What the regulars do.** October's principle holds: the sea is theirs, and the strongest way to keep
its dignity is for the residents to be unimpressed. With four exceptions:

- **The serpent and the scarf caper.** On Monday, January 25, the snowman's scarf is gone. All that
  week, Mon–Thu, the serpent wears it: the rust knit wrapped behind its head, the cream-barred ends
  streaming as it glides. It wears it in the attack too (a monster that strikes the boat wearing a
  stolen scarf is the joke, and the strike keeps all its menace). The serpent's weight is ×2 that week,
  and it may greet a class as it sits down. On Friday the 29th the scarf is back on the snowman. The kids love
  the sea monster, and this gives it the season's best beat.
- **The whale's breath shows.** In winter its puff and shot are bigger and whiter and hang 1.6× as
  long before they thin, drifting left: a cold day.
- **The turtle and the flying fish go south.** They are warm-water animals, so from Dec 7 to Feb 14
  their weights are ×.4. From Feb 15 the turtle is back at ×1, and on the last school day of February
  it greets every period: spring is coming.
- **The gull** (C4).

The dolphins, the school, the buoy and the paper boat are unchanged (the paper boat still sinks on
windy days).

### C6. The lunch tray and the tape

- **Lunch** (`.wnOnly` / `.wnNot`, November's structure). The cider mug becomes **cocoa**, with two
  marshmallows, rising steam (`prefers-reduced-motion: no-preference`) and a COCOA band, on the
  carton's body with the same face. The tray is teal. The pie goes back to the cookie, now iced with a
  white six-armed flake.
- **The tape.** A winter side, "Snow day": 68 bpm, D major, Imaj7–vi7–ii7–V7sus. A felt piano (the
  Rhodes with its tremolo off), brushes, dust .1 and a soft band-passed wind bed in place of the
  crickets; "cold · window frost, radiator hum". No sleigh bells, no celesta: both say Christmas. It
  plays only when the teacher plays the tape.

### C7. Sound

October shipped silent. November shipped **three faint theme sounds**, despite what the brief
assumed: the geese's `Sound.honk()`, the loon's call and the turkey's gobble on a tap. All three are
gated: only if Sound is on, the audio already awake ("decoration never wakes it"), no timer running, at
a tenth of the volume or less. HANDOFF records no call from Croix on theme sounds either way. His
recorded sound calls are about the timers ("one pleasant sound instead of the alarms up sound"; the
tick only from 10).

**Recommendation: winter ships silent.** Its acts run all three months, its taps are many (flakes,
the corner, the snowman), and a sound that is charming in a two-week November becomes a habit by
February. If Croix wants one, the candidate is a single soft seal bark at the haul-out, under the
honk's gates (H).

---

## D. The story, as the room sees it

1. **"The cold comes in."** December 1: frost creeps into the clock's corner and the first snowflake of
   the year falls down the right side of the board. The next week a snowball is sitting on the beach
   with a track behind it and bird prints beside it, and a string of dark bulbs is up on the beach. One
   bulb lights each school day. The snowball becomes a body, then a head. On the last day before
   break it snows all day, every bulb is lit, the snowman has a carrot, a scarf and a hat, and in
   first period the gull is sitting on his head. The gull's scarf and the snowman's scarf match. So do
   their hats.
2. **"Deep winter."** Back from break, the lights are down and there is a seal: it comes up by the
   boat, looks at everyone, and rides off on a piece of ice. Narwhals pass. Some periods it snows, and
   some windy afternoons a squall swallows the boat. In the last week of January the snowman's scarf disappears,
   and the serpent swims by wearing it. On Friday it's back.
3. **"The thaw."** In February the frost shrinks back and the icicles drip, and in the middle of the month the
   snowman starts to lean. The next week he has slumped and lost an arm. On the last school day of February
   there is a puddle with a hat in it, a carrot and some coal, and a little green sprout. The turtle
   is back. On Monday it is March.

Each beat is a pure function of the date, so every period on a given day sees the same world, and the
kids can tell their friends in the next class what to look for.

---

## E. Steward, in one table

Steward's rule: nothing seasonal may sit over a card's area, which is the box plus its hard shadow plus
6 px. The free sand under the cards is about 76 px tall, and sand pieces draw at about 0.32× at 1920.

| piece | in Steward |
|---|---|
| frost | Steward's clock card gets none on its face (a card's area); the same frost along the screen's top and right edges in the free margin (≤ margin − 6 px), icicles from the screen's top edge, the haze only in a card-free 64 px screen corner |
| snowfall | under the canvas (z 0), behind every card; crystals ×.7; cap 4 / 7; untappable |
| dune cap | unchanged (it is the sand band) |
| snowman | 0.32× (31 × 43 px) at the right edge on the free sand; every stage reads at that size; the visit scales with him |
| the countdown string | 0.6× on the free sand: bulbs 9 px, posts 18 px, 30 px tall, 6 px under the cards' areas |
| boat, gull, lantern | unchanged (no card overlap) |
| floes, seal, narwhal, tusking | unchanged in the water band; the narwhal's salute held to 12°, so the tusk tip stays under the free band's top |
| the squall | its band capped at 70 px |
| serpent's scarf, whale's breath, lunch, tape | unchanged |

---

## F. Considered and dropped

- **Penguins.** The wrong pole for loons, geese, seals and narwhals, and one 7th grader in the room
  will say so.
- **A polar bear.** It would eat the seal. It is also a 3 m animal on a 38 px boat's beach.
- **Holiday symbols** (B).
- **Multicolored lights.** They read as Christmas (B).
- **An aurora.** It needs a night sky and colors the palette doesn't have, and SEA.md already
  rejected night.
- **A frozen sea.** An ice sheet over the water stops the sea being the sea, and the serpent needs
  open water.
- **Snow piling up on the cards.** Over content, Steward forbids it, and a card is not a roof.
- **A snowball fight.** Things thrown across the board.
- **Fireworks at New Year.** They need colors and sky over the cards, and New Year falls in the break.
- **Real weather.** SEA.md: nobody would verify an API.
- **A snow globe.** A closed symbol.
- **Animating the melt in real time.** It would be a show in the middle of a lesson; the melt changes
  between days (C3).

---

## G. What the proofs show (and what to check on the panel)

`winter-proofs.png`, in order:

1. The **lineup at true size**: the boat, the countdown string, the seal on its floe, the floes, the
   narwhal, the serpent in the scarf, the snowman and the flakes, each labeled with its board pixels.
2. **The lights, A against B, at true size** on Dec 18, side by side; A's bulbs lit and dark ×3; A in
   Steward at 0.6×.
3. The **boat ×6** in four states, each with a true-size copy beside it.
4. The **flakes ×3**, perfect, plus at true size on the card, the grid and the water.
5. **The frost, every stage at board size**: F1–F3, F4 with a breath spot, the peak with the measured
   free corner drawn in, T1–T3.
6. The **snowman's calendar** at board size (S0–S3, the visit, the caper, M1–M3) and the **Steward
   row at 0.32×**.
7. The **sea's visitors** in close-up.
8. **Six composites** on the real board (7.62.0):
   - Dec 9, an ordinary December day;
   - Dec 18, the last day before break: all nine lit, the snowman finished, the gull on his head;
   - Jan 13, the frost's peak, windy with snow and the squall;
   - Jan 27, the caper;
   - Feb 26, the thaw's end;
   - the peak on a 1280 × 800 board.

At one third (`-8m.png`):

- The flakes read as teal-edged stars in the outer columns.
- The frost reads as a frosted window corner, not a web, and its growth reads stage to stage.
- The beach string reads as a row of warm lights.
- The dune's white cap is the strongest signal on the board.
- The snowman reads as a white figure with a teal hat and a rust band.
- The serpent's scarf reads as a rust streak.

Weak points:

- **The squall is soft at one third.** It reads as the sea going pale, which is what a squall looks
  like. If it reads too faint on the panel, raise the haze to .85 before adding streaks.
- **The gull's hat is a front-row detail**, as the scarf was.

---

## H. Decisions for Croix

1. **The window.** Dec 1 → Feb 28 with a February thaw (my pick). The alternatives are running to the
   start of spring break (Mar 19) or ending with January.
2. **Secular by default** (B): confirm. Or opt in to any of these: colored lights; a New Year beat on
   the first day back; Groundhog Day (Feb 2); Valentine's Day (Feb 12, the Friday); Lunar New Year.
3. **The snowman melts.** He leans, slumps and is a puddle with a sprout on Feb 26 (my pick). The
   alternative: he stands to the end and is simply gone on March 1.
4. **The scarf caper.** In the last full week of January (Jan 25–28) the serpent wears the snowman's
   scarf, in the attack too. Yes or no.
5. **Names.** The snowman and the seal are unnamed here. Croix can name them or let a class vote.
6. **Theme sounds.** None (my recommendation), or one soft seal bark at the haul-out under November's
   gates.
7. **The lights.** Option A, the countdown string on the beach (my pick), or option B on the boat; the
   sheet shows both at true size (§2). Warm or colored (2).
8. **Flake size.** The leaves' scale (44–62 px, my pick, because of "they are small"), or smaller.
9. **Over break.** Hold the last school day's world (my pick), or go plain until January 4.
10. **The frost's size.** The peak fills the free corner (C1). If it is too much on the panel, the same
    rule at 0.7 of the corner is one number.

---

## I. What to carry into the code (plumbing only; every piece is drawing)

- **`Season.active()`** returns `"winter"` for months 11, 0 and 1. `apply()` toggles `body.winter`
  and sets the date state:
  - `data-wn-frost` (the stage), `data-wn-sm` (S0–S3, caper, M1–M3), `data-wn-cap`, `data-wn-bulbs` (0–9 or
    absent);
  - `wnCaper`, `wnFirstBack`, `wnLastDay`;
  - `data-nv-lamp` (4/3/2), as today.
  
  New pure helpers: `winterPhase(d)`, `breakStart(d)` (from `cfg.bell.skipWeeks`), `schoolDaysLeft(d)`
  (`n`), `caperWeek(d)` and `lastFebWeekday(y)`. The two Lofi callers learn `"winter"` → `Lofi.WIN`.
  Settings' hint becomes "October, November and winter (December–February); off on March 1 by itself."
- **`Snow`** is a sibling of `Leaves` (same skeleton: `step`, `spawn(opts)`, `from(x, y, …)`, `fling`,
  `rest`, `cap`). It reads `windy()` and `body.wnSnowing`.
- **A `Winter` sub-module** beside `Fall`, on one 1 s tick, owns:
  - the frost (`frost.fit()` from the face's boxes on build, resize and each bell; `frost.times(date)`
    for drips and sifts; `breath(x, y)`);
  - the beach string (`#wnLights`, its bulbs from `data-wn-bulbs`);
  - the snowman (`tap()`, `stage()`);
  - the visit clock (`visit.times(date)`).
- **The sea.**
  - `inSeason` learns `season:"winter"` (months 12, 1, 2).
  - `seasonWeight` gains `winterWeight(dateStr)` (see the animation review's table).
  - `ACTS` gains `floes`, `seal`, `narwhal`, `tusking`, `squall` (gated on the period's weather and
    snowfall) and `visit` (a beach act).
  - `plan()` gains the snowfall draw, `Sea.snowfall(dateStr, period)`, pure.
  - The serpent's and the attack's head groups gain `g.wnSerpScarf`, shown under `body.wnCaper`.
  - The whale's blow gets a winter variant.
- **Tests:**
  - the date helpers against 2026–27 (Dec 7 → n 9, Dec 18 → 0, Jan 25–28 caper, Feb 26 the last
    weekday);
  - `plan()` purity and the cap;
  - the snow cap of 6/10;
  - reduced-motion rest states;
  - `active()` null on Mar 1.
  
  `v71.spec.js`'s visitor list gains the new acts.
