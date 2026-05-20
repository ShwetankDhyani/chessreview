import { Chess } from "chess.js";

export type GameEndKind =
  | "checkmate"
  | "resignation"
  | "timeout"
  | "abandoned"
  | "draw"
  | "repetition"
  | "stalemate"
  | "insufficient"
  | "other";

export interface GameEndInfo {
  kind: GameEndKind;
  icon: string;
  headline: string;
  detail: string;
  winner: "w" | "b" | null;
}

function winnerFromResult(
  result: "1-0" | "0-1" | "1/2-1/2" | "*" | null
): "w" | "b" | null {
  if (result === "1-0") return "w";
  if (result === "0-1") return "b";
  return null;
}

function parseTermination(
  termination: string | null,
  white: string,
  black: string
): { kind: GameEndKind; detail: string } | null {
  if (!termination) return null;
  const t = termination.toLowerCase();

  if (t.includes("checkmate")) {
    const who = t.includes(white.toLowerCase())
      ? white
      : t.includes(black.toLowerCase())
        ? black
        : null;
    return {
      kind: "checkmate",
      detail: who ? `${who} won by checkmate` : "Checkmate",
    };
  }
  if (t.includes("resign")) {
    const who = t.includes(white.toLowerCase())
      ? white
      : t.includes(black.toLowerCase())
        ? black
        : null;
    return {
      kind: "resignation",
      detail: who ? `${who} resigned` : "Resignation",
    };
  }
  if (t.includes("timeout") || t.includes("time forfeit") || t.includes("time out")) {
    const who = t.includes(white.toLowerCase())
      ? white
      : t.includes(black.toLowerCase())
        ? black
        : null;
    return {
      kind: "timeout",
      detail: who ? `${who} won on time` : "Win on time",
    };
  }
  if (t.includes("abandon")) {
    return { kind: "abandoned", detail: "Game abandoned" };
  }
  if (t.includes("stalemate")) {
    return { kind: "stalemate", detail: "Draw by stalemate" };
  }
  if (t.includes("repetition")) {
    return { kind: "repetition", detail: "Draw by repetition" };
  }
  if (t.includes("insufficient")) {
    return { kind: "insufficient", detail: "Draw — insufficient material" };
  }
  if (t.includes("agreement") || t.includes("draw")) {
    return { kind: "draw", detail: "Draw by agreement" };
  }
  if (t.includes("won")) {
    return { kind: "other", detail: termination };
  }
  return { kind: "other", detail: termination };
}

function detectPositionEnd(fen: string): GameEndKind | null {
  try {
    const chess = new Chess(fen);
    if (chess.isCheckmate()) return "checkmate";
    if (chess.isStalemate()) return "stalemate";
    if (chess.isDraw()) return "draw";
  } catch {
    /* ignore */
  }
  return null;
}

const KIND_META: Record<GameEndKind, { icon: string; headline: string }> = {
  checkmate: { icon: "♚", headline: "Checkmate" },
  resignation: { icon: "🏳", headline: "Resignation" },
  timeout: { icon: "⏱", headline: "Time out" },
  abandoned: { icon: "🚪", headline: "Game abandoned" },
  draw: { icon: "🤝", headline: "Draw" },
  repetition: { icon: "🔁", headline: "Draw" },
  stalemate: { icon: "🤝", headline: "Stalemate" },
  insufficient: { icon: "🤝", headline: "Draw" },
  other: { icon: "🏁", headline: "Game over" },
};

export function getGameEndInfo(
  result: "1-0" | "0-1" | "1/2-1/2" | "*" | null,
  termination: string | null,
  white: string,
  black: string,
  finalFen?: string
): GameEndInfo | null {
  if (!result || result === "*") return null;

  const winner = winnerFromResult(result);
  let kind: GameEndKind;
  let detail: string;

  const parsed = parseTermination(termination, white, black);
  if (parsed) {
    kind = parsed.kind;
    detail = parsed.detail;
  } else if (result === "1/2-1/2") {
    kind = "draw";
    detail = termination ?? "Draw";
  } else {
    const posKind = finalFen ? detectPositionEnd(finalFen) : null;
    if (posKind === "checkmate") {
      kind = "checkmate";
      detail =
        winner === "w"
          ? `${white} wins by checkmate`
          : `${black} wins by checkmate`;
    } else {
      kind = "other";
      detail =
        termination ??
        (winner === "w"
          ? `${white} wins`
          : winner === "b"
            ? `${black} wins`
            : "Game ended");
      if (!termination && winner) {
        kind = "resignation";
        detail = `${winner === "w" ? black : white} left or resigned`;
      }
    }
  }

  if (kind !== "checkmate" && finalFen) {
    const posKind = detectPositionEnd(finalFen);
    if (posKind === "checkmate" && result !== "1/2-1/2") {
      kind = "checkmate";
      detail =
        winner === "w"
          ? `${white} wins by checkmate`
          : winner === "b"
            ? `${black} wins by checkmate`
            : "Checkmate";
    }
  }

  const meta = KIND_META[kind];
  return {
    kind,
    icon: meta.icon,
    headline: meta.headline,
    detail,
    winner: result === "1/2-1/2" ? null : winner,
  };
}
