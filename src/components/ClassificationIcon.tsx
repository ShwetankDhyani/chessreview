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

/** Chess.com-style badges: filled circle + path glyphs (no emoji). */
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
      title={CLASSIFICATION_META[type].label}
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

function IconSvg({
  type,
  color,
  size,
}: {
  type: NonNullable<MoveClassification>;
  color: string;
  size: number;
}) {
  switch (type) {
    case "brilliant":
      return (
        <CircleBadge color={color} size={size}>
          <path
            fill="#fff"
            d="M7.2 8.2h2.1l1.2 3.4 1.2-3.4h2.1l-2.05 5.1h-2.5L7.2 8.2zm5.6 0h2.1l1.2 3.4 1.2-3.4H19l-2.05 5.1h-2.5L12.8 8.2zM10.6 15.2h2.8V17h-2.8v-1.8z"
          />
        </CircleBadge>
      );

    case "great":
      return (
        <CircleBadge color={color} size={size}>
          <path
            fill="#fff"
            d="M11.1 6.2h1.8v7.4h-1.8V6.2zm0 9.2h1.8V17h-1.8v-1.6z"
          />
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
      // Checkmark — previously a "?" path that looked like Mistake.
      return (
        <CircleBadge color={color} size={size}>
          <path
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            d="M7.2 12.2l3.1 3.1 6.5-6.6"
          />
        </CircleBadge>
      );

    case "book":
      return (
        <CircleBadge color={color} size={size}>
          <g fill="#fff">
            <path d="M5.8 6.4c1.6-.65 3.3-.85 5-.85v10.8c-1.6.15-3.3.45-5 1.05V6.4z" />
            <path d="M18.2 6.4c-1.6-.65-3.3-.85-5-.85v10.8c1.6.15 3.3.45 5 1.05V6.4z" />
            <rect x="11.1" y="5.55" width="1.8" height="10.8" rx="0.3" />
          </g>
        </CircleBadge>
      );

    case "inaccuracy":
      return (
        <CircleBadge color={color} size={size}>
          <g fill="#fff">
            <path d="M12 5.2L19.2 17.6H4.8L12 5.2z" />
            <rect x="11.1" y="9.2" width="1.8" height="4.4" rx="0.7" fill="#1a1a1a" />
            <circle cx="12" cy="15.6" r="1.05" fill="#1a1a1a" />
          </g>
        </CircleBadge>
      );

    case "mistake":
      return (
        <CircleBadge color={color} size={size}>
          <g fill="#fff">
            <path d="M10.6 6.4c0-1.2.95-2.05 2.2-2.05 1.3 0 2.2.85 2.2 2.05 0 .95-.45 1.5-1.25 2.1l-.7.5c-.4.3-.6.6-.6 1.15v.35h-1.7v-.5c0-1 .4-1.55 1.15-2.15l.8-.55c.5-.35.75-.7.75-1.15 0-.5-.35-.85-.9-.85s-.95.35-.95.95h-1.7z" />
            <circle cx="12.8" cy="16.4" r="1.35" />
          </g>
        </CircleBadge>
      );

    case "miss":
      return (
        <CircleBadge color={color} size={size}>
          <g
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          >
            <circle cx="12" cy="12" r="5.2" />
            <path d="M8.4 15.6L15.6 8.4" />
          </g>
        </CircleBadge>
      );

    case "blunder":
      return (
        <CircleBadge color={color} size={size}>
          <g
            stroke="#fff"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M7.2 7.2L16.8 16.8" />
            <path d="M16.8 7.2L7.2 16.8" />
          </g>
        </CircleBadge>
      );

    default:
      return null;
  }
}
