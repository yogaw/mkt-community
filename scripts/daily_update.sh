#!/usr/bin/env bash
# Nightly market-data refresh for mkt-community.
#
#   scripts/daily_update.sh
#
# ORDERING — this runs LAST in the evening, and that is not arbitrary:
# broker_summaries and stock_summaries are loaded by the caishen pipeline
# (18:00-18:45 in the shared crontab). build:market-flows derives from those
# rows, so running before they land produces nothing for the day. Anything
# scheduled here belongs after 19:54, when the caishen and tingfeng chains are
# done.
#
# A direct script rather than a registry job: the crontab's convention is to
# POST jobs via caishen's trigger_job.sh, but that Jobs & Workers API belongs
# to caishen and this project has none. The same crontab keeps direct scripts
# "ON PURPOSE" for exactly this case.
#
# Every step is idempotent, so a re-run after a failure is safe and resumes.
set -uo pipefail

# cron runs with a minimal PATH that does not include nvm's node, so `npm`
# resolves interactively and not from crontab. Newest installed version wins.
if ! command -v npm >/dev/null 2>&1; then
  for candidate in $(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V); do
    [ -x "$candidate/npm" ] && NODE_BIN="$candidate"
  done
  [ -n "${NODE_BIN:-}" ] && PATH="$NODE_BIN:$PATH"
  export PATH
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not on PATH and no nvm install found" >&2
  exit 1
fi

# --indicators-only skips the IDX steps. Used by the morning run, when the US
# close has landed but nothing new has happened on IDX.
INDICATORS_ONLY=0
[ "${1:-}" = "--indicators-only" ] && INDICATORS_ONLY=1

APP_DIR="${APP_DIR:-/home/ekidot/projects/mkt-community}"
LOG_DIR="${LOG_DIR:-$APP_DIR/logs}"
LOG="$LOG_DIR/daily_update.log"
LOCK="/var/tmp/mkt-community-daily.lock"

mkdir -p "$LOG_DIR"
cd "$APP_DIR" || exit 1

# One run at a time. A slow IDX fetch must not overlap the next night's run.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date '+%F %T') SKIP  another run holds the lock" >> "$LOG"
  exit 0
fi

log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

run_step() {
  local label="$1"; shift
  local output
  if output=$("$@" 2>&1); then
    log "OK    $label — $(echo "$output" | tail -1)"
    return 0
  fi
  log "FAIL  $label"
  echo "$output" | tail -20 | sed 's/^/        /' >> "$LOG"
  return 1
}

log "START daily update$([ "$INDICATORS_ONLY" -eq 1 ] && echo ' (indicators only)')"
failures=0

if [ "$INDICATORS_ONLY" -eq 0 ]; then
  # 1. IHSG for the session that just closed. IDX only; no-ops if already stored.
  run_step "fetch:index-summary"   npm run --silent fetch:index-summary     || failures=$((failures + 1))

  # 2. Foreign/domestic flow, derived locally from whatever broker rows exist.
  run_step "build:market-flows"    npm run --silent build:market-flows      || failures=$((failures + 1))
fi

# 3. Global macro and commodities from the price vendor.
run_step "fetch:market-indicators" npm run --silent fetch:market-indicators || failures=$((failures + 1))

if [ "$failures" -eq 0 ]; then
  log "DONE  all steps ok"
else
  log "DONE  $failures step(s) failed — see above; re-running is safe"
fi

exit "$failures"
