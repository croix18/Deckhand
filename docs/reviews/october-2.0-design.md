# October 2.0 — character-design review of the decorations (Sep 26, 2026)

Reviewer: a character designer / illustrator, same brief as `sea-2.0-design.md`: flat-vector,
navy-silhouette register, everything judged at the size the room sees it and again at a
one-third downscale (the 8 m check). I read the v7.10 October CSS and markup, the proof sheet
`october-1.0-proofs.png`, the three board grabs, `SEA.md`, and the boat and cast markup so the
new pieces come from the same hand. Every drawing below was rendered on
`october-2.0-proofs.html` / `.png` beside this file, at full size, at board size, and at 1/3.

The short verdict: the first attempt is a set of clip-art defaults. Ellipse pumpkins with
isoceles-triangle eyes, a web that is a protractor, a spider that is two dots and eight
strokes, one bat pasted five times, and a ghost ship that is a line drawing at half opacity on
a cream sky. None of it was drawn the way the serpent and the whale were drawn — silhouette
first, one line of action, tapers, nothing symmetric — and it shows next to them. Section B
redraws every piece; section C adds three that belong to this world rather than to a party
store. The palette stays exactly as agreed (one orange and its shade, the highlighter yellow
for lit faces); one off-palette colour in the current code is called out and removed.

---

## A. What is wrong with the current pieces

**Pumpkins.** Three copies of one drawing at three scales, and the drawing is an `<ellipse>`
with two concentric ellipses for ribs. That is the symbol of a pumpkin, not a pumpkin. A
pumpkin is a stack of lobes: the silhouette itself dips where the lobes meet at the top and
the bottom, the stem sits in a depression, the ribs are not lines on a surface but the
valleys between lobes, so they are heavy where the lobes meet (top and bottom) and thin at
the equator. The stem is a teal fish-hook, a glyph. The 3-unit shade outline around the whole
body is a sticker edge — nothing in the sea has an outline except made objects. The faces
are the defaults: isoceles triangles for eyes, an isoceles triangle for a nose, a zig-zag or a
round "O" for the mouth. A knife does not cut curves; a carved face is flats and corners, the
teeth are rectangular notches, and no two cuts on a real pumpkin are the same size. The lit
state changes the cut colour to yellow and nothing else: there is no candle, because the light
falls nowhere — no spill on the sand, no crack of light at the lid (the lid cut, the one
thing that says *carved*, is not drawn at all). At board size (~80 px each) the three read as
one orange blob repeated; at 8 m the faces vanish because the cuts are too small relative to
the body (the eyes are 15 % of the width; they need to be 20 % and the mouth 60 %).

**Web.** Seven evenly spaced spokes from the exact corner and four concentric arcs of the same
sweep. That is a drafted quadrant, not a spun one: an orb weaver's hub is inside the web, not
on the substrate; the radii are unevenly spaced (the spider lays them by feel); the capture
thread is one continuous spiral whose radius grows every segment, not a set of arcs; each
segment between two radii sags a little toward the hub; the frame is a separate thread
anchored to the substrate by guys; and every real web has a tear. At 35 % ink, 1 px lines on
white, the current one is invisible from the third row and merely "some lines" from the first.

**Spider.** Two circles and eight radial strokes of one weight — a tick, or an asterisk with
a body. No abdomen-to-cephalothorax proportion (an orb weaver's abdomen is the whole
drawing: an egg twice the size of the head end), no leg articulation (femur, patella, tibia,
tarsus — a leg has a knee and it tapers to nothing), the legs radiate as if from the centre
of a wheel, and two turquoise eyes at the top make it a face looking up the thread. It hangs
head-up: a spider on a dragline hangs head-DOWN with the abdomen at the thread.

**Bat.** One silhouette, five times. The shape is a bird: smooth-arc leading edge, two
scallops that read as a gull's trailing edge, a body that is a bullet with two 1-unit ear
nubs nobody will see at 38 px. What makes a bat at that size is the *bent* leading edge
(shoulder → elbow → wrist, a bat's wing is an arm), three deep membrane scallops between long
fingers, big ears on a small head, and a tail membrane between the feet. The flapping is a
±35° rotation of the same shape, so the flock is five metronomes.

**Ghost ship.** The concept is right (far lane, drifting, a lamp that fails) and the drawing
is a line-art schooner: a flat symmetric hull, two straight masts of equal rake, four sails
drawn as polygons with notches, no yards, no bowsprit, no sheer. Half-opacity navy lines on a
cream sky do not carry a 210 px object from the back of a room; the eye needs *mass*. The
hull is filled paleturq — which at 50 % on a cream-and-turquoise horizon is the colour of
the water it sits on. It is a ghost in the wrong sense: the room cannot find it.

**Black pennant.** `fill:#111A26` is a colour outside the palette (the brief allows exactly
two additions and this is neither), and at 1.5 × of a 4.6-unit triangle it is
indistinguishable from the everyday navy burgee. Nothing about it says October.

---

## B. The redesigns

Conventions, same as the sea: solid navy silhouettes, one dominant curve, one paleturq eye
in the front third, tapers everywhere, nothing symmetric, joints as `<g>` with a
`transform-origin` at the joint in view-box units. Made objects (the pumpkins, the ship) get
no outline: they are read by their fill against the sand and the sky. The pumpkin orange
`#E8862A` with shade `#C46A16` and the lit yellow `#FFE45C` are the only additions; the
contact shadows on the sand use the board's own `--shadow` (`#D8C5A0`).

### B1. Pumpkins — three individuals

One box, `viewBox="0 0 272 120"`, ground line y = 112, replacing the 320-wide box so each
pumpkin gains about 15 % on the board at the same CSS width.

- **P1, the squat one** (104 × 57). Dominant curve: the wide belly, heavier below the
  equator (widest point at y = 44 of 13–70). Five front lobes: the outline dips at (52,20)
  under the stem and at (52,67) at the base. Ribs are filled crescents in the shade colour
  — tapered to nothing at the top and bottom, 3.5 units at the equator — so the line weight
  follows the lobe. The stem is a short woody knob with a flared collar, kinked right,
  cut on the bias. The face: a wide grin with two teeth hanging from the top cut and one
  standing from the bottom, offset so they interlock; kite eyes with flat bottoms, the right
  one larger; a tilted trapezoid nose.
- **P2, the tall one** (62 × 96, leaning 6° to the left on its base). Dominant curve: the
  long vertical lobe. A long stem, a curling tendril off its base, and a three-lobed leaf
  hanging over the right shoulder with a paleturq midrib (the only paleturq on the sand).
  Face: high narrow eyes at different heights, an eight-sided "O" of a mouth — an O cut with
  a knife has corners.
- **P3, the lopsided one** (80 × 63, leaning 13° against P2 — it rests on its neighbour,
  which is the story of the group). One shoulder sits higher than the other and the
  bottom-right has a flat where it grew against the ground. Face: a sly sideways grin that
  rises to the right, one eye small, the other high and wide.

**The lid.** Each pumpkin carries a lid cut — a jagged run of straight segments around the
stem in the shade colour. That single line is what says *carved* from across the room, and it
is the light's second exit: when lit, a 1-unit yellow stroke on the same path (`.ocLeak`)
reads as the crack of light under the lid.

**The lit state — where the light falls.** A candle sits on the floor of the pumpkin, so:
the cuts go yellow (existing flicker keeps running on the face group); the lid seam leaks;
and a yellow ellipse (`.ocGlow`, opacity .55) appears on the sand in front, centred under the
mouth and biased toward the viewer — the mouth is the biggest cut and the lowest, so the
puddle is brightest there. The contact shadow (`.ocShade`) stays: a lit pumpkin at dusk
still sits on the ground.

**Faces.** Two per pumpkin, each cut for that body (a face cut for the squat one cannot be
lifted onto the tall one — the cuts follow the lobes). `Season.FACES` becomes 2; the tap
still lights and flips.

```html
<svg id="ocPumpkins" viewBox="0 0 272 120" aria-hidden="true">
<g class="ocPumpkin" data-face="0" transform="translate(6 42)">
  <ellipse class="ocShade" cx="54" cy="70" rx="50" ry="5"/>
  <ellipse class="ocGlow" cx="50" cy="72" rx="34" ry="5.5"/>
  <path class="ocStem" d="M45,22 C46,17 47,13 48,8 L47,4 C48,2 53,1 58,3 L60,5 C58,8 58,13 60,17 L61,22 Q53,24.5 45,22 Z"/>
  <path class="ocStemLine" d="M53,4 C52,9 52.5,14 54,20"/>
  <path class="ocBody" d="M6,44 C6,24 22,12 40,16 C44,17 48,20 52,20 C56,20 60,17 64,16 C82,12 98,24 98,44 C98,58 84,68 66,69 C60,69.5 56,68 52,67 C48,68 44,69.5 38,69 C20,68 6,58 6,44 Z"/>
  <path class="ocSeam" d="M44,18 C31,30 31,56 43,67 C34.5,55 34.5,31 44,18 Z M60,18 C74,30 73,56 60,67 C70,55 70.5,31 60,18 Z M28,16 C17,30 17,52 27,66 C20.5,52 21,30 28,16 Z M76,16 C88,30 87,52 78,66 C84,52 83.5,30 76,16 Z"/>
  <path class="ocLid" d="M34,24 L40,21 L46,23 L53,20 L60,23 L66,20 L72,24"/>
  <path class="ocLeak" d="M34,24 L40,21 L46,23 L53,20 L60,23 L66,20 L72,24"/>
  <g class="ocFace f0">
    <path class="ocCut" d="M22,34 L36,29 L38,40 L24,41 Z"/>
    <path class="ocCut" d="M62,28 L80,33 L78,42 L63,40 Z"/>
    <path class="ocCut" d="M48,44 L55,42 L57,49 L50,50 Z"/>
    <path class="ocCut" d="M20,52 L28,49 L36,50 L36,56 L43,56 L43,49 L52,50 L60,52 L64,51 L64,56 L70,56 L70,50 L78,49 L84,52 L78,58 L66,63 L62,64 L62,57 L55,57 L55,65 L44,64 L30,59 Z"/>
  </g>
  <g class="ocFace f1">
    <path class="ocCut" d="M22,36 L38,31 L38,36 L24,40 Z"/>
    <path class="ocCut" d="M62,31 L80,35 L78,40 L62,36 Z"/>
    <path class="ocCut" d="M48,44 L55,42 L57,49 L50,50 Z"/>
    <path class="ocCut" d="M22,54 L50,49 L84,55 L76,60 L58,62 L50,58 L42,63 L28,60 Z"/>
  </g>
</g>
<g class="ocPumpkin" data-face="0" transform="translate(120 15) rotate(-6 32 97)">
  <ellipse class="ocShade" cx="32" cy="97" rx="30" ry="4.5"/>
  <ellipse class="ocGlow" cx="30" cy="99" rx="22" ry="4.5"/>
  <path class="ocTendril" d="M38,15 C46,14 51,8 47,4 C44,1 40,5 43,7"/>
  <path class="ocStem" d="M26,16 C25,10 24,5 27,2 L36,0 C37,4 35,8 37,13 L38,16 Q32,18.5 26,16 Z"/>
  <path class="ocStemLine" d="M31,2 C30.5,6 30.5,10 32,15"/>
  <path class="ocBody" d="M4,58 C4,30 14,10 24,9 C28,9 30,12 31,14 C32,12 34,9 38,9 C50,10 60,30 60,58 C60,80 52,95 36,97 C34,95 32,95 30,97 C14,96 4,80 4,58 Z"/>
  <path class="ocSeam" d="M30,15 C20,35 20,70 30,96 C23,70 23,35 30,15 Z M34,15 C44,35 44,70 34,96 C41,70 41,35 34,15 Z M20,12 C10,30 10,70 18,94 C12.5,70 13,30 20,12 Z M44,12 C54,30 54,70 46,94 C51.5,70 51,30 44,12 Z"/>
  <path class="ocLid" d="M18,19 L23,15 L29,17 L35,14 L41,17 L46,19"/>
  <path class="ocLeak" d="M18,19 L23,15 L29,17 L35,14 L41,17 L46,19"/>
  <path class="ocLeaf" d="M40,16 C46,12 54,10 62,14 C60,18 62,22 58,26 C54,24 52,28 48,28 C46,24 42,22 40,16 Z"/>
  <path class="ocVein" d="M41,17 C48,20 52,23 56,26"/>
  <g class="ocFace f0">
    <path class="ocCut" d="M14,40 L26,34 L28,48 L16,50 Z"/>
    <path class="ocCut" d="M36,33 L50,38 L48,52 L36,50 Z"/>
    <path class="ocCut" d="M28,54 L36,55 L34,62 L27,61 Z"/>
    <path class="ocCut" d="M22,70 L30,66 L40,67 L46,72 L46,80 L40,86 L30,87 L22,82 Z"/>
  </g>
  <g class="ocFace f1">
    <path class="ocCut" d="M13,42 L27,38 L28,48 L15,50 Z"/>
    <path class="ocCut" d="M36,37 L50,41 L48,52 L36,50 Z"/>
    <path class="ocCut" d="M28,54 L36,55 L34,62 L27,61 Z"/>
    <path class="ocCut" d="M18,72 L46,68 L44,76 L36,74 L30,79 L20,77 Z"/>
  </g>
</g>
<g class="ocPumpkin" data-face="0" transform="translate(178 37) rotate(-13 42 75)">
  <ellipse class="ocShade" cx="44" cy="75" rx="40" ry="4.5"/>
  <ellipse class="ocGlow" cx="42" cy="77" rx="28" ry="5"/>
  <path class="ocStem" d="M36,20 C36,15 34,10 30,7 L32,3 C37,4 41,8 43,13 L45,19 Q40,21.5 36,20 Z"/>
  <path class="ocStemLine" d="M34,6 C37,9 39,13 41,18"/>
  <path class="ocBody" d="M4,44 C4,22 18,10 34,12 C38,12 41,15 42,17 C45,15 48,15 54,16 C68,18 80,32 80,48 C80,60 74,70 62,74 L52,75 C48,76 45,75 42,74 C38,75 34,76 30,75 C14,72 4,60 4,44 Z"/>
  <path class="ocSeam" d="M36,18 C24,30 24,58 34,74 C27,58 27,30 36,18 Z M48,18 C60,30 60,58 50,74 C57,58 57,30 48,18 Z M22,14 C12,28 12,54 24,72 C16,54 16,28 22,14 Z"/>
  <path class="ocLid" d="M26,22 L31,18 L37,21 L43,17 L49,21 L55,19 L60,24"/>
  <path class="ocLeak" d="M26,22 L31,18 L37,21 L43,17 L49,21 L55,19 L60,24"/>
  <g class="ocFace f0">
    <path class="ocCut" d="M20,36 L30,32 L31,42 L21,43 Z"/>
    <path class="ocCut" d="M46,30 L62,34 L60,45 L46,43 Z"/>
    <path class="ocCut" d="M38,46 L45,45 L47,52 L39,53 Z"/>
    <path class="ocCut" d="M16,54 L30,52 L30,58 L36,58 L36,52 L52,50 L66,46 L70,52 L60,60 L48,65 L44,65 L44,59 L38,59 L38,64 L34,64 L20,60 Z"/>
  </g>
  <g class="ocFace f1">
    <path class="ocCut" d="M19,38 L31,34 L31,40 L21,42 Z"/>
    <path class="ocCut" d="M46,32 L62,36 L60,42 L46,41 Z"/>
    <path class="ocCut" d="M38,46 L45,45 L47,52 L39,53 Z"/>
    <path class="ocCut" d="M18,58 L34,56 L50,57 L68,52 L64,60 L52,63 L40,62 L24,63 Z"/>
  </g>
</g>
</svg>
```

CSS for the pumpkins (replaces `.ocBody`/`.ocRib`/`.ocStem`/`.ocFace` rules):

```css
.ocBody{fill:var(--oct);}
.ocSeam{fill:var(--octDeep);}
.ocLid{fill:none; stroke:var(--octDeep); stroke-width:2.2; stroke-linejoin:round; stroke-linecap:round;}
.ocLeak{fill:none; stroke:var(--octLit); stroke-width:1; stroke-linejoin:round; opacity:0;}
.ocStem, .ocLeaf{fill:var(--teal);}
.ocStemLine{fill:none; stroke:var(--navy); stroke-width:1; opacity:.4; stroke-linecap:round;}
.ocVein{fill:none; stroke:var(--paleturq); stroke-width:1; stroke-linecap:round;}
.ocTendril{fill:none; stroke:var(--teal); stroke-width:1.5; stroke-linecap:round;}
.ocShade{fill:var(--shadow);}
.ocGlow{fill:var(--octLit); opacity:0;}
.ocFace{display:none;}  .ocCut{fill:var(--navy);}
.ocPumpkin[data-face="0"] .f0, .ocPumpkin[data-face="1"] .f1{display:block;}
.ocPumpkin.lit .ocCut{fill:var(--octLit);}
.ocPumpkin.lit .ocLeak{opacity:.9;}
.ocPumpkin.lit .ocGlow{opacity:.55;}
body.waveMotion .ocPumpkin.lit .ocFace{animation:ocFlicker 2.8s ease-in-out infinite;}   /* unchanged */
```

### B2. The web — spun, not drafted

Generated from a few rules rather than drawn arc by arc, and the rules are the design:

1. The **hub** is inside the web at (96,44), not on the corner. The radii run from it in
   fourteen uneven directions (84°, 101°, 121°, 136° … 335°) — the spacing wanders by up to
   8°, the way a spider lays them.
2. A **frame thread** crosses the corner from (10,6) to (134,130), bowed slightly toward the
   hub by the radii's tension, and each end is tied to the card edge by two **guy threads**.
   Radii toward the corner stop at the card edges (the substrate); the rest stop at the frame.
3. The **spiral** is one continuous thread. Its radius on each spoke is that spoke's own
   length times a fraction that grows every segment (eight turns, exponent 1.1 so the
   spacing widens a little outward), so the spiral takes the frame's shape rather than a
   circle's. Every segment is a quadratic whose control point sits 5 % of the way from the
   chord toward the hub: the sag. (11 % made a doily; 5 % is what a web does.)
4. A **tear**: between the 4th and 5th radii, turns five to seven are missing and each broken
   end hangs as a short curl.
5. **Line weight**: frame 1.1, radii .9, spiral .7 (`vector-effect:non-scaling-stroke`, so
   the weights survive the card's size), at opacities .40/.36/.34 — a third more ink than
   before, and the spiral's density does the rest. At 1/3 scale it reads as a grey corner
   haze with a dark spider in it, which is what a web across a room is.

The same generator with nine radii, five turns and no tear makes the small web
(`.ocCorner`) — but I would drop the small webs from every other card. One web on the clock
is a decoration; a web on every widget is wallpaper, and at 44 px it is a grey smudge in the
corner of the dice. If they stay, use the markup below and not a reduced copy of the big one.

```html
<svg class="ocWeb" id="ocWeb" viewBox="0 0 140 140" aria-hidden="true">
<g class="ocStrands">
  <path class="ocFrame" d="M10,6 Q74,66 134,130 M10,6 L0,0 M10,6 L24,0 M134,130 L140,116 M134,130 L140,140"/>
  <path class="ocRadii" d="M96,44 L101.5,95.9 M96,44 L88.5,82.6 M96,44 L78.7,72.7 M96,44 L72.6,66.6 M96,44 L65.9,60 M96,44 L59.1,53.2 M96,44 L48.9,43.2 M96,44 L24,19.2 M96,44 L39.7,0 M96,44 L66.3,0 M96,44 L85.8,0 M96,44 L100.6,0 M96,44 L121.4,0 M96,44 L140,23.5"/>
  <path class="ocSpiral" d="M96.5,49 Q95.6,49.5 94.7,50.5 Q94,49.5 93,48.9 Q92.1,48.8 90.7,49.1 Q90.7,47.9 90.2,47.1 Q90.5,46.1 90.3,45.4 Q89.5,44.6 88.1,43.9 Q88.4,42.6 87.9,41.2 Q88.3,39.7 87.9,37.6 Q89.8,37.6 91.2,36.8 Q92.9,37.2 94.3,36.8 Q95.7,36.3 97,35 Q98.6,36 100.5,36.3 Q102.6,38.2 105.5,39.6 Q101,46.7 97.1,54.1 Q95.8,52.6 94.5,52 Q93,51.5 91.3,51.8 Q91,50.4 90.1,49.7 Q89,49 87.1,48.7 Q87.2,47.4 86.4,46.4 Q86.5,45 85.6,43.8 Q83.5,41.3 80.1,38.5 Q82.6,36.8 83.7,34.4 Q86.3,33.8 88,32.1 Q90.9,32.7 93.2,32 Q95.3,32.9 97.2,32.7 Q100,32.7 103.2,31.5 Q105.2,35.4 108.1,38.4 Q102.5,48.9 97.7,59.9 Q95.7,57.3 93.6,56.2 Q92.4,54 90.7,52.8 Q89.5,52.1 87.6,52.2 Q87.2,50.4 86,49.3 Q84.8,48.1 82.4,47.4 Q82.1,45.5 80.3,43.7 Q78.2,40.3 74.1,36.5 Q76.7,33.5 77.2,29.3 Q82.3,30 86,29.1 Q89.4,28.9 92.1,27 Q95,28.2 97.7,27.7 Q101,28.9 104.9,28.6 Q108.4,32.9 113.2,36 Q105.1,49.4 98,63.4 Q95.4,61.1 92.8,60.6 Q91,57.6 88.8,56.1 Q88.2,54 86.7,53 Q85.2,51.6 82.6,51.1 Q82.3,49.2 80.6,47.8 Q78.6,45.7 74.8,43.6 Q71.5,38.8 65.5,33.5 Q70.3,30.3 72.4,25.6 Q78.4,25.7 82.5,23.9 Q87.4,25.1 91.5,24.3 Q94.9,24.5 98.3,22.5 Q102.7,24 107.9,23.4 Q111.2,29.7 116.1,34.6 Q106.8,51.7 98.7,69.6 Q95.6,65 92.4,62.6 Q89.9,60.1 86.8,59.4 M86.8,59.4 q6,11 -1,17 M84,55.6 q6,11 -1,17 M81.3,51.8 Q79.7,50 76.2,48.9 Q75.1,46.1 71.7,43.6 Q65.8,37.4 56.7,30.5 Q62.9,26.3 65.5,20.2 Q74.1,21.6 80.3,20.7 Q85.8,21.1 90.2,19.1 Q94.5,20.6 98.5,19.7 Q104.3,20.1 111,18 Q115.2,26 121.4,32.2 Q109.5,52.3 99.1,73.4 Q95.3,69 91.5,67.2 Q89.1,62.9 86,60.6 M86,60.6 q7,12.5 -1,19 M81.3,58.2 q7,12.5 -1,19 M77.8,53.7 Q77,51.2 74.3,49.4 Q71.4,46.3 65.9,43.5 Q59.9,36.2 50,28.2 Q56.3,22.6 58.5,14.7 Q69,16.4 76.6,15.3 Q83.7,17.1 89.6,16.1 Q94.4,16.7 99.1,14.4 Q105.5,16.1 112.9,14.8 Q118.7,23.3 126.8,29.6 Q112.4,54.2 99.8,79.8 Q95.4,73.1 91.1,69.4 Q87.9,65.6 84,64 M84,64 q8,14 -1,21 M80.3,59.1 q8,14 -1,21 M74.2,55.6 Q73.2,52.6 69.8,50.5 Q67.7,46.8 62.6,43.4 Q54,34.7 40.9,25 Q49.5,19.1 53.3,10.6 Q64.7,11.9 72.9,9.8 Q81.4,11.9 88.3,10.7 Q94,12.7 99.4,11.4 Q107.1,12 116,9.3 Q121.7,20 130,28.1 Q114.3,56.5 100.4,86.3 Q95.3,78.4 90.1,74.1 Q87.1,68.4 83.2,65.3 Q81.1,62.6 77.5,61.9 Q76.2,58.3 72.8,56.3 Q70.4,53.5 65.3,51.7 Q62.8,47.3 56.7,43.3 Q47.9,33.5 33.9,22.6 Q42.8,15.3 46,5 Q60.2,7.5 70.5,6.3 Q79.7,7.6 87,5.2 Q93.6,7.5 100,5.9 Q108.4,7.8 118,5.9 Q125.3,17.1 135.6,25.5"/>
  <circle class="ocHub" cx="96" cy="44" r="2.2"/>
</g>
<g class="ocSpiderRig">
  <line class="ocThread" x1="96" y1="44" x2="96" y2="84"/>
  <g class="ocSpider">
      <svg x="78.8" y="81.7" width="34.3" height="35.9" viewBox="0 0 44 46"><path class="ocLeg l1r" d="M25,32.1 L32.9,28.5 L38.9,33.3 L38.2,41 L38.8,41 L40.1,32.7 L33.1,26.5 L24,29.9 Z"/><path class="ocLeg l2r" d="M24.9,34.6 L33.5,34.8 L36.9,40.5 L33.8,45.3 L34.2,45.7 L38.1,40.5 L34.5,33.2 L25.1,32.4 Z"/><path class="ocLeg l3r" d="M25.5,29.7 L31.5,25 L33.9,20 L31.7,16.4 L31.3,16.6 L33.1,20 L30.5,24 L24.5,28.3 Z"/><path class="ocLeg l4r" d="M24.8,27.7 L31.8,19.5 L33.6,10.9 L28.7,5.3 L28.3,5.7 L32.4,11.1 L30.2,18.5 L23.2,26.3 Z"/><path class="ocLeg l1l" d="M20.1,30 L11.4,25.5 L3.8,31.7 L5.7,40.6 L6.3,40.4 L5.2,32.3 L11.6,27.5 L18.9,32 Z"/><path class="ocLeg l2l" d="M19.1,32.4 L9.6,32.1 L5.4,39.4 L8.7,44.7 L9.3,44.3 L6.6,39.6 L10.4,33.9 L18.9,34.6 Z"/><path class="ocLeg l3l" d="M19.6,28.3 L13.5,23.5 L10.4,19.4 L12.2,16.1 L11.8,15.9 L9.6,19.6 L12.5,24.5 L18.4,29.7 Z"/><path class="ocLeg l4l" d="M20.8,26.3 L14.3,19.1 L12.6,11.6 L16.7,6.2 L16.3,5.8 L11.4,11.4 L12.7,19.9 L19.2,27.7 Z"/><path class="ocAbd" d="M22,3.5 C28,3.5 31.8,10 31,18 C30.4,24 26,27.5 22,27.5 C18,27.5 13.4,24 13,18 C12.4,10 16,3.5 22,3.5 Z"/><path class="ocCeph" d="M22,26 C26,26 28.6,29 28,33 C27.4,36.8 25,39 22,39 C19,39 16.6,36.8 16,33 C15.4,29 18,26 22,26 Z"/><path class="ocPalp" d="M20.2,38.5 L19,41.5 L21,39.5 Z M23.8,38.5 L25.2,41.6 L23,39.6 Z"/><path class="ocFolium" d="M19.5,9 Q22,12.5 24.8,9.4 M18.4,14.6 Q22,18 25.8,15"/><circle class="ocEye" cx="20.6" cy="36.4" r="1"/></svg>
    </g>
</g>
</svg>
```

```html
<svg class="ocCorner" viewBox="0 0 140 140" aria-hidden="true"><path class="ocFrame" d="M10,6 Q74,66 134,130 M10,6 L0,0 M10,6 L24,0 M134,130 L140,116 M134,130 L140,140"/><path class="ocRadii" d="M96,44 L97.7,92 M96,44 L82.7,76.8 M96,44 L71.8,65.8 M96,44 L62.2,56.3 M96,44 L46.2,40.5 M96,44 L19.8,0 M96,44 L68.5,0 M96,44 L96,0 M96,44 L132.9,0"/><path class="ocSpiral" d="M96.2,50 Q94.6,50.5 92.9,51.7 Q91.8,50.1 90.3,49.1 Q90.1,47.6 89.2,46.5 Q87.7,44.8 85.4,43.3 Q85.3,40.4 84.1,37.1 Q87.7,36.6 90.5,35.2 Q93.4,34.1 96,31.9 Q100.2,33.2 104.9,33.4 Q100.4,45.7 96.5,58.1 Q94.2,55.8 91.7,54.6 Q90.3,52.3 88.3,50.9 Q86.3,49.5 83.2,48.7 Q82,45.7 79.4,42.8 Q77,37 72.6,30.5 Q79.9,29.6 85.4,27.1 Q91,27.8 96,26.7 Q102.6,28 109.9,27.5 Q102.9,45.7 96.7,64.1 Q93.7,60.2 90.4,58 Q87.5,55.9 83.8,55 Q82.4,52 79.7,49.9 Q77.2,46 72.8,42.4 Q66.7,32.7 57.6,21.8 Q71,22.6 81.7,21.1 Q89.2,22.3 96,21.2 Q106,21.2 117.1,18.8 Q106.5,44.6 96.9,70.5 Q92.5,66.2 87.8,64.3 Q85.2,59.9 81.4,57.2 Q79.5,53.7 75.9,51.3 Q70.7,46.4 62.9,41.7 Q55.9,28.8 44.7,14.4 Q63,16.1 77.8,14.9 Q87.4,15.2 96,12.5 Q108.7,13.9 122.7,12.2 Q109.3,46.1 97.3,80.1 Q92,72.6 86.3,68 Q83.3,62.7 78.8,59.4 Q75.1,56 69.2,53.7 Q64.2,47.3 55.7,41.2 Q46.2,24.9 31.4,6.7 Q54,8.2 72.2,5.9 Q84.7,8.1 96,6.6 Q111.4,7.9 128.4,5.4"/></svg>
```

```css
.ocStrands path{fill:none; stroke:var(--navy); vector-effect:non-scaling-stroke; stroke-linecap:round;}
.ocFrame{stroke-width:1.1; opacity:.4;}  .ocRadii{stroke-width:.9; opacity:.36;}  .ocSpiral{stroke-width:.7; opacity:.34;}
.ocHub{fill:var(--navy); opacity:.4;}
.ocCorner path{fill:none; stroke:var(--navy); vector-effect:non-scaling-stroke;}
.ocCorner .ocFrame{stroke-width:1; opacity:.28;}  .ocCorner .ocRadii{stroke-width:.8; opacity:.24;}  .ocCorner .ocSpiral{stroke-width:.7; opacity:.22;}
.ocThread{stroke:var(--navy); stroke-width:.8; opacity:.5; transform-box:fill-box; transform-origin:50% 0;}   /* unchanged mechanics */
```

### B3. The spider — an orb weaver on its dragline

Drawn in its own `0 0 44 46` box and placed in the web as a nested `<svg>` at 78 % (so the
legs' transform-origins stay in the spider's own units). Head-down: the thread meets the
spinnerets at the top of the abdomen (22,3.5); the cephalothorax and the one eye are at the
bottom. Construction:

- **Abdomen** an egg, 18 wide × 24 tall, the mass of the drawing; **cephalothorax** a pear
  a third of that, overlapping the abdomen's base; two pedipalp nubs at the mouth.
- **Legs** are filled tapers, not strokes: each is four joints (coxa → knee → tibia end →
  tarsus tip) with widths 2.4 → 2.1 → 1.4 → .7, generated as an offset outline so the knee is
  a real angle and the tarsus goes to a point. Pairs I and II reach forward (down), III is
  short and sideways, IV reaches back up the line. Left and right differ by a unit or two
  at every joint.
- **Detail** in the register: two paleturq folium curves across the abdomen (the garden
  spider's marking, following the form, not closing), one paleturq eye at (20.6,36.4).

Every leg is its own path with a `view-box` origin at its coxa, so a "settle" or a "twitch"
can be animated per leg later:

```css
.ocSpider path{fill:var(--navy);}
.ocSpider .ocFolium{fill:none; stroke:var(--paleturq); stroke-width:1; stroke-linecap:round;}
.ocSpider .ocEye{fill:var(--paleturq);}
.ocLeg{transform-box:view-box;}
.l1r{transform-origin:24.5px 31px;}  .l2r{transform-origin:25px 33.5px;}  .l3r{transform-origin:25px 29px;}  .l4r{transform-origin:24px 27px;}
.l1l{transform-origin:19.5px 31px;}  .l2l{transform-origin:19px 33.5px;}  .l3l{transform-origin:19px 29px;}  .l4l{transform-origin:20px 27px;}
```

```html
<svg viewBox="0 0 44 46">
  <path class="ocLeg l1r" d="M25,32.1 L32.9,28.5 L38.9,33.3 L38.2,41 L38.8,41 L40.1,32.7 L33.1,26.5 L24,29.9 Z"/>
  <path class="ocLeg l2r" d="M24.9,34.6 L33.5,34.8 L36.9,40.5 L33.8,45.3 L34.2,45.7 L38.1,40.5 L34.5,33.2 L25.1,32.4 Z"/>
  <path class="ocLeg l3r" d="M25.5,29.7 L31.5,25 L33.9,20 L31.7,16.4 L31.3,16.6 L33.1,20 L30.5,24 L24.5,28.3 Z"/>
  <path class="ocLeg l4r" d="M24.8,27.7 L31.8,19.5 L33.6,10.9 L28.7,5.3 L28.3,5.7 L32.4,11.1 L30.2,18.5 L23.2,26.3 Z"/>
  <path class="ocLeg l1l" d="M20.1,30 L11.4,25.5 L3.8,31.7 L5.7,40.6 L6.3,40.4 L5.2,32.3 L11.6,27.5 L18.9,32 Z"/>
  <path class="ocLeg l2l" d="M19.1,32.4 L9.6,32.1 L5.4,39.4 L8.7,44.7 L9.3,44.3 L6.6,39.6 L10.4,33.9 L18.9,34.6 Z"/>
  <path class="ocLeg l3l" d="M19.6,28.3 L13.5,23.5 L10.4,19.4 L12.2,16.1 L11.8,15.9 L9.6,19.6 L12.5,24.5 L18.4,29.7 Z"/>
  <path class="ocLeg l4l" d="M20.8,26.3 L14.3,19.1 L12.6,11.6 L16.7,6.2 L16.3,5.8 L11.4,11.4 L12.7,19.9 L19.2,27.7 Z"/>
  <path class="ocAbd" d="M22,3.5 C28,3.5 31.8,10 31,18 C30.4,24 26,27.5 22,27.5 C18,27.5 13.4,24 13,18 C12.4,10 16,3.5 22,3.5 Z"/>
  <path class="ocCeph" d="M22,26 C26,26 28.6,29 28,33 C27.4,36.8 25,39 22,39 C19,39 16.6,36.8 16,33 C15.4,29 18,26 22,26 Z"/>
  <path class="ocPalp" d="M20.2,38.5 L19,41.5 L21,39.5 Z M23.8,38.5 L25.2,41.6 L23,39.6 Z"/>
  <path class="ocFolium" d="M19.5,9 Q22,12.5 24.8,9.4 M18.4,14.6 Q22,18 25.8,15"/>
  <circle class="ocEye" cx="20.6" cy="36.4" r="1"/>
</svg>
```

### B4. Bats — two poses, and what makes them bats at 38 px

Ventral view, head up, in `0 0 44 24`; the wing groups' origins are the shoulders,
`.ocWingR{transform-origin:24.5px 8px}` / `.ocWingL{transform-origin:19.5px 8px}`
(`transform-box:view-box`). What carries the bat at 38 px:

- The **leading edge is an arm**: shoulder → elbow (a real corner) → wrist, with the thumb
  as a 1-unit hook at the wrist. A bird's is one arc.
- **Three deep scallops** on the trailing edge — the membrane between fingers, each a
  quadratic whose control point is pulled toward the shoulder — so the wing has three
  points, and at 38 px each scallop is 5 px: it survives.
- **Ears** 4 units tall on a 6-unit head, unequal (the right one taller and more splayed).
- A **tail membrane**, a small V between the feet.
- One paleturq eye at r .7: honoured on paper, invisible on the board — fine, it is a nod.

**Pose A** is the down-stroke: wings wide and slightly drooped, span 43. **Pose B** is the
up-stroke: the arm raised, the fingers part-folded, span 38 and taller. The flock alternates
them (b1, b3 up; b2, b4, b5 down) and the flap keeps rotating the wing groups, but the
amplitude should differ: ±30° for A, ±18° for B (a folded wing does not sweep as far). Give
b3 and b4 `width:30px`/`32px` so the flock has depth.

```html
<svg viewBox="0 0 44 24">
  <g class="ocWingR"><path d="M24.5,8 C27,6 29,5 31,5.2 C33.5,5.2 35.5,5.6 37,6.2 L37.6,5.2 L38.4,6.6 C40.2,7.2 42,7.8 43.6,9 Q39.4,12 40.6,15.4 Q36.6,15.2 35.4,18.2 Q30.6,15.6 27,16.6 L24.8,15.4 Z"/></g>
  <g class="ocWingL"><path d="M19.5,8 C17,6.2 15,5.2 13,5.4 C10.5,5.4 8.5,5.8 7,6.4 L6.2,5.4 L5.6,6.8 C3.8,7.4 2,8.2 .6,9.4 Q4.6,12.4 3.6,15.8 Q7.4,15.6 8.8,18 Q13.2,15.8 17,16.8 L19.2,15.4 Z"/></g>
  <path class="ocEarL" d="M19.8,5 L18,.8 L21.4,3.4 Z"/><path class="ocEarR" d="M24.2,5 L26.2,.4 L22.8,3.4 Z"/>
  <path class="ocBod" d="M22,3.2 C24.4,3.2 25.4,5.6 25.2,8 C25.8,12 25.2,16 23.6,19 L22,20.8 L20.4,19 C18.8,16 18.2,12 18.8,8 C18.6,5.6 19.6,3.2 22,3.2 Z"/>
  <path class="ocTail" d="M19.6,16.6 Q22,23.4 24.4,16.6 Z"/>
  <circle class="ocEye" cx="21" cy="5.4" r=".7"/>
</svg>
```

```html
<svg viewBox="0 0 44 24">
  <g class="ocWingR"><path d="M24.5,8 C26.5,5.5 28,3.6 30.5,2.6 C32.5,1.8 34,1.6 35.5,2 L35.8,1 L36.6,2.4 C38.4,3.2 40,4.6 41,6.4 Q37.4,7.6 37.6,11 Q34.2,10.2 32.6,13 Q29,12 26.4,13.6 L24.8,14.8 Z"/></g>
  <g class="ocWingL"><path d="M19.5,8 C17.5,5.4 16,3.4 13.6,2.4 C11.6,1.6 10,1.4 8.6,1.8 L8.2,.8 L7.4,2.2 C5.6,3 4,4.4 2.8,6.2 Q6.6,7.4 6.4,10.8 Q9.8,10 11.6,12.8 Q15,11.8 17.6,13.4 L19.2,14.8 Z"/></g>
  <path class="ocEarL" d="M19.8,5 L18,.8 L21.4,3.4 Z"/><path class="ocEarR" d="M24.2,5 L26.2,.4 L22.8,3.4 Z"/>
  <path class="ocBod" d="M22,3.2 C24.4,3.2 25.4,5.6 25.2,8 C25.8,12 25.2,16 23.6,19 L22,20.8 L20.4,19 C18.8,16 18.2,12 18.8,8 C18.6,5.6 19.6,3.2 22,3.2 Z"/>
  <path class="ocTail" d="M19.6,16.6 Q22,23.4 24.4,16.6 Z"/>
  <circle class="ocEye" cx="21" cy="5.4" r=".7"/>
</svg>
```

Markup for `#sea-bats` (replaces the five copies):

```html
<div id="sea-bats" class="seaThing">
<div class="ocBat b1 up"><div class="ocBob"><svg viewBox="0 0 44 24">
  <g class="ocWingR"><path d="M24.5,8 C26.5,5.5 28,3.6 30.5,2.6 C32.5,1.8 34,1.6 35.5,2 L35.8,1 L36.6,2.4 C38.4,3.2 40,4.6 41,6.4 Q37.4,7.6 37.6,11 Q34.2,10.2 32.6,13 Q29,12 26.4,13.6 L24.8,14.8 Z"/></g>
  <g class="ocWingL"><path d="M19.5,8 C17.5,5.4 16,3.4 13.6,2.4 C11.6,1.6 10,1.4 8.6,1.8 L8.2,.8 L7.4,2.2 C5.6,3 4,4.4 2.8,6.2 Q6.6,7.4 6.4,10.8 Q9.8,10 11.6,12.8 Q15,11.8 17.6,13.4 L19.2,14.8 Z"/></g>
  <path class="ocEarL" d="M19.8,5 L18,.8 L21.4,3.4 Z"/><path class="ocEarR" d="M24.2,5 L26.2,.4 L22.8,3.4 Z"/>
  <path class="ocBod" d="M22,3.2 C24.4,3.2 25.4,5.6 25.2,8 C25.8,12 25.2,16 23.6,19 L22,20.8 L20.4,19 C18.8,16 18.2,12 18.8,8 C18.6,5.6 19.6,3.2 22,3.2 Z"/>
  <path class="ocTail" d="M19.6,16.6 Q22,23.4 24.4,16.6 Z"/>
  <circle class="ocEye" cx="21" cy="5.4" r=".7"/>
</svg></div></div>
<div class="ocBat b2"><div class="ocBob"><svg viewBox="0 0 44 24">
  <g class="ocWingR"><path d="M24.5,8 C27,6 29,5 31,5.2 C33.5,5.2 35.5,5.6 37,6.2 L37.6,5.2 L38.4,6.6 C40.2,7.2 42,7.8 43.6,9 Q39.4,12 40.6,15.4 Q36.6,15.2 35.4,18.2 Q30.6,15.6 27,16.6 L24.8,15.4 Z"/></g>
  <g class="ocWingL"><path d="M19.5,8 C17,6.2 15,5.2 13,5.4 C10.5,5.4 8.5,5.8 7,6.4 L6.2,5.4 L5.6,6.8 C3.8,7.4 2,8.2 .6,9.4 Q4.6,12.4 3.6,15.8 Q7.4,15.6 8.8,18 Q13.2,15.8 17,16.8 L19.2,15.4 Z"/></g>
  <path class="ocEarL" d="M19.8,5 L18,.8 L21.4,3.4 Z"/><path class="ocEarR" d="M24.2,5 L26.2,.4 L22.8,3.4 Z"/>
  <path class="ocBod" d="M22,3.2 C24.4,3.2 25.4,5.6 25.2,8 C25.8,12 25.2,16 23.6,19 L22,20.8 L20.4,19 C18.8,16 18.2,12 18.8,8 C18.6,5.6 19.6,3.2 22,3.2 Z"/>
  <path class="ocTail" d="M19.6,16.6 Q22,23.4 24.4,16.6 Z"/>
  <circle class="ocEye" cx="21" cy="5.4" r=".7"/>
</svg></div></div>
<div class="ocBat b3 up"><div class="ocBob"><svg viewBox="0 0 44 24">
  <g class="ocWingR"><path d="M24.5,8 C26.5,5.5 28,3.6 30.5,2.6 C32.5,1.8 34,1.6 35.5,2 L35.8,1 L36.6,2.4 C38.4,3.2 40,4.6 41,6.4 Q37.4,7.6 37.6,11 Q34.2,10.2 32.6,13 Q29,12 26.4,13.6 L24.8,14.8 Z"/></g>
  <g class="ocWingL"><path d="M19.5,8 C17.5,5.4 16,3.4 13.6,2.4 C11.6,1.6 10,1.4 8.6,1.8 L8.2,.8 L7.4,2.2 C5.6,3 4,4.4 2.8,6.2 Q6.6,7.4 6.4,10.8 Q9.8,10 11.6,12.8 Q15,11.8 17.6,13.4 L19.2,14.8 Z"/></g>
  <path class="ocEarL" d="M19.8,5 L18,.8 L21.4,3.4 Z"/><path class="ocEarR" d="M24.2,5 L26.2,.4 L22.8,3.4 Z"/>
  <path class="ocBod" d="M22,3.2 C24.4,3.2 25.4,5.6 25.2,8 C25.8,12 25.2,16 23.6,19 L22,20.8 L20.4,19 C18.8,16 18.2,12 18.8,8 C18.6,5.6 19.6,3.2 22,3.2 Z"/>
  <path class="ocTail" d="M19.6,16.6 Q22,23.4 24.4,16.6 Z"/>
  <circle class="ocEye" cx="21" cy="5.4" r=".7"/>
</svg></div></div>
<div class="ocBat b4"><div class="ocBob"><svg viewBox="0 0 44 24">
  <g class="ocWingR"><path d="M24.5,8 C27,6 29,5 31,5.2 C33.5,5.2 35.5,5.6 37,6.2 L37.6,5.2 L38.4,6.6 C40.2,7.2 42,7.8 43.6,9 Q39.4,12 40.6,15.4 Q36.6,15.2 35.4,18.2 Q30.6,15.6 27,16.6 L24.8,15.4 Z"/></g>
  <g class="ocWingL"><path d="M19.5,8 C17,6.2 15,5.2 13,5.4 C10.5,5.4 8.5,5.8 7,6.4 L6.2,5.4 L5.6,6.8 C3.8,7.4 2,8.2 .6,9.4 Q4.6,12.4 3.6,15.8 Q7.4,15.6 8.8,18 Q13.2,15.8 17,16.8 L19.2,15.4 Z"/></g>
  <path class="ocEarL" d="M19.8,5 L18,.8 L21.4,3.4 Z"/><path class="ocEarR" d="M24.2,5 L26.2,.4 L22.8,3.4 Z"/>
  <path class="ocBod" d="M22,3.2 C24.4,3.2 25.4,5.6 25.2,8 C25.8,12 25.2,16 23.6,19 L22,20.8 L20.4,19 C18.8,16 18.2,12 18.8,8 C18.6,5.6 19.6,3.2 22,3.2 Z"/>
  <path class="ocTail" d="M19.6,16.6 Q22,23.4 24.4,16.6 Z"/>
  <circle class="ocEye" cx="21" cy="5.4" r=".7"/>
</svg></div></div>
<div class="ocBat b5"><div class="ocBob"><svg viewBox="0 0 44 24">
  <g class="ocWingR"><path d="M24.5,8 C27,6 29,5 31,5.2 C33.5,5.2 35.5,5.6 37,6.2 L37.6,5.2 L38.4,6.6 C40.2,7.2 42,7.8 43.6,9 Q39.4,12 40.6,15.4 Q36.6,15.2 35.4,18.2 Q30.6,15.6 27,16.6 L24.8,15.4 Z"/></g>
  <g class="ocWingL"><path d="M19.5,8 C17,6.2 15,5.2 13,5.4 C10.5,5.4 8.5,5.8 7,6.4 L6.2,5.4 L5.6,6.8 C3.8,7.4 2,8.2 .6,9.4 Q4.6,12.4 3.6,15.8 Q7.4,15.6 8.8,18 Q13.2,15.8 17,16.8 L19.2,15.4 Z"/></g>
  <path class="ocEarL" d="M19.8,5 L18,.8 L21.4,3.4 Z"/><path class="ocEarR" d="M24.2,5 L26.2,.4 L22.8,3.4 Z"/>
  <path class="ocBod" d="M22,3.2 C24.4,3.2 25.4,5.6 25.2,8 C25.8,12 25.2,16 23.6,19 L22,20.8 L20.4,19 C18.8,16 18.2,12 18.8,8 C18.6,5.6 19.6,3.2 22,3.2 Z"/>
  <path class="ocTail" d="M19.6,16.6 Q22,23.4 24.4,16.6 Z"/>
  <circle class="ocEye" cx="21" cy="5.4" r=".7"/>
</svg></div></div>
</div>
```

```css
.ocBat path{fill:var(--navy);}  .ocBat .ocEye{fill:var(--paleturq);}
.ocWingL, .ocWingR{transform-box:view-box;}
.ocWingR{transform-origin:24.5px 8px;}  .ocWingL{transform-origin:19.5px 8px;}
@keyframes ocFlapL{from{transform:rotate(-30deg);} to{transform:rotate(26deg);}}
@keyframes ocFlapR{from{transform:rotate(30deg);} to{transform:rotate(-26deg);}}
@keyframes ocFlapLup{from{transform:rotate(-18deg);} to{transform:rotate(14deg);}}
@keyframes ocFlapRup{from{transform:rotate(18deg);} to{transform:rotate(-14deg);}}
body.waveMotion #sea-bats.go .up .ocWingL{animation-name:ocFlapLup;}
body.waveMotion #sea-bats.go .up .ocWingR{animation-name:ocFlapRup;}
.ocBat.b3{width:30px;}  .ocBat.b4{width:32px;}
```

### B5. The ghost ship — a silhouette that can be found

**Contrast strategy.** The ship is drawn the way everything in the sea is drawn: one solid
navy silhouette. The ghosting is a single `opacity:.5` on the group, which on cream gives a
slate that a 210 px shape carries from 8 m, where 50 % *lines* could not. Inside the group
the sails are the same navy at .66, so they sit a shade lighter than the hull — the only
tonal separation, and enough. The lamp lives *outside* the ghosted group so the yellow stays
yellow; it is the one saturated point on the ship and the eye goes to it first.

**Which lines carry it.** (1) The **sheer**: one curve from a low waist up to a two-step
stern castle, and forward to a raised forecastle and a **beak-head** under the bowsprit —
the galleon's profile, unmistakable as "old ship" at any size. (2) Three **masts that rake
aft at three different angles** (4°, 6°, 9.5°), tapered, and a long **bowsprit**; parallel
masts read as drafted. (3) **Yards** crossing the fore and main masts, each **cock-billed**
(each tilted its own way, 3°–7°): a derelict's yards are askew. (4) A **lateen yard** on the mizzen.
(5) One paleturq **wale** line along the hull, following the sheer — the ship's one detail
line in the register. The stays and shrouds are .8-unit lines at the group's opacity: haze
detail that shows on the proof and is honestly gone from the back row.

**Tattered sails that read as tattered.** Tatter is *absence*, so each sail is missing
something different: the fore course hangs from its yard in six strips of unequal length
with two holes cut through (`fill-rule:evenodd`); the main topsail is **furled** — a rolled
lump along the yard with one rag hanging off it; the main course is **gone**, only two rags
at the yard ends, which is the strongest derelict cue on the ship; the mizzen lateen has a
torn leech and a hole. A long forked **black pennant** streams aft from the main masthead —
navy, the same swallow-tail the sailboat flies (B6), so the two are of one fleet.

It heads left, bow first, on the far lane as before (`ghDrift`, `thingHeave`, `ghFade`,
`ghLamp` unchanged). Box `0 0 240 130`, waterline y = 100; the far lane's front swell covers
the hull's bottom edge as it does the whale's.

```html
<div id="sea-ghost" class="seaThing">
<div class="ghHeave">
  <svg viewBox="0 0 240 130">
    <g class="ghShip">
      <!-- rigging first (under everything): stays, shrouds, a lift -->
      <path class="ghRig" d="M-12,44 L62,14 M62,14 L117,6 M117,6 L164,26 M164,26 L216,46 M30,66 L62,14 M117,6 L76,78 M117,6 L150,76 M164,26 L206,56 M60,40 L120,30"/>
      <!-- the hull: one sheer line, a raised stern castle, a raked transom, the stem rising forward -->
      <path class="ghHull" d="M18,100 L12,86 C10,80 6,76 -2,73 L0,69 C10,69 20,66 30,66 C66,80 104,84 140,80 L144,72 L170,70 L174,60 L196,58 L200,48 L214,46 L219,52 L222,66 L224,84 L214,100 Z"/>
      <path class="ghWale" d="M20,84 C60,93 104,95 142,90 L168,86"/>
      <!-- masts: tapered, raked aft at three different angles; bowsprit; yards askew -->
      <path class="ghMast" d="M59,76 L63.5,14 L65.5,14 L63,76 Z M108,80 L116,6 L118.5,6 L112,80 Z M158,68 L165,26 L167,26 L162,68 Z M26,68 L-14,44 L-12,42 L30,66 Z"/>
      <path class="ghYard" d="M34,40 L92,34 M38,24 L86,20 M84,44 L150,40 M92,22 L136,17 M142,68 L194,22"/>
      <!-- sails: fore course torn to strips, main topsail furled with one rag, main course GONE (rags on the yard ends), mizzen lateen with a torn leech -->
      <path class="ghSail" fill-rule="evenodd" d="M36,40 C40,50 42,60 40,70 L44,72 L46,60 L48,74 L52,70 L54,58 L58,68 L62,76 L66,64 L70,72 L74,60 L78,66 L82,56 L86,64 L90,50 L92,34 C74,38 54,40 36,40 Z M58,46 L64,45 L63,52 L57,53 Z M74,50 L80,49 L79,56 L73,57 Z"/>
      <path class="ghSail" d="M92,22 C104,26 118,24 136,17 L134,22 C120,28 104,29 93,26 Z M120,24 L124,23 L127,34 L123,42 L121,32 Z"/>
      <path class="ghSail" d="M84,44 L86,50 L82,58 L84,66 L80,72 L78,64 L82,54 Z M150,40 L148,48 L152,56 L148,64 L146,54 L148,46 Z"/>
      <path class="ghSail" fill-rule="evenodd" d="M150,62 L192,24 C186,36 178,46 174,56 L168,52 L164,62 L160,58 L156,66 L152,62 Z M172,38 L176,36 L175,42 L171,44 Z"/>
      <!-- the black pennant at the main masthead, streaming aft -->
      <path class="ghPennant" d="M118,6 L150,10 L140,13 L146,17 L118,12 Z"/>
    </g>
    <path class="ghLampFrame" d="M215,38 L219,38 L220,44 L214,44 Z"/>
    <circle class="ghLamp" cx="217" cy="41" r="2.2"/>
  </svg>
</div>
</div>
```

```css
.ghShip{opacity:.5;}
.ghHull, .ghMast, .ghPennant{fill:var(--navy);}
.ghSail{fill:var(--navy); opacity:.66;}
.ghWale{fill:none; stroke:var(--paleturq); stroke-width:1.2; opacity:.9;}
.ghRig{fill:none; stroke:var(--navy); stroke-width:.8; vector-effect:non-scaling-stroke;}
.ghYard{fill:none; stroke:var(--navy); stroke-width:1.8; stroke-linecap:round;}
.ghLampFrame{fill:var(--navy); opacity:.6;}
.ghLamp{fill:var(--octLit);}
```

### B6. The boat's black pennant

Remove `#111A26`. October's flag is a **shape**, not a shade: a long swallow-tailed pennant
at the masthead, 11 units long against the burgee's 4.6, navy, forked at the fly. At the
boat's 38 px it is a 10 px streamer with a visible notch — the one thing on the boat that
changes for the month, and the same flag the ghost ship flies. It replaces the burgee path
for the month (`body.october` swaps `d` via a second path, or simply swap the markup):

```html
<path class="btBurgee" d="M20,2.4 L31,3.2 L27.8,4.2 L31,5.6 L20,5.4 Z"/>
```

```css
body.october .btBurgee{fill:var(--navy);}   /* no scale, no off-palette colour */
```

The existing `btFlick` (the victory flap) will look better on the longer cloth than it did on
the triangle; `skewY` on an 11-unit streamer reads as a snap.

---

## C. New pieces that belong to this world

Judged by one question: would the serpent and the whale accept them as neighbours?

### C1. The castaway pumpkin (on the water)

Pumpkins float. A carved one adrift at sea, lit, listing 12°, its mouth just clear of the
water, is the image that ties October to this sea — the sand's pumpkins have a sibling who
went sailing. It heaves on the swell like the buoy and the paper boat (`thingHeave`, phase
aligned by `Sea.play`), and drifts left on the far or near lane. Construction: the same lobed
body and lid as the sand pumpkins at 60 units, cut flat by a still band of `--turq-light`
at y = 30 (the water in front of it — its own front layer, so the waterline never changes
as it bobs, the boat's rule). The face is always lit — a dark castaway is a floating
cabbage — with the mouth's bottom cut 2 units above the waterline. A single `seaRing` at the
waterline when it appears. Tier common, lanes far/near, 46 s, October only. `.cwRoll` is
the listing group (origin 30 30) if the director ever wants it to roll in windy weather.

```html
<div id="sea-castaway" class="seaThing">
<svg class="cwFx" viewBox="0 0 60 40"><ellipse class="seaRing r0" cx="30" cy="30" rx="12" ry="2.8"/></svg>
<div class="cwBob"><svg viewBox="0 0 60 40">
  <g class="cwRoll" transform="rotate(12 30 30)">
    <path class="ocStem" d="M25,9 C25,6 24,3 26,1 L31,0 C31,3 30,6 31,9 Q28,10.5 25,9 Z"/>
    <path class="ocBody" d="M8,22 C8,12 17,6 26,7 C27.5,7.5 28,8.5 28.5,9.5 C29.5,8.5 31,7.5 33,7.5 C43,8 50,14 50,24 C50,27 49,30 47,32 L11,32 C9,30 8,26 8,22 Z"/>
    <path class="ocSeam" d="M27,10 C19,16 19,26 26,32 C21,26 21,16 27,10 Z M31,10 C40,16 40,26 33,32 C38,26 38,16 31,10 Z"/>
    <path class="ocLid" d="M18,12 L22,10 L27,12 L32,9.5 L37,12 L42,10.5"/>
    <path class="ocLeak" d="M18,12 L22,10 L27,12 L32,9.5 L37,12 L42,10.5"/>
    <g class="ocFace f0 lit">
      <path class="ocCut" d="M15,16 L23,13 L24,20 L16,21 Z"/>
      <path class="ocCut" d="M34,13 L44,16 L43,22 L34,21 Z"/>
      <path class="ocCut" d="M14,23 L24,22 L24,26 L28,26 L28,22 L44,23 L41,28 L17,28 Z"/>
    </g>
  </g>
  <!-- the water in front: a still band that cuts the pumpkin at its waterline -->
  <path class="cwWater" d="M0,30 C10,28.5 20,31.5 30,30 C40,28.5 50,31.5 60,30 L60,40 L0,40 Z"/>
</svg></div>
</div>
```

```css
.cwWater{fill:var(--turq-light);}
#sea-castaway .ocFace.lit{display:block;}
.cwRoll{transform-box:view-box; transform-origin:30px 30px;}
```

### C2. The bone fish (the school's ghost)

A skeleton fish, head-left, that darts like the school (`scFish` timing) — the school's
ghost, and a thing that only this sea would have. It is one connected silhouette, or it
falls apart at 40 px: a skull with the eye as a **hole** (the only cream inside it, evenodd),
a hinged lower jaw, a spine 2 units deep, ribs of **unequal length** (dorsal longer than
ventral, the second dorsal spine tallest, nothing paired exactly), each a taper from 2.6 to
2 units, and a tail fan with lobes that differ. At the far lane (40 px) it is a comb with a
head; at the near lane (90 px) every rib reads. Box `0 0 64 24`.

```html
<div id="sea-bones" class="seaThing">
<svg viewBox="0 0 64 24">
  <g class="bfBody">
    <path class="bfSkull" fill-rule="evenodd" d="M2,12 C4,7 9,4.5 15,5 C18,5.4 20,7 21,9.2 L21,14.6 C20,17 18,18.6 15,19 C9,19.6 4,17 2,12 Z M8.5,9.5 C10.6,8.6 12.8,9.6 12.8,11.6 C12.8,13.4 10.8,14.4 9,13.6 C7.4,12.8 7.2,10.4 8.5,9.5 Z"/>
    <path class="bfJaw" d="M17,15.4 C14,17.4 9,18.2 3.5,16.6 L1.6,14.2 C7,16.2 12,15.8 16,14 Z"/>
    <path class="bfSpine" d="M21,10.8 L52,11.2 L52,13 L21,13.4 Z"/>
    <path class="bfRibs" d="M25,11 L24,4.6 L26.6,4.8 L27.6,11 Z M31,11 L30.4,2.8 L33,3 L33.6,11 Z M37,11 L36.8,4 L39.4,4.2 L39.4,11 Z M43,11 L43.4,5.8 L45.8,6 L45.4,11 Z M48,11 L48.8,7.6 L50.8,7.8 L50,11 Z M25.4,13.2 L25,18.6 L27.4,18.4 L28,13.2 Z M31.4,13.2 L31.4,20.2 L34,20 L34,13.2 Z M37.4,13.2 L37.8,18.8 L40.2,18.6 L39.8,13.2 Z M43.4,13.2 L44.2,17.2 L46.4,17 L45.8,13.2 Z"/>
    <path class="bfTail" d="M51,12 L62,3.6 L58.4,12 L62.6,20.6 Z"/>
  </g>
</svg>
</div>
```

```css
.bfBody path{fill:var(--navy);}
```

### C3. The vine on the dune

The three pumpkins are placed on the sand; a vine makes them *grow* there. One line of
action runs along the dune behind them from off-screen left to the right edge, 2.6 units in
teal, with three alternating lobed leaves (paleturq midribs), two tendrils, and, at the far
end, a small **unripe pumpkin in teal** — the green one, which is the detail that says the
patch is real and not a display. It goes in the same `#ocPumpkins` box, first in the markup so
it sits behind the three, and it dips below the ground line between them so it never reads
as lying in front. Its leaves are the same three-lobed leaf as P2's.

```html
<g class="ocVine">
  <path class="ocVineStem" d="M-20,108 C20,98 40,112 70,104 C100,96 108,114 140,106 C170,98 200,116 236,104 C252,99 262,104 272,100"/>
  <path class="ocLeaf" d="M28,106 C22,96 26,86 36,84 C44,86 46,94 40,100 C46,102 44,110 36,110 C32,110 30,108 28,106 Z"/>
  <path class="ocVein" d="M29,106 C32,98 35,92 38,86"/>
  <path class="ocLeaf" d="M98,102 C92,110 96,118 106,118 C114,116 112,108 106,104 C110,100 104,94 98,96 C94,98 96,100 98,102 Z"/>
  <path class="ocVein" d="M99,102 C102,108 104,112 106,117"/>
  <path class="ocLeaf" d="M256,102 C252,92 258,84 268,86 C274,90 272,98 266,100 C270,104 266,110 258,108 C254,106 254,104 256,102 Z"/>
  <path class="ocVein" d="M257,102 C260,96 263,92 266,87"/>
  <path class="ocTendril" d="M70,104 C72,96 80,94 82,100 C83,104 78,105 78,101 M200,112 C206,116 214,112 210,106 C208,103 204,106 207,108"/>
  <path class="ocBodyGreen" d="M228,104 C228,98 232,94 238,94 C239,94 240,95 240.5,96 C241,95 242,94 243,94 C249,94 253,98 253,104 C253,108 250,111 244,111.5 C241,112 240,111 240.5,110.5 C240,111 238,112 236,111.5 C231,111 228,108 228,104 Z"/>
  <path class="ocSeamGreen" d="M238,95 C234,99 234,107 238,111 C235.5,107 235.5,99 238,95 Z M243,95 C247,99 247,107 243,111 C245.5,107 245.5,99 243,95 Z"/>
  <path class="ocStemSmall" d="M239,95 C239,92 240,90 242,89 L244,90 C243,92 243,94 243,95.5 Z"/>
</g>
```

```css
.ocVineStem{fill:none; stroke:var(--teal); stroke-width:2.6; stroke-linecap:round;}
.ocBodyGreen{fill:var(--teal);}  .ocSeamGreen{fill:var(--navy); opacity:.35;}  .ocStemSmall{fill:var(--teal);}
```

Considered and dropped: a scarecrow (farmland, not a dune), a bonfire (fire would need coral
or a third yellow), a skull-and-crossbones on the pennant (a closed symbol, and a 4 px one),
a night palette (rejected in `SEA.md` for good reasons), and a sheet-ghost over the serpent's
hump (funny once, and it hides the best drawing in the sea).

---

## D. Proof-sheet plan

`october-2.0-proofs.html` beside this file renders all of the above; the PNG is the 1500 px
sheet and `october-2.0-proofs-8m.png` is the same sheet at one third, which is the check:
a 1080p board on a 75″ panel viewed from 8 m resolves about 3 px, and a one-third downscale
viewed at arm's length is the nearest cheap equivalent. What to look at, in order:

1. **Pumpkins at 288 px** (the group's board width at 1080p), unlit and lit, on `--sand`. At
   1/3: three distinct silhouettes, three faces with a dark mouth each, the two lit ones
   warmer than the third. If the faces merge into the body, the cuts are too small — not the
   colour.
2. **The web at 170 px** on white with the spider: at 1/3 it must read as a grey haze in the
   corner with a dark spider under it. If the haze is invisible, raise the spiral's opacity
   before touching its stroke width.
3. **The flock at board size** (38 px, 30 px, 32 px) on cream: five dark shapes with three
   points per wing and a notch of ears. If they read as birds, the scallops are too shallow.
4. **The ghost ship at 210 px** on cream over `--turq-light`: hull, three sticks, rags, one
   yellow point. It must be findable at 1/3 in under a second — that is the whole test.
5. **The castaway at 37 px and 84 px** on `--turq-light`: at the far lane it is an orange
   spot with a warm face and a ring; at the near lane the lid and the list read.
6. **The bone fish at 40 px and 90 px**: a comb with a head, then ribs.
7. **The swallow-tail at 38 px** on the actual boat, with and without the gull perched, so
   the flag does not read as part of the gull.
8. Then the board grabs as in 1.0: the clock card with the web while a timer is running on
   another card, to confirm nothing October is within 40 px of a timer face or the clock's
   digits — the web sits above the date line and never over the time; the pumpkins sit right
   of the dock and below every card.

Two things for the engineer, not the illustrator: `Season.FACES` becomes 2; and the far
lane's `--ls` of .62 applied to a 240-unit ship box gives ~186 px of hull at `width:300px` —
set `#sea-ghost{width:340px}` to land on the 210 px the brief assumes.
