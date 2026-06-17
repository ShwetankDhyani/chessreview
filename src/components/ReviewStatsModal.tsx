import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  countryLabel,
  fetchPublicStats,
  formatReviewsServed,
  type CountryStat,
  type PublicReviewStats,
} from "../utils/reviewStats";

function warmTooltip(props: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CountryStat }>;
}) {
  const { active, payload } = props;
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-chess-border bg-chess-panel px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-chess-text">{countryLabel(row.countryCode)}</div>
      <div className="text-chess-muted">
        {row.count.toLocaleString()} review{row.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function ReviewStatsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<PublicReviewStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchPublicStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const served = stats?.reviewsServed ?? 0;
  const countries = stats?.countries ?? [];
  const countryCount = stats?.countryCount ?? 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-chess-border bg-chess-panel shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="stats-title" className="text-base font-bold text-chess-text">
              Reviews served
            </h2>
            <p className="text-xs text-chess-muted mt-1">
              A quiet headcount of games studied here — no PGNs kept, just gratitude for each visit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex-shrink-0 rounded-lg text-chess-muted hover:text-chess-text hover:bg-chess-hover"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-chess-muted py-8 text-center">Counting the boards…</p>
        ) : !stats?.configured ? (
          <p className="text-sm text-chess-subtext leading-relaxed">
            Stats are warming up. Set <code className="text-chess-accent">STATS_REVIEWS_BASELINE</code> on
            Vercel for a starting count, or connect Supabase for live tracking.
          </p>
        ) : served === 0 ? (
          <p className="text-sm text-chess-subtext leading-relaxed">
            No reviews logged yet — yours could be the first on the board.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-chess-border/70 bg-chess-bg/50 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-chess-muted font-semibold">
                  Reviews served
                </div>
                <div className="text-2xl font-bold text-chess-accent tabular-nums mt-1">
                  {formatReviewsServed(served)}
                </div>
              </div>
              <div className="rounded-xl border border-chess-border/70 bg-chess-bg/50 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-chess-muted font-semibold">
                  Countries
                </div>
                <div className="text-2xl font-bold text-chess-text tabular-nums mt-1">
                  {countryCount}
                </div>
              </div>
            </div>

            {stats.baseline != null && stats.baseline > 0 && (
              <p className="text-[11px] text-chess-muted text-center">
                Includes {formatReviewsServed(stats.baseline)} reviews from before live tracking.
                {(stats.liveReviews ?? 0) > 0
                  ? ` ${formatReviewsServed(stats.liveReviews ?? 0)} logged since.`
                  : null}
              </p>
            )}

            {countries.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-chess-muted font-semibold mb-3">
                  Where players are studying
                </h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countries.slice(0, 12)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="countryCode"
                        tick={{ fill: "#888", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#666", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={warmTooltip} cursor={{ fill: "rgba(150,188,75,0.08)" }} />
                      <Bar dataKey="count" fill="#96bc4b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
                  {countries.map((c) => (
                    <li
                      key={c.countryCode}
                      className="flex items-center justify-between text-xs text-chess-subtext"
                    >
                      <span>{countryLabel(c.countryCode)}</span>
                      <span className="tabular-nums text-chess-muted">
                        {c.count.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
