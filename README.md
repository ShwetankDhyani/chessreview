# Chess Review

Chess.com-style game review: move classifications, coach panel, accuracy, and engine lines.

## Local development

```bash
npm install
npm run dev
```

Optional (fastest analysis on your machine):

```bash
node stockfish-server.mjs   # native Stockfish on http://127.0.0.1:8765
```

Copy `.env.example` to `.env` and set `VITE_GEMINI_API_KEY` for AI coach text.

## Deploy on Vercel (free)

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Framework preset: **Vite** (auto-detected from `vercel.json`).
4. Add environment variable (optional): `VITE_GEMINI_API_KEY` — your [Google AI Studio](https://aistudio.google.com/apikey) key.
5. Deploy.

On Vercel, analysis uses **Lichess cloud eval** (when cached) and **Stockfish in the browser** as fallback. No VPS or `stockfish-server.mjs` required.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
