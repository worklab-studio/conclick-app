# launchd plists — RETIRED 2026-07-23, kept as fallback

These three agents were the original scheduler for the SEO routines. They were
unloaded and moved here when scheduling moved to the Claude app's Scheduled
tasks UI (`~/.claude/scheduled-tasks/conclick-*`), which the operator can see
and manage.

**Exactly one scheduler must own the routines at a time.** Both fire the same
`scripts/seo/run-routine.sh`, and quota allows 3 pages/day, so running both
schedulers doubles the publishing pace rather than failing loudly.

Trade-off to remember:
- Claude app tasks run only **while the app is open** (missed runs fire on next
  launch).
- launchd runs whenever the **Mac is awake**, app or no app.

To fall back to launchd (e.g. the app will be closed for a stretch):

    cp deploy/launchd/*.plist ~/Library/LaunchAgents/
    for a in daily weekly news; do launchctl load ~/Library/LaunchAgents/io.conclick.seo-$a.plist; done

…and then DISABLE the three `conclick-*` tasks in the Claude app's Scheduled
section, or you are double-scheduled again.
