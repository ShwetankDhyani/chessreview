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
    title: "OTB board prototype — ChessReview",
    description: "Prototype of an over-the-board 3D review board view.",
    path: "/otb-prototype",
    noindex: true,
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
    <SiteChrome title="OTB prototype">
      <main className="otb-proto">
        <header className="otb-proto__header">
          <p className="otb-proto__badge">WebGL OTB — wired into review toggle</p>
          <h1 className="otb-proto__title">Over-the-board 3D board</h1>
          <p className="otb-proto__lede">
            Real Three.js board with standing pieces. Same preference as the
            review 2D / 3D toggle (saved locally).
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
              ? "Drag to orbit. Replay Bc4 glide plays a Harry-Potter-style piece slide."
              : "Classic flat review board."}
          </p>
        </section>
      </main>
    </SiteChrome>
  );
}
