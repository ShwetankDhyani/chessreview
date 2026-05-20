#!/usr/bin/env bash
# Expose local eval server to the internet for Vercel (free until you have a VPS).
# 1) Run this script  2) Copy the https URL  3) Set Vercel env VITE_EVAL_SERVER_URL
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${STOCKFISH_PORT:-8765}"

if ! curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "Starting Stockfish server (bind 0.0.0.0) ..."
  STOCKFISH_BIND=0.0.0.0 STOCKFISH_PORT="$PORT" node stockfish-server.mjs &
  SF_PID=$!
  sleep 2
  trap 'kill "$SF_PID" 2>/dev/null' EXIT INT TERM
fi

echo ""
echo "=== Tunnel (paste URL into Vercel → VITE_EVAL_SERVER_URL) ==="
echo ""

if command -v cloudflared >/dev/null 2>&1; then
  cloudflared tunnel --url "http://127.0.0.1:${PORT}"
elif command -v lt >/dev/null 2>&1; then
  lt --port "$PORT"
else
  echo "Installing cloudflared via npx..."
  npx --yes cloudflared tunnel --url "http://127.0.0.1:${PORT}"
fi
