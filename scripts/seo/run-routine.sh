#!/bin/bash
# Unattended SEO routine runner.
#
#   ./scripts/seo/run-routine.sh                     # daily-content (the default)
#   ./scripts/seo/run-routine.sh weekly-traffic
#   ./scripts/seo/run-routine.sh news-watch
#   ./scripts/seo/run-routine.sh daily-content --dry # write to _drafts, never publish
#
# Invoked by launchd. Three agents share this one script:
#
#   daily-content   3x/day  io.conclick.seo-daily    writes one page per run
#   weekly-traffic  Mon     io.conclick.seo-weekly   repairs what GSC says is weak
#   news-watch      4x/day  io.conclick.seo-news     queues, never publishes
#
# Runs `claude -p` against a playbook. Non-interactive, so permissions come from
# .claude/settings.json — an un-allowlisted command hangs the run forever with
# nobody to approve it.
#
# THE PLAYBOOK LIVES IN THE REPO. It used to be read from
# ~/.claude/scheduled-tasks/<name>/SKILL.md — outside the repo, with the repo's
# ROUTINE.md kept in sync by hand. Two copies of a 150-line behavioural contract
# drift, and the drift is invisible: the file you edit is not the file that
# runs. scripts/seo/routines/ is now the only copy.

set -uo pipefail

REPO="/Users/worklab/Conclick beta/umami"
LOG_DIR="$HOME/.conclick-seo-logs"
LOCK="/tmp/conclick-seo-routine.lock"

# --- args ------------------------------------------------------------------

ROUTINE="daily-content"
DRY=""
for arg in "$@"; do
  case "$arg" in
    --dry) DRY="1" ;;
    -*) echo "unknown flag: $arg"; exit 2 ;;
    *) ROUTINE="$arg" ;;
  esac
done

STAMP="$(date +%Y-%m-%d_%H%M%S)"
LOG="$LOG_DIR/$ROUTINE-$STAMP.log"
mkdir -p "$LOG_DIR"

exec >>"$LOG" 2>&1
echo "=== conclick $ROUTINE — $(date) ==="

# Homebrew is not on launchd's PATH. Without this, `claude`, `node`, `pnpm` and
# `fly` are all "command not found" and every scheduled run fails identically.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# --- lock ------------------------------------------------------------------
#
# ONE lock across all three routines, not one each. They share a git working
# tree: two agents committing at once produces a conflict or a half-staged
# commit, and the weekly routine edits the very files the daily one writes.
# Schedules are staggered so contention should be rare; when it happens the
# loser exits rather than queueing, because a routine that starts 40 minutes
# late is one running on assumptions it made at boot.
if [ -e "$LOCK" ]; then
  if [ -n "$(find "$LOCK" -mmin +90 2>/dev/null)" ]; then
    echo "stale lock (>90m), removing: $(cat "$LOCK" 2>/dev/null)"; rm -f "$LOCK"
  else
    echo "another run holds the lock ($(cat "$LOCK" 2>/dev/null)), exiting"; exit 0
  fi
fi
echo "$ROUTINE pid=$$ started=$(date)" > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

cd "$REPO" || { echo "repo not found"; exit 1; }

# --- preflight -------------------------------------------------------------
# Each of these has already broken a run at least once.

command -v claude >/dev/null || { echo "FAIL: claude not on PATH"; exit 1; }
command -v node   >/dev/null || { echo "FAIL: node not on PATH"; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "FAIL: not a git repo"; exit 1; }

PLAYBOOK_FILE="$REPO/scripts/seo/routines/$ROUTINE.md"
if [ ! -f "$PLAYBOOK_FILE" ]; then
  echo "FAIL: no playbook at $PLAYBOOK_FILE"
  echo "available: $(ls "$REPO/scripts/seo/routines" 2>/dev/null | sed 's/\.md$//' | tr '\n' ' ')"
  exit 1
fi

# Only the routines that ship need fly. news-watch never deploys, so warning
# about fly there would just train the reader to ignore warnings.
if [ "$ROUTINE" != "news-watch" ]; then
  command -v fly >/dev/null || echo "WARN: fly missing — routine will commit but not deploy"
  fly auth whoami >/dev/null 2>&1 || echo "WARN: fly not authenticated — deploy step will fail"
fi

echo "playbook: $PLAYBOOK_FILE"
echo "mode: $([ -n "$DRY" ] && echo 'dry-run (write to _drafts, do not publish or deploy)' || echo 'publish')"

# Pin the run to the playbook as it was at boot, so an edit mid-run cannot
# change the contract halfway through.
PLAYBOOK="$(cat "$PLAYBOOK_FILE")"

PROMPT="Run the conclick-$ROUTINE routine now.

Follow the playbook below exactly, start to finish. It is the canonical routine —
do not substitute, summarise, or improvise around it.

===== BEGIN PLAYBOOK =====
${PLAYBOOK}
===== END PLAYBOOK =====

This is an UNATTENDED scheduled run. Nobody is watching, so:
- Never ask a question. If a decision is genuinely ambiguous, record it as needs-human, explain why in the report, and stop.
- Never bypass the lint gate, and never edit .lint-baseline.json to make a new violation pass.
- If there is nothing worth doing, do nothing and say so. A run that correctly changes nothing is a successful run.
$([ -n "$DRY" ] && echo '- DRY RUN: pass --drafts to write.mjs, and do NOT commit, push or deploy.')

End with the run report from the playbook's final step."

# --permission-mode acceptEdits auto-approves EDITS ONLY, not Bash. The first
# dry run stalled on `node scripts/seo/kwstore.mjs report` for exactly that
# reason. `dontAsk` honours the allow/deny lists in .claude/settings.json and
# declines anything not covered instead of blocking on a prompt nobody can
# answer — which is what an unattended run needs.
#
# Deliberately NOT bypassPermissions: this run commits to master and deploys to
# production, so the deny list (fly secrets/ssh/postgres, gh secret, rm -rf,
# prisma migrate, pnpm run build) has to stay enforced.
claude -p "$PROMPT" --permission-mode dontAsk
CODE=$?

echo "=== exit $CODE at $(date) ==="
if [ $CODE -ne 0 ]; then
  # Surface failures instead of letting them rot in a log nobody opens.
  osascript -e "display notification \"$ROUTINE routine failed. Check ~/.conclick-seo-logs\" with title \"Conclick\"" 2>/dev/null || true
fi

# Keep 30 days of logs.
find "$LOG_DIR" -name '*.log' -mtime +30 -delete 2>/dev/null || true
exit $CODE
