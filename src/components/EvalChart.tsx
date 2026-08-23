import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import type { AnalyzedMove } from "../types";
import { evalToCp } from "../engine/evaluationService";
import { getMeta } from "../utils/classificationMeta";
import { computeOpeningChapter } from "../utils/openingContext";

interface EvalChartProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
}

interface ChartPoint {
  moveIndex: number;
  label: string;
  eval: number;
  clampedEval: number;
  classification?: string;
  color?: string;
}

const CLAMP = 500;

export const EvalChart: React.FC<EvalChartProps> = ({
  moves,
  currentMoveIndex,
  onMoveSelect,
}) => {
  const data = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = [
      { moveIndex: -1, label: "Start", eval: 0, clampedEval: 0 },
    ];

    let lastCp = 0;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      let cp = 0;
      if (m.evalAfter && m.evalAfter.depth > 0) {
        cp = evalToCp(m.evalAfter);
        lastCp = cp;
      } else {
        cp = lastCp;
      }
      const clampedEval = Math.min(CLAMP, Math.max(-CLAMP, cp));
      const meta = getMeta(m.classification);
      const label =
        m.color === "w"
          ? `${m.moveNumber}. ${m.san}`
          : `${m.moveNumber}... ${m.san}`;

      points.push({
        moveIndex: i,
        label,
        eval: cp,
        clampedEval,
        classification: meta?.label,
        color: meta?.color,
      });
    }
    return points;
  }, [moves]);

  const bookBand = useMemo(() => {
    const chapter = computeOpeningChapter(moves);
    if (!chapter || chapter.endIdx < 0) return null;
    const start = data[1];
    const end = data[chapter.endIdx + 1];
    if (!start || !end) return null;
    return { x1: start.label, x2: end.label };
  }, [moves, data]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartPoint }>;
  }) => {
    if (!active || !payload?.length) return null;
    const pt = payload[0].payload;
    const evalStr =
      Math.abs(pt.eval) >= 10000
        ? pt.eval > 0
          ? "M+"
          : "M-"
        : (pt.eval / 100).toFixed(2);

    return (
      <div className="bg-chess-panel/95 backdrop-blur-md border border-chess-hairline-strong rounded-lg px-2.5 py-1.5 text-xs shadow-elev-3">
        <div className="font-semibold tracking-tight text-chess-text">
          {pt.label}
        </div>
        <div className="text-chess-subtext">
          Eval:{" "}
          <span
            className="font-mono font-bold tabular-nums"
            style={{ color: pt.eval >= 0 ? "#6daa6d" : "#ca3c3c" }}
          >
            {pt.eval >= 0 ? "+" : ""}
            {evalStr}
          </span>
        </div>
        {pt.classification && (
          <div style={{ color: pt.color }} className="font-semibold">
            {pt.classification}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-0 bg-chess-panel flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          onClick={(d) => {
            if (d?.activePayload?.[0]) {
              const idx = d.activePayload[0].payload.moveIndex as number;
              if (idx >= 0) onMoveSelect(idx);
            }
          }}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8e6e3" stopOpacity={0.34} />
              <stop offset="55%" stopColor="#e8e6e3" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#e8e6e3" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="blackGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis domain={[-CLAMP, CLAMP]} hide />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={0}
            stroke="#4a4744"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          {bookBand && (
            <ReferenceArea
              x1={bookBand.x1}
              x2={bookBand.x2}
              fill="#b58863"
              fillOpacity={0.14}
              strokeOpacity={0}
              ifOverflow="extendDomain"
            />
          )}
          <Area
            type="monotone"
            dataKey="clampedEval"
            stroke="#a8a5a1"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#whiteGrad)"
            dot={false}
            activeDot={{
              r: 3.5,
              fill: "#81b64c",
              stroke: "#1a1a1a",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
            strokeOpacity={bookBand ? 0.55 : 1}
          />
          {currentMoveIndex >= 0 && data[currentMoveIndex + 1] && (
            <ReferenceLine
              x={data[currentMoveIndex + 1].label}
              stroke="#6daa6d"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
