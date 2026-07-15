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
E_loss = E_afterBest − E_afterPlayed  (0 when engine best is played)
```

## Classification bands (E_loss)

- Best: 0
- Excellent: ≤ 0.02
- Good: ≤ 0.05
- Inaccuracy: ≤ 0.10
- Mistake: ≤ 0.20
- Blunder: > 0.20 **and** not a “still winning” initiative slip (see below)

**Winning-position cap:** If you were clearly better (`E_before ≥ 0.55`), still at least equal after (`E_after ≥ 0.50`), and ep loss is below 0.32, a raw >0.20 band is labeled **mistake** (lost initiative, not the game). True blunders in won games need a bigger collapse (e.g. 85% → 45%).

**Miss (failed punish):** After opponent mistake/inaccuracy, only counts when you return to equal or lose ≥20% ep. Small slips while still ahead stay inaccuracy/mistake — not blunder.

Special overrides (before bands): Book, Great, Miss (failed capitalize → blunder), Brilliant.

## Opening book

Pass `openingBook: Set<fen>` (or `Map`) into `analyzeGameReview`; lookups use `checkOpeningBookSync`.
