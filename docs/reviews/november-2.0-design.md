# November 2.0 — design notes for the fall furniture and acts (Nov 7, 2026)

Croix: "Now let's shore up the autumn/fall theming. The leaves are great, but there's not much
else." He picked the whole slate. This is the short spec the code is built to — one paragraph a
piece: silhouette, palette, motion, rules, and what it must never do. The register is October
2.0's (`october-2.0-design.md`, `-animation.md`): creatures are solid navy silhouettes with one
paleturq eye and tapers everywhere; made things (a scarecrow, a bale, a pie) have no outline and
read by their fill against the sand; everything is judged at board size and again at one third
(the 8 m check); two motions on one element are two nested elements; every motion is behind
`body.waveMotion`.

**Palette.** November keeps its leaf palette and adds one colour. Rust `#B5542A` (`--nov`), deep
rust `#8A3B1F`, amber `#D98E2B`, gold `#E6B35A`, the rare green `#4F6B3A` — and one muted
**wheat** `#D8C08A` (`--novWheat`, with its shade `#BFA067`) for straw, stalks and the bale. The
lit yellow `#FFE45C` stays the one flame colour (lantern, campfire core). **Red** appears once in
the whole file: the stripes of the Veterans Day flag, a muted `#B0303C`. Coral stays the alarms'.

**Rules (October's, unchanged).** Edges only — never over the full-board clock's digits, the bell
strip or the bathroom pill; never on the stage, the landing page or a phone; still under reduced
motion; Settings → Seasonal touches → Off takes all of it. Everything hangs off `body.november`
(and its date classes, set by Season from the board's own clock); scheduled things are pure
functions of the date (seeded like `geeseTimes`). Taps are small and change nothing that matters.

## A. The bare branch (the clock card's corner)

October's web slot, November's tenant: a bare maple branch reaches in from the card's top-right
corner — one limb with a real taper (5 → 1 units, four segments, round joins), two side twigs that
fork once, a bud knob at each tip. Navy at .5 ink: as present as the web was, a drawing in the
corner, never a shape competing with the digits. Five leaves still hang on it (maple, maple, oak,
aspen, sweetgum in rust, amber, gold, deep rust, gold), each from its stalk, each swinging on its
own clock about the stalk tip (the sea's `--T2` chop, ±4°, unequal periods; windy doubles the
swing). A few times an hour (seeded by the date; two more an hour on a windy day) one shakes —
three quick decaying twists — and lets go: the hanging leaf vanishes as a falling leaf is spawned
at its exact screen position (`Leaves.from`), so the fall is the existing leaves' fall, held to the
outer 15% column (the corner is already inside it). The branch regrows that leaf three to five
minutes later as a 4 s fade. A tap is a gust: every leaf shakes, one (sometimes two) let go.
Under reduced motion: the branch and all five leaves, still; a tap does nothing. Never: over the
date line or the digits (the box is the web's, top-right, under the handle band while editing),
on a live settle-in card (`.stLive`), on the stage.

## B. The beach

Everything on the sand stands at the RIGHT edge, the pumpkins' region, never under the clock
column (a first cut put the scarecrow just right of the boat, centre-bottom, under the bell strip;
review moved it). From the right: the scarecrow group (right 3vw, about 157 px wide at 1080p and
111 px at 1366 × 768 — the hat no higher than the gourds' top), the squirrel (right 17vw), the
turkey's band in feast week (right 22.5–34vw). In Thanksgiving week the gourd bowl sits in front
of the scarecrow, a little lower, over his left stalks. Feet on the dry sand at the pumpkins' line,
a contact shadow in `--shadow`, z-index 2 like the pumpkins. The campfire keeps the open sand right
of the dock.

**B1. The scarecrow among three cornstalks.** A cross on a post, the figure hung on it, not
standing: a sagging burlap head (wheat) with a stitched navy face (two X eyes of different size, a
running-stitch smile that rises to one side), a wide-brimmed straw hat (wheat, gold band) tipped
6°; a rust flannel shirt with a navy check and one amber patch; arms out along the crossbar with
straw tufting from both cuffs; navy trousers tied at the waist with twine, straw at the ankles
above the post. Three dried cornstalks (wheat stalk, two-tone leaves that droop and break, one
tassel each, one with a husked ear) — two behind on the left, one taller behind on the right, so
the silhouette is a triangle with the hat at the top. Motion: the figure leans and sways about the
post's foot on the chop clock (±1.4°, ±3° when windy), the stalks sway on their own unequal periods
(stalks are lighter, so more), and on a windy day the hat brim lifts 7° every few seconds and drops
back. The crow — navy, wings folded, a thick bill, one paleturq eye — sits at the end of his left
arm. A tap: the crow crouches, flaps off low to the left (a few wingbeats — low, so it never crosses
the bathroom pill above him), is gone a second and a half, and comes back in from the right to
land with a settle. Never: in front of the boat, over the bell strip or the pill.

**B2. The hay bale.** In front of the scarecrow's right foot: a rectangular bale in three-quarter
view — a lighter top face, a front face, a shaded end — wheat, with short gold straw strokes
following the faces, ragged ends, and two navy twine bands wrapping over the top and down the
front. Static, always: a bale does not move.

**B3. The squirrel.** A navy silhouette sitting up on the sand at the right (the gourds' corner),
the tail an S-curve as tall as the body, one paleturq eye, ears up. Every few minutes (seeded by
the date) it scampers to a nearby spot in three hops (squash at each landing, stretch in the air,
facing where it goes), digs head-down (five fast squash-and-stretch strokes, sand flecks thrown
back), pushes an amber acorn in and pats it, sits up, and flicks its tail. A tap starts a dig where
it is. In Thanksgiving week it keeps to the left of the gourd bowl.

**B4. The gull's scarf (from the 15th).** A knitted scarf on the resident gull: a rust band at the
neck with two short trailing ends with cream bars (the knit's pattern at this size), streaming
aft; the ends flutter on the boat's own wind (`--flut`, `--flutT`). Perched only. A 3 px thing
on a 38 px boat — a detail for the front row that does not change the gull's silhouette from the
back.

## C. The sea's November acts

Fitted to the strip of sea under the full-board clock (about 90 px at 1080p), far lane behind the
boat, near in front, `dur` = the CSS length + 500 ms. At most two November acts a period (the
October cap); the residents ignore them, except the gull.

**C1. Fog (sky, mornings).** A cream bank (#F5EBD6 at .85) lying OVER the water and the front
waves, the full width, 130 px (over three times the boat), two banks and three soft lobes drifting
left on the waves' wind; it rolls in over 4 s at the first period's start on a fog morning (seeded:
about two school mornings in five) and only before 10:30, holds, and thins from the top down,
burning off over about ninety seconds. The boat's lantern glows through: the boat wears `fogged`, the lantern
burns full, and a warm halo rides on the fog where the boat is.

**C2. Ducks (common, far).** A raft of five, crossing right to left: a leader slightly ahead, two
pairs behind, each bobbing on its own period, one dipping its head under once. Navy, the white
cheek patch in paleturq. The gull turns to watch them pass under the bow and turns back.

**C3. The loon (uncommon, far).** Long and low: swims in, stops, dives — tips forward and slides
under — a ring and bubbles where it went; nothing for five seconds; it comes up somewhere else
(a ring), shakes, and gives one quiet two-note wail if the sound is on. Navy with a paleturq
necklace and a few spots.

**C4. The trawler (rare, far, last third).** A small fishing boat coming home low in the water,
right to left toward the dock: a high bow, a wheelhouse with a paleturq window, a mast with a
derrick and a hanging net, a rust boot-top stripe; two gulls wheel behind it. Loud: our gull
leaves first, is seen as a third gull with the trawler, and flies home to the mast as the act ends.

**C5. The campfire (a beach act, a period's last third, afternoons).** On the sand right of the
scarecrow: a ring of stones, two crossed logs, a flame that catches (a spark, a lick, then a
three-tongued flame that breathes and leans with the wind), smoke rising and drifting left with
the waves' wind; two marshmallow sticks propped on a stone, the marshmallows toasting from cream
to gold. Over three minutes it burns down to glowing embers and a thread of smoke, and goes out.
Flames in gold and amber with a lit-yellow core — never coral.

## D. Calendar beats and the lofi side

**Veterans Day** (the 11th, or the Friday before / Monday after when it falls on a weekend):
a small US flag below the lantern on the mast — navy canton, thirteen stripes at the SVG's scale
in the one red. It flutters with the burgee's wind. **Feast week** (the last school week, the
Monday–Friday before Thanksgiving week): a turkey struts the sand by the squirrel — navy body, a
folded tail in the leaf bands, a rust wattle — a slow walk with a head bob; a tap fans the tail
(a half-wheel of rust, amber and gold) and, with the sound on, one gobble. The Friday before the
break is the **feast**: the lunch tray's slice becomes a whole pie and the cider gets a second
mug. **Windy days** double the leaves (half the gap, a cap of ten). **"Harvest moon"** joins the
tape in November: warm and slow (62 bpm), major with a borrowed minor iv, a Rhodes bed, brushes,
a little crackle — "warm · porch light, crickets".
