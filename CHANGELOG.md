# Changelog

The full per-version story lives in `docs/HANDOFF.md`; this is the short form.

## 7.47.0 — 2026-10-10

**The name picker, settled.** Croix: "Can you take another look at the name picker. I want it to be
easy to use and not break. And apple quality of design."

- **Nothing moves under your finger.** The three buttons — Refused, Pick another, Problem #1 — are
  there from the moment the card opens, in the same three spots in every state. While the names
  shuffle they dim; once a name lands they come on. The "Problem N" line above the name is always
  reserved, and a long name set smaller no longer shortens the card.
- **One action that matters.** Pick another is the only filled button. Refused and Problem #1 are
  quiet, so the eye lands on the right one.
- **Done numbering.** Once you've started a list, the third button becomes "Done numbering". One
  tap ends the numbering and leaves the list up. The next Problem #1 starts a new list.
- **The head is just the class and the count** — no title to read past. The count shows from the
  first moment.
- **Small things:** the name lands with a soft pop; a finger's double tap on Pick another is one
  pick; Refused after Done numbering still takes that student off the list; on a 1366-wide screen
  the primary gets its own row so nothing is clipped.

## 7.46.3 — 2026-10-10

**The board list, with restraint.** Croix: "I want you to take an Apple look. Then decide how to
fix it."

- One frosted white strip, centered under the stage bar, that hugs its names: translucent over
  the slide with a hairline edge and a soft shadow. No outlines on the letters, no dark band.
- The names are all one weight. The numbers are smaller and teal, set just before each name.
- About 56px on the panel for up to six names, 44px for twelve; never more than a fifth of the
  screen tall.
- Taps still pass through to the slide. The small ✕ at the strip's end clears it.

## 7.46.2 — 2026-10-10

**The board list, just the names.** Croix: "Woah no not like that. That's scary. Just text of their
name."

- No band and no box. The numbers and names are plain large text across the top of the slides:
  navy names, teal numbers, with a thin white edge so they read on any slide.
- The text is about 7.5% of the screen's height for a short list and shrinks as the list grows.
  It never takes more than a quarter of the screen.
- Taps go straight through the names to the slide. Only the small faint ✕ in the corner takes a
  tap.

## 7.46.1 — 2026-10-10

**The board list, big.** Croix: "That's not quite there. I want the names up and large with their
numbers. Not tiny and pill form."

- The list is now a navy band across the top of the screen, just under the stage bar. Each entry
  reads "1. Bob" with a turquoise number and a big white name.
- The names are as large as the band allows: about a tenth of the screen's height for a short
  list. They shrink only as the list grows, and the band never takes more than a third of the
  screen.
- With the pen out on the left, the band starts after the pen's colors. It also hides while a
  menu is open.

## 7.46.0 — 2026-10-10

**The board list.** Croix: "can I get an option after the first name is drawn to add it to a quick
list that hangs the name at the top of the screen for a set of problems to solve on the board…
I get an option to assign bob to question 1. From there, every consequetive roll gets an
assignment number. It goes up until I dismiss the picker to where it would restart. But the names
would be counted as picked. Id also want the refused button." (Asked: the list stays until you
clear it; the numbers come by themselves.)

- Once a name is up, the name picker offers **Problem #1**. Tapping it hangs "1 Bob" at the top
  of the screen.
- From then on, every pick gets the next number by itself ("Problem 2", "Problem 3"…). While
  you're numbering, the picker stays up instead of putting itself away.
- **Refused** still works: that student gets their comment-card step, comes off the list, goes back
  into the round, and their number goes to the next pick.
- Closing the picker (✕, a tap outside, the clicker, Escape) ends the numbering. The list stays up
  for the students at the board until you tap its ✕. The next Problem #1 starts a new list.
- Names on the list count as picked for the round.
- The list stays clear of the stage bar and its tabs. When the bar is crowded, it hangs just
  under it. It hides behind Settings and a ringing timer, and it clears itself when the next
  class starts.

## 7.45.0 — 2026-10-10

**Slides off for the day, and Refused on the name picker.**

Croix: "Can you make it so I have an option to turn off the auto slides. Today I pivoted and
decided to not do notes. But it was awkward for the slides to keep coming up." (Asked: just
today, one tap during class.)

- **⋮ → Slides after the bell** turns the bell's hand-off to the slides off **for today**. It
  turns itself back on tomorrow, and a reload keeps it off for the rest of the day. The settle-in
  count still runs, then the clock face comes back. A deck that was on the stage when the bell
  rang goes to its tab instead of onto the board. A deck that was only sitting on the board stays
  where it was.
- When the bell skips the slides, a toast says "Slides are off for today". Its **Slides on** button
  brings them back right away, along with any running timer.
- **Minimize on the stage** now offers **Keep off today**, so the switch is one tap at the moment
  you put the slides away.
- Slides you already have up stay up when you turn the switch off.

Croix: "Could I have a refused button that only shows up after the student is picked? … for
students who refuse to go up to the board to do the problem. Or refuse to try to give me an
answer. If clicked, it will trigger a comment card strike. The comment card tab should pull up
and fade away. And add the student back into the que."

- **Refused** appears beside "Pick another" once a name is up (not while the names shuffle).
- One tap gives that student one step on the comment cards: a warning first, then a card, the
  same as tapping their tile.
- The comment cards come up showing "Name — warning (refused)" with Undo, then fade away after
  four seconds. Touching the sheet keeps it up.
- The student goes back into the class's round at a random later spot, never as the very next
  pick. Undo takes back both the mark and the extra turn.
- A double tap on Refused can't mark a second student, and a tap while the sheet is fading
  doesn't mark anyone.

## 7.44.0 — 2026-10-09

**The update banner goes away by itself.** Croix: "That saved your board and rosters message, can
you have it go away after a few seconds."

- "Deckhand 7.44 — your saved board and rosters were kept." now fades out after six seconds.
  When it also offers **Use the new bell schedule**, it waits fifteen seconds so there is time to
  read the offer. Touching it keeps it up until you tap × or the button.
- A tap on the banner while it fades still counts. It keeps the banner up and never lands on the
  card underneath.
- The warnings that use the same banner still stay until you dismiss them: a newer file, a board
  this file can't read, or another window saving the board.

## 7.43.0 — 2026-10-08

**Done on a note, in one tap.** Croix: "The text box tool was super weird. The title wouldn't go
away when I clicked done. Then it worked. Then it didn't. Then I held down done and it worked. I
want to be able to just tap done."

- **One tap on Done closes the note, every time.** Done used to close the editor the moment a
  finger touched it, so the toolbar was gone before the finger lifted — and the tap then landed on
  the note that slid up under it, which opened the editor again. (A mouse never showed it; a
  finger did, every time. A long press makes no tap, which is why holding Done worked.) Now the
  note closes when the finger lifts on Done — a quick tap, a press held, or a tap whose finger
  slid a little.
- **On the stage, Done is clear of the Timer · Minimize · Exit bar.** With a note on the stage,
  that bar covered the top of Done, so a tap there could hit Timer or Exit instead.
- **A double tap on Done doesn't reopen it**: for half a second, a tap on the note where Done was
  is ignored. A tap anywhere else on the note opens it straight away.
- **A note being written over the slides stays open while you think.** The board used to hand the
  keyboard back to the slides after twenty seconds without a key, which closed the note. A note
  (or an agenda) now keeps it for a minute and a half without a key. The clicker's page key still
  closes the note at once and the next press turns the slide.

## 7.42.0 — 2026-10-08

**The clicker.** Croix: "Will it dismiss the stuff if I click my clicker? I also had a ton of
issues with it losing that. Sometimes when I'd draw it wouldn't work until I physically clicked
the slides. Sometimes when I used the tools it was the same thing."

- **It no longer goes dead.** The slides got the keys back only at particular moments, so a touch
  on any card over the slides (a tally's +1, the sketch pad, a drag) or on the fullscreen corner
  left the clicker dead until the slide was tapped. Now the slides get the keys back a moment
  after every touch on the board.
- **Refresh, and the slides coming back at the bell, no longer kill it.** Google Slides runs in a
  separate browser process; when its frame reloaded, the keys fell back to the board while the
  frame still looked focused, and nothing noticed. That is now detected and repaired. (This one
  was also there before 7.42.)
- **If a press ever does land on the board, that press sends the keys back** and the next one
  turns the slide. An unfinished timer or Mathle entry, a list that was opened and left, a ticked
  box, or a note left with the caret in it can no longer hold the clicker.
- **A click puts away what is up**: a name, the comment cards, the reminder, a ringing timer (and
  the pen, as before). The slide does not turn on that click; the next click turns it.
- **The menu handle is out of the Slides corner.** On the stage the folded handle sits under the
  other tools on the left edge (or first in the row with the right-hand pen), so the player's
  arrows and page-number list are clear. Unfolded, the bar still opens along the bottom.

Not changed: a tap inside another card's own frame (a video over the slides) keeps the keys there
until the board is next touched. With a keyboard at the board, shortcuts typed after touching a
card now go to the slides (+ Add → Timer → digits, and "Type a time…", still work for a few
seconds). Three new tests on a deck served from another origin, as Slides is; 291.

## 7.41.0 — 2026-10-07

**Tools over the slides in one tap.** Croix: "sometimes when I click on a minimized tab it just
deleted instead of popping up… the flow is expand the bottom menu, add, find it, then I can use
it, then I've got to minimize it to get back to the slides. There wasn't much flow."

- **The vanishing tab.** With slides on the stage, a minimized card came back underneath them:
  its tab was gone and nothing appeared. It now comes up over the slides. A "Stage only" deck's
  tab stages it in one tap (it used to turn into a second tab).
- **Tabs on the stage.** While a card is staged, the cards you have put away have a tab in the
  stage bar (top right). A tap brings one up over the slides, the same tap tucks it away — no
  bottom menu, locked or not. A card that came up from a tab goes back to it when the stage ends,
  so its tab is there for the next class's slides.
- **The name picker is a button by the pen.** One tap picks a name and shows it big over the
  slides; "Pick another" (or the button again) picks the next; it puts itself away after eight
  seconds or on a tap anywhere else. Nobody is called twice until everyone has been, absent
  students are skipped, and the round is shared with the Name Picker card. The clicker keeps
  turning slides while a name is up.
- **The buttons by the pen say what they are.** "Comment cards" and "Pick a name" show for a
  few seconds each time a card takes the stage. Over staged slides, + Add → Comment Cards or
  Name Picker opens the quick tool and points at its button, instead of adding a card.
- A minimized timer summoned from the stage bar comes out of its tab (it used to count down
  unseen). A ringing timer stands the quick tools and their buttons down.

Four new tests; 288. The bell block is unchanged.

## 7.40.0 — 2026-10-06

**The comment cards, rebuilt for the hand.** Croix: "It needs more development. It was awkward and
wonky to use." What was off: "Finding the student" and "The pop-up over slides".

- **One panel everywhere.** The whole class shows at once with no scrolling, A to Z by the name on
  the tile, as large as the box allows. The column count goes with the class size, so a student is
  in the same place in the card, on the stage and in the quick-draw. A long name is set smaller on
  its own tile; it does not shrink the class.
- **A tap steps up, a − steps down.** Warning, card, another card. A marked tile carries its own −;
  the timed hold is gone. Every tap says what it did ("Dante — warning") beside an Undo. A quick
  double tap is always two steps up, even where the − has just appeared under the finger.
- **The quick-draw over slides is a sheet.** The opener is larger and no longer faint. The class
  comes up big on the pen's side, and gets out of the way by itself: eight seconds after a tap
  (a bar runs down beside the Undo), half a minute if nothing is tapped, at once on a tap anywhere
  outside it. No tap reaches the slide underneath, including one that arrives just after the
  sheet has closed itself. Escape closes it too.
- **Handed in.** The reminder's names are buttons: tap one when the card is handed in. The log
  shows who is in and who still owes one, and "Still owed" lists the last two weeks to tap off
  later. The opener's badge and the wrap-up count the cards still owed. Reminder (card and sheet)
  brings the reminder back.
- **A late card gets its reminder.** A card given after the reminder has been up brings it back,
  a few seconds after the last tap. The reminder comes up a moment after the minutes-left number
  instead of under it.
- **Marks survive a reload.** Today's marks are kept on the device and cleared at midnight. The
  log holds each card the moment it is given, so nothing waits on the bell. The tiles keep the
  class's marks until the day ends.
- The reminder and the sheet take the keyboard while they are up, so the clicker turns no slide
  behind them. A ringing timer takes the screen from both.

Six new tests, two rewritten; 284. The bell block is unchanged. Log entries gain `in` (who handed
theirs in); entries from before 7.40 have none and are not chased. Not changed: a class picked by
hand in the card (not the bell's class) gets no automatic reminder and no badge.

## 7.39.0 — 2026-10-06

**Class lists found on their own.** Croix: "The class lists were in the browser because cadence
was able to pull them up. Deckhand was not." Cadence keeps its own copy of the roster and shows it
by itself; Deckhand only read the Seating Chart's store, and only from a button.

- Deckhand now reads both: the Seating Chart's data, then the roster Cadence keeps.
- A board that has never had rosters looks when it opens. The Seating Chart's own lists load, with
  a notice and Undo. Cadence's copy (roster first names, no "goes by" names) is offered for Review
  instead: the boxes fill and Apply keeps them.
- Boxes she empties stay empty; a board that already has rosters is never touched.
- A period's number is read more carefully ("Sem 2 - Period 4" is 4th), and two periods that read
  as the same number are named in the message, not merged into one class.
- A typed nickname is used exactly as typed; names that arrive in capitals are tidied.
- The button is "Import class lists from this browser".

The tools still have to be opened the same way (all as files, or all at one web address) to see
each other's data. The bell block is unchanged.

## 7.38.0 — 2026-10-03

**The reminder's timing is a setting.** Croix: "Yeah make it a setting." Settings → Bells →
"Comment-card reminder before the bell", on by default at 3 minutes (1–15). Off, the reminder
never shows and the cards are still recorded at the bell. One test; 275.

## 7.37.0 — 2026-10-03

**The reminder is automatic.** Croix: "Can it just automatic at 3 minutes left in class if there
have been students who got comment cards it triggers a reminder." The End of class button is
gone from the card and the quick draw. Three minutes before the bell, if anyone in the room has a
comment card, the cards are recorded and the reminder fills the screen on its own (a soft note
with it), over slides or anything else, until Done, Escape, Enter or Space, or the bell. Once per
class. A card given in those last three minutes is recorded at the bell. Lunch never reminds.

## 7.36.0 — 2026-10-03

**More than one card.** Croix: "what happens if the kid needs another tap. I want it to be able
to add additional comments within the same period." Tapping a name keeps adding: warning, a
card, a second card, a third ("Comment cards ×2"). Press and hold a tile for half a second to
take one back. The count follows everywhere: the strip ("3 cards"), the End of class reminder
("Ava ×2"), the wrap-up line, the log's totals and days, and Copy. This applies to the card on the
board and the quick draw alike.

## 7.35.0 — 2026-10-03

**Comment cards, quick draw.** Croix: "Can you make it a quick draw like the pen. So I can pull it
up quickly even if slides are on the screen." On a staged card (slides or anything else) a third
blob sits under the pen and the magnifier. One tap opens the tracker as a see-through popover
over the slides: the class in the room as tiles, the same warnings and cards the board's card
shows (there's one set per class per day, whichever way you put them in). A badge on the blob
counts the cards due. End of class in the popover records them and fills the whole screen with
the reminder until Done (Escape, Enter or Space close it too). Nothing needs to be on the board
for it; Exit isn't needed either. The pen closes it, and the slides get the keys back when it
closes. One test; 274.

## 7.34.1 — 2026-10-03

**Mathle, smoothed out.** Croix: "Mathle is kinda wonky. It works but it's not buttery smooth."
The board is built once per word and updated in place, so a keystroke changes one tile instead
of redrawing the grid. A typed letter pops in. A guess turns over tile by tile, each taking its
colour at the half-turn, and the keys colour once the last tile lands; a win bounces the row. The
message line keeps a fixed height, so nothing under it jumps when "Not a word" flashes or the
hint appears. The tiles are only re-measured when the card itself changes size. On a small card
the on-screen keyboard steps aside (type on the real one); on the stage it's there. Keys ignore
double-tap zoom and text selection on the panel.

## 7.34.0 — 2026-10-03

**Mathle checks the dictionary.** Croix: "Add a dictionary so it rejects non-words." A guess has
to be a real word now: about 35,000 common English words of four to thirteen letters are built
into the file (every vocabulary word included), and a guess that isn't one shakes with "Not a
word" instead of using up a try. Decoding a length's list takes a few milliseconds the first
time it's needed, so nothing is slower. The file grew by about 180 KB.

## 7.33.0 — 2026-10-03

**Cadence on the board, and Mathle.** Croix: "Add this as a tool. Also my kids go absolutely nuts
over wordle. Can you make your own version with all of the big math vocabulary words. Cadence
should have all of the words."

- **Cadence** (+ Add → Media): the bellwork generator opens in a card, stage-able like Slides,
  with Refresh on the stage bar. With nothing set it opens `cadence.html` from the same folder
  Deckhand is in (the Drive folder on the panel, or the same web address), so there's nothing to
  type. ✎ sets another link. The file itself stays out of this repo.
- **Mathle** (+ Add → Math): a Wordle for the vocabulary. The 111 words are Cadence's — the
  Florida B.E.S.T. glossary for grades 6–8 (single words from four to thirteen letters; the key
  word of a longer term stands in for it). The word of the day is the same in every period, so
  periods can compare; New word deals another. Six guesses, any length. Tiles and keys use the
  game's own colours, the green, mustard and grey the kids know (Croix, on a first cut in the
  board's palette: "its colors are not great"). Guesses aren't checked against a dictionary — any
  letters go, so the class can test a hunch. Type on a keyboard while the
  card is selected, or tap the keys on the card. Hint shows the definition with the word blanked;
  the end reveals the word with its definition. A grade band (7, 7–8, 6–8, 6, 8) picks the pool.
  The + Add menu is a column wider to hold it.

Two tests; 273.

## 7.32.0 — 2026-10-03

**Comment Cards.** Croix: "A comment card tracker. Let me pull students up and put them on
warning. Then I'll tag them as comment card. And I'll hit it at the end of class." And: "a two
fold thing. A tracker, a reminder at the end of class for whatever students to bring me their
comment cards." A new card in + Add → Room.

- **The tracker.** The class in the room (following the bells, or a period you pick) as a tidy
  grid of flat name tiles. Tap a name once for a **warning** (a yellow tile), again for the
  **comment card** (navy), again to clear it. The strip counts warnings and cards. It works while
  locked.
- **The reminder.** **End of class** records today's cards in the log and puts the reminder on the
  whole board: the names, big, and "Bring yours to Mr. Shaffer before you leave." Done (or Exit)
  brings the board back. Three minutes out, the wrap-up lists the same names on its own screen.
  If the bell changes the class before you tap End of class, the cards are recorded then.
- **The log.** Each student's total for the period, the cards by day, Copy to paste the list
  anywhere, and Clear today (a second tap confirms).

Only cards are recorded, never warnings. The log is saved with the board on this device, like the
rosters, and never goes in the public file (the privacy guard refuses a copy that carries one).
One test; 271.

## 7.31.0 — 2026-10-01

**Music between classes, and straight to the slides.** Croix: "Can I also get the option to have
music to play during passing time, but then fade out during the 30 second settle in. For the last
10 seconds, I want the ticking down. Also remove the still standing comment card action and jump
straight into the slides."

- **Music in passing time** (Settings → Bells → Settle-in at the bell). When a class lets out, a
  lofi side (one you pick, or the album shuffled), a nature sound, or both, fade in over three
  seconds. At the next bell they fade out during the settle-in and are silent by the time the
  last ten seconds start ticking. With no settle-in, they fade over ten seconds at the bell. A
  volume choice (soft, medium, loud). It never plays over the Music card if that's already
  playing. Sound Off or the Now Playing pill ("Passing · …") stops it until the next passing
  time, and alarms duck it. Off until you turn it on.
- **Zero goes straight to the slides.** The "Still standing? Comment card." message is gone from
  the routine: when the count hits zero, the soft note sounds and the slides take the stage. The
  message is still there as an option ("A message at zero, then the slides") for anyone who wants it.
- The countdown's ticking is unchanged: silent until ten seconds remain, then a tick each second
  that swells, with half-beats in the last five.

One test; 270.

## 7.30.0 — 2026-10-01

**Lunch, haunted.** Croix: "Well it is October tomorrow, so they need to be haunted or spooky for
this month." In October the lunch tray turns spooky. The sandwich is a Franken-sandwich (green
bread, stitches, bolts, sleepy eyes). The apple is a jack-o'-lantern whose candle flickers. The
cookie is a spider cookie with candy eyes and legs that twitch. The tray turns pumpkin orange. The
milk carton says BOO, and a ghost hiding behind it peeks over its shoulder every few seconds and
pops right up when you tap the milk. The taps all still work (three bites of the spider cookie,
then a fresh one). November 1 brings the everyday lunch back by itself. One test; 269.

## 7.29.0 — 2026-09-30

**Lunch on the board.** Croix: "Can I get a fun lunch graphic for during lunch time?" During the
Lunch block the clock card gets company. On the left is a tray: a sandwich with a face, a green
apple, and a chocolate-chip cookie. On the right is a milk carton with a bendy straw. They blink,
the sandwich chomps now and then, the apple bobs and the straw wiggles. Small taps: the sandwich
takes a big chomp, the apple hops and spins, the milk slurps, and the cookie loses a bite (after
three it's a fresh cookie). They're drawn in the board's own colours (coral stays the alarm's),
sized to the card, and left out when the card is too small or motion is turned off. When the bell
ends Lunch, they're gone. One test; 268.

## 7.28.0 — 2026-09-30

**Three fixes from the day's teaching.**

- **The Now Playing pill moves.** Croix: "Can I have the ability to move the now playing pill?
  It's front and center and blocks my slides." Drag it anywhere (a small grip shows it can be
  dragged). It stays where you left it, on every screen and after a reload. A tap still pauses; a
  drag never does.
- **Refresh the slides.** Croix: "Can I get a refresh button for the embed? I made some edits to my
  Google slides, and I couldn't get the embed to update." A ↻ on the Slides card's strip, and
  **Refresh** on the stage bar (Timer · Refresh · Minimize · Exit) when slides are staged. The deck
  reloads with your edits, and the clicker keeps working. It starts again from the first slide,
  and a "Publish to web" link can take Google a few minutes to update.
- **The pen tools on the left.** Croix: "Can I have a vertical pen menu on the left side of the
  screen. It's awkward to walk across the board every time to click it open." The pen tools now
  stand upright along the left edge, centred, and on staged slides the pen and magnifier sit
  mid-left too. ⇄ on the bar sends them to the bottom-right corner and back, and the side is
  remembered.

Three tests; 267.

## 7.27.0 — 2026-09-30

**Softer rain, a forest you can hear, a sea that breaks.** Croix: "The forest, there's like a white
noise and I can't hear many forest sounds besides the birds. It's almost there. Ocean sounded super
artificial. Not at all like a real ocean. The rain was too much, it was like sitting next to a
faucet instead of rain on the roof or rain on the window."

**Rain** is now two sounds, and neither has the bright hiss. **Rain on the roof** (it replaces Heavy
rain) is a muffled patter of drops landing dull, a low roof rumble, and two gutters dripping into a
puddle at their own pace. **Rain on the window** is drops tapping the glass and ringing for a moment,
the odd bigger splat, and now and then a drop running down, with the rain outside muffled behind
it. The **Thunderstorm** sits on the roof rain.

The **forest's** wind is mostly still now: a gust comes through now and then and dies away, with no
hiss underneath. The other animals come far more often and louder: crickets for 15–35 seconds at a
time, a woodpecker, frogs, a crow, a squirrel chattering, something walking through the leaves, and
an owl. The two birds are still there.

The **ocean** has no more filter sweeps. Each wave is one of four pre-made breakers: a rough swell
made of thousands of small splashes, a crash, then foam fizzing as it drains. Each plays at its own
size and speed along the beach, sometimes with a smaller one further down, over a low surf that
breathes. One test; 264.

## 7.26.0 — 2026-09-30

**A real forest, an ocean, and smoother changes.** Croix: "The forest one was super washed out with
static. It should be animal noises and wind sounds, crickets occasionally, birds, other animals.
Can you add in an ocean one. The rain and storm sounded obvious when it changed tracks. I need it
smoother."

The **forest** lost its hiss. The wind is now a low whoosh that rises and opens with each gust, and
the leaves only rustle at the top of a gust. There are two birds singing on their own schedules
(whistles, warblers, trills, chips, and now and then a dove), crickets in bouts of 10–25 seconds, a
woodpecker, a crow, frogs and, rarely, an owl.

**Ocean** is new: waves swell and brighten as they rise, crash, and fizz back, each one a different
size, with the next coming in as the last pulls back. There's a low surf underneath and a gull far
off now and then.

**Smoother:** switching sounds is now a long cross-fade (about five seconds), and the level eases
when the music comes or goes. When a nature sound is on, the lofi side's own rain is muted, so the
rain you hear never changes when the track changes. Between sides, a side's own rain and needle
glide over several seconds. The rain uses two drop layers of different lengths, so its pattern
never lines up the same way. One test; 263.

## 7.25.0 — 2026-09-30

**Midnight jazz.** Croix: "I really like the slow piano jazz with the storm going on. It's cozy.
Think you can replicate this?" A new side: a slow piano trio ballad at 60 bpm. Eight jazz chords
(ii–V–I, and a VI7 pulling back to ii). The left hand holds soft jazz voicings and answers them
quietly. A run falls down the chord where the tune rests. The melody swings and leans into its
strong notes with a grace note. Upright bass plays in two and brushes are barely there. It comes
with the storm: picking it when no nature sound is on turns on Thunderstorm underneath. Turning the
storm off afterwards sticks, and a sound that's already on is kept. One test; 262.

## 7.24.0 — 2026-09-30

**The quiet album, and nature sounds.** Croix: "The second track was really cool. Everything else
was terrible. They were too fast paced or scratchy. Mostly too fast paced. Not at all relaxing…
are you able to produce nature noises as well? I'd love a crackling fire, heavy rain, a
thunderstorm, a babbling brook, forest sounds, as well as a revamped lofi album."

The album is rebuilt around Rainy window, which is now side A and unchanged. Every side runs at
56–68 bpm. The keys hold or roll slowly, one note a beat, instead of stabbing. The drums are soft
(new quiet kits: a slow beat, brushes, a shaker) or absent. The crackle is barely there and the
tape hardly wobbles. The sides: Rainy window, Slow morning, Reading nook, Snowfall, Lanterns,
Sunday tea, Night study, Window seat, Harbor lights, Last light (and Graveyard shift in October,
slowed down too).

The Music card's picker now has a **Nature** row: Crackling fire, Heavy rain, Thunderstorm,
Babbling brook, Forest, and (asked for mid-build) **Brown noise** and **White noise**. A sound plays under the lofi (quieter) or alone with **No music**. With no
music, Next › walks the sounds. It's all made in the browser: the beds are long loops that never
line up the same way twice, and the crackles, thunder and birds are scheduled live so nothing
repeats on a pattern. The choice is saved with the board. One test; 261.

## 7.23.0 — 2026-09-30

**A new tape.** Croix: "Several of the tracks sound almost the same. I want some good study music
lofi." They did: the old sides shared one recipe, and four of them were the same e-piano over the
same beat. The Music card now plays a rebuilt engine where every side is its own band and its own
song. Rhodes, felt piano, nylon and clean guitar, kalimba, vibes, pads and synths. Melodies on
piano, flute, vibes, glockenspiel, guitar and a synth lead. Upright, sub or synth bass. Boom bap,
dusty half-time, jazz-hop ride, bossa, a waltz with brushes, and a steady four-on-the-floor. The
chords are 7ths, 9ths and 13ths, voice-led. Each side has a form: a filtered intro, the tune, a
B section, a breakdown with the drums out, the tune again, and a filtered outro, about two minutes
long. Each side has its own melody and plays the same tune every time. The tape adds a room, a
tempo-synced echo, wow and flutter, saturation, a compressor that pumps with the kick, vinyl
crackle, and rain on the rainy sides. The sides: Porch swing, Rainy window, Late bus, Library,
Kalimba, Night drive, Brushes, Bossa, Fog, Corner store (and Graveyard shift in October). It is
still pure Web Audio: no files, works offline. One test; 260.

## 7.22.0 — 2026-09-29

**Pick the side.** Croix: "the low fi music. Can I get a way to pick which track I'm listening to."
The side's name on the Music card is now a button: tap it and every side is listed with a one-line
feel ("easy · keys, a beat", "slow · pads, no drums"). Tap one and it plays straight away. **Repeat
this side** keeps it looping instead of moving on to the next shuffled side. The pick and the repeat
are saved with the board, so the card opens on the same side tomorrow. Next › still skips as
before. One test; 259.

## 7.21.0 — 2026-09-29

**Zoom for the back row.** Croix: "a couple of times I had students claiming they can't see from
the back row… what I'd really like is a way to zoom." On a staged card (slides, or anything on the
full board) a magnifier blob sits beside the pen in the bottom-right corner. One tap zooms to 150%;
drag to move around the slide, pinch (or the wheel) to zoom, double-tap a spot for 2× there (again
for 100%), or use − / + (125% up to 400%) on the bar that replaces the blob; Done goes back. The
clicker keeps turning slides at any zoom — the slides get the keys back after every touch — and
leaving the stage resets to 100%. It magnifies the whole slide (another site's page can't have its
text enlarged from outside), so it's sharp, not a blown-up picture. One test; 258.

## 7.20.0 — 2026-09-29

**The tape always has a pause.** Croix: "I played some of the lofi music, but closed the window
before hitting pause. The music kept playing and there wasn't a way for me to stop it." The lofi
tape kept playing when its card was minimized, on Home, or covered by a staged deck — with no
control in sight. Now a **Now Playing** pill (top centre: the side's name and **Pause**) appears
whenever the tape plays and no playing card is on screen, and one tap stops it. **Sound Off** (M,
or ⋮ → Sound) silences the tape too. Removing the card or switching scenes already stopped it.
One test; 257.

## 7.19.0 — 2026-09-29

**Ready for a web address.** Croix: "why don't we go ahead and run the whole thing in one of my
domains since I already own and pay for it." Served from an https address, Deckhand now installs
as an app (Chrome offers Install; its own icon and window) and opens even when the network drops
(an offline worker keeps the last copy; every online load still takes the newest file, so updates
just arrive). The Drive file is unchanged — it never asks for the web app's files. **Import a
board** (Settings → Device) brings a board in from an exported copy — layout, bells, rosters and
all — after one confirming tap: saved boards live per address, so this is how the board moves from
the Drive file to the web address (Export a copy there, Import it here). New files beside the app:
`deckhand.webmanifest`, `deckhand-sw.js`, `icons/`. One test; 256.

## 7.18.0 — 2026-09-29

**Minimize, and the three-minute flash.** Croix: "I have one period slides up and we finish class.
Well usually I collapse the screen, flip on the main clock, then hide the embed for next class…
One is a minimize and two is a faint over all the screens warning that there are 3 minutes left
in class no matter what screen I'm on. Just a 3 will do." **Minimize** is a — on every card's strip
and a Minimize button on the stage bar (Timer · Minimize · Exit): one tap takes the card off the
board — and off the stage, so the clock is back — to a chip in the dock ("— Slides"); the chip
brings it back. A minimized deck or video unloads (no sound, no stale slide); a minimized timer
keeps counting and still rings. It stays minimized through a reload, and **the next bell's
settle-in brings the slides back by itself** when it hands the room to them (the next period's
deck). **The flash**: when a class has three minutes left, a faint 3 fills the screen for about
two and a half seconds — over the board, the staged slides, Home or the pen — and is gone. Once a
class, only at the crossing (a board opened with 2:30 left stays quiet), never for Lunch.
Settings → Bells: on/off and the minute (1–10). Two tests; 255.

## 7.17.0 — 2026-09-29

**A bigger number line.** Croix: "Can I have the option to have a bigger number line. Like more
digits." Beside the range chip, **− and +** give fewer or more numbers without typing: a line
through zero grows both ways (±5 → ±10 → ±20 → ±50 → ±100 → ±200 …), a line from zero grows to
the right, and the step follows the span (±20 by 1, ±50 by 5, ±100 by 5; a fraction line keeps its
step). The presets add −20 to 20, −50 to 50 by 5, 0 to 100 by 10 and 0 to 1 by 0.1. Labels shrink
toward 22 px before they thin out, so ±100 shows every ten. A range change no longer moves your
dots: −13 stays −13 on a line counted by 5, between the ticks, until a finger moves it.

## 7.16.0 — 2026-09-29

**The Number Line by hand.** Croix: "make it so I don't have to type in the number. I want to be
able to drop a dot. Open dot or closed dot. But be able to manipulate it by hand." The tools are
now **Closed ●, Open ○, Ray and Jump**. A tap on the line drops the chosen dot at the nearest
tick; drag a dot to move it; tap a dot to flip it open ↔ closed; pull a dot well off the line and
let go to throw it away. With Ray, tap the line on one side of a dot to shade from the dot to that
end (x > 3, x ≤ −2) — tap the same side again to take it away. Two dots never share a tick. Undo
now walks back every change (a drop, a move, a flip, a ray, a jump, a range change). The range is a
chip that names it ("−10 to 10 ▾") and opens presets (−10 to 10, −5 to 5, 0 to 10, 0 to 20, −20
to 20 by 2, −100 to 100 by 10, 0 to 1 by 0.25, −2 to 2 by 0.5); typing is only the Custom row
behind it. Dots, rays and jumps work while locked. One test; 253.

## 7.15.0 — 2026-09-29

**After the first day with the pen.** Croix: the drawing "worked out really great, except when
I was done. It was awkward to walk over, clear the screen, click done, collapse the bar, click
back into the slides frame." Leaving the pen is now **one action**, however it is left — Done,
Escape, D, the pen button again, or **the clicker**: the drawing clears (five seconds of Undo),
the palette folds, the dock folds back to its handle on a staged deck, and the slides get the
keys back. From the back of the room the first click of the clicker ends the drawing and the
next one turns the slide (a key press can't be passed on into the deck's frame, so the first
one is spent). **On a staged deck the pen is a blob** in the bottom-right corner, mirroring the
folded dock's blob in the bottom-left; the palette pops up from it, see-through, and folds
back into it (Draw left the stage bar, which is Timer · Exit now). **The dock has one ⋮**: the
horizontal ⋯ (the scene manager) is gone — ⋮ → Scenes opens the same sheet over the scene
select, and ⋮ keeps Home and Sound. **Fullscreen is back in the top-right corner** as a quiet
blob (it shows which way it goes), and a card in that corner moves its ✕ clear of it. **The
Number Line** opens as a full-width strip along the bottom of the board, and it is drawn in the
card's own pixels: a resized card no longer letterboxes or blows up the labels — the line runs
the width, the labels keep a readable size, the tools and the range share one row. Three
tests; 252.

## 7.14.0 — 2026-09-27

**Routines and math** — the tools audit's third release (§4). **The wrap-up at the bell**, the
settle-in's twin: N minutes before the bell the clock takes the stage with the time to the
bell, the exit-ticket prompt (or link), a pack-up checklist the teacher taps off and the rule
("The teacher dismisses you, not the bell."); at the bell the face comes back; R stands it
down for that period; a bell's settle-in outranks it. Off until you turn it on: Settings →
Bells → Wrap-up at the bell. Three new tiles: **Talk Timer** (a question, "Partner A speaks"
for 30 s–2 min, a chime and a public switch to B, then Share; ✎ sets the question and who A
is), **Stations** (the Group Maker's groups for the class — or its own by count — across
named stations with a rotating timer; a chime and everyone moves one station on; the rotation
survives a scene switch), and **Number Line** (tap to place a point, drag to move it, tap to
take it away; Jump draws an arc with its signed length; any range and step, so 0 to 1 by ¼ or
−50 to 50 by 10; Undo, Clear with Undo; the marks survive a scene switch). The + Add menu
holds six tiles a row. `tools/check.sh` refuses the new free-text fields. Five tests; 249.

## 7.13.0 — 2026-09-27

**Touch and survival** — the tools audit's second release (items 9–15 of
`docs/reviews/tools-audit-2026-09-27.md`). The **timer** works by touch: a tap on the face
opens a keypad (digits, ⌫, ×, Start); presets take seconds ("0:30, 1:30" in Settings) and the
chips read m:ss; the chips hide while it runs; the ring's last ten seconds no longer paint a
coral band behind the digits. **Work survives a scene switch**: a per-day, session-only store
(`DayStore`) keeps the picker's round (one round per class today, shared by every picker on
the board), the groups just made, the tallies under the dice/coin/spinner/cards, the sketch and
the Noise Meter's round; a new day starts clean. **The Noise Meter plays by hand** when the mic
is refused (the Chromebox denies it to `file://`) or on request: the quiet streak runs on its
own, a big ✖ (or Space) adds a strike with Undo, the record board and the per-period tally
still count. **Probability**: ×10 and ×100 at once on Roll/Flip/Spin/Draw (with Undo), and each
outcome grows a relative-frequency bar with the theoretical share drawn across it — the
two-dice triangle is the picture (the bars arrive when the card is taller than its spawn size).
**The countdown counts school days** (weekends and no-school weeks skipped) with the calendar
days beside it; a card already counting calendar days keeps doing so; a chip in the editor
switches. **Work Mode drives the room**: a mode sets the meter's limit (35/50/65/80) and, when
told to, starts or stops the music (quiet modes play); modes can be reworded with ✎; Settings →
Timer → "Play the Music card while a timer runs". **Sketch Pad**: three pen widths, Undo (the
strokes are kept as paths), Clear with Undo, the number line takes a range and a step (0 to 1
by 0.1, 0 to 100 by 10). Seven tests; 244. Not done from the audit, on purpose: preset chips
still SET the timer rather than set-and-start (two suites and a habit rely on it).

## 7.12.0 — 2026-09-27

**Read from the back row** — the tools audit's first release (the S items). The spinner
fits its card with the result in the hub and no coral sector; every tally stacks the face over
the count ("8 1" used to read as 81); the Group Maker prints one name per line at a readable
size and the button becomes Shuffle; a type-scale pass on every secondary payoff (the dice
total, the countdown, the meter's streak, the Next Bell, the scoreboard's digits); Clear/Reset
buttons with a five-second Undo on the probability kit, the Scoreboard and the Tally; setup
controls hide with the lock and the room's messages survive it; one name per tool; 44/48 px
targets; no sticky hover on the panel; twenty dead strip rules gone; the + Add menu regrouped
in six rows below the clock's digits; new cards spawn in the corners, never on "10:30".

## 7.11.6 — 2026-09-27

**The +1 that threw the number away.** Since 7.2, tapping +1 on the Scoreboard or the Tally
made the number jump out of its card: the "+1 spring" animation used the class `pop`, which is
also the popover menus' class, so the number was positioned as a menu. Found while
photographing every tool for the tools audit (`docs/reviews/tools-audit-2026-09-27.md`),
renamed `scPop`, with a test that the number stays inside its card.

## 7.11.5 — 2026-09-27

**Hardening.** Croix: "run through all of the code and harden it." Three review passes
over the whole file (the core runtime, the widgets and canvas, the sea and the season) found
about forty defects; every one was traced in the code before it was fixed, and the fixes
were tested against the previous release. The ones a teacher would have met: a board that
booted on defaults because its own config block was broken would have autosaved those
defaults over the device copy on the first tap (it no longer saves at all in that state);
"Weeks with no school" now silences the bells in those weeks too, so the Friday before
Thanksgiving points at the Monday after; a period label with a trailing space lost its
roster after a reload; renaming the default week reset the default; turning the rotation on
in the same Apply that created the week types failed; M mutes for real now (Settings → Apply
used to un-mute); an impossible date (2026-11-31) in the skip-week list was silently taken as
December 1. In the widgets: a scene with no clock now ends a live settle-in; the Sketch Pad's
buttons, the music slider and the Slides checkboxes let go of keyboard focus (a later Space
used to wipe the drawing or toggle the box); Pause → Play on the tape no longer plays the old
bar over the new; the per-period Agenda refits its text; the cards' put-back shuffle is fair;
dice and coins ignore a count change mid-animation; the Noise Meter's quiet streak ignores
time in another tab; the timer's end is armed as one timeout so a hidden tab can't delay
the chime; a student un-marked mid-round goes back into the round; a stopwatch counts as a
working room for the sea; youtube-nocookie links with parameters load. In the sea: Seasonal
touches Off now also turns off the Halloween rules; motion Off ends a running act instead of
freezing it; deferred plays (a combo's second half, the gull's 3.2 s) are cleared with the
show; the spider's excursion check works past the first idle loop; the pumpkins' box no
longer takes taps meant for the board; a dolphin rule was moving the boat's spray; the sea's
memory holds five days as designed; the free-time pool respects the month; the tape handles
October ending mid-listen. Five animations that never had keyframes (the canvas fade, a new
card's spawn, the alarm's entrance, the score pop, the music bars) now do. The privacy guard
(`tools/check.sh`) also checks the settle-in message, scene names and widget labels against
what is already public, refuses roster-shaped .json/.md/.txt/.csv files, and checks every
commit about to be pushed, not only the working tree. Six new tests; 234 green.

## 7.11.4 — 2026-09-27

**A finer web, a real flock.** Croix took two of my own reservations and asked for them.
The web is now hairlines at a fifth strength with two broken strands in the outer rings,
nearly invisible — until, once a minute (every twenty seconds in wind), a glint runs out
along the spiral from the hub: the light catching the silk. The bats answer each other now:
the leader dips, the second follows it down half as far a beat late and pulls up hard, the
third barely dips and overtakes the leader in the last third, the low plodder jinks lower as
the others come down toward it, the fifth closes in on the group before it peels away — and
every bat slips a few pixels side to side on its own clock, so the spacing breathes.

## 7.11.3 — 2026-09-27

**The ghost's first vanish, where it can be seen.** The galleon enters behind the sand
pumpkins (they stand in front of the far lane), so its first cut-out at six seconds was
happening out of sight. It now cuts out at eleven seconds, in open water, and comes back at
fourteen — the same beat, now visible.

## 7.11.2 — 2026-09-26

**Wilson, to scale.** Croix: "he's massive next to the sailboat." He was more than twice
the hull. He is now the boat's size — a big pumpkin beside a small boat — and the navy rim on
his lit cuts is what keeps the face legible at that size. He still surfaces beside the boat,
still drifts away and still ends up behind the sand pumpkins.

## 7.11.1 — 2026-09-26

**Wilson.** Croix: "I really like the idea of wilson pumpkin. He was poorly implemented in
that clip." He was: he entered behind the dock, he was small and two-thirds under water, and
nothing on the board knew he was there. Now he is a character. He surfaces beside the boat
(bubbles, a ring, up with an overshoot, rolls upright, the candle catches), the gull leans
over the masthead to look down at him, and then the current takes him away while the boat's
bow dips after him once — the Cast Away beat. His own size in either lane, a navy rim on the
lit cuts so the face reads at eight metres, and the drift ends behind the sand pumpkins, where
he slips under unseen. In windy weather he still goes over in open water and the candle drowns.
He never shares the water with the ghost, the attack or the whale.

## 7.11.0 — 2026-09-26

**October 2.0.** Croix, on the first October: "I need better than that last effort. I
don't want this to be some half assed thing. I want well thought out and intelligent
designs." Two expert reviews first — an illustrator's (`docs/reviews/october-2.0-design.md`)
and a character animator's (`-animation.md`) — and then every piece redrawn to them.
The **pumpkins** are three individuals on a vine, two faces each, a squash-and-pop on a tap
that flips the face at the flattest frame, a candle that breathes when lit (unequal
breaths, one gutter), the third one nudging the vine's sprout; two load lit from the
26th, all three on Halloween. The **web** is a spun orb web with an orb weaver on its
dragline: an idle cycle with a twitch, a curl and one excursion; a tap drops it with
weight (three decreasing bounces, a turn, four tiring pulls home); a tap while it hangs
lets it go again from *there*; three re-drops a minute, then a leg twitch. The small webs
on the other cards are gone. The boat flies a **swallow-tail** on the sail's wind instead
of a black burgee. The **sea** gets five October acts under the month's own rules: a
flock of five **bats** with five rhythms (the gull leaves first), a slate-grey **ghost
galleon** that cuts in and out and hangs behind the boat with its lamp snuffed while the
boat's streamer lashes and the gull stares, a lit **castaway** pumpkin adrift that
capsizes in windy weather, a **bone fish** on the school's clock, and the **haunt**. The
director builds the month — a rumour in the first third, itself from the 12th, a lit
week from the 26th, and Halloween (the 31st or the last weekday before it: Friday the
30th this year) with the castaway greeting every period and a ghost promised to every
period's last third. Every act is fitted to the strip of sea under the full-board clock.
Eight October tests; 228 green.

## 7.10.0 — 2026-09-28

**October.** Croix: "Can you add some October theming? Like spiderwebs, pumpkins, stuff
like that" — and, given the choice, "go bigger," one real orange, small taps, all month.
A Season module sets one body class from the board's own clock for the month and clears
it on November 1 by itself; every piece hangs off that class and follows the sea's rules
(never on the stage, never over an alarm, never on a phone, still under reduced motion).
*Settings → General → Seasonal touches: Auto / Off.*

The pieces: a **spiderweb** in the clock card's top-right corner, thin navy at a third
strength, with a **spider** that lets itself down on its thread once in a long while and
drops on a tap; a **small web** in the corner of every other card; three
**jack-o'-lanterns** on the sand — the pumpkin orange is the one colour outside the
palette in the whole file — one lit and flickering, and a tap lights any of them and
changes its face (three faces, round and round); a **black pennant** on the boat for the
month; two October-only acts for the sea's director — a **flock of bats** across the
water (uncommon) and a **ghost ship** far out beyond the dune, half there, with a lamp
that won't stay lit (rare, last third of a period) — which the plan casts in October and
never otherwise; and an eleventh side on the lofi tape, **"Graveyard shift"** (a minor
turnaround, a pad, half-time brushes, a long echo, a dark tape), in the deck only while
it's October. Four tests; 224 green.

## 7.9.0 — 2026-09-28

**The rotation counts school weeks.** Croix: "it alternates by school week." A week with
no school days no longer flips Teal/Black: the Mondays of those weeks live in
*Settings → Bells → Week rotation → Weeks with no school*, any day of the week normalizes
to its Monday, and the seed carries Lake County's 2026-27 breaks (Thanksgiving Nov 23,
winter Dec 21 and Dec 28, spring Mar 22). A break week keeps the colour of the school
week before it; the next school week flips from there. A board saved before the list
existed takes the file's dates at boot (a saved empty list is respected), and the update
nudge's "Use the new bell schedule" carries them too. Under the old calendar count, every
week from Nov 30 to winter break would have been the wrong colour, and every week after
winter break the right one again by accident. Three tests; 220 green.

## 7.8.1 — 2026-09-28

**Batch C — the verify list, and the design lens's small words.** The school-hosting
mirror (`hosting/apps-script/`) left the public repo (it is with Croix; `.gitignore`
keeps it out) and the README and handoff no longer describe it. The lock pill says
"Hold to unlock" while locked; the widgets' keyboard hints ("Space rolls · R clears")
hide in the locked, room-facing view; "Bells at startup" is disabled with a note while
the week rotation is picking. One test added; 217 green. Still open, and only Croix can
answer it: whether Teal/Black alternate by calendar week or by school week across a break.

## 7.8.0 — 2026-09-28

**The math room's tools** (batch C of the audit plan — the two things Croix asked to
build out instead of cut).

**The clock owns the board.** "Yes it is empty… make my main clock a little bit bigger
now that I have more space." The default Daily Board is the clock at full width, and a
board upgraded from 7.6 gets the same: the clock grows into the retired settle card's row.
The clock's size caps grew about a third (the time to 250 px, the period line, the bell
countdown, the day chips, the date with them).

**Sketch Pad backgrounds.** A Background picker beside Clear: Blank, Grid (16 square
cells across), Dot paper, Number line (−10 to 10, every integer labelled, arrowheads),
Coordinate plane (−10 to 10 both ways, square units, light grid, navy axes, labels every
2). The background is its own layer under the ink, drawn at the card's real pixel size
so squares stay square whatever the card's shape, repainted on resize, untouched by
Clear and the eraser, and saved with the card.

**The probability kit** — a new + Add heading beside Dice, each with a session tally
because experimental-vs-theoretical is the lesson: **Coin** (1–3 coins, a flip animation,
Heads/Tails counts and the number of flips; Space flips, R clears); **Spinner** (2, 3, 4,
5, 6 or 8 equal sectors in the palette, a fixed pointer, a 3–6-turn spin with a random
offset, the result is the sector under the pointer, a per-sector tally; Space spins, R
clears; a new sector count starts the tally over); **Cards** (a shuffled 52, drawn without
replacement so the count drops — "Draw · 49 left" — or with "Put it back" on, a suit tally,
Shuffle/R resets; Space draws). **Dice** gained the same tally: per face for one die, per
total for two or three (why 7 wins), cleared by R or by changing the die count.

**Also.** The + Add menu (23 tiles under five headings) runs five columns at 1080p and six
on a 768-high screen so it never scrolls. Tests: `v78.spec.js` (6 new); 216 green.

## 7.7.0 — 2026-09-28

**The room-facing release** (batch B of the audit plan; the design-lens review's three
big asks, in the order Croix chose them).

**The settle-in is a moment of the clock.** The Settle-in card is gone. At a bell the
clock card takes the stage and *becomes* the count — "Find your seat · 30 · seconds" —
or, at the day's first bell, the flag alone; runs the routine exactly as before (the
swelling ticks, the soft note, the consequence spell, per-period seconds, the Pledge
minutes); hands off to a Slides card; and the face comes back. Between bells the clock is
just the clock — no "AT THE BELL 30s" stale instruction on 40% of the wall all period.
While it runs, Space restarts it and R stands it down. Its settings moved to **Settings →
Bells → Settle-in at the bell** (on/off, seconds, message, flag on/minutes, seconds by
period). A board opened from an older file keeps its card's settings (migrated into
`bell.settle`); a board whose owner had removed the card gets the routine off. A scene
needs a clock to run it. The default Daily Board is the clock (58%) with the right of the
board left to the teacher.

**One chrome bar.** The navy header is gone: the date is on the clock (with the SIM badge
on a simulated clock); Settings is a dock pill (its coral dot is still the store's health
light); Home, Sound and Fullscreen live under the dock's new ⋮ with the brand. The board
gained the header's height. On the landing page the dock keeps only Settings and ⋮.

**The landing page asks only when there is a question.** When the week rotation already
picked the week (or there is only one week type, or no bells), the board opens straight
away and says hello in one line — "Good morning, Mr. Shaffer · Black Week · tap anywhere
for sound" — which the first tap takes away. The sound nudge is real: the page has no
gesture until you tap, and the settle-in's ticks need one. Rotation off with two week
types still asks. Home (H, or ⋮ → Home) opens the page any time; the TODAY row lives
there as before.

**Also.** A long press on the drifting boat now captures the pointer (the hold survives
the drift); the version nudge is a box, not a circle, on a phone. Tests: `v77.spec.js`
(6 new) and the settle/Pledge/landing tests rewritten for the moment model; 210 green.

## 7.6.0 — 2026-09-28

**Robustness, no visible change.** Batch A of the audit round's plan (`docs/reviews/audit-2026-09-27-*`);
the settle-in-as-a-moment and the one chrome bar are 7.7, the sketch backgrounds and the
probability kit are 7.8.

**A scene switch keeps a running timer.** A timer or stopwatch that is counting rides along
to the next scene as a floated card, still counting, and is handed back to its own scene on
return (never duplicated, never written into the other scene's config). Idle cards are
dropped as before. Stopwatches gained `running()` for this.

**The timer face paints at 10 Hz.** The ring and tide faces used to repaint every animation
frame (60 style + layout passes a second on the Chromebox); they now paint at most ten
times a second, and the tide is a `transform: scaleY()` instead of a height, so it never
forces layout.

**Absent marks are for today.** The board runs for weeks without a reload; a mark made
Tuesday no longer skips that student on Wednesday — the marks are keyed to the (simulated)
calendar date and clear at midnight.

**☆ names a deck in a row of ours.** The deck library's `window.prompt` (a system dialog the
panel draws off-theme, off-keyboard and sometimes not at all) is replaced by an inline
"Name this deck" row: Save / Enter keeps it, ✕ / Escape drops it, the ✎ row folds it away.

**Ink draws incrementally.** Finished strokes live on an offscreen copy; a pen move draws
one new segment (the highlighter, translucent, repaints only its own stroke), so the pen
no longer lags more the longer the lesson (98 ms a move at 150 strokes, per the adversarial
audit). Undo, Clear and a resize rebuild once.

**Small things.** The scoreboard sanitizer filters junk entries *before* it takes the first
four (a junk entry used to cost a real team its place); the bathroom-closed pill is sand,
not coral (coral is for alarms); the alarm says "Tap anywhere to dismiss". The Pledge flag
was measured centred at three viewports (the review's "runs past its right edge" did not
reproduce) — left alone. 204 tests.

## 7.5.1 — 2026-09-27

**The audit round.** Four reviews of the whole project (`docs/reviews/audit-2026-09-27-*`):
an engineering audit, an adversarial rebuttal of it, a design review through the
"whole product" lens, and a technical review through the "read every line" lens. This
release is their evening one.

**Fixed: the blank timers.** 7.5's sea styling used an unscoped `.ring` class that matched
the timer's ring face, so every Ring timer, the Next Bell widget and the ghost timer over
a staged deck rendered invisible. Every sea effect class is scoped under `#sea` now, and a
test checks the faces are painted, not just present.

**The strips (Croix: "We all know it's a clock").** Locked (teaching): no title strip at
all — the card is its content, 30 px taller; a custom name shows as a small caption inside;
⛶ Stage stays as a faint round button at the top-right that brightens and says "Stage" for
four seconds when the card is tapped. Unlocked (editing): a slim neutral handle band with a
grabber mark, the label only for custom names, the icons on 44 px hit boxes. The per-type
strip colours are retired.

**Data safety.** An unreadable device copy is quarantined (`deckhand.config.bad-<time>`),
never seeded over; a board saved by a newer release makes an older file read-only with a
banner (an old Export can no longer overwrite the current board); a save from another
window suspends this one with a banner; the store is read even when the write probe fails
(a full quota no longer looks like data loss), and a blocked store shows the coral dot at
once. Settings is behind the lock (the lock pill nods). `#setResetBtn` — the timer's legacy
`resetBtn` id no longer shadows Settings' reset (the armed "Really replace…" state landed on
the timer's button). `check.sh` refuses free text (notes, agenda, teams, tally, titles, the
saved-deck library); `push.sh` stages an allowlist, never `-A`; `serve.js` binds loopback
and refuses dotfiles.

**In the room.** The alarm leaves a deck's fullscreen before it rings (it sat behind the
video). The settle-in skips Lunch, re-baselines when the TODAY row changes (switching to
Wednesday times mid-class started a count; undoing it fired the Pledge), and a bell behind
the landing page opens the board. Alarm text is navy on coral (8:1; white was 2.47:1).

**The sea and the tape.** The boat's mast, not its left edge, is the phase reference. The
back wave layer is three wavelengths wide (it had a seam). The director's memory excludes
today (a reload mid-period re-planned the show). The Rhodes tremolo is its own gain stage
(notes decayed to a plateau and clicked); the pluck answer is an octave down (a "third"
was three semitones); Brushes runs a diatonic progression (its motif clashed with the
borrowed iv); bass is a triangle (a panel's speakers can't play a 40 Hz sine); the chime
never ramps to 0 (it threw).


**Sea 2.0.** Built after a three-part review (`docs/reviews/sea-2.0-*.md`) and written up
in `docs/SEA.md`. The water is three travelling wave layers with periods by deep-water
dispersion; the boat rides them phase-locked by geometry (heave and pitch on the swell's
clock, so the hull's waterline never changes), with foam on the crests and calm / breezy /
windy weather drawn per class period. Every creature was redrawn as a proper silhouette
(the whale is a humpback now, with a fluke that opens on the dive), the boat grew a bow, a
forestay and a burgee, and every act was retimed against the twelve principles. New: a
gull that lands on the masthead and sits — and leaves first when something loud is coming;
a dolphin pair on one arc (a sine and a cosine), and the chase (the skipper, then the
dolphins). The attack has a story: bubbles, a periscope look, the slither, the rear, ONE hit
with spray off the sail and the boat shoved, a MISS into the water, a look at the room, a
head-first dive, a victory flick of the burgee. The whale has an act: footprint, surface,
spouts, the late fluke, gone, bubbles, the breach, the splash, the ripple reaching the boat,
a wave goodbye. The pennant hoists in hitches and pops back up once on the way down. The
paper boat sinks in windy weather.

**The director.** Each class period gets a setlist from a generator seeded by the date and
the period (deterministic, testable, different for every class): a greeting 45 s after the
bell, ten minutes of hush, rares only in the last third, nothing in the last three minutes,
commons only while a timer runs, the attack only after a serpent sighting, and a memory of
what each period has seen. A tap hops the boat at once and answers with a show (with a
one-minute cooldown); a 1.5 s long press queues the next rare. Settings → Sea weather:
varies / always calm. `tools/aquarium.html` plays any act on demand.


**The sea, with depth.** The front wave now heaves and sways, and the boat heaves on the
same clock, so its hull rides the swell instead of sinking under it. Visitors pass in
two lanes: far (small, behind the boat) or near (large, in front) — the buoy, the
turtle and the paper boat pick a lane per show. The boat grew a mast, a waterline
stripe and a little wake.

**The visitors.** The school of fish swims head-first and stays under the waterline
(it was crossing the sand dune tail-first). The message-in-a-bottle is gone; a paper
boat folded from a ruled worksheet drifts by instead. The serpent glides head-first.
The ATTACK slithers in from the right edge over eight seconds, head low and coils
rolling, then rears up behind the sails, strikes twice (the boat lurches on the first)
and goes under — sixteen seconds. The whale has an act: it surfaces heading left,
spouts twice, arches and dives fluke-up, then breaches nose-first and lands in a splash.


**Nine more sides on the tape.** The lofi tape had four sides that shared one e-piano
and one beat; it has ten now, each with its own key, tempo, progression, motif, voice
(e-piano, glass rhodes, kalimba pluck, pad), drum feel (boom-bap, halftime, brushes,
bossa, none) and echo. Side A is the original, untouched. The first listen walks the
sides in order; after that they shuffle. A **Next ›** chip skips to another side
without a gap, live while locked.


**The Pledge, take two.** At the day's first bell the flag now has the screen to
itself — no count, no words — with a fabric ripple and a slow sway; when its minutes
are up, the slides. It keys off the day's *first block*, so on a reversed (Black) week
it flies for 6th at 9:20 and never for 1st at 3:07.

**Seconds by period.** The settle-in's ✎ row has a box per bell period; a number there
overrides the default for that class only (blank = default). The armed readout shows
the figure for whichever class is in the room.

**The pennant.** Now and then the boat runs up a "Mr. Shaffer Rules" pennant (it reads
the greeting name), lets it fly for twenty seconds, and hauls it down. A boat tap can
summon it.

**Ink.** *Draw* (dock pill, the stage bar, or **D**) puts a transparent drawing layer
over everything — the board or a staged deck — with a floating palette: six pens
including a highlighter, three widths, eraser, undo, clear. *Done* folds the palette
and keeps the ink so you can keep working underneath it; Escape does the same.
Session-only.

## 7.1.0 — 2026-09-26

The week-of-notes release (Croix's notebook, Sep 21–25).

**Bells.** A TODAY row on the home screen: *Regular times* / *Wednesday times* / *Custom
day…* — run the Wednesday schedule on any day, or build a one-off day in a touch editor
(rows of label + time pickers, start from a schedule, shift all ±5, no text syntax).
Dated, so it expires by itself; a custom day runs even with No bells picked. The same
row editor replaces the schedule textareas in Settings ("Edit as text" keeps them).

**Note widget → rich text.** Bold, italic, underline, six colors, four fonts, bullets,
alignment, per-selection A+/A−, and whole-note sizes S/M/L/XL/Fit. Base type is much
bigger (students couldn't read it) and notes spawn at 40×60%. Stored as sanitized HTML
(allowlisted tags, validated inline styles — sanitized on every load and commit; hostile
markup is inert); old `# / - / 1)` notes convert once.

**Noise game.** *Strike after* ½/1/2/3 s (was a fixed 2 s), strikes repeat while the
room stays loud, and a per-period tally for the day shows under the strikes.

**Slides card.** Big paste box + Load in the empty state; ☆ saves the showing deck to a
library of up to 8 (chips in the ✎ row); *Stage only* hides the card on the board and
gives it a ▶ chip in the dock — the settle-in still hands off to it at the bell, and
Exit puts it away. Iframes carry `allow="fullscreen *; autoplay *; …"` so a YouTube
video inside an embedded deck can go fullscreen.

**The Pledge.** At the day's first bell the settle-in shows the flag with the count,
holds the stage after the count for N minutes (default 2, ✎ row), then hands off to
the slides.

**The sea.** The boat sways (3 s heel on the rig; the 45 s drift stays). Four new
visitors — turtle, a darting school, a message in a bottle, and the ATTACK: the
serpent surfaces behind the hull, strikes the sails twice, the boat lurches. A tap on
the boat favors it.

**Design pass.** Settings is a tabbed preferences panel (General · Bells · Timer ·
Rosters · Schedules · Device) with one field grid, 48 px controls, and a fixed footer;
the + Add menu is icon tiles with descriptions; the scene manager and ⏱ preset menu are
sheets in the same language.

## 7.0.0 — 2026-09-25

**Persistence.** The board autosaves to the device (localStorage `deckhand.config`) —
layout, bells, rosters — and the device copy wins at boot over the file's baked block.
"Download configured copy" became **Export a copy** (backup / move to another machine);
new **Use this file's settings** (two-tap reset to the baked config); a one-time update
nudge when a newer release opens over an older device copy, with "Use the new bell
schedule". The coral dot on Settings now means only "saving failed — export".

**Rosters from the Seating Chart.** Settings → Class Rosters → *Import from Seating Chart*
(same-machine device store) or *Import a Seating Chart backup…* (its JSON export).
Names land by period number; Apply keeps them.

**Fixes.** Unknown `schemaVersion` now shows the corrupt-config banner and disables
export instead of silently booting defaults with export live. A malformed `#t=` hash
no longer takes the whole board down. The YouTube card goes quiet under the landing
page like the Slides card. A manual week-chip override expires at the date change
("overrides for the day" is now true). One throwing widget no longer aborts the whole
scene. Bell-schedule lists refuse a 21st block at Apply (matching what reload keeps);
the noise game never writes a 13th record. A finger sliding off after a completed
hold-to-unlock no longer eats the next Lock tap. YouTube channel/user URLs are rejected
cleanly instead of framing a blank page; `youtube-nocookie` URLs must be the embed player.

**Design.** Settings' action row is sticky (it sat below the fold at 1080p). Contrast
pass: end-of-class warning, settle-in states, settings errors and the selected-widget
outline are all navy-on-coral or teal now (turquoise-on-white was 1.64:1, coral-on-white
2.47:1). Header, dock and menu pills grew to ≥40px. Dynamic widgets carry accessible
names, iframes have titles, the dock is a `nav`, popovers are groups, the bell line is a
live region. Last off-palette colors tokenized; four dead v5 rules removed.

**Name.** The release file is `Deckhand.html` (version-free); `Deckhand_v6.html` and `index.html` forward to it, and Export writes `Deckhand.html`. The header badge reads the real version.

**Repo.** Test suite ported to `@playwright/test` (feature files, fresh context per test,
parallel, traces on failure, `touch` and `http` projects). GitHub Actions runs the
privacy guard and the suite. `tools/check.sh` refuses to push a configured copy.
`tools/push.sh` keeps the token out of argv. Old versions → `archive/`, screenshots →
`screenshots/`, handoff → `docs/`. LICENSE (MIT), `.nojekyll`, playwright declared.

## 6.33.0 — 2026-09-20
YouTube library 8 categories / 39 entries; roster privacy rail; GitHub Pages hosting.

## 6.x — Aug 31 – Sep 20, 2026
Widget canvas with scenes (6.0) → rosters/picker/groups (6.2) → text, dice, scoreboard,
work mode (6.3) → QR, noise meter, sketch (6.4) → Slides embed (6.5) → scene manager,
per-period decks (6.6) → focus mode (6.7) → noise game (6.8) → pin (6.9) → countdown,
tally, agenda (6.10) → hardening, teaching-day, design passes from the triple review
(6.11–6.13) → stage mode, ghost timers, ⏱ menu (6.14–6.17) → the sea (6.18–6.21) →
classroom-failure fixes (6.22) → settle-in routine (6.23–6.24) → music + YouTube
(6.25–6.28) → settle-in default, ticks, soft chime (6.29–6.32).

## 5.x — Aug 30–31, 2026
Real 2026-27 bell schedule, week rotation, day strip, visual timers, next-class
countdown, bathroom window, warnings.

## 1–4 — Aug 2026
Clock + preset timer → module architecture → config core, settings, download-copy,
bell engine → landing page.
