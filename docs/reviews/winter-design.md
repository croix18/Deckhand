# Winter 2.0: the design (Nov 14, 2026)

The drawings are `winter-proofs.html` → `winter-proofs.png`, and `winter-proofs-8m.png` is the same
sheet at one third (the 8 m check). The motion spec is `winter-animation.md`. Nothing in
`Deckhand.html` changes until Croix approves this.

## What changed from the first winter design, and why

The first design (Nov 13, revised Nov 14; it is in git at `3455d0e`) was audited in
`winter-audit.md`: 6 must fix, 11 should fix, 9 polish. Croix read the audit and made his picks, and
this rewrite builds on them.

| Croix | what changed |
|---|---|
| "Manatees is cool." | The sea's cast is Florida's. **A manatee is winter's lead** on the water, with a calf from mid-January and a rare beat where the gull rides on its back. The seal, the floes, the narwhal and the tusking are **cut**. Tusking was the one arctic drawing that read at one third, but on a Florida sea it is the penguin problem again, and the calf and the ride now fill the rare slot. |
| "I was thinking string lights across the top of the page." | The countdown string hangs **along the top of the board** from tacks at the screen's edge, over the card's empty top band. It is no longer on the beach (which broke November's sand rule) and no longer on the boat (too small). |
| "Yes weather that comes and goes." | Snow is **weather**, drawn per period: clear, flurries or snowing. A clear period has no snow at all. |
| "Beach finds." | The snowman is the **gull's beach snowman**: driftwood arms, pebble eyes, a cone-shell nose, a scallop and a sand dollar for buttons, a sargassum seaweed scarf and an upside-down sand pail for a hat. |
| "I want it decently sized at full peak." | The frost fills the measured free corner at its peak, about 9× the area of November's branch. It is drawn as **solid frosted shapes** (white feather plumes on a frosted ice-blue sheet) and rasterized once per stage. |
| "Cut it." | **No squall.** |
| "Yes and yes I think at least." | Jan 4 is a student day and Dec 18 is a normal class day. **No beat hangs on a single day:** every one runs several days. |

From the audit:
- **Color.** Winter has its own color, **ice blue**, and every snow shape carries a **navy edge**.
- **Sand.** The sand pieces stand at the right edge.
- **The serpent** has a beat in every month.
- **The seam with November** is designed: winter starts on Nov 30, the first day back from
  Thanksgiving week.
- **Steward** is worked out piece by piece on a dense board.
- **Motion.** Nothing distracting moves: no flicker, no breathing bulbs.

---

## The register and the palette

The register is the sea's and October's.
- **Creatures** are solid navy silhouettes with one paleturq eye and tapers everywhere.
- **Made things** (the snowman's finds, the lights) read by their fill.
- **Everything** is judged at board size and again at one third.
- **Two motions** on one element are two nested elements.
- **Every motion** sits behind `body.waveMotion`.

**Winter's color is ice blue, `#4C7BD9`** (`--wnBlue`), with two tints:
- `#C9D9F7` (`--wnShade`), the shadow side of snow;
- `#E6EEFD` (`--wnIce`), frosted glass.

Why this color, the way October's orange was argued:
- **It is the one hue the board doesn't already use.** Teal `#127A85` and turquoise `#40E0D0` are
  green-blues (hue about 185°), navy is near-black, and ice blue sits at about 220°. The first design
  painted winter in the board's own teal and paleturq, so winter vanished into the chips and the
  progress bar from the back of the room (audit 2).
- **It is the true color of cold.** Shadows on snow are blue, frost on glass is blue-white, and winter
  light is blue.
- **It is secular.** Blue-and-white snow reads as winter, not as a holiday. There are no stars or
  symbols, and the pail's little white star is a beach toy's decal.

**The warm notes are the board's own:** the bulbs' amber `#D98E2B` and lit yellow `#FFE45C`, the
lantern, and the beach finds:

| find | colors |
|---|---|
| sargassum | `#A8782E`, darker `#7D5A22`, bladders `#C99A45` |
| driftwood | `#8F7A60` |
| shells | cream `#F6E6CE` with rust ribs |
| sprout | November's rare green `#4F6B3A` (its only use in winter) |

Warm against cold is the picture: amber bulbs on a frosted card, a brown scarf and a blue pail on
white snow. Coral stays the alerts' color.

**Snow is white with a navy edge** (1.6 px, non-scaling), the gull's rule. White on the white card is
invisible without it, and the first design's 1.1 px teal edge was too weak to carry.

**Rules (October's).**
- **Never** over the full-board clock's digits (31–69% of the width at 1080p), the bell strip or the
  bathroom pill.
- **Never** on the stage (`body.focusMode`, the settle-in included), the landing page or a phone
  (under 780 px).
- **Reduced motion:** everything holds still.
- **Settings → Seasonal touches → Off** takes all of it.
- **Classes:** everything hangs off `body.winter` and its date classes, set by Season from the
  board's own clock.
- **Purity:** scheduled things are pure functions of (date, period), seeded like `geeseTimes`.
- **Taps** are small and change nothing that matters.
- **Sand pieces** stand at the right edge (November 2.0's ruling).

---

## A. When (2026–27, as Deckhand knows the calendar)

Deckhand knows whole skip weeks (`bell.skipWeeks`: Nov 23, Dec 21, Dec 28, Mar 22), not single days
off.

| | dates | what the room sees |
|---|---|---|
| **Starts** | **Mon Nov 30**: the first school day after the Thanksgiving skip week (fallback Dec 1 if no November skip week) | The seam (§A1). November's furniture clears overnight. The first snowflake falls, a snowball sits where the scarecrow stood, the first frost is in the corner, and the string goes up, all dark. |
| **December: the cold comes in** | Nov 30 → **Fri Dec 18** | The building month. Frost grows week by week, the dune gets its first snow, the snowman is built in three stages, and one bulb lights each December school day (Dec 1 → 1, Dec 18 → 14). The manatee arrives Dec 7. The serpent tastes the first snow. |
| **Winter break** | Dec 19 → Sun Jan 3 | If the board is up, it holds the last school day's world: all fourteen lit, the snowman finished, flurries. Only the free-time sea plays. |
| **Back** | **Jan 4–8** | The string stays lit all of the first week back. The manatee greets every period on Jan 4 and 5. |
| **Deep winter** | **Jan 11 → Jan 29** | The lights come down on Jan 11, and the frost is at its peak, filling the free corner. The dune is white. Snowing periods are at their most likely. The calf joins its mother. **Caper week, Jan 25–29**: the snowman's scarf is gone, and the serpent wears it. |
| **The thaw** | **Feb 1 → Feb 26** | Feb 1–5: the scarf is back on the snowman, and the frost starts to shrink. The frost shrinks in three steps and drips. Then the snowman: he leans (Feb 8–12), slumps (Feb 15–19) and is a mound in a puddle with a sprout that grows each day (**puddle week, Feb 22–26**), while the serpent swims by wearing his pail. |
| **The coda** | **Mar 1–5** | The board is plain except for one thing on the sand: **the pail, set back upright, with the sprout planted in it.** The turtle greets every period. |
| **Ends** | Mon Mar 8 | `active()` returns null. |

**Every beat runs several days:**

| beat | how long |
|---|---|
| the snowman's stages | a week each |
| the finished snowman before the break | five school days |
| the first gull visit | from Dec 14, then about one day in three before the break |
| the manatee's debut | two days |
| the first-back greeting | two days |
| the lights after the break | a week |
| caper week | five days |
| the puddle and the sprout | five days |
| the coda | a week |

A class that misses one day misses nothing.

**The December counter.** The bulb count is the number of December school days so far, today
included: weekdays from Dec 1 up to the Friday before the first December skip Monday, not counting
skip weeks. So the **dark bulbs are the school days left before break, after today**. Dec 2 → 2 lit,
Dec 16 → 12 lit, Dec 18 → 14 lit. On Nov 30 the string is up and all dark. If `skipWeeks` has no
December entry, the break is taken to start on the Monday of the week holding Dec 24. The string has
one bulb per December school day, so the count is set when the board builds the string: 14 in
2026–27.

### A1. The seam with November

On Fri Nov 20 the board is November's feast week; then comes the Thanksgiving skip week. On **Mon
Nov 30** the board opens on winter:

| November's piece | what takes its slot |
|---|---|
| the branch, in the clock card's corner | the first frost |
| the leaves, in the outer columns | the first snowflake, forced on the morning's first spawn |
| the scarecrow, at the right edge | a snowball, with its track and the gull's prints |

The lantern stays, and so does the gull's November scarf. Those two carry over, so the board feels
like the same place getting colder, not a new set. `Season.active()` gains a date rule: "winter" from
the first school day after the November skip week through Mar 5, and "november" otherwise in month
10.

---

## B. Inclusiveness: a secular winter, by default

A public-school classroom gets a **secular winter**: snow, ice, frost, light, beach finds, cocoa. No
religious or holiday symbols: no trees, wreaths, holly, stockings, Santa, reindeer, candy canes,
menorahs, kinaras, stars-on-top or sleigh bells, and no red-and-green. The bulbs are one warm color.
Multicolored strings read as Christmas. A countdown to winter break is the school's own calendar, not
a holiday. Opt-ins Croix can ask for are listed in **H**.

---

## C. The cast

Sizes are in 1080p board pixels. The boat's box is 38 px and its hull about 30. On the water,
creatures stay close to the boat's size (Wilson's rule). On the sand, things stand at the
scarecrow's scale.

### C1. The clock card's corner: the frost

**What it is.** Frost on a window pane, in four layers, all generated by seeded rules so every board
grows the same frost:

1. **The frosted sheet.** One ice-blue `#E6EEFD` shape with a single soft ice-blue edge (.42). It is
   a union of lobes around each plume's barbs, plus a band along both edges, so its outline is a run
   of soft scallops that follow the plumes. It is not the old stepped quarter-ellipse arcs. The sheet
   gives the corner its **figure and ground**: a pale-blue pane against the white card, legible at
   one third.
2. **Feather plumes.** White fern plumes with an ice-blue outline (.62) and an ice-blue rib down the
   middle.
   - **From the right edge:** each grows inward from its own root, leaning down and curling, longest
     near the corner.
   - **From the top edge:** each grows down and leans left, only outside the side plumes' reach, so
     **no two plumes cross**.
   - **Barbs:** overlapping filled leaf-wedges at about 47°, longest a third of the way out, so each
     plume reads as one serrated feather, not as hairlines.
3. **A snow lip and icicles** along the card's top edge: filled icicles (white, ice-blue edge, a
   `#C9D9F7` highlight), 6–42 px long, longest toward the corner. Near the stage chip they are
   shortened to keep its ring clear.
4. **Drips** in the thaw (T1–T3): a drop at a few icicle tips (motion in the animation doc).

**How big: fitted to the free corner.** The envelope is fitted at layout time to the part of the card
at least **28 px from every line of the face** and **12 px from every control**. The stage chip gets a
clear 12 px ring, cut by an even-odd clip. Measured on 7.63.0 by `tools/proofs/winter.js capture`:

| board | the free corner | the peak (s = 1) |
|---|---|---|
| 1920 × 1080 | a strip 539 px wide right of the face, plus a band 123 px deep above the date line | **496 px in from the right edge × 617 px down it, plus a band 113 px deep along 783 px of the top edge**: about 340,000 px², about **9× November's branch** |
| 1280 × 800 | only the strip: 219 px wide (the date line is 23 px under the card's top) | **201 px × 438 px**, no top band |

The rule: the side strip is 0.92 of the free width (at most 520 px) and runs 0.64 of the card's
height. The top band is 0.92 of the free depth (at most 130 px; none if under 20 px) and runs 0.42
of the card's width. The stage size `s` scales both. The fit is redone on resize and at a bell
**only if the face's boxes moved** (a wider period line, "Passing → 2nd"). The frost is regenerated
rather than scaled. Unlocked, the envelope starts under the 30 px handle band.

**The freeze and the thaw** (`body[data-wn-frost]`):

| stage | dates | s | what the room sees |
|---|---|---|---|
| F1 | Nov 30 – Dec 4 | .25 | first frost: a few short plumes and rime in the corner |
| F2 | Dec 7–11 | .40 | the plumes lengthen; the first icicles |
| F3 | Dec 14 → break | .55 | a frosted corner, with the lights hanging in front of it |
| F4 | Jan 4–8 | .78 | it grew over the break |
| **peak** | **Jan 11–29** | **1** | **the free corner frosted over** |
| T1 | Feb 1–12 | .72 | shrinking, dripping |
| T2 | Feb 15–19 | .45 | dripping faster |
| T3 | Feb 22–26 | .22 | a rim with drips |
| | Mar 1 | 0 | gone |

**Cost (measured; `winter-proofs` §4).** These counts are for the drawing as the proof generates it;
the `<use>` pairs draw each path twice from one copy of its data.

| stage | elements | path commands | rasterize once (Chromium, no throttle) | 4× CPU throttle |
|---|---|---|---|---|
| F1 | 52 | 492 | 16 ms | 47 ms |
| F3 | 151 | 1,772 | 23 ms | 106 ms |
| peak (1920) | 265 | 3,688 | 33 ms | 183 ms |
| T3 | 46 | 429 | 10 ms | 52 ms |
| peak (1280) | 132 | 1,345 | 14 ms | 74 ms |

The first design's peak was about 464 elements and 19,000 path commands in a *live* SVG. This one is
**drawn once into a bitmap** (§I) on its own layer, at a stage change: the day's first tick, a resize
or a re-fit. After that a frame of motion never repaints it. The peak is over the audit's own
1,500-command cap because Croix asked for a bigger frost. The price is one 10–190 ms raster at a stage
change (the timings vary by about 20% from run to run), and the build hides it:
- **Off the main thread:** `createImageBitmap` on a blob, in an idle callback.
- **Keep the old bitmap** until the new one is ready.
- **Only when the boxes moved:** never re-fit at a bell unless the face's boxes changed.

**Tap: a warm breath.** A clear oval about 108 × 92 px opens where the finger touched, with a fogged
`#C9D9F7` rim. The nearest icicle drips twice, and the frost grows back over 45 s.

**Reduced motion.** The frost holds still at its stage, with no drips. A tap still clears the spot
(a state, not a motion), and the spot is gone 45 s later.

**Never.** Within 28 px of the date line, the digits or any line of the face; within 12 px of a
control; on a live settle-in card; on the stage.

### C2. The air: snow as weather

**Snow comes and goes** (Croix: "Yes weather that comes and goes"). Each period draws its own **snow
weather**, pure in (date, period), from the director's generator after the wind:

| phase | clear | flurries | snowing |
|---|---|---|---|
| Nov 30 – Dec 4 | .5 | .5 | 0 |
| Dec 7–15 | .4 | .4 | .2 |
| Dec 16–18 | .2 | .3 | .5 |
| Break (free time) | 0 | 1 | 0 |
| Jan 4–29 | .3 | .4 | .3 |
| Feb 1–12 | .5 | .4 | .1 |
| Feb 15–19 | .7 | .3 | 0 |
| Feb 22 → | 1 | 0 | 0 |

The board shows this on `body[data-wn-snow]`: `clear`, `flurries` or `snowing`.

- **Clear:** nothing falls.
- **Flurries:** a cap of 3 on the board, one spawn every 14–30 s.
- **Snowing:** a cap of 8 (10 if windy), one every 6–12 s. Snowing also turns on the small snow
  tells: snow on the boat's deck, fresh snow on the dune's cap, and fresh snow on the snowman's pail
  and arms.

The first spawn on Nov 30's first period is forced: a 56 px dendrite down the right column, **the
first snowflake of the year**. That period is drawn as flurries.

**The flakes** (`Snow`, a sibling of `Leaves` in the same outer 15% columns, so every box stays left
of 18% and right of 82%). They are perfect: one arm, mirrored, turned six times. They are **filled
white with a 1.3 px ice-blue edge** and a pale `#C9D9F7` rib down each arm. There are two crystals
and a fleck:
- **the dendrite** (a tapered arm with three pairs of branches);
- **the stellar plate** (broad straight-edged arms with flared square ends and a hexagonal center:
  a crystal, not a petal);
- **the fleck** (a solid 7–9 px hexagon).

The first design's "tipped" crystal (it read as a molecule) and its hairline star flecks (they read
as dust) are gone. Crystals are 40–56 px. The mix is 60% a crystal, 40% a pair of flecks.

**Calm/windy.** Snow falls straight. Windy snow slants left by 80–160 px over its fall (clamped to its
column), 30% faster.

**Landing.** A flake that reaches the water melts (shrinks and fades), with a small white ring.

**Tap.** The leaves' fling.

**Layer.** The leaves' layer (z 3).

**Reduced motion.** Nothing falls. On a flurries or snowing period, two crystals lie still on the
sand at the right edge.

### C3. The sand: the dune's snow, and the snowman

**The dune's cap.** White snow along the dune's crest, **14 px at its thickest**, with an ice-blue
`#C9D9F7` underside and a thin ice-blue line along its lower edge. On cream sand the first design's
7 px all-white cap vanished; this one reads as snow. It is computed from `#waves`' own dune path and
sits under the dock (clipped clear of it).

| Nov 30 – Dec 4 | Dec 7–11 | Dec 14 → Feb 12 | Feb 15–19 | Feb 22–26 | Mar 1 → |
|---|---|---|---|---|---|
| patches (.45) | most (.7) | white (.85, and 1 from Jan 11 to Jan 29) | .6 | .3 | none |

On a snowing period the cap is 1 whatever the date (fresh snow).

**The snowman** stands in the scarecrow's slot: right edge, `right: 3vw`, feet at the scarecrow's
line (bottom 34 px). He is **120 × 160 px at 1080p** (`--wnSmW: clamp(84px, min(6.25vw, 11.1vh),
132px)`), the scarecrow's scale. Like the scarecrow, his top half stands in front of the card's empty
bottom-right corner. The audit asked for him fully on the sand, but the free sand under the card is
only about 50 px tall; the **navy edge** does that job instead, and he reads against the white card
(§5 of the proofs, at 1:1 and at one third).

He is **the gull's beach snowman**, built from what a gull finds on a Florida beach:
- **Snow.** Three packed-snow balls, each a lumpy outline (not a circle), white with a navy edge.
  Each has a `#C9D9F7` shade crescent at the lower right (the board's light is upper left), and an
  ice-blue contact shadow sits under the base. The base ball has **sand flecks** in its lower half:
  snow rolled on a beach picks up sand.
- **Face.** Two dark **pebble eyes** of different sizes with a white glint; an amber **cone-shell
  nose** (an auger shell with rust bands) pointing left, toward the sea; and a **pebble smile** that
  rises to one side.
- **Buttons.** A cream **scallop shell** with rust ribs, a **sand dollar** and a small spiral shell.
- **Arms.** **Driftwood**, gray-brown with a light grain and a fork: the left raised toward the boat,
  the right down.
- **Scarf.** A **sargassum** scarf: a golden-brown wrap with darker serrated fronds and small gold
  bladders, one long end hanging down the left.
- **Hat.** An upside-down **sand pail** in ice blue, with a lighter rim, a white starfish decal and a
  navy handle hanging at the side. It is winter's color mass at the top of the figure, the way the
  scarecrow's hat is November's.
- **Ground.** A white snow patch, and a trail of the gull's three-toed prints.

**The build** (`body[data-wn-sm]`):

| stage | dates | on the sand |
|---|---|---|
| S1 | Nov 30 – Dec 4 | a snowball on a snow patch, its **track** a sand-colored stripe behind it, the gull's prints, a scrap of seaweed |
| S2 | Dec 7–11 | stacked; pebble eyes, driftwood arms, one shell: half dressed |
| S3 | **Dec 14 →** | the nose, the smile, the shells, the scarf, the pail: finished, a full school week before the break |
| caper | Jan 25–29 | the scarf is gone; scraps of seaweed lead toward the water |
| (restored) | Feb 1–5 | the scarf is back |
| M1 | Feb 8–12 | leans 5°, the nose droops, drops at the nose and the right arm, slush |
| M2 | Feb 15–19 | slumped: the base squats, the pail slips over an eye, the right arm has fallen |
| M3 | Feb 22–26 | a low mound in a slush puddle, the scarf draped over it, the pebbles, shells and nose around it, the arms crossed on the sand. **The pail is gone (the serpent has it).** A green sprout beside the puddle **grows a little each day** (day 1 → day 5). |
| coda | Mar 1–5 | the snow is gone. **The pail is back on the sand, upright, with the sprout planted in it**, and two shells lie by it. |

Stages change between days (a 4 s crossfade at the day's first tick), never in front of a class.

**The builder.** It is never shown. The gull's prints and the matching knit (the gull keeps
November's scarf) are the clues. **From Dec 14** the gull visits:
- the first visit is in the day's first class by the clock (not "period 1": on a Black week period 1
  is the last class);
- then about one school day in three until the break, and one in five through January;
- a visit is two to four minutes, in a period's middle third, sitting on the pail.

**Tap.** His head slips 6° on the middle ball and stays crooked; the next tap rights it. The crooked
state resets at the next day's first tick. In M1/M2 a tap shakes two drops loose. In M3 a tap on the
puddle sends one ring. In the coda a tap makes the sprout nod.

**Never.** In front of the boat, over the bell strip or the pill, on the stage, the landing page or a
phone.

### C4. The string lights across the top of the page

Croix: "I was thinking string lights across the top of the page."

**Where it hangs.**
- **Tacks:** small navy tacks with a white glint along the **screen's top edge** (y 5), from 20 px
  inside the card's left corner to 18 px short of the stage chip.
- **Wire:** one navy wire sags between the tacks in **seven scallops**.
- **Bulbs:** **fourteen** C9 bulbs (one per December school day), two to a scallop, hang from it,
  each a few degrees off true.
- **Over the card:** the wire crosses the card's top edge, so the bulbs hang over the card's empty
  top band, the same band the frost's top edge uses, and the lit bulbs on the frost's right end hang
  in front of it.

**The bulbs** at 1080p:
- **Size:** 17 × 26 px of glass on an 8 px navy socket.
- **Lit:** amber glass, a large lit-yellow core, a white glint and a soft 30 px halo.
- **Dark:** gray glass at .5 with the same glint, still clearly a bulb.

At one third the string reads as a row of warm bulbs: the strongest December signal on the board.

**How it sags.** Each scallop sags as far as it can, up to 46 px at 1080p, while **every bulb stays
16 px clear of the face's lines**.
- **1920 × 1080:** the band above the date line is about 150 px deep, so every scallop takes the
  full sag.
- **1280 × 800:** the date line is 23 px under the card's top, so the scallops above the date line
  pull **nearly taut** (their bulbs sit in the top margin), and the ones beside it sag. The bulbs
  are scaled ×0.74.
- **Clearances:** the string never reaches the stage chip (18 px clear) or the screen's fullscreen
  button.

**Countdown or fully lit.** The proofs show both (§2). **Recommendation: the countdown.**
- Twelve lit and two dark reads as a count from the back of the room, and the dark bulbs still read
  as bulbs. It gives the kids a reason to look up each morning: one more is lit.
- The fully lit string is prettier for one week and says nothing.
- The countdown becomes the fully lit string on Dec 18 anyway, and stays fully lit over the break
  and **through Jan 8**. It comes down on Mon Jan 11, when the frost takes the corner at its peak.

**No motion.** The bulbs don't breathe, swing or flicker (the audit's finding 16). The day's new bulb
lights at the first tick with a 1.5 s fade. A tap on a bulb gives a one-time 1.2 s damped swing.

### C5. The boat and the gull

- **The lantern** stays all winter and dims by the month: lamp 4 in December, 3 in January and 2 in
  February. It is gone on Mar 1.
- **Snow on the deck:** on a snowing period, a white line along the top of the navy hull, fading in
  over ten minutes.
- **The gull** keeps its November scarf all winter. It has no hat (the first design's teal hat was a
  3 px blob at true size). It leans to look at the manatee. It visits the snowman, and in the rare
  beat it rides the manatee.

### C6. The sea's winter cast

At most two winter acts a period (one in the thaw). `dur` is the CSS length + 500 ms.

**C6a. The manatee: winter's lead** (common, near lane, 50 s, **from Dec 7**). A Florida manatee in
the sea's register: a navy silhouette 92 px long. It is a low animal in the near lane, in front of the
boat, so only 18–24 px stands above the water: about Wilson's height. What it shows:
- the **squarish, whiskered snout**, with paleturq whisker dots and two nostrils on top;
- one paleturq eye and a neck crease;
- a small front flipper;
- the **round paddle tail**, the shape nobody mistakes;
- three paleturq **prop scars** across its back, the real tell of a Florida manatee.

The story:
- A ring beside the boat, and **nostrils first**: the snout breaks the water with a little spray of
  breath.
- The head lifts and looks at the boat; the gull leans over to look.
- It settles and cruises right along the surface, the back and the paddle tail showing.
- Halfway, it rolls into a slow **dive**: the round tail lifts clear of the water, hangs, and slips
  under. A ring.

It debuts on **Dec 7–8** (the greeting in every period: "something new is in the water"), greets on
**Jan 4–5**, and plays through Feb 26. Manatees leave the warm water in March, so it is gone by the
coda.

**C6b. Mother and calf** (uncommon, near, 54 s, Jan 11 → Feb 26). The same story with a calf at 0.55×
following close behind its mother, breathing when she breathes. Florida's calves are born from spring
through fall and stay with their mothers for about two years, so a winter calf is true.

**C6c. The ride** (rare, a period's last third, Dec 14 → Feb 19). The gull leaves the masthead,
glides down and lands on the cruising manatee's back. It rides it across, standing with its scarf
streaming, and lifts off before the dive, home to the mast. It is built on the trawler's `gullBack`
machinery.

**C6d. The serpent's winter.** The kids love the sea monster, so it has a beat in every month:
- **December, the first snow** (uncommon, Dec 7 → Jan 29, flurries or snowing periods only, far
  lane). It surfaces, lifts its head high, and a flake lands on its snout. It holds a beat and goes
  under.
- **January, caper week** (Jan 25–29, all five days). It wears the snowman's **seaweed scarf**: a
  broad sargassum wrap behind its head with fronds streaming. It wears it in the attack too. Its
  weight is ×2 that week, and it may greet a class.
- **February, puddle week** (Feb 22–26). It wears the snowman's **sand pail** on its head, found in
  the puddle. Its weight is ×1.5. In the coda the pail is back on the sand with the sprout in it.
  Who brought it back is never shown (the gull is the suspect).

**The residents.** October's principle holds: the sea's residents stay unimpressed. Two exceptions:
- **The whale's breath shows** in winter: bigger, whiter, and hanging 1.6× as long.
- **The turtle** greets every period in the coda week (Mar 1–5).

The dolphins, the school, the buoy and the paper boat are unchanged.

**Cut, with reasons.**
- **The seal, the pancake floes, the narwhal and the tusking:** arctic animals and sea ice on a
  Florida sea.
- **The squall:** Croix: "Cut it."

### C7. The lunch tray, the tape and sound

- **Lunch** (`.wnOnly`/`.wnNot`). The mug becomes **cocoa** with two marshmallows and a COCOA band,
  and steam (`prefers-reduced-motion: no-preference`). The tray is ice blue. The cookie is iced with
  a white six-armed flake.
- **The tape.** A winter side, "Snow day": 68 bpm, D major, a felt piano, brushes and a soft wind bed.
  No sleigh bells and no celesta.
- **Sound: winter ships silent.** Its pieces run for three months, and a sound that charms in
  November becomes a habit by February.

---

## D. The story, as the room sees it

1. **December: "It snowed."** On the Monday back from Thanksgiving the first snowflake falls, and a
   snowball sits where the scarecrow stood, with bird prints beside it. A string of dark bulbs is up
   across the top of the board, and one lights each morning. Frost creeps into the clock's corner.
   The snowball becomes a body, then a snowman made of beach things, finished on Monday of the last
   week. That week the gull is caught sitting on his pail. A manatee has come in for the winter: it
   breathes beside the boat, looks at everyone, and dives with its round tail up. Sometimes the
   serpent comes up to catch a snowflake on its nose.
2. **January: "Deep winter."** The lights stay up through the first week back, then come down, and
   the frost covers the corner. Some periods it snows. The manatee has a calf now. One rare day the
   gull rides on the manatee's back. In the last week of January the snowman's seaweed scarf
   disappears, and the serpent swims by wearing it. On Monday it's back.
3. **February: "The thaw."** The frost shrinks and drips. The snowman leans, then slumps, then is a
   puddle with his shells around it and a little green sprout that grows every day. His pail is
   missing, and the serpent is wearing it.
4. **March: "Spring."** In the first week of March the board is plain except for the pail, back on
   the sand, with the sprout planted in it.

Every beat is a pure function of the date, so every period on a given day sees the same world, and
the kids can tell the next class what to look for.

---

## E. Steward, piece by piece

Steward's rule: nothing seasonal may sit over a card's area (the box, its hard shadow and 6 px). The
proof's Steward board (§8) is a dense board built in Deckhand 7.63.0 with six cards, standing in for
a real Steward board, which isn't in this repo. Measured on it:
- a 24 px top margin;
- 38 px gutters;
- **45 px of free sand** under the bottom row (from the card areas' bottom at about 1,001 px to the
  feet line at 1,046).

| piece | in Steward | why |
|---|---|---|
| lights | a **taut** string in the top margin (no sag), 14 bulbs at 0.42× (7 × 11 px), every bulb above y 18 | the 24 px margin minus the 6 px card area is all there is. At one third it is a row of warm dots: a detail, not the headline |
| frost | **none** | no free corner is 40 px deep; an 18 px rim at the screen's edge would be invisible |
| falling snow | **none** | only the gutters are free, and a flake passing behind cards would blink in and out |
| dune cap | as Deckhand | it is the sand band |
| snowman | a 45 px version in solid shapes (three balls with navy edges, the scarf, the pail, two driftwood arms, no face) at the right edge | 45 px is the free sand |
| sea acts (manatee, calf, ride, serpent beats) | unchanged | the water is free of cards |
| boat, gull, lantern, deck snow | unchanged | |
| lunch, tape | unchanged | |

What remains to check: Steward's real board may differ from the stand-in (its own dock, margins and
denser cards). The rule above (bulbs above the margin line, the snowman sized to the free sand) is
what carries over; the numbers come from its own boxes at build.

---

## F. Considered and dropped

- **The arctic cast** (seal, floes, narwhal, tusking): it doesn't belong on a Florida sea (C6).
- **Penguins, a polar bear:** the same.
- **The squall:** cut by Croix.
- **The gull's bobble hat:** too small to see.
- **Holiday symbols; multicolored lights** (B).
- **An aurora, a frozen sea, snow piled on the cards, fireworks at New Year, real weather, a snow
  globe:** the first design's reasons stand.
- **Animating the melt in real time:** it would be a show mid-lesson; the melt changes between days.
- **A manatee wearing the scarf:** the scarf is the serpent's joke.
- **A right-whale calf for the resident whale:** a good Florida beat, but the manatee and calf
  already cover it. It is held for another year.

---

## G. What the proofs show (and what to check on the panel)

`winter-proofs.png`, in order:

1. **At true size**, beside the boat: the manatee in its four poses, the serpent's three costumes,
   the snowman, the flakes. Beside them, **live November** pieces through the same windows: the
   scarecrow and the snowman, the branch and the December frost, the turkey and the squirrel.
2. **The lights at true size**: the countdown and the fully lit string at 1920, the countdown at
   1280, the bulbs ×4, and both at one third.
3. **The flakes** at ×3 and at true size on the card, the grid and the water, beside November's
   leaves.
4. **Every frost stage** at board size on a board of its own month (F1–F2 on Dec 2, F3 on Dec 16,
   F4 and the peak on Jan 13, T1–T3 on Feb 24, the peak at 1280), with the envelope's 28 px lines
   drawn on the peak, and **the cost table**.
5. **The snowman**: every stage at board size, ×3, beside the live scarecrow at 1:1 and at one
   third, and Steward's 45 px version.
6. **The sea** in close-up.
7. **Eight composites** on the real board (7.63.0):
   - Dec 2;
   - Dec 16;
   - Jan 13 (the peak);
   - Jan 27 (caper week);
   - Feb 24 (puddle week);
   - Dec 16 and Jan 13 at 1280 × 800;
   - the Steward board.

**Weak points, honestly:**
- **The breathing manatee** reads as "a sea animal with its head up" at true size. Its cruise and
  its dive (the paddle tail) are what say "manatee."
- **February is the faintest month** at one third. That is the story (it is thawing), but on Feb 24
  winter is a frost rim, a thin dune cap, a puddle and the serpent in its pail.
- **Steward's lights** are a detail at one third.
- **The 1280 board** hides the boat behind the dock, as it does today, so every boat beat (the
  manatee by the boat, the ride, deck snow) is invisible there (the audit's finding 15, not fixed
  here).

**On the panel:** the frost's raster on the Chromebox, at a stage change; whether the ice blue holds
its hue on the Promethean (projected blues can drift toward purple); the bulbs from the back row.

---

## H. Decisions for Croix

1. **The window.** It starts Nov 30 (the first day back from Thanksgiving) and has a coda week
   (Mar 1–5) with the pail and the sprout. My pick. The alternatives: start Dec 1, end Feb 28.
2. **The lights.** The countdown (my pick) or fully lit from Nov 30? Down on Jan 11 (my pick) or up
   all January?
3. **Names.** The manatee and the snowman are unnamed. Croix can name them, or a class can vote.
4. **Opt-ins** (B): any holiday or calendar beats (New Year on the first day back, Groundhog Day,
   Valentine's Day, Lunar New Year).
5. **Theme sounds.** None (my pick).

---

## I. What to carry into the code (plumbing; every piece is drawing)

- **`Season.active()`.** It returns `"winter"` from `winterStart(y)` (the Monday after the November
  skip week, else Dec 1) through `winterEnd(y)` (Mar 5, the coda's Friday). `apply()` toggles
  `body.winter` and sets:
  - `data-wn-frost`, `data-wn-sm` and `data-wn-cap`;
  - `data-wn-bulbs` (0–14, or absent from Jan 11);
  - `data-wn-snow` (`clear` / `flurries` / `snowing`, set with `data-sea` at the bell);
  - `wnCaper`, `wnPuddle`, `wnCoda`;
  - `data-nv-lamp` (4/3/2).

  New pure helpers:
  - `winterPhase(d)`, `breakStart(d)`, `decSchoolDay(d)` (the bulb count), `caperWeek(d)` and
    `puddleWeek(d)`;
  - `snowWeather(dateStr, period)`, in the director's generator.

  The two Lofi callers learn `"winter"`.
- **`Snow`**, a sibling of `Leaves`, reads `data-wn-snow` for its cap and rate.
- **A `Winter` sub-module** beside `Fall`, on one 1 s tick:
  - **the frost:**
    - `frost.fit()` from the face's boxes, on build, resize, and a bell when the boxes moved;
    - `frost.paint(stage)` renders the SVG string, then `createImageBitmap` onto a
      `<canvas id="wnFrost">` (its own layer), in an idle callback, keeping the old one until it is
      ready;
    - `frost.times(date)` for the drips;
    - `breath(x, y)`;
  - **the string:** `#wnLights`, a fixed SVG at the screen's top, z above the card and below the
    dock, sized from the face's boxes;
  - **the snowman** (`stage()`, `tap()`);
  - **the visit clock.**
- **The sea.**
  - `inSeason` learns `season:"winter"`.
  - `winterWeight(dateStr)`.
  - `ACTS` gains `manatee`, `manateeCalf`, `ride` (`gullBack`), `serpentSnow` and `visit` (a beach
    act).
  - The serpent's and the attack's head groups gain `g.wnSerpScarf` (under `body.wnCaper`) and
    `g.wnSerpPail` (under `body.wnPuddle`).
  - The whale's blow gets a winter variant.
- **Tests:**
  - the date helpers against 2026–27: Nov 30 start; Dec 2 → 2 bulbs; Dec 16 → 12; Dec 18 → 14;
    Jan 11 no bulbs; caper Jan 25–29; puddle Feb 22–26; coda Mar 1–5; null on Mar 8;
  - `snowWeather` purity;
  - `plan()` purity and the cap;
  - the snow caps (0 / 3 / 8 / 10);
  - the reduced-motion rest states;
  - the lights' clearances (every bulb's box 16 px off the face's boxes at 1920 × 1080 and
    1280 × 800).
