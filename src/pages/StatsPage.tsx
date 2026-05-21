import { useCallback, useEffect, useState } from "react";
import {
  fetchFullStats,
  type DepthStat,
  type FullStatsSummary,
  type RecentReview,
} from "../utils/stats";

const KEY_STORAGE = "cr_stats_read_key";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(ms: number) {
  if (ms < 60_000) return `${(ms / 1000).toFixed(0)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function locationLabel(r: RecentReview) {
  return [r.city, r.region, r.countryCode].filter(Boolean).join(", ") || "—";
}

export default function StatsPage() {
  const [readKey, setReadKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const [inputKey, setInputKey] = useState("");
  const [stats, setStats] = useState<FullStatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterDepth, setFilterDepth] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  const load = useCallback(async () => {
    if (!readKey) return;
    setLoading(true);
    setError(null);
    const data = await fetchFullStats(readKey, {
      depth: filterDepth ? parseInt(filterDepth, 10) : undefined,
      country: filterCountry || undefined,
      limit: 200,
    });
    setLoading(false);
    if (!data) {
      setError("Could not load stats — check your view key");
      return;
    }
    setStats(data);
  }, [readKey, filterDepth, filterCountry]);

  useEffect(() => {
    if (readKey) void load();
  }, [readKey, load]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem(KEY_STORAGE, inputKey.trim());
    setReadKey(inputKey.trim());
    setInputKey("");
  };

  if (!readKey) {
    return (
      <div className="min-h-[100dvh] bg-chess-bg text-chess-text flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-xl border border-chess-border bg-chess-panel p-6 space-y-4"
        >
          <h1 className="text-xl font-bold">Review stats</h1>
          <p className="text-xs text-chess-muted leading-relaxed">
            Enter the <code className="text-chess-accent">STATS_READ_KEY</code> from
            Vercel env. Data lives in Supabase — filterable by depth, country, and
            time.
          </p>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="View key"
            className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!inputKey.trim()}
            className="w-full rounded-lg bg-chess-accent py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            View stats
          </button>
          <a href="/" className="block text-center text-xs text-chess-muted">
            ← Back
          </a>
        </form>
      </div>
    );
  }

  const byDepth = (stats?.byDepth ?? []) as DepthStat[];

  return (
    <div className="min-h-[100dvh] bg-chess-bg text-chess-text">
      <header className="sticky top-0 z-10 border-b border-chess-border bg-chess-panel/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Review stats</h1>
          <p className="text-[10px] text-chess-muted">
            {stats
              ? `${stats.matchesReviewed.toLocaleString()} matches reviewed (filtered)`
              : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterDepth}
            onChange={(e) => setFilterDepth(e.target.value)}
            className="text-xs rounded-lg border border-chess-border bg-chess-bg px-2 py-1.5"
          >
            <option value="">All depths</option>
            {[12, 14, 16, 18, 20, 22].map((d) => (
              <option key={d} value={d}>
                Depth {d}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value.toUpperCase())}
            placeholder="Country (US)"
            className="text-xs w-24 rounded-lg border border-chess-border bg-chess-bg px-2 py-1.5 uppercase"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg border border-chess-border"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(KEY_STORAGE);
              setReadKey("");
              setStats(null);
            }}
            className="text-xs text-chess-muted"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-6 pb-10">
        {error && (
          <p className="text-sm text-move-blunder border border-move-blunder/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {stats && (
          <>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-chess-muted mb-2">
                By depth (count + avg time)
              </h2>
              <div className="rounded-lg border border-chess-border overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-chess-surface text-chess-muted">
                    <tr>
                      <th className="text-left px-3 py-2">Depth</th>
                      <th className="text-right px-3 py-2">Reviews</th>
                      <th className="text-right px-3 py-2">Avg time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-chess-border">
                    {byDepth.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-chess-muted">
                          No data yet
                        </td>
                      </tr>
                    ) : (
                      byDepth.map((row) => (
                        <tr key={row.depth}>
                          <td className="px-3 py-2 font-medium">{row.depth}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatDuration(row.avgDurationMs)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-chess-muted mb-2">
                By country
              </h2>
              <div className="flex flex-wrap gap-2">
                {(stats.byCountry ?? []).length === 0 ? (
                  <p className="text-xs text-chess-muted">No country data yet</p>
                ) : (
                  stats.byCountry.map((c) => (
                    <span
                      key={c.countryCode}
                      className="text-xs px-2.5 py-1 rounded-full border border-chess-border bg-chess-surface tabular-nums"
                    >
                      {c.countryCode}: {c.count}
                    </span>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-chess-muted mb-2">
                By city / region
              </h2>
              <div className="rounded-lg border border-chess-border max-h-40 overflow-y-auto divide-y divide-chess-border text-xs">
                {(stats.byLocation ?? []).length === 0 ? (
                  <p className="p-3 text-chess-muted">No location detail yet</p>
                ) : (
                  stats.byLocation.slice(0, 30).map((loc, i) => (
                    <div key={i} className="px-3 py-2 flex justify-between gap-2">
                      <span>
                        {[loc.city, loc.region, loc.countryCode].filter(Boolean).join(", ")}
                      </span>
                      <span className="text-chess-muted tabular-nums">{loc.count}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-chess-muted mb-2">
                Recent matches reviewed
              </h2>
              <div className="rounded-lg border border-chess-border max-h-[50vh] overflow-y-auto divide-y divide-chess-border text-xs">
                {(stats.recentReviews ?? []).length === 0 ? (
                  <p className="p-4 text-chess-muted text-center">No reviews yet</p>
                ) : (
                  stats.recentReviews.map((r) => (
                    <div key={r.id} className="px-3 py-2.5">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-chess-accent">
                          {r.white} vs {r.black}
                        </span>
                        <span className="text-chess-muted flex-shrink-0">
                          {formatWhen(r.reviewedAt)}
                        </span>
                      </div>
                      <p className="text-chess-text mt-0.5">
                        {r.username ?? "Anonymous"} · depth {r.depth} ·{" "}
                        {formatDuration(r.durationMs)}
                        {r.plies != null ? ` · ${r.plies} plies` : ""}
                      </p>
                      <p className="text-chess-muted mt-0.5">
                        {locationLabel(r)}
                        {r.timezone ? ` · ${r.timezone}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        <a href="/" className="text-sm text-chess-accent inline-block">
          ← Back to ChessReview
        </a>
      </main>
    </div>
  );
}
