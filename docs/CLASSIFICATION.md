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
| Inaccuracy | ≤ 10% |
| Mistake | ≤ 20% (if eval bar / win-% did not swing hard) |
| Blunder | > 20% ep **or** visible game-changing swing (below) |

## Blunder (visible swing only)

A **blunder** needs a clear eval-bar or win-% change — not just “not the engine’s #1”:

- ≥ **220 cp** drop from before the move to after the played move, or
- ≥ **22%** win-chance swing, or
- ≥ **250 cp** worse than best line alone, or
- Combined: ≥ **160 cp** vs best **and** ≥ **14%** win swing, or
- Threw away a win (≥68% → ≤35%) with ≥ **20%** win swing.

Moderate errors (10–20% ep, ~1 pawn noise) stay **mistake** / **inaccuracy**, not blunder.

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
