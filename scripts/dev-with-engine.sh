#!/usr/bin/env bash
# Vite + native Stockfish on Fedora (http://127.0.0.1:8765)
set -euo pipefail
cd "$(dirname "$0")/.."

cleanup() {
  kill "$SF_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Stockfish eval server on http://127.0.0.1:8765 ..."
node stockfish-server.mjs &
SF_PID=$!
sleep 1

if ! curl -sf "http://127.0.0.1:8765/health" >/dev/null; then
  echo "ERROR: Stockfish server did not start. Is /usr/bin/stockfish installed?"
  exit 1
fi

echo "Starting Vite (http://localhost:5173) ..."
npm run dev
