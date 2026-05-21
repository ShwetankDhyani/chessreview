#!/usr/bin/env bash
set -euo pipefail
PORT="${STOCKFISH_PORT:-8765}"
pkill -f "cloudflared tunnel --url http://127.0.0.1:${PORT}" 2>/dev/null || true
pkill -f "stockfish-server.mjs" 2>/dev/null || true
echo "Stopped Stockfish server and tunnel (if running)."
