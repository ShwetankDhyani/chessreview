# Move classification system

## Pipeline

1. **Engine eval** every FEN at user depth (default 16) + FEN after engine best move.
2. **Strict eval map** — only positions with `depth >= 10` and valid cp/mate are classified.
3. **Expected-points loss** (`epLoss`) — Lichess win% delta between best move and played move.
4. **Tactical flags** — SEE-based exchange balance, recapture detection, voluntary sacrifice.
5. **Label** — `classifyMove()` in `src/utils/moveClassification.ts`.

Moves without reliable eval get `classification: null` (never guessed).

## Labels (epLoss bands)

| Label | epLoss (expected points) |
|-------|--------------------------|
| Best | engine top (≤0.8%) or exact UCI match |
| Excellent | ≤ 2% |
| Good | ≤ 5% |
| Inaccuracy | ≤ 10% |
| Mistake | ≤ 20% |
| Blunder | > 20% |

## Special labels

- **Book** — ply &lt; 16, low epLoss, near-equal eval, engine-agreeing move.
- **Great** — best move saving a lost game or punishing opponent blunder (strict wp windows).
- **Brilliant** — requires **real sacrifice** (SEE balance ≤ −3), engine top move, balanced position, no mate scores.

## Sacrifice detection (false-positive guards)

- Static Exchange Evaluation on the destination square.
- Not a recapture on the same or `from` square.
- Not an equal/winning capture (captured piece ≥ moving piece).
- Not a forced trade while in check (balance ≥ −3).
- Not an even trade (balance ≥ −1).

`isSacrifice` on moves reflects voluntary give-up; **!!** only when `qualifiesForBrilliant` is true.

## Tests

```bash
npm test
```

See `src/utils/moveClassification.test.ts`.
