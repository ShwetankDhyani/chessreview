import { getSquareCenter } from "../utils/boardSquareCoords";

interface BoardArrowOverlayProps {
  from: string;
  to: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  /** Best-move hint on the board; continuation line stays a bit stronger. */
  variant?: "hint" | "continuation" | "played";
  color?: string;
}

const ARROW_STYLES = {
  hint: {
    color: "#c8e0a8",
    strokeOpacity: 0.52,
    fillOpacity: 0.58,
    strokeScale: 52,
  },
  continuation: {
    color: "#9bc96a",
    strokeOpacity: 0.78,
    fillOpacity: 0.82,
    strokeScale: 40,
  },
  played: {
    color: "#f7c948",
    strokeOpacity: 0.82,
    fillOpacity: 0.88,
    strokeScale: 42,
  },
} as const;

/** Directional best-move / engine arrow with a drawn head (works on mobile + desktop). */
export function BoardArrowOverlay({
  from,
  to,
  boardWidth,
  boardOrientation,
  variant = "hint",
  color,
}: BoardArrowOverlayProps) {
  const style = ARROW_STYLES[variant];
  const strokeColor = color ?? style.color;
  const fromPt = getSquareCenter(from, boardOrientation, boardWidth);
  const toPt = getSquareCenter(to, boardOrientation, boardWidth);
  const dx = toPt.x - fromPt.x;
  const dy = toPt.y - fromPt.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;

  const sq = boardWidth / 8;
  const ux = dx / len;
  const uy = dy / len;
  const tailInset = sq * 0.2;
  const headLen = sq * 0.42;
  const headWidth = sq * 0.34;
  const strokeW = Math.max(2, boardWidth / style.strokeScale);

  const x1 = fromPt.x + ux * tailInset;
  const y1 = fromPt.y + uy * tailInset;
  const tipX = toPt.x - ux * (sq * 0.12);
  const tipY = toPt.y - uy * (sq * 0.12);
  const baseX = tipX - ux * headLen;
  const baseY = tipY - uy * headLen;
  const perpX = -uy * (headWidth / 2);
  const perpY = ux * (headWidth / 2);
  const headPoints = `${tipX},${tipY} ${baseX + perpX},${baseY + perpY} ${baseX - perpX},${baseY - perpY}`;

  return (
    <svg
      className="absolute left-0 top-0 pointer-events-none z-20"
      width={boardWidth}
      height={boardWidth}
      viewBox={`0 0 ${boardWidth} ${boardWidth}`}
      aria-hidden
    >
      <line
        x1={x1}
        y1={y1}
        x2={baseX}
        y2={baseY}
        stroke={strokeColor}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeOpacity={style.strokeOpacity}
      />
      <polygon
        points={headPoints}
        fill={strokeColor}
        fillOpacity={style.fillOpacity}
      />
    </svg>
  );
}
