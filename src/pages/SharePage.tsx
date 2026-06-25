import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReviewSummaryPanel } from "../components/ReviewSummary";
import { EvalChartPanel } from "../components/EvalChartPanel";
import { EvalBadge } from "../components/EvalBadge";
import { MobileBoardShell } from "../components/MobileBoardShell";
import { GameMoveNavBar } from "../components/GameMoveNavBar";
import { MoveList } from "../components/MoveList";
import { MoveReviewPanel } from "../components/MoveReviewPanel";
import { fetchSharedReview } from "../utils/shareReview";
import { usePageSeo } from "../hooks/usePageSeo";
import { shareReviewJsonLd } from "../utils/seo";
import { formatChessMoveCounter } from "../utils/pgnPlies";
import type { AnalyzedMove } from "../types";
import {
  BOARD_START_FEN,
  canAnimateBoardStep,
  highlightFromUci,
  resolveBoardNavStep,
} from "../utils/boardPosition";

const BOARD_PLAY_MOVE_MS = 380;

type ShareTab = "game" | "stats";

function shareIdFromPath(): string {
  const path = window.location.pathname.replace(/\/$/, "");
  const match = path.match(/^\/r\/([^/]+)$/);
  return match?.[1] ?? "";
}

function lastMoveFromUci(uci: string | undefined) {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

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

function useViewport() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 390,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
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
            onClick={() => onTab(id)}
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

export default function SharePage() {
  const shareId = shareIdFromPath();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const viewport = useViewport();
  const [tab, setTab] = useState<ShareTab>("game");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);
  const [summary, setSummary] = useState<import("../types").ReviewSummary | null>(null);
  const [whiteName, setWhiteName] = useState("White");
  const [blackName, setBlackName] = useState("Black");
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [displayFen, setDisplayFen] = useState(BOARD_START_FEN);
  const [boardPieceAnimMs, setBoardPieceAnimMs] = useState(0);
  const [moveAnim, setMoveAnim] = useState<{ from: string; to: string } | null>(
    null
  );
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [evalOpen, setEvalOpen] = useState(true);
  const boardSectionRef = useRef<HTMLElement>(null);
  const currentMoveIdxRef = useRef(-1);
  const lastRenderedFenRef = useRef(BOARD_START_FEN);

  const scrollToBoard = useCallback(() => {
    boardSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const applyMoveSelect = useCallback(
    (idx: number, animate: boolean) => {
      const clamped = Math.max(-1, Math.min(moves.length - 1, idx));
      const fromIdx = currentMoveIdxRef.current;
      const onePly = Math.abs(clamped - fromIdx) === 1;
      const { fen, highlight } = resolveBoardNavStep(moves, fromIdx, clamped);
      const safeToAnimate =
        animate &&
        onePly &&
        canAnimateBoardStep(lastRenderedFenRef.current, fen, highlight);
      setBoardPieceAnimMs(safeToAnimate ? BOARD_PLAY_MOVE_MS : 0);
      const displayHighlight =
        clamped >= 0
          ? highlightFromUci(moves[clamped].uci)
          : highlight;
      setMoveAnim(displayHighlight);
      setDisplayFen(fen);
      setCurrentMoveIdx(clamped);
      currentMoveIdxRef.current = clamped;
    },
    [moves]
  );

  const selectMove = useCallback(
    (idx: number, scrollBoard = false, animate = true) => {
      const clamped = Math.max(-1, Math.min(moves.length - 1, idx));
      const fromIdx = currentMoveIdxRef.current;
      const onePly = Math.abs(clamped - fromIdx) === 1;
      applyMoveSelect(clamped, animate && onePly);
      if (scrollBoard) {
        if (!isDesktop) setTab("game");
        scrollToBoard();
      }
    },
    [moves.length, isDesktop, scrollToBoard, applyMoveSelect]
  );

  const seoOptions = useMemo(() => {
    const path = shareId ? `/r/${shareId}` : "/r";
    if (loading || error || !summary) {
      return {
        title: "Shared Chess Review — ChessReview",
        description: "View a shared chess game review with move ratings, accuracy, and eval chart.",
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
        const data = await fetchSharedReview(shareId);
        setMoves(data.moves);
        setSummary(data.summary);
        setWhiteName(data.whiteName);
        setBlackName(data.blackName);
        const startFen = data.moves[0]?.fenBefore ?? BOARD_START_FEN;
        setCurrentMoveIdx(-1);
        currentMoveIdxRef.current = -1;
        setDisplayFen(startFen);
        lastRenderedFenRef.current = startFen;
        setBoardPieceAnimMs(0);
        setMoveAnim(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [shareId]);

  const stepMove = useCallback(
    (delta: number, animate = true) => {
      selectMove(currentMoveIdxRef.current + delta, false, animate);
    },
    [selectMove]
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      lastRenderedFenRef.current = displayFen;
    });
    return () => cancelAnimationFrame(id);
  }, [displayFen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") stepMove(1);
      else if (e.key === "ArrowLeft") stepMove(-1);
      else if (e.key === "Home") selectMove(-1);
      else if (e.key === "End") selectMove(moves.length - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stepMove, selectMove, moves.length]);

  const currentMove = currentMoveIdx >= 0 ? moves[currentMoveIdx] : null;
  const currentEval = currentMove?.evalAfter ?? moves[0]?.evalBefore ?? null;
  const lastMoveHighlight =
    moveAnim ?? lastMoveFromUci(currentMove?.uci);

  const boardWidth = useMemo(() => {
    if (isDesktop) {
      return Math.min(380, Math.max(280, Math.floor(viewport.w * 0.28)));
    }
    return Math.min(
      400,
      Math.max(240, Math.floor(viewport.w * 0.88) - 44)
    );
  }, [isDesktop, viewport.w]);

  const topPlayer = boardFlipped ? whiteName : blackName;
  const bottomPlayer = boardFlipped ? blackName : whiteName;
  const moveLabel = formatChessMoveCounter(currentMoveIdx, moves.length);
  const showGame = isDesktop || tab === "game";
  const showStats = isDesktop || tab === "stats";

  if (loading) {
    return (
      <div className="h-[100dvh] bg-chess-bg text-chess-text flex items-center justify-center">
        <p className="text-sm text-chess-muted">Loading review…</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="h-[100dvh] bg-chess-bg text-chess-text flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-chess-muted">{error ?? "Review not found"}</p>
        <a href="/" className="text-sm text-chess-accent hover:underline">
          Go to ChessReview
        </a>
      </div>
    );
  }

  const gamePanel = (
    <section
      ref={boardSectionRef}
      className={`rounded-xl border border-chess-border bg-chess-panel shadow-sm overflow-hidden ${
        showGame ? "" : "hidden lg:block"
      } lg:sticky lg:top-4 lg:max-h-[calc(100dvh-5.5rem)] lg:flex lg:flex-col`}
      aria-label="Board and moves"
    >
      <div className="flex-shrink-0 px-3 pt-3 pb-2">
        <div className="review-flow-stack">
        <div className="flex items-center justify-between gap-2 text-xs text-chess-muted px-3 py-2">
          <span className="truncate font-medium text-chess-text">{topPlayer}</span>
          <EvalBadge
            evalResult={currentEval}
            boardFlipped={boardFlipped}
            compact
          />
          <span className="truncate text-right font-medium text-chess-text">
            {bottomPlayer}
          </span>
        </div>

        <MobileBoardShell
          evalResult={currentEval}
          position={displayFen}
          boardWidth={boardWidth}
          boardOrientation={boardFlipped ? "black" : "white"}
          animationDuration={boardPieceAnimMs}
          dimmed={false}
          continuationActive={false}
          lastMoveHighlight={lastMoveHighlight}
          continuationArrow={null}
          showBestMoveArrow={false}
          remountKey={0}
        />
        {moves.length > 0 && (
          <GameMoveNavBar
            canPrev={currentMoveIdx > -1}
            canNext={currentMoveIdx < moves.length - 1}
            onPrev={(animate = true) => stepMove(-1, animate)}
            onNext={(animate = true) => stepMove(1, animate)}
          />
        )}

        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-[11px] text-chess-muted font-mono tabular-nums">
            {moveLabel}
          </span>
          <button
            type="button"
            onClick={() => setBoardFlipped((f) => !f)}
            className="text-[11px] px-2.5 py-1 rounded-md border border-chess-border/60 text-chess-subtext hover:bg-chess-hover transition-colors"
          >
            Flip board
          </button>
        </div>

        {moves.length > 0 && (
          <div className="review-flow-coach">
            <MoveReviewPanel
              move={currentMove}
              moveIdx={currentMoveIdx}
              moves={moves}
              embedded
            />
          </div>
        )}

        <EvalChartPanel
          moves={moves}
          currentMoveIndex={currentMoveIdx}
          onMoveSelect={(idx) => selectMove(idx, true)}
          open={evalOpen}
          onOpenChange={setEvalOpen}
          integrated
        />
        </div>
      </div>

      <div className="border-t border-chess-border px-3 py-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-2">
          Moves
        </h2>
        <MoveList
          moves={moves}
          currentMoveIndex={currentMoveIdx}
          onMoveSelect={(idx) => selectMove(idx, true)}
          markGameEnd
          scrollActiveIntoView={false}
        />
      </div>
    </section>
  );

  const statsPanel = (
    <section
      className={`space-y-4 ${showStats ? "" : "hidden lg:block"}`}
      aria-label="Review statistics"
    >
      <div className="rounded-xl border border-chess-border bg-chess-panel shadow-sm overflow-hidden">
        <ReviewSummaryPanel
          summary={summary}
          whiteName={whiteName}
          blackName={blackName}
          moves={moves}
          onMoveClick={(idx) => selectMove(idx, true)}
        />
      </div>

      <p className="text-[11px] text-chess-muted text-center pb-2 lg:pb-0">
        <a href="/" className="text-chess-accent hover:underline font-medium">
          Review your own games on ChessReview
        </a>
      </p>
    </section>
  );

  return (
    <div className="h-[100dvh] bg-chess-bg text-chess-text font-sans flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-chess-border bg-chess-panel/95 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <a
              href="/"
              className="text-xs font-bold text-chess-accent hover:underline"
            >
              ChessReview
            </a>
            <h1 className="text-base sm:text-lg font-semibold mt-0.5 truncate">
              {whiteName} vs {blackName}
            </h1>
            <p className="text-[11px] text-chess-muted mt-0.5">
              Shared review · tap board edges to step moves
            </p>
          </div>
          <a
            href="/"
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-chess-border hover:bg-chess-hover transition-colors"
          >
            Analyze yours
          </a>
        </div>
      </header>

      <ShareTabBar tab={tab} onTab={setTab} />

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-review-scroll">
        <div className="max-w-6xl mx-auto px-4 py-4 lg:py-6 pb-8">
          <div className="lg:grid lg:grid-cols-[minmax(280px,400px)_minmax(0,1fr)] lg:gap-6 lg:items-start">
            {gamePanel}
            {statsPanel}
          </div>
        </div>
      </main>
    </div>
  );
}
