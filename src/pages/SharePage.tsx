import { useEffect, useMemo, useState } from "react";
import { ReviewSummaryPanel } from "../components/ReviewSummary";
import { EvalChartPanel } from "../components/EvalChartPanel";
import { ReviewChessboard } from "../components/ReviewChessboard";
import { EvalBar } from "../components/EvalBar";
import { MoveList } from "../components/MoveList";
import { fetchSharedReview } from "../utils/shareReview";
import { usePageSeo } from "../hooks/usePageSeo";
import { shareReviewJsonLd } from "../utils/seo";
import type { AnalyzedMove } from "../types";

function shareIdFromPath(): string {
  const path = window.location.pathname.replace(/\/$/, "");
  const match = path.match(/^\/r\/([^/]+)$/);
  return match?.[1] ?? "";
}

function lastMoveFromUci(uci: string | undefined) {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

export default function SharePage() {
  const shareId = shareIdFromPath();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);
  const [summary, setSummary] = useState<import("../types").ReviewSummary | null>(null);
  const [whiteName, setWhiteName] = useState("White");
  const [blackName, setBlackName] = useState("Black");
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [evalOpen, setEvalOpen] = useState(true);

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
        setCurrentMoveIdx(data.moves.length > 0 ? data.moves.length - 1 : -1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [shareId]);

  const currentMove = currentMoveIdx >= 0 ? moves[currentMoveIdx] : null;
  const boardFen = useMemo(() => {
    if (currentMove) return currentMove.fenAfter;
    if (moves[0]) return moves[0].fenBefore;
    return "start";
  }, [currentMove, moves]);

  const currentEval = currentMove?.evalAfter ?? moves[0]?.evalBefore ?? null;
  const lastMoveHighlight = lastMoveFromUci(currentMove?.uci);

  if (loading) {
    return (
      <div className="min-h-screen bg-chess-bg text-chess-text flex items-center justify-center">
        <p className="text-sm text-chess-muted">Loading review…</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-chess-bg text-chess-text flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-chess-muted">{error ?? "Review not found"}</p>
        <a href="/" className="text-sm text-chess-accent hover:underline">Go to ChessReview</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text flex flex-col">
      <header className="border-b border-chess-border bg-chess-panel/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <a href="/" className="text-sm font-bold text-chess-accent hover:underline">ChessReview</a>
            <h1 className="text-base font-semibold mt-1">
              {whiteName} vs {blackName}
            </h1>
            <p className="text-xs text-chess-muted mt-0.5">Shared game review</p>
          </div>
          <a
            href="/"
            className="text-xs px-3 py-1.5 rounded-lg border border-chess-border hover:bg-chess-hover"
          >
            Review your own games
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-4">
          <ReviewSummaryPanel
            summary={summary}
            whiteName={whiteName}
            blackName={blackName}
            moves={moves}
            onMoveClick={setCurrentMoveIdx}
          />
          <EvalChartPanel
            moves={moves}
            currentMoveIndex={currentMoveIdx}
            onMoveSelect={setCurrentMoveIdx}
            open={evalOpen}
            onOpenChange={setEvalOpen}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-stretch gap-2 justify-center">
            <EvalBar evalResult={currentEval} boardFlipped={boardFlipped} barHeight={320} />
            <ReviewChessboard
              position={boardFen}
              boardWidth={320}
              boardOrientation={boardFlipped ? "black" : "white"}
              animationDuration={0}
              dimmed={false}
              continuationActive={false}
              lastMoveHighlight={lastMoveHighlight}
              continuationArrow={null}
              showBestMoveArrow={false}
            />
          </div>
          <div className="flex justify-between text-xs text-chess-muted px-1">
            <span>{whiteName}</span>
            <button type="button" onClick={() => setBoardFlipped((f) => !f)} className="hover:text-chess-accent">
              Flip
            </button>
            <span>{blackName}</span>
          </div>
          <MoveList
            moves={moves}
            currentMoveIndex={currentMoveIdx}
            onMoveSelect={setCurrentMoveIdx}
            markGameEnd
          />
        </div>
      </main>
    </div>
  );
}
