# Winter 2.1: the motion (Nov 14, 2026)

This is the motion spec for `winter-design.md` (2.1), written like `october-2.0-animation.md`. Each
motion is given in CSS keyframes or the Web Animations API, for a Chromebox driving a Promethean
panel. The drawings and their class names are in `winter-proofs.html`.

## What changed in 2.1

Croix on the 2.0 proofs: "Colored bulbs. I want better more realistic looking frost. Smaller
snowflakes. Occasional flurries. Have the ocean freeze and the coldest part of the year. The serpent
is still funky as hell not smooth. I want that thing to slither in and out of the water."

- **Snow** is now occasional flurries: a 3-flake cap, one to three flurries a week, 3–6 minutes each,
  with smaller flakes (B1).
- **The frost** is a needle generator painted into the same canvas (B2). The cost moved, and is
  measured.
- **The lights** are colored. There is still no motion (B3).
- **The manatee** leaves on Jan 8 and returns with its calf on Feb 1 (B6, B7).
- **The serpent and the attack** are rebuilt as one body driven by a traveling wave, for every season
  (B9).
- **The frozen sea** is new (B12).

## What changed in 2.0, and why

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

**The heaviest moment** is a flurry with the serpent on the water and a drip in the corner:

| what | animated things | layers |
|---|---|---|
| a flurry at its cap (3) | 3 WAAPI animations each (fall, sway, spin) = 9 | each flake its own ≤ 26 px layer (`will-change: transform`, as the leaves) |
| the boat | the existing heave, pitch and drift, plus the lantern | the boat's own |
| the serpent (or the manatee and calf) | one path rewritten per frame at 30 fps (B9), or ≤ 10 SVG children | the act's box |
| the frost | 0 to 2 (a drip, a breath) | **the frost itself is a still `<canvas>`**; the drip and the breath are their own small layers |
| the snowman | ≤ 2 (a tap, a visit) | a 120 × 160 svg |
| the lights | **0** | one still svg |

That is less than November's windy budget, which already ships: the leaves at their cap, the
branch's five swinging leaves and the scarecrow's sway.

**The frost's one real cost is its raster** (design C1, measured in proofs §4): 10–33 ms per stage in
Chromium for the frost's 2.0 drawing; 2.1's needle generator measures 1–43 ms, and 140–220 ms with 4× CPU throttling at the peak. It happens at a stage change:
- the day's first tick;
- a resize;
- a bell, **only if the face's boxes moved**.

It runs in an idle callback. `createImageBitmap(blob)` decodes off the main thread, and the old
bitmap stays up until the new one is ready, so a slow raster never shows as a blank corner or a
dropped frame at the bell.

**If 4× throttling shows more than 4 ms of main-thread work per frame** with a flurry and the serpent,
drop the serpent's loop to 24 fps first.

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

**The rate: occasional flurries** (design C2). `flurries.times(date)` is pure in the date. It
gives one to three flurry slots a week, each in one period, starting 10–35 minutes in, lasting 3–6
minutes.

| | value |
|---|---|
| outside a flurry | no spawns; flakes already falling finish their fall |
| in a flurry | the first spawn at once, then one every 30–50 s (a crystal 60%, a fleck pair 40%), 5–9 flakes in all |
| cap | 3 on the board |
| flake sizes | dendrite 20–26 px, stellar plate 18–22 px, flecks 4–5 px; the falls are B1's (crystals 20–28 s, flecks 16–22 s) |

A flurry that is still running at the bell stops spawning, and its flakes land.

**"The first snowflake."** On Nov 30's first period, the first spawn is forced: the dendrite at 56 px,
a 28 s fall, the right column at 92%.

**The stage rule** (the leaves'). A `deckhand:stage` start clears the moving flakes, and nothing
spawns while staged. A resize clears them all.

**Reduced motion.** Nothing falls. During a flurry, `rest()` lays two crystals still
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

**Colors** (design C4): red, amber, green, ice blue and yellow, repeating. Each lit bulb has its own color's halo (a radial gradient per color, five in all). A dark bulb is the same hue gone to smoke. The colors cost nothing: the string is one still SVG.

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

**The reverse countdown** (Croix's pick): from Jan 4, at each school day's first tick, the last lit bulb fades to dark over 1.5 s (Jan 4 → 13 lit … Jan 21 → 0). **The string comes down** on Jan 22: it is simply gone at the day's first tick, the morning the frost reaches its peak.

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

**During a flurry:** `.smFresh` (a white cap on the pail's base and on the driftwood's tops)
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
  `body[data-wn-snow=flurries] .wnDeck{opacity:1}` (and it stays until the bell).
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

**Fri Jan 8: it leaves.** The day's acts use the `leave` variant. As built in 7.65 (after the proofs): the act is the usual one up to the cruise; then it does not dive but keeps on to the **right**, out of the frame: `mnDriftL` runs to `translateX(calc(100vw - max(42vw, 300px) - 22px))` by 50 s at one speed (29 px/s at 1920), with breaths at 26 s and 40 s. (First written here as a turn and a cruise **left**, past the boat and behind the dock: built, it swam through the boat and spent most of the act behind the dock.) From Jan 11 it is gone until Feb 1.

**Windy:** the spray shears left (`translate(−6px, −4px)`), and the cruise is unchanged. A manatee
doesn't care about the wind.

### B7. Mother and calf (54 s, `dur` 54 500; from Feb 1, the greeting on Feb 1–2)

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

### B9. The serpent, for every season: one body, a traveling wave

**Approved for the whole year** (Croix: "All year round"). **Prototyped and recorded:**
`tools/proofs/serpent.html` (the real sea strip) and `docs/reviews/serpent-clips/` (60 fps). The
prototype's final numbers supersede the table below where they differ: λ 80 px, f 0.42 Hz, A 17 px,
L 176 px, headUp 19 px, entry and exit slopes of 46 px. It also draws **the submerged body at 20% navy
over the front waves**, so the coils read as one animal, and puts the waterline at the far lane's real
one, under Deckhand's own front waves. Measured: 0.24 ms of JavaScript a frame (0.97 ms at 4× throttle),
holding 60 fps.

This replaces `#sea-serpent`'s four pieces (`ssSeg`/`ssHump` with `ssRoll`, `ssGlide`, `ssDive`) and
`#sea-attack`'s coils (`atCoil`, `atSink`). Design C8 says why they look funky.

**Markup.**
- `#sea-serpent`: one svg the width of the lane (100vw × 70 px, far lane, bottom 0), holding:
  - `path.ssBody`, the whole body in one fill;
  - `g.ssFace` (the eye and the mouth, placed from the head's frame);
  - `g.ssCostume` (the scarf, the pail, a flake);
  - `g.ssRipples`, a pool of six small white arcs;
  - `g.ssIce`, the holes on the frozen sea.
- A `clipPath` at the waterline.
- `#sea-attack`: the same, near lane, with the face-swap drawing kept.

**The loop.** One `requestAnimationFrame` loop per playing act (the director already allows one sea
visitor at a time) computes the centerline and writes `d` on `path.ssBody`. The loop:
- samples every 2 px from s = 0 to 164, so 83 points;
- offsets each point by the thickness profile (snout 3 → jaw 10.7 → neck 7.4 → body 7.4 ± 0.5 → tail
  0.9, with a fin);
- places the spines where the top normal faces up, plus the face, the costume and the ripples;
- runs at 30 fps (the swim is 84 px/s, so a 30 fps step is under 3 px);
- stops at the act's `dur`, on `deckhand:stage`, under reduced motion, and when the page is hidden.

| term | value |
|---|---|
| swim | the head's x = start − 84 px/s · t, linear (a serpent doesn't ease) |
| the wave | `y = wl + D(x) − headUp(s) − A(s) · sin(2π (s/64 + 0.5 t))`; it runs back along the body at 32 px/s |
| A(s) | 0 for s < 14, ramping to 15 px by s = 36, easing to 55% over the last 30% of the body |
| headUp(s) | (13 + lift) · (1 − s/30)^1.5 for s < 30, plus a 1.2 px bob at 0.5 Hz; `lift` is 16 for the first-snow look, and 34 for the attack's rear |
| D(x) | 4 px, plus a smoothstep of 40 px at the entry (x > 70–80% of the lane), the same at the exit (x < 14–24%), and a 34 px dive centered at 46% (± 4.5%) |
| the waterline | the far lane's wl; everything below it is clipped |
| ripples | where the top outline crosses wl (a sign change between samples), one white arc 12 × 2 px; the pool is reused |
| splash | three white drops over the head while its top edge is within 0–5 px above wl |

**One pass (26 s, `dur` 26 500)**, as the proofs' frames show:
- **0–4.5 s:** under water; a ripple or two where the deep body nears the surface.
- **4.5–6 s:** the head comes up the slope, then the first coil behind it.
- **6–11.5 s:** two to three coils travel back along the body.
- **11.5–14.5 s:** the head dives and the coils follow it under, then the head resurfaces.
- **14.5–19 s:** coils again.
- **19–21 s:** down the exit slope, head first, the tail fin last.
- **To 26 s:** under water.

It is clear of the dock, because the exit is at 14–24% of the lane.

**The attack (20 s, `dur` 20 500)**, rebuilt on the body. The beats and the director's rules stay; the
motion is now the body's.
- **0–2.8 s:** the tell (bubbles; the periscope, now the head at lift 0 and depth 8 px, so only the
  horn and the eye show).
- **2.8–10 s:** the coils roll in toward the boat along the traveling wave. The swim eases to a stop
  40 px short of the boat (`cubic-bezier(.25,.5,.35,1)`), the speed change that says "it's here".
- **10–11 s:** it rears: lift 0 → 34 over 1 s, with an overshoot to 38.
- **11–13.6 s:** the lunge and the bite. The body's existing front-face swap plays here, and coral is
  its eye.
- **13.6 s:** the miss, and the head into the water.
- **15.7–20 s:** the whole body slides back down along its path: D rises 0 → 40 over 4 s, head first,
  the coils following, and ripples where it goes under.

**Costumes.** They are placed each frame from the head's frame (the position and tangent at s = 6 and
s = 13): the scarf wrap at s = 11–17, with its fronds streaming back; the pail on the head at the
head's angle; the first-snow flake landing on the snout.

**The frozen sea** (`body.wnFrozen`). Each span above wl writes a hole (a turquoise lens 4 px deep)
with two tilted shards into `g.ssIce`. The holes persist for the day; they are drawn into `#wnIce`'s
picture at the act's end, so they cost nothing after.

**Reduced motion.** No act plays (the sea's rule).

**Cost.** Per frame, about 83 points of math, one `d` write and a repaint of the serpent's box (at
most 400 × 70 px). That is about the cost of today's four animated groups, and the frame loop runs
only while the act plays. Measure it in the aquarium with 4× throttle before trusting it. The budget
line is 2 ms of main-thread work a frame.

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

### B12. The frozen sea (Jan 11–29)

**Markup.** `svg#wnIce`, fixed over the water band (from the dune's foot to the screen's bottom), z
just over the front waves and under the dock. It is drawn once per stage:
- the sheet or sheets;
- the snow rim, the sheen, the cracks, the bubbles and the dusting;
- in freeze-in, the open water's pancakes;
- in break-up, the leads and the tilted slabs.

**The stages** (`data-wn-sea`):

| stage | dates | ice cover |
|---|---|---|
| `in1` | Jan 11 | 22% |
| `in2` | Jan 12 | 55% |
| `in3` | Jan 13–14 | 85%, one lead |
| `frozen` | Jan 15–25 | the whole band |
| `break` | Jan 26–29 | slabs and leads |
| absent | Feb 1 → | open water, with floes drifting out Feb 1–5 (a 44 s flotsam act, common, greeting) |

Stages change at the day's first tick with a 4 s crossfade, never in front of a class.

**What stops.**
- Under `body.wnFrozen` the wave layers' animations pause (`animation-play-state: paused` on
  `#wv1`/`#wv2`/`#wv3`), and the boat's heave, pitch and drift pause at their neutral frame.
- `#boat` gets `.frozen`, which shows its rime and its collar.
- **This is cheaper than an ordinary day.**

**Motion on the ice.**
- **The gull's ice walk** (`gullIce`, uncommon, a middle third, 60 s): it hops down from the mast,
  walks out about 90 px in short steps (a 0.4 s step, a 1.2 s pause, a head turn), leaving a print
  per step (the prints stay until the bell), and walks back.
- **The serpent breaking through** (B9).
- **The attack through the ice** (B9).

Nothing else moves on the ice.



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
| `manateeCalf` | uncommon | 54 500 | near | `boat:"manatee"`, `notBefore:"02-01"`, phase thaw | the greeting on Feb 1–2 |
| `ride` | rare | 60 500 | near | `lastThird:true`, `gullBack:true`, Dec 14 → Jan 8 and Feb 1 → 19 | `busy()` treats it as a gull act: no visit, trawler or geese in the same period |
| `serpentSnow` | uncommon | 22 500 | far | `needs:{flurry:true}`, phase dec2–jan (to Jan 29) | |
| `gullIce` | uncommon | 60 500 | — | `gullBack:true`, `middleThird:true`, only in `frozen` | |
| `floes` | common | 44 500 | far, near | Feb 1–5 only, `greeting:true` | the break-up's last ice drifting out |
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
1. **The flurry clock.** `flurries.times(date)` gives the day's flurry, if any, by period and minute;
   the director sets `data-wn-snow` (`flurries` or absent) during it.
2. **The freeze.** In `frozen` the water acts (turtle, school, paper, buoy, fish, dolphins, chase,
   whale, the manatees) have weight 0. In `in1`–`in3` and `break` their weight is ×.5. The serpent's
   is ×1.5 in `frozen`; it is the sea's only resident then.
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
- A flurry dusts the deck and the snowman until the bell.
- The serpent breaks the ice; the gull walks on it.

Nothing else reacts.

---

## D. Proof frames to grab before trusting any of it

Grab them in the aquarium (`tools/aquarium.html`) at 1920 × 1080 and at one third, with the board's
clock set to a winter date.

- **Snow.**
  - A flurry, 30 s at 2 fps: never more than 3 flakes; no flake box between 18% and 82%.
  - A bell during a flurry: the falling flakes finish, and none spawn.
- **The serpent (every season).**
  - One pass at 2 fps: one path, no gaps, coils traveling tailward, never popping.
  - The 30 fps loop's cost under 4× throttle: under 2 ms a frame.
  - The attack at 3 / 10.5 (the rear) / 13.6 / 17.
  - On the ice: the holes.
- **The freeze.**
  - Each stage at the first tick.
  - The waves and the boat paused under `wnFrozen`.
  - The gull's ice walk.
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
