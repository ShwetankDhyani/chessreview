/** Consistent time-class icons (same style on every platform / emoji renderer). */

const STYLES = {
  bullet: { stroke: "#d4a72c", label: "Bullet" },
  blitz: { stroke: "#e07b39", label: "Blitz" },
  rapid: { stroke: "#6a9fb5", label: "Rapid" },
  daily: { stroke: "#9b8aa8", label: "Daily" },
  classical: { stroke: "#8b9aa8", label: "Classical" },
} as const;

type TimeClass = keyof typeof STYLES;

function SvgIcon({
  timeClass,
  size,
}: {
  timeClass: TimeClass;
  size: number;
}) {
  const { stroke } = STYLES[timeClass];
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (timeClass === "bullet") {
    return (
      <svg {...common}>
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
      </svg>
    );
  }
  if (timeClass === "blitz") {
    return (
      <svg {...common}>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    );
  }
  if (timeClass === "rapid" || timeClass === "classical") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );
}

export function normalizeTimeClass(tc: string): TimeClass {
  const k = tc.toLowerCase();
  if (k in STYLES) return k as TimeClass;
  return "rapid";
}

export function TimeClassIcon({
  timeClass,
  size = 16,
  className = "",
}: {
  timeClass: string;
  size?: number;
  className?: string;
}) {
  const key = normalizeTimeClass(timeClass);
  return (
    <span className={`inline-flex flex-shrink-0 ${className}`} title={STYLES[key].label}>
      <SvgIcon timeClass={key} size={size} />
    </span>
  );
}

/** Compact inline rating — same icon style, original list proportions */
export function RatingStat({
  type,
  value,
}: {
  type: "bullet" | "blitz" | "rapid";
  value?: number;
}) {
  if (value == null) return null;
  const { stroke, label } = STYLES[type];
  return (
    <span
      title={label}
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums"
      style={{ color: stroke }}
    >
      <SvgIcon timeClass={type} size={11} />
      {value}
    </span>
  );
}
