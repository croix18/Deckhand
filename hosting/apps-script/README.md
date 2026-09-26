# Deckhand as an Apps Script web app (school mirror)

GitHub Pages is blocked on the classroom Chromebox, so the hosted copy never
reaches the panel. This mirror serves the same file from Google's domain.
Deploy it from a **personal** Google account (the school account can't run
Apps Script); the school account then just opens the URL.

## One-time setup (personal account, ~10 minutes)

1. script.google.com → **New project**. Rename it "Deckhand".
2. Replace `Code.gs` with the `Code.gs` next to this file.
3. **+ → HTML**, name it exactly `Deckhand` (the editor adds `.html`).
   Select-all in the new file, paste the ENTIRE contents of the release
   `Deckhand.html` (the clean one from this repo — never an exported copy
   with rosters; rosters live in the browser, not in the served file).
4. **Deploy → New deployment → ⚙ Web app** → Execute as **Me**, Who has
   access **Anyone** → Deploy. Authorize when asked. Copy the `/exec` URL.
5. On the Chromebox, open that URL. Chrome ⋮ → *Save and share* →
   *Create shortcut…* → tick *Open as window* → it lands on the shelf.

## Verify on the panel (first open) — the four unknowns

Apps Script serves pages inside its own sandboxed iframe. These are the
things that sandbox can break, in the order to test them:

1. **Does it save?** Settings → change the display name → Apply → Close →
   reload the page. If the name stuck, storage persists. If it reverted,
   the sandbox origin isn't stable and the mirror can't hold rosters —
   stop here and stay on the Drive file.
2. **Do YouTube tiles play?** + Add → YouTube → ⊞ Library → pick anything.
   In-tile playback is the whole point of a real origin; the Pages copy
   was supposed to do this and never reached the room.
3. **Fullscreen.** If the Fullscreen pill is missing from the header, the
   frame wasn't granted fullscreen — use the Chromebox's own fullscreen
   (F11 / the window control) instead. The board is unaffected.
4. **Export a copy.** Settings → Export a copy. If nothing downloads, the
   sandbox blocks downloads — exports then come from the Drive file or
   the laptop, which is fine (the mirror still saves on the device).

Also confirm once: hold-to-unlock, drag a widget, and the settle-in
takeover at a bell — all touch input, nothing about hosting should change
them, but it's a new frame.

## Updating

New release → open the personal-account project → open the `Deckhand`
HTML file → select-all → paste the new `Deckhand.html` → **Deploy →
Manage deployments → ✎ → Version: New → Deploy**. The URL stays the same,
so the shelf shortcut keeps working. (Ctrl+A in the editor on a 370 KB
file is slow but works; if it chokes, `clasp push` from a laptop is the
alternative — `npm i -g @google/clasp`, `clasp login`, `clasp clone <id>`.)

## Data model reminder

Each origin keeps its own board: the Drive file (`file://`), the Pages
copy (`github.io`), and this mirror (`googleusercontent.com`) are three
separate saved boards on the same Chromebox. Pick one as the daily
driver — this one, if the four checks pass — and use *Export a copy* /
*Use this file's settings* to carry a board between them.
