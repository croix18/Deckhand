# Winter — animation review (Nov 13, 2026)

This review is written the way `october-2.0-animation.md` and `sea-2.0-animation.md` were: the twelve
principles, in CSS keyframes and the Web Animations API, for a Chromebox driving a Promethean panel.
Every motion below is designed against the drawings in `winter-design.md` and its proof sheet
(`winter-proofs.html`), using their class names and joints. Where a drawing needs one more wrapper for
a motion to be possible, I say so at the top of that piece.

The register is the sea's. From the third row, only silhouette changes, speed changes and pauses
read, and every beat table is written in those three terms. Nothing here takes the stage, wakes the
audio, or is timed against the settle-in count. Everything is gated by `body.waveMotion`, so under
reduced motion the pieces sit still and the taps still change state without moving (October's rule).

**Conventions.**
- A timing function goes on every keyframe that changes speed. `ease-in-out` is used only where a
  real stop is wanted.
- One motion per element, with nested wrappers where two coincide. This is the Chrome rule from
  SEA.md: a `transform` animation plus an individual-property animation on one SVG element paints only
  the `transform`.
- Origins sit at joints, in `view-box` units.
- The sea's clocks are reused so winter's wind is the sea's wind: `--T1` 11.2 s, `--T2` 7.1 s,
  `--sine`, `--flut` and `--flutT`.
- Times are seconds from the act's (or the tap's) start.
- `dur` is the CSS length + 500 ms.

---

## A. The budget

The hardware is the one HANDOFF and SEA.md describe: a Chromebox, the board over `file://`, a 1080p
panel. Two rules apply:

- Only `transform`, `translate`, `rotate`, `scale`, `opacity` and `clip-path` animate.
- At most one sea visitor plays besides the boat.

Winter's peak is a windy snowfall period with a visitor on the water. That is:

| what | animated things | layers |
|---|---|---|
| snowfall at its cap (10) | 3–4 WAAPI animations each (fall, sway, spin, sometimes tilt) = ≤ 40 | each flake its own ≤ 62 px layer (`will-change: transform`, as the leaves) |
| the boat | the existing heave/pitch/drift, the lantern | the boat's own |
| the beach string | 9 bulbs breathing (opacity), a swing when windy | one svg on the sand |
| one visitor (the seal is the heaviest) | ≤ 12 SVG children | the act's box |
| the frost | ≤ 2 (a drip, a breath) | static paths, generated once per stage and per fit |
| the snowman | ≤ 3 (the scarf ends, a puff, a tap) | a 100 × 140 svg |

That is the leaves' windy budget, which already ships, plus less than a November act.

The squall replaces the visitor (it holds the water): three layers moving on `transform` only, the
fog's cost. The frost and the dune cap are static paths, generated once per stage and painted once.
No filters, no blur, no `box-shadow` animations.

If 4× CPU throttling shows more than 4 ms of main-thread work per frame with ten flakes and the seal,
drop the flakes' tilt first and their sway second. The fall and the spin are the snow; the rest is
finish.

---

## B. The motions, piece by piece

### B1. Snowfall (`Snow`, a sibling of `Leaves`)

**Markup per flake (built in JS, like `.nvLeaf`).** It is four nested wrappers, because four motions
meet on a flake:

```
.wnFlake  (fall: transform)
  > .wnSway  (drift)
    > .wnSpin  (rotate)
      > .wnTilt  (rotateX: crystals only)
        > svg  (0 0 40 40)
```

**Why it differs from a leaf.** Snow reaches its terminal speed within a centimeter, so the fall is
**linear**. The leaves' `cubic-bezier(.32,.12,.7,.96)` was a leaf starting from rest. Snow is also
slower (about 1 m/s against a leaf's 1–2) and does not pendulum: it drifts and turns. A six-fold
crystal turning 60° looks the same, so the spin reads as a shimmer, not a rotation. That is why it
can run continuously without looking mechanical.

| motion | value | notes |
|---|---|---|
| fall, crystal | 20–28 s, top (−size − 10) → waterline (`innerHeight − 20 − size/2`) | linear |
| fall, fleck | 16–22 s | linear |
| fall, windy | duration × .7; x ends 80–160 px left of the start | clamped so the box stays in its outer column (the left column may carry a flake off the edge, which is fine) |
| sway (`.wnSway`) | `translateX(±a)`, a = 6–14 px, 3.6–5.4 s | `cubic-bezier(.37,0,.63,1)` (the sea's `--sine`), alternate, infinite, delay −rand·3 s |
| spin (`.wnSpin`) | `rotate(r0) → rotate(r0 ± 360°)`, 14–22 s (windy × .62) | linear, infinite; direction random |
| tilt (`.wnTilt`), half the crystals | `rotateX(0) → rotateX(40°)`, 5–7 s | ease-in-out, alternate; never past 40°: a lacy flake edge-on is nothing (the leaves' ±62° rule, tighter) |
| landing on the water | `scale(1) → scale(.55)`, `opacity 1 → 0`, 900 ms, `cubic-bezier(.4,0,1,1)` | plus a 14 × 4 white ring at the touch point on the sea's `seaRing` keyframes (1.3 s). Snow melts; it doesn't float. |
| tap | the leaves' `fling()`: out past the nearer edge, 1.1 s, `cubic-bezier(.2,.6,.4,1)`, rotation ±870° (a leaf's is ±620°), the tilt's playbackRate × 4 | |

**The rate.** This is `Leaves.step`'s skeleton:

- The first spawn comes 3–7 s after the board is up.
- After that, `next = now + (10 s + rand · 15 s) · m`.
- A second spawn follows 1.5–4.5 s later, 25% of the time.
- Each spawn is a crystal (60%) or 2–3 flecks (40%).
- The cap is 6 on the board, or 10 when windy or snowing.

The multiplier `m`:

| condition | m |
|---|---|
| December's first week (n ≥ 10), Feb 22–25 | 2 (half as often) |
| ordinary | 1 |
| windy, or a snowfall period | .5 (the leaves' doubling) |
| windy and snowing | .33 |
| during the squall (6–34 s of its clock) | .25 |
| the last weekday of February → Feb 28 | no spawns |

**"The first snowflake".** On December 1, the day's first spawn is forced: the fern crystal at 62 px,
a 28 s fall, the right column, x at 92%.

**The stage rule** is the leaves'. A `deckhand:stage` start clears the moving flakes (WAAPI keeps
running under `display:none`, so clearing beats freezing). No flake spawns while staged. A resize
clears them all.

**Reduced motion.** `rest()` lays three crystals still on the sand at the right edge, at 85.5%, 90.5%
and 95.2% of the width, rotated −18°, 22° and −6° (the leaves' numbers), on the snowman's patch once
he exists. Taps do nothing.

### B2. The frost: the freeze, the thaw, drips and a breath

**Markup ask.** In `svg#wnFrost.wnFrost`, after `#nvBranch` in the clock card: positioned at the card's
top-right, sized to the fitted envelope (design C1), `z-index:4` like the web, under the handle band
while editing. The pieces are:

- `g.wnFrostStage`: the generated frost for the stage (ferns, rime, the haze's four layers),
  regenerated at the day's first tick and on every re-fit, crossfaded;
- `g.wnIcicles`;
- `path.wnLip`;
- `ellipse.wnDrip` at the longest icicle's tip, with `transform-box:view-box` and its origin at the
  tip;
- `g.wnBreath`: a disc and a ring, positioned at the tap;
- `g.wnSift`: three dots at the lip.

There is a fat transparent hit path over the frost and the icicles, like `.nvBranchHit`.

**The drip** (3.3 s, one icicle, from `corner.times(date)`). It is seeded like `branch.times`:

- 2–4 an hour, 7:00–4:59, from December through Feb 14;
- 10–14 an hour from Feb 15;
- the slots are pure in the date.

| t | the eye sees | why |
|---|---|---|
| 0–2.4 | a drop swells at the tip | the anticipation is the whole drip; ease-out, so it slows as it fills |
| 2.4–3.0 | it hangs, stretching a little | the pause before gravity |
| 3.0–3.24 | it falls 40 units, accelerating, and stretches to 1.4 × its height | `cubic-bezier(.55,0,1,.45)`: a parabola, not an ease |
| 3.3 | gone | it lands out of the corner box, unseen |

```css
.wnDrip{transform-box:view-box; transform-origin:var(--tx) var(--ty); opacity:0;}
body.waveMotion .wnFrost .wnDrip.go{animation:wnDrip 3.3s linear both;}
@keyframes wnDrip{0%{transform:translateY(0) scale(0); opacity:1; animation-timing-function:cubic-bezier(.2,.7,.4,1);}
  72.7%{transform:translateY(0) scale(1); animation-timing-function:ease-in-out;}                        /* 2.4: full */
  90.9%{transform:translateY(0) scale(1,1.08); animation-timing-function:cubic-bezier(.55,0,1,.45);}    /* 3.0: lets go */
  98.2%{transform:translateY(40px) scale(.8,1.4); opacity:1;}                                         /* 3.24 */
  100%{transform:translateY(44px) scale(.6,1.2); opacity:0;}}
```

**The breath (a tap).** The disc and ring sit at the tap point (in view-box units, from the pointer).
Then:

| t | the eye sees | why |
|---|---|---|
| 0–.28 | a clear spot opens, about 50 px across, its pale ring spreading to the edge | a breath on glass is fast |
| .2 / .6 | the longest icicle drips twice | the warmth reaches the ice |
| .28–6.3 | the spot holds | the room sees what happened |
| 6.3–51.3 | the frost grows back: the disc thins and its ring closes in | slow, so a class that tapped it at the bell still sees the mark at the warm-up's end |

```css
.wnBreath{transform-box:fill-box; transform-origin:50% 50%; opacity:0;}
body.waveMotion .wnBreath.go{animation:wnBreath 51.3s linear both;}
@keyframes wnBreath{0%{opacity:0; transform:scale(.4); animation-timing-function:cubic-bezier(.2,.7,.3,1);}
  .55%{opacity:1; transform:scale(1); animation-timing-function:linear;}
  12.3%{opacity:1; transform:scale(1); animation-timing-function:cubic-bezier(.4,0,.6,1);}
  100%{opacity:0; transform:scale(.3);}}
```

Under reduced motion, the tap sets `.on` (opacity 1, no animation) and a timer removes it 45 s later.

**The sift (windy).** These are `corner.times(date)`'s `windy:true` slots, two an hour, kept only when
`body[data-sea=windy]`. A puff of three white dots leaves the lip leftward: `translate(−14, −2)` and
fade, 1.2 s, `cubic-bezier(.2,.6,.4,1)`. At .3 s, `Snow.from(x, y)` spawns a flake at the lip, held to
the right column (the branch's `Leaves.from` mechanism).

**A stage change** (the day's first tick): the new frost group fades in over 4 s while the old one
fades out. The icicles' lengths swap with it. That is the branch's 4 s regrow. The stages run F1
(Dec 1) to the peak (Jan 11–29) and back down to T3 (Feb 22–28), each a size `s` of the fitted
envelope (design C1). The freeze and the thaw happen between days, never in front of a class.

### B3. The snowman

**Markup ask.** Nest so every motion has its own element:

```
#wnSnowman  (fixed, right 4vw, bottom 34px, z 2, width --wnSmW)
  > svg 0 0 100 140
    > .smGround  (patch, shadow, prints, puddle)
    > .smBody
      > .smBase
      > .smUpper  (thaw transforms: attributes per stage, never animated)
        > .smArms
        > .smMid
        > .smScarf  (> .smEnds: the two ends, origin at the knot 39.6,52.6)
        > .smHead  (origin 51,50: the neck)
          > .smFace
          > .smNose  (origin 51.6,38)
          > .smHatG  (> .smFresh, .smPuff)
        > .wnVisit  (the visiting gull: > .vgFly / .vgPerch)
```

The thaw stages put **attributes** on `.smUpper` and the head (the proof sheet's transforms). The
animations live on the inner groups, so a tap never overwrites a stage's lean (October's P2/P3 lesson).

**Idle.** A snowman does not move. What moves is cloth and snow:

```css
.smEnds{transform-box:view-box; transform-origin:39.6px 52.6px;}
body.waveMotion .smEnds{animation:smHang calc(var(--flutT) * 7) var(--sine) infinite alternate;}            /* calm/breezy: a slow ±2° drift */
body.waveMotion[data-sea="windy"] .smEnds{animation:smStream calc(var(--flutT) * 1.6) var(--sine) infinite alternate;}
@keyframes smHang{from{transform:rotate(-1deg);} to{transform:rotate(2.5deg);}}
@keyframes smStream{from{transform:rotate(14deg) skewY(-3deg);} to{transform:rotate(21deg) skewY(2deg);}}  /* streaming left, the waves' wind */
```

Knit is heavy, so the cloth runs on `--flutT × 1.6`, slower than the pennant. Positive rotation swings
the hanging ends to the left (the wind's side).

On a windy day, a puff leaves the hat's brim every 10.4 s: `.smPuff` (three dots) `translate(−8, −5)`
and fade over .7 s, at 0–7% of a 10.4 s loop.

On a snowfall period, `.smFresh` (the hat's cap and the sticks' white tops) takes
`opacity: var(--wnFresh)`. Season steps `--wnFresh` once a minute to `min(1, minutes into the period
/ 20)` and resets it at the bell. There is no animation: a one-minute step on a 4 px cap is invisible,
and the build shows from one glance to the next.

**The tap: the head slips** (900 ms on `.smHead`):

| t | the eye sees | why |
|---|---|---|
| 0–.14 | the head slides 7° on the middle ball | the slip starts slow and gives way: ease-in |
| .12 | a puff of snow leaves the brim | the jolt shakes it loose (secondary action) |
| .14–.26 | it overshoots to 9.5° | the head is heavy |
| .26–.9 | it settles crooked at 6°, two damped swings | it stays crooked: the change is the joke |
| (next tap) | the same timing back to 0°, overshooting to −2° | a tap fixes what a tap broke |

```css
.smHead{transform-box:view-box; transform-origin:51px 50px;}
.smHead.crooked{rotate:6deg;}
body.waveMotion .smHead.slip{animation:smSlip .9s linear both;}
body.waveMotion .smHead.right{animation:smRight .9s linear both;}
@keyframes smSlip{0%{rotate:0deg; animation-timing-function:cubic-bezier(.5,0,.9,.5);}
  15.5%{rotate:7deg; animation-timing-function:cubic-bezier(.2,.6,.4,1);} 29%{rotate:9.5deg; animation-timing-function:ease-in-out;}
  55%{rotate:5.4deg; animation-timing-function:ease-in-out;} 78%{rotate:6.4deg; animation-timing-function:ease-in-out;} 100%{rotate:6deg;}}
@keyframes smRight{0%{rotate:6deg; animation-timing-function:cubic-bezier(.5,0,.9,.5);}
  20%{rotate:0deg; animation-timing-function:cubic-bezier(.2,.6,.4,1);} 34%{rotate:-2deg; animation-timing-function:ease-in-out;}
  62%{rotate:.6deg; animation-timing-function:ease-in-out;} 100%{rotate:0deg;}}
.smNose{transform-box:view-box; transform-origin:51.6px 38px;}
body.waveMotion .smHead.slip .smNose, body.waveMotion .smHead.right .smNose{animation:smNose .7s linear .1s both;}
@keyframes smNose{0%{transform:rotate(0);} 20%{transform:rotate(-4deg);} 45%{transform:rotate(3deg);} 70%{transform:rotate(-1.5deg);} 100%{transform:rotate(0);}}
```

`rotate` (individual) on `.smHead` and `transform` on `.smNose` are on different elements, so both
paint. In the thaw (M1/M2) a tap releases two drops from the carrot's tip instead (B2's drip
keyframes on `.smDrop`). In M3 a tap on the puddle sends one ring. Under reduced motion the tap
toggles `.crooked`.

**The thaw's drips (M1/M2).** One drop every 20–40 s from the carrot's tip and the right stick's end,
on a 31 s loop (the drip keyframes at 0–10.6%), the two loops offset by 13 s. The stage changes
between days with a 4 s crossfade at the day's first tick. **The melt is never animated in front of a
class.**

**The visit** (a beach act, `dur` 240 500). It starts with `Sea.gullLeave()`, so the resident lifts
off the masthead on its own keyframes, and its slot in the director is its own (B11).

| t | the eye sees | why |
|---|---|---|
| 0–2.5 | the resident gull leaves the boat | the gull is going somewhere |
| 2.5–4.0 | a gull glides in from the upper left (140 px out, 60 up) on a descending arc, wings set | a glide is a pause in the air: no flapping |
| 4.0–4.4 | it lands on the pom: wings up, legs down, a 2-unit settle bob | the landing is the speed change |
| 4.4–236 | it sits; its head turns (the perch's `scaleX(−1)` flip, 60 ms) at 38, 81, 140 and 197 s, and at 110 s it looks down at the snowman's face (a 10° nod, held 3 s) | three to four minutes, like a perch on the masthead |
| 235.5 | `play("gull")` is queued (the trawler's `defer:gullBack`) | |
| 236–238 | it takes off left, flapping, climbing out of the frame toward the boat, as the resident lands on the masthead | one gull, two places |

On the last school day before break the visit is forced into period 1, 60 s after the greeting. It is
the reveal.

### B4. The countdown string, the boat and the gull

**The countdown string** (on the beach, `#wnLights`, design C3b). Each lit bulb is `g.wnLit` (its halo,
its glass and its core together), so one animation per bulb covers all three:

```css
body.waveMotion .wnLit{animation:wnBulb 3.7s var(--sine) infinite alternate;}
.wnLit:nth-child(2){animation-duration:2.9s;} .wnLit:nth-child(3){animation-duration:4.1s;} .wnLit:nth-child(4){animation-duration:3.4s;}
.wnLit:nth-child(5){animation-duration:4.6s;} .wnLit:nth-child(7){animation-duration:3.1s;} .wnLit:nth-child(8){animation-duration:4.3s;} .wnLit:nth-child(9){animation-duration:3.9s;}
@keyframes wnBulb{from{opacity:.72;} to{opacity:1;}}
body.waveMotion .wnLit:nth-child(6){animation:wnLoose 60s linear infinite;}   /* the loose one */
@keyframes wnLoose{0%{opacity:1;} .13%{opacity:.15;} .27%{opacity:1;} .4%{opacity:.25;} .53%{opacity:1;} 100%{opacity:1;}}
```

The periods are unequal, so the string never breathes in unison. That is October's candle lesson: a
string pulsing together says "screen". The loose bulb dips three times in 320 ms once a minute: a
character detail. The count of lit bulbs changes at the day's first tick, with no animation. On a windy
day each bulb swings ±4° about its socket on the chop's clock (`calc(var(--T2) / 2)`, alternate, a
delay per bulb). A tap on a bulb dips it twice in 240 ms and brings it back. Under reduced motion they
are lit and still.

**Snow on the deck.** `.wnDeck{opacity:0; transition:opacity 600s linear}`; `body.wnSnowing .wnDeck
{opacity:1}`. Ten minutes in, the deck is white.

**The gull's hat.** When `wnSnowing` lands while the gull is perched, the hat drops onto its head:
`translateY(−3 units) scaleY(.8) → 0 / 1` in 300 ms, `cubic-bezier(.2,.7,.3,1)`. If the gull is away,
it is simply wearing the hat when it lands.

**The squall reaction** (`#boat.squall`, on the squall's 40 s clock):

- the rig heels +5° from 24% to 74%, with 1.2 s ramps (`rotate` on `.btRig`, adding to the idle
  pitch as `.struck` does);
- the gull hunkers over the same window: `.glPerch` `translate(0, 1) scaleY(.9)`;
- `.wnSailSnow` (white edges on the two sails' tops) fades in from 30% to 45%.

Season then sets `body.wnSailSnow` so the sail snow stays until the next bell.

**The lean.** For `boat:"seal"` and `boat:"narwhal"`, the gull leans to look, using November's
`nvGullDucks` keyframes retimed to the act (the seal at 3.0–7.0 s, the narwhal at 14.2–15.4 s).

### B5. Floes (44 s, `dur` 44 500)

**Markup.** `#sea-floes.seaThing` (far or near). Each of `.fl1`, `.fl2` and `.fl3` is:

```
.flDrift  (translateX)
  > .flBob  (thingHeave, translate)
    > .flRock  (rotate, origin at its waterline center)
      > svg  (0 0 40 14, its own front water band)
```

The floes enter from behind the dock (left −60 px; the dock covers the bottom left).

| t | the eye sees | why |
|---|---|---|
| 0–6 | three pancakes drift out from behind the dock | flotsam drifts right |
| all | each bobs on the swell's clock (phases 0, −1.4 s, −3.1 s) and rocks ±2° on the chop's | three floes, three rhythms |
| (calm/breezy) | the front one is fastest: they spread apart as they go | a raft breaking up |
| (windy) 27.0 | the small one, fastest in the wind, catches the middle one: a knock | the speed change is the event |
| (windy) 27.0–28.4 | the middle one jolts 5 px ahead; both rock 6° → −3° → 1°; three white sparks fly from the contact | ice is hard: a knock, not a squash |

```css
#sea-floes{bottom:4px; left:-60px; width:120px;}  #sea-floes.far{bottom:15px;}
body.waveMotion #sea-floes.go .fl1{animation:fl1 44s linear both;}
body.waveMotion #sea-floes.go .fl2{animation:fl2 44s linear both;}
body.waveMotion #sea-floes.go .fl3{animation:fl3 44s linear both;}
@keyframes fl1{from{transform:translateX(0) scale(var(--ls,1));} to{transform:translateX(calc(100vw + 180px)) scale(var(--ls,1));}}
@keyframes fl2{from{transform:translateX(-30px) scale(var(--ls,1));} to{transform:translateX(calc(100vw + 60px)) scale(var(--ls,1));}}
@keyframes fl3{from{transform:translateX(-60px) scale(var(--ls,1));} to{transform:translateX(100vw) scale(var(--ls,1));}}
body[data-sea="windy"].waveMotion #sea-floes.go .fl3{animation-name:fl3W;}
@keyframes fl3W{0%{transform:translateX(-60px) scale(var(--ls,1)); animation-timing-function:linear;}
  61.4%{transform:translateX(calc(61.4vw - 20px)) scale(var(--ls,1)); animation-timing-function:cubic-bezier(.2,.6,.4,1);}   /* 27.0: the knock */
  64.5%{transform:translateX(calc(62vw - 24px)) scale(var(--ls,1)); animation-timing-function:linear;}
  100%{transform:translateX(calc(100vw + 40px)) scale(var(--ls,1));}}
```

`fl2`'s windy variant takes the 5 px jolt at the same 61.4%. The exact `vw` at the knock is set so the
two boxes touch. It is measured in the aquarium, not trusted from arithmetic.

### B6. The seal (48 s, `dur` 48 500): winter's Wilson

**Markup.** `#sea-seal.seaThing` (near; anchored at Wilson's spot,
`left: calc(max(42vw, 300px) + 34px)`, bottom 6 px, width 52 px). It holds:

- `.slHead`: the bottling head, its own svg and ring, anchored beside the boat, with `.slTilt`
  (rotate) > `.slTurn` (scaleX) inside it.
- `.slDrift` (the floe's translateX)
  > `.slBob` (thingHeave)
  > `.slDip` (the weight: translateY)
  > `.slTip` (windy tip: rotate, origin at the floe's waterline center)
  > svg: the floe, its water band, and `.slOff` (windy slide)
    > `.slHaul` (translate/scale/opacity)
      > `.slRear` + `.slFront` (rotate about the belly, 30,16.6).
- `.slHead2`: the windy second head, inside `.slDrift`.

| t | the eye sees | why |
|---|---|---|
| 0–1.5 | a ring and bubbles beside the boat; out of the left, a floe drifts from behind the dock | "something's under there" |
| 1.5–2.3 | the head comes up, overshoots 2 units, settles | weight |
| 3.0–3.5 | it tilts its head 14° toward the boat and holds it; the gull leans over | the curious tilt is the pause the room reads |
| 7.0–7.6 | it straightens and turns to the floe (a 60 ms flip) | it noticed the ice |
| 11.4–12.0 | it ducks under: a ring | anticipation of the haul |
| 13.2–13.6 | the body rises from the water at the floe's left edge, up and over | the effort |
| 13.6–14.4 | it flops on: a squash; the floe dips 3 px and rocks −7° → 4° → −2° → 0 over 1.6 s | the floe answering is the weight |
| 14.4–24 | it rides right, lying, rocking with the floe | the base |
| 24.0–24.8 | **the banana**: head up 15°, tail up 17°, together | a silhouette change |
| 24.8–27.6 | held | the pause |
| 27.6–28.6 | back down | |
| (calm/breezy) 38.0–40.6 | it lifts its head once and lies back | a sign of life on the way out |
| (windy) 30.0–31.0 | a swell tips the floe 18°, the left side down | a slow change: the eye asks why |
| (windy) 31.0–32.0 | the seal slides off the low side head-first, and a splash ring | |
| (windy) 32.0–33.4 | the floe rocks back level, empty | |
| (windy) 34.0–37.0 | its head comes up behind the floe, watches it go, tilts once, dives at 36.6 | it lost its ride: the sad-funny beat |
| 44–48 | out at the right edge | |

```css
#sea-seal{bottom:6px; left:calc(max(42vw, 300px) + 34px); width:52px;}
body.waveMotion #sea-seal.go .slDrift{animation:slDrift 48s linear both, thingHeave calc(var(--T1) / 2) var(--sine) infinite alternate;}
@keyframes slDrift{from{transform:translateX(-340px);} to{transform:translateX(calc(58vw + 30px));}}   /* out from behind the dock, off the right edge at 47.5 s */
body.waveMotion #sea-seal.go .slHead{animation:slHead 48s linear both;}
@keyframes slHead{0%,3.1%{transform:translateY(16px); animation-timing-function:cubic-bezier(.2,.6,.4,1);}
  4.4%{transform:translateY(-2px); animation-timing-function:ease-in-out;} 4.8%,23.7%{transform:translateY(0); animation-timing-function:cubic-bezier(.5,0,.9,.5);}
  25%,100%{transform:translateY(16px);}}
body.waveMotion #sea-seal.go .slTilt{animation:slTilt 48s linear both;}
@keyframes slTilt{0%,6.25%{rotate:0deg; animation-timing-function:cubic-bezier(.3,0,.4,1);} 7.3%,14.6%{rotate:-14deg; animation-timing-function:ease-in-out;} 15.8%,100%{rotate:0deg;}}
body.waveMotion #sea-seal.go .slTurn{animation:slTurn 48s linear both;}
@keyframes slTurn{0%,15.8%{transform:scaleX(1);} 15.9%,100%{transform:scaleX(-1);}}
body.waveMotion #sea-seal.go .slHaul{animation:slHaul 48s linear both;}
@keyframes slHaul{0%,27.5%{transform:translateY(12px) scaleY(1); opacity:0; animation-timing-function:cubic-bezier(.3,0,.6,1);}
  27.6%{opacity:1;} 28.3%{transform:translateY(-3px) scaleY(1.04); opacity:1; animation-timing-function:cubic-bezier(.5,0,1,.6);}
  29.2%{transform:translateY(0) scaleY(.88); animation-timing-function:cubic-bezier(.2,.7,.4,1);}
  30%{transform:translateY(0) scaleY(1.04); animation-timing-function:ease-in-out;} 30.8%,100%{transform:translateY(0) scaleY(1); opacity:1;}}
body.waveMotion #sea-seal.go .slDip{animation:slDip 48s linear both;}
@keyframes slDip{0%,29.2%{transform:translateY(0) rotate(0); animation-timing-function:cubic-bezier(.2,.7,.4,1);} 30%{transform:translateY(3px) rotate(-7deg); animation-timing-function:ease-in-out;}
  31.2%{transform:translateY(1px) rotate(4deg); animation-timing-function:ease-in-out;} 32.5%{transform:translateY(0) rotate(-2deg); animation-timing-function:ease-in-out;} 33.3%,100%{transform:translateY(0) rotate(0);}}
.slFront, .slRear{transform-box:view-box; transform-origin:30px 16.6px;}
body.waveMotion #sea-seal.go .slFront{animation:slBanF 48s linear both;}
body.waveMotion #sea-seal.go .slRear{animation:slBanR 48s linear both;}
@keyframes slBanF{0%,50%{rotate:0deg; animation-timing-function:cubic-bezier(.2,.6,.4,1);} 51.7%,57.5%{rotate:-15deg; animation-timing-function:ease-in-out;} 59.6%,100%{rotate:0deg;}}
@keyframes slBanR{0%,50%{rotate:0deg; animation-timing-function:cubic-bezier(.2,.6,.4,1);} 51.7%,57.5%{rotate:17deg; animation-timing-function:ease-in-out;} 59.6%,100%{rotate:0deg;}}
.slTip{transform-box:view-box; transform-origin:32px 24px;}
body[data-sea="windy"].waveMotion #sea-seal.go .slTip{animation:slTipW 48s linear both;}
@keyframes slTipW{0%,62.5%{rotate:0deg; animation-timing-function:cubic-bezier(.5,0,.9,.6);} 64.6%{rotate:-18deg; animation-timing-function:cubic-bezier(.2,.6,.4,1);}
  66.7%{rotate:-16deg; animation-timing-function:cubic-bezier(.3,0,.5,1);} 69.6%{rotate:5deg; animation-timing-function:ease-in-out;} 72%{rotate:-2deg; animation-timing-function:ease-in-out;} 74%,100%{rotate:0deg;}}
body[data-sea="windy"].waveMotion #sea-seal.go .slOff{animation:slOffW 48s linear both;}
@keyframes slOffW{0%,64.6%{transform:translate(0,0) rotate(0); opacity:1; animation-timing-function:cubic-bezier(.55,0,1,.45);}
  66.7%{transform:translate(-12px,8px) rotate(-24deg); opacity:1;} 66.8%,100%{opacity:0;}}
```

`.slDip` carries `transform` while its parent `.slBob` carries `translate` (thingHeave), so the two
motions are on two elements. The seal's banana halves use `rotate` and `.slHaul` uses `transform`,
again on separate elements. The ring at 0 s plays at 0–1.5 s (not spent off-screen: the anchor is
beside the boat). The splash ring at 32.0 s plays on the windy variant only.

### B7. The narwhal (26 s, `dur` 26 500)

**Markup.** `#sea-narwhal.seaThing.far` (box 120 × 36 units at `width:96px`, `--ls:.62`,
`bottom:15px; left:100vw`) holds:

```
.nwGlide  (translateX)
  > .nwRise  (translateY)
    > .nwRoll  (rotate: the dive)
      > svg
        > g[clip-path: its own waterline at y 28.4]
          > .nwTuskRig  (rotate, origin 33,24.4)
          > .nwBody
          > .nwFluke
        > .nwPuff  (outside the clip, origin at the blowhole 45,17)
```

| t | the eye sees | why |
|---|---|---|
| 0–3.4 | the tusk glides in alone, the body held 9 units under | "what's that stick?": the silhouette asks a question |
| 3.4–4.2 | the head and back rise, overshooting 1 unit | the answer |
| 4.6–5.1 | a white breath bursts from the blowhole | cold air: you see its breath |
| 5.1–6.8 | the breath hangs, thins, and drifts 6 units left | the linger is the winter |
| 4.2–14.2 | it swims left on the surface, the back on the swell | the base |
| 14.2–14.7 | behind the boat it slows, and the tusk lifts 16° | the speed change and the salute are one beat |
| 14.7–15.1 | held; the gull leans to look | the pause |
| 15.1–15.4 | the tusk dips back with a 3° overshoot | |
| 15.8–17.6 | a second breath | |
| 18.4–19.6 | it rolls forward and the head goes under | head-first, like the serpent |
| 19.6–20.0 | the flukes lift late, hang | the whale's rule: the fluke is LATE |
| 20.0–20.8 | they slip under; a ring at 21.0 | |
| 23.4–23.9 | far left, the tusk tip breaks the water once | a last glint |

```css
#sea-narwhal{bottom:15px; left:100vw; width:96px;}
body.waveMotion #sea-narwhal.go .nwGlide{animation:nwGlide 26s linear both;}
@keyframes nwGlide{0%{transform:translateX(0) scale(var(--ls,1)); animation-timing-function:linear;}
  54.6%{transform:translateX(-58vw) scale(var(--ls,1)); animation-timing-function:cubic-bezier(.2,.6,.4,1);}      /* 14.2: behind the boat */
  59.2%{transform:translateX(calc(-58vw - 18px)) scale(var(--ls,1)); animation-timing-function:cubic-bezier(.5,0,.8,.5);}   /* 15.4: the pause */
  80.8%{transform:translateX(-78vw) scale(var(--ls,1)); animation-timing-function:linear;}
  100%{transform:translateX(calc(-100vw - 150px)) scale(var(--ls,1));}}
body.waveMotion #sea-narwhal.go .nwRise{animation:nwRise 26s linear both;}
@keyframes nwRise{0%,13.1%{transform:translateY(9px); animation-timing-function:cubic-bezier(.2,.7,.3,1);} 15.4%{transform:translateY(-1px); animation-timing-function:ease-in-out;}
  16.2%,70.8%{transform:translateY(0); animation-timing-function:cubic-bezier(.5,0,.9,.5);} 75.4%,88.5%{transform:translateY(12px); animation-timing-function:cubic-bezier(.2,.6,.4,1);}
  90%{transform:translateY(4px); animation-timing-function:cubic-bezier(.5,0,.9,.5);} 92%,100%{transform:translateY(12px);}}   /* 23.4: the glint */
.nwTuskRig{transform-box:view-box; transform-origin:33px 24.4px;}
body.waveMotion #sea-narwhal.go .nwTuskRig{animation:nwSalute 26s linear both;}
@keyframes nwSalute{0%,54.6%{rotate:0deg; animation-timing-function:cubic-bezier(.2,.7,.3,1);} 56.5%,58.1%{rotate:16deg; animation-timing-function:cubic-bezier(.5,0,.8,.5);}
  59.2%{rotate:-3deg; animation-timing-function:ease-in-out;} 60.4%,100%{rotate:0deg;}}
.nwPuff{transform-box:view-box; transform-origin:45px 17px; opacity:0;}
body.waveMotion #sea-narwhal.go .nwPuff{animation:nwPuff 26s linear both;}
@keyframes nwPuff{0%,17.7%{opacity:0; transform:translate(0,0) scale(.3); animation-timing-function:cubic-bezier(.2,.7,.3,1);}
  19.6%{opacity:1; transform:translate(0,-1px) scale(1); animation-timing-function:linear;} 26.2%{opacity:0; transform:translate(-6px,-3px) scale(1.25);}
  60.8%{opacity:0; transform:translate(0,0) scale(.3); animation-timing-function:cubic-bezier(.2,.7,.3,1);}
  62.7%{opacity:1; transform:translate(0,-1px) scale(1); animation-timing-function:linear;} 67.7%,100%{opacity:0; transform:translate(-6px,-3px) scale(1.25);}}
```

In windy weather the breath shears: `nwPuffW` with the fade at 23% (a third shorter) and the drift
`translate(−12px, −2px)`. The roll and the fluke follow the whale's `whRoll` / fluke shape, scaled to
this box.

### B8. Tusking (30 s, `dur` 30 500): the rare

**Markup.** Two narwhals, `.tkA` (head left) and `.tkB` (mirrored, head right), each with
`.nwGlide` > `.nwRise` > `.tkLift` (rotate, origin at the head, 33,27). One clip at the shared
waterline, outside both, so the raised heads' bodies go under the water and not out of a tilted box.
That was the proof sheet's first mistake, fixed there.

| t | the eye sees | why |
|---|---|---|
| 0–8.6 | A swims in from the right, tusk first (B7's entrance) | it reads as the narwhal |
| 8.6–9.4 | a ring ahead of it, and B surfaces, facing it | a second one: something's going to happen |
| 9.4–12.0 | both slow and stop 40 px apart | the speed change into a pause |
| 12.0–12.8 | both heads rise 28°, overshooting to 31°; **the tusks cross in an X** | the picture |
| 12.8–16.4 | held; the tusks tap three times (±3° counter-rotations, 120 ms each, at 13.6, 14.6 and 15.6) | the hold is what the room sees; the taps say it's deliberate |
| 16.4–17.2 | heads down (ease-in) | |
| 17.6 / 18.0 | both dive, two rings | |
| 21.0–27.0 | A comes up once farther left and swims off | the story ends with a direction |
| 30 | gone | |

It is not loud: the gull stays and watches (`boat:"narwhal"`, the lean at 12.0–16.4).

### B9. The squall (40 s, `dur` 40 500)

**Markup.** `#sea-squall.seaThing` (the fog's z: `z-index:1`, over the boat and the front waves,
under the sand pieces and the dock). It holds `.sqFront` (translateX), which carries:

- `svg.sqHaze`: 160vw wide, height 108 px (70 in Steward). A pale-turquoise body with a lumpy top and
  20vw feathered leading and trailing edges (gradients baked into the path's fill, no mask animation).
- `svg.sqStreaks1` and `svg.sqStreaks2`: pattern tiles of slanted white streaks, 80 × 48 and 60 × 36.

| t | the eye sees | why |
|---|---|---|
| 0–9.7 | a pale wall of driven snow comes in from the right over the water | weather approaching is a slow reveal |
| 9.7 | its edge reaches the boat; the rig heels 5° more, the gull hunkers | the boat feels it |
| 9.7–29.7 | the boat in the squall; snow collects on the sails' top edges; the columns snow their hardest | the event |
| 29.7 | the back edge passes the boat; the heel eases; the snow on the sails stays | the aftermath stays: the period remembers |
| 29.7–40 | it goes out behind the dock | |

```css
#sea-squall{bottom:0; left:0; width:160vw; height:108px; z-index:1;}
body.waveMotion #sea-squall.go .sqFront{animation:sqCross 40s linear both;}
@keyframes sqCross{from{transform:translateX(100vw);} to{transform:translateX(-160vw);}}   /* 6.5vw/s: edge at the boat (42vw) at 9.7 s */
body.waveMotion #sea-squall.go .sqStreaks1{animation:sqFall1 .9s linear infinite;}
body.waveMotion #sea-squall.go .sqStreaks2{animation:sqFall2 1.3s linear infinite;}   /* the far layer slower: parallax */
@keyframes sqFall1{from{transform:translate(0,0);} to{transform:translate(-80px,48px);}}   /* one tile: the loop is seamless */
@keyframes sqFall2{from{transform:translate(0,0);} to{transform:translate(-60px,36px);}}
body.waveMotion #boat.squall .btRig{animation:btSquall 40s linear both;}
@keyframes btSquall{0%,24.3%{rotate:0deg; animation-timing-function:ease-in-out;} 27.3%,71.3%{rotate:-5deg; animation-timing-function:ease-in-out;} 74.3%,100%{rotate:0deg;}}
```

The streak layers sit inside `.sqFront` but each carries its own `transform`, as nested elements.
The streak tiles are drawn once in each SVG as a `<pattern>`, so the paint is a pattern fill
translated by the compositor.

### B10. The serpent's scarf, and the whale's breath

**The scarf** (caper week). `g.wnSerpScarf` goes inside the head's group (`.ssSeg.g4 > .ssHump.h4`),
so it dives and rolls with the head and never needs its own clock. Its two ends are `.wnSsEnds`
(origin at the knot, 80,19.5, in the drawing's unmirrored units). They flutter on the serpent's own
wind:

```css
.wnSerpScarf{display:none;}  body.wnCaper .wnSerpScarf{display:inline;}
.wnSsEnds{transform-box:view-box; transform-origin:80px 19.5px;}
body.waveMotion.wnCaper #sea-serpent.go .wnSsEnds{animation:wnSsFlut calc(var(--flutT) * 1.2) var(--sine) infinite alternate;}
@keyframes wnSsFlut{from{transform:rotate(-4deg) skewX(2deg);} to{transform:rotate(6deg) skewX(-3deg);}}
```

The attack's head (`#sea-attack`) carries the same scarf. At its front-face moment (the head turns to
the room), the side scarf hides and a front scarf shows: a rust band with the knot under the jaw,
switched by the attack's existing face swap.

**The whale's breath.** Under `body.winter` the whale's puff and shot keyframes get a variant: ×1.5
the size, held 1.6× as long before they thin, and drifting 20 px left as they go. No new element, a
cold day.

### B11. Stage changes, everywhere

Every date-driven change happens at the day's first tick (or when the board opens), never mid-period:

- the frost stage, the icicle lengths, the dune cap's coverage;
- the snowman's stage;
- the bulbs' count;
- the lantern's step;
- the caper's scarf.

Each is a 4 s opacity crossfade between the old and new drawings (the branch's regrow). The morning's
first class sees the new world already standing. A changed world is a thing to notice. A changing one
would be a show.

---

## C. The director

### The `ACTS` rows

Each act also gets `phase: [...]`, the winter phases in which it may play. `winterPhase(dateStr)` is
pure. The phases are:

- `dec1`: Dec 1 → n ≥ 10
- `dec2`: n ≤ 9 → the last day
- `break`
- `back`: the first day back
- `jan`: → Feb 14
- `thaw`: Feb 15–25
- `last`: the last weekday of Feb → Feb 28

| act | tier | `dur` | lanes | flags | notes |
|---|---|---|---|---|---|
| `floes` | common | 44 500 | far, near | `season:"winter"`, `greeting:true`, phase dec2–thaw | The December greeting. In the thaw it plays with two floes, smaller (`.thaw` on the act). |
| `seal` | common | 48 500 | near | `season:"winter"`, `greeting:true`, `boat:"seal"`, phase back–jan, `incompatible:["attack","whale","scatter","squall"]` | Every period's greeting on the first day back. It may greet under the settle-in count: a 48 s drift, like the castaway. |
| `narwhal` | uncommon | 26 500 | far | `season:"winter"`, `boat:"narwhal"`, phase dec2–jan (× .5 in the thaw) | |
| `tusking` | rare | 30 500 | far | `season:"winter"`, `lastThird:true`, `notBefore:"01-11"`, phase jan, `boat:"narwhal"` | Rare by tier and by placement, like the ghost. |
| `squall` | uncommon | 40 500 | near | `season:"winter"`, `needs:{weather:"windy", snow:true}`, `middleThird:true`, `boat:"squall"`, phase back–jan, `incompatible:["attack","whale","pennant","seal","floes"]` | In a windy snowfall period it is drawn at × 3 its tier weight, once at most. |
| `visit` | uncommon | 240 500 | — | `season:"winter"`, `beach:true`, `gullBack:true`, `middleThird:true`, needs the snowman at S3 or caper | Its clock is `visit.times(date)`: about one school day in five, seeded; period 1 on the last day before break. `busy()` skips beach acts, so the water stays free. |

### The season's weight (`winterWeight(dateStr)`, pure)

| phase | dates (2026–27) | w | cap a period | greetings |
|---|---|---|---|---|
| `dec1` | Dec 1–4 | 0 | 0 | the everyday three; **the furniture is the announcement** (October's rule) |
| `dec2` | Dec 7–18 | 1 | 2 | + floes |
| `break` | Dec 19 – Jan 3 | free-time pool only (floes, narwhal; no rares, no squall, no visit) | — | — |
| `back` | Jan 4 | 1.2 | 2 | the seal in every period |
| `jan` | Jan 5 – Feb 14 | 1.2 | 2 | + seal, floes; caper week + the serpent at × 2 |
| `thaw` | Feb 15–25 | .6 | 1 | the everyday three |
| `last` | Feb 26–28 | 0 | 0 | the turtle in every period |

The weight multiplies into `w[k]` beside the tier and memory factors, so the same date and period
still give the same show. A test can ask `plan("2027-01-04", 2, 50, 1, null)` and expect a seal
greeting. The cap is applied after the draw by zeroing the season's weights, as October and November
do.

### Across a class period

The existing arc stands:

- a greeting at 45 s;
- hush through the first ten minutes;
- an act every 3–7 minutes;
- rares only in the last third;
- nothing in the last three minutes;
- commons only under a timer or the settle-in.

Winter adds five rules inside `plan()`, all pure:

1. **The snowfall draw.** After the weather, the same generator draws `snowing` at the phase's chance
   (design §C2), and the director sets `body.wnSnowing` with `data-sea` at the bell.
2. **The squall** only in a windy snowfall period, in the middle third, once.
3. **At most two winter acts a period** (one in the thaw).
4. **The turtle and the flying fish × .4** from `dec2` through `jan` ("gone south"). The turtle is
   × 1 again in the thaw and greets every period in `last`.
5. **The serpent × 2 in caper week**, and it joins that week's greeting pool. The attack still needs a
   serpent sighting first, so caper week is also the attack's best week. That is intended: the scarf
   is the joke the attack needs.

### Reactions between pieces

- The gull leans to look at the seal and at the narwhal's salute.
- It hunkers in the squall.
- It is the snowman's visitor (`gullBack`).
- It puts on its hat when it snows.
- The serpent wears the scarf.
- Snowfall builds snow on the snowman, the deck and (after a squall) the sails.

Nothing else reacts. The whale's breath is the cold, not a reaction. The dolphins, the school, the
buoy and the paper boat ignore winter entirely.

---

## D. Proof frames to grab before trusting any of it

Grab in the aquarium (`tools/aquarium.html`) at 1920 × 1080 and again at one third, with its board's
clock set to a winter date. Times are from `.go` (or the tap).

- **Snowfall.** A 30 s strip at 2 fps, breezy then windy:
  - the count is never over 6 / 10;
  - no flake box is ever between 18% and 82% of the width;
  - windy: every flake lands left of where it started.
  
  A landing at 0 / .3 / .6 / .9 s (the melt and the ring). A tap at 0 / .25 / .55 / 1.1 s.
- **The frost.**
  - A drip at 2.4 / 3.0 / 3.24 s: at 3.24 the drop is over 1.3× as tall as it is wide.
  - A breath at 0 / .28 / 6.3 / 30 / 51.3 s: whole frost again at the end.
  - A windy sift at .3 s: the spawned flake in the right column.
- **The snowman.**
  - A tap at 0 / .14 / .26 / .5 / .9 s: crooked at 6°, the shadow unmoved. The second tap rights him.
  - Windy: the scarf's ends left of the knot in every frame.
  - The visit at 2.5 / 3.2 / 4.0 / 4.4 and at 236.5, with the boat in frame: one gull leaving the
    snowman, the resident landing.
- **The seal.**
  - Calm: 1.6, 3.4 (the tilt), 11.6, 13.4 (the haul), 14.0 (the flop: the floe dipped), 25 (the
    banana).
  - Windy: 30.6, 31.6, 32.0 (the splash), 35 (the head behind the empty floe).
  - At one third, the banana must read as a different silhouette from the lying one.
- **The narwhal.**
  - 2.0 (the tusk alone, which must be findable at one third), 3.8, 5.4 (the breath).
  - 14.8 (the salute and the gull's lean).
  - 19.8 (the flukes hanging), 23.6 (the glint).
- **Tusking.** 12.8 (the X), 13.6 and 13.72 (a tap), 17.8.
- **The squall.** 5, 12 (the boat inside it, heeled, the gull hunkered), 25, 32 (snow on the sails),
  39.
- **The lights.** On the beach: a 10 s strip at 4 fps (the bulbs uncorrelated), bulb 6 at its minute,
  a windy swing, and the count against the date (Dec 7 → 0, Dec 9 → 2, Dec 18 → 9).
- **The caper.** The serpent at 3, 9 (the scarf going under with the head) and 18. The ends always
  trail behind the head.
- **Budget.** DevTools → Rendering → Paint flashing with ten flakes, the seal and the lights on.
  Only the flakes' layers, the seal's box and the boat may flash. The frost and the dune cap must not
  repaint, except one disc during a breath.

---

## What to carry into the code, in order

1. **Season:** `active()` → `"winter"`, the pure date helpers (`winterPhase`, `breakStart`,
   `schoolDaysLeft`, `caperWeek`, `lastFebWeekday`), and `apply()`'s classes and data attributes.
2. **The drawings**, from the proof sheet's functions:
   - `flake()` and `frost()`, which generate at build time (the frost fitted to the face);
   - `snowman()`, `floe()`, `sealOnFloe()`, `narwhal()` and the serpent's scarf, as static markup
     with the wrappers named above.
3. **`Snow`**, `Leaves`' sibling, with B1's numbers.
4. **The `Winter` sub-module** (the corner, the snowman, the visit clock), with B2 and B3.
5. **The beach string and the boat's additions** (B4).
6. **The `ACTS` rows and `plan()`'s winter rules** (C), then B5–B10.
7. **The frames in D**, before anyone trusts any of it.
