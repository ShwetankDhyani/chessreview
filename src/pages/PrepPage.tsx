import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PrepHeadToHeadVisuals,
  PrepPlayerVisuals,
} from "../components/prep/PrepFormVisuals";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import { analyzePrepForm } from "../utils/prepApi";
import { safeGetItem, safeGetJson } from "../utils/safeStorage";
import type {
  PrepAnalyzeResponse,
  PrepPlatform,
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

function LoadingSkeleton({ phase }: { phase: string | null }) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="rounded-2xl border border-chess-accent/25 bg-chess-accent/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-chess-accent animate-ping opacity-60" />
            <span className="relative rounded-full h-2.5 w-2.5 bg-chess-accent" />
          </span>
          <span className="text-sm font-semibold text-chess-text">
            Loading recent games
          </span>
        </div>
        <p className="mt-1 text-[12px] text-chess-muted">
          {phase ?? "Starting…"} Chess.com and Lichess can be slow; hang on a
          second.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[200px] rounded-2xl border border-chess-border/60 bg-chess-panel/30 overflow-hidden relative"
          >
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          </div>
        ))}
      </div>
      <style>{`@keyframes shimmer{100%{transform:translateX(100%)}}`}</style>
    </div>
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
    title: "H2H — Recent form | ChessReview",
    description:
      "Compare recent form from the last 100 Chess.com or Lichess games — score, color splits, tilt, and how they lose. No engine analysis.",
    path: "/h2h",
  });

  const runAnalyze = async (
    target: string,
    plat: PrepPlatform,
    withSelf: boolean
  ) => {
    setError(null);
    setLoading(true);
    setPhase("Fetching games…");
    setResult(null);
    try {
      const phaseTimer = window.setTimeout(() => {
        setPhase("Crunching results…");
      }, 1200);
      const phaseTimer2 = window.setTimeout(() => {
        setPhase("Almost done…");
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
      setError(err instanceof Error ? err.message : "Couldn't load form");
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
      qPlatRaw === "lichess"
        ? "lichess"
        : qPlatRaw === "chesscom" || qPlatRaw === "chess.com"
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
    <SiteChrome title="H2H">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.14),transparent_60%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-24 h-40 opacity-[0.07]
            bg-[linear-gradient(90deg,transparent_0%,#81b64c_50%,transparent_100%)] blur-2xl"
          aria-hidden
        />
        <main className="relative max-w-5xl mx-auto px-4 py-7 sm:py-10 space-y-6">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chess-accent/90">
              Head-to-head
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-chess-text">
              H2H
            </h1>
            <p className="text-sm text-chess-subtext leading-relaxed max-w-2xl">
              Recent form from the last 100 games — score trend, White vs Black,
              tilt, and how they lose. Public results only; nothing engine-based.
            </p>
          </header>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="rounded-2xl border border-chess-border/80 bg-chess-panel/50 p-4 space-y-3 shadow-elev-1 backdrop-blur-sm"
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
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-chess-accent text-sm font-bold text-white hover:bg-chess-accent-hover disabled:opacity-60 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
            >
              {loading ? "Working…" : "Look up"}
            </button>
          </form>

          {loading ? <LoadingSkeleton phase={phase} /> : null}

          {error && (
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {result?.opponent && !loading ? (
            <div className="space-y-5">
              <PrepPlayerVisuals
                title={result.opponent.username}
                report={result.opponent}
              />
              {result.self ? (
                <PrepPlayerVisuals
                  title={`You · ${result.self.username}`}
                  report={result.self}
                />
              ) : null}
              {result.headToHead?.rows?.length && result.self ? (
                <PrepHeadToHeadVisuals
                  rows={result.headToHead.rows}
                  selfName={result.self.username}
                  opponentName={result.opponent.username}
                />
              ) : null}
            </div>
          ) : null}
        </main>
      </div>
    </SiteChrome>
  );
}
