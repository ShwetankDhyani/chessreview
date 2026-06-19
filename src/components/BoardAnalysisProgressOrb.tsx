/** Chamfered plate + labyrinth paths (angular, not circular). */
const PLATE =
  "M 22 7 L 58 7 L 73 22 L 73 58 L 58 73 L 22 73 L 7 58 L 7 22 Z";

/** Full maze grid — always visible, dim. */
const MAZE_GRID = [
  "M 18 18 H 62 V 26 H 34 V 34 H 54 V 42 H 26 V 50 H 46 V 58 H 18 V 50 H 30 V 42 H 50 V 34 H 38 V 26 H 18 Z",
  "M 26 18 V 34 M 42 18 V 50 M 58 18 V 58",
  "M 18 26 H 34 M 46 26 H 62 M 18 42 H 26 M 38 42 H 54 M 30 50 H 46",
];

/** Main route drawn as progress sweeps the labyrinth. */
const MAZE_ROUTE =
  "M 18 18 H 34 V 26 H 26 V 42 H 38 V 34 H 54 V 42 H 46 V 58 H 30 V 50 H 18 V 58 H 42 V 50 H 50 V 34 H 62 V 18";

const ROUTE_LEN = 196;

/** Corner chevrons — Transformers-style bracket ticks. */
const BRACKETS = [
  "M 14 14 L 14 22 L 22 22",
  "M 66 14 L 66 22 L 58 22",
  "M 14 66 L 14 58 L 22 58",
  "M 66 66 L 66 58 L 58 58",
];

interface BoardAnalysisProgressOrbProps {
  percent: number;
  stageLabel: string;
  currentSan?: string;
  etaLabel?: string | null;
  compact?: boolean;
}

/** Compact angular maze emblem with labyrinth progress sweep. */
export function BoardAnalysisProgressOrb({
  percent,
  stageLabel,
  currentSan,
  etaLabel,
  compact = false,
}: BoardAnalysisProgressOrbProps) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const dash = (pct / 100) * ROUTE_LEN;

  return (
    <div
      className={`board-analysis-emblem-wrap flex flex-col items-center gap-2.5 pointer-events-none ${
        compact ? "scale-90" : ""
      }`}
    >
      <div
        className="board-analysis-emblem board-overlay-float"
        role="img"
        aria-label={`Analyzing, ${pct} percent`}
      >
        <svg
          viewBox="0 0 80 80"
          className="board-analysis-emblem__svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="emblemPlateFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1d18" />
              <stop offset="55%" stopColor="#10120f" />
              <stop offset="100%" stopColor="#080a08" />
            </linearGradient>
            <linearGradient id="emblemRouteGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(150,188,75,0.55)" />
              <stop offset="100%" stopColor="rgba(150,188,75,1)" />
            </linearGradient>
            <filter id="emblemSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Plate */}
          <path
            d={PLATE}
            fill="url(#emblemPlateFill)"
            stroke="rgba(150,188,75,0.45)"
            strokeWidth="1.25"
          />

          {/* Inner facet lines */}
          <path
            d="M 22 7 L 40 22 L 58 7 M 22 73 L 40 58 L 58 73 M 7 22 L 22 40 L 7 58 M 73 22 L 58 40 L 73 58"
            fill="none"
            stroke="rgba(150,188,75,0.08)"
            strokeWidth="0.75"
          />

          {/* Dim maze */}
          {MAZE_GRID.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(150,188,75,0.14)"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          ))}

          {/* Active route — draws through the maze */}
          <path
            d={MAZE_ROUTE}
            fill="none"
            stroke="url(#emblemRouteGlow)"
            strokeWidth="2.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeDasharray={`${dash} ${ROUTE_LEN}`}
            filter="url(#emblemSoftGlow)"
            className="board-analysis-emblem__route"
          />

          {/* Scan pulse along route */}
          <path
            d={MAZE_ROUTE}
            fill="none"
            stroke="rgba(196,224,140,0.35)"
            strokeWidth="4"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeDasharray="6 190"
            className="board-analysis-emblem__scan"
          />

          {/* Corner brackets */}
          {BRACKETS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(150,188,75,0.7)"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          ))}

          {/* Center % */}
          <text
            x="40"
            y="44"
            textAnchor="middle"
            className="board-analysis-emblem__pct"
          >
            {pct}%
          </text>
        </svg>
      </div>

      <div className="max-w-[min(280px,88vw)] text-center board-overlay-float">
        <p className="text-sm font-semibold text-chess-text">{stageLabel}</p>
        {currentSan && (
          <p className="mt-1 text-xs font-mono text-chess-subtext truncate">
            Move <span className="text-chess-accent">{currentSan}</span>
          </p>
        )}
        {etaLabel && (
          <p className="mt-1 text-[11px] text-chess-muted tabular-nums">{etaLabel}</p>
        )}
      </div>
    </div>
  );
}
