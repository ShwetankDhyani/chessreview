import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  PrepFormCharts,
  PrepHeadToHeadRow,
  PrepPlayerReport,
} from "../../utils/prepTypes";

const WIN = "#81b64c";
const DRAW = "#8b8784";
const LOSS = "#e84855";
const ACCENT = "#81b64c";
const MUTED = "#8b8784";
const PANEL = "#3a3633";

const TERM_COLORS: Record<string, string> = {
  time: "#e69045",
  resignation: "#f0c050",
  mate: "#e84855",
  abandoned: "#b58863",
  other: "#5b8fbf",
};

function emptyCharts(): PrepFormCharts {
  return {
    formTrend: [],
    resultsSpark: [],
    wld: [],
    byColorScore: [],
    terminations: [],
  };
}

function chartsOf(report: PrepPlayerReport): PrepFormCharts {
  return report.stats.charts ?? emptyCharts();
}

function RingGauge({
  value,
  max = 100,
  label,
  sub,
  color,
  danger,
}: {
  value: number;
  max?: number;
  label: string;
  sub?: string;
  color: string;
  danger?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[108px] w-[108px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
            style={{
              filter: danger
                ? "drop-shadow(0 0 6px rgba(232,72,85,0.35))"
                : "drop-shadow(0 0 6px rgba(129,182,76,0.28))",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-xl font-bold tabular-nums text-chess-text leading-none">
            {Number.isFinite(value) ? Math.round(value) : "—"}
          </span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-chess-muted">
            {label}
          </span>
        </div>
      </div>
      {sub ? (
        <p className="text-[11px] text-chess-muted text-center max-w-[7.5rem] leading-snug">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-chess-border/70 bg-chess-panel/40 p-3.5 sm:p-4 shadow-elev-1 ${className}`}
    >
      <div className="mb-3 flex items-end justify-between gap-2">
        <h3 className="text-[13px] font-semibold tracking-tight text-chess-text">
          {title}
        </h3>
        {hint ? (
          <span className="text-[10px] font-medium text-chess-muted">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ResultsRibbon({ spark }: { spark: PrepFormCharts["resultsSpark"] }) {
  const slice = spark.slice(-40);
  if (slice.length === 0) return null;
  return (
    <div className="flex items-end gap-[2px] h-10 w-full" aria-hidden>
      {slice.map((p) => {
        const h =
          p.outcome === "win" ? "100%" : p.outcome === "draw" ? "55%" : "28%";
        const bg =
          p.outcome === "win" ? WIN : p.outcome === "draw" ? DRAW : LOSS;
        return (
          <span
            key={p.i}
            title={`${p.outcome} · ${p.color}`}
            className="flex-1 min-w-[3px] rounded-sm transition-transform duration-300 hover:scale-y-110 origin-bottom"
            style={{ height: h, background: bg, opacity: 0.92 }}
          />
        );
      })}
    </div>
  );
}

const tooltipStyle = {
  background: "#312e2b",
  border: "1px solid #4a4744",
  borderRadius: 10,
  fontSize: 12,
  color: "#f1f1f1",
};

export function PrepPlayerVisuals({
  title,
  report,
}: {
  title: string;
  report: PrepPlayerReport;
}) {
  const o = report.stats.byColor.overall;
  const charts = chartsOf(report);
  const wldPie = useMemo(
    () =>
      charts.wld
        .filter((r) => r.value > 0)
        .map((r) => ({
          ...r,
          fill: r.key === "wins" ? WIN : r.key === "draws" ? DRAW : LOSS,
        })),
    [charts.wld]
  );
  const termPie = useMemo(
    () =>
      charts.terminations.map((r) => ({
        ...r,
        fill: TERM_COLORS[r.key] ?? MUTED,
      })),
    [charts.terminations]
  );

  return (
    <div className="space-y-3 spa-panel-enter">
      <section className="relative overflow-hidden rounded-2xl border border-chess-accent/25 bg-gradient-to-br from-chess-accent/[0.12] via-chess-panel/60 to-chess-panel/20 p-4 sm:p-5">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-chess-accent/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-chess-accent/90">
              Recent form
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-chess-text truncate">
              {title}
            </h2>
            <p className="text-[12px] text-chess-muted">
              {report.platform === "lichess" ? "Lichess" : "Chess.com"} ·{" "}
              {report.sampleSize} games
              {report.cache?.hit ? " · cached" : ""}
              {report.stats.tpr.averageOpponentRating != null
                ? ` · avg opp ${report.stats.tpr.averageOpponentRating}`
                : ""}
            </p>
            <p className="text-[13px] leading-relaxed text-chess-subtext max-w-xl pt-1">
              {report.summary || report.scoutingReport}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 flex-shrink-0">
            <RingGauge
              value={o.scorePct}
              label="Score"
              sub={`${o.wins}–${o.losses}–${o.draws}`}
              color={ACCENT}
            />
            <RingGauge
              value={report.stats.tpr.value ?? 0}
              max={Math.max(2200, (report.stats.tpr.value ?? 1500) + 200)}
              label="TPR"
              sub={
                report.stats.tpr.value != null
                  ? `vs ${report.stats.tpr.averageOpponentRating ?? "—"} opp`
                  : "n/a"
              }
              color="#94c455"
            />
            <RingGauge
              value={report.stats.tilt.index}
              label="Tilt"
              sub={
                report.stats.tilt.index >= 50
                  ? "Lots of rough patches"
                  : "Pretty steady"
              }
              color={report.stats.tilt.index >= 50 ? LOSS : ACCENT}
              danger={report.stats.tilt.index >= 50}
            />
          </div>
        </div>
        <div className="relative mt-4 pt-3 border-t border-chess-hairline">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-chess-muted">
              Last {Math.min(40, charts.resultsSpark.length)} results
            </span>
            <span className="text-[10px] text-chess-muted">
              <span className="text-[#81b64c]">■</span> win{" "}
              <span className="text-[#8b8784]">■</span> draw{" "}
              <span className="text-[#e84855]">■</span> loss
            </span>
          </div>
          <ResultsRibbon spark={charts.resultsSpark} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Form trend" hint="Rolling 10-game score %">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.formTrend}>
                <defs>
                  <linearGradient id="prepFormFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="n"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: MUTED, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v}%`, "Score"]}
                  labelFormatter={(n) => `Game ${n}`}
                />
                <Area
                  type="monotone"
                  dataKey="scorePct"
                  stroke={ACCENT}
                  strokeWidth={2.2}
                  fill="url(#prepFormFill)"
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Results mix" hint="Win / draw / loss">
          <div className="h-[180px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wldPie}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  stroke={PANEL}
                  strokeWidth={2}
                  animationDuration={800}
                >
                  {wldPie.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [v, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-shrink-0 space-y-1.5 pr-1 min-w-[5.5rem]">
              {wldPie.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center gap-1.5 text-[11px] text-chess-subtext"
                >
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: row.fill }}
                  />
                  <span className="font-medium text-chess-text tabular-nums">
                    {row.value}
                  </span>
                  {row.label}
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard title="Color performance" hint="Score % by side">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.byColorScore}
                layout="vertical"
                margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: MUTED, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, _n, item) => [
                    `${v}% · ${item?.payload?.played ?? 0} games`,
                    "Score",
                  ]}
                />
                <Bar dataKey="scorePct" radius={[0, 8, 8, 0]} barSize={22} animationDuration={850}>
                  {charts.byColorScore.map((row) => (
                    <Cell
                      key={row.key}
                      fill={row.key === "white" ? "#d6d3c8" : "#769656"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="How they lose" hint="Termination split">
          <div className="h-[180px] w-full flex items-center">
            {termPie.length === 0 ? (
              <p className="text-sm text-chess-muted px-2">No losses in sample</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={termPie}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={44}
                      outerRadius={70}
                      paddingAngle={2}
                      stroke={PANEL}
                      strokeWidth={2}
                      animationDuration={850}
                    >
                      {termPie.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number, name: string, item) => [
                        `${v} (${item?.payload?.pct ?? 0}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="flex-shrink-0 space-y-1.5 pr-1 min-w-[6rem]">
                  {termPie.map((row) => (
                    <li
                      key={row.key}
                      className="flex items-center gap-1.5 text-[11px] text-chess-subtext"
                    >
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ background: row.fill }}
                      />
                      <span className="tabular-nums text-chess-text font-medium">
                        {row.pct}%
                      </span>
                      {row.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

export function PrepHeadToHeadVisuals({
  rows,
  selfName,
  opponentName,
}: {
  rows: PrepHeadToHeadRow[];
  selfName: string;
  opponentName: string;
}) {
  const radar = useMemo(() => {
    const pick = (label: string) => rows.find((r) => r.label === label);
    const norm = (v: number | null, max: number) =>
      v == null ? 0 : Math.max(0, Math.min(100, (v / max) * 100));
    return [
      {
        metric: "Score",
        you: pick("Score %")?.self ?? 0,
        them: pick("Score %")?.opponent ?? 0,
      },
      {
        metric: "White",
        you: pick("White score %")?.self ?? 0,
        them: pick("White score %")?.opponent ?? 0,
      },
      {
        metric: "Black",
        you: pick("Black score %")?.self ?? 0,
        them: pick("Black score %")?.opponent ?? 0,
      },
      {
        metric: "TPR",
        you: norm(pick("TPR")?.self ?? null, 2400),
        them: norm(pick("TPR")?.opponent ?? null, 2400),
      },
      {
        metric: "Calm",
        // Invert tilt so higher is better on the radar.
        you: 100 - (pick("Tilt index")?.self ?? 0),
        them: 100 - (pick("Tilt index")?.opponent ?? 0),
      },
    ];
  }, [rows]);

  const bars = useMemo(
    () =>
      rows
        .filter((r) => r.format === "pct" || r.label === "Tilt index")
        .map((r) => ({
          label: r.label.replace(" %", ""),
          you: r.self ?? 0,
          them: r.opponent ?? 0,
        })),
    [rows]
  );

  return (
    <section className="space-y-3 rounded-2xl border border-chess-border/70 bg-chess-panel/40 p-4 shadow-elev-1">
      <div>
        <h2 className="text-base font-semibold text-chess-text">
          Head-to-head
        </h2>
        <p className="text-[12px] text-chess-muted mt-0.5">
          {selfName} vs {opponentName} · same sample window
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: MUTED, fontSize: 11 }}
              />
              <Radar
                name="You"
                dataKey="you"
                stroke="#94c455"
                fill="#94c455"
                fillOpacity={0.28}
                strokeWidth={2}
              />
              <Radar
                name="Them"
                dataKey="them"
                stroke="#e69045"
                fill="#e69045"
                fillOpacity={0.18}
                strokeWidth={2}
              />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bars}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: MUTED, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={48}
              />
              <YAxis
                tick={{ fill: MUTED, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="you" name="You" fill="#94c455" radius={[6, 6, 0, 0]} />
              <Bar dataKey="them" name="Them" fill="#e69045" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-chess-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-chess-muted bg-chess-surface/40">
              <th className="px-3 py-2 font-semibold">Metric</th>
              <th className="px-3 py-2 font-semibold">You</th>
              <th className="px-3 py-2 font-semibold">{opponentName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-t border-chess-hairline/80 text-chess-subtext"
              >
                <td className="px-3 py-2 text-chess-text font-medium">
                  {row.label}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {row.self == null
                    ? "—"
                    : row.format === "pct"
                      ? `${row.self}%`
                      : String(row.self)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {row.opponent == null
                    ? "—"
                    : row.format === "pct"
                      ? `${row.opponent}%`
                      : String(row.opponent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
