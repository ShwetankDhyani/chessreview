import { getSquareCenter } from "../utils/boardSquareCoords";

interface BoardArrowOverlayProps {
  from: string;
  to: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  color?: string;
}

/** Directional arrow with a clear head (library arrows clip inside overflow-hidden boards). */
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
  const tailInset = sq * 0.22;
  const headInset = sq * 0.38;
  const x1 = fromPt.x + (dx / len) * tailInset;
  const y1 = fromPt.y + (dy / len) * tailInset;
  const x2 = toPt.x - (dx / len) * headInset;
  const y2 = toPt.y - (dy / len) * headInset;
  const strokeW = Math.max(3, boardWidth / 36);
  const markerId = `cr-arrow-${from}-${to}`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      width={boardWidth}
      height={boardWidth}
      viewBox={`0 0 ${boardWidth} ${boardWidth}`}
      aria-hidden
    >
      <defs>
        <marker
          id={markerId}
          markerUnits="userSpaceOnUse"
          markerWidth={strokeW * 2.2}
          markerHeight={strokeW * 2.2}
          refX={strokeW * 1.85}
          refY={strokeW * 1.1}
          orient="auto"
        >
          <path
            d={`M0,0 L${strokeW * 2.2},${strokeW * 1.1} L0,${strokeW * 2.2} Z`}
            fill={color}
          />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeOpacity={0.88}
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  );
}
