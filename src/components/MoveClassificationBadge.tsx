import type { MoveClassification } from "../types";
import { CLASSIFICATION_META } from "../utils/classificationMeta";
import { getSquareRect } from "../utils/boardSquareCoords";

interface MoveClassificationBadgeProps {
  square: string;
  classification: NonNullable<MoveClassification>;
  boardWidth: number;
  boardOrientation: "white" | "black";
}

/**
 * Classification glyph on the destination square.
 * Pure SVG paths only — no emoji / system fonts (those break on many mobiles).
 */
export function MoveClassificationBadge({
  square,
  classification,
  boardWidth,
  boardOrientation,
}: MoveClassificationBadgeProps) {
  const rect = getSquareRect(square, boardOrientation, boardWidth);
  if (!rect) return null;

  const badge = Math.max(18, Math.min(32, Math.round(rect.size * 0.46)));
  const inset = Math.max(1, Math.round(rect.size * 0.02));
  const color = CLASSIFICATION_META[classification].color;

  return (
    <div
      className="absolute pointer-events-none z-[45] drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]"
      style={{
        left: rect.left + rect.size - badge - inset,
        top: rect.top + inset,
        width: badge,
        height: badge,
      }}
      title={CLASSIFICATION_META[classification].label}
      aria-hidden
    >
      <BoardClassSvg type={classification} color={color} size={badge} />
    </div>
  );
}

function BoardClassSvg({
  type,
  color,
  size,
}: {
  type: NonNullable<MoveClassification>;
  color: string;
  size: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={color} />
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="1"
      />
      <Glyph type={type} />
    </svg>
  );
}

function Glyph({ type }: { type: NonNullable<MoveClassification> }) {
  switch (type) {
    case "best":
    case "brilliant":
      return (
        <path
          fill="#fff"
          d="M12 5.1l1.7 4.05 4.35.38-3.3 2.82.98 4.25L12 14.4l-3.73 2.2.98-4.25-3.3-2.82 4.35-.38L12 5.1z"
        />
      );

    case "excellent":
    case "good":
      return (
        <path
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          d="M7.2 12.2l3.1 3.1 6.5-6.6"
        />
      );

    case "great":
      return (
        <path
          fill="#fff"
          d="M11.1 6.2h1.8v7.4h-1.8V6.2zm0 9.2h1.8V17h-1.8v-1.6z"
        />
      );

    case "book":
      return (
        <g fill="#fff">
          <path d="M5.8 6.4c1.6-.65 3.3-.85 5-.85v10.8c-1.6.15-3.3.45-5 1.05V6.4z" />
          <path d="M18.2 6.4c-1.6-.65-3.3-.85-5-.85v10.8c1.6.15 3.3.45 5 1.05V6.4z" />
          <rect x="11.1" y="5.55" width="1.8" height="10.8" rx="0.3" />
        </g>
      );

    case "inaccuracy":
      return (
        <g fill="#fff">
          <rect x="7.2" y="6.2" width="2.2" height="6.8" rx="0.9" />
          <circle cx="8.3" cy="16.2" r="1.35" />
          <path d="M12.6 8c0-1.5 1.05-2.45 2.5-2.45S17.55 6.55 17.55 8c0 .95-.4 1.55-1.25 2.2l-.7.55c-.5.4-.75.75-.75 1.35v.4h-1.9v-.55c0-1.1.4-1.8 1.25-2.45l.8-.6c.5-.4.75-.75.75-1.25 0-.55-.4-.95-1-.95-.6 0-1 .4-1 1.05h-1.85z" />
          <circle cx="15.1" cy="16.2" r="1.35" />
        </g>
      );

    case "mistake":
      return (
        <g fill="#fff">
          <path d="M9.2 7.85c0-1.85 1.4-3.15 3.25-3.15 1.9 0 3.2 1.25 3.2 3.05 0 1.4-.7 2.2-1.9 3l-.9.6c-.55.35-.8.75-.8 1.4v.45h-2.2v-.65c0-1.3.5-2 1.5-2.7l1-.7c.75-.5 1.1-1 1.1-1.7 0-.75-.55-1.25-1.4-1.25-.9 0-1.45.55-1.45 1.4H9.2z" />
          <circle cx="12.2" cy="16.55" r="1.45" />
        </g>
      );

    case "blunder":
      return (
        <g fill="#fff">
          <path d="M5.15 7.9c0-1.55 1.15-2.65 2.7-2.65 1.55 0 2.65 1.05 2.65 2.55 0 1.15-.55 1.85-1.55 2.5l-.75.5c-.45.3-.65.6-.65 1.15v.4H6v-.55c0-1.1.4-1.7 1.25-2.25l.85-.55c.6-.4.9-.85.9-1.45 0-.6-.45-1.05-1.15-1.05-.85 0-1.25.5-1.25 1.2H5.15z" />
          <circle cx="7.7" cy="16.55" r="1.25" />
          <path d="M13.15 7.9c0-1.55 1.15-2.65 2.7-2.65 1.55 0 2.65 1.05 2.65 2.55 0 1.15-.55 1.85-1.55 2.5l-.75.5c-.45.3-.65.6-.65 1.15v.4h-1.55v-.55c0-1.1.4-1.7 1.25-2.25l.85-.55c.6-.4.9-.85.9-1.45 0-.6-.45-1.05-1.15-1.05-.85 0-1.25.5-1.25 1.2h-1.7z" />
          <circle cx="15.7" cy="16.55" r="1.25" />
        </g>
      );

    case "miss":
      return (
        <g
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        >
          <circle cx="12" cy="12" r="5.2" />
          <path d="M8.4 15.6L15.6 8.4" />
        </g>
      );

    default:
      return <circle cx="12" cy="12" r="3.5" fill="#fff" />;
  }
}
