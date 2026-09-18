import { Suspense, lazy, useState } from "react";
import { Chessboard } from "react-chessboard";
import { BoardArrowOverlay } from "../components/BoardArrowOverlay";
import { LastMoveSquareOverlay } from "../components/LastMoveSquareOverlay";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import { useBoardView } from "../hooks/useBoardView";
import type { BoardView } from "../utils/boardView";

const OtbChessboard3d = lazy(() => import("../components/OtbChessboard3d"));

const DEMO_FEN =
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
const DEMO_FROM = "f1";
const DEMO_TO = "c4";
const BOARD_SIZE = 360;

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

  const setMode = (next: BoardView) => setBoardView(next);

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
                  position={DEMO_FEN}
                  boardWidth={BOARD_SIZE}
                  boardOrientation={orientation}
                  lastMoveHighlight={{ from: DEMO_FROM, to: DEMO_TO }}
                  continuationArrow={null}
                  showBestMoveArrow={false}
                  moveClassification="good"
                />
              </div>
            </Suspense>
          ) : (
            <div
              className="relative mx-auto"
              style={{ width: BOARD_SIZE }}
            >
              <Chessboard
                position={DEMO_FEN}
                boardWidth={BOARD_SIZE}
                boardOrientation={orientation}
                arePiecesDraggable={false}
                showBoardNotation
                animationDuration={200}
                customDarkSquareStyle={{ backgroundColor: "#769656" }}
                customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
                customSquareStyles={{
                  [DEMO_FROM]: {
                    backgroundColor: "rgba(247, 201, 72, 0.72)",
                  },
                  [DEMO_TO]: {
                    backgroundColor: "rgba(247, 201, 72, 0.52)",
                  },
                }}
              />
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
          </div>
          <p className="otb-proto__note">
            {boardView === "otb3d"
              ? "Drag to orbit. Flip walks you to the other side of the table."
              : "Classic flat review board."}
          </p>
        </section>
      </main>
    </SiteChrome>
  );
}
