import React from "react";

interface AccuracyWheelProps {
  accuracy: number;
  color: "white" | "black";
  username?: string;
}

export const AccuracyWheel: React.FC<AccuracyWheelProps> = ({
  accuracy,
  color,
  username,
}) => {
  const safeAccuracy = (typeof accuracy === "number" && isFinite(accuracy)) ? accuracy : 0;
  const hasValue = typeof accuracy === "number" && isFinite(accuracy) && accuracy > 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeAccuracy / 100) * circumference;
  const strokeColor =
    safeAccuracy >= 90
      ? "#6daa6d"
      : safeAccuracy >= 75
      ? "#96bc6c"
      : safeAccuracy >= 60
      ? "#e6c84a"
      : safeAccuracy >= 40
      ? "#e07b39"
      : "#ca3c3c";

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
      <div className="relative w-[4.5rem] h-[4.5rem] flex-shrink-0">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 88 88"
        >
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="#3a3a3a"
            strokeWidth="8"
          />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-700 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-base font-bold tabular-nums"
            style={{ color: hasValue ? strokeColor : "#666" }}
          >
            {hasValue ? safeAccuracy.toFixed(1) : "--"}
          </span>
          <span className="text-xs text-chess-muted">%</span>
        </div>
      </div>
      <div className="text-center">
        <div
          className="w-3 h-3 rounded-full inline-block mr-1.5"
          style={{
            backgroundColor: color === "white" ? "#e8e6e3" : "#1a1a1a",
            border: color === "black" ? "1px solid #888" : "none",
          }}
        />
        <span className="text-xs font-medium text-chess-text truncate max-w-[7rem]">
          {username ?? (color === "white" ? "White" : "Black")}
        </span>
        <div className="text-[10px] text-chess-muted">Accuracy</div>
      </div>
    </div>
  );
};
