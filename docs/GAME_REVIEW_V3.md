# Game Review v3 (Chess.com-style)

Modular implementation under `src/analysis/`.

## Modules

| File | Role |
|------|------|
| `expectedPoints.ts` | CP → win% → 0–1 expected points |
| `classifyReviewMove.ts` | Thresholds + Book / Great / Miss / Brilliant |
| `caps2Accuracy.ts` | CAPS2 exponential per-move + game accuracy |
| `openingBook.ts` | `checkOpeningBookSync(fen, book)` |
| `detectPieceSacrifice.ts` | `detectPieceSacrifice(...)` stub |
| `stockfishReview.worker.ts` | Stockfish WASM + MultiPV |
| `stockfishClient.ts` | Main-thread worker API |
| `gameReview.ts` | PGN iterator → `ReviewResult` |

## Engine (hybrid v3.1 — fast)

1. **Batch pass** — `evaluateFensConsensus` via native Stockfish server / cloud (all FENs in chunks).
2. **Extra FENs** — positions after engine best move (when not played).
3. **MultiPV WASM** — only up to 12 “Great” candidate plies (not every position).
4. **Fallback** — full WASM MultiPV if batch coverage &lt; 85%.

Entry: `analyzePgn()` → `analyzeGameReview()`. Banner: `v3.1-hybrid-batch` when fast path wins.

## Expected points

```
Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
E = Win% / 100
E_loss (accuracy) = E_afterBest − E_afterPlayed  (0 when engine best is played)
E_loss (classification) = max(vs-best, E_before − E_afterPlayed)
```

## Classification bands (core labels only)

- **Best**: engine best (or forced / delivered mate)
- **Good**: ≤ 0.05 class loss
- **Inaccuracy**: ≤ 0.10
- **Mistake**: ≤ 0.20 (or initiative slip while still winning)
- **Blunder**: > 0.20 with a real collapse
- **Book**: opening theory

No Brilliant / Great / Excellent / Miss — those confused people when a losing move was “excellent” only because it matched a shallow second-best line.

**Why absolute loss in classification:** Accuracy stays Chess.com-style vs-best so bullet noise doesn’t crush scores. Labels use absolute win-chance change too, so walking into mate from a playable/won position is never “good.”

**Winning-position cap:** If you were clearly better (`E_before ≥ 0.55`), still at least equal after (`E_after ≥ 0.50`), and ep loss is below 0.32, a raw >0.20 band is labeled **mistake** (lost initiative, not the game).

## Opening book

Pass `openingBook: Set<fen>` (or `Map`) into `analyzeGameReview`; lookups use `checkOpeningBookSync`.
