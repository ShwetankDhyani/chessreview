# Scoring Spec v2.0 (Consensus, Chess.com-parity oriented)

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

Overall and phase accuracy are computed from classification counts:

- `classification -> score` mapping:
  - brilliant: 100
  - great: 99
  - best: 100
  - excellent: 96
  - good: 91
  - book: 100
  - inaccuracy: 79
  - mistake: 63
  - blunder: 38
- weighted mean across counted classes.
- display calibration:
  - low scores slightly compressed,
  - high scores kept high (with small headroom lift only near perfect games).

No hidden exclusions are allowed for labeled moves.

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
