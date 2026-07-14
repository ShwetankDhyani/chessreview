import type { ReactNode } from "react";
import type { MoveClassification } from "../types";
import { CLASSIFICATION_META } from "../utils/classificationMeta";

type IconSize = "xs" | "sm" | "md" | "lg";

const SIZE_PX: Record<IconSize, number> = { xs: 12, sm: 14, md: 16, lg: 22 };

interface ClassificationIconProps {
  type: NonNullable<MoveClassification>;
  size?: IconSize;
  className?: string;
}

/** Chess.com Game Review badges: filled circle + white symbol (see chess.com post-game review). */
export function ClassificationIcon({
  type,
  size = "sm",
  className = "",
}: ClassificationIconProps) {
  const px = SIZE_PX[size];
  const color = CLASSIFICATION_META[type].color;

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <IconSvg type={type} color={color} size={px} />
    </span>
  );
}

function CircleBadge({
  color,
  size,
  children,
}: {
  color: string;
  size: number;
  children: ReactNode;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} />
      {children}
    </svg>
  );
}

function BangText({
  text,
  y = 15.8,
  fontSize,
  fill = "#fff",
}: {
  text: string;
  y?: number;
  fontSize: number;
  fill?: string;
}) {
  return (
    <text
      x="12"
      y={y}
      textAnchor="middle"
      fill={fill}
      fontSize={fontSize}
      fontWeight="800"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      {text}
    </text>
  );
}

function IconSvg({
  type,
  color,
  size,
}: {
  type: NonNullable<MoveClassification>;
  color: string;
  size: number;
}) {
  const bangDbl = size < 15 ? 7 : size < 18 ? 8 : 9;
  const bangSingle = size < 15 ? 9 : size < 18 ? 10 : 11;
  const bangQ = size < 15 ? 7.5 : 8.5;

  switch (type) {
    case "brilliant":
      return (
        <CircleBadge color={color} size={size}>
          <BangText text="!!" fontSize={bangDbl} />
        </CircleBadge>
      );

    case "great":
      return (
        <CircleBadge color={color} size={size}>
          <BangText text="!" fontSize={bangSingle} y={16.2} />
        </CircleBadge>
      );

    case "best":
      return (
        <CircleBadge color={color} size={size}>
          <path
            fill="#fff"
            d="M12 5.2l1.55 3.65 3.95.35-3 2.55.9 3.85L12 13.4l-3.4 2.2.9-3.85-3-2.55 3.95-.35L12 5.2z"
          />
        </CircleBadge>
      );

    case "excellent":
      return (
        <CircleBadge color={color} size={size}>
          <path
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            d="M7.8 12.4l2.6 2.6 5.8-6"
          />
        </CircleBadge>
      );

    case "good":
      return (
        <CircleBadge color={color} size={size}>
          <path
            fill="#fff"
            d="M8.2 10.2c0-2.2 1.6-3.4 3.2-3.4 1.1 0 2 .6 2.4 1.5l1.6-.5c-.3-1.8-1.8-3-3.8-3-2.5 0-4.6 1.8-4.6 5.2 0 3.8 3.2 4.5 3.2 6.8v.8h2.1v-.9c0-2.5-2.8-3.1-2.8-5.9zm5.6 6.3H16v-2.1h-2.2v2.1z"
          />
        </CircleBadge>
      );

    case "book":
      return (
        <CircleBadge color={color} size={size}>
          <path
            fill="#fff"
            d="M8 7.5h3.2c.9 0 1.5.6 1.5 1.4V16H9.2c-.7 0-1.2-.5-1.2-1.2V7.5zm5.3 0H16.5c.7 0 1.2.5 1.2 1.2V16h-3.7V8.9c0-.8-.6-1.4-1.5-1.4z"
          />
          <path fill={color} d="M12.5 7.5V16" opacity="0.5" />
        </CircleBadge>
      );

    case "inaccuracy":
      return (
        <CircleBadge color={color} size={size}>
          <BangText text="!?" fontSize={bangQ} fill="#fff" y={15.6} />
        </CircleBadge>
      );

    case "mistake":
      return (
        <CircleBadge color={color} size={size}>
          <BangText text="?" fontSize={bangSingle} y={16.5} />
        </CircleBadge>
      );

    case "miss":
      return (
        <CircleBadge color={color} size={size}>
          <path
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
            d="M8 8l8 8M16 8l-8 8"
          />
        </CircleBadge>
      );

    case "blunder":
      return (
        <CircleBadge color={color} size={size}>
          <BangText text="??" fontSize={bangQ} y={15.6} />
        </CircleBadge>
      );

    default:
      return null;
  }
}
