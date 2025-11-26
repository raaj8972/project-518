#!/usr/bin/env bash
set -eu

LOG=monitor-output.txt
echo "Monitoring run: $(date -u)" > "$LOG"

BASE="https://ricorrenza.fun"
SITEMAP="$BASE/sitemap.xml"
ROBOT="$BASE/robots.txt"
HOMEPAGE="$BASE/"

ERR=0

echo "Checking sitemap: $SITEMAP" >> "$LOG"
code=$(curl -s -o /dev/null -w "%{http_code}" -L "$SITEMAP")
echo "HTTP status: $code" >> "$LOG"
if [ "$code" != "200" ]; then
  echo "Sitemap HTTP $code" >> "$LOG"
  ERR=1
fi

echo "Fetching sitemap body" >> "$LOG"
curl -sL "$SITEMAP" -o sitemap-body.xml || true
if ! python3 - <<'PY' 2>> "$LOG" < sitemap-body.xml; then
  echo "Sitemap XML invalid" >> "$LOG"
  ERR=1
fi

echo "Checking robots: $ROBOT" >> "$LOG"
rcode=$(curl -s -o /dev/null -w "%{http_code}" -L "$ROBOT")
echo "robots HTTP $rcode" >> "$LOG"
if [ "$rcode" != "200" ]; then
  echo "Robots HTTP $rcode" >> "$LOG"
  ERR=1
fi

echo "Checking homepage for GSC meta" >> "$LOG"
if curl -sL "$HOMEPAGE" | grep -i 'google-site-verification' >> "$LOG"; then
  echo "GSC meta found" >> "$LOG"
else
  echo "GSC meta NOT found" >> "$LOG"
  ERR=1
fi

if [ "$ERR" -ne 0 ]; then
  echo "MONITOR: FAIL" >> "$LOG"
  cat "$LOG"
  exit 1
else
  echo "MONITOR: OK" >> "$LOG"
  cat "$LOG"
  exit 0
fi
