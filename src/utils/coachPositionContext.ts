import type { AnalyzedMove } from "../types";

export type PositionOutlook =
  | "winning_mate"
  | "crushing"
  | "comfortable"
  | "slight_edge"
  | "level"
  | "slight_down"
  | "trouble"
  | "desperate"
  | "losing_mate";

export function playerCp(move: AnalyzedMove, when: "before" | "after"): number {
  const e = when === "before" ? move.evalBefore : move.evalAfter;
  if (!e) return 0;
  if (e.mate !== undefined) {
    const whiteWinning = e.mate > 0;
    const playerWinning = move.color === "w" ? whiteWinning : !whiteWinning;
    const sign = playerWinning ? 1 : -1;
    return sign * (9000 - Math.min(Math.abs(e.mate), 20) * 400);
  }
  const cp = e.cp ?? 0;
  return move.color === "w" ? cp : -cp;
}

export function getPositionOutlook(
  move: AnalyzedMove,
  when: "before" | "after" = "after"
): PositionOutlook {
  const e = when === "before" ? move.evalBefore : move.evalAfter;
  if (!e) return "level";
  if (e.mate !== undefined) {
    const whiteWinning = e.mate > 0;
    const playerWinning = move.color === "w" ? whiteWinning : !whiteWinning;
    return playerWinning ? "winning_mate" : "losing_mate";
  }
  const cp = playerCp(move, when);
  if (cp >= 400) return "crushing";
  if (cp >= 200) return "comfortable";
  if (cp >= 50) return "slight_edge";
  if (cp >= -50) return "level";
  if (cp >= -200) return "slight_down";
  if (cp >= -400) return "trouble";
  return "desperate";
}

export function pickSeeded<T>(seed: number, arr: T[]): T {
  if (!arr.length) throw new Error("pickSeeded: empty array");
  return arr[Math.abs(seed) % arr.length];
}

export function commentarySeed(move: AnalyzedMove, moveIdx: number): number {
  const c = move.classification ?? "";
  return (
    moveIdx * 31 +
    move.san.length * 7 +
    c.length * 17 +
    Math.round(Math.abs(move.deltaE) * 100)
  );
}

function isAlreadyLost(outlook: PositionOutlook): boolean {
  return outlook === "trouble" || outlook === "desperate" || outlook === "losing_mate";
}

function isAlreadyWinning(outlook: PositionOutlook): boolean {
  return (
    outlook === "crushing" ||
    outlook === "comfortable" ||
    outlook === "winning_mate"
  );
}

function stillLosingAfter(outlook: PositionOutlook): boolean {
  return (
    outlook === "slight_down" ||
    outlook === "trouble" ||
    outlook === "desperate" ||
    outlook === "losing_mate"
  );
}

export function describePositionForCoach(move: AnalyzedMove): string {
  const before = getPositionOutlook(move, "before");
  const after = getPositionOutlook(move, "after");
  const cpBefore = (playerCp(move, "before") / 100).toFixed(1);
  const cpAfter = (playerCp(move, "after") / 100).toFixed(1);
  const lines: string[] = [
    `Eval for the student before → after: ${cpBefore} → ${cpAfter} (positive = student better).`,
    `Before the move: ${before.replace(/_/g, " ")}. After: ${after.replace(/_/g, " ")}.`,
  ];

  if (move.classification === "brilliant" && stillLosingAfter(after)) {
    lines.push(
      "Tone: admire the idea, but do not pretend the game is fine — e.g. brilliance that may be too late."
    );
  } else if (move.classification === "blunder" && isAlreadyLost(before)) {
    lines.push(
      "Tone: matter-of-fact; the game was already bad — no false hope or melodrama."
    );
  } else if (
    (move.classification === "best" || move.classification === "excellent") &&
    isAlreadyWinning(before)
  ) {
    lines.push("Tone: calm satisfaction — converting a good position, not over-celebrating.");
  } else if (move.classification === "mistake" && isAlreadyLost(before)) {
    lines.push(
      "Tone: the position was already difficult; this move makes recovery harder — stay honest."
    );
  }

  return lines.join("\n");
}

/** Position-aware fallback when Gemini is off or fails */
export function getPositionAwareMoveComment(
  move: AnalyzedMove,
  moveIdx = 0,
  openingHint?: string
): string | null {
  const c = move.classification;
  if (!c) return null;

  const seed = commentarySeed(move, moveIdx);
  const { san, bestMoveSan: best } = move;
  const loss = Math.abs(move.deltaE);
  const lossBit = loss >= 0.15 ? ` (~${loss.toFixed(1)} pawns)` : "";
  const before = getPositionOutlook(move, "before");
  const after = getPositionOutlook(move, "after");
  const lostBefore = isAlreadyLost(before);
  const wonBefore = isAlreadyWinning(before);
  const losingAfter = stillLosingAfter(after);

  switch (c) {
    case "brilliant":
      if (losingAfter && (lostBefore || before === "slight_down")) {
        return pickSeeded(seed, [
          `${san} — gorgeous idea, but the position was already against you. A bit late, perhaps?`,
          `Love the creativity in ${san}. Shame the eval was already ugly — brilliance with the clock running down.`,
          `${san}! Exactly the kind of resource you'd want earlier. Still losing, but that's chess.`,
          move.isSacrifice
            ? `Bold ${san} when you're already in trouble — respect the fight, even if it can't save everything.`
            : `${san} — the engine agrees this is special; climbing back from here is still a long shot.`,
          `That's the move you wish you'd found ten moves ago. ${san} is brilliant — the scoreboard, less so.`,
        ]);
      }
      if (wonBefore) {
        return pickSeeded(seed, [
          `${san} — icing on the cake. You're already winning and you still found the best.`,
          `No mercy — ${san} finishes the job when you're already on top.`,
          `${san} — textbook conversion. You didn't give them a chance.`,
        ]);
      }
      return pickSeeded(seed, [
        move.isSacrifice
          ? `${san} — a bold sacrifice the engine fully backs. Worth studying.`
          : `${san} — sharp, creative, and exactly what the position needed.`,
        `${san} — the kind of move that wins fans and games.`,
        `Standout play. ${san} holds up under deep analysis.`,
      ]);

    case "great":
      if (losingAfter && lostBefore) {
        return pickSeeded(seed, [
          `${san} — a strong practical try, but you were already in the hole.`,
          `Good fighting chess with ${san}, even if the eval was grim before you played it.`,
        ]);
      }
      return pickSeeded(seed, [
        `${san} — you found the critical resource here.`,
        `${san} — timely and precise. This was the moment in the game.`,
        `${san} — exactly what the position demanded.`,
      ]);

    case "best":
      if (wonBefore) {
        return pickSeeded(seed, [
          `${san} — keeps the conversion on track. No drama needed.`,
          `${san} — accurate technique while you're already better.`,
        ]);
      }
      return pickSeeded(seed, [
        `${san} — clean and precise.`,
        `${san} — the engine's top choice. Hard to improve on that.`,
      ]);

    case "excellent":
      return pickSeeded(seed, [
        best && best !== san
          ? `${san} — very strong; ${best} was only a touch more exact.`
          : `${san} — accurate and well timed.`,
        `${san} — solid technique without unnecessary risk.`,
      ]);

    case "good":
      return pickSeeded(seed, [
        best && best !== san
          ? `${san} — playable, though ${best} was a bit more demanding.`
          : `${san} — keeps the game balanced.`,
        `${san} — reasonable; nothing critical slipped yet.`,
      ]);

    case "book":
      return openingHint
        ? pickSeeded(seed, [`${san} — ${openingHint}`, `${san} — still in known ${openingHint} territory.`])
        : pickSeeded(seed, [
            `${san} — still in known theory.`,
            `${san} — a standard book move here.`,
          ]);

    case "inaccuracy":
      if (lostBefore) {
        return pickSeeded(seed, [
          `${san}${lossBit} — small slip, but every half-pawn hurts when you're already down.`,
          `${san} — not fatal on its own, yet the position was already tough.`,
        ]);
      }
      return pickSeeded(seed, [
        best
          ? `${san}${lossBit} — ${best} would have kept more pressure.`
          : `${san}${lossBit} — a small loosening; check what your opponent can do next.`,
        `${san} — tiny imprecision. Easy to fix with a bit more calculation.`,
      ]);

    case "mistake":
      if (lostBefore) {
        return pickSeeded(seed, [
          `${san}${lossBit} — already in trouble and this makes it worse.`,
          `When you're losing, every move needs to create problems. ${san} doesn't.`,
          `${san} — the position was bad; this just accelerates things.`,
        ]);
      }
      return pickSeeded(seed, [
        best
          ? `${san}${lossBit} — ${best} was the way to stay in the game.`
          : `${san}${lossBit} — the evaluation shifts here.`,
        best
          ? `Hmm. ${san} when ${best} keeps the pressure on.`
          : `${san} — not what the position was asking for.`,
      ]);

    case "blunder":
      if (lostBefore) {
        return pickSeeded(seed, [
          `${san}${lossBit} — the game was already grim; this seals it.`,
          `After ${san}, there's little left to play for — you were already in a hole.`,
          `${san}${lossBit} — no need to sugarcoat it. The position was lost and this doesn't help.`,
        ]);
      }
      if (wonBefore) {
        return pickSeeded(seed, [
          `${san}${lossBit} — ouch. You were winning and let them back in.`,
          `That hurts — ${san} throws away a comfortable advantage.`,
        ]);
      }
      return pickSeeded(seed, [
        best
          ? `${san}${lossBit} — ${best} avoids the tactical leak.`
          : `${san}${lossBit} — a turning point in the game.`,
        `${san} — compare it with the suggested line; the eval swing is real.`,
      ]);

    default:
      return null;
  }
}
