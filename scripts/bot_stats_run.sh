#!/usr/bin/env bash
# Fill bot_stats after the hourly publisher (lot 1b, D094). Runs ON THE VPS.
#
#   bot_stats_run.sh            compute every public bot, page by page (cursor)
#   bot_stats_run.sh verify     recompute a sample of stored rows, name the ones that differ
#
# Crontab (one line, after the publisher; `;` and not `&&`: the publisher exits 0 even when
# half the fleet failed, and recomputing from whatever is in the base is never wrong):
#   0 * * * * python3 ~/algoproof_sync.py >> ~/logs/algoproof_sync.log 2>&1; ~/bot_stats_run.sh >> ~/logs/bot_stats.log 2>&1
#   40 3 * * * ~/bot_stats_run.sh verify >> ~/logs/bot_stats.log 2>&1
#
# The secret lives in ~/.bot_stats_secret (chmod 600), never on a command line: curl reads
# the header from a file.
set -u
URL="${BOT_STATS_URL:-https://algoproof.fr/api/internal/bot-stats}"
SECRET_FILE="${BOT_STATS_SECRET_FILE:-$HOME/.bot_stats_secret}"
LIMIT="${BOT_STATS_LIMIT:-40}"
HDR=$(mktemp); trap 'rm -f "$HDR"' EXIT
chmod 600 "$HDR"
printf 'x-bot-stats-secret: %s\n' "$(tr -d '\r\n' < "$SECRET_FILE")" > "$HDR"

post() {
  curl -sS --max-time 70 --retry 2 --retry-delay 5 -X POST -H @"$HDR" "$1"
}

stamp() { date -u +%FT%TZ; }

if [ "${1:-}" = "verify" ]; then
  echo "$(stamp) verify $(post "$URL?verify=1&sample=${BOT_STATS_SAMPLE:-30}")"
  exit 0
fi

after=""
for page in $(seq 1 100); do
  q="limit=$LIMIT"; [ -n "$after" ] && q="$q&after=$after"
  body=$(post "$URL?$q")
  echo "$(stamp) page $page $body"
  next=$(printf '%s' "$body" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("next") or "")
except Exception: print("")')
  [ -z "$next" ] && break
  after="$next"
done
