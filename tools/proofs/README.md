# tools/proofs — how the October work was checked and shown

Node scripts that drive the real `Deckhand.html` in headless Chromium (the repo's Playwright).
None of them are tests; they make the pictures, clips and sound that a person judges. Output
lands in `tools/proofs/out/` (git-ignored). Run from the repo root with `node tools/proofs/<x>.js`.

- `grab.js` — the frame plan from `docs/reviews/october-2.0-animation.md` §D: pumpkin taps,
  the spider's drop and re-drop, the bats, the ghost's hang, the castaway, the haunt, Halloween.
- `grab-wilson.js`, `grab-flock.js` — close-ups at 2× (deviceScaleFactor 2) of Wilson's beats
  and the flock; `grab-wilson.js` takes a weather list to edit at the top.
- `stats.js` — the director's month in numbers: October acts per period by band (1–11, 12–23,
  26–29, Halloween) from `Sea.plan()` with no memory. Use it before touching `octoberWeight`.
- `render-lofi.js <seconds> <out.wav>` — renders a tape side from the widget's OWN engine:
  `AudioContext` is swapped for an `OfflineAudioContext` that suspends every 0.3 s; the
  widget's real-time `tick()` resumes it and schedules the next bars. Skips to the October
  side with ten Next presses. `ffmpeg -i out.wav -codec:a libmp3lame -q:a 2 side.mp3`.
- `tour.js <dir>` — a ~2.5-minute scripted tour of the October board recorded with
  Playwright's video (≈25 fps; the recorder lags a few seconds by the end, so trim by eye).
  Mux with the wav: `ffmpeg -ss 1.2 -i tour.webm -i side.wav -t 152 -c:v libx264 -pix_fmt yuv420p -c:a aac out.mp4`.
- `cast.js` — the CDP screencast (compositor-rate JPEG frames + timestamps → a concat list
  for ffmpeg). Frames come at CSS-pixel size (1920×1080) even at DPR 2, so use it for motion
  at full rate, then crop/track with ffmpeg (`crop=960:130:'<expr in t>':950`).
- `close.js` — screenshot-per-frame at DPR 2 (~12 fps for a small clip): the only way to get
  hairlines (the web) sharp; too slow for wingbeats — use `cast.js` for those.

The Chromebox cannot be reached from here: everything above is the sandbox's Chromium at
1920×1080. Frame rate and paint cost on the panel are the one thing these cannot tell you.
