#!/usr/bin/env bash
# Minimal Ralph loop for Antigravity CLI.
# Usage:
#   ./ralph.sh once        run a single iteration, then stop (start here)
#   ./ralph.sh             run up to MAX_ITER iterations (default 10)
#   MAX_ITER=25 ./ralph.sh
#
# Confirm the agy flags on your install first: agy help
# -p / --print runs one non-interactive prompt and exits.

set -euo pipefail

MAX_ITER="${MAX_ITER:-10}"
PROMPT_FILE="PROMPT.md"

[ -f "$PROMPT_FILE" ] || { echo "Missing $PROMPT_FILE. Run this from the project root."; exit 1; }
command -v agy >/dev/null || { echo "agy not found. Install Antigravity CLI first."; exit 1; }

if [ "${1:-}" = "once" ]; then
  MAX_ITER=1
fi

for i in $(seq 1 "$MAX_ITER"); do
  echo "=== Ralph iteration $i of $MAX_ITER ==="
  agy -p "$(cat "$PROMPT_FILE")"

  if grep -q "ALL_TASKS_DONE" progress.md; then
    echo "All tasks done."
    exit 0
  fi

  if grep -q "^## BLOCKED\|^BLOCKED" progress.md; then
    echo "Agent reported a blocker. Read progress.md, fix it, remove the BLOCKED note, and re-run."
    exit 2
  fi

  # Safety: stop if the agent left the repo in a state with no new commit and no task progress
  sleep 2
done

echo "Reached MAX_ITER=$MAX_ITER. Review progress.md and run again if you want to continue."
