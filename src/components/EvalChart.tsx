import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { AnalyzedMove } from "../types";
import { evalToCp } from "../engine/evaluationService";
import { getMeta } from "../utils/classificationMeta";

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
      <div className="bg-chess-panel border border-chess-border rounded px-2 py-1.5 text-xs shadow-lg">
        <div className="font-medium text-chess-text">{pt.label}</div>
        <div className="text-chess-subtext">
          Eval:{" "}
          <span
            className="font-mono font-bold"
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
    <div className="w-full h-full min-h-[7rem] bg-chess-panel flex-shrink-0">
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
              <stop offset="5%" stopColor="#e8e6e3" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e8e6e3" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="blackGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis domain={[-CLAMP, CLAMP]} hide />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#3a3a3a" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="clampedEval"
            stroke="#888"
            strokeWidth={1.5}
            fill="url(#whiteGrad)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#6daa6d",
              stroke: "#1a1a1a",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
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
