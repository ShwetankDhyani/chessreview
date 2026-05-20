import React from "react";

interface CoachIconProps {
  color?: string;
  size?: number;
}

/** Minimal coach mark — fits ChessReview panel aesthetic */
export const CoachIcon: React.FC<CoachIconProps> = ({
  color = "#6daa6d",
  size = 32,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden
    className="block"
  >
    <circle cx="16" cy="16" r="15" fill="#2c2c2c" stroke={color} strokeWidth="1.5" />
    <path
      d="M10 14c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6"
      stroke={color}
      strokeWidth="1.2"
      fill="none"
      opacity="0.35"
    />
    <path
      d="M11 20h10v2H11z"
      fill={color}
      opacity="0.5"
    />
    <path
      d="M12 11.5c0-2.2 1.8-4 4-4s4 1.8 4 4"
      stroke="#e8e6e3"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="13.5" cy="12" r="0.9" fill="#e8e6e3" />
    <circle cx="18.5" cy="12" r="0.9" fill="#e8e6e3" />
    <path
      d="M13.5 15.5 Q16 17 18.5 15.5"
      stroke="#e8e6e3"
      strokeWidth="1"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M16 7 L17 9.5 L16 9 L15 9.5 Z"
      fill={color}
      opacity="0.85"
    />
  </svg>
);
