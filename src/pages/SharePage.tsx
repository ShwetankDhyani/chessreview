import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ReviewSummaryPanel } from "../components/ReviewSummary";
import { MoveList } from "../components/MoveList";
import { ReviewSessionView } from "../components/ReviewSessionView";
import { fetchSharedReview } from "../utils/shareReview";
import { usePageSeo } from "../hooks/usePageSeo";
import { shareReviewJsonLd } from "../utils/seo";
import { useReviewBoardSession } from "../hooks/useReviewBoardSession";
import type { AnalyzedMove, ReviewRun, ReviewSummary } from "../types";
import { InlineErrorNotice } from "../components/InlineErrorNotice";
import { normalizeShareError, trackAppError, withTimeout } from "../utils/appError";
import { hapticSelection } from "../utils/chessSounds";

type ShareTab = "game" | "stats";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function ShareTabBar({
  tab,
  onTab,
}: {
  tab: ShareTab;
  onTab: (t: ShareTab) => void;
}) {
  const items: Array<{ id: ShareTab; label: string }> = [
    { id: "game", label: "Game" },
    { id: "stats", label: "Stats" },
  ];
  return (
    <nav
      className="flex-shrink-0 flex border-b border-chess-border bg-chess-panel lg:hidden"
      aria-label="Shared review sections"
    >
      {items.map(({ id, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => { hapticSelection(); onTab(id); }}
            className={`relative flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              active ? "text-chess-accent" : "text-chess-muted"
            }`}
          >
            {active && (
              <span className="absolute inset-x-8 top-0 h-0.5 rounded-b bg-chess-accent" />
            )}
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function DesktopSidebarTabs({
  tab,
  onTab,
}: {
  tab: ShareTab;
  onTab: (t: ShareTab) => void;
}) {
  const items: Array<{ id: ShareTab; label: string }> = [
    { id: "game", label: "Moves" },
    { id: "stats", label: "Review" },
  ];
  return (
    <div className="flex bg-chess-bg/40 border-b border-chess-border">
      {items.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => { hapticSelection(); onTab(id); }}
          className={`relative flex-1 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
            tab === id ? "text-chess-accent" : "text-chess-muted hover:text-chess-text"
          }`}
        >
          {label}
          {tab === id && (
            <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-chess-accent" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function SharePage() {
  const { id: shareIdParam } = useParams<{ id: string }>();
  const shareId = shareIdParam ?? "";
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [tab, setTab] = useState<ShareTab>("game");
  const [desktopTab, setDesktopTab] = useState<ShareTab>("game");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [pgn, setPgn] = useState("");
  const [whiteName, setWhiteName] = useState("White");
  const [blackName, setBlackName] = useState("Black");
  const [reviewRun, setReviewRun] = useState<ReviewRun | null>(null);

  const session = useReviewBoardSession({
    moves,
    pgn,
    whiteName,
    blackName,
    startAtLastMove: false,
  });

  const seoOptions = useMemo(() => {
    const path = shareId ? `/r/${shareId}` : "/r";
    if (loading || error || !summary) {
      return {
        title: "Shared Chess Review — ChessReview",
        description:
          "View a shared chess game review with move ratings, accuracy, and eval chart.",
        path,
        ogType: "article" as const,
      };
    }
    const wAcc = summary.accuracy?.white;
    const bAcc = summary.accuracy?.black;
    const accText =
      typeof wAcc === "number" && typeof bAcc === "number"
        ? ` Accuracy: ${Math.round(wAcc)}% vs ${Math.round(bAcc)}%.`
        : "";
    return {
      title: `${whiteName} vs ${blackName} — ChessReview`,
      description: `Shared chess game review.${accText} Move ratings, accuracy, and eval chart.`,
      path,
      ogType: "article" as const,
      jsonLd: shareReviewJsonLd({
        id: shareId,
        whiteName,
        blackName,
        whiteAccuracy: wAcc,
        blackAccuracy: bAcc,
      }),
    };
  }, [shareId, loading, error, summary, whiteName, blackName]);

  usePageSeo(seoOptions);

  useEffect(() => {
    void (async () => {
      if (!shareId) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }
      try {
        const data = await withTimeout(
          fetchSharedReview(shareId),
          20000,
          "Share timeout"
        );
        setMoves(data.moves);
        setSummary(data.summary);
        setPgn(data.pgn ?? "");
        setWhiteName(data.whiteName);
        setBlackName(data.blackName);
        setReviewRun(data.run ?? null);
      } catch (e) {
        const normalized = normalizeShareError(e);
        trackAppError({
          code: normalized.code,
          message: normalized.message,
          context: { phase: "share-load", shareId },
        });
        setError(normalized.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [shareId, reloadTick]);

  const handleMoveSelect = (idx: number) => {
    session.navigateToMove(idx);
    if (!isDesktop) setTab("game");
  };

  const showGame = isDesktop || tab === "game";
  const showStats = isDesktop || tab === "stats";
  const vsLabel = `${session.playerNames.white} vs ${session.playerNames.black}`;

  if (loading) {
    return (
      <div className="h-[100dvh] bg-chess-bg text-chess-text flex items-center justify-center">
        <p className="text-sm text-chess-muted">Loading shared review…</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="h-[100dvh] bg-chess-bg text-chess-text flex flex-col items-center justify-center gap-3 p-6">
        <InlineErrorNotice
          message={error ?? "Review not found"}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setReloadTick((v) => v + 1);
          }}
        />
        <Link to="/" className="text-sm text-chess-accent hover:underline">
          Go to ChessReview
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-chess-bg text-chess-text font-sans flex flex-col">
      <header className="relative z-50 flex flex-shrink-0 items-center gap-2 sm:gap-3 page-inline-pad min-h-[var(--app-header-h)] py-2 bg-chess-panel after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-chess-border after:via-chess-accent/30 after:to-chess-border">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <Link
            to="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-chess-accent/25 to-chess-accent/[0.04] border border-chess-accent/35 text-chess-accent select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            aria-label="ChessReview home"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5.5 21h13l-.7-3.4H6.2L5.5 21zM6.5 16h11l-.5-2H7L6.5 16zM7.2 12.6h9.6c-.3-1-1-2.4-2-3.4l1.7-1.7-1.4-1.4-1.7 1.7c-1-1-2.4-1.7-3.4-2L11 4l-1.6.4c-1 .3-2.4 1-3.4 2L4.3 4.7 2.9 6.1l1.7 1.7c-1 1-1.7 2.4-2 3.4l4.6 1.4zM12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
            </svg>
          </Link>
          <div className="min-w-0">
            <span className="font-bold text-[17px] tracking-tight leading-none inline-flex items-baseline">
              <span className="text-chess-subtext">Chess</span>
              <span className="text-chess-accent">Review</span>
            </span>
            <p className="text-[11px] text-chess-muted truncate mt-0.5">{vsLabel}</p>
          </div>
        </div>
        <div className="flex-1 min-w-0" />
        <Link
          to="/"
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-chess-border hover:bg-chess-hover transition-colors font-semibold"
        >
          Analyze yours
        </Link>
      </header>

      <ShareTabBar tab={tab} onTab={setTab} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {isDesktop && (
          <aside className="w-72 flex-shrink-0 bg-chess-sidebar border-r border-chess-border flex flex-col overflow-hidden">
            <DesktopSidebarTabs tab={desktopTab} onTab={setDesktopTab} />
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
              {desktopTab === "game" ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-chess-border flex-shrink-0 gap-2">
                    <span className="text-xs text-chess-muted font-semibold uppercase tracking-wider truncate min-w-0">
                      {vsLabel}
                    </span>
                  </div>
                  <div className="p-2">
                    <MoveList
                      moves={moves}
                      currentMoveIndex={session.currentMoveIdx}
                      onMoveSelect={handleMoveSelect}
                      markGameEnd={!!session.gameEnd}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto min-h-0">
                  <ReviewSummaryPanel
                    summary={summary}
                    whiteName={session.playerNames.white}
                    blackName={session.playerNames.black}
                    moves={moves}
                    run={reviewRun}
                    onMoveClick={handleMoveSelect}
                  />
                  <p className="text-[11px] text-chess-muted text-center py-4 px-3">
                    <Link
                      to="/"
                      className="text-chess-accent hover:underline font-medium"
                    >
                      Review your own games on ChessReview
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {isDesktop ? (
            <ReviewSessionView
              session={session}
              runId={reviewRun?.runId}
              layout="desktop"
            />
          ) : (
            <>
              {showGame && (
                <ReviewSessionView
                  session={session}
                  runId={reviewRun?.runId}
                  layout="mobile"
                />
              )}
              {showStats && (
                <div
                  className="flex-1 overflow-y-auto min-h-0 mobile-review-scroll page-inline-pad pt-2"
                  style={{ paddingBottom: "var(--mobile-chrome-bottom)" }}
                >
                  <ReviewSummaryPanel
                    summary={summary}
                    whiteName={session.playerNames.white}
                    blackName={session.playerNames.black}
                    moves={moves}
                    run={reviewRun}
                    onMoveClick={handleMoveSelect}
                  />
                  <p className="text-[11px] text-chess-muted text-center py-4">
                    <Link
                      to="/"
                      className="text-chess-accent hover:underline font-medium"
                    >
                      Review your own games on ChessReview
                    </Link>
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
