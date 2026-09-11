#!/usr/bin/env bash
# QA completo en un comando: levanta el servidor estático, corre self-tests, crawl y
# auditoría, y apaga el servidor. Uso: tools/qa/run.sh [selftests|crawl|audit|plan|studio|all]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PORT="${QA_PORT:-4173}"
export QA_BASE="${QA_BASE:-http://localhost:$PORT}"
WHAT="${1:-all}"

if [ ! -d "$HERE/node_modules/playwright-core" ]; then
  echo "· instalando playwright-core (solo la primera vez)"
  (cd "$HERE" && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --silent --no-audit --no-fund)
fi

if ! curl -s -o /dev/null "$QA_BASE/index.html"; then
  echo "· servidor estático en $QA_BASE"
  (cd "$ROOT" && python3 -m http.server "$PORT" >/dev/null 2>&1 &)
  STARTED_SERVER=1
  for _ in $(seq 1 20); do curl -s -o /dev/null "$QA_BASE/index.html" && break; sleep 0.25; done
fi

cleanup() { if [ "${STARTED_SERVER:-0}" = "1" ]; then pkill -f "http.server $PORT" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT

cd "$HERE"
case "$WHAT" in
  selftests) node selftests.js ;;
  crawl) node crawl.js ;;
  audit) node audit.js ;;
  plan) node plan.js && node plan.js empty ;;
  studio) node studio.js ;;
  all) node selftests.js && node crawl.js && node audit.js && node plan.js && node plan.js empty && node studio.js ;;
  *) echo "uso: $0 [selftests|crawl|audit|plan|studio|all]"; exit 2 ;;
esac
