# Deckhand web test

One page that answers "could Deckhand run as a web app on the classroom Chromebox?"
Open it from a web address **on the Chromebox**. If it loads at all, the district filter let the
address through. The cards then check storage, offline, installing as an app, Google Fonts,
full screen, sound, the microphone, YouTube (Error 153), a Google Slides deck, the clicker and
touch. **Copy results** puts a plain-text summary on the clipboard. Nothing is sent anywhere.

Files: `index.html`, `sw.js` (the offline copy), `manifest.webmanifest` + three icons (installing).
Keep them together in one folder; it needs a real **https** address for offline and install.

Where it lives:
- `https://croix18.github.io/Deckhand/webapp-test/` — the control (github.io is blocked at school,
  so expect the filter's block page there; it should work at home).
- On one of Croix's domains, either
  - **GitHub Pages**: a DNS `CNAME` record `deckhand` → `croix18.github.io` at the registrar, then
    GitHub → Deckhand → Settings → Pages → Custom domain `deckhand.<domain>` → Save → Enforce HTTPS.
    The test is then `https://deckhand.<domain>/webapp-test/` (and the board itself at
    `https://deckhand.<domain>/Deckhand.html`). Note: this moves the whole Deckhand site to that name.
  - **Any other host**: upload this folder as-is (e.g. `https://<domain>/deckhand-test/`).
