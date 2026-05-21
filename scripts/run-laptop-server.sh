#!/usr/bin/env bash
# Laptop as Stockfish server for Vercel (batched eval, laptop-tuned threads/hash).
#
# 1) Run this script and keep the terminal open
# 2) Copy the https tunnel URL into Vercel → VITE_EVAL_SERVER_URL → Redeploy
# 3) In the app, use depth 12–14 on old laptops (14 is the new default)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export STOCKFISH_PATH="${STOCKFISH_PATH:-$(command -v stockfish 2>/dev/null || true)}"
export STOCKFISH_BIND=0.0.0.0
export STOCKFISH_PORT="${STOCKFISH_PORT:-8765}"
export STOCKFISH_LAPTOP_MODE="${STOCKFISH_LAPTOP_MODE:-1}"

if [[ -z "${STOCKFISH_PATH}" || ! -x "${STOCKFISH_PATH}" ]]; then
  echo "ERROR: stockfish not found. Install it or set STOCKFISH_PATH in .env"
  exit 1
fi

echo "Laptop engine server"
echo "  Stockfish: ${STOCKFISH_PATH}"
echo "  Port:      ${STOCKFISH_PORT} (0.0.0.0)"
echo ""
echo "After the tunnel URL appears, set it in Vercel as VITE_EVAL_SERVER_URL and redeploy."
echo ""

exec bash scripts/expose-engine.sh
