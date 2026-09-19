import { Suspense, lazy, useCallback, useState } from "react";
import { Chessboard } from "react-chessboard";
import { BoardArrowOverlay } from "../components/BoardArrowOverlay";
import { LastMoveSquareOverlay } from "../components/LastMoveSquareOverlay";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import { useBoardView } from "../hooks/useBoardView";
import type { BoardView } from "../utils/boardView";

const OtbChessboard3d = lazy(() => import("../components/OtbChessboard3d"));

/** Position before Bc4 develops. */
const DEMO_BEFORE =
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 3 4";
/** After Bf1-c4 (black to move). */
const DEMO_AFTER =
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 4";
const DEMO_FROM = "f1";
const DEMO_TO = "c4";
const BOARD_SIZE = 360;
const DEMO_ANIM_MS = 560;

/**
 * Discardable comparison page for flat vs WebGL OTB.
 * Preference syncs with the review board toggle via localStorage.
 */
export default function OtbBoardPrototypePage() {
  usePageSeo({
    title: "3D Over-The-Board View — Realistic Chessboard | ChessReview",
    description:
      "Experience realistic 3D over-the-board chess reviews with luxury Staunton pieces, natural woodcraft, and orbital perspective controls on desktop and mobile.",
    path: "/otb",
  });

  const [boardView, setBoardView] = useBoardView();
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [played, setPlayed] = useState(true);
  const [animMs, setAnimMs] = useState(0);

  const fen = played ? DEMO_AFTER : DEMO_BEFORE;
  const highlight = played
    ? { from: DEMO_FROM, to: DEMO_TO }
    : null;

  const setMode = (next: BoardView) => setBoardView(next);

  const replayMove = useCallback(() => {
    setAnimMs(0);
    setPlayed(false);
    // Let the "before" position commit/paint, then glide to the after FEN.
    window.setTimeout(() => {
      setAnimMs(DEMO_ANIM_MS);
      setPlayed(true);
    }, 48);
  }, []);

  const stepBack = useCallback(() => {
    setAnimMs(DEMO_ANIM_MS);
    setPlayed(false);
  }, []);

  return (
    <SiteChrome title="3D Board">
      <main className="otb-proto">
        <header className="otb-proto__header">
          <p className="otb-proto__badge">Realistic 3D Chessboard</p>
          <h1 className="otb-proto__title">Over-the-board 3D review</h1>
          <p className="otb-proto__lede">
            Experience matches with luxury carved Staunton pieces, natural wood textures,
            directional lighting, and 3D orbit controls. Switch seamlessly between
            classic 2D and 3D anytime during game review.
          </p>
        </header>

        <section className="otb-proto__stage" aria-label="Board preview">
          {boardView === "otb3d" ? (
            <Suspense
              fallback={
                <div
                  className="aspect-square w-full max-w-[360px] mx-auto animate-pulse bg-chess-panel/60"
                  aria-label="Loading 3D board"
                />
              }
            >
              <div className="mx-auto" style={{ width: BOARD_SIZE }}>
                <OtbChessboard3d
                  position={fen}
                  boardWidth={BOARD_SIZE}
                  boardOrientation={orientation}
                  animationDuration={animMs}
                  lastMoveHighlight={highlight}
                  continuationArrow={null}
                  showBestMoveArrow={false}
                  moveClassification={played ? "good" : undefined}
                />
              </div>
            </Suspense>
          ) : (
            <div
              className="relative mx-auto"
              style={{ width: BOARD_SIZE }}
            >
              <Chessboard
                position={fen}
                boardWidth={BOARD_SIZE}
                boardOrientation={orientation}
                arePiecesDraggable={false}
                showBoardNotation
                animationDuration={animMs}
                customDarkSquareStyle={{ backgroundColor: "#769656" }}
                customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
                customSquareStyles={
                  highlight
                    ? {
                        [DEMO_FROM]: {
                          backgroundColor: "rgba(247, 201, 72, 0.72)",
                        },
                        [DEMO_TO]: {
                          backgroundColor: "rgba(247, 201, 72, 0.52)",
                        },
                      }
                    : {}
                }
              />
              {highlight ? (
                <>
                  <LastMoveSquareOverlay
                    from={DEMO_FROM}
                    to={DEMO_TO}
                    boardWidth={BOARD_SIZE}
                    boardOrientation={orientation}
                  />
                  <BoardArrowOverlay
                    from={DEMO_FROM}
                    to={DEMO_TO}
                    boardWidth={BOARD_SIZE}
                    boardOrientation={orientation}
                    variant="played"
                  />
                </>
              ) : null}
            </div>
          )}
        </section>

        <section className="otb-proto__controls" aria-label="View controls">
          <div className="otb-proto__presets" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={boardView === "2d"}
              className={`otb-proto__preset${boardView === "2d" ? " is-active" : ""}`}
              onClick={() => setMode("2d")}
            >
              Flat 2D
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={boardView === "otb3d"}
              className={`otb-proto__preset${boardView === "otb3d" ? " is-active" : ""}`}
              onClick={() => setMode("otb3d")}
            >
              WebGL OTB
            </button>
            <button
              type="button"
              className="otb-proto__preset"
              onClick={() =>
                setOrientation((o) => (o === "white" ? "black" : "white"))
              }
            >
              Flip seat ({orientation})
            </button>
            <button
              type="button"
              className="otb-proto__preset"
              onClick={replayMove}
            >
              Replay Bc4 glide
            </button>
            <button
              type="button"
              className="otb-proto__preset"
              onClick={stepBack}
              disabled={!played}
            >
              Step back
            </button>
          </div>
          <p className="otb-proto__note">
            {boardView === "otb3d"
              ? "Drag to orbit. Replay Bc4 glide plays an authentic Harry-Potter-style piece slide."
              : "Classic flat review board."}
          </p>
        </section>

        <section className="mt-8 pt-6 border-t border-chess-border/60 max-w-xl mx-auto space-y-4 text-left">
          <h2 className="text-sm font-bold uppercase tracking-wider text-chess-accent">
            Crafted for Game Review
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-chess-subtext leading-relaxed">
            <div className="rounded-xl border border-chess-border/60 bg-chess-panel/50 p-3.5 space-y-1">
              <div className="font-semibold text-chess-text">Luxury Staunton Sculpting</div>
              <p>
                Classical, weighted Staunton silhouettes with flared knight manes and tiered
                crowns for crystal-clear identification from top-down or angled perspectives.
              </p>
            </div>
            <div className="rounded-xl border border-chess-border/60 bg-chess-panel/50 p-3.5 space-y-1">
              <div className="font-semibold text-chess-text">Natural Woodcraft & Textures</div>
              <p>
                Warm maple and rich dark walnut wood grains with directional studio lighting,
                natural reflections, and soft contact shadows.
              </p>
            </div>
            <div className="rounded-xl border border-chess-border/60 bg-chess-panel/50 p-3.5 space-y-1">
              <div className="font-semibold text-chess-text">Mobile-Optimized Perspective</div>
              <p>
                Calibrated camera framing tailored specifically for mobile viewports, keeping the
                3D board prominent without occluding move analysis or evaluation charts.
              </p>
            </div>
            <div className="rounded-xl border border-chess-border/60 bg-chess-panel/50 p-3.5 space-y-1">
              <div className="font-semibold text-chess-text">Instant 2D / 3D Toggle</div>
              <p>
                Switch between high-speed 2D review and tactile 3D immersion with a single tap.
                Your view preference is remembered automatically.
              </p>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}

