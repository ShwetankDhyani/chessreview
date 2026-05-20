# Chess Review

Chess.com-style game review: move classifications, coach panel, accuracy, and engine lines.

## Local development (Fedora + `/usr/bin/stockfish`)

```bash
npm install
npm run dev:engine    # native Stockfish + Vite — full game, fast
```

Or two terminals:

```bash
npm run eval-server   # http://127.0.0.1:8765
npm run dev
```

Copy `.env.example` to `.env`. Optional: `VITE_GEMINI_API_KEY` for AI coach.

When connected, the header shows **Native engine** and every move is evaluated.

## Vercel + your Fedora Stockfish (until you have a VPS)

The deployed site cannot reach `localhost`. Use a tunnel from your Fedora box:

**Terminal 1:**

```bash
npm run eval-server:public
```

**Terminal 2:**

```bash
npm run expose-engine
# Copy the https://….trycloudflare.com URL
```

**Vercel → Settings → Environment Variables:**

| Name | Value |
|------|--------|
| `VITE_EVAL_SERVER_URL` | `https://….trycloudflare.com` (no trailing slash) |

Redeploy, then re-analyze games. Keep both terminals running while using the site.

Without `VITE_EVAL_SERVER_URL`, only ~7 opening moves get Lichess eval; browser Stockfish on Vercel usually fails — that is the “only first moves evaluated” bug.

## Deploy on Vercel

1. Import [ShwetankDhyani/chessreview](https://github.com/ShwetankDhyani/chessreview).
2. Optional: `VITE_GEMINI_API_KEY`.
3. Set `VITE_EVAL_SERVER_URL` for full fast analysis (see above).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:engine` | Vite + native Stockfish |
| `npm run eval-server` | Stockfish HTTP API on :8765 |
| `npm run eval-server:public` | Bind `0.0.0.0` for tunnels |
| `npm run expose-engine` | Cloudflare/localtunnel for Vercel |
| `npm run build` | Production build |
| `npm run preview` | Preview `dist/` |
