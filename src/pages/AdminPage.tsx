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
  fetchAdminStats,
  formatReviewsServed,
  type AdminReviewStats,
  type RecentReviewRow,
} from "../utils/reviewStats";

const KEY_STORAGE = "cr_admin_key";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function locationLabel(row: RecentReviewRow) {
  const parts = [row.city, row.region, countryLabel(row.country_code)].filter(Boolean);
  return parts.join(", ") || "—";
}

function playersLabel(row: RecentReviewRow) {
  const w = row.white_rating ? `${row.white_player} (${row.white_rating})` : row.white_player;
  const b = row.black_rating ? `${row.black_player} (${row.black_rating})` : row.black_player;
  return `${w} vs ${b}`;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const [inputKey, setInputKey] = useState("");
  const [stats, setStats] = useState<AdminReviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStats(key);
      setStats(data);
      sessionStorage.setItem(KEY_STORAGE, key);
      setAdminKey(key);
    } catch (e) {
      setStats(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) void load(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!adminKey || error === "Invalid admin key") {
    return (
      <div className="min-h-screen bg-chess-bg text-chess-text flex items-center justify-center p-6">
        <form
          className="w-full max-w-sm rounded-2xl border border-chess-border bg-chess-panel p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void load(inputKey.trim());
          }}
        >
          <div>
            <h1 className="text-lg font-bold">ChessReview admin</h1>
            <p className="text-sm text-chess-muted mt-1">
              Review analytics — metadata only, no games stored.
            </p>
          </div>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Admin key"
            className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm"
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={!inputKey.trim() || loading}
            className="w-full rounded-lg bg-chess-accent text-chess-bg font-semibold py-2 text-sm disabled:opacity-50"
          >
            {loading ? "Opening…" : "Enter"}
          </button>
          <a href="/" className="block text-center text-xs text-chess-muted hover:text-chess-accent">
            ← Back to ChessReview
          </a>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text overflow-y-auto">
      <header className="border-b border-chess-border bg-chess-panel/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold">Review analytics</h1>
            <p className="text-xs text-chess-muted">What&apos;s been studied — quietly, without hoarding games.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(adminKey)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg border border-chess-border hover:bg-chess-hover disabled:opacity-50"
            >
              Refresh
            </button>
            <a href="/" className="text-xs text-chess-muted hover:text-chess-accent">
              Site
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {loading && !stats ? (
          <p className="text-sm text-chess-muted">Loading…</p>
        ) : !stats?.configured ? (
          <p className="text-sm text-chess-subtext">
            Supabase is not configured. Add <code className="text-chess-accent">SUPABASE_URL</code> and{" "}
            <code className="text-chess-accent">SUPABASE_SERVICE_ROLE_KEY</code> on Vercel, then run{" "}
            <code className="text-chess-accent">supabase/schema.sql</code>.
          </p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Reviews served" value={formatReviewsServed(stats.reviewsServed ?? 0)} accent />
              <StatCard label="Countries" value={String(stats.countryCount ?? 0)} />
              <StatCard
                label="Avg white rating"
                value={stats.ratingSummary?.avgWhite ? String(stats.ratingSummary.avgWhite) : "—"}
              />
              <StatCard
                label="Avg black rating"
                value={stats.ratingSummary?.avgBlack ? String(stats.ratingSummary.avgBlack) : "—"}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <section className="rounded-xl border border-chess-border bg-chess-panel p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-chess-muted mb-3">
                  By country
                </h2>
                {(stats.countries?.length ?? 0) === 0 ? (
                  <p className="text-sm text-chess-muted">No country data yet.</p>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.countries?.slice(0, 16)} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <XAxis dataKey="countryCode" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const row = payload[0].payload as { countryCode: string; count: number };
                            return (
                              <div className="rounded-lg border border-chess-border bg-chess-panel px-2 py-1 text-xs">
                                {countryLabel(row.countryCode)}: {row.count}
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="count" fill="#96bc4b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-chess-border bg-chess-panel p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-chess-muted mb-3">
                  By engine depth
                </h2>
                {(stats.byDepth?.length ?? 0) === 0 ? (
                  <p className="text-sm text-chess-muted">No depth breakdown yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-chess-muted text-left border-b border-chess-border/50">
                          <th className="py-2 pr-3">Depth</th>
                          <th className="py-2 pr-3">Reviews</th>
                          <th className="py-2">Avg time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byDepth?.map((d) => (
                          <tr key={d.depth} className="border-b border-chess-border/30">
                            <td className="py-2 pr-3 tabular-nums">D{d.depth}</td>
                            <td className="py-2 pr-3 tabular-nums">{d.count}</td>
                            <td className="py-2 tabular-nums">{formatDuration(d.avgDurationMs)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-xl border border-chess-border bg-chess-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-chess-border/50">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-chess-muted">
                  Recent reviews
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                  <thead>
                    <tr className="text-chess-muted text-left bg-chess-bg/40">
                      <th className="py-2 px-3">When</th>
                      <th className="py-2 px-3">Match</th>
                      <th className="py-2 px-3">Result</th>
                      <th className="py-2 px-3">Reviewer</th>
                      <th className="py-2 px-3">Location</th>
                      <th className="py-2 px-3">Depth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recent?.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 px-3 text-chess-muted text-center">
                          No reviews yet.
                        </td>
                      </tr>
                    ) : (
                      stats.recent?.map((row, i) => (
                        <tr key={`${row.reviewed_at}-${i}`} className="border-t border-chess-border/30 hover:bg-chess-hover/20">
                          <td className="py-2 px-3 text-chess-muted whitespace-nowrap">
                            {formatWhen(row.reviewed_at)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-chess-text truncate max-w-[200px]">
                              {playersLabel(row)}
                            </div>
                            {row.plies != null && (
                              <div className="text-chess-muted">{row.plies} plies</div>
                            )}
                          </td>
                          <td className="py-2 px-3 tabular-nums">{row.result ?? "—"}</td>
                          <td className="py-2 px-3">
                            {row.username ? (
                              <span>
                                {row.username}
                                {row.reviewer_platform ? (
                                  <span className="text-chess-muted"> · {row.reviewer_platform}</span>
                                ) : null}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2 px-3 text-chess-muted">{locationLabel(row)}</td>
                          <td className="py-2 px-3 tabular-nums">D{row.depth}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-chess-border bg-chess-panel px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-chess-muted font-semibold">{label}</div>
      <div
        className={`text-2xl font-bold tabular-nums mt-1 ${
          accent ? "text-chess-accent" : "text-chess-text"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
