# Deckhand

A single-file classroom OS for Mr. Shaffer's 7th-grade math room at Windy Hill Middle
School — clock, bell schedule, settle-in countdown, timers, agenda, picker, sketch,
YouTube/slides embeds, lofi tape, and a small sea. Built for a Promethean IR-touch
panel driven by a managed Chromebox, opened either from Google Drive over `file://`
or from the hosted copy at **https://croix18.github.io/Deckhand/**.

## The one file that matters

**`Deckhand.html`** — the current release (v7.5; the name is version-free since 7.0, `Deckhand_v6.html` forwards to it). Everything — HTML, CSS, JS — lives
in this one file. No build step, no install, no accounts.

Since v7.0 the board **saves itself on the device**: layout, bells, and class rosters
autosave to the browser (localStorage, key `deckhand.config`) and come back on the next
open, on the file and on the hosted URL alike. The config block baked into the file is
the seed for a new device and the target of *Settings → Use this file's settings*.
*Settings → Export a copy* still writes a complete Deckhand file with everything baked
in — a backup, or the way to carry a board to another machine.

`docs/HANDOFF.md` is the project memory — every version's story, the design rules, the
known constraints (YouTube Error 153 over `file://`, the iframe drag shield,
reduced-motion panels). Read it before changing anything. `docs/SEA.md` is the sea's own
manual (the waves, the cast, the director); `tools/aquarium.html` is its review tank.

## Hard constraints (do not break)

1. Single self-contained HTML file; double-click over `file://` must work.
2. No external dependencies except Google Fonts. Runtime network is otherwise only what
   the teacher embeds (`youtube-nocookie.com`, `docs.google.com`).
3. No extensions, installs, or accounts on the school machine.
4. The visual alarm must always be dismissable.
5. Persistence is the device store + Export; nothing ever leaves the machine.

## Privacy — the public copy rule

This repo is public because GitHub Pages needs it to be. The config block in every
committed `.html` must carry **no rosters, no deck or station URLs, and no name beyond
"Mr. Shaffer"**. `tools/check.sh` enforces that and `tools/push.sh` refuses to push
otherwise; CI runs the same check. An exported copy carries student names inside it —
keep exports in Drive, never in this folder.

## Rosters

Settings → Class Rosters has one box per bell period. **Import from Seating Chart** pulls
first names straight from the Seating Chart tool's own device store when both tools run
on the same machine the same way (both as files, or both on the web); **Import a Seating
Chart backup…** takes its exported JSON anywhere. Apply to keep.

## Tests

`tests/` — a Playwright suite (`@playwright/test`), 194 tests split by feature, each in
its own fresh browser context, run in parallel.

```sh
npm ci
npx playwright install chromium   # once
npm test                          # all projects: file, touch, http
npm run test:file                 # file:// only — the classroom path
npx playwright test tests/bells.spec.js --headed
```

Projects: **file** (over `file://`, mouse), **touch** (touch context, for the IR panel;
specs tagged `@touch`), **http** (served by `tools/serve.js` on a real origin like Pages;
specs tagged `@http`). Failures keep a trace and screenshot under `test-results/`.

A release ships only with the full suite green, a screenshot review, and a fresh
adversarial review with fixes and regression tests.

## Hosting (GitHub Pages)

Pages serves `main` from the repo root; `index.html` forwards to `Deckhand.html`.
**Every push to `main` deploys**, so `tools/push.sh` is the deploy: it runs the privacy
check, commits, pushes, and verifies the remote head. Serving from a real `https://`
origin is what fixes YouTube's embedded-playback refusal (Error 153 — embeds from
`file://` send no referrer).

**School note (Sep 2026):** `github.io` is blocked on the classroom Chromebox, so
the Pages copy is the public source and the home/laptop copy, not the panel's.
`hosting/apps-script/` has a mirror that serves the same file from Google's domain
via a web app deployed from a personal account — see its README for the four things
to verify on the panel before trusting it.

`.github/workflows/test.yml` runs the privacy check and the suite on every push; it's a
signal, not a gate — Pages deploys from the branch regardless, so run the suite locally
before pushing.

## Layout

```
Deckhand.html        the release
index.html              Pages forwarder
tests/                  Playwright suite + helpers
tools/                  check.sh (privacy guard) · push.sh (deploy) · serve.js (local origin)
docs/                   HANDOFF.md (project memory) · reviews
archive/                historical versions (v5.x, v6.2 backup, embed probe, v5 suite)
screenshots/            release screenshot records
```
