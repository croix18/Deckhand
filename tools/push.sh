#!/bin/sh
# Commit and push Deckhand to github.com/croix18/Deckhand — which DEPLOYS
# (GitHub Pages serves main). Refuses if tools/check.sh finds a configured
# copy (rosters, deck URLs, a non-default owner) anywhere in the tree.
#
# The sandbox proxy answers git's first (credential-less) request with
# 403, so the token rides EVERY request preemptively as a Basic header —
# via GIT_CONFIG_* environment variables, never in the remote URL and
# never in argv (where `ps` could read it).
#
# Usage: sh tools/push.sh "commit message"
set -e
cd "$(dirname "$0")/.."

[ -f .github-token ] || { echo "no .github-token file"; exit 1; }
sh tools/check.sh

T=$(cat .github-token)
B=$(printf 'x-access-token:%s' "$T" | base64 -w0)
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0="http.https://github.com/.extraheader"
export GIT_CONFIG_VALUE_0="Authorization: Basic $B"

git add -A
if ! git diff --cached --quiet; then
  git commit -m "${1:-backup}"
fi

# The push's own error text can lie (it may print a credential complaint
# from the first request while the second succeeded) — so push, then
# verify by comparing the remote head to the local one.
git push origin main || true
REMOTE=$(git ls-remote origin main | cut -f1)
LOCAL=$(git log -1 --format=%H)
if [ "$REMOTE" = "$LOCAL" ]; then
  echo "PUSH VERIFIED: $LOCAL"
else
  echo "PUSH MISMATCH: local=$LOCAL remote=$REMOTE"
  exit 1
fi
