#!/usr/bin/env bash
# Start Stockfish + Cloudflare tunnel in background (no npm required in PATH).
set -euo pipefail
cd "$(dirname "$0")/.."

NODE="${NODE:-$(command -v node 2>/dev/null || echo "$HOME/.local/bin/node")}"
NPX="${NPX:-$(command -v npx 2>/dev/null || echo "$HOME/.local/bin/npx")}"
PORT="${STOCKFISH_PORT:-8765}"
LOG_DIR="${HOME}/.chessreview-engine"
URL_FILE="${LOG_DIR}/tunnel.url"
PID_FILE="${LOG_DIR}/pids"

mkdir -p "$LOG_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export STOCKFISH_PATH="${STOCKFISH_PATH:-$(command -v stockfish 2>/dev/null || echo "$HOME/.local/bin/stockfish")}"

if [[ ! -x "$NODE" ]]; then
  echo "ERROR: node not found. Run: ln -sf \$HOME/.nvm/versions/node/v*/bin/* \$HOME/.local/bin/"
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "Starting Stockfish on :${PORT} ..."
  STOCKFISH_BIND=0.0.0.0 STOCKFISH_PORT="$PORT" "$NODE" stockfish-server.mjs >>"${LOG_DIR}/stockfish.log" 2>&1 &
  SF_PID=$!
  sleep 2
  if ! curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
    echo "ERROR: Stockfish failed. See ${LOG_DIR}/stockfish.log"
    exit 1
  fi
else
  SF_PID=""
  echo "Stockfish already running on :${PORT}"
fi

if pgrep -f "cloudflared tunnel --url http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
  echo "Tunnel already running."
  if [[ -f "$URL_FILE" ]]; then cat "$URL_FILE"; fi
  exit 0
fi

echo "Starting Cloudflare tunnel ..."
"$NPX" --yes cloudflared tunnel --url "http://127.0.0.1:${PORT}" >>"${LOG_DIR}/tunnel.log" 2>&1 &
CF_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 60); do
  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "${LOG_DIR}/tunnel.log" 2>/dev/null | head -1 || true)
  if [[ -n "$TUNNEL_URL" ]]; then break; fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "ERROR: tunnel URL not found. See ${LOG_DIR}/tunnel.log"
  exit 1
fi

echo "$TUNNEL_URL" >"$URL_FILE"
echo "sf=${SF_PID:-existing}" >"$PID_FILE"
echo "cf=${CF_PID}" >>"$PID_FILE"

echo ""
echo "=== Laptop engine is live ==="
echo "Tunnel URL: $TUNNEL_URL"
echo ""
echo "Vercel → Environment Variables:"
echo "  VITE_EVAL_SERVER_URL=$TUNNEL_URL"
echo "Then Redeploy your project."
echo ""
echo "Logs: ${LOG_DIR}/"
echo "Stop:  bash scripts/stop-laptop-bg.sh"
