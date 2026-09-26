# October 2.0 — animation review of the decorations (Sep 26, 2026)

Reviewer: an animator (the twelve principles, in CSS keyframes for a Chromebox), the same
brief as `sea-2.0-animation.md`. I read the v7.10 October keyframes and the `Season` tap
handlers, `SEA.md`, the sea's `ACTS` table and `play()`, and I designed every motion below
against the redrawn cast in `october-2.0-design.md` and its proof sheet — the new class names,
the new joints, the new boxes. Where the redesign's markup needs one more wrapper for a motion
to be possible, I say so at the top of that piece; those are the only markup changes asked for.

The register is the sea's: from the third row only silhouette changes, speed changes and
pauses read. Every beat table below is written in those three words. Nothing here takes the
stage, makes a sound, or is timed against the settle-in count; everything is gated by
`body.waveMotion`, so under reduced motion the pieces sit still and the taps still change
state (a face, a lit pumpkin) without moving.

---

## A. Verdict on the current motions

**The spider.** `ocDangle 150s ease-in-out` is one 12-second excursion in 150, which is the
right *frequency* — a spider that moves once every two and a half minutes is a spider you
catch out of the corner of your eye, and that is the whole point of it. Everything else is
wrong. The `ease-in-out` on the whole animation eases *every segment*, so the descent from 92
% to 95 % starts from rest and arrives at rest: an elevator, the first fault the sea review
named. There is no anticipation (a spider pays out silk in a burst after a still moment), the
46-unit drop is a slide not a fall (no acceleration, no bounce at the end of the silk), and
the climb from 97 % to 100 % is one smooth 4.5-second rise — a spider climbs hand over hand,
pull, pause, pull. The tap drop is the same shape at 4.5 s: no wind-up, `ocDropNow` reaches
70 units with `ease-in-out` (slowest at the moment it should be fastest), a 55 % "bounce" that
is one keyframe with the same symmetric ease, and a return that is a single 2-second glide.
Nothing in it says *weight*. A second tap mid-drop removes and re-adds `.drop`, which snaps
the spider back to the hub and drops it again from zero — a jump cut, and the first thing a
seventh-grader will discover. The thread is right in principle (its own element, `scaleY`
from the anchor) and wrong in detail: its keyframes are a hand copy of the spider's ratios,
so any retiming desynchronises them.

**The pumpkins.** `ocFlicker 2.8s ease-in-out` with three stops is a sine wave with a limp. A
candle has two periods at once — a slow breathe as the flame leans and recovers (1–2 s) and a
fast shiver on the tip (3–5 Hz) — and every so often it *gutters*: drops to almost nothing in
a tenth of a second and flares back over half a second. None of that is here, and three
pumpkins run the same 2.8 s loop from the same start so they breathe in unison, which is the
one thing that says "screen" rather than "candles". The glow does not exist yet; when it does
it must follow the flame, not the sine. The tap squash `scale(1.06,.92)` at 40 % of 350 ms with
`ease` is symmetric in and out, has no rebound, and its origin is `fill-box` centre, so the
pumpkin's feet leave the sand as it squashes. Worse for the new markup: P2 and P3 carry a
`transform` attribute for their placement and lean, and a CSS `transform` animation on that
same group *replaces* the attribute — the tap would teleport them to the box's origin for 350
ms. The face flips on `pointerdown`, before the squash, so the change is not tied to the
impact.

**The bats.** One `ocBatFly 9s linear` for all five, delays of .35 s, a fade in at 4 % and out
at 96 %. A fade is not an entrance — the bats begin off-screen anyway (the `both` fill puts
them at 100vw+60 through the delay), so the opacity ramp only makes them ghost in over the
water. The bob is 1.1 s `ease-in-out alternate`, symmetric, unrelated to the wingbeat (.44 s
cycle): a bat's body rises on the down-stroke, so the bob *is* the wingbeat. The flap
`ocFlapL/R .22s ease-in-out alternate` is a metronome: up-stroke and down-stroke take the same
time with the same ease, and all five bats share the .22 s, so the flock is five copies of one
wing on one clock (the old design review said the same about the drawing). No bat dips, no
bat drifts off the line, none peels away; five specks cross in a straight rank like a stamp.

**The ghost ship.** `ghDrift 40s linear` is fine as a base — a derelict does not steer. `ghFade`
is the fault: 0 → .55 over 4 s, a symmetric dip to .18 at 46–54 % and a 4 s fade out. Linear
opacity ramps are the least ghostly thing a shape can do; the eye sees an object dimming, not
an object *going*. A ghost is there, then it is not, then it is somewhere else. The lamp
`ghLamp 3.1s steps(1)` is a metronome with a 7 % off-window: a beacon, not a candle in a
hull. The heave on the wave clock is right and stays. There is no motion on the sails, the
pennant or the rig, and no moment where the ship acknowledges the boat it passes behind.

**The boat's pennant.** `fill:#111A26; transform:scale(1.5)` is a colour and a size, not a
motion; the burgee has no flutter at all outside the victory flick. The redesign makes it an
11-unit streamer, and a streamer that does not move reads as a stick.

---

## B. The motions, piece by piece

Conventions: a timing function on every keyframe that changes speed; `ease-in-out` only where
a real stop is wanted; one motion per element and nested wrappers where two coincide (the
Chrome rule); origins at joints in `view-box` units; the sea's `--sine`, `--T1`, `--T2`,
`--flut` and `--flutT` reused so October's wind is the sea's wind. Times in the tables are
seconds from the act's (or the tap's) start.

### B1. The spider

**Markup ask.** One wrapper: inside `<g class="ocSpider">`, wrap the nested `<svg>` in
`<g class="ocSpin">`. The spider group carries height (translate), the spin group carries the
turn (transform), each leg carries its own twitch (transform). The thread stays a line with its
origin at the hub. The rig gets a sway (rotate about the hub) that only the windy weather uses.

**Idle** — one excursion every 137 s (prime, so it never lines up with the minute tick or the
wave clocks) and, between excursions, one leg twitch at 41 s and a turn on the thread at 88 s.
A spider on a dragline does three things a room can see: it drops, it hangs, it climbs. The
drop is two hitches (silk paid out in bursts), the hang is long and still with one leg curl,
and the climb is three pulls with pauses. The excursion runs 93 s → 117 s; the other 113 s the
spider is a dark dot in the web.

| t | the eye sees | why |
|---|---|---|
| 0–41 | still | the resting state is the default; motion is the event |
| 41.0–41.3 | one front leg (`l1r`) lifts 14° and drops back | a sign of life at the cheapest price: one path, 300 ms |
| 88.0–88.7 | the silhouette narrows to a line and widens again — it has turned to face the other way | spiders rotate on the dragline; the flip through edge-on is the silhouette change |
| 93.0–93.2 | it rises 2 units — a hitch upward | anticipation: the body lifts as the legs release the hub |
| 93.2–93.7 | drops 26 units, accelerating | the first pay-out; gravity, so ease-in |
| 93.7–94.6 | stops dead, hangs | a spider brakes the silk in an instant |
| 94.6–95.1 | drops a further 32, accelerating, and overshoots 3 | the second pay-out ends at the silk's stretch |
| 95.1–95.8 | rises 3, settles | the elastic settle; small, one bounce |
| 95.8–106 | hangs at 58 below the hub; at 100.5 the two rear legs curl in 10° and out again over a second | the long pause is the read — "there's a spider hanging off the clock"; the curl is the only thing that says it is alive |
| 106–107.1 | climbs 22 in .5 s, ease-out, then holds .6 | the first pull, fast then stopped: hand over hand |
| 107.1–108.4 | climbs 20, holds .7 | second pull, a different pause |
| 108.4–109.3 | climbs 16 and overshoots 1.5 into the hub, settles | the last pull lands with weight |
| 109.3–137 | still | reset for the next cycle |

The thread mirrors the spider's height exactly: length 40 → scaleY = 1 + y/40, with the same
timing functions at the same percentages. Every keyframe below is derived from one column of
numbers, and if the engineer retimes the spider he retimes the thread from the same column.

**The tap drop** (7 s). Anticipation, a real fall, a real bounce, a hang, and the climb.

| t | the eye sees | why |
|---|---|---|
| 0–.22 | the spider tucks: rises 3, all eight legs pull in 12° | anticipation — the room must see it *decide* to drop |
| .22–.72 | falls 112 units, accelerating the whole way | free fall; `cubic-bezier(.55,0,1,.45)`, a parabola not an ease |
| .72–.86 | overshoots to 122, legs splay out 10° | the silk stretches; the legs fly up with the deceleration (drag) |
| .86–1.10 | back to 104 | the first rebound, ease-out then ease-in |
| 1.10–1.32 | down to 115 | second, smaller |
| 1.32–1.52 | up to 109, then settles to 112 by 1.7 | third, and the thread is at rest |
| 1.7–3.3 | hangs; at 2.4 the turn (`ocSpin` flip) | it looks around, hanging in front of the date line |
| 3.3–3.85 | climbs 34, holds .4 | hand over hand, the pulls are 34 / 30 / 26 / 22: a climber tires |
| 4.25–4.8 | climbs 30, holds .45 | |
| 5.25–5.75 | climbs 26, holds .5 | the pauses lengthen too |
| 6.25–6.75 | climbs 22, overshoots 2 into the hub, settles by 7.0 | arrival with weight |

**A tap mid-drop.** During the fall and the bounces (t < 1.7 s) a tap is swallowed — the spider
is committed to the air. During the hang or the climb (1.7 ≤ t < 6.9) a tap makes it *let go
again* from wherever it is: the handler reads the spider's computed `translate` and the
thread's computed `transform` at the tap, writes them to `--sy` / `--st` on the rig, and swaps
`.drop` for `.redrop`, whose 0 % is those values and whose fall is the same gravity curve
scaled to the shorter distance. It never snaps to the hub. Three re-drops per minute at most;
after that a tap gets the leg twitch (`.poke`) only — a toy that answers every tap with a big
motion becomes a strobe under a class of seventh-graders. The idle animation is restarted
(class off, reflow, on) when the drop ends: its first 41 s are stillness, so the restart is
invisible, and the drop can never end while the idle is mid-excursion (the handler checks the
idle's `currentTime` and, inside 93–110 s, answers with `.poke`).

```css
/* ---- spider: idle (137s), a twitch, a turn, a drop with weight ---- */
.ocThread{stroke:var(--navy); stroke-width:.8; opacity:.5; transform-box:fill-box; transform-origin:50% 0;}
.ocSpiderRig{transform-box:view-box; transform-origin:96px 44px;}          /* the hub: the sway pivots here */
.ocSpin{transform-box:fill-box; transform-origin:50% 0;}                   /* the silk meets the spinnerets at the top centre */
.ocSpider{pointer-events:auto; cursor:pointer;}
.ocLeg{transform-box:view-box;}
.l1r{transform-origin:24.5px 31px;}  .l2r{transform-origin:25px 33.5px;}  .l3r{transform-origin:25px 29px;}  .l4r{transform-origin:24px 27px;}
.l1l{transform-origin:19.5px 31px;}  .l2l{transform-origin:19px 33.5px;}  .l3l{transform-origin:19px 29px;}  .l4l{transform-origin:20px 27px;}

body.waveMotion .ocSpiderRig .ocSpider{animation:ocIdle 137s linear infinite;}
body.waveMotion .ocSpiderRig .ocThread{animation:ocIdleThread 137s linear infinite;}
body.waveMotion .ocSpiderRig .ocSpin{animation:ocIdleTurn 137s linear infinite;}
body.waveMotion .ocSpiderRig .l1r{animation:ocIdleTwitch 137s linear infinite;}
body.waveMotion .ocSpiderRig .l4l, body.waveMotion .ocSpiderRig .l4r{animation:ocIdleCurl 137s linear infinite;}
body.waveMotion .ocSpiderRig .l4r{animation-delay:.12s;}                   /* the pair never moves as one */
/* windy weather only: the thread swings 3° about the hub on the chop clock (a draft through the room) */
body.waveMotion[data-sea="windy"] .ocSpiderRig{animation:ocSway calc(var(--T2) / 2) var(--sine) infinite alternate;}
@keyframes ocSway{from{transform:rotate(-3deg);} to{transform:rotate(2.2deg);}}

/* heights in web units below the hub; the thread's scaleY is 1 + y/40 at every keyframe */
@keyframes ocIdle{
  0%,67.88%{translate:0 0; animation-timing-function:ease-out;}                  /* 93.0s */
  68.03%{translate:0 -2px; animation-timing-function:cubic-bezier(.55,0,1,.45);}  /* 93.2 the hitch up */
  68.39%{translate:0 26px; animation-timing-function:linear;}                     /* 93.7 first pay-out, stopped dead */
  69.05%{translate:0 26px; animation-timing-function:cubic-bezier(.55,0,1,.45);}  /* 94.6 */
  69.42%{translate:0 61px; animation-timing-function:cubic-bezier(.2,.7,.4,1);}   /* 95.1 second pay-out, 3 over */
  69.93%{translate:0 58px; animation-timing-function:linear;}                     /* 95.8 settled */
  77.37%{translate:0 58px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}   /* 106.0 the hang ends */
  77.74%{translate:0 36px; animation-timing-function:linear;}                     /* 106.5 pull one */
  78.18%{translate:0 36px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}   /* 107.1 */
  78.61%{translate:0 16px; animation-timing-function:linear;}                     /* 107.7 pull two */
  79.12%{translate:0 16px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}   /* 108.4 */
  79.49%{translate:0 -1.5px; animation-timing-function:ease-in-out;}              /* 108.9 pull three, over the hub */
  79.78%,100%{translate:0 0;}}                                                    /* 109.3 */
@keyframes ocIdleThread{
  0%,67.88%{transform:scaleY(1); animation-timing-function:ease-out;}
  68.03%{transform:scaleY(.95); animation-timing-function:cubic-bezier(.55,0,1,.45);}
  68.39%{transform:scaleY(1.65); animation-timing-function:linear;}
  69.05%{transform:scaleY(1.65); animation-timing-function:cubic-bezier(.55,0,1,.45);}
  69.42%{transform:scaleY(2.525); animation-timing-function:cubic-bezier(.2,.7,.4,1);}
  69.93%{transform:scaleY(2.45); animation-timing-function:linear;}
  77.37%{transform:scaleY(2.45); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  77.74%{transform:scaleY(1.9); animation-timing-function:linear;}
  78.18%{transform:scaleY(1.9); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  78.61%{transform:scaleY(1.4); animation-timing-function:linear;}
  79.12%{transform:scaleY(1.4); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  79.49%{transform:scaleY(.9625); animation-timing-function:ease-in-out;}
  79.78%,100%{transform:scaleY(1);}}
@keyframes ocIdleTurn{0%,64.23%{transform:scaleX(1); animation-timing-function:ease-in;}       /* 88.0 */
  64.49%{transform:scaleX(0); animation-timing-function:ease-out;}                             /* 88.35 edge-on */
  64.74%,100%{transform:scaleX(-1);}}                                                          /* 88.7 — it faces the other way until the next cycle flips it back */
@keyframes ocIdleTwitch{0%,29.93%{transform:rotate(0); animation-timing-function:cubic-bezier(.2,.8,.3,1);}   /* 41.0 */
  30.0%{transform:rotate(-14deg); animation-timing-function:ease-in;} 30.15%,100%{transform:rotate(0);}}     /* 41.1 up, 41.3 down */
@keyframes ocIdleCurl{0%,73.36%{transform:rotate(0); animation-timing-function:ease-in-out;}                  /* 100.5 */
  73.72%{transform:rotate(10deg); animation-timing-function:ease-in-out;} 74.09%,100%{transform:rotate(0);}}  /* 101.0 in, 101.5 out */
```

`ocIdleTurn` leaves the spider facing the other way at the end of the cycle, and the next
cycle's 0 % snaps it back. That is deliberate: the snap lands at the start of 41 s of
stillness, between two mirror images of a nearly symmetric spider 6 px wide from the back
row — below the threshold of anything — and the alternative (a 274 s alternating cycle) doubles
every keyframe list for nothing.

```css
/* ---- the tap: anticipation, a fall, three bounces, a hang, four pulls (7s) ---- */
body.waveMotion .ocSpiderRig.drop .ocSpider{animation:ocDrop 7s linear 1;}
body.waveMotion .ocSpiderRig.drop .ocThread{animation:ocDropThread 7s linear 1;}
body.waveMotion .ocSpiderRig.drop .ocSpin{animation:ocDropTurn 7s linear 1;}
body.waveMotion .ocSpiderRig.drop .ocLeg{animation:ocDropLegs 7s linear 1;}
body.waveMotion .ocSpiderRig.drop .l1l, body.waveMotion .ocSpiderRig.drop .l2l,
body.waveMotion .ocSpiderRig.drop .l3l, body.waveMotion .ocSpiderRig.drop .l4l{animation-name:ocDropLegsL;}
@keyframes ocDrop{
  0%{translate:0 0; animation-timing-function:cubic-bezier(.3,0,.5,1);}
  3.1%{translate:0 -3px; animation-timing-function:cubic-bezier(.55,0,1,.45);}   /* .22 tucked, up 3 */
  10.3%{translate:0 112px; animation-timing-function:cubic-bezier(.2,.6,.4,1);}  /* .72 the end of the silk */
  12.3%{translate:0 122px; animation-timing-function:cubic-bezier(.4,0,.6,1);}   /* .86 stretch */
  15.7%{translate:0 104px; animation-timing-function:cubic-bezier(.4,0,.6,1);}   /* 1.10 */
  18.9%{translate:0 115px; animation-timing-function:cubic-bezier(.4,0,.6,1);}   /* 1.32 */
  21.7%{translate:0 109px; animation-timing-function:ease-in-out;}               /* 1.52 */
  24.3%{translate:0 112px; animation-timing-function:linear;}                    /* 1.70 at rest */
  47.1%{translate:0 112px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}  /* 3.30 the hang ends */
  55%{translate:0 78px; animation-timing-function:linear;}   60.7%{translate:0 78px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}   /* 3.85 / 4.25 */
  68.6%{translate:0 48px; animation-timing-function:linear;} 75%{translate:0 48px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}     /* 4.80 / 5.25 */
  82.1%{translate:0 22px; animation-timing-function:linear;} 89.3%{translate:0 22px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}   /* 5.75 / 6.25 */
  96.4%{translate:0 -2px; animation-timing-function:ease-in-out;}                /* 6.75 over the hub */
  100%{translate:0 0;}}
@keyframes ocDropThread{
  0%{transform:scaleY(1); animation-timing-function:cubic-bezier(.3,0,.5,1);}
  3.1%{transform:scaleY(.925); animation-timing-function:cubic-bezier(.55,0,1,.45);}
  10.3%{transform:scaleY(3.8); animation-timing-function:cubic-bezier(.2,.6,.4,1);}
  12.3%{transform:scaleY(4.05); animation-timing-function:cubic-bezier(.4,0,.6,1);}
  15.7%{transform:scaleY(3.6); animation-timing-function:cubic-bezier(.4,0,.6,1);}
  18.9%{transform:scaleY(3.875); animation-timing-function:cubic-bezier(.4,0,.6,1);}
  21.7%{transform:scaleY(3.725); animation-timing-function:ease-in-out;}
  24.3%{transform:scaleY(3.8); animation-timing-function:linear;}
  47.1%{transform:scaleY(3.8); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  55%{transform:scaleY(2.95); animation-timing-function:linear;}   60.7%{transform:scaleY(2.95); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  68.6%{transform:scaleY(2.2); animation-timing-function:linear;}  75%{transform:scaleY(2.2); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  82.1%{transform:scaleY(1.55); animation-timing-function:linear;} 89.3%{transform:scaleY(1.55); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  96.4%{transform:scaleY(.95); animation-timing-function:ease-in-out;}
  100%{transform:scaleY(1);}}
@keyframes ocDropTurn{0%,34.3%{transform:scaleX(1); animation-timing-function:ease-in;} 37.1%{transform:scaleX(0); animation-timing-function:ease-out;}
  40%,100%{transform:scaleX(-1);}}                                                              /* 2.4–2.8: it turns while it hangs; the idle restart flips it back unseen */
/* legs: tuck on the anticipation, splay at the stretch, back to rest by the end of the bounces */
@keyframes ocDropLegs{0%{transform:rotate(0); animation-timing-function:ease-out;} 3.1%{transform:rotate(12deg); animation-timing-function:ease-in;}
  10.3%{transform:rotate(12deg); animation-timing-function:cubic-bezier(.2,.8,.3,1);} 12.3%{transform:rotate(-10deg); animation-timing-function:ease-in-out;}
  24.3%,100%{transform:rotate(0);}}
@keyframes ocDropLegsL{0%{transform:rotate(0); animation-timing-function:ease-out;} 3.1%{transform:rotate(-12deg); animation-timing-function:ease-in;}
  10.3%{transform:rotate(-12deg); animation-timing-function:cubic-bezier(.2,.8,.3,1);} 12.3%{transform:rotate(10deg); animation-timing-function:ease-in-out;}
  24.3%,100%{transform:rotate(0);}}

/* ---- a second tap while it hangs or climbs: let go again from HERE (--sy / --st set by the handler) ---- */
body.waveMotion .ocSpiderRig.redrop .ocSpider{animation:ocRedrop 5.2s linear 1;}
body.waveMotion .ocSpiderRig.redrop .ocThread{animation:ocRedropThread 5.2s linear 1;}
@keyframes ocRedrop{
  0%{translate:0 var(--sy, 60px); animation-timing-function:cubic-bezier(.55,0,1,.45);}
  9%{translate:0 112px; animation-timing-function:cubic-bezier(.2,.6,.4,1);}  12%{translate:0 120px; animation-timing-function:cubic-bezier(.4,0,.6,1);}
  17%{translate:0 106px; animation-timing-function:cubic-bezier(.4,0,.6,1);}  21%{translate:0 113px; animation-timing-function:ease-in-out;}
  25%{translate:0 112px; animation-timing-function:linear;}                   40%{translate:0 112px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  50%{translate:0 78px; animation-timing-function:linear;}  57%{translate:0 78px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  67%{translate:0 48px; animation-timing-function:linear;}  74%{translate:0 48px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  84%{translate:0 22px; animation-timing-function:linear;}  90%{translate:0 22px; animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  97%{translate:0 -2px; animation-timing-function:ease-in-out;} 100%{translate:0 0;}}
@keyframes ocRedropThread{
  0%{transform:var(--st, scaleY(2.5)); animation-timing-function:cubic-bezier(.55,0,1,.45);}
  9%{transform:scaleY(3.8); animation-timing-function:cubic-bezier(.2,.6,.4,1);}  12%{transform:scaleY(4); animation-timing-function:cubic-bezier(.4,0,.6,1);}
  17%{transform:scaleY(3.65); animation-timing-function:cubic-bezier(.4,0,.6,1);} 21%{transform:scaleY(3.825); animation-timing-function:ease-in-out;}
  25%{transform:scaleY(3.8); animation-timing-function:linear;}                   40%{transform:scaleY(3.8); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  50%{transform:scaleY(2.95); animation-timing-function:linear;} 57%{transform:scaleY(2.95); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  67%{transform:scaleY(2.2); animation-timing-function:linear;}  74%{transform:scaleY(2.2); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  84%{transform:scaleY(1.55); animation-timing-function:linear;} 90%{transform:scaleY(1.55); animation-timing-function:cubic-bezier(.2,.8,.3,1);}
  97%{transform:scaleY(.95); animation-timing-function:ease-in-out;} 100%{transform:scaleY(1);}}
/* the consolation for a swallowed tap: one leg, 300ms */
body.waveMotion .ocSpiderRig.poke .l2l{animation:ocPoke .3s linear 1;}
@keyframes ocPoke{0%{transform:rotate(0); animation-timing-function:cubic-bezier(.2,.8,.3,1);} 30%{transform:rotate(16deg); animation-timing-function:ease-in;} 100%{transform:rotate(0);}}
```

The handler, in prose (it is four lines): on `pointerdown`, if the rig has `.drop` or
`.redrop`, read the spider animation's `currentTime`; under 1700 ms swallow; else write
`--sy` from `getComputedStyle(spider).translate` and `--st` from the thread's `transform`,
swap the class to `.redrop` (remove, reflow, add), count it. If the idle is between 93 and
110 s, add `.poke` for 300 ms instead. Otherwise add `.drop` for 7000 ms, and when any drop
class comes off, restart the idle animations by toggling a `.rest` class that the idle rules
are scoped to.

### B2. The pumpkins

**Markup ask.** Two wrappers per pumpkin, because of the `transform` attribute on P2 and P3.
The outer `<g class="ocPumpkin" data-face transform="…">` keeps the placement and the lean and
carries the `.ocShade` ellipse (the ground does not squash). Inside it, `<g class="ocSquash">`
carries everything else and is the only thing the tap animates, with its origin at the base of
the body in the pumpkin's own units (P1 `52px 69px`, P2 `32px 97px`, P3 `42px 75px`,
`transform-box:view-box`). Inside that, `<g class="ocLidGrp">` groups the stem, stem line, lid,
leak, and P2's leaf, tendril and vein, so the lid can pop. And inside each `.ocFace`, wrap the
cuts in `<g class="ocFlame">`: the slow breath lives on the face, the fast shiver on the flame
group, and opacity on nested groups multiplies — that is the superposition, at two animated
elements per face instead of five.

**The flame.** Two periods and a gutter. The slow one is a lean-and-recover, 1.2–2.1 s per
breath and never the same twice (the flame's period wanders with the draft), amplitude
.82–1.0. The fast one is the tip's shiver at about 3 Hz, amplitude .93–1.0, keyframed at
unequal spacing inside a 1.1 s loop so it does not read as a pulse; that amplitude on a 20 px
yellow cut is a shimmer, well under any flicker that could trouble a photosensitive kid, and
the shiver is the first thing to cut if the Chromebox's paint budget says so. The gutter
happens once per slow cycle: 90 ms down to .3, 120 ms flare to 1.0 (a gutter recovers with a
flare, not an ease), 400 ms settling. Three pumpkins get three cycle lengths — 13 s, 11 s,
17 s, pairwise coprime, so the gutters never coincide and the breaths beat against each
other. The glow puddle and the lid leak follow the *slow* keyframes only, at their own
amplitudes (.55 and .9): a puddle of light on sand does not shiver, it swells and shrinks with
the flame, and on the gutter it collapses inward (`scale` .88 about its centre) and springs
back — the one place the puddle does something the face does not, which is what makes it
read as light *cast by* the flame rather than painted under it.

| t (P1, 13 s) | the eye sees | why |
|---|---|---|
| 0–7.4 | the face brightens and dims in five uneven breaths, the puddle swells with it | the base behaviour: a candle in a draft |
| 7.4–7.49 | the face nearly goes out; the puddle shrinks | the gutter — the one event in the cycle, fast |
| 7.49–7.61 | it flares past its normal brightness | the recovery is an overshoot |
| 7.61–8.0 | settles | |
| 8.0–13 | four more breaths | and P2 gutters at 6.3 s of its 11, P3 at 9.8 of its 17 — never together |

```css
/* ---- the candle: slow breath (face), fast shiver (flame group), puddle and leak follow the breath ---- */
body.waveMotion .ocPumpkin.lit .ocFace{animation:ocBreath 13s linear infinite;}
body.waveMotion .ocPumpkin.lit .ocFlame{animation:ocShiver 1.1s linear infinite;}
body.waveMotion .ocPumpkin.lit .ocGlow{animation:ocPuddle 13s linear infinite;}
body.waveMotion .ocPumpkin.lit .ocLeak{animation:ocLeakBreath 13s linear infinite;}
body.waveMotion .ocPumpkin.p2.lit .ocFace, body.waveMotion .ocPumpkin.p2.lit .ocGlow, body.waveMotion .ocPumpkin.p2.lit .ocLeak{animation-duration:11s;}
body.waveMotion .ocPumpkin.p3.lit .ocFace, body.waveMotion .ocPumpkin.p3.lit .ocGlow, body.waveMotion .ocPumpkin.p3.lit .ocLeak{animation-duration:17s;}
body.waveMotion .ocPumpkin.p2.lit .ocFlame{animation-duration:1.3s;}  body.waveMotion .ocPumpkin.p3.lit .ocFlame{animation-duration:.9s;}
.ocGlow{transform-box:fill-box; transform-origin:50% 50%;}
/* eleven breaths of unequal length and one gutter at 57%; every keyframe eases in and out (a lean is a stop and a return) */
@keyframes ocBreath{
  0%{opacity:1; animation-timing-function:ease-in-out;}     6%{opacity:.86; animation-timing-function:ease-in-out;}
  11%{opacity:.97; animation-timing-function:ease-in-out;}  20%{opacity:.82; animation-timing-function:ease-in-out;}
  27%{opacity:1; animation-timing-function:ease-in-out;}    33%{opacity:.9; animation-timing-function:ease-in-out;}
  42%{opacity:.98; animation-timing-function:ease-in-out;}  50%{opacity:.85; animation-timing-function:ease-in-out;}
  56.9%{opacity:.95; animation-timing-function:cubic-bezier(.6,0,.9,.4);}
  57.6%{opacity:.3; animation-timing-function:cubic-bezier(.1,.8,.3,1);}    /* the gutter: 90ms down */
  58.5%{opacity:1; animation-timing-function:ease-in-out;}                  /* 120ms flare */
  61.5%{opacity:.9; animation-timing-function:ease-in-out;}                 /* settles */
  70%{opacity:1; animation-timing-function:ease-in-out;}    77%{opacity:.84; animation-timing-function:ease-in-out;}
  85%{opacity:.96; animation-timing-function:ease-in-out;}  93%{opacity:.87; animation-timing-function:ease-in-out;}
  100%{opacity:1;}}
@keyframes ocShiver{0%{opacity:1;} 9%{opacity:.94;} 17%{opacity:1;} 31%{opacity:.93;} 38%{opacity:.99;} 55%{opacity:.95;}
  63%{opacity:1;} 78%{opacity:.93;} 86%{opacity:.98;} 100%{opacity:1;}}
@keyframes ocPuddle{
  0%{opacity:.55; scale:1; animation-timing-function:ease-in-out;}    6%{opacity:.46; scale:.97; animation-timing-function:ease-in-out;}
  11%{opacity:.53; scale:1; animation-timing-function:ease-in-out;}   20%{opacity:.44; scale:.96; animation-timing-function:ease-in-out;}
  27%{opacity:.55; scale:1; animation-timing-function:ease-in-out;}   33%{opacity:.49; scale:.98; animation-timing-function:ease-in-out;}
  42%{opacity:.54; scale:1; animation-timing-function:ease-in-out;}   50%{opacity:.46; scale:.97; animation-timing-function:ease-in-out;}
  56.9%{opacity:.52; scale:1; animation-timing-function:cubic-bezier(.6,0,.9,.4);}
  57.6%{opacity:.16; scale:.88; animation-timing-function:cubic-bezier(.1,.8,.3,1);}
  58.5%{opacity:.58; scale:1.03; animation-timing-function:ease-in-out;}
  61.5%{opacity:.49; scale:1; animation-timing-function:ease-in-out;}
  70%{opacity:.55; scale:1; animation-timing-function:ease-in-out;}   77%{opacity:.45; scale:.97; animation-timing-function:ease-in-out;}
  85%{opacity:.53; scale:1; animation-timing-function:ease-in-out;}   93%{opacity:.47; scale:.98; animation-timing-function:ease-in-out;}
  100%{opacity:.55; scale:1;}}
@keyframes ocLeakBreath{
  0%{opacity:.9; animation-timing-function:ease-in-out;}   20%{opacity:.7; animation-timing-function:ease-in-out;}
  27%{opacity:.9; animation-timing-function:ease-in-out;}  50%{opacity:.72; animation-timing-function:ease-in-out;}
  56.9%{opacity:.85; animation-timing-function:cubic-bezier(.6,0,.9,.4);} 57.6%{opacity:.2; animation-timing-function:cubic-bezier(.1,.8,.3,1);}
  58.5%{opacity:.9; animation-timing-function:ease-in-out;} 77%{opacity:.7; animation-timing-function:ease-in-out;} 100%{opacity:.9;}}
```

`.ocGlow` is an `<ellipse>` with an `opacity` animation and a `scale` animation in one keyframe
list — one animation, two properties, no `transform`, so the Chrome rule is not touched. The
`.ocShade` shadow never animates.

**The tap** (460 ms). A press from above, a rebound, and the lid pops on the rebound. The face
flips at the bottom of the squash, where the cuts are at their most compressed and the swap
is hidden inside a shape change; the `lit` class is added at the same moment, so the light
appears to come on *because* the pumpkin was pressed. The handler does the flip on a 70 ms
`setTimeout` from `pointerdown` instead of immediately.

| t | the eye sees | why |
|---|---|---|
| 0–.07 | the pumpkin flattens to 90 % tall and 108 % wide, from the ground up | impact — fast in, no anticipation because the *tap* is the anticipation |
| .07 | the face changes and lights | timed to the deepest squash |
| .07–.19 | it springs to 105 % tall, 96 % wide; the lid lifts 2.5 units, lagging 50 ms | rebound with follow-through; the lid is a loose part |
| .19–.30 | settles to 98.5 % tall; the lid drops and overshoots down .5 | the second, smaller bounce; the lid's own settle |
| .30–.46 | rests | |
| +.09 (P3 only) | the green sprout at the end of the vine squashes 4 % | the vine transmits the push (B7) |

```css
/* ---- the tap: squash from the ground, a rebound, the lid pops ---- */
.ocSquash{transform-box:view-box;}
.ocPumpkin.p1 .ocSquash{transform-origin:52px 69px;}  .ocPumpkin.p2 .ocSquash{transform-origin:32px 97px;}  .ocPumpkin.p3 .ocSquash{transform-origin:42px 75px;}
.ocLidGrp{transform-box:view-box;}
body.waveMotion .ocPumpkin.tapped .ocSquash{animation:ocSquash .46s linear 1;}
body.waveMotion .ocPumpkin.tapped .ocLidGrp{animation:ocLidPop .46s linear 1;}
@keyframes ocSquash{
  0%{transform:scale(1,1); animation-timing-function:cubic-bezier(.3,0,.6,1);}
  15%{transform:scale(1.08,.9); animation-timing-function:cubic-bezier(.2,.7,.3,1);}     /* .07 the press */
  41%{transform:scale(.96,1.05); animation-timing-function:cubic-bezier(.4,0,.6,1);}     /* .19 the spring */
  65%{transform:scale(1.015,.985); animation-timing-function:ease-in-out;}               /* .30 */
  100%{transform:scale(1,1);}}
@keyframes ocLidPop{
  0%,26%{translate:0 0; animation-timing-function:cubic-bezier(.2,.7,.3,1);}             /* .12: 50ms behind the spring */
  46%{translate:0 -2.5px; animation-timing-function:cubic-bezier(.5,0,.8,.4);}           /* .21 lifted */
  70%{translate:0 .5px; animation-timing-function:ease-out;}                             /* .32 lands, a hair over */
  100%{translate:0 0;}}
```

The pumpkins never carry `will-change`; they are permanent, and three lit ones cost twelve
opacity-animated children repainting a ~36 000 px² svg — inside the budget, but it is the
largest permanent cost on the board, which is why the shiver is the first thing to drop on a
slow panel and why nothing else on the sand animates while idle.

### B3. The bats (10.6 s crossing, `dur` 11 000)

**Markup.** The redesign's markup holds: `.ocBat` (position, `transform`) > `.ocBob` (the
wingbeat's lift on `translate` and the pitch on `rotate` — two individual properties, no
`transform`, fine on one element) > svg > `.ocWingL/.ocWingR` (`transform` rotate about the
shoulder). Drop every `opacity` keyframe: the bats begin off-screen right and end off-screen
left or above, and the `both` fill holds them there through their delays.

**Five individuals.** b1 is the leader: it sets the line and does the dip. b2 and b3 follow
its path .3 s and .55 s behind at their own heights, so the dip runs through the flock like a
wave. b4 is the big slow one, lower and on a straight line with a lazy beat — the one that
gives the flock depth and makes the others look quick. b5 is the one that peels off: at 58 %
it banks, climbs, and leaves over the top of the box, gone by 78 %. Three flap rates across
the five (b1 .40 s, b2 .34 s, b3 .46 s, b4 .58 s, b5 .38 s), never a shared clock, and the
beat of each bat drives its own lift.

**The wing.** Up-stroke fast, down-stroke slow: 35 % of the cycle up with a hard ease-in (the
wing whips up), 65 % down with a broad ease (the power stroke, loaded). The body lifts on the
down-stroke and sinks on the up, so the bob keyframes are the flap keyframes with the phase
shifted: rise during 35–100 %, fall during 0–35 %. Pose A (down-stroke drawing) sweeps ±30° /
26°, pose B (up-stroke drawing) ±18° / 14° as the design review asked. The bob amplitude
follows the flap rate: the slow big bat lifts 7 px per beat, the quick ones 4.

**The dip.** The leader flies level, then at 38 % tips nose-down (`rotate` on `.ocBob` −16°),
dives 36 px accelerating, and pulls out with an overshoot 8 px above the line and a nose-up of
+10°, then levels. From the back row: a speck that suddenly swoops and recovers. The ground
speed surges after the dip (a dive converts height into speed) and slackens back — that is the
speed change that reads.

| t | the eye sees | why |
|---|---|---|
| 0 | b1 enters at the right edge at speed, no fade | an entrance is a position change, never an opacity change |
| .3 / .55 / .8 / 1.0 | b2, b3, b4, b5 enter, each on its own height | a ragged flock, not a rank |
| 0–3.9 | five specks cross, each bobbing with its own beat | the beat rates are the individuality — from 8 m the *rhythms* differ before anything else does |
| 3.9–4.7 | b1 tips and dives 36 px; b2, b3 do the same .3 and .55 s later | the leader's decision, copied down the line |
| 4.7–5.4 | b1 pulls out, overshoots up 8, settles; it is faster now | the dip converts to speed |
| 5.4–6.4 | b4 plods across below, unmoved | the counterweight; it was never in the dip |
| 6.0–8.0 | b5 banks 25°, climbs, and exits over the top | one peels off — a flock that all leaves the same way is a formation |
| 8.9 / 9.2 / 9.5 | b1, b2, b3 exit left | |
| 10.6 | b4 exits last | the slow one is always last (the school's rule for s5) |

```css
/* ---- bats: five individuals, one crossing (10.6s) ---- */
#sea-bats{bottom:70px; left:0; width:100vw; height:190px; pointer-events:none;}
.ocBat{position:absolute; left:0; bottom:var(--by); width:38px; --by:60px;}
.ocBat.b1{--by:98px;} .ocBat.b2{--by:74px;} .ocBat.b3{--by:118px; width:30px;} .ocBat.b4{--by:40px; width:32px;} .ocBat.b5{--by:88px;}
.ocBat svg{display:block; width:100%;}
.ocBob{transform-origin:50% 40%;}
.ocWingL, .ocWingR{transform-box:view-box;}
.ocWingR{transform-origin:24.5px 8px;}  .ocWingL{transform-origin:19.5px 8px;}
body.waveMotion #sea-bats.go .ocBat{animation:ocBatLead 8.9s linear both;}
body.waveMotion #sea-bats.go .b2{animation-delay:.3s;} body.waveMotion #sea-bats.go .b3{animation-delay:.55s;}
body.waveMotion #sea-bats.go .b4{animation:ocBatPlod 9.8s linear .8s both;}
body.waveMotion #sea-bats.go .b5{animation:ocBatPeel 8s linear 1s both;}
/* the wingbeat: up fast (35%), down slow (65%); the body rides the down-stroke */
body.waveMotion #sea-bats.go .ocWingL{animation:ocFlapL .4s linear infinite;}
body.waveMotion #sea-bats.go .ocWingR{animation:ocFlapR .4s linear infinite;}
body.waveMotion #sea-bats.go .ocBob{animation:ocBeat .4s linear infinite, ocPitchLead 8.9s linear both;}
body.waveMotion #sea-bats.go .up .ocWingL{animation-name:ocFlapLup;}  body.waveMotion #sea-bats.go .up .ocWingR{animation-name:ocFlapRup;}
body.waveMotion #sea-bats.go .b2 .ocWingL, body.waveMotion #sea-bats.go .b2 .ocWingR{animation-duration:.34s;}
body.waveMotion #sea-bats.go .b2 .ocBob{animation-duration:.34s, 8.9s; animation-delay:0s, .3s;}
body.waveMotion #sea-bats.go .b3 .ocWingL, body.waveMotion #sea-bats.go .b3 .ocWingR{animation-duration:.46s;}
body.waveMotion #sea-bats.go .b3 .ocBob{animation-duration:.46s, 8.9s; animation-delay:0s, .55s;}
body.waveMotion #sea-bats.go .b4 .ocWingL, body.waveMotion #sea-bats.go .b4 .ocWingR{animation-duration:.58s;}
body.waveMotion #sea-bats.go .b4 .ocBob{animation:ocBeatBig .58s linear infinite;}                       /* no dip, no pitch */
body.waveMotion #sea-bats.go .b5 .ocWingL, body.waveMotion #sea-bats.go .b5 .ocWingR{animation-duration:.38s;}
body.waveMotion #sea-bats.go .b5 .ocBob{animation:ocBeat .38s linear infinite, ocPitchPeel 8s linear 1s both;}
@keyframes ocFlapL{0%{transform:rotate(26deg); animation-timing-function:cubic-bezier(.6,0,.9,.5);}  35%{transform:rotate(-30deg); animation-timing-function:cubic-bezier(.3,0,.5,1);} 100%{transform:rotate(26deg);}}
@keyframes ocFlapR{0%{transform:rotate(-26deg); animation-timing-function:cubic-bezier(.6,0,.9,.5);} 35%{transform:rotate(30deg); animation-timing-function:cubic-bezier(.3,0,.5,1);} 100%{transform:rotate(-26deg);}}
@keyframes ocFlapLup{0%{transform:rotate(14deg); animation-timing-function:cubic-bezier(.6,0,.9,.5);}  35%{transform:rotate(-18deg); animation-timing-function:cubic-bezier(.3,0,.5,1);} 100%{transform:rotate(14deg);}}
@keyframes ocFlapRup{0%{transform:rotate(-14deg); animation-timing-function:cubic-bezier(.6,0,.9,.5);} 35%{transform:rotate(18deg); animation-timing-function:cubic-bezier(.3,0,.5,1);} 100%{transform:rotate(-14deg);}}
@keyframes ocBeat{0%{translate:0 0; animation-timing-function:cubic-bezier(.4,0,.7,.6);} 35%{translate:0 4px; animation-timing-function:cubic-bezier(.2,.6,.4,1);}
  80%{translate:0 -1px; animation-timing-function:ease-in;} 100%{translate:0 0;}}                        /* sinks on the up-stroke, lifts on the down, a hair over at the top */
@keyframes ocBeatBig{0%{translate:0 0; animation-timing-function:cubic-bezier(.4,0,.7,.6);} 35%{translate:0 7px; animation-timing-function:cubic-bezier(.2,.6,.4,1);}
  85%{translate:0 -1.5px; animation-timing-function:ease-in;} 100%{translate:0 0;}}
/* the leader's line: level, a dive at 44–53%, a fast pull-out, a surge, then steady to the left edge */
@keyframes ocBatLead{
  0%{transform:translate(calc(100vw + 60px), 0); animation-timing-function:linear;}
  44%{transform:translate(58vw, 0); animation-timing-function:cubic-bezier(.5,0,.9,.5);}        /* 3.9 */
  53%{transform:translate(47vw, 36px); animation-timing-function:cubic-bezier(.1,.7,.3,1);}     /* 4.7 the bottom of the dive, fast */
  61%{transform:translate(35vw, -8px); animation-timing-function:ease-in-out;}                  /* 5.4 overshoot above the line */
  68%{transform:translate(27vw, 0); animation-timing-function:linear;}                          /* 6.0 level again, still quick */
  100%{transform:translate(-120px, 0);}}
@keyframes ocPitchLead{0%,44%{rotate:0deg; animation-timing-function:ease-in;} 49%{rotate:-16deg; animation-timing-function:ease-in-out;}
  57%{rotate:10deg; animation-timing-function:ease-in-out;} 66%,100%{rotate:0deg;}}
@keyframes ocBatPlod{from{transform:translate(calc(100vw + 60px), 0);} to{transform:translate(-120px, 0);}}
/* the one that peels off: level to 58%, then a climbing turn out of the top of the box, accelerating */
@keyframes ocBatPeel{
  0%{transform:translate(calc(100vw + 60px), 0); animation-timing-function:linear;}
  58%{transform:translate(44vw, 0); animation-timing-function:cubic-bezier(.4,0,.8,.3);}
  78%{transform:translate(30vw, -240px); animation-timing-function:linear;}
  100%{transform:translate(30vw, -240px);}}
@keyframes ocPitchPeel{0%,56%{rotate:0deg; animation-timing-function:ease-in;} 64%{rotate:25deg; animation-timing-function:ease-in-out;} 78%,100%{rotate:25deg;}}
```

`.ocBob` runs two animations on two properties (`translate` for the beat, `rotate` for the
pitch) and no `transform`; the `transform` sits on the parent div. The peel's translate only
needs the box to be `overflow:visible` (it is `position:fixed` with no clip) and its 240 px
climb ends above the sea, behind the dock — check the z-order in the proof, it must pass
*behind* any card it meets, which `.seaThing{z-index:0}` already gives.

### B4. The ghost ship (44 s, `dur` 44 500)

**Markup ask.** Two wrappers: `.ghHeave` > `<div class="ghPitch">` > svg (heave on one,
pitch on the other, as the boat does), and the lamp in `<g class="ghLampRig">` around the
`.ghLampFrame` and `.ghLamp` (the rig goes out and relights on the act's clock; the circle
breathes as a candle). `#sea-ghost{width:340px}` as the design review computed.

**Presence.** The ship never fades. It is at .5 from its first pixel at the right edge, and
three times during the crossing it *goes*: .5 → 0 in 400 ms with an ease-in (it accelerates
into nothing) and comes back 0 → .5 over 1.2 s with a long ease-out, somewhere further along
its line. Going is faster than coming, because the eye catches "gone" and only slowly admits
"back". The three intervals are unequal (6.0, 30.5, 39.0 s) and the middle one comes right
after the ship has moved off from the boat, so what the room sees is: it appears, it
vanishes, it is closer, it slows down behind our boat and its lamp goes out, our pennant
lashes, the lamp comes back, it moves off, it vanishes, it is far away, it winks, it is gone
off the edge.

**The heave** stays on the wave clock but at .6 of the boat's amplitude (a hull that size
does not ride the chop) and gains a pitch of ±1.2° about the waterline a quarter period ahead
of the heave, the boat's own rule. **The lamp** is a candle in a hull: the pumpkin's breath at
a slower tempo (9 s, amplitude .7–1, a gutter at 71 %), and on the act's clock it is snuffed
in 150 ms at 22.0 s and relit at 28.2 s with a flare — overshoot to 1, settle to .85 over half
a second. **The sails** hang from their yards, so each swings from its top edge (`skewX`
about `50% 0` of its own box), ±2–4° on four different periods with the sea's `--sine`; the
rags on the bare main yard swing the most and fastest, the mizzen the least. **The pennant**
streams on the boat's wind (`--flut`, `--flutT` × 1.6 for the longer cloth) so the two flags
answer the same gusts.

**The notice.** Speed change and a pause. The ship holds 79 px/s to 20 s, decelerates over
4 s to a near-stop with its centre over the boat (`-58vw - 425px`: the box's centre is 105 px
into the scaled box and the boat sits at 42vw), hangs there 3.5 s drifting 6 px, then gets
under way with an ease-in and holds a slightly slower 60 px/s to the exit. The lamp goes out
1.5 s into the deceleration and comes back .7 s after the ship moves off. On the boat, a cold
gust: the swallow-tail lashes at 23.1 s and the rig heels 2° away and shivers back
(`boat:"haunted"`). If the gull is perched it does not leave — this is not loud — but it turns
to face the ship at 18 s and holds the stare until 40 s (`glStare` replaces `glLook` for the
act; which `scaleX` faces right must be read off the gull's drawing).

| t | the eye sees | why |
|---|---|---|
| 0 | a slate-grey galleon enters at the right edge, already ghosted, lamp lit | no fade in |
| 6.0–6.4 | gone | the first vanish, fast |
| 8.2–9.4 | back, 3 vw further on | slow return |
| 9.4–20 | it crosses steadily; sails swing; the lamp breathes | the base |
| 20–24 | it slows | the speed change: the room notices it noticing |
| 22.0 | the lamp goes out | the ship is looking |
| 23.1 | the boat's pennant lashes, the rig heels 2° | the gust that reaches us |
| 24–27.5 | the ship hangs behind the boat | the pause is the beat |
| 27.5–31 | it gathers way | ease-in |
| 28.2–28.7 | the lamp flares and settles | it is done looking |
| 30.5–30.9 | gone | |
| 34.5–35.7 | back, far to the left | |
| 39.0–39.3 / 40.3–41.5 | a wink | the last, briefest, so the exit is not the last thing |
| 44 | off the left edge | |

```css
/* ---- ghost ship (44s): a hull that is there, then not; a hang behind the boat; a candle in a hull ---- */
#sea-ghost{bottom:2px; left:auto; right:-320px; width:340px; height:184px;}
.ghHeave, .ghPitch{transform-origin:50% 100%;}
.ghShip{opacity:.5;}
.ghSail{fill:var(--navy); opacity:.66; transform-box:fill-box; transform-origin:50% 0;}
.ghPennant{transform-box:view-box; transform-origin:118px 6px;}
body.waveMotion #sea-ghost.go{animation:ghDrift 44s linear both;}
body.waveMotion #sea-ghost.go .ghHeave{animation:ghHeave calc(var(--T1) / 2) var(--sine) infinite alternate;}
body.waveMotion #sea-ghost.go .ghPitch{animation:ghPitch calc(var(--T1) / 2) var(--sine) calc(var(--T1) / -4) infinite alternate;}
body.waveMotion #sea-ghost.go .ghShip{animation:ghGone 44s linear both;}
body.waveMotion #sea-ghost.go .ghLampRig{animation:ghSnuff 44s linear both;}
body.waveMotion #sea-ghost.go .ghLamp{animation:ghCandle 9s linear infinite;}
body.waveMotion #sea-ghost.go .ghSail{animation:ghSwing 3.1s var(--sine) infinite alternate;}
body.waveMotion #sea-ghost.go .ghSail:nth-of-type(2){animation-duration:2.3s; animation-name:ghSwingBig;}   /* the topsail's rag */
body.waveMotion #sea-ghost.go .ghSail:nth-of-type(3){animation-duration:2.7s; animation-name:ghSwingBig; animation-delay:-1.1s;}   /* the rags on the bare yard */
body.waveMotion #sea-ghost.go .ghSail:nth-of-type(4){animation-duration:3.7s; animation-name:ghSwingSmall;}   /* the mizzen */
body.waveMotion #sea-ghost.go .ghPennant{animation:ghStream calc(var(--flutT) * 1.6) var(--sine) infinite alternate;}
@keyframes ghDrift{
  0%{transform:translateX(0) scale(var(--ls, 1)); animation-timing-function:linear;}
  45.5%{transform:translateX(calc(-58vw - 345px)) scale(var(--ls, 1)); animation-timing-function:cubic-bezier(.2,.6,.3,1);}   /* 20.0 */
  54.5%{transform:translateX(calc(-58vw - 425px)) scale(var(--ls, 1)); animation-timing-function:linear;}                     /* 24.0 centred behind the boat */
  62.5%{transform:translateX(calc(-58vw - 431px)) scale(var(--ls, 1)); animation-timing-function:cubic-bezier(.5,0,.8,.5);}   /* 27.5 the hang */
  70.5%{transform:translateX(calc(-70vw - 480px)) scale(var(--ls, 1)); animation-timing-function:linear;}                     /* 31.0 under way */
  100%{transform:translateX(calc(-100vw - 680px)) scale(var(--ls, 1));}}
@keyframes ghHeave{from{translate:0 calc(var(--h1) * .6px);} to{translate:0 calc(var(--h1) * -.6px);}}
@keyframes ghPitch{from{rotate:calc(var(--p1) * .24);} to{rotate:calc(var(--p1) * -.24);}}
@keyframes ghGone{
  0%,13.6%{opacity:.5; animation-timing-function:cubic-bezier(.6,0,1,.6);}  14.5%{opacity:0; animation-timing-function:linear;}       /* 6.0–6.4 */
  18.6%{opacity:0; animation-timing-function:cubic-bezier(.1,.7,.3,1);}     21.4%{opacity:.5; animation-timing-function:linear;}     /* 8.2–9.4 */
  45.5%{opacity:.5; animation-timing-function:ease-in-out;}                 54.5%{opacity:.6; animation-timing-function:ease-in-out;}  /* it is clearest while it hangs */
  62.5%{opacity:.6; animation-timing-function:ease-in-out;}                 69.3%{opacity:.5; animation-timing-function:cubic-bezier(.6,0,1,.6);}
  70.2%{opacity:0; animation-timing-function:linear;}                       78.4%{opacity:0; animation-timing-function:cubic-bezier(.1,.7,.3,1);}   /* 30.5–34.5 */
  81.1%{opacity:.5; animation-timing-function:linear;}                      88.6%{opacity:.5; animation-timing-function:cubic-bezier(.6,0,1,.6);}
  89.3%{opacity:0; animation-timing-function:linear;}                       91.6%{opacity:0; animation-timing-function:cubic-bezier(.1,.7,.3,1);}   /* 39.0–40.3 */
  94.3%,100%{opacity:.5;}}
@keyframes ghSnuff{0%,49.7%{opacity:1; animation-timing-function:cubic-bezier(.6,0,1,.6);} 50%{opacity:0; animation-timing-function:linear;}   /* 22.0 snuffed in 150ms */
  64.1%{opacity:0; animation-timing-function:cubic-bezier(.1,.8,.3,1);} 64.6%{opacity:1; animation-timing-function:ease-in-out;}              /* 28.2 the flare */
  65.2%{opacity:.8; animation-timing-function:ease-in-out;} 66%,100%{opacity:1;}}                                                          /* 28.7 settled (the candle's own breath does the rest) */
@keyframes ghCandle{0%{opacity:1; animation-timing-function:ease-in-out;} 14%{opacity:.78; animation-timing-function:ease-in-out;} 25%{opacity:.95; animation-timing-function:ease-in-out;}
  41%{opacity:.72; animation-timing-function:ease-in-out;} 55%{opacity:1; animation-timing-function:ease-in-out;} 70%{opacity:.85; animation-timing-function:cubic-bezier(.6,0,.9,.4);}
  71%{opacity:.25; animation-timing-function:cubic-bezier(.1,.8,.3,1);} 72.5%{opacity:1; animation-timing-function:ease-in-out;} 80%{opacity:.8; animation-timing-function:ease-in-out;} 100%{opacity:1;}}
@keyframes ghSwing{from{transform:skewX(-2.5deg);} to{transform:skewX(2deg);}}
@keyframes ghSwingBig{from{transform:skewX(-4deg) scaleY(1);} to{transform:skewX(3deg) scaleY(.97);}}
@keyframes ghSwingSmall{from{transform:skewX(-1.5deg);} to{transform:skewX(2deg);}}
@keyframes ghStream{from{transform:skewY(calc(var(--flut) * -1.3)) scaleX(1);} to{transform:skewY(var(--flut)) scaleX(.94);}}
/* the boat while it passes: a cold gust at 23.1s — the rig heels away and shivers, the streamer lashes (B8) */
body.waveMotion #boat.haunted .btRig{animation:btHaunt 44s linear both;}
@keyframes btHaunt{0%,52.5%{rotate:0deg; animation-timing-function:cubic-bezier(.5,0,.8,.4);} 53.5%{rotate:-2deg; animation-timing-function:ease-in-out;}
  55%{rotate:1deg; animation-timing-function:ease-in-out;} 56.5%{rotate:-.5deg; animation-timing-function:ease-in-out;} 58%,100%{rotate:0deg;}}
body.waveMotion #boat.haunted.gull .glPerch{animation:glStare 44s linear both;}
@keyframes glStare{0%,40%{transform:scaleX(1);} 41%,91%{transform:scaleX(-1);} 92%,100%{transform:scaleX(1);}}   /* 18–40s; check which sign faces right */
```

### B5. The castaway pumpkin (46 s, `dur` 46 500)

**Markup ask.** Two wrappers inside `.cwRoll` (which keeps its `rotate(12 30 30)` attribute
and must never be animated): `<g class="cwList">` (the windy-weather capsize, `rotate`) >
`<g class="cwSway">` (the chop rock, `rotate`), both `transform-box:view-box`, origin
`30px 30px` — the waterline's centre, so it rocks about the water and not about its own belly.
Inside the lit face, `<g class="ocFlame">` as on the sand.

**Direction.** The design review sends it left. I am sending it right, with the buoy and the
paper boat: in this sea the things with volition go left and the flotsam goes right, and a
pumpkin is flotsam. Two drift directions for the floating things would say two winds.

**Motion.** It heaves on `thingHeave` (phase aligned by `Sea.play`, the buoy's rule), rocks
±3° on the chop clock (a small round thing answers the chop, not the swell), and its candle
breathes on the pumpkins' keyframes at a 15 s cycle with a slower shiver. One ring at the
waterline at 5.5 s, when it is 12 % in and visible — a ring at t = 0 is spent off-screen.
In **windy weather** it has the paper boat's story: at 30 s it starts to list (28° over 3 s,
taking water), at 34 s it goes over to 62° in 1.2 s, and at the moment the mouth reaches the
water the candle drowns — the cuts go dark in 120 ms, the leak with them — and it floats on
its side, dark, to the edge. The drowned candle is the one October beat that is *sad*, and it
is the best one.

| t | the eye sees | why |
|---|---|---|
| 0–5.5 | an orange spot enters at the left edge, bobbing | |
| 5.5 | a ring spreads at its waterline | "it just came up" |
| 5.5–46 | it drifts right, rocking on the chop, face breathing | the base |
| (windy) 30–33 | it leans | a slow change: the eye asks why |
| (windy) 34–35.2 | it goes over; the face goes dark at 34.9 | the candle drowns as the mouth meets the water |
| (windy) 35.2–46 | a dark pumpkin on its side drifts out | |

```css
/* ---- castaway pumpkin (46s, far/near): flotsam, drifts right, a candle that can drown ---- */
#sea-castaway{bottom:4px; left:-70px; width:60px;}
#sea-castaway.far{bottom:15px;}  #sea-castaway.near{bottom:0;}
.cwList, .cwSway{transform-box:view-box; transform-origin:30px 30px;}
body.waveMotion #sea-castaway.go{animation:cwDrift 46s linear, thingHeave calc(var(--T1) / 2) var(--sine) infinite alternate;}
body.waveMotion #sea-castaway.go .cwSway{animation:cwRock calc(var(--T2) / 2) var(--sine) infinite alternate;}
body.waveMotion #sea-castaway.go .ocFace{animation:ocBreath 15s linear infinite;}
body.waveMotion #sea-castaway.go .ocFlame{animation:ocShiver 1.4s linear infinite;}
body.waveMotion #sea-castaway.go .ocLeak{animation:ocLeakBreath 15s linear infinite;}
#sea-castaway .seaRing{animation-delay:5.5s;}
body[data-sea="windy"].waveMotion #sea-castaway.go .cwList{animation:cwCapsize 46s linear both;}
body[data-sea="windy"].waveMotion #sea-castaway.go .ocCut, body[data-sea="windy"].waveMotion #sea-castaway.go .ocLeak{animation:cwDrown 46s linear both;}
@keyframes cwDrift{from{transform:translateX(0) scale(var(--ls, 1));} to{transform:translateX(calc(100vw + 140px)) scale(var(--ls, 1));}}
@keyframes cwRock{from{rotate:-3deg;} to{rotate:2.4deg;}}
@keyframes cwCapsize{0%,65.2%{rotate:0deg; animation-timing-function:ease-in-out;} 71.7%{rotate:28deg; animation-timing-function:ease-in-out;}   /* 30–33 the list */
  73.9%{rotate:26deg; animation-timing-function:cubic-bezier(.6,0,.9,.5);} 76.5%{rotate:62deg; animation-timing-function:cubic-bezier(.2,.7,.3,1);}   /* 34–35.2 over */
  78%{rotate:58deg; animation-timing-function:ease-in-out;} 80%,100%{rotate:60deg;}}                                                            /* settles on its side */
@keyframes cwDrown{0%,75.6%{opacity:1; animation-timing-function:cubic-bezier(.6,0,1,.6);} 75.9%,100%{opacity:0;}}                               /* 34.9: the mouth meets the water */
```

On the windy `.ocCut` the drown writes `opacity` on the cuts while `.ocFlame` (their parent)
shivers and `.ocFace` breathes — three elements, three opacities, they multiply; nothing is
overwritten.

### B6. The bone fish (12 s, `dur` 12 500) and the haunt

The school's ghost darts on the school's clock — `scDart`'s four bursts and coasts — and adds
what a skeleton would: at each burst the tail snaps three quick beats and is dead still while
it coasts (a live fish sculls; bones do not), and the jaw drops open during every coast and
snaps shut on the next burst. The jaw is the silhouette change; the snap is the speed change.
Its best use is the **haunt** combo: the school first, the bone fish 2.2 s behind, so the
school's existing turn-around at 17–26 % ("they think better of it") now reads as the school
seeing what is behind it. October's uncommon, and it costs no new keyframes on the school.

| t | the eye sees | why |
|---|---|---|
| 0–.2 | a burst from the right edge, tail beating | `scDart`'s first dart |
| .2–1.4 | it coasts; the jaw drops open, slowly | the coast is the pause; the jaw is what it does with it |
| 3.6 | burst: the jaw snaps shut in 100 ms, three tail beats | |
| 3.7–7.0 / 8.4–9.6 | coast, jaw open | (the school ahead has turned around and turned back by 3.1 s) |
| 12 | off the left edge | |

```css
/* ---- bone fish (12s, far): the school's ghost on the school's clock ---- */
#sea-bones{bottom:-2px; left:100vw; width:64px;}
.bfJaw{transform-box:view-box; transform-origin:17px 15.4px;}
.bfTail{transform-box:view-box; transform-origin:52px 12px;}
body.waveMotion #sea-bones.go{animation:bfDart 12s linear both;}
body.waveMotion #sea-bones.go .bfJaw{animation:bfJaw 12s linear both;}
body.waveMotion #sea-bones.go .bfTail{animation:bfTail 12s linear both;}
@keyframes bfDart{0%{transform:translateX(0) scale(var(--ls, 1)); animation-timing-function:cubic-bezier(.1,.9,.2,1);} 12%{transform:translateX(-30vw) scale(var(--ls, 1)); animation-timing-function:linear;}
  30%{transform:translateX(-33vw) scale(var(--ls, 1)); animation-timing-function:cubic-bezier(.1,.9,.2,1);} 42%{transform:translateX(-58vw) scale(var(--ls, 1)); animation-timing-function:linear;}
  58%{transform:translateX(-60vw) scale(var(--ls, 1)); animation-timing-function:cubic-bezier(.1,.9,.2,1);} 70%{transform:translateX(-84vw) scale(var(--ls, 1)); animation-timing-function:linear;}
  80%{transform:translateX(-86vw) scale(var(--ls, 1)); animation-timing-function:cubic-bezier(.1,.9,.2,1);} 100%{transform:translateX(calc(-100vw - 200px)) scale(var(--ls, 1));}}
/* the jaw: shut on each burst (0, 30, 58, 80%), drops open through each coast */
@keyframes bfJaw{0%{transform:rotate(0); animation-timing-function:cubic-bezier(.2,.7,.4,1);} 12%{transform:rotate(0); animation-timing-function:cubic-bezier(.3,0,.5,1);}
  27%{transform:rotate(24deg); animation-timing-function:cubic-bezier(.6,0,1,.6);} 30.8%{transform:rotate(0); animation-timing-function:linear;}
  42%{transform:rotate(0); animation-timing-function:cubic-bezier(.3,0,.5,1);} 55%{transform:rotate(24deg); animation-timing-function:cubic-bezier(.6,0,1,.6);} 58.8%{transform:rotate(0); animation-timing-function:linear;}
  70%{transform:rotate(0); animation-timing-function:cubic-bezier(.3,0,.5,1);} 78%{transform:rotate(22deg); animation-timing-function:cubic-bezier(.6,0,1,.6);} 80.8%{transform:rotate(0); animation-timing-function:linear;}
  100%{transform:rotate(0);}}
/* the tail: three beats in the first 300ms of each burst, dead still on the coast */
@keyframes bfTail{0%{transform:rotate(-22deg);} .8%{transform:rotate(22deg);} 1.6%{transform:rotate(-22deg);} 2.5%{transform:rotate(18deg);} 3.3%,30%{transform:rotate(0);}
  30.8%{transform:rotate(-22deg);} 31.6%{transform:rotate(22deg);} 32.5%{transform:rotate(-18deg);} 33.3%,58%{transform:rotate(0);}
  58.8%{transform:rotate(-22deg);} 59.6%{transform:rotate(22deg);} 60.5%{transform:rotate(-18deg);} 61.3%,80%{transform:rotate(0);}
  80.8%{transform:rotate(-22deg);} 81.6%{transform:rotate(22deg);} 82.5%{transform:rotate(-18deg);} 83.3%,100%{transform:rotate(0);}}
```

### B7. The vine

Nothing, while idle. A 2.6-unit line on the sand has no motion the room can see, and idle
motion on the ground under three breathing pumpkins would be noise. It gets one secondary
action: group the green sprout (`ocBodyGreen`, `ocSeamGreen`, `ocStemSmall`) as
`<g class="ocSprout">` with its origin at its base, and when P3 — the pumpkin resting against
the vine's end — is tapped, the sprout gets a 4 % squash 90 ms later. The vine transmitted
the push. It is a joke for the front row, and it says the patch is connected.

```css
.ocSprout{transform-box:view-box; transform-origin:240.5px 111.5px;}
body.waveMotion #ocPumpkins.p3tap .ocSprout{animation:ocSproutNudge .4s linear .09s 1;}
@keyframes ocSproutNudge{0%{transform:scale(1,1); animation-timing-function:cubic-bezier(.3,0,.6,1);} 25%{transform:scale(1.04,.96); animation-timing-function:cubic-bezier(.2,.7,.3,1);}
  60%{transform:scale(.99,1.015); animation-timing-function:ease-in-out;} 100%{transform:scale(1,1);}}
```

The handler adds `p3tap` to `#ocPumpkins` for 600 ms when the third pumpkin is pressed.

### B8. The boat's swallow-tail

**Markup ask.** Wrap the burgee: `<g class="btBurgeeRig"><path class="btBurgee" …/></g>`, both
with `transform-box:view-box; transform-origin:20px 3.9px` (the hoist). The path flutters all
month; the group carries the victory flick (moved off the path) and the ghost's lash, which
never coincide (the director's `busy()` keeps boat acts apart). Without the wrapper the
flutter freezes for the 17 s of the attack before the flick.

An 11-unit streamer on a 4.6-unit burgee's origin does not flap, it whips: `skewY` from the
hoist at 1.6 × `--flut` on the way out and 1.2 × on the way back (a flag snaps harder one
way than the other), with a 4 % `scaleX` breath so the fly appears to curl toward the viewer,
on `--flutT` × 1.1 — a longer cloth is a slower one. Calm 2.4°/1.8°, breezy 4.8°/3.6°, windy
9.6°/7.2°: the same wind as the sail's pennant text, read off the same variables. The lash for
the ghost: at 23.1 s of the 44 s clock, three decaying snaps in 1.1 s, −16° / +12° / −6°.

```css
.btBurgeeRig, .btBurgee{transform-box:view-box; transform-origin:20px 3.9px;}
body.october .btBurgee{fill:var(--navy);}
body.october.waveMotion .btBurgee{animation:ocStream calc(var(--flutT) * 1.1) var(--sine) infinite alternate;}
@keyframes ocStream{from{transform:skewY(calc(var(--flut) * -1.6)) scaleX(1);} to{transform:skewY(calc(var(--flut) * 1.2)) scaleX(.96);}}
body.waveMotion #boat.struck .btBurgeeRig{animation:btFlick 20s linear both;}       /* moved from .btBurgee */
body.waveMotion #boat.haunted .btBurgeeRig{animation:btLash 44s linear both;}
@keyframes btLash{0%,52.5%{transform:skewY(0) scaleX(1); animation-timing-function:cubic-bezier(.5,0,.8,.3);}
  53%{transform:skewY(-16deg) scaleX(1.1); animation-timing-function:ease-in-out;} 53.7%{transform:skewY(12deg) scaleX(1.04); animation-timing-function:ease-in-out;}
  54.4%{transform:skewY(-6deg) scaleX(1); animation-timing-function:ease-out;} 55%,100%{transform:skewY(0) scaleX(1);}}
```

---

## C. The director

### The `ACTS` rows

| act | tier | `dur` | lanes | flags | notes |
|---|---|---|---|---|---|
| `bats` | uncommon | 11 000 | far | `loud:true`, `season:"october"` | b4 exits at 10.6 s. Loud, so the gull leaves 3.2 s ahead: "the gull leaves, then the bats come" is the gull knowing, which is the sea's grammar for it. |
| `ghost` | rare | 44 500 | far | `boat:"haunted"`, `season:"october"`, `incompatible:["pennant","attack","whale"]`, `notBefore:12` | Not loud — the gull stays and stares. `busy()` already keeps the boat acts apart; `incompatible` is belt and braces for the summon pool. |
| `castaway` | common | 46 500 | far, near | `greeting:true`, `season:"october"` | A lit pumpkin drifting past as kids sit down is the right October greeting. Common, so it may play under a running timer. |
| `bones` | uncommon | 12 500 | far | `season:"october"` | Rarely alone; mostly through the haunt. |
| `haunt` | uncommon | 14 700 | — | `combo:[["school",0],["bones",2200]]`, `season:"october"` | Weight .4 like any uncommon; the school inside it counts as a school sighting for memory. |

The sand pumpkins, the web and the spider are not acts: they are furniture with idle cycles
and tap answers, and the director never touches them. The swallow-tail flutter is on
`body.october` alone.

### Reactions between pieces

The gull leaves before the bats (the `loud` mechanism, free). The boat's pennant lashes and
its rig heels for the ghost (`boat:"haunted"`, B4/B8). The gull stares at the ghost. Nothing
else reacts to anything: the castaway is flotsam, the bone fish frightens the school by
timing alone, and the serpent, whale and dolphins ignore October entirely — the month is a
visitor in *their* sea, and the strongest way to keep the sea's dignity is for the residents
to be unimpressed.

### Across a class period

The existing arc stands (greeting at 45 s, hush to ten minutes, an act every 3–7 minutes,
rares in the last third, nothing in the last three minutes, commons only under a timer or
the settle-in). Two October rules on top, both inside `plan()` so they stay pure:

1. **At most two October acts per period**, and the ghost at most once. The plan counts
   `ACTS[k].season` picks and zeroes the season's weights once it has two. Without this, in
   the last week the tier weights let a period become a Halloween parade, and the sea stops
   being the sea.
2. **The ghost never plays while the settle-in or a timer runs** — it is rare, so the
   existing "commons only" gate already does this. The castaway *may* greet during the count:
   it is a 46 s far-lane drift like the turtle's, and the count is a number on the clock
   card, not a thing the sea can compete with. Nothing October has a beat under 20 s that
   would pull an eye to the sea at the count's end; the bats' dip is at 4–5 s of an act that
   can only start in the hush or later.

### Across the month

`plan(dateStr, …)` already receives the date; the change is a **day-of-month weight** applied
to every act with `season:"october"`, and a Halloween flag. Written as the pure function the
director is:

| dates (2026) | October weight | what the room sees |
|---|---|---|
| Oct 1–11 | × .35 | a bat crossing perhaps once a week per period; the castaway as an occasional greeting; **no ghost** (`notBefore:12`). The pumpkins and web are up from the 1st — the furniture is the announcement, the acts are the rumour. |
| Oct 12–23 | × 1 | October at the tier weights; the ghost possible in a last third, thinned by memory like any rare. |
| Oct 26–29 | × 1.8 | most periods see a bat crossing or a haunt; the ghost's memory thinning halved so a class that saw it Monday may see it Thursday. The sand pumpkins P1 and P3 load already **lit** (`Season.apply` adds `.lit` to two of three when `day ≥ 26`), so the room is lit all week without anyone tapping. |
| Halloween — Oct 31 is a Saturday this year, so **Friday Oct 30** (the rule: the 31st, or the last weekday before it) | × 2.5, cap 3 per period | the greeting is the castaway in every period; the ghost is **guaranteed** in every period's last third (`plan` pushes it if the weighted draw did not); the bats may cross twice; all three pumpkins load lit. Still no rares in the hush, still nothing in the last three minutes, still commons only under a timer. |

The weight multiplies into `w[k]` beside the tier and memory factors, so the same date and
period still give the same show, and a test can ask `plan("2026-10-30", 3, 50, 5, null)` and
expect a ghost. The cap of two (three on the 30th) is applied after the draw, by zeroing the
season's weights in `w` for the rest of the loop. Halloween's guaranteed ghost is inserted at
the first slot after the two-thirds mark, replacing whatever was drawn there, and only if the
period is at least 30 minutes long (a 20-minute advisory does not have a last third worth
44 s of ship).

Outside class periods the free-time scheduler's pool is `tier !== rare && lanes` — the bats,
castaway and bones qualify automatically, the ghost never does, and that is right: the ghost
is a show for a class that has been sitting an hour, not for the hallway.

---

## D. Proof plan

Frame-grab with the aquarium (`tools/aquarium.html`) at 1920 × 1080 and again at one third,
the design review's 8 m check; motion that only reads at full size does not exist. The times
are seconds from `.go` (or from the tap).

**Spider, idle (run the cycle at 20× in the aquarium or set `animation-delay:-93s`).** 93.0,
93.2 (the 2-unit hitch up — barely there, it should be), 93.7 (stopped at 26, the thread
1.65×), 95.1 (61 — the overshoot), 95.8 (58 at rest), 100.8 (rear legs curled), 106.5 /
107.7 / 108.9 (the three pulls — three frames that should look like three *different*
heights with the spider's legs at rest, not a blur), 109.3 (home). Then 41.1 (the twitch, one
leg only) and 88.35 (edge-on: the silhouette must be a vertical sliver).

**Spider, tap.** 0.22 (tucked, up 3, legs in), 0.5 (mid-fall — motion blur is fine, but the
thread must end at the spinnerets), 0.72 (the bottom, 112), 0.86 (122, legs splayed), 1.10,
1.32, 1.52 (three decreasing bounces — grab all three and lay them side by side; the
differences should be 18, 11, 6), 2.6 (edge-on mid-turn), 3.85 / 4.8 / 5.75 / 6.75 (the four
pulls), 7.0 (home). Then tap again at 2.5 s and grab 2.5, 2.9, 3.1: the spider must fall
*from 112*, never from 0. Tap at 0.9 s and grab 0.9 vs an untapped 0.9: identical.

**Pumpkins.** A 13 s strip at 5 fps of one lit pumpkin, eyes on the mouth's opacity: the
breaths must be unequal and the gutter at 7.4–7.6 must be the one place the puddle *shrinks*.
Then a 20 s strip of all three lit at 2 fps: at no frame should all three be at a trough
together, and at 6.3 (P2) and 9.8 (P3) only that pumpkin is guttering. Tap: 0, 0.07 (flattest;
the new face is already showing), 0.12 (lid still down while the body springs), 0.19 (body at
its tallest, lid at its highest), 0.30, 0.46 — and the shadow ellipse identical in all six. Tap
P3 and grab 0.16 and 0.30 with the vine's sprout in frame. At one third: the tap must read as
"it jumped", not "it changed".

**Bats.** 0.1 (b1 alone at the right edge — nothing ghosting in), 1.2 (all five in, five
different heights), 2.0 and 2.4 (the same bats: the wing positions must be *uncorrelated*
between the two frames), 3.9 (b1 nose-down), 4.7 (b1 at the bottom, b2 nose-down, b3 level),
5.4 (b1 above the line, b2 at the bottom), 6.2 (b5 banking), 7.4 (b5 climbing out, b4 plodding
below), 9.0 (b1 gone, b4 still there), 10.6. A 0.4 s strip at 60 fps of b1's right wing: the
angle must cross from +26 to −30 in the first 14 frames and take the remaining 10 to come
back. At one third: five specks with five rhythms, one swooping.

**Ghost.** 0.1 (at the edge, opacity .5, no ramp), 6.2 (half gone — it should look *cut off*,
not faded), 8.8 (half back), 20 / 22 / 24 (slowing: measure the x step between the three
frames, 79 px/s → ~40 → ~0), 22.1 (lamp out), 23.2 (the boat's streamer lashed, rig heeled),
25.5 (the hang: ship centred behind the boat, lamp dark, sails swinging, opacity .6), 28.4
(lamp flared), 30.7 (going), 35 (back, far left), 40 (the wink), 43.9. Also one grab with the
gull perched at 19 and at 41. At one third: the hang must be findable in under a second, and
the vanishes must read as "gone" from a frame-to-frame comparison at 4 fps.

**Castaway (windy).** 5.5 (ring), 12 (rocking on the chop against the boat's roll on the
swell — different periods), 31.5 (leaning), 34.9 (going over, face lit), 35.1 (face dark),
40 (on its side). And 12 in calm and breezy weather: the same pumpkin, upright to the end.

**Bone fish / haunt.** In the combo: 2.3 (the school ahead, the bone fish entering), 3.2
(the school mid-turn, the fish's jaw open behind them), 3.7 (jaw shut, tail mid-beat), 8.9
(jaw wide on the coast). A 0.3 s strip at 60 fps of the tail at 3.6–3.9: three beats then
stillness.

**Swallow-tail.** 60 fps for 1.2 s in breezy weather: the streamer's skew must run −4.8° →
+3.6° and back, never symmetric; the same in windy at −9.6° / +7.2°. During an attack at 17 s
(before the flick) the streamer must still be moving.

**Budget.** DevTools → Rendering → Paint flashing with all three pumpkins lit and the spider
hanging: only the pumpkin svg and the web svg should flash, at ≤ 36 000 px² and ≤ 4 000 px²
respectively. Then with the ghost at 25 s: the ghost box, the boat, and nothing on the sand
beyond the pumpkins. 4× CPU throttling; if the frame time passes 4 ms of main-thread work
with the pumpkins lit, drop `ocShiver` first and `ocLeakBreath` second — the breath and the
puddle are the candle; the rest is finish.

---

## What to carry into the code, in order

1. The markup wrappers (B1 `.ocSpin`; B2 `.ocSquash`, `.ocLidGrp`, `.ocFlame`, classes
   `p1/p2/p3`; B4 `.ghPitch`, `.ghLampRig`; B5 `.cwList`, `.cwSway`; B7 `.ocSprout`; B8
   `.btBurgeeRig`). Every one exists because two motions meet on one element or an animation
   would overwrite a placement attribute.
2. The keyframes above, verbatim, replacing `ocDangle`, `ocDropNow`, `ocThread`,
   `ocThreadNow`, `ocFlicker`, `ocSquash`, `ocBatFly`, `ocBob`, `ocFlapL/R`, `ghFade`,
   `ghLamp`, and the `#111A26` rule.
3. The `Season` handlers: the 70 ms face flip, the drop / redrop / poke logic with the
   `--sy` / `--st` read, the three-per-minute cap, the idle restart, `p3tap`, and the
   pre-lit pumpkins from the 26th.
4. The `ACTS` rows and the two `plan()` rules (the per-period cap, the day-of-month weight
   with `notBefore` and the Halloween push).
5. The proof frames in D, before anyone trusts any of it.

