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

# --- health + alerting -----------------------------------------------------
#
# The engine failed silently for three days (2026-07-25..27, seven runs, revoked
# claude token). The operator's stated requirement is "I don't want to check
# daily", so silence has to mean healthy — which means a failure must escalate
# on its own rather than wait to be discovered.
#
# Three levels, deliberately:
#   1. HEALTH.md   — an append-only ledger, one line per run. Cheap to read,
#                    survives log rotation, and is what a human or an agent
#                    greps to answer "is this thing alive".
#   2. notification— a toast on the first failure. Easy to miss, which is fine:
#                    one bad run is usually transient (a stream hiccup, a lock).
#   3. modal dialog— on the SECOND consecutive failure. Blocking, stays until
#                    dismissed. Two in a row is never transient; it means the
#                    engine is down and will stay down until someone acts.
HEALTH="$LOG_DIR/HEALTH.md"
FAILSTATE="$LOG_DIR/.consecutive-failures"

record_health() {
  mkdir -p "$LOG_DIR"
  [ -f "$HEALTH" ] || printf '# Conclick SEO engine health\n\nOne line per run. Newest at the bottom.\n\n' > "$HEALTH"
  printf '%s  %-14s %s\n' "$(date '+%Y-%m-%d %H:%M')" "$ROUTINE" "$1" >> "$HEALTH"
}

alert() {
  local msg="$1"
  local fails=0
  [ -f "$FAILSTATE" ] && fails="$(cat "$FAILSTATE" 2>/dev/null || echo 0)"
  fails=$((fails + 1))
  echo "$fails" > "$FAILSTATE"

  osascript -e "display notification \"$msg\" with title \"Conclick SEO\" sound name \"Basso\"" 2>/dev/null || true

  # Second strike: a dialog that cannot be missed or auto-dismissed.
  if [ "$fails" -ge 2 ]; then
    osascript -e "display dialog \"Conclick SEO engine has failed $fails runs in a row.\n\n$msg\n\nNothing is publishing until this is fixed.\" with title \"Conclick SEO — engine down\" buttons {\"OK\"} default button 1 with icon stop" >/dev/null 2>&1 &
  fi
}

clear_failures() { rm -f "$FAILSTATE"; }

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

# CLAUDE AUTH PREFLIGHT — fail fast, loudly, with the fix in the message.
#
# 2026-07-25..27: seven consecutive runs died on "401 OAuth access token has
# been revoked" and nobody noticed for three days, because the failure was
# buried mid-log and the only alert was a toast that vanished. The engine
# publishes nothing and looks fine from the outside, which is the worst
# possible failure shape.
#
# NOTE `claude auth status` is NOT sufficient: during that outage it reported
# {"loggedIn": true, "subscriptionType": "max"} while every actual call 401'd.
# The stored session record and the server's view of the token had diverged.
# The only trustworthy probe is a real (tiny) completion.
if ! AUTH_PROBE="$(claude -p 'reply with exactly: OK' 2>&1)" || echo "$AUTH_PROBE" | grep -qiE 'authenticat|401|revoked|expired'; then
  echo "FAIL: the claude CLI cannot authenticate — the routine cannot write anything."
  echo "  probe said: $(echo "$AUTH_PROBE" | head -1)"
  echo "  FIX (one command, in a terminal, needs a human):"
  echo "    claude auth login          # re-auth interactively"
  echo "    claude setup-token         # better for unattended: a long-lived token"
  alert "Conclick SEO: claude auth is dead. Run 'claude auth login'. Nothing has published since it broke."
  record_health "AUTH FAILED — $(echo "$AUTH_PROBE" | head -1)"
  exit 1
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
#
# HARD TIMEOUT + ONE RETRY. On 2026-07-24 the 09:27 run hit "API Error: Stream
# idle timeout" and hung until 12:20 — nearly THREE HOURS — because `claude -p`
# has a very long internal idle timeout and nothing here capped it. A normal
# write+gate+deploy is ~10-12 min, so a run past ~20 min is wedged, not slow.
# macOS ships no `timeout`/`gtimeout`, so this is a portable watchdog: run claude
# in the background, and a sleeper kills it if it overruns. The observed failure
# is transient, so one fresh retry clears it; quota is computed from committed
# state, so a retry after a partial first attempt cannot double-publish.
ATTEMPT_TIMEOUT="${SEO_ATTEMPT_TIMEOUT:-1200}" # 20 min per attempt

run_claude() {
  claude -p "$PROMPT" --permission-mode dontAsk &
  local pid=$!
  ( sleep "$ATTEMPT_TIMEOUT"; kill -TERM "$pid" 2>/dev/null; sleep 8; kill -KILL "$pid" 2>/dev/null ) &
  local watcher=$!
  wait "$pid" 2>/dev/null
  local code=$?
  # Stop the watchdog so it does not fire into the next attempt.
  kill "$watcher" 2>/dev/null
  wait "$watcher" 2>/dev/null
  # 143 = SIGTERM, 137 = SIGKILL: the watchdog tripped, i.e. a hang.
  if [ "$code" = "143" ] || [ "$code" = "137" ]; then
    echo "!!! claude exceeded ${ATTEMPT_TIMEOUT}s and was killed (hang, not a slow run)"
  fi
  return "$code"
}

run_claude
CODE=$?
if [ "$CODE" -ne 0 ]; then
  echo "=== attempt 1 failed (exit $CODE) at $(date) — retrying once ==="
  run_claude
  CODE=$?
fi

echo "=== exit $CODE at $(date) ==="
if [ $CODE -ne 0 ]; then
  # Surface failures instead of letting them rot in a log nobody opens.
  # alert() escalates to a blocking dialog on the second consecutive failure.
  TAIL="$(grep -iE 'error|failed|denied|revoked' "$LOG" 2>/dev/null | tail -1 | cut -c1-140)"
  record_health "FAILED (exit $CODE) ${TAIL:-see log}"
  alert "$ROUTINE failed (exit $CODE). ${TAIL:-Check ~/.conclick-seo-logs}"
else
  # A run that correctly publishes nothing is still a healthy run, so record the
  # verdict line rather than just "ok" — that is what makes HEALTH.md readable
  # as a history instead of a heartbeat.
  VERDICT="$(grep -oiE 'quota met|REPAIR|WRITE|nothing (happened|worth)|another run holds' "$LOG" 2>/dev/null | head -1)"
  record_health "ok — ${VERDICT:-completed}"
  clear_failures
fi

# Keep 30 days of logs.
find "$LOG_DIR" -name '*.log' -mtime +30 -delete 2>/dev/null || true
exit $CODE
