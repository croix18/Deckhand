#!/bin/sh
# Deckhand pre-push guard. Every push to main is a PUBLIC deploy (GitHub
# Pages), and an exported copy of Deckhand carries class rosters inside
# its config block under the SAME filename as the release. This refuses
# to let one into the repo.
#
# Checks every tracked or untracked *.html (outside node_modules):
#   - the <script id="deckhand-config"> block parses
#   - rosters are empty, no widget carries a url/decks/stations
#   - no widget carries free text (notes, agenda, teams, tally, titles, saved decks)
#   - ownerName is the shipped default
#   - the settle-in message, scene names and widget labels are the shipped ones
#   - no tmp_*.html fixture is staged
#   - no *.json / *.md / *.txt / *.csv in the tree carries a roster shape (students / names)
#   - every commit about to be pushed (origin/main..HEAD) passes the same config check —
#     the tree being clean now does not clean a commit made earlier
#
# Usage: sh tools/check.sh        (exit 1 = refuse)
set -e
cd "$(dirname "$0")/.."

node - <<'EOF'
const fs = require("fs"), cp = require("child_process");
const list = s => s.toString().split("\n").map(x => x.trim()).filter(Boolean);
const files = [...new Set([
  ...list(cp.execSync('git ls-files "*.html"')),
  ...list(cp.execSync('git ls-files --others --exclude-standard "*.html"'))
])].filter(f => !f.startsWith("node_modules/"));
let bad = 0;
const staged = list(cp.execSync("git diff --cached --name-only"));
for (const f of staged) if (/(^|\/)tmp_[^/]*\.html$/.test(f)) { console.error(f + ": test fixture staged"); bad++; }
/* v7.11.5 (audit): scene names and widget labels are free text too. The allowed set is
   whatever is ALREADY public — every config block on origin/main — so nothing new can slip
   in through a label ("Jayden's timer") while the shipped names keep passing. */
let seed = null;
try {
  seed = { scenes: new Set(), labels: new Set() };
  const pub = list(cp.execSync('git ls-tree -r --name-only origin/main 2>/dev/null || true')).filter(f => /\.html$/.test(f));
  for (const f of pub) {
    let src; try { src = cp.execSync(`git show origin/main:${JSON.stringify(f)}`, { maxBuffer: 1 << 26 }).toString(); } catch (e) { continue; }
    const ms = src.match(/<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/);
    if (!ms) continue;
    let sc; try { sc = JSON.parse(ms[1]); } catch (e) { continue; }
    (sc.scenes || []).forEach(s => { if (s && s.name) seed.scenes.add(s.name); (s.widgets || []).forEach(w => w && w.label && seed.labels.add(w.label)); });
  }
  if (!seed.scenes.size) seed = null;                 // no remote yet: nothing to compare against
} catch (e) { seed = null; }
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
  const TEXT_KEYS = ["html", "text", "saved", "teams", "items", "names", "title", "msgDone", "lines", "pages", "decks", "prompt", "who", "spots", "custom"];   // v7.14: the Talk Timer's prompt and rule, the Stations' names, Work Mode's rewording
  const texty = [];
  (c.scenes || []).forEach(s => (s.widgets || []).forEach(w => {
    if (!w) return;
    TEXT_KEYS.forEach(k => {
      const v = w[k];
      if (typeof v === "string" ? v.trim() : Array.isArray(v) ? v.length : (v && typeof v === "object" && Object.keys(v).length))
        texty.push(w.type + "." + k);
    });
    if (seed && w.label && String(w.label).trim() && !seed.labels.has(w.label)) texty.push(w.type + ".label");
  }));
  if (c.bell && c.bell.settle && String(c.bell.settle.msgDone || "").trim() && c.bell.settle.msgDone !== "Find your seat") texty.push("bell.settle.msgDone");
  /* v7.14: the wrap-up's prompt, checklist and rule are free text too */
  if (c.bell && c.bell.wrapup) ["prompt", "steps", "msg"].forEach(k => { if (String(c.bell.wrapup[k] || "").trim()) texty.push("bell.wrapup." + k); });
  if (seed) (c.scenes || []).forEach(s => { if (s && s.name && !seed.scenes.has(s.name)) texty.push("scene.name"); });
  const owner = c.ownerName;
  if (names.length || urls.length || texty.length || (owner && owner !== "Mr. Shaffer")) {
    console.error(`${f}: REFUSED — ${names.length} roster names, ${urls.length} URLs, content in [${texty.join(", ")}], owner=${JSON.stringify(owner)}`);
    return false;
  }
  return true;
}
/* commits about to be pushed: the same check on each changed html at that commit */
try {
  const shas = list(cp.execSync("git rev-list origin/main..HEAD 2>/dev/null || true"));
  for (const sha of shas) {
    const changed = list(cp.execSync(`git diff-tree --no-commit-id --name-only -r ${sha} -- "*.html"`));
    for (const f of changed) {
      let src; try { src = cp.execSync(`git show ${sha}:${JSON.stringify(f)}`, { maxBuffer: 1 << 26 }).toString(); } catch (e) { continue; }
      const m = src.match(/<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) continue;
      let c; try { c = JSON.parse(m[1]); } catch (e) { continue; }
      if (!checkConfig(sha.slice(0, 7) + ":" + f, c)) bad++;
    }
  }
} catch (e) {}
/* other file types that could carry a roster: a Seating Chart backup, a pasted list */
const others = [...new Set([
  ...list(cp.execSync('git ls-files "*.json" "*.md" "*.txt" "*.csv"')),
  ...list(cp.execSync('git ls-files --others --exclude-standard "*.json" "*.md" "*.txt" "*.csv"'))
])].filter(f => !f.startsWith("node_modules/") && f !== "package.json" && f !== "package-lock.json");
for (const f of others) {
  let src; try { src = fs.readFileSync(f, "utf8"); } catch (e) { continue; }
  if (/"students"\s*:\s*\[|"rosters"\s*:\s*\[\s*\{|"names"\s*:\s*\[\s*"[^"]/.test(src)) { console.error(f + ": REFUSED — looks like a roster export"); bad++; }
}
for (const f of files) {
  let src; try { src = fs.readFileSync(f, "utf8"); } catch (e) { continue; }
  const m = src.match(/<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) continue;                                   // not a Deckhand file
  let c; try { c = JSON.parse(m[1]); } catch (e) { console.error(f + ": config block unparsable"); bad++; continue; }
  if (!checkConfig(f, c)) bad++;
}
if (bad) { console.error("\ncheck.sh: a configured copy is in the tree. Nothing was pushed."); process.exit(1); }
console.log("check.sh: " + files.length + " html files clean");
EOF
