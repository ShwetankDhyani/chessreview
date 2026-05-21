import { getSquareCenter } from "../utils/boardSquareCoords";

interface BoardArrowOverlayProps {
  from: string;
  to: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  color?: string;
}

/** Directional best-move / engine arrow with a drawn head (works on mobile + desktop). */
export function BoardArrowOverlay({
  from,
  to,
  boardWidth,
  boardOrientation,
  color = "#81b64c",
}: BoardArrowOverlayProps) {
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
  const strokeW = Math.max(2.5, boardWidth / 40);

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
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="butt"
        strokeOpacity={0.9}
      />
      <polygon points={headPoints} fill={color} fillOpacity={0.95} />
    </svg>
  );
}
