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

  const meta = CLASSIFICATION_META[classification];
  if (!meta) return null;

  const badge = Math.max(20, Math.min(34, Math.round(rect.size * 0.48)));
  const inset = Math.max(1, Math.round(rect.size * 0.02));

  return (
    <div
      className="absolute pointer-events-none z-[45]"
      style={{
        left: rect.left + rect.size - badge - inset,
        top: rect.top + inset,
        width: badge,
        height: badge,
        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.65))",
      }}
      title={meta.label}
      aria-label={meta.label}
      data-classification={classification}
    >
      <BoardClassSvg type={classification} color={meta.color} size={badge} />
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="11" fill={color} />
      <circle
        cx="12"
        cy="12"
        r="10.25"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
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
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          d="M7 12.2l3.2 3.2 6.8-6.8"
        />
      );

    case "great":
      return (
        <path
          fill="#fff"
          d="M11 6h2v7.5h-2V6zm0 9.2h2V18h-2v-2.8z"
        />
      );

    case "book":
      return (
        <g fill="#fff">
          <path d="M5.5 6.2c1.7-.7 3.5-.9 5.2-.9v11c-1.6.2-3.4.5-5.2 1.2V6.2z" />
          <path d="M18.5 6.2c-1.7-.7-3.5-.9-5.2-.9v11c1.6.2 3.4.5 5.2 1.2V6.2z" />
          <rect x="11" y="5.3" width="2" height="11" rx="0.4" />
        </g>
      );

    case "inaccuracy":
      // Warning triangle + bang — reads clearly on yellow last-move tint.
      return (
        <g fill="#fff">
          <path d="M12 5.2L19.2 17.6H4.8L12 5.2z" opacity="0.95" />
          <rect x="11.1" y="9.2" width="1.8" height="4.4" rx="0.7" fill="#1a1a1a" />
          <circle cx="12" cy="15.6" r="1.05" fill="#1a1a1a" />
        </g>
      );

    case "mistake":
      return (
        <g fill="#fff">
          <path d="M10.6 6.4c0-1.2.95-2.05 2.2-2.05 1.3 0 2.2.85 2.2 2.05 0 .95-.45 1.5-1.25 2.1l-.7.5c-.4.3-.6.6-.6 1.15v.35h-1.7v-.5c0-1 .4-1.55 1.15-2.15l.8-.55c.5-.35.75-.7.75-1.15 0-.5-.35-.85-.9-.85s-.95.35-.95.95h-1.7z" />
          <circle cx="12.8" cy="16.4" r="1.35" />
        </g>
      );

    case "blunder":
      // Bold X — unmistakable vs mistake "?".
      return (
        <g
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M7.2 7.2L16.8 16.8" />
          <path d="M16.8 7.2L7.2 16.8" />
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
