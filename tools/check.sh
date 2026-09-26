#!/bin/sh
# Deckhand pre-push guard. Every push to main is a PUBLIC deploy (GitHub
# Pages), and an exported copy of Deckhand carries class rosters inside
# its config block under the SAME filename as the release. This refuses
# to let one into the repo.
#
# Checks every tracked or untracked *.html (outside node_modules):
#   - the <script id="deckhand-config"> block parses
#   - rosters are empty, no widget carries a url/decks/stations
#   - ownerName is the shipped default
#   - no tmp_*.html fixture is staged
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
for (const f of files) {
  let src; try { src = fs.readFileSync(f, "utf8"); } catch (e) { continue; }
  const m = src.match(/<script id="deckhand-config"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) continue;                                   // not a Deckhand file
  let c; try { c = JSON.parse(m[1]); } catch (e) { console.error(f + ": config block unparsable"); bad++; continue; }
  const names = (c.rosters || []).flatMap(r => (r && r.names) || []);
  const urls = [];
  (c.scenes || []).forEach(s => (s.widgets || []).forEach(w => {
    if (!w) return;
    if (w.url) urls.push(w.url);
    Object.values(w.decks || {}).forEach(u => urls.push(u));
    (w.stations || []).forEach(t => t && t.url && urls.push(t.url));
  }));
  const owner = c.ownerName;
  if (names.length || urls.length || (owner && owner !== "Mr. Shaffer")) {
    console.error(`${f}: REFUSED — ${names.length} roster names, ${urls.length} URLs, owner=${JSON.stringify(owner)}`);
    bad++;
  }
}
if (bad) { console.error("\ncheck.sh: a configured copy is in the tree. Nothing was pushed."); process.exit(1); }
console.log("check.sh: " + files.length + " html files clean");
EOF
