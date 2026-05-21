import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  STATS_REFRESH,
  fetchPublicStats,
  type PublicReviewStats,
} from "../utils/stats";

function formatChartDate(iso: string) {
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function PublicStatsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<PublicReviewStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchPublicStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    void load();
    const onRefresh = () => void load();
    window.addEventListener(STATS_REFRESH, onRefresh);
    return () => window.removeEventListener(STATS_REFRESH, onRefresh);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const chartData = useMemo(
    () =>
      (stats?.reviewsByDate ?? []).map((row) => ({
        date: row.date,
        label: formatChartDate(row.date),
        reviews: row.count,
      })),
    [stats?.reviewsByDate]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-stats-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[85dvh] sm:max-h-[80dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-chess-border bg-chess-panel shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-chess-border">
          <h2 id="public-stats-title" className="text-sm font-bold text-chess-text">
            ChessReview stats
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-chess-muted hover:text-chess-text hover:bg-chess-hover flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {loading && !stats ? (
            <p className="text-xs text-chess-muted text-center py-6">Loading…</p>
          ) : !stats ? (
            <p className="text-xs text-chess-muted text-center py-6 leading-relaxed">
              Stats will appear once the cloud database is connected.
            </p>
          ) : (
            <>
              <p className="text-sm text-chess-text leading-relaxed text-center">
                <span className="text-2xl font-bold text-chess-accent tabular-nums">
                  {stats.matchesReviewed.toLocaleString()}
                </span>
                <br />
                <span className="text-chess-muted">
                  {stats.matchesReviewed === 1 ? "match" : "matches"} reviewed for
                  players
                </span>
                {stats.countryCount > 0 && (
                  <>
                    <br />
                    <span className="text-chess-subtext">
                      from{" "}
                      <span className="font-semibold text-chess-text">
                        {stats.countryCount}
                      </span>{" "}
                      {stats.countryCount === 1 ? "country" : "countries"}
                    </span>
                  </>
                )}
              </p>

              {chartData.length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-2 text-center">
                    Reviews per day
                  </p>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#8b949e", fontSize: 9 }}
                          interval="preserveStartEnd"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "#8b949e", fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          width={28}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1c2128",
                            border: "1px solid #30363d",
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                          labelFormatter={(_, payload) => {
                            const row = payload?.[0]?.payload as { date?: string };
                            return row?.date ?? "";
                          }}
                          formatter={(value) => [`${value} reviews`, ""]}
                        />
                        <Bar
                          dataKey="reviews"
                          fill="#6b9fd4"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-chess-muted text-center">
                  Daily chart will fill in as reviews come in.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
