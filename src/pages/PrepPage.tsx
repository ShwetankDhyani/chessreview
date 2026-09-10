import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import { analyzePrepForm } from "../utils/prepApi";
import { safeGetItem, safeGetJson } from "../utils/safeStorage";
import type {
  PrepAnalyzeResponse,
  PrepHeadToHeadRow,
  PrepPlatform,
  PrepPlayerReport,
} from "../utils/prepTypes";

type LinkedProfile = { name: string; platform: "chesscom" | "lichess" };

function readActiveProfile(): LinkedProfile | null {
  try {
    const profiles = safeGetJson<LinkedProfile[]>("cr_profiles", []);
    if (!Array.isArray(profiles) || profiles.length === 0) {
      const name = safeGetItem("cr_username");
      const platform = (safeGetItem("cr_platform") ?? "chesscom") as PrepPlatform;
      if (!name) return null;
      return { name, platform: platform === "lichess" ? "lichess" : "chesscom" };
    }
    const idx = Number(safeGetItem("cr_active_profile_idx") ?? "0");
    const i = Number.isFinite(idx) ? Math.max(0, Math.min(profiles.length - 1, idx)) : 0;
    const p = profiles[i];
    if (!p?.name) return null;
    return {
      name: p.name,
      platform: p.platform === "lichess" ? "lichess" : "chesscom",
    };
  } catch {
    return null;
  }
}

function formatCell(row: PrepHeadToHeadRow, side: "self" | "opponent"): string {
  const v = row[side];
  if (v == null) return "—";
  if (row.format === "pct") return `${v}%`;
  return String(v);
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-chess-border/70 bg-chess-panel/50 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-chess-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-chess-text">
        {value}
      </div>
    </div>
  );
}

function PlayerFormCard({
  title,
  report,
}: {
  title: string;
  report: PrepPlayerReport;
}) {
  const o = report.stats.byColor.overall;
  return (
    <section className="space-y-3 rounded-2xl border border-chess-border/80 bg-chess-panel/35 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-chess-text">{title}</h2>
        <span className="text-[11px] font-medium text-chess-muted">
          {report.platform === "lichess" ? "Lichess" : "Chess.com"} ·{" "}
          {report.sampleSize} games
          {report.cache?.hit ? " · cached" : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill label="Score" value={`${o.scorePct}%`} />
        <StatPill
          label="W–L–D"
          value={`${o.wins}–${o.losses}–${o.draws}`}
        />
        <StatPill
          label="TPR"
          value={report.stats.tpr.value != null ? String(report.stats.tpr.value) : "—"}
        />
        <StatPill label="Tilt" value={String(report.stats.tilt.index)} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px] text-chess-subtext">
        <div>
          White {report.stats.byColor.white.scorePct}% ·{" "}
          {report.stats.byColor.white.played} games
        </div>
        <div>
          Black {report.stats.byColor.black.scorePct}% ·{" "}
          {report.stats.byColor.black.played} games
        </div>
        <div>Losses on time {report.stats.terminations.timePct}%</div>
        <div>Resign losses {report.stats.terminations.resignationPct}%</div>
      </div>
      <p className="text-[13px] leading-relaxed text-chess-subtext border-t border-chess-hairline pt-3">
        {report.scoutingReport}
      </p>
    </section>
  );
}

export default function PrepPage() {
  const linked = useMemo(() => readActiveProfile(), []);
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState<PrepPlatform>(
    linked?.platform ?? "chesscom"
  );
  const [includeSelf, setIncludeSelf] = useState(!!linked);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrepAnalyzeResponse | null>(null);
  const autoStarted = useRef(false);

  usePageSeo({
    title: "Opponent Prep — Current Form Head-to-Head | ChessReview",
    description:
      "Scout an opponent’s recent form from the last 100 games using PGN metadata only — win rates by color, TPR, tilt, and termination splits.",
    path: "/prep",
  });

  const runAnalyze = async (
    target: string,
    plat: PrepPlatform,
    withSelf: boolean
  ) => {
    setError(null);
    setLoading(true);
    setPhase("Fetching recent games from the public API…");
    setResult(null);
    try {
      const phaseTimer = window.setTimeout(() => {
        setPhase("Parsing PGN headers and computing form…");
      }, 1200);
      const phaseTimer2 = window.setTimeout(() => {
        setPhase("Writing scouting summary…");
      }, 3200);
      const data = await analyzePrepForm({
        username: target,
        platform: plat,
        selfUsername: withSelf && linked?.name ? linked.name : undefined,
        selfPlatform: withSelf && linked?.platform ? linked.platform : undefined,
      });
      window.clearTimeout(phaseTimer);
      window.clearTimeout(phaseTimer2);
      setResult(data);
      setPhase(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyze failed");
      setPhase(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoStarted.current) return;
    const qUser = (searchParams.get("u") || searchParams.get("username") || "").trim();
    const qPlatRaw = (searchParams.get("p") || searchParams.get("platform") || "").toLowerCase();
    const qPlat: PrepPlatform =
      qPlatRaw === "lichess" ? "lichess" : qPlatRaw === "chesscom" || qPlatRaw === "chess.com"
        ? "chesscom"
        : platform;
    if (!qUser) return;
    autoStarted.current = true;
    setUsername(qUser);
    setPlatform(qPlat);
    void runAnalyze(qUser, qPlat, false);
    // Intentionally once on mount from deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const target = username.trim();
    if (!target) {
      setError("Enter an opponent username");
      return;
    }
    await runAnalyze(target, platform, includeSelf);
  };

  return (
    <SiteChrome title="Prep">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.10),transparent_65%)]"
          aria-hidden
        />
        <main className="relative max-w-3xl mx-auto px-4 py-7 sm:py-10 space-y-6">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chess-accent/90">
              Opponent prep
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-chess-text">
              Current form head-to-head
            </h1>
            <p className="text-sm text-chess-subtext leading-relaxed max-w-xl">
              Last 100 games from public APIs — win rates by color, TPR, tilt
              signals, and how they lose. Metadata only; no engine analysis.
            </p>
          </header>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="rounded-2xl border border-chess-border/80 bg-chess-panel/40 p-4 space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 min-w-0">
                <span className="sr-only">Opponent username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Opponent username"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-10 rounded-lg border border-chess-border bg-chess-surface px-3 text-sm text-chess-text placeholder:text-chess-muted focus:outline-none focus:border-chess-accent/50"
                />
              </label>
              <div className="flex rounded-lg border border-chess-border overflow-hidden">
                {(
                  [
                    ["chesscom", "Chess.com"],
                    ["lichess", "Lichess"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPlatform(id)}
                    className={`h-10 px-3 text-[12px] font-semibold transition-colors ${
                      platform === id
                        ? "bg-chess-accent text-white"
                        : "bg-chess-surface text-chess-subtext hover:text-chess-text"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2 text-[12px] text-chess-subtext">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={includeSelf}
                disabled={!linked}
                onChange={(e) => setIncludeSelf(e.target.checked)}
              />
              <span>
                Compare against my linked profile
                {linked ? (
                  <>
                    {" "}
                    (
                    <span className="text-chess-text font-medium">
                      {linked.name}
                    </span>{" "}
                    on {linked.platform === "lichess" ? "Lichess" : "Chess.com"})
                  </>
                ) : (
                  <>
                    {" "}
                    —{" "}
                    <Link to="/" className="text-chess-accent hover:underline">
                      link a profile on the home page
                    </Link>{" "}
                    first
                  </>
                )}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-chess-accent text-sm font-bold text-white hover:bg-chess-accent-hover disabled:opacity-60 transition-colors"
            >
              {loading ? "Working…" : "Analyze form"}
            </button>
          </form>

          {loading && (
            <div
              className="rounded-2xl border border-chess-accent/25 bg-chess-accent/[0.06] px-4 py-3 text-sm text-chess-subtext"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-chess-accent animate-pulse" />
                <span className="font-medium text-chess-text">
                  Fetching and processing games
                </span>
              </div>
              <p className="mt-1 text-[12px] text-chess-muted">
                {phase ?? "Starting…"} Public APIs are rate-limited; this can take
                a moment.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {result?.opponent && (
            <div className="space-y-4">
              <PlayerFormCard title={result.opponent.username} report={result.opponent} />
              {result.self ? (
                <PlayerFormCard title={`You · ${result.self.username}`} report={result.self} />
              ) : null}

              {result.headToHead?.rows?.length ? (
                <section className="rounded-2xl border border-chess-border/80 bg-chess-panel/35 overflow-hidden">
                  <div className="px-4 py-3 border-b border-chess-hairline">
                    <h2 className="text-base font-semibold text-chess-text">
                      Head-to-head comparison
                    </h2>
                    <p className="text-[12px] text-chess-muted mt-0.5">
                      Same sample window — last up to 100 games each
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-chess-muted">
                          <th className="px-4 py-2 font-semibold">Metric</th>
                          <th className="px-4 py-2 font-semibold">You</th>
                          <th className="px-4 py-2 font-semibold">
                            {result.opponent.username}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.headToHead.rows.map((row) => (
                          <tr
                            key={row.label}
                            className="border-t border-chess-hairline/80 text-chess-subtext"
                          >
                            <td className="px-4 py-2.5 text-chess-text font-medium">
                              {row.label}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {formatCell(row, "self")}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {formatCell(row, "opponent")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </SiteChrome>
  );
}
