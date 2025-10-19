# Agent Guidelines (connect-token-server)

Security-critical defaults for this repo:

- PR creation must use `scripts/secure_pr.sh`.
  - Never echo tokens. Ensure `set +x` before any token handling.
  - Provide token via stdin: `gh auth login --with-token < ~/.secrets/gh_pat.txt`.
  - The script already disables verbose logs and cleans up temp files.

- Do not run `curl -v` or enable `GIT_CURL_VERBOSE` when Authorization headers are present.

- Prefer GitHub browser auth for local, human-driven sessions: `gh auth login --web`.

- Token files, if used, must be `chmod 600` and kept outside VCS; default path is `~/.secrets/gh_pat.txt`.

These are repo-scoped rules that future agents should follow by default.

