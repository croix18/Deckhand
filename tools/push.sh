#!/bin/sh
# Back Deckhand up to github.com/croix18/deckhand from a Claude session.
#
# The sandbox proxy answers git's first (credential-less) request with 403,
# so the token must ride EVERY request preemptively as a Basic header —
# never in the remote URL. See GITHUB_FROM_A_SESSION.md (M7 session notes).
#
# Usage: sh tools/push.sh "commit message"
set -e
cd "$(dirname "$0")/.."

[ -f .github-token ] || { echo "no .github-token file"; exit 1; }
T=$(cat .github-token)
B=$(printf 'x-access-token:%s' "$T" | base64 -w0)
AUTH="http.https://github.com/.extraheader=Authorization: Basic $B"

git add -A
if ! git diff --cached --quiet; then
  git commit -m "${1:-backup}"
fi

# The push's own error text can lie (it may print a credential complaint
# from the first request while the second succeeded) — so push, then
# verify by comparing the remote head to the local one.
git -c "$AUTH" push origin main || true
REMOTE=$(git -c "$AUTH" ls-remote origin main | cut -f1)
LOCAL=$(git log -1 --format=%H)
if [ "$REMOTE" = "$LOCAL" ]; then
  echo "PUSH VERIFIED: $LOCAL"
else
  echo "PUSH MISMATCH: local=$LOCAL remote=$REMOTE"
  exit 1
fi
