# Game Review v3 (Chess.com-style)

Modular implementation under `src/analysis/`.

## Modules

| File | Role |
|------|------|
| `expectedPoints.ts` | CP → win% → 0–1 expected points |
| `classifyReviewMove.ts` | Thresholds + Book / Great / Miss / Brilliant |
| `caps2Accuracy.ts` | CAPS2 exponential per-move + game accuracy |
| `openingBook.ts` | `checkOpeningBook(fen)` stub |
| `detectPieceSacrifice.ts` | `detectPieceSacrifice(...)` stub |
| `stockfishReview.worker.ts` | Stockfish WASM + MultiPV |
| `stockfishClient.ts` | Main-thread worker API |
| `gameReview.ts` | PGN iterator → `ReviewResult` |

## Engine

- WASM worker loads `/public/stockfish.js` (replace with SF 16.1 build when ready).
- `MultiPV = 2` (configurable), `depth >= 18`.
- Entry: `analyzePgn()` in `src/utils/analyzer.ts` → `analyzeGameReview()`.

## Expected points

```
Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
E = Win% / 100
E_loss = E_before - E_after
```

## Classification bands (E_loss)

- Best: 0
- Excellent: ≤ 0.02
- Good: ≤ 0.05
- Inaccuracy: ≤ 0.10
- Mistake: ≤ 0.20
- Blunder: > 0.20

Special overrides (before bands): Book, Great, Miss (failed capitalize → blunder), Brilliant.

## Opening book

Implement `checkOpeningBook` / pass `openingBook: Set<fen>` into `analyzeGameReview`.
