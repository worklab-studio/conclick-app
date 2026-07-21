#!/bin/bash
# Unattended SEO content routine runner.
#
# Invoked by launchd (io.conclick.seo-daily.plist) three times a day. Each run
# writes ONE page, so three runs = three posts. One run writing three pages was
# the alternative and it is worse: quality degrades across a single context, a
# mid-run failure loses all three, and the three land as one burst.
#
# Runs `claude -p` against the routine playbook. Non-interactive, so permissions
# come from .claude/settings.json — an un-allowlisted command hangs the run
# forever with nobody to approve it.
#
# Manual run (do this before trusting the schedule):
#   ./scripts/seo/run-routine.sh
#   ./scripts/seo/run-routine.sh --dry     # write to _drafts, never publish

set -uo pipefail

REPO="/Users/worklab/Conclick beta/umami"
LOG_DIR="$HOME/.conclick-seo-logs"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
LOG="$LOG_DIR/run-$STAMP.log"
LOCK="/tmp/conclick-seo-routine.lock"

mkdir -p "$LOG_DIR"

# Homebrew is not on launchd's PATH. Without this, `claude`, `node`, `pnpm` and
# `fly` are all "command not found" and every scheduled run fails identically.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

exec >>"$LOG" 2>&1
echo "=== conclick seo routine — $(date) ==="

# Single-flight. Runs are ~15 min and fire 4h apart, so an overlap means the
# previous run wedged. Stale lock older than 90 min is assumed dead.
if [ -e "$LOCK" ]; then
  if [ -n "$(find "$LOCK" -mmin +90 2>/dev/null)" ]; then
    echo "stale lock (>90m), removing"; rm -f "$LOCK"
  else
    echo "another run holds the lock, exiting"; exit 0
  fi
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

cd "$REPO" || { echo "repo not found"; exit 1; }

# Preflight. Each of these has already broken a run at least once.
command -v claude >/dev/null || { echo "FAIL: claude not on PATH"; exit 1; }
command -v node   >/dev/null || { echo "FAIL: node not on PATH"; exit 1; }
command -v fly    >/dev/null || echo "WARN: fly missing — routine will commit but not deploy"
fly auth whoami   >/dev/null 2>&1 || echo "WARN: fly not authenticated — deploy step will fail"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "FAIL: not a git repo"; exit 1; }

MODE="publish"
[ "${1:-}" = "--dry" ] && MODE="dry-run (write to _drafts, do not publish or deploy)"
echo "mode: $MODE"

PROMPT="Run the conclick-daily-content routine now.

Read and follow ~/.claude/scheduled-tasks/conclick-daily-content/SKILL.md exactly, start to finish.

This is an UNATTENDED scheduled run. Nobody is watching, so:
- Never ask a question. If a decision is genuinely ambiguous, mark the keyword needs-human, explain why in the report, and stop.
- Never bypass the lint gate, and never edit .lint-baseline.json to make a new violation pass.
- Write exactly ONE page this run.
- If the backlog is dry, or every candidate fails servability or cannibalization, publish nothing and say so. A run that correctly publishes nothing is a successful run.
$([ "${1:-}" = "--dry" ] && echo '- DRY RUN: pass --drafts to write.mjs, and do NOT commit, push or deploy.')

End with the run report from step 8."

claude -p "$PROMPT" --permission-mode acceptEdits
CODE=$?

echo "=== exit $CODE at $(date) ==="
if [ $CODE -ne 0 ]; then
  # Surface failures instead of letting them rot in a log nobody opens.
  osascript -e 'display notification "SEO routine failed. Check ~/.conclick-seo-logs" with title "Conclick"' 2>/dev/null || true
fi

# Keep 30 days of logs.
find "$LOG_DIR" -name 'run-*.log' -mtime +30 -delete 2>/dev/null || true
exit $CODE
