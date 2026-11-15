# Winter: an audit of the design (Nov 14, 2026)

Croix, Nov 14: "Can you do a deep audit into winter. There are many things that can be improved."

**What I read:** `winter-design.md`, `winter-animation.md`, `winter-proofs.html` / `.png` /
`-8m.png` and `tools/proofs/winter.js`. The standard I held them to is
`october-2.0-design.md` / `-animation.md`, `november-2.0-design.md` and the live board. I opened
`Deckhand.html` 7.63.0 at Oct 28 and Nov 18 with `#t=` (1920 × 1080 and 1280 × 800, locked, motion
paused) and compared the two at the same size. I also read HANDOFF's seasonal, sea and hardware
entries and `Season.active()`.

**Evidence:** `winter-audit-sheet.png` puts winter crops beside same-size crops of the live board.
The numbers on it match the findings below.

**The verdict in one line.** The structure is good: a freeze and thaw that tells the date, changes
that happen between days, pure functions of the date, and a gull who builds a snowman. The drawings
are not at October's or November's level yet. At the back of the room, winter is a gray scribble in
the clock's corner and a pale, nearly empty beach. Three of the beats Croix will care about most land
on days the board is least likely to be seen.

Count: **6 must fix, 11 should fix, 9 polish.**

---

## Must fix

### 1. The peak frost still reads as a web, and it takes over the card
**Where:** design C1; proofs §5 (peak) and composite 3. Sheet panel 1.

**What's wrong.** The redraw kept the problem Croix named. Every frond is a straight ray, and the
rays cross one another at many angles. At 1:1 the corner looks like pine needles or scratched glass.
At one third it is a gray hatch. Real fern frost curves. It has a clear spine and feathered plumes,
and plumes that meet stop growing instead of crossing. The haze is four stacked layers, so its edge
shows as terraced, crisp quarter-ellipse arcs: a compass drawing, not frost. At the peak the corner
covers about a quarter of the card. It becomes the second thing the eye lands on after the digits,
and on Jan 13 it outweighs the date line. November's branch is one drawing with air around it, and
so is October's web. This is a texture.

**Fix.**
- Redraw the frost as 8–14 curved plumes at the peak. Each plume is a filled, tapering spine
  (3 → 0.6 px) with barbs drawn as filled wedges, not hairlines. Grow them with a no-crossing rule:
  a plume stops where it meets another plume's zone.
- Draw the haze as one gradient (or a blurred raster made once per stage) with a noisy, feathered
  edge. No stepped arcs.
- Cap the peak at about 0.6 of the measured free corner, with no more than about 1,500 path
  commands.
- Prove it at one third beside the November branch before any build.

### 2. Winter has no figure and ground: it is painted in the board's own UI colors
**Where:** design "The register and the palette" ("Winter adds no colors"), C3; proofs §G's 8 m
claims. Sheet panels 2–3.

**What's wrong.** Everything in winter is white, pale turquoise or teal. Those are the card's colors,
the progress bar's, the period chips' and the week pill's. October owns orange and November owns
rust, wheat and navy figures, so their pieces stand off the chrome. At one third (the -8m sheet,
Dec 18) winter's beach is close to empty. The snowman is a white smudge whose upper half sits on the
white card. The dune cap is a white line on cream sand, nearly invisible. §G says "the dune's white
cap is the strongest signal on the board," and the sheet's own one-third image contradicts it. The
strongest winter signals at distance are the frost (see 1) and the flakes.

**Fix.**
- Give everything made of snow a **navy** edge (1.4–1.8 px), as the gull's white body has, instead
  of a 1.1 px teal one.
- Stand the snowman fully on the sand, below the card's shadow line (lower and further right, or
  slightly smaller), so he is white against sand and not white against white.
- Make the warm notes the season's signature: rust-knit hat and scarf (not teal) and amber light.
  Warm against cold is the picture.
- Make the dune cap 10–14 px at its thickest, with a turq-mid underside line, so it reads as a white
  band and not as foam.

### 3. The snowman is clip art, and he is the season's lead for three months
**Where:** design C3; proofs §6, composites 2–5. Sheet panel 2.

**What's wrong.** The spec asks for "lumpy packed-snow outlines" and "eyes of different sizes." The
proof draws three near-perfect circles, dot eyes, three dot buttons, a carrot and a bobble hat: the
emoji snowman. Put him beside the scarecrow (X eyes of different sizes, a sagging burlap head, a
stitched smile, a patch, straw at the cuffs) and he has no specific idea in him. The design has no
Wilson either. The seal is a generic animal, and the snowman's only personality is a head that slips.

**Fix.** Make him the gull's snowman on a beach, built from what a gull finds there. That is the
story the design already tells.
- **Materials:** driftwood arms with a fork; shell buttons in three different shapes; dark beach
  pebbles for eyes (mismatched); a carrot nose that is a bit too long and bent.
- **Shape:** packed-snow lumps on the outlines; the head slightly too small and set off-center.
- **Clothes:** the gull's matching rust knit.
- **A Wilson beat:** give him a reaction. His eyes (two pebble positions) look toward whatever is on
  the water while an act plays: the seal, the narwhal, the serpent wearing his scarf. It is a state
  swap at the act's start and end, and it costs nothing.
- Draw him at ×3 the way October 2.0 drew the pumpkins, then judge him at 1:1 beside the scarecrow.

### 4. The countdown string breaks November's sand rule, and reads as a fence
**Where:** design C3b and option A; proofs §1–2 and composite 2. Sheet panel 4.

**What's wrong.**
- The posts stand at 46, 59, 72 and 86% of the width. Two of the three scallops sit under the clock
  column (31–69%), under the bell strip and the pill. v7.58 settled this: "Everything on the sand
  stands at the RIGHT edge… never under the clock column (a first cut put the scarecrow… under the
  bell strip; review moved it)." The string reopens a ruling Croix already made.
- At 1280 the dock covers the sand to about 52%, so the first post (46%) stands behind the dock.
  There is no December proof at 1280 to show this.
- The navy posts and wire are the strongest marks in the strip. At one third it reads as a fence or
  a clothesline. The bulbs are about 10 × 16 px of amber with a halo that barely shows on sand.
- The cord from behind the dock is a stray line right beside the boat.
- The proof caption says 14 × 16 bulbs; the design says 10 × 16.

**Fix.** One short string in the right-hand sand (from `--nvLeft`'s side of 70% to the snowman), with
one post or none.
- **Hang it** from a single driftwood post to the snowman's raised arm, so he holds the lights. That
  makes the lights and the snowman one group and one focal point.
- **Bulbs:** 14 × 22 px, with a solid amber glass and a lit-yellow core.
- **Remove:** the dock cord.

### 5. The payoffs land on the days the board is least likely to be seen
**Where:** design A, C3, C3b, C5b; animation B3 and C. Composites 2 and 5.

**What's wrong.** The story has three climaxes, and each one depends on a single day.

- **Dec 18, the last day before break.** It is the day of parties, movies, low attendance and the
  stage (`body.focusMode`), and the stage hides every seasonal piece. On that day the snowman gets
  his carrot, scarf and hat, the ninth bulb lights, it snows every period and the gull is "found
  sitting on his hat." The design and the animation doc force the visit into "the first
  period"/"period 1". On a Black week, period 1 is the *last* class of the day (the composite uses
  6th period as "the day's first class"). The docs never say which one they mean.
- **Jan 4, the first day back.** The seal's debut is "the greeting in every period" for one day, and
  the lights come down that day. Deckhand knows only whole skip weeks, not single days. If Jan 4 is a
  teacher planning day in Lake County's calendar, the whole beat plays to an empty room.
- **Feb 26, the last school day of February.** The puddle, the sprout and the turtle are seen for
  exactly one school day. On Mar 1 everything is gone, and the board has no coda.

**Fix.**
- **December:** finish the snowman on Wed Dec 16. Make Dec 16–18 "complete" days, with the gull's
  first visit on Dec 16 in the day's first class by the clock, not "period 1."
- **January:** make `wnFirstBack` the first *two* school days the board sees bells after the break.
- **February:** start the puddle stage on Mon Feb 22, and let the sprout grow over that week.
- **March:** keep a one-week coda (Mar 1–5): the hat and the sprout on the sand, the turtle, nothing
  else.
- **Ask Croix** what his room does on Dec 18 and whether Jan 4 is a student day.

### 6. The frost's paint cost is unproven and probably heavy on the Chromebox
**Where:** animation A ("the frost and the dune cap are static paths… painted once"), B2.

**What's wrong.**
- In the proof, the peak frost is one SVG with 464 elements and about 19,000 path commands. December
  stages are about 5,000–10,000. That is two orders of magnitude more than the web or the branch.
- B2 puts the drip (`ellipse.wnDrip`) and the 51 s breath (`g.wnBreath`) *inside* that SVG. Chrome
  does not reliably composite transform or opacity animations on SVG children. An animated child can
  repaint the whole SVG every frame: 3.3 s per drip and 51 s per breath.
- The 4 s stage crossfade animates opacity on two such groups at once.
- The budget table says "≤ 2" animated things for the frost. It does not count the paint.

**Fix.**
- Rasterize each stage once (an offscreen canvas → `<canvas>` or an `<img>` blob) to the fitted
  envelope at devicePixelRatio, and regenerate only on a fit or stage change.
- Put the drip and the breath in their own small, absolutely positioned elements with
  `will-change`.
- Cap the path count (see 1).
- Measure on the Chromebox, or with 4× CPU throttle and paint flashing, *before* approval, not in
  §D after the build.

---

## Should fix

### 7. The flakes are pale outlines, the plate reads as a flower, and the flecks read as dust
**Where:** design C2; proofs §4. Sheet panel 7.

**What's wrong.**
- At true size the **plate** (six broad paddles with vein chevrons) reads as a six-petal flower.
- The **tipped** flake reads as a molecule diagram.
- The **fern** has a hollow white hub.
- All four are outlined in teal on white at about .6, so they are paler than any leaf November
  ships.
- The 8–12 px hairline **flecks** read as dust or sparkle noise, not snow.

**Fix.**
- Keep the **dendrite** and the **fern** (fill its hub).
- Replace the **plate** with a solid hexagonal plate with a sector pattern.
- Drop the **tipped** flake.
- Fill every crystal white with a 1.5 px navy-teal edge at full opacity.
- Make the flecks solid white 5–7 px discs or hexagons with an edge.

### 8. Snow falling every period for 90 days becomes wallpaper
**Where:** design C2 (rate and caps); animation B1.

**What's wrong.** November's leaves run for 30 days. Winter puts 6 crystals in motion in the
periphery all day for three months, and 10 in a snowfall period. When it is always snowing, a
snowfall period is not an event, and kids stop seeing the snow by mid-December.

**Fix.** Make snow weather, drawn per period by the director like the wind.
- **Clear:** nothing falls. This is most periods in December and February.
- **Flurries:** a cap of 2–3.
- **Snowing:** a cap of 8–10.

Then "it's snowing!" is something a class notices and tells the next class. December 1's first
snowflake survives as the one forced spawn.

### 9. At true size the sea's winter visitors are dashes
**Where:** design C5a–c; proofs §1 and §7. Sheet panel 9.

**What's wrong.**
- **The seal on its floe** (52 px) is a navy sliver on a white sliver. Its hind end is drawn as a
  forked fish tail, so at ×5 it reads as a spotted fish or shark. Seals have two splayed hind
  flippers.
- **The narwhal** in the far lane (60 px at `--ls .62`) is a line with a dotted needle. Its body has
  no head shape and no flipper. Its breath is a clip-art cumulus cloud.
- **The floes** (18–44 px) are white lozenges, indistinguishable from the waves' foam strokes.
- **Compare Wilson,** who reads because of a lit face with a navy rim.

**Fix.**
- **Seal:** redraw the hind flippers and a rounder head with a paleturq muzzle patch and visible
  whiskers.
- **Floes:** give them a thick navy-teal edge and a darker underside band.
- **Narwhal:** move it to the near lane, or scale it to `--ls .8`. Draw a melon head, a flipper and
  a vertical spout, not a cloud.
- **Proof:** prove each one at 1:1 beside Wilson.

### 10. The squall reads as a rendering fault, and it is fast motion during a lesson
**Where:** design C5e; animation B9; composite 3. Sheet panel 10.

**What's wrong.** At 1:1 the strip washes out, white hatching runs over the sand and dune, and the
boat turns into a ghost. The design admits it is "soft at one third." In motion, two streak tiles
loop every 0.9 s and 1.3 s for 40 s in the middle third of a period. That is the fastest repeating
motion on the board, and it plays mid-lesson.

**Fix.** Cut it, or redraw it.
- **Redraw:** a defined cloud bank with a navy-tinted (.15) underside and a visible slanted curtain.
  Keep it below the dune's crest, and slow the streaks to 3–4 s tiles.
- **Placement:** limit it to the last third of a period, like the rares.

### 11. Arctic animals on a Florida beach, and the Florida winter animal is missing
**Where:** design C5, F ("Penguins: the wrong pole… one 7th grader in the room will say so"), A
("It is Florida").

**What's wrong.** The design drops penguins for being from the wrong pole, then brings harbor seals
and narwhals to a beach it calls Florida in the thaw. The same 7th grader will say so. It also misses
the obvious native: **the manatee**. Florida's winter is manatee season. They crowd the warm springs
(Blue Spring is an hour from Clermont), they are slow and round, and kids already love them. A
right-whale mother and calf (they calve off Florida's Atlantic coast in winter) is a second
authentic visitor.

**Fix.**
- **Make the manatee winter's Wilson.** At the boat's scale, draw a navy silhouette with a paddle
  tail, a whiskered snout and one paleturq eye.
- **Its story:** it surfaces to breathe beside the boat (nostrils first), drifts, and the gull lands
  on its back for a ride.
- **Keep the narwhal tusking** as the rare storybook beat if Croix likes it.
- **The seal:** decision 1.

### 12. The sea monster gets four days out of ninety
**Where:** design C5 (the caper, Jan 25–28).

**What's wrong.** The kids love the serpent, and winter gives it Monday to Thursday of one week. The
caper is the best idea in the doc, and it is under-used.

**Fix.** Give the serpent a winter arc.
- **January:** it surfaces through a floe and breaks the ice (a new act, January).
- **The theft:** it steals the scarf (caper week).
- **February:** it is seen once more wearing the scarf before the thaw, and the scarf turns up on
  the sand by the puddle at the end.
- **Weight:** keep the serpent's weight at ×1.3 through January.

### 13. The seam with November: one day of scarecrow, then four nearly plain days
**Where:** design A ("Starts Tue Dec 1"), animation C (`dec1`: w 0, cap 0).

**What's wrong.** The week of Nov 23 is a skip week, so the first day back is **Mon Nov 30**, which
is still November. The class sees the scarecrow for one day, and then on Dec 1 the sand is empty. The
corner frost is at .2, flakes fall at half rate, and no winter act plays. "The board is never plain"
is true on paper only.

**Fix.**
- **Start date:** start winter on the first school day after Thanksgiving week (Nov 30). Ask Croix.
- **Week one:** put something on the sand from the first day, such as the first snow on the dune and
  a small snowball.

### 14. Steward is hand-waved
**Where:** design E and the Steward paragraphs; proofs §6 (Steward row).

**What's wrong.**
- **The numbers are unsourced.** Nothing in this repo sources "76 px of free sand" or "a 24 px
  margin," and no proof shows a real Steward board.
- **Frost:** an 18 px frost rim at the screen's edge is invisible, so Steward really gets no frost.
- **Snow:** snow behind the cards on a dense board shows only in the gaps, so flakes blink in and out
  as they pass behind cards. That is more distracting than snow falling over them.
- **Snowman:** at 31 × 43 px he is a white blob. The M3 puddle at 0.32× is a smear. "Every stage
  still reads" is not what the row shows.

**Fix.**
- **Proof first:** photograph a real Steward board and lay winter over it before Steward is promised
  anything.
- **Drop** Steward's frost and falling snow.
- **Keep:** the dune cap, the snowman at no less than 0.5×, and the lights.

### 15. At 1280 × 800 every boat beat is invisible
**Where:** composite 6. This is pre-existing: `#boat` is at `max(42vw, 300px)`, and at 1280 the dock
covers it.

**What's wrong.** None of these show on a 1280 board: the seal "beside the boat," the narwhal's
salute, the squall's heel, snow on the deck, the gull's hat, or the gull leaving for the visit.
Composite 6 shows the frost's fit and nothing else.

**Fix.** Either accept that 1280 is a secondary size and say so, or anchor winter's boat-relative
beats to the first open water right of the dock (as `--nvLeft` does for the sand). Add a December
proof at 1280.

### 16. The bulbs flicker once a minute, all day, for two weeks
**Where:** animation B4 (`wnLoose`, 60 s; nine bulbs breathing).

**What's wrong.** A flicker is a motion onset, and the eye goes to it. Once a minute is about 50
times a period, during instruction.

**Fix.** Flicker at most once a period, in a period's last third, or drop it. Keep the breathing, at
.85 → 1, not .72 → 1.

### 17. The docs contradict each other, and the proofs leave out what Croix needs to see
**Where:** throughout.

**Contradictions:**
- **The first period.** "The first period" (C3) and "period 1" (B3) are not the same thing on a
  Black week (see 5). The composite uses 6th period.
- **Stale text.** Design B: "The boat's lights are warm" is left over from before the move to the
  beach.
- **Bulb size.** The proof's §1 caption says 14 × 16 bulbs; C3b says 10 × 16.
- **The thaw's start.** Design A says January is deep winter "→ Sun Feb 14," but the frost table
  thaws from Feb 1.
- **What reads at one third.** §G claims the dune cap reads best at one third, and that "the snowman
  reads as a white figure." The -8m sheet shows neither.
- **Steward.** The §6 Steward row says every stage reads. It doesn't (see 14).
- **The budget.** Animation A says the frost "must not repaint," while B2 animates children inside
  it (see 6).

**Missing from the proofs:**
- the board on Dec 1–4 (the plainest week);
- December at 1280 (the lights against the dock);
- any frame of motion (the -8m sheet is still frames only);
- a Steward board;
- the frost's December stages on a December card (§5 draws every stage on a "January 13" card);
- the snowman at one third beside the scarecrow.

**Fix.** Reconcile the items above in one pass, and add the missing proofs before asking for a go.

---

## Polish

18. **The gull's hat** is the UI's teal and about 3 px at true size (§3), so nobody sees it. Make it
    rust knit, matching the scarf, or drop it, and let snow on the deck carry snowfall periods.
19. **The last frame reads as debris** (composite 5; sheet panel 19). The sprout is teal like the
    hat, so it doesn't say spring. Use November's rare green `#4F6B3A` for the sprout (its only use
    in winter). Draw the mound as a recognizable slumped snowman (the hat still on the head) and not
    as scattered parts.
20. **The breath spot** is 50 px and white on near-white, so it is barely visible (§5 F4). Make it
    90–110 px, a clear oval with a fogged rim, about hand-sized on the panel.
21. **The icicles** are hairlines at the lip. Give them filled bodies 3–6 px wide at the root, with
    a white highlight.
22. **The narwhal's breath** is a cartoon cloud. Draw a vertical spout that thins (see 9).
23. **Delete the dock cord** (see 4).
24. **The bulbs' meaning.** On Dec 7 nine bulbs are dark with ten school days left (today included).
    Specify that "dark bulbs = school days left after today," or light one on Dec 7.
25. **The crooked head.** Say when it resets: at the next day's first tick, so one class's tap
    doesn't greet every class after it.
26. **Theme sounds: silent.** Agreed. Leave it.

---

## What's good and should survive

- **The freeze and thaw as the season's clock.** Croix liked it, and it is the right spine for three
  months.
- **The world changes between days, never in front of a class.** The melt is not animated. It is
  October's restraint, applied well.
- **The frost is fitted to the measured face.** It keeps 28 px from the content and 12 px from
  controls, is refitted at each bell, and is regenerated rather than scaled. This is the right
  method; the drawing inside it is what needs work.
- **The gull is the snowman's builder,** told through clues: the prints, the matching knit, the
  visits. The design never shows the building, and the kids work it out.
- **The serpent wears the stolen scarf,** in the attack too. It is the best joke in the doc.
- **Tusking** (the X over the water) is the one sea drawing that reads at one third.
- **The first snowflake of the year** on Dec 1.
- **Snow melts when it reaches the water,** with a small white ring where it touched. Snow doesn't
  float.
- **Pure functions of (date, period),** seeded. Every class sees the same world, and the tests can
  pin it.
- **A secular default, warm lights, and no theme sounds.**
- **Reduced motion is designed piece by piece,** and the taps still work as state changes.

---

## The revised brief (for the designer)

1. **Palette.** Snow stays white, but every snow shape gets a navy 1.4–1.8 px edge. The knit (hat
   and scarf on the snowman and the gull) is rust with cream bars. The lights are amber with a
   lit-yellow core. The sprout is November's green. Teal is for ice and frost only. The proof is the
   whole board at one third beside live November: winter must read as winter from there.
2. **Frost.** Redraw it as 8–14 curved, filled plumes that do not cross, with one feathered haze and
   filled icicles. The peak is at most 0.6 of the free corner and at most 1,500 path commands. It is
   rasterized once per stage, and the drip and breath are separate layered elements. Prove every
   stage on a card of its own month.
3. **Snowman.** Redraw him as the gull's beach snowman: lumpy packed snow, pebble eyes of different
   sizes, shell buttons, driftwood arms, a long bent carrot and the rust knit. He stands fully on
   the sand, below the card's shadow. His eyes turn toward whatever is on the water during an act.
   Draw him at ×3, then judge him at 1:1 beside the scarecrow.
4. **Lights.** Make a short string in the right-hand sand: one driftwood post to the snowman's raised
   arm, with 9 bulbs at 14 × 22 px. There is no cord to the dock and nothing between 31% and 69%.
   The breathing runs at .85 → 1, and the loose bulb flickers at most once a period. Prove it at
   1920 and at 1280.
5. **Calendar.**
   - **Start:** the first school day after Thanksgiving week (Nov 30), pending Croix.
   - **December:** the snowman is finished Wed Dec 16, and the gull first visits that day in the
     day's first class by the clock. Dec 17–18 are "complete" days.
   - **January:** the first-back beats run for two school days.
   - **The end:** the puddle stage runs Feb 22–26 with a growing sprout, and a coda week runs
     Mar 1–5 with the hat and the sprout before the board goes plain.
6. **Snow as weather.** Each period is drawn clear, flurries or snowing (caps 0, 2–3 and 8–10). Keep
   two crystal kinds (dendrite, fern), filled white with a navy-teal edge, and solid flecks.
   December 1's first flake stays.
7. **Sea.** Add the manatee as winter's Wilson (it surfaces nostrils-first by the boat, drifts, and
   the gull rides on its back). Redraw the seal's flippers and head, or drop the seal (decision 1).
   Move the narwhal to the near lane or `--ls .8`, with a spout and not a cloud. Give the floes a
   thick edge so they stop reading as foam. Keep tusking as the rare.
8. **Serpent.** Give it a winter arc: it breaks a floe in January, steals the scarf in caper week,
   is seen once more wearing it in February, and the scarf turns up on the sand at the end. Its
   weight is ×1.3 through January.
9. **Squall.** Cut it, or redraw it as a defined bank with a darker underside, kept below the dune,
   with slow streaks and only in a last third.
10. **Steward.** Get one real Steward board photographed first. Then: no frost, no falling snow; the
    dune cap, the snowman at no less than 0.5×, and the lights in the free sand. Show it on a proof.
11. **Proofs required before a go:**
    - Dec 2, Dec 16, Jan 13 and Feb 24 at 1920, and Dec 16 at 1280;
    - the one-third sheet with the live October and November boards beside it;
    - a Steward board;
    - a 10 s motion strip of snow, the lights and one sea act;
    - a Chromebox (or 4× throttle) paint trace of the peak frost with a drip.
12. **Docs.** Fix the contradictions in 17 in both docs in one pass. Say "the day's first class by
    the clock" everywhere a beat is pinned to a period.

## Decisions for Croix

1. **The sea's winter cast:** Florida (the manatee, maybe a right whale and calf) or storybook arctic
   (seal and narwhal)? Or the manatee as the lead with tusking kept as the rare?
2. **The lights:** a short string held by the snowman on the right, or drop the countdown?
3. **Snow:** weather that comes and goes (my pick), or flurries every period all winter?
4. **The window:** start Nov 30 or Dec 1? End Feb 28, or with a coda week into March?
5. **His room's calendar:** is Jan 4 a student day? What does his room do on Dec 18 (a movie on the
   stage?), and does "the first period" mean his first class of the day?
6. **The frost's peak size:** at most 0.6 of the free corner (my pick), or the full corner?
7. **The squall:** cut it, or redraw it?
8. **The snowman:** a beach-built snowman (driftwood, shells, pebbles), or a classic one (coal and
   carrot)?
