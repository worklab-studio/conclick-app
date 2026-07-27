#!/bin/bash
# Is the content engine alive? One command, one screen.
#
#   ./scripts/seo/health.sh
#
# Exists because the engine died on 2026-07-25 (revoked claude token) and ran
# dead for three days. Nothing was wrong with the site, nothing errored visibly,
# and the only signal was a toast that vanished. Answering "is this thing
# working" required reading seven log files. It should cost one command.
#
# Exit code is meaningful: 0 healthy, 1 degraded/down. So this doubles as a
# check another agent or a cron can gate on.

set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

REPO="/Users/worklab/Conclick beta/umami"
LOG_DIR="$HOME/.conclick-seo-logs"
RC=0

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; RC=1; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

cd "$REPO" 2>/dev/null || { bad "repo not found at $REPO"; exit 1; }

bold "CLAUDE AUTH  (the thing that broke on 2026-07-25)"
# A real completion, not `claude auth status` — that reported loggedIn:true
# throughout the outage while every actual call returned 401.
if PROBE="$(claude -p 'reply with exactly: OK' 2>&1)" && ! echo "$PROBE" | grep -qiE 'authenticat|401|revoked|expired'; then
  ok "claude -p works"
else
  bad "claude -p CANNOT authenticate: $(echo "$PROBE" | head -1)"
  printf '      fix: \033[1mclaude auth login\033[0m   (or: claude setup-token, for a long-lived one)\n'
fi

bold "SCHEDULER"
if command -v launchctl >/dev/null && launchctl list 2>/dev/null | grep -q conclick; then
  warn "launchd agents present — these were retired; the Claude app owns scheduling now"
fi
for t in conclick-daily-content conclick-weekly-traffic conclick-news-watch; do
  [ -f "$HOME/.claude/scheduled-tasks/$t/SKILL.md" ] && ok "task registered: $t" || bad "task MISSING: $t"
done

bold "RECENT RUNS"
if [ -d "$LOG_DIR" ]; then
  RECENT="$(ls -t "$LOG_DIR"/daily-content-*.log 2>/dev/null | head -5)"
  if [ -z "$RECENT" ]; then
    bad "no daily-content runs have ever logged"
  else
    for f in $RECENT; do
      stamp="$(basename "$f" .log | sed 's/daily-content-//')"
      if grep -qiE 'revoked|401|Failed to authenticate' "$f" 2>/dev/null; then
        bad "$stamp  AUTH FAILURE"
      elif grep -q '=== exit 0' "$f" 2>/dev/null; then
        ok "$stamp  $(grep -oiE 'quota met|REPAIR|WRITE|another run holds' "$f" | head -1)"
      else
        bad "$stamp  exit $(grep -oE '=== exit [0-9]+' "$f" | tail -1 | grep -oE '[0-9]+$' || echo '?')"
      fi
    done
  fi
  FAILS="$(cat "$LOG_DIR/.consecutive-failures" 2>/dev/null || echo 0)"
  [ "$FAILS" -gt 0 ] 2>/dev/null && bad "$FAILS consecutive failures outstanding"
else
  bad "no log directory — the routine has never run"
fi

bold "PUBLISHING"
# RECENCY, not volume. A 7-day count showed a green tick while the engine had
# been dead for three days — every one of those pages predated the outage. At a
# 1/day cadence the only honest question is "when did it last produce", so this
# gates on staleness and reports the count as context only.
CONTENT_FILTER='news watch|indexnow|ledger|gsc|orphan-repair|health|remediate'
PAGES="$(git log --since='7 days ago' --format='%s' 2>/dev/null \
  | grep -iE 'content\(seo\)|chore\(seo\)' | grep -viE "$CONTENT_FILTER" | wc -l | tr -d ' ')"
LAST_EPOCH="$(git log -1 --format='%at' --grep='content(seo)' 2>/dev/null || echo 0)"
if [ "${LAST_EPOCH:-0}" -gt 0 ] 2>/dev/null; then
  AGE_DAYS=$(( ( $(date +%s) - LAST_EPOCH ) / 86400 ))
  if [ "$AGE_DAYS" -le 1 ]; then
    ok "last page published ${AGE_DAYS}d ago (${PAGES} in the last 7 days)"
  elif [ "$AGE_DAYS" -le 2 ]; then
    warn "last page published ${AGE_DAYS}d ago — one more quiet day means it is stuck"
  else
    bad "last page published ${AGE_DAYS}d ago — the engine is NOT producing (${PAGES} in the last 7 days, all older)"
  fi
else
  bad "no content page has ever been committed"
fi

bold "MEASUREMENT"
if [ -f "$HOME/.conclick/google-sa.json" ]; then
  ROWS="$(node -e "import('$REPO/scripts/seo/kwstore.mjs').then(({openDb})=>{const d=openDb();console.log(d.prepare('SELECT COUNT(*) n FROM gsc_metrics').get().n);d.close();})" 2>/dev/null || echo '?')"
  [ "$ROWS" != "0" ] && [ "$ROWS" != "?" ] && ok "Search Console: $ROWS metric rows" || warn "GSC credential present but no data ingested"
else
  bad "no Search Console credential at ~/.conclick/google-sa.json"
fi

echo
[ $RC -eq 0 ] && bold "HEALTHY" || bold "NEEDS ATTENTION  (see ✗ above)"
exit $RC
