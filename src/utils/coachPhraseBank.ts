import type { AnalyzedMove } from "../types";

type LineBuilder = (san: string, best?: string) => string;

function lines(...builders: LineBuilder[]): LineBuilder[] {
  return builders;
}

export const COACH_BANNED_SUBSTRINGS = [
  "clean and precise",
  "clean and accurate",
  "accurate and well timed",
  "timely and precise",
  "solid technique",
  "exactly what the position demanded",
  "exactly what the position needed",
  "the engine's top choice",
  "holds up under deep analysis",
  "lets some advantage slip",
  "lets advantage slip",
  "engine wanted",
  "engine suggests",
  "worth revisiting",
  "the right move",
  "this move",
  "the move",
  "not bad but",
  "slight imprecision",
  "still playable",
  "well chosen",
  "nothing critical slipped",
] as const;

export function brilliantLines(
  move: AnalyzedMove,
  opts: { late: boolean; winning: boolean }
): LineBuilder[] {
  if (opts.late) {
    return lines(
      (s) => `${s} — gorgeous idea, but the position was already against you. A bit late, perhaps?`,
      (s) => `Love the creativity in ${s}. Shame the eval was already ugly.`,
      (s) => `${s}! The resource you wanted earlier — brilliance with the clock running down.`,
      (s) =>
        move.isSacrifice
          ? `Bold ${s} while you're in trouble — respect the fight, even if it can't save everything.`
          : `${s} — special stuff, but climbing back from here is still a long shot.`,
      (s) => `That's the shot you wish you'd found ten moves ago. ${s} shines; the scoreboard, less so.`,
      (s) => `${s} hits like lightning in a lost sky — admire it, don't expect a miracle.`,
      (s) => `You dug up ${s} in a grave position. Heroic, if heartbreaking.`
    );
  }
  if (opts.winning) {
    return lines(
      (s) => `${s} — icing on the cake while you're already on top.`,
      (s) => `No mercy: ${s} when you're already winning.`,
      (s) => `${s} — textbook conversion; they never got a breath.`,
      (s) => `You didn't need fireworks, but ${s} ends the debate anyway.`
    );
  }
  return lines(
    (s) =>
      move.isSacrifice
        ? `${s} — a bold sacrifice the engine fully backs. Study this one.`
        : `${s} — sharp, creative, and spot-on for the position.`,
    (s) => `${s} — the kind of move that wins fans and games.`,
    (s) => `${s} — deep prep or deep calculation; either way, bravo.`,
    (s) => `I'd frame ${s} on the wall. The engine agrees with you completely.`,
    (s) => `${s} — when the board gets tense, this is how you answer.`,
    (s) => `Rare air. ${s} is as strong as it looks.`
  );
}

export function greatLines(opts: { late: boolean }): LineBuilder[] {
  if (opts.late) {
    return lines(
      (s) => `${s} — a strong practical try, but you were already in the hole.`,
      (s) => `Good fighting chess with ${s}, even if the eval was grim beforehand.`,
      (s) => `${s} — the right idea in the wrong chapter of the game.`
    );
  }
  return lines(
    (s) => `${s} — you found the critical resource here.`,
    (s) => `${s} — this was the moment; you didn't blink.`,
    (s) => `${s} — seizes the initiative when it mattered.`,
    (s) => `${s} — practical and punishing. Exactly the kind of move coaches love.`,
    (s) => `The position asked a hard question; ${s} is the answer.`,
    (s) => `${s} — active, alert, and on time.`,
    (s) => `${s} — that's how you play for a win, not a draw.`
  );
}

export function bestLines(opts: { winning: boolean }): LineBuilder[] {
  if (opts.winning) {
    return lines(
      (s) => `${s} — keeps the conversion on track. No drama needed.`,
      (s) => `${s} — professional technique while you're already better.`,
      (s) => `${s} — you simplify without giving anything back.`,
      (s) => `${s} — the kind of move a strong player plays on autopilot when ahead.`
    );
  }
  return lines(
    (s) => `${s} — top of the engine list. Hard to argue with.`,
    (s) => `${s} — no leaks; you met the position's main demand.`,
    (s) => `${s} — principled and punishing if they slip.`,
    (s) => `${s} — the computer's first choice, and yours matched it.`,
    (s) => `${s} — you found the needle in a haystack of options.`,
    (s) => `${s} — textbook: improves your worst piece or stops their plan.`,
    (s) => `${s} — quiet-looking, but the eval loves it.`,
    (s) => `${s} — that's the main line for a reason.`,
    (s) => `${s} — no flash, just the right reply.`,
    (s) => `${s} — you didn't get creative when simplicity was king.`
  );
}

export function excellentLines(san: string, best?: string): LineBuilder[] {
  return lines(
    (s) =>
      best && best !== san
        ? `${s} — very strong; ${best} was only a hair more exact.`
        : `${s} — on the money. The eval barely twitches.`,
    (s) => `${s} — small margin for error, but you're on the right track.`,
    (s) => `${s} — keeps your structure and your clock.`,
    (s) => `${s} — nearly perfect; the gap to best is tiny.`,
    (s) => `${s} — you'd be happy showing this in a lesson.`,
    (s) => `${s} — no nonsense, no weakness.`,
    (s) => `${s} — the kind of move that holds a slight edge together.`
  );
}

export function goodLines(san: string, best?: string): LineBuilder[] {
  return lines(
    (s) =>
      best && best !== san
        ? `${s} — playable, though ${best} was more ambitious.`
        : `${s} — keeps the game balanced.`,
    (s) => `${s} — safe and sensible.`,
    (s) => `${s} — not the engine's first pick, but nothing cracks.`,
    (s) => `${s} — a human move in a tricky position.`,
    (s) => `${s} — you avoided the trap and stayed in the fight.`
  );
}

export function inaccuracyLines(
  san: string,
  best: string | undefined,
  lossBit: string,
  lostBefore: boolean
): LineBuilder[] {
  if (lostBefore) {
    return lines(
      (s) => `${s}${lossBit} — small slip, but every half-pawn hurts when you're already down.`,
      (s) => `${s} — not fatal alone, yet the position was already tough.`,
      (s) => `${s}${lossBit} — you can't afford many of these when behind.`
    );
  }
  return lines(
    (s) =>
      best
        ? `${s}${lossBit} — ${best} would have kept more tension.`
        : `${s}${lossBit} — a small loosening; scan their replies.`,
    (s) => `${s} — tiny imprecision. Fixable with one more minute on the clock.`,
    (s) => `${s}${lossBit} — the edge softens, but you're still in it.`,
    (s) => `${s} — not a disaster, just a little air for them.`,
    (s) => `${s}${lossBit} — ask what they want after this; you gave them a hint.`
  );
}

export function mistakeLines(
  san: string,
  best: string | undefined,
  lossBit: string,
  lostBefore: boolean
): LineBuilder[] {
  if (lostBefore) {
    return lines(
      (s) => `${s}${lossBit} — already in trouble and this makes it worse.`,
      (s) => `When you're losing, every move must create problems. ${s} doesn't.`,
      (s) => `${s} — the position was bad; this just accelerates things.`,
      (s) => `${s}${lossBit} — survival mode needed something sharper.`
    );
  }
  return lines(
    (s) =>
      best
        ? `${s}${lossBit} — ${best} was the way to stay in the game.`
        : `${s}${lossBit} — the evaluation shifts here.`,
    (s) =>
      best
        ? `Hmm. ${s} when ${best} keeps the pressure on.`
        : `${s} — not what the position was asking for.`,
    (s) => `${s}${lossBit} — the initiative slips away.`,
    (s) => `${s} — I felt the eval drop as soon as I saw this.`,
    (s) => `${s}${lossBit} — one move, and the picture changes.`
  );
}

export function blunderLines(
  san: string,
  best: string | undefined,
  lossBit: string,
  lostBefore: boolean,
  wonBefore: boolean
): LineBuilder[] {
  if (lostBefore) {
    return lines(
      (s) => `${s}${lossBit} — the game was already grim; this seals it.`,
      (s) => `After ${s}, there's little left to play for.`,
      (s) => `${s}${lossBit} — no sugarcoating: you were lost and this doesn't help.`,
      (s) => `${s} — when you're buried, ${s} is a shovel, not a ladder.`
    );
  }
  if (wonBefore) {
    return lines(
      (s) => `${s}${lossBit} — ouch. You were winning and let them back in.`,
      (s) => `That hurts — ${s} throws away a comfortable advantage.`,
      (s) => `${s}${lossBit} — from dominating to doubting in one click.`
    );
  }
  return lines(
    (s) =>
      best
        ? `${s}${lossBit} — ${best} avoids the tactical leak.`
        : `${s}${lossBit} — a turning point in the game.`,
    (s) => `${s} — compare it with the suggested line; the swing is real.`,
    (s) => `${s}${lossBit} — the kind of move you'll remember for the wrong reason.`,
    (s) => `${s} — one slip and the whole story changes.`,
    (s) => `${s}${lossBit} — pause here; this is worth a post-mortem.`
  );
}

export function renderLine(builder: LineBuilder, san: string, best?: string): string {
  return builder(san, best);
}
