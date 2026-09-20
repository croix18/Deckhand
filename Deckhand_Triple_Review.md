# Deckhand v6.10 — Triple Review
*Three independent hands-on reviews, each driving the real file with Playwright: a hostile QA engineer, a 26-year veteran middle-school teacher, and a former Apple design engineer. September 2026.*

---

## The headline: where all three agreed

Three reviewers who never saw each other's work converged on the same five issues. These are the highest-confidence findings in the whole report:

1. **New widgets pile up on the same spawn spot.** The teacher dragged the wrong widget twice in her own run; the designer measured five widgets at the identical pixel (133, 160) with one orphaned ✕ peeking out; the saved-file version of the pile buried an agenda's ✎ under another widget. Most-hit daily annoyance, and it compounds inside saved copies.
2. **The urgent moments are the least legible moments.** "TIME'S UP" is white-on-coral at 2.47:1 contrast (fails even the large-text floor); the last-10-seconds timer digits *drop* from 13.1:1 navy to 2.47:1 coral-on-white exactly when the class looks up; and the full-screen alarm parks forever — after a fire drill it sat 8 minutes, replacing the clock the returning class needed.
3. **Lock is accident-proof, not kid-resistant.** One tap unlocks it (the button helpfully relabels itself "Unlock" in coral); timer Start/Reset stay live while locked; a mid-drag Lock still commits the drag's final position into the locked config; and scene switching — arguably a view action — is locked out.
4. **The save ritual will decay by October.** Download renames the file (`Deckhand_v6_2026-09-14.html`) so every save is download → find → rename → replace; the dirty dot's tooltip never shows on touch; and the noise game writes a record every quiet second, keeping the dirty dot lit all day — training the eye to ignore the one indicator protecting the only persistence mechanism the app has.
5. **The pin+focus headline combo can trap itself.** A default-size pinned timer floats exactly over the focused deck's ⛶ exit button — and there's no Escape key on a Promethean.

---

## Review 1 — The adversarial engineer

*Mandate: break it. Verdict: it survived a 500-action chaos monkey, an 8-hour leak soak, prototype-pollution attempts, hostile download round-trips, and every alarm-obstruction attack — with zero errors. But seven confirmed bugs, one of them nasty.*

### Confirmed bugs

**BUG 1 — HIGH — Permanent drag deadlock.** Hold a drag on any widget strip with one finger; with another, tap anything that removes the dragged element (scene switch, New/Dup/Delete scene, the widget's own ✕). The pointer capture dies with the element, `pointerup` never fires, and the module-level `dragging` flag latches true *forever* — all dragging silently dead until file reload. Verified with real concurrent touch inputs; survives lock/unlock, Escape, Home+relaunch. A palm on a strip while another finger taps the dock is routine on a touch panel. *Fix: track the active drag; cancel it in `clearScene()`/`removeEntry()`/`setLocked()`; add a `lostpointercapture` fallback.*

**BUG 2 — MED — Silent factory reset on a bad hand-edit.** A literal `</script>` pasted into the hand-editable config block truncates it; JSON.parse fails; the app silently boots factory defaults (bell schedule, rosters, scenes — all apparently gone, no message), leaks the orphaned JSON as visible page text, and — because the download snapshot comes from the mutated DOM — **bakes the garbage into every future downloaded copy**. *Fix: a visible "config unreadable — running on defaults, your file on disk is unchanged" banner; disable download while in fallback.*

**BUG 3 — MED — Unbounded bell-schedule data.** sanitize caps labels but not block counts or time strings: 50,000 blocks with a 1MB time string load fine, cost ~18ms per bell tick, and re-bake into every download. *Fix: validate times against `^\d{1,2}:\d{2}$`, cap counts.*

**BUG 4 — MED — Off-canvas geometry.** `x:95, w:100` passes sanitize → widget spans to 195%, its ✕/⛶/⇈ unreachable, and Tab-focus scrolls the whole board sideways (measured scrollX 447) with no touch gesture to bring it back. *Fix: clamp `w ≤ 100−x`, `h ≤ 100−y`; `overflow:clip` on the root.*

**BUG 5 — LOW — Lock mid-drag still commits.** The release handler never re-checks `ui.locked`.

**BUG 6 — LOW (informational) — First-generation download isn't byte-faithful** (DOM re-serialization: NUL byte → U+FFFD, entity expansion, ~52 chars of drift). Functionally equivalent and provably convergent from gen 2 — but the NUL canary doesn't survive one download.

**BUG 7 — LOW — Duplicate widget labels via hand-edit** make the alarm banner ambiguous; sanitize dedupes scene names but not widget labels.

### What did NOT break (a partial list)
The alarm was tap-dismissable in every state attacked (focused iframe, mid-sketch pointer capture, dual simultaneous rings, 9-key mash storms). Intervals, ResizeObservers, listeners, DOM nodes, and heap stayed flat through 50 scene switches and hundreds of interactions. Prototype pollution never reached `Object.prototype`. Hostile strings (`</script>`, `$&`, backslashes, split surrogate pairs) round-tripped downloads exactly. Impossible dates, garbage hashes, DST boundaries, and live period rollovers mid-drag all degraded sanely.

### Top hardening suggestions (beyond the bug fixes)
Exclude noise-game records from the dirty snapshot (the dot stays lit all day otherwise); slice scene names *after* uniquification; a summer/holiday horizon so July 4th doesn't advertise "Next: 6th Period in 47h"; an end-of-day "download a copy before shutdown" nudge when dirty at the last bell.

---

## Review 2 — The veteran teacher (26 years)

*Ran a full simulated Black-Week Monday, 7:15 AM through end-of-day save, ~140 gestures. Verdict:*

> **"I would use this, and that's not a sentence I say about edtech."** It passes the tests that killed ClassroomScreen in my building: no login, no internet needed, boots to a usable board in one tap, and every failure degrades politely. The bell engine is the crown jewel and it is *correct* — Black-week reversed order, Wednesday times, passing periods, the coral 2-minute warning. The name picker **followed the bells across the 10:13 passing period** and picked a 5th-period kid from the 5th-period roster. That one feature is worth the whole tool. … This is the rare tool built *from* a classroom instead of *at* one.

**Would the teacher across the hall survive it?** With a 15-minute walkthrough, yes. She'd be bitten in week one by: the spawn pile-up, Apply-vs-Download confusion, the dated download filename, and a 7th grader tapping the clearly-labeled "Unlock" button.

### Workflow friction (ranked by daily frequency)
1. Every new widget spawns on the same spot, atop the clock — the pile bakes into saved files.
2. TIME'S UP seizes the screen forever — after a fire drill the class returned to a coral wall instead of the clock. The chime is one quiet second; the only cross-room signal is a screen you can no longer teach from.
3. Apply ≠ Save, and saving renames your file — the ritual will decay; forget it Monday and the day's changes silently revert.
4. Pin + focus collides with itself — the pinned timer covers the ⛶ you need to exit, and there's no Escape on a panel.
5. Focus mode makes everything unpinned unreachable — changing work mode mid-lesson costs 3 taps and a layout flash.
6. Lock is one tap off, and timer Start/Reset stay live while locked; scene switching is locked out (it's arguably a view action).
7. Embed feedback is invisible — a rejected link just vanishes with no message; also found a real `draftFor` staleness path that can write period B's deck over period A's slot.
8. Digit time-entry depends on an invisible "selected widget" concept; fine with a keyboard, undiscoverable on the panel.
9. Roster entry is a laptop job — and that's okay (once a semester, ten minutes, good validation).
10. A Slides *edit* link on the signed-out Chromebox will show the class a Google login wall — the empty-state should warn that only Publish-to-web links work there.

### Missing features (respecting the constraints)
- **Absent-today marking** — the #1 daily reality: the picker will call on the kid who's home sick. Tap names out for today; session-only, resets naturally.
- **Per-period agenda** — the embed learned per-period; the agenda didn't. Three preps = 6th period staring at 1st period's plan.
- **Warning chime** — the 2-minute warning is visual-only; the chime and the threshold both exist, just not wired together.
- **"Until the bell" timer preset** — said in every middle-school room daily; the math is already there.
- **Groups by count** ("make me 4 groups" for 4 stations), not just by size.
- **A gentler timer-end option** — a pacing timer for the teacher shouldn't detonate over the slides.

### Teacher's top 10 (value per unit of complexity)
1. Spawn into empty space. 2. De-escalate TIME'S UP to a corner badge after ~45s. 3. Absent-today toggles. 4. Stable download filename + tappable dirty dot. 5. Warning-chime checkbox. 6. Focused widget's exit control always above pinned widgets. 7. Hold-to-unlock (~1.5s) + allow scene switching while locked. 8. Per-period agenda. 9. "Until bell" preset chip. 10. Feedback line on rejected embed links + the draftFor fix.

*Tap-count reality: cold full build ≈ 49 gestures, once. Daily minimum on a saved copy: 4 taps + typing the agenda. "That beats my document camera."*

---

## Review 3 — The Apple design engineer

*Measured everything: hit boxes, computed font sizes, contrast ratios, at 1366×768, 1920×1080, and 390×844. Verdict:*

> **What it gets right:** "This is a real design system, not a theme." Palette discipline is near-WCAG-clean everywhere it matters (navy/cream 11.76:1); the strip-color taxonomy is genuinely good; the clock's 175→58→36px hierarchy is a correct 30-foot reading order; the shed ladders are the kind of thing production apps never bother with.
>
> **The single biggest gap:** "The interaction layer has no physical feedback and no motion vocabulary. There are exactly four transition rules and **zero `:active` styles** — on an IR touch panel, `:hover` never fires, which means *not one control in this app visibly responds to a finger press*. The visual system says friendly, physical, papercraft; the interaction system says spreadsheet."

### Measured findings
- Strip buttons ✎⛶⇈✕: **27–29 × 19–22px** — 43% of the 44px touch minimum, sitting inside a drag surface, so a missed press starts a drag.
- Scoreboard/tally **+1 — the most-tapped button in the room — is 44×22px**, with − only 8px away: a coarse IR tap aimed at +1 can subtract.
- Resize handles drawn in shadow color: **1.69:1 against the card — functionally invisible**.
- Hero numerals improvised per widget — nine different scales; on the default board the clock reads at 175px while the timer ring digits cap at **56px** (3.1× disparity between the two numbers kids most need).
- Shed ladder inverts priority in the 250–340px band: digits shrink to 28px while preset chips survive.
- **TIME'S UP: white-on-coral 2.47:1** (fails the 3:1 large-text floor); last-10-seconds digits drop to 2.47:1 exactly when everyone looks up.
- Grid snap is mathematically true (mod-48 = 0 verified) — but the canvas origin is off-grid, so the board never sits on its own graph paper.
- Icons come from Unicode fallback fonts: three sizes, wobbling baselines, and the ✎ renders in the *emoji* font.
- + Add menu: 17 identical pills, unordered — Countdown sits 12 rows from Timer.
- Phone: header burns 224px of 844 advertising keyboard shortcuts to a device with no keyboard; **the + Add menu overflows to 518px in a 390px viewport**, causing real mis-taps.
- The locked-state Unlock button is coral — diluting the contractually alert-only color.

### Designer's top 10 (all within the constraints; mostly <20 lines of CSS each)
1. Feed the timer digits (`clamp(20px, 15cqmin, 120px)`; shed chips before digits).
2. Urgent = most readable: navy digits on a coral chip (5.31:1) for low-time and `#alarm h1` — coral becomes the *ground*, not the ink.
3. One global `:active` rule — `transform: translateY(1px) scale(.97)` (+ shadow-collapse on shadowed cards): the hard-offset shadow system gives a free, on-brand "pressed" affordance.
4. Inflate strip buttons and +1 to 44px effective hit boxes via negative-margin padding — zero visual change.
5. Cascade spawns +48px per add (grid-snapped) with a 180ms arrival animation.
6. One easing token (`cubic-bezier(.32,.72,0,1)`, ~220ms) for the three big teleports: focus, post-drag snap-settle, scene cross-fade. Never during drag; reduced-motion guarded.
7. Group the + Add menu: TIME / STUDENTS / CLASSROOM / BOARD section labels — 17 items become four scannable fours.
8. Replace the six Unicode glyphs with one inline SVG symbol set (one stroke weight, no more emoji pencil); make resize handles turquoise-on-selection instead of invisible.
9. Fix the phone header (hide keyboard hints) and pin the + Add menu inside the viewport (`position:fixed`, 2 columns).
10. Return coral to the alarm: navy/turquoise Lock button; align the painted grid to the canvas origin.

### Three delight ideas
1. **The +1 pop** — 250ms overshoot spring on the score numeral; a 6-dot turquoise ring on every multiple of 10. Silent, over before it distracts.
2. **The boat** — it's called Deckhand; there's no boat. A 24px paper sailboat riding the existing wave layer, drifting on a 45s loop; one hop when an alarm is dismissed; sails across at passing period.
3. **Drawn checkmarks** — agenda checks stroke in over 300ms with a left-to-right strike wipe. Crossing off the warm-up becomes a tiny ceremony.

---

## Synthesis: a proposed roadmap

**v6.11 — "Survive the students" (hardening).** Drag deadlock (HIGH), config-parse banner + download guard, sanitize bounds (bell blocks, geometry, widget-label dedupe), lock-on-release re-check, dirty-snapshot fix for noise records, hold-to-unlock + scene-switch-while-locked + timer buttons respect lock.

**v6.12 — "The teaching day" (classroom features).** Spawn cascade, TIME'S UP de-escalation + per-timer gentle-finish option, absent-today toggles, "until bell" preset, per-period agenda, warning chime checkbox, stable download filename + tappable dirty dot + end-of-day nudge, focus-exit always reachable, embed rejection feedback + draftFor fix, groups-by-count.

**v6.13 — "The feel" (design).** Pressed states everywhere, 44px hit boxes, timer digit scale + urgent-state chip treatment, alarm entrance + navy-on-coral, SVG icon set, grouped + Add menu, motion tokens for focus/snap/scene, grid-aligned background, phone header/menu fixes, non-coral Lock — plus the boat, the +1 pop, and the drawn checkmarks.

Every item above respects the hard constraints: one file, no storage, no new dependencies, file:// on a managed Chromebox.
