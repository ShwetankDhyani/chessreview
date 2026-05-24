# Move classification system

## Pipeline

1. **Engine eval** every FEN at user depth (default 16) + FEN after engine best move.
2. **Strict eval map** — only positions with `depth >= 10` and valid cp/mate are classified.
3. **Expected-points loss** (`epLoss`) — win-% delta between best move and played move.
4. **Centipawn metrics** — `cpLossVsBest`, `cpSwing` (mover POV).
5. **Tactical flags** — SEE-based exchange balance, recapture detection, voluntary sacrifice.
6. **Label** — `classifyMove()` in `src/utils/moveClassification.ts`.

Moves without reliable eval get `classification: null` (never guessed).

## Labels (epLoss bands)

| Label | epLoss (expected points) |
|-------|--------------------------|
| Best | ≤ 0.4% and engine-top quality |
| Excellent | ≤ 1.2% |
| Good | ≤ 3% |
| Inaccuracy | ≤ 7% |
| Mistake | ≤ 10% (only if not game-changing) |
| Blunder | > 10% ep **or** game-changing (see below) |

## Blunder (game-changing)

Aligned with Chess.com / Lichess spirit: a blunder is not only “>20% ep” on paper — it is any move that **meaningfully changes the game**:

- `epLoss` > 10%, or
- ≥ **100 cp** worse than the engine best line, or
- ≥ **160 cp** eval drop from before the move to after the played move, or
- ≥ **18%** win-chance swing for the mover, or
- Was clearly winning (≥60% → ≤40%) with a large swing.

Moderate epLoss (7–10%) stays **mistake** only when the swing is not game-changing.

## Engine “top move”

- Exact UCI match counts as top only if `epLoss` is small (≤ excellent band).
- High loss with matching PV move is **not** auto-labeled best (fixes mis-tagged blunders).

## Special labels

- **Book** — ply < 16, low epLoss, near-equal eval, engine-agreeing move.
- **Great** — best move saving a lost game or punishing opponent blunder (strict wp windows).
- **Brilliant** — real sacrifice (SEE ≤ −3), engine top move, balanced position, no mate scores.

## Sacrifice detection (false-positive guards)

- Static Exchange Evaluation on the destination square.
- Not a recapture on the same or `from` square.
- Not an equal/winning capture (captured piece ≥ moving piece).
- Not a forced trade while in check (balance ≥ −3).
- Not an even trade (balance ≥ −1).

## Tests

```bash
npm test
```

See `src/utils/moveClassification.test.ts`.
