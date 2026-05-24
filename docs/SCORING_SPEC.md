# Scoring Spec v2.1 (Consensus, Chess.com-parity oriented)

This document defines the canonical review math used by ChessReview.org.

## 1) Core Principles

- One canonical path from PGN to `ReviewResult`.
- If a move appears in the move breakdown, it contributes to overall/phase accuracy.
- Review output is run-scoped and auditable (`runId`, depth policy, coverage).
- Classification and accuracy depend on consensus-evaluated positions only.

## 2) Evaluation Policy

- Requested depth: user-selected depth (`D12/D14/D16/...`).
- Fast pass: evaluates all plies at `fastDepth = clamp(requestedDepth, 10..12)`.
- Deep pass: selectively deepens unstable/high-impact plies at `deepDepth = max(fastDepth + 2, requestedDepth)`.
- A ply eval is marked verified when:
  - depth >= `MIN_CLASSIFY_DEPTH` (10), and
  - disagreement between fast and deep pass is within allowed threshold.

## 3) Move Classification Inputs

Per move, the analyzer builds:

- `epLoss`: expected points lost vs best line from the same position.
- `isTop`: player move matches engine top move or equivalent low-loss top band.
- contextual win% features (`wpBeforePct`, `wpAfterActualPct`).
- tactical context from SEE/sacrifice checks.

Classification bands and heuristics are implemented in `moveClassification.ts`.

## 4) Accuracy Aggregation

**Headline game and phase accuracy** use engine expected-points loss per classified ply:

1. `epLoss` per move (same input as classification).
2. Optional dampening when the mover was already winning (`effectiveEpLossForAccuracy`).
3. `moveAccuracyFromEpLoss` — Lichess/CAPS logistic curve on win-% lost.
4. Book moves score 100 for that ply (opening theory).
5. Game score = average of arithmetic mean and harmonic mean of ply scores (harmonic punishes mistakes).
6. **Display** — round to one decimal, cap at 99.9; **no boost** toward 99.9 for high raw values.

Typical ranges (rapid/online, one game):

| Quality | Approx. accuracy |
|--------|-------------------|
| Clean win, few errors | 92–97 |
| Solid game with a few inaccuracies | 85–92 |
| Messy / many mistakes | 70–85 |

The move-breakdown table still shows classification **counts**; label bucket weights (best=100, inaccuracy=79, …) are not used for the headline %.

No hidden exclusions: every classified ply in the breakdown is in the accuracy denominator.

## 5) Coverage and Trust Signals

`ReviewSummary.coverage` includes:

- total plies
- classified plies
- verified plies
- unverified plies
- unverified reason counts (`missing_eval`, `shallow_depth`, `high_disagreement`)

UI may show warnings whenever unverified coverage is non-zero.

## 6) Invariants

The test suite enforces:

- deterministic repeatability for same game + settings.
- denominator consistency (breakdown and accuracy use same counted set).
- monotonicity (more best/fewer errors cannot reduce score).
- stable behavior on edge cases (mate races, sharp swings, forced lines).
