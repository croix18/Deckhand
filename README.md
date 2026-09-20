# Deckhand

A single-file classroom OS for Mr. Shaffer's 7th-grade math room at Windy Hill Middle
School — clock, bell schedule, settle-in countdown, timers, agenda, picker, sketch,
YouTube/slides embeds, lofi tape, and a small sea. Built to run on a Promethean IR-touch
panel via a managed Chromebox, opened by double-click over `file://` from Google Drive.

## The one file that matters

**`Deckhand_v6.html`** — the current release. Everything (HTML, CSS, JS, fonts aside)
lives in this one file. No build step, no install, no accounts, no browser storage:
persistence is the **"Download configured copy"** button, which serializes the current
config back into a fresh copy of the file itself.

`Classroom_Clock_HANDOFF.md` is the project memory — every version's story, the design
rules, the known constraints (YouTube Error 153 over `file://`, the iframe drag shield,
reduced-motion panels), and the current-release marker. Read it before changing anything.

## Hard constraints (do not break)

1. Single self-contained HTML file; double-click over `file://` must work.
2. NO browser storage of any kind — config persists only via the download-copy flow.
3. No external dependencies except Google Fonts.
4. No extensions, installs, or accounts on the school machine.
5. The visual alarm must always be dismissable.

## Tests

`test_deckhand_v6.js` — 151 Playwright tests (~5 min, all green at every release).

```sh
npm install            # playwright + jsqr (chromium must be available)
node test_deckhand_v6.js
```

The suite writes `tmp_*.html` fixtures beside itself (git-ignored). A release is
delivered only with the full suite green, a screenshot review, and a fresh adversarial
review with fixes and regression tests.

## Hosting (GitHub Pages)

Serving Deckhand from a real `https://` address fixes YouTube's embedded-playback
refusal (Error 153 — embeds from `file://` send no referrer, and browsers won't let a
page fake one). To turn it on — a human toggle, done once:

**Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder `/(root)`
→ Save.**

A minute later the board is live at
`https://croix18.github.io/Deckhand/` (the `index.html` here forwards to
`Deckhand_v6.html`). Bookmark that on the classroom panel instead of the Drive copy.
Every push to `main` redeploys automatically, so `tools/push.sh` is also the deploy.
Note: on a free account the repo must be public for Pages; everything in it already
carries no student data or secrets (`.github-token` is git-ignored).

## Everything else here

`Deckhand_v5*.html` and `Deckhand_v6.2_backup.html` are historical versions kept for
reference. `shot_*.png` are the release screenshot records. `qr_encoder.js` supports the
QR test path. `tools/push.sh` backs this repo up to GitHub (token in `.github-token`,
git-ignored, never committed).
