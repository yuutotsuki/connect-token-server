#!/usr/bin/env bash
# Minimal, safer wrapper to create a PR without exposing tokens in logs/history.
# Usage:
#   cd <repo-root>
#   scripts/secure_pr.sh "<title>" <base-branch> <head-branch> <<'EOF'
#   <PR body markdown>
#   EOF

set -euo pipefail

# ensure tracing and echoes don't leak secrets
set +x
export GIT_TRACE=0 GIT_CURL_VERBOSE=0

TITLE="${1:?title}"
BASE="${2:-main}"
HEAD="${3:?head-branch}"

# token file path can be overridden by GH_TOKEN_FILE
TOKEN_FILE="${GH_TOKEN_FILE:-$HOME/.secrets/gh_pat.txt}"

# lock down default perms for any temp files
umask 077

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) not found in PATH" >&2
  exit 127
fi

if [ ! -f "$TOKEN_FILE" ]; then
  echo "Error: token file not found: $TOKEN_FILE" >&2
  exit 1
fi

# capture body from stdin into a temp file (auto-removed)
tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT
cat > "$tmp_body"

# authenticate gh using token if not already logged in
if ! gh auth status >/dev/null 2>&1; then
  gh auth login --with-token < "$TOKEN_FILE"
fi

# create PR; body provided via file to avoid shell quoting issues
gh pr create \
  --base "$BASE" \
  --head "$HEAD" \
  --title "$TITLE" \
  --body-file "$tmp_body"

