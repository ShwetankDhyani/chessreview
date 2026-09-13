import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PrepCompareBriefVisuals,
  PrepHeadToHeadVisuals,
  PrepPlayerVisuals,
} from "../components/prep/PrepFormVisuals";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import { analyzePrepForm, recordPrepLookupCompleted } from "../utils/prepApi";
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
      "H2H form prep: scout a Chess.com or Lichess opponent across their last 100 games — score, tilt, colors, and matchups. Free rematch prep on ChessReview.",
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
      const started = Date.now();
      const reqBody = {
        username: target,
        platform: plat,
        selfUsername: withSelf && linked?.name ? linked.name : undefined,
        selfPlatform: withSelf && linked?.platform ? linked.platform : undefined,
      };
      const data = await analyzePrepForm(reqBody);
      window.clearTimeout(phaseTimer);
      window.clearTimeout(phaseTimer2);
      setResult(data);
      setPhase(null);
      // Fallback only when the analyze function could not persist usage.
      if (!data.usageRecorded) {
        recordPrepLookupCompleted({
          request: reqBody,
          response: data,
          durationMs: Date.now() - started,
        });
      }
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

  const platformMismatch = !!(
    includeSelf &&
    linked &&
    linked.platform !== platform
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const target = username.trim();
    if (!target) {
      setError("Enter an opponent username");
      return;
    }
    if (platformMismatch) {
      setError(
        "Compare only works on the same site — Chess.com with Chess.com, or Lichess with Lichess. Uncheck compare to look up this profile alone."
      );
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
        <main
          className={`relative mx-auto px-4 py-7 sm:py-10 space-y-6 ${
            result?.self && result?.compareBrief ? "max-w-6xl" : "max-w-5xl"
          }`}
        >
          <header className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-chess-accent/25 bg-chess-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-chess-accent">
              Rematch prep
              <span className="h2h-new-badge h2h-new-badge--inline" aria-hidden>
                New
              </span>
            </div>
            <h1 className="text-3xl sm:text-[2.5rem] font-extrabold tracking-[-0.03em] text-chess-text">
              Know their form before you sit down
            </h1>
            <p className="text-[15px] text-chess-subtext leading-relaxed">
              Paste a Chess.com or Lichess username. See score, tilt, colors, and
              how they tend to lose across the last 100 games — free, no account,
              no Stockfish wait.
            </p>
            <p className="cr-trust-row">
              <span>Public games only</span>
              <span aria-hidden>·</span>
              <span>Same-site compare</span>
              <span aria-hidden>·</span>
              <span>
                Then{" "}
                <Link to="/" className="font-semibold text-chess-accent hover:underline">
                  review the game
                </Link>
              </span>
            </p>
          </header>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="cr-panel p-4 sm:p-5 space-y-3.5"
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
                  className="cr-field"
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
                    onClick={() => {
                      setPlatform(id);
                      setError(null);
                    }}
                    className={`h-10 px-3 text-[12px] font-semibold transition-colors ${
                      platform === id
                        ? "bg-chess-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
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
                onChange={(e) => {
                  setIncludeSelf(e.target.checked);
                  setError(null);
                }}
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

            {platformMismatch ? (
              <p className="rounded-lg border border-amber-700/40 bg-amber-950/25 px-3 py-2 text-[12px] leading-relaxed text-amber-100/90">
                Your linked profile is on{" "}
                {linked?.platform === "lichess" ? "Lichess" : "Chess.com"}, but
                this lookup is{" "}
                {platform === "lichess" ? "Lichess" : "Chess.com"}. Compare only
                works same-site — uncheck compare to view this profile&apos;s
                stats alone.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="cr-btn-primary h-10 px-5 disabled:opacity-60"
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
              {result.compareBrief && result.self ? (
                <>
                  <PrepCompareBriefVisuals
                    brief={result.compareBrief}
                    selfName={result.self.username}
                    opponentName={result.opponent.username}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <PrepPlayerVisuals
                      title={result.self.username}
                      report={result.self}
                      hideBrief
                      compact
                    />
                    <PrepPlayerVisuals
                      title={result.opponent.username}
                      report={result.opponent}
                      hideBrief
                      compact
                    />
                  </div>
                  {result.headToHead?.rows?.length ? (
                    <PrepHeadToHeadVisuals
                      rows={result.headToHead.rows}
                      selfName={result.self.username}
                      opponentName={result.opponent.username}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {result.compareSkipped?.message ? (
                    <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100/90">
                      {result.compareSkipped.message}
                    </div>
                  ) : null}
                  <PrepPlayerVisuals
                    title={result.opponent.username}
                    report={result.opponent}
                  />
                </>
              )}
            </div>
          ) : null}
        </main>
      </div>
    </SiteChrome>
  );
}
