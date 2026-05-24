# Scoring Spec v2.2 (Consensus, Chess.com CAPS2-oriented)

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

## 4) Accuracy Aggregation (CAPS2-style)

Per classified ply:

1. `epScore` = `moveAccuracyFromEpLoss(epLoss)` (CAPS win-% curve).
2. `gradeCap` = classification grade (`best`/`book` = **97**, not 100 — CAPS2 “test” scoring).
3. `plyScore` = `min(epScore, gradeCap)` so labeled mistakes cannot score like perfect moves.
4. Game raw = average of **arithmetic** and **harmonic** mean of `plyScore` (harmonic punishes errors).
5. `caps2GameCalibration(raw)` compresses raw 92–100 into ~92–97 so many “best” moves do not print as 99%+.
6. Display: round to one decimal, cap at 99.9.

Typical single-game ranges (aligned with Chess.com CAPS2: most scores **50–95**):

| Quality | Approx. accuracy |
|--------|-------------------|
| Very clean | 90–95 |
| Solid with a few inaccuracies | 82–90 |
| Messy / multiple mistakes | 65–82 |

Move-breakdown **counts** are unchanged; grades are separate from icons.

Every classified ply in the breakdown is in the accuracy denominator.

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
