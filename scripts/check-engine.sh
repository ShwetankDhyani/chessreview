#!/usr/bin/env bash
# Quick check: local Stockfish server + optional tunnel URL
set -euo pipefail
PORT="${STOCKFISH_PORT:-8765}"
LOCAL="http://127.0.0.1:${PORT}"

echo "=== Local eval server (${LOCAL}) ==="
if curl -sf "${LOCAL}/health" | head -c 200; then
  echo ""
  echo "OK"
else
  echo "NOT RUNNING — start: npm run eval-server:public"
  exit 1
fi

if [[ -n "${VITE_EVAL_SERVER_URL:-}" ]]; then
  echo ""
  echo "=== Tunnel (${VITE_EVAL_SERVER_URL}) ==="
  curl -sf "${VITE_EVAL_SERVER_URL%/}/health" && echo "" || echo "Tunnel unreachable"
fi

echo ""
echo "Vercel must use the SAME https URL in VITE_EVAL_SERVER_URL, then Redeploy."
