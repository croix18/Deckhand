#!/bin/sh
# Deckhand pre-push guard. Every push to main is a PUBLIC deploy (GitHub
# Pages), and an exported copy of Deckhand carries class rosters inside
# its config block under the SAME filename as the release. This refuses
# to let one into the repo.
#
# Checks every tracked or untracked *.html / *.htm, any case (outside node_modules):
#   - the <script id="deckhand-config"> block parses
#   - rosters are empty, no widget carries a url/decks/stations
#   - no widget carries free text (notes, agenda, teams, tally, titles, saved decks,
#     station names, period overrides, per-period tallies and records)
#   - ownerName is the shipped default; week-group names are the published ones
#   - the settle-in message, scene names and widget labels are the shipped ones
#   - no tmp_*.html fixture is staged
#   - EVERY text file git would stage (html/js/json/md/txt/csv/webmanifest…) carries no
#     roster shape (students / names) and no Seating Chart / Tally export signature —
#     an html with no config block is scanned too; *.md gets the name-list rule only
#   - no new or modified image under screenshots/ docs/ archive/ webapp-test/ (or in an
#     unpushed commit) unless ALLOW_IMAGES=1 — a board photo can carry names
#   - every commit about to be pushed (origin/main..HEAD) passes the same config check —
#     the tree being clean now does not clean a commit made earlier
#   - origin/main unreadable: a loud warning (scene names / labels go unchecked);
#     with CI set it fails
#
# Usage: sh tools/check.sh        (exit 1 = refuse)
#        ALLOW_IMAGES=1 sh tools/check.sh   (after a human has looked at every listed image)
set -e
cd "$(dirname "$0")/.."

node - <<'EOF'
const fs = require("fs"), cp = require("child_process");
const list = s => s.toString().split("\n").map(x => x.trim()).filter(Boolean);
const git = c => { try { return list(cp.execSync(c, { maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] })); } catch (e) { return []; } };
/* v7.55 (audit): one file list — every tracked or untracked (not ignored) path, any extension,
   any case. The old list asked git for "*.html" (case-sensitive, no .htm) and four other types. */
const tree = [...new Set([
  ...git("git ls-files"),
  ...git("git ls-files --others --exclude-standard")
])].filter(f => !f.startsWith("node_modules/") && fs.existsSync(f));
const files = tree.filter(f => /\.html?$/i.test(f));
const TEXT_RE = /\.(html?|js|mjs|cjs|json|md|markdown|txt|csv|tsv|webmanifest)$/i;
let bad = 0;
const staged = git("git diff --cached --name-only");
for (const f of staged) if (/(^|\/)tmp_[^/]*\.html?$/i.test(f)) { console.error(f + ": test fixture staged"); bad++; }
/* v7.11.5 (audit): scene names and widget labels are free text too. The allowed set is
   whatever is ALREADY public — every config block on origin/main — so nothing new can slip
   in through a label ("Jayden's timer") while the shipped names keep passing.
   v7.55 (audit): week-group names join the set. */
let seed = null;
try {
  seed = { scenes: new Set(), labels: new Set(), groups: new Set() };
  const pub = git("git ls-tree -r --name-only origin/main").filter(f => /\.html?$/i.test(f));
  for (const f of pub) {
    let src; try { src = cp.execSync(`git show origin/main:${JSON.stringify(f)}`, { maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch (e) { continue; }
    const ms = src.match(/<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/);
    if (!ms) continue;
    let sc; try { sc = JSON.parse(ms[1]); } catch (e) { continue; }
    (sc.scenes || []).forEach(s => { if (s && s.name) seed.scenes.add(s.name); (s.widgets || []).forEach(w => w && w.label && seed.labels.add(w.label)); });
    ((sc.bell && sc.bell.groups) || []).forEach(g => g && g.name && seed.groups.add(g.name));
  }
  if (!seed.scenes.size) seed = null;                 // no remote yet: nothing to compare against
} catch (e) { seed = null; }
/* v7.55 (audit): a missing origin/main used to turn the label/scene check off in silence */
if (!seed) {
  console.error("check.sh: WARNING — origin/main could not be read; scene names, widget labels and week names are NOT checked against the published set.");
  if (process.env.CI) { console.error("check.sh: CI is set — refusing (fetch origin/main: actions/checkout needs fetch-depth: 0)."); bad++; }
}
const filled = v => typeof v === "string" ? !!v.trim() : Array.isArray(v) ? v.length > 0 : !!(v && typeof v === "object" && Object.keys(v).length);
function checkConfig(f, c) {
  const names = (c.rosters || []).flatMap(r => (r && r.names) || [])
    .concat((c.cards && c.cards.log || []).flatMap(e => ((e && e.names) || []).concat((e && Array.isArray(e.in) && e.in) || [])));   // v7.32: the comment-card log (v7.40: and who handed theirs in)
  const urls = [];
  (c.scenes || []).forEach(s => (s.widgets || []).forEach(w => {
    if (!w) return;
    if (w.url) urls.push(w.url);
    Object.values(w.decks || {}).forEach(u => urls.push(u));
    (w.stations || []).forEach(t => t && t.url && urls.push(t.url));
  }));
  /* v7.5.1 (audit): free text is where student names end up — notes, agenda items, team and
     tally names, event titles, the settle message, the saved-deck library. Any content refuses. */
  const TEXT_KEYS = ["html", "text", "saved", "teams", "items", "names", "title", "msgDone", "lines", "pages", "decks", "prompt", "who", "spots", "custom",   // v7.14: the Talk Timer's prompt and rule, the Stations' names, Work Mode's rewording
    "period", "records"];   // v7.55 (audit): the roster override (free text, ≤20) and the Talk Timer's records keyed by period label
  const texty = [];
  (c.scenes || []).forEach(s => (s.widgets || []).forEach(w => {
    if (!w) return;
    TEXT_KEYS.forEach(k => { if (filled(w[k])) texty.push(w.type + "." + k); });
    /* v7.55 (audit): the YouTube stations' names (sanitize keeps them, ≤20; "Station" is the default) */
    if (Array.isArray(w.stations) && w.stations.some(t => t && t.name && String(t.name).trim() && t.name !== "Station")) texty.push(w.type + ".stations[].name");
    /* v7.55 (audit): the noise game's dated tally is keyed by period label */
    if (w.tally && typeof w.tally === "object" && !Array.isArray(w.tally) && filled(w.tally.byPeriod)) texty.push(w.type + ".tally.byPeriod");
    if (seed && w.label && String(w.label).trim() && !seed.labels.has(w.label)) texty.push(w.type + ".label");
  }));
  if (c.bell && c.bell.settle && String(c.bell.settle.msgDone || "").trim() && c.bell.settle.msgDone !== "Find your seat") texty.push("bell.settle.msgDone");
  /* v7.14: the wrap-up's prompt, checklist and rule are free text too */
  if (c.bell && c.bell.wrapup) ["prompt", "steps", "msg"].forEach(k => { if (String(c.bell.wrapup[k] || "").trim()) texty.push("bell.wrapup." + k); });
  if (seed) (c.scenes || []).forEach(s => { if (s && s.name && !seed.scenes.has(s.name)) texty.push("scene.name"); });
  /* v7.55 (audit): week-group names (≤30, free text) must be ones already public */
  if (seed) ((c.bell && c.bell.groups) || []).forEach(g => { if (g && g.name && !seed.groups.has(g.name)) texty.push("bell.groups[].name"); });
  const owner = c.ownerName;
  if (names.length || urls.length || texty.length || (owner && owner !== "Mr. Shaffer")) {
    console.error(`${f}: REFUSED — ${names.length} roster names, ${urls.length} URLs, content in [${texty.join(", ")}], owner=${JSON.stringify(owner)}`);
    return false;
  }
  return true;
}
/* commits about to be pushed: the same check on each changed html at that commit */
const IMG_RE = /\.(png|jpe?g|gif|webp)$/i, IMG_DIRS = /^(screenshots|docs|archive|webapp-test)\//;
const imgs = new Set();
try {
  const shas = git("git rev-list origin/main..HEAD");
  for (const sha of shas) {
    const changed = git(`git diff-tree --no-commit-id --name-only --diff-filter=AM -r ${sha}`);
    changed.filter(f => IMG_RE.test(f) && IMG_DIRS.test(f)).forEach(f => imgs.add(f + "  (commit " + sha.slice(0, 7) + ")"));
    for (const f of changed.filter(f => /\.html?$/i.test(f))) {
      let src; try { src = cp.execSync(`git show ${sha}:${JSON.stringify(f)}`, { maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch (e) { continue; }
      const m = src.match(/<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) continue;
      let c; try { c = JSON.parse(m[1]); } catch (e) { continue; }
      if (!checkConfig(sha.slice(0, 7) + ":" + f, c)) bad++;
    }
  }
} catch (e) {}
/* v7.55 (audit): a photo of the board can carry a roster, a name on the picker, a seating
   chart. New or modified images in the folders push.sh stages wholesale refuse until a person
   has looked at them (ALLOW_IMAGES=1). */
git("git status --porcelain --untracked-files=all -- screenshots docs archive webapp-test").forEach(l => {
  const st = l.slice(0, 2), f = l.slice(3).replace(/^.* -> /, "").replace(/^"(.*)"$/, "$1");
  if (st.includes("D")) return;
  if (IMG_RE.test(f) && IMG_DIRS.test(f)) imgs.add(f);
});
if (imgs.size) {
  if (process.env.ALLOW_IMAGES === "1") console.log("check.sh: ALLOW_IMAGES=1 — passing " + imgs.size + " new/modified image(s):\n   " + [...imgs].join("\n   "));
  else {
    console.error("check.sh: REFUSED — new or modified images. Look at each for names on the board, then rerun with ALLOW_IMAGES=1:");
    [...imgs].forEach(f => console.error("   " + f));
    bad++;
  }
}
/* v7.55 (audit): every text file git would stage — a Seating Chart backup, a Tally export, a
   pasted list — whatever its extension, and html with no config block too (it used to be
   skipped). Docs (*.md) quote JSON snippets on purpose, so they get the name-list rule only. */
const ROSTER = /"students"\s*:\s*\[|"rosters"\s*:\s*\[\s*\{|"names"\s*:\s*\[\s*"[^"]/;
const EXPORT_SIG = /"(?:seatingchart|tally)\.v1"\s*:\s*["{\[]|"(?:format|kind|app|type|schema|version)"\s*:\s*"(?:seatingchart|tally)\.v1"|"first"\s*:\s*"[^"]+"\s*,\s*"last"\s*:\s*"|"periodId"\s*:/i;
const TC = `"[A-Z][a-z]+(?:[ -][A-Z][a-z.'-]+)?"`;
const NAME_LIST = new RegExp(`\\[\\s*(?:${TC}\\s*,\\s*){4,}${TC}`);        // ≥5 quoted Title-case strings in one array
const others = tree.filter(f => TEXT_RE.test(f) && f !== "package.json" && f !== "package-lock.json");
for (const f of others) {
  let src; try { src = fs.readFileSync(f, "utf8"); } catch (e) { continue; }
  if (/\.(md|markdown)$/i.test(f)) {
    if (NAME_LIST.test(src)) { console.error(f + ": REFUSED — a list of five or more names"); bad++; }
    continue;
  }
  if (ROSTER.test(src)) { console.error(f + ": REFUSED — looks like a roster export"); bad++; }
  else if (EXPORT_SIG.test(src)) { console.error(f + ": REFUSED — looks like a Seating Chart / Tally export"); bad++; }
}
for (const f of files) {
  let src; try { src = fs.readFileSync(f, "utf8"); } catch (e) { continue; }
  const m = src.match(/<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) continue;                                   // not a Deckhand file (still scanned above)
  let c; try { c = JSON.parse(m[1]); } catch (e) { console.error(f + ": config block unparsable"); bad++; continue; }
  if (!checkConfig(f, c)) bad++;
}
if (bad) { console.error("\ncheck.sh: something private-looking is in the tree (see above). Nothing was pushed."); process.exit(1); }
console.log("check.sh: " + files.length + " html + " + others.length + " text files clean");
EOF
