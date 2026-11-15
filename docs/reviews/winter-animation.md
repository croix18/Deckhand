# Winter 2.0: the motion (Nov 14, 2026)

This is the motion spec for `winter-design.md` (2.0), written like `october-2.0-animation.md`. Each
motion is given in CSS keyframes or the Web Animations API, for a Chromebox driving a Promethean
panel. The drawings and their class names are in `winter-proofs.html`.

## What changed from the first animation doc, and why

The first doc (in git at `3455d0e`) animated pieces that are now cut: the seal, the floes, the
narwhal, tusking and the squall. It also had three problems the audit (`winter-audit.md`) found:
- **The frost's drip and breath were inside the frost's SVG**, so every frame of either could repaint
  thousands of paths (audit 6).
- **A loose bulb flickered once a minute** and every bulb breathed, all day, for two weeks (audit 16).
- **Snow fell every period for three months** (audit 8).

This rewrite:
- moves the frost to a **bitmap drawn once per stage**, with the drip and the breath as separate
  small layers;
- makes the lights **still**;
- makes snow **weather**;
- animates the new cast: the manatee, the calf, the gull's ride, and the serpent's three winter
  beats.

**Conventions (unchanged).**
- **Motion:** every motion is gated by `body.waveMotion`. Under reduced motion the pieces sit still
  and a tap still changes state.
- **One motion per element:** nested wrappers where two motions coincide. A `transform` animation
  and an individual-property animation on one SVG element paint only the `transform` (SEA.md).
- **Origins** sit at the joints, in view-box units.
- **The sea's clocks:** `--T1` 11.2 s, `--T2` 7.1 s, `--sine`, `--flut`, `--flutT`.
- **Times** are seconds from the act's (or the tap's) start, and `dur` = the CSS length + 500 ms.
- **The stage, the audio, the settle-in:** nothing takes the stage, wakes the audio, or is timed
  against the settle-in count.

---

## A. The budget

The hardware is a Chromebox and the board over `file://` on a 1080p panel.
- Only `transform`, `translate`, `rotate`, `scale` and `opacity` animate.
- At most one sea visitor plays besides the boat.

**The heaviest moment** is a windy snowing period with the calf act on the water and a drip in the
corner:

| what | animated things | layers |
|---|---|---|
| snow at its cap (10) | 3 WAAPI animations each (fall, sway, spin) = 30 | each flake its own ≤ 56 px layer (`will-change: transform`, as the leaves) |
| the boat | the existing heave, pitch and drift, plus the lantern | the boat's own |
| the manatee and calf | ≤ 10 SVG children | the act's box |
| the frost | 0 to 2 (a drip, a breath) | **the frost itself is a still `<canvas>`**; the drip and the breath are their own small layers |
| the snowman | ≤ 2 (a tap, a visit) | a 120 × 160 svg |
| the lights | **0** | one still svg |

That is less than November's windy budget, which already ships: the leaves at their cap, the
branch's five swinging leaves and the scarecrow's sway.

**The frost's one real cost is its raster** (design C1, measured in proofs §4): 10–33 ms per stage in
Chromium, and 47–183 ms with 4× CPU throttling. It happens at a stage change:
- the day's first tick;
- a resize;
- a bell, **only if the face's boxes moved**.

It runs in an idle callback. `createImageBitmap(blob)` decodes off the main thread, and the old
bitmap stays up until the new one is ready, so a slow raster never shows as a blank corner or a
dropped frame at the bell.

**If 4× throttling shows more than 4 ms of main-thread work per frame** with ten flakes and the calf,
drop the flakes' sway first; the fall and the spin are the snow.

---

## B. The motions, piece by piece

### B1. Snow (`Snow`, a sibling of `Leaves`)

**Markup per flake** (built in JS, like `.nvLeaf`): `.wnFlake` (fall) > `.wnSway` (drift) > `.wnSpin`
(rotate) > the SVG (0 0 60 60). The first design's fourth wrapper (`rotateX` tilt) is dropped: a
filled crystal turned edge-on is a line, and the tilt cost 10 animations at the cap.

| motion | value | notes |
|---|---|---|
| fall, crystal | 20–28 s, from the top (−size − 10) to the waterline | linear: snow reaches its terminal speed at once |
| fall, fleck pair | 16–22 s | linear |
| fall, windy | duration × .7; x ends 80–160 px left of the start | clamped to the flake's outer column |
| sway | `translateX(±a)`, a = 6–14 px, 3.6–5.4 s | `--sine`, alternate, infinite |
| spin | `rotate(r0 → r0 ± 360°)`, 14–22 s (windy × .62) | linear; a six-fold crystal turning reads as a shimmer, not a spin |
| landing on the water | `scale(1 → .55)`, `opacity 1 → 0`, 900 ms | plus a 14 × 4 white ring (`seaRing`, 1.3 s) |
| tap | the leaves' `fling()`, rotation ±870° | |

**The rate**, from `data-wn-snow` (design C2):

| weather | first spawn | the gap | a second spawn | cap |
|---|---|---|---|---|
| `clear` | none | — | — | 0; flakes already falling finish their fall |
| `flurries` | 3–7 s after the bell | 14–30 s | 15% of the time | 3 |
| `snowing` | 2–4 s | 6–12 s | 30% | 8, or 10 when windy (the gap × .7) |

The weather changes only at a bell. A period that turns clear lets its flakes land, so the snow
stops the way snow does.

**"The first snowflake."** On Nov 30's first period, the first spawn is forced: the dendrite at 56 px,
a 28 s fall, the right column at 92%.

**The stage rule** (the leaves'). A `deckhand:stage` start clears the moving flakes, and nothing
spawns while staged. A resize clears them all.

**Reduced motion.** Nothing falls. On a flurries or snowing period, `rest()` lays two crystals still
on the sand at the right edge, beside the snowman's patch. Taps do nothing.

### B2. The frost: a bitmap, a drip, a breath

**Markup.**
- `canvas#wnFrost` in the clock card at its top-right, sized to the fitted envelope at
  devicePixelRatio, `z-index:4` (the web's and the branch's slot), `will-change: opacity`. It holds
  the stage's bitmap.
- **Two small absolutely positioned siblings** over it, each its own layer:
  - `div.wnDrip`: a 6 × 9 drop, placed at an icicle's tip;
  - `div.wnBreath`: a 108 × 92 oval, placed at the tap.
- A transparent hit box over the envelope.

**A stage change** (the day's first tick): the new bitmap is painted into a second canvas, which
fades in over 4 s while the old one fades out (opacity on two layers: no repaint). That is the
branch's regrow timing. The freeze and the thaw happen between days, never in front of a class.

**The drip** (3.3 s). Its slots come from `frost.times(date)`, pure in the date, seeded like
`branch.times`:
- 2–4 an hour through January;
- 6–8 an hour in T1 (Feb 1–12);
- 10–14 an hour in T2 and T3.

The drop is a separate element, so the frost never repaints.

| t | the eye sees | why |
|---|---|---|
| 0–2.4 | a drop swells at the icicle's tip | the anticipation is the whole drip; ease-out |
| 2.4–3.0 | it hangs, stretching a little | the pause before gravity |
| 3.0–3.24 | it falls 40 px, accelerating, stretched to 1.4× | `cubic-bezier(.55,0,1,.45)`: a parabola |
| 3.3 | gone | |

```css
.wnDrip{position:absolute; width:6px; height:9px; transform-origin:50% 0; opacity:0; will-change:transform, opacity;}
body.waveMotion .wnDrip.go{animation:wnDrip 3.3s linear both;}
@keyframes wnDrip{0%{transform:translateY(0) scale(0); opacity:1; animation-timing-function:cubic-bezier(.2,.7,.4,1);}
  72.7%{transform:translateY(0) scale(1); animation-timing-function:ease-in-out;}
  90.9%{transform:translateY(0) scale(1,1.08); animation-timing-function:cubic-bezier(.55,0,1,.45);}
  98.2%{transform:translateY(40px) scale(.8,1.4); opacity:1;}
  100%{transform:translateY(44px) scale(.6,1.2); opacity:0;}}
```

**The breath** (a tap; 51.3 s). The oval is white at .94 with an 8 px `#C9D9F7` fogged rim, placed at
the tap.

| t | the eye sees | why |
|---|---|---|
| 0–.28 | the clear spot opens | a breath on glass is fast |
| .2 / .6 | the nearest icicle drips twice | the warmth reaches the ice |
| .28–6.3 | the spot holds | the room sees what happened |
| 6.3–51.3 | the frost grows back: the oval thins and shrinks | slow |

```css
.wnBreath{position:absolute; width:108px; height:92px; margin:-46px 0 0 -54px; border-radius:50%; background:rgba(255,255,255,.94); box-shadow:inset 0 0 0 8px rgba(201,217,247,.8); opacity:0; will-change:transform, opacity;}
body.waveMotion .wnBreath.go{animation:wnBreath 51.3s linear both;}
@keyframes wnBreath{0%{opacity:0; transform:scale(.4); animation-timing-function:cubic-bezier(.2,.7,.3,1);}
  .55%{opacity:1; transform:scale(1); animation-timing-function:linear;}
  12.3%{opacity:1; transform:scale(1); animation-timing-function:cubic-bezier(.4,0,.6,1);}
  100%{opacity:0; transform:scale(.3);}}
```

Under reduced motion, a tap sets `.on` (opacity 1, no animation), and a timer removes it 45 s later.

### B3. The string lights

**Markup.** `svg#wnLights`, fixed at the screen's top, the screen's width, and as tall as the deepest
scallop plus a bulb. It sits above the clock card and below the dock, `pointer-events:none` except on
the bulbs. Each bulb is `g.wnBulb` (a socket, glass, a core and a glint). A lit bulb adds `.on` with
its halo.

**At rest nothing moves.** There is no breathing, no flicker and no wind swing: the audit's finding,
and Croix's "no distracting motion."

**The day's new bulb** (the first tick, December): its glass and halo fade from dark to lit over
1.5 s (`opacity` on two stacked glasses). Before the first class, nobody sees it happen; they see one
more lit.

**A tap on a bulb.** One damped swing about its socket, on `.wnBulbSwing` (rotate, origin at the
socket's top), 1.2 s: 8° → −5° → 2.5° → 0, `ease-in-out` per swing. It is a toy, and it ends.

**The string comes down** on Jan 11: it is simply gone at the day's first tick.

**Reduced motion.** As at rest. A tap does nothing.

### B4. The snowman

**Markup** (each motion on its own element):

```
#wnSnowman  (fixed, right 3vw, bottom 34px, z 2, width --wnSmW)
  > svg 0 0 120 160
    > .smGround  (patch, shadow, prints, slush, puddle, sprout)
    > .smBase
    > .smUpper  (the thaw's lean and sink: attributes per stage, never animated)
      > .smArms, .smMid, .smShells
      > .smScarf
      > .smHead  (origin 61,74: the neck)
        > .smFace, .smNose  (origin 57,65.5)
        > .smPail
      > .wnVisit  (the visiting gull: > .vgFly / .vgPerch)
```

**Idle.** A snowman does not move. The sargassum end hangs still: wet weed is heavy, and the first
design's swaying knit was motion for its own sake.

**On a snowing period:** `.smFresh` (a white cap on the pail's base and on the driftwood's tops)
takes `opacity: var(--wnFresh)`. Season steps it once a minute toward 1 over the period's first 20
minutes, and it resets at the bell. There is no animation.

**The tap: the head slips** (900 ms on `.smHead`, the first design's keyframes, unchanged).
- It slides 7°, overshoots to 9.5°, and settles crooked at 6°.
- The pail jolts a beat later (`.smPail`, a 4° counter-wobble, 600 ms) and the nose wobbles.
- The next tap rights it.
- `.crooked` is cleared at the next day's first tick.

In M1/M2 a tap releases two drops from the nose's tip. In M3 a tap on the puddle sends one ring. In
the coda a tap makes the sprout nod: 10° and back, 700 ms, origin at its base.

**The thaw** (M1/M2): one drop every 20–40 s from the nose's tip and the right arm's end, on a 31 s
loop. That is the only idle motion he ever has, and only in the thaw.

**The visit** (a beach act, `dur` 240 500; design C3). It starts with `Sea.gullLeave()`.

| t | the eye sees |
|---|---|
| 0–2.5 | the resident gull lifts off the masthead |
| 2.5–4.0 | it glides in from the upper left on a descending arc, wings set |
| 4.0–4.4 | it lands on the pail: wings up, a 2-unit settle |
| 4.4–236 | it sits; its head turns at 38, 81, 140 and 197 s; at 110 s it looks down at the snowman's face (a 10° nod, held 3 s) |
| 235.5 | `play("gull")` is queued (the trawler's `defer:gullBack`) |
| 236–238 | it takes off toward the boat as the resident lands on the masthead |

**The schedule:**
- The first visit (Dec 14) is in **the day's first class by the clock**, 60 s after its greeting.
- After that, `visit.times(date)` (pure) gives about one school day in three until the break, and
  one in five through January, in a period's middle third.

### B5. The boat and the gull

- **Snow on the deck:** `.wnDeck{opacity:0; transition:opacity 600s linear}`, and
  `body[data-wn-snow=snowing] .wnDeck{opacity:1}`.
- **The lantern** keeps November's keyframes, with its step set by Season.
- **The lean:** for `boat:"manatee"`, the gull leans to look (November's `nvGullDucks` keyframes),
  at 3.0–6.6 s of the manatee act and 3.4–7.0 s of the calf act.

### B6. The manatee (50 s, `dur` 50 500)

**Markup.** `#sea-manatee.seaThing` (near lane; anchored at Wilson's spot,
`left: calc(max(42vw, 300px) + 34px)`, bottom 6 px, width 92 px, box 100 × 40 units). It holds:
- `.mnDrift` (translateX)
  > `.mnBob` (thingHeave, `translate`)
  > `.mnPitch` (`rotate`, origin at the waterline's center, 50,29: the breathe and the dive)
  > svg
    > g[clip-path: its waterline at y 29]
      > `.mnBody` (the body, the flipper, the details)
    > `.mnRing`
    > `.mnSpray`.

| t | the eye sees | why |
|---|---|---|
| 0–1.2 | a ring and bubbles beside the boat | "something's under there" |
| 1.2–2.0 | **nostrils first**: the snout breaks the water, pitched up 20° (`.mnPitch`), a spray of three drops | the manatee's own entrance, and the silhouette asks a question |
| 2.0–3.0 | the head lifts higher, the eye clear of the water; it holds | the pause the room reads |
| 3.0–6.6 | it looks at the boat; the gull leans over | a reaction makes it a character |
| 6.6–8.4 | it levels out (pitch back to 0, ease-in-out); the back and the round tail come up | the answer: it's a manatee |
| 8.4–30 | it cruises right at the surface, slower than flotsam, bobbing on the swell | the base: slow is what a manatee is |
| 30–32 | it breathes again: snout up 10°, spray, down | a sign of life |
| 38–40.4 | **the dive**: it pitches −22° (head down), and the round tail lifts clear of the water | the shape nobody mistakes |
| 40.4–41.4 | the tail hangs | the whale's rule: the fluke is LATE |
| 41.4–42.4 | it slips under; a ring at 42.6 | |
| 50 | gone | |

```css
#sea-manatee{bottom:6px; left:calc(max(42vw, 300px) + 34px); width:92px;}
body.waveMotion #sea-manatee.go .mnDrift{animation:mnDrift 50s linear both;}
@keyframes mnDrift{0%,16.8%{transform:translateX(0);} 84%,100%{transform:translateX(calc(30vw - 40px));}}
body.waveMotion #sea-manatee.go .mnBob{animation:thingHeave calc(var(--T1) / 2) var(--sine) infinite alternate;}
.mnPitch{transform-box:view-box; transform-origin:50px 29px;}
body.waveMotion #sea-manatee.go .mnPitch{animation:mnPitch 50s linear both;}
@keyframes mnPitch{0%,2.4%{transform:translateY(12px) rotate(20deg); animation-timing-function:cubic-bezier(.2,.6,.4,1);}
  4%{transform:translateY(2px) rotate(20deg); animation-timing-function:ease-in-out;} 6%,13.2%{transform:translateY(0) rotate(20deg); animation-timing-function:ease-in-out;}
  16.8%,60%{transform:translateY(0) rotate(0); animation-timing-function:ease-in-out;} 62%{transform:translateY(0) rotate(10deg); animation-timing-function:ease-in-out;}
  64%,76%{transform:translateY(0) rotate(0); animation-timing-function:cubic-bezier(.4,0,.6,1);}
  80.8%,82.8%{transform:translateY(4px) rotate(-22deg); animation-timing-function:cubic-bezier(.5,0,.9,.5);}
  84.8%,100%{transform:translateY(22px) rotate(-22deg);}}
```

The drift starts after the head-up (16.8%), so the manatee looks at the boat from beside it, then
leaves. Its distance (30vw) keeps it clear of the sand pieces at every width. The spray (`.mnSpray`,
three drops, `translate(0, −6px)` and fade over 700 ms) plays at 1.2 s and 30 s.

**Windy:** the spray shears left (`translate(−6px, −4px)`), and the cruise is unchanged. A manatee
doesn't care about the wind.

### B7. Mother and calf (54 s, `dur` 54 500)

The same act with a second `.mnDrift` copy, `.mnCalf`, at 0.55× (width 51 px), 30 px behind the
mother, on a bob phase 1.4 s later. The calf breathes 0.8 s after its mother (spray at 2.0 s and
30.8 s), and dives 1.2 s after her. A calf follows. `dur` is 4 s longer for the calf's dive.

### B8. The ride (rare, a last third, 60 s, `dur` 60 500)

The manatee act at the cruise (no dive until 52 s), with the gull:

| t | the eye sees |
|---|---|
| 0–8.4 | the manatee act's entrance |
| 9.0–11.0 | the resident lifts off the masthead (`Sea.gullLeave()`) and glides down on a short arc |
| 11.0–11.4 | it lands on the manatee's back (on the hump, 55,9 in its units): wings up, a settle |
| 11.4–48 | it rides, standing; the scarf ends stream back on `--flut`; it turns its head twice (the perch's 60 ms flip) |
| 48–50 | it lifts off and flies back toward the boat |
| 50 | `play("gull")` (`defer:gullBack`) brings the resident home |
| 52–56 | the manatee dives |

### B9. The serpent's winter

All three costumes ride inside the serpent's head group (`.ssSeg.g4 > .ssHump.h4`), so they dive and
roll with the head and need no clock of their own. The attack's head carries the same costumes.

- **The scarf** (`body.wnCaper`, Jan 25–29). `g.wnSerpScarf` is a sargassum wrap with two streaming
  fronds. The fronds (`.wnSsEnds`, origin at the knot) flutter on the serpent's wind:

  ```css
  .wnSerpScarf{display:none;}  body.wnCaper .wnSerpScarf{display:inline;}
  .wnSsEnds{transform-box:view-box; transform-origin:80px 19.5px;}
  body.waveMotion.wnCaper #sea-serpent.go .wnSsEnds{animation:wnSsFlut calc(var(--flutT) * 1.4) var(--sine) infinite alternate;}
  @keyframes wnSsFlut{from{transform:rotate(-3deg);} to{transform:rotate(5deg);}}
  ```

- **The pail** (`body.wnPuddle`, Feb 22–26). `g.wnSerpPail` sits on the head at −12°. It is rigid:
  a pail on a head doesn't flutter. When the head dives, the pail goes under with it.
- **The first snow** (`serpentSnow`, uncommon, far lane, 22 s, Dec 7 → Jan 29, flurries or snowing
  periods only; `dur` 22 500).

  | t | the eye sees |
  |---|---|
  | 0–5 | the serpent's usual entrance, humps rising |
  | 5–6.2 | the head lifts 24° (`rotate` on the head group, origin at the neck, ease-out), looking up |
  | 6.2–8.6 | a flake falls into frame from above (its own element, linear) and lands on the snout tip |
  | 8.6–10.4 | held: the flake sits on its nose |
  | 10.4–10.7 | a quick head shake (±5°, three swings): the flake is gone |
  | 11–22 | the head lowers and it swims on and dives |

### B10. The whale's breath

Under `body.winter`, the whale's puff and shot keyframes get a variant: ×1.5 the size, held 1.6× as
long before they thin, and drifting 20 px left.

### B11. Stage changes, everywhere

Every date-driven change happens at the day's first tick (or when the board opens), never mid-period:
- the frost's stage (the bitmap crossfade);
- the snowman's stage;
- the dune cap's coverage;
- the bulb count;
- the lantern's step;
- the caper's and the puddle's costumes;
- the coda.

Each is a 4 s opacity crossfade between the old and new drawings, except the bulb, which is its 1.5 s
light-up. The snow weather changes only at a bell.

---

## C. The director

### The `ACTS` rows

`winterPhase(dateStr)` is pure:

| phase | dates |
|---|---|
| `dec1` | Nov 30 – Dec 4 |
| `dec2` | Dec 7 → the last day before break |
| `break` | the break |
| `back` | Jan 4–5 |
| `jan` | Jan 6 → Jan 29 |
| `thaw` | Feb 1–26 |
| `coda` | Mar 1–5 |

| act | tier | `dur` | lanes | flags | notes |
|---|---|---|---|---|---|
| `manatee` | common | 50 500 | near | `season:"winter"`, `greeting:true`, `boat:"manatee"`, phase dec2–thaw | the greeting in every period on Dec 7–8 and Jan 4–5 |
| `manateeCalf` | uncommon | 54 500 | near | `boat:"manatee"`, `notBefore:"01-11"`, phase jan–thaw | |
| `ride` | rare | 60 500 | near | `lastThird:true`, `gullBack:true`, `notBefore:"12-14"`, phase dec2–thaw (not after Feb 19) | `busy()` treats it as a gull act: no visit, trawler or geese in the same period |
| `serpentSnow` | uncommon | 22 500 | far | `needs:{snow:["flurries","snowing"]}`, phase dec2–jan (to Jan 29) | |
| `visit` | uncommon | 240 500 | — | `beach:true`, `gullBack:true`, `middleThird:true`, needs the snowman at S3 or later | its clock is `visit.times(date)` |

### The season's weight (`winterWeight(dateStr)`, pure)

| phase | w | winter acts a period | greetings |
|---|---|---|---|
| `dec1` | 0 | 0 | the everyday three; **the furniture is the announcement** (October's rule) |
| `dec2` | 1 | 2 | + the manatee (every period on Dec 7–8) |
| `break` | free-time pool only (manatee, serpentSnow) | — | — |
| `back` | 1.2 | 2 | the manatee in every period |
| `jan` | 1.2 | 2 | + the manatee; caper week: the serpent × 2, and in the greeting pool |
| `thaw` | .7 | 1 | the everyday three; puddle week: the serpent × 1.5 |
| `coda` | 0 | 0 | the turtle in every period |

The weight multiplies into `w[k]` beside the tier and memory factors, so the same date and period
still give the same show. A test can ask `plan("2026-12-07", 2, 50, 1, null)` and expect a manatee
greeting.

### Across a class period

The existing arc stands:
- a greeting at 45 s;
- quiet through the first ten minutes;
- an act every 3–7 minutes;
- rares only in the last third;
- nothing in the last three minutes;
- only commons under a timer or the settle-in.

Winter adds four rules inside `plan()`, all pure:
1. **The snow draw.** After the wind, the same generator draws `snow` at the phase's odds (design
   C2), and the director sets `data-wn-snow` with `data-sea` at the bell.
2. **Two winter acts a period** at most (one in the thaw).
3. **The serpent** at × 2 in caper week and × 1.5 in puddle week, and in caper week's greeting pool.
   The attack still needs a sighting first.
4. **The turtle** greets every period in the coda.

**What a student who looks up five times a day sees.** The furniture tells the date at every glance:
- the bulbs (one more each morning in December);
- the frost's size;
- the snowman's stage;
- the dune;
- the weather (flakes or none).

About one glance in four lands on a sea act (one or two winter acts in a 50-minute period, each
lasting about 50 s, plus the greeting). Nothing on the board moves fast or repeats fast: the fastest
motion is a flake's fall, at about one board height in 20 s.

### Reactions between pieces

- The gull leans to look at the manatee.
- The gull rides the manatee (rare) and visits the snowman.
- The serpent wears the scarf, then the pail.
- Snowing periods put snow on the deck, the dune and the snowman.

Nothing else reacts.

---

## D. Proof frames to grab before trusting any of it

Grab them in the aquarium (`tools/aquarium.html`) at 1920 × 1080 and at one third, with the board's
clock set to a winter date.

- **Snow.**
  - A 30 s strip at 2 fps in each weather: 0 flakes when clear; never more than 3 / 8 / 10; no flake
    box between 18% and 82%.
  - A clear bell after snowing: the falling flakes finish, and none spawn.
- **The frost.**
  - A paint-flashing trace: at rest, nothing in the corner flashes; a drip flashes only the drop's
    box; a breath, only the oval's.
  - The stage crossfade: two layers, no repaint.
  - A 4× throttle trace of a stage change: the raster sits in an idle task, and there is no long task
    at a bell when the boxes didn't move.
- **The lights.**
  - 10 s at 4 fps: nothing moves.
  - A tap swing at 0 / .3 / .6 / 1.2 s.
  - Bulb boxes 16 px clear of the face at 1920 × 1080 and 1280 × 800.
- **The snowman.** A tap at 0 / .14 / .26 / .9 s; the visit at 2.5 / 4.0 / 4.4 / 236.5 with the boat
  in frame.
- **The manatee.**
  - 1.6 (nostrils), 4.0 (looking, the gull leaning), 8.0 (level, the tail up), 39.6 (the tail
    lifted), 41.0 (hanging).
  - At one third, the dive must read as a round tail and the cruise as a long, low back with a tail.
- **The calf.** 2.0 / 2.8 (two breaths), 40.0 / 41.2 (two dives).
- **The ride.** 11.0 (landing), 30 (riding), 49 (leaving), 50.5 (the resident home).
- **The serpent.** The first snow at 7.0 / 9.0 / 10.5; caper week at 3 / 9 (the scarf going under
  with the head) / 18; puddle week at 3 / 9.

---

## What to carry into the code, in order

1. **Season:** the date rule (`winterStart`, `winterEnd`), the pure helpers, `apply()`'s classes and
   data attributes, and `snowWeather` in the director.
2. **The drawings**, from the proof sheet's functions:
   - `frost()`, which generates the SVG string that `frost.paint()` rasterizes;
   - `topLights()`, `snowman()`, `manatee()`, the flakes, and the serpent's costumes, as static markup
     with the wrappers named above.
3. **`Snow`**, `Leaves`' sibling, with B1's rates.
4. **The `Winter` sub-module:** the frost bitmap, drip and breath (B2); the string (B3); the snowman
   and the visit (B4).
5. **The sea:** the `ACTS` rows and `plan()`'s rules (C), then B6–B10.
6. **The frames in D**, before anyone trusts any of it.
