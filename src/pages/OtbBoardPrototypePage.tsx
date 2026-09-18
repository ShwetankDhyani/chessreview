import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { BoardArrowOverlay } from "../components/BoardArrowOverlay";
import { LastMoveSquareOverlay } from "../components/LastMoveSquareOverlay";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";

type ViewMode = "flat" | "soft" | "table";

const DEMO_FEN = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
const DEMO_FROM = "f1";
const DEMO_TO = "c4";
const BOARD_SIZE = 360;

const PRESETS: Record<
  ViewMode,
  { label: string; pitch: number; yaw: number; note: string }
> = {
  flat: {
    label: "Flat (today)",
    pitch: 0,
    yaw: 0,
    note: "Current review board — no perspective.",
  },
  soft: {
    label: "Soft OTB",
    pitch: 28,
    yaw: 0,
    note: "Light table tilt. Keeps arrows/evals readable.",
  },
  table: {
    label: "Table OTB",
    pitch: 52,
    yaw: -6,
    note: "Stronger across-the-table look. Pieces still flat sprites.",
  },
};

/**
 * Discardable prototype: CSS perspective OTB board.
 * Not wired into review flow — confirm before implementing.
 */
export default function OtbBoardPrototypePage() {
  usePageSeo({
    title: "OTB board prototype — ChessReview",
    description: "Prototype of an over-the-board 3D review board view.",
    path: "/otb-prototype",
    noindex: true,
  });

  const [mode, setMode] = useState<ViewMode>("table");
  const [pitch, setPitch] = useState(PRESETS.table.pitch);
  const [yaw, setYaw] = useState(PRESETS.table.yaw);
  const [showOverlays, setShowOverlays] = useState(true);

  const applyPreset = (next: ViewMode) => {
    setMode(next);
    setPitch(PRESETS[next].pitch);
    setYaw(PRESETS[next].yaw);
  };

  const transform = useMemo(() => {
    if (pitch === 0 && yaw === 0) return "none";
    return `rotateX(${pitch}deg) rotateZ(${yaw}deg)`;
  }, [pitch, yaw]);

  const isTilted = pitch !== 0 || yaw !== 0;
  const lift = isTilted ? Math.max(10, pitch * 0.55) : 0;

  return (
    <SiteChrome title="OTB prototype">
      <main className="otb-proto">
        <header className="otb-proto__header">
          <p className="otb-proto__badge">Prototype only — not live in reviews</p>
          <h1 className="otb-proto__title">Over-the-board board view</h1>
          <p className="otb-proto__lede">
            CSS perspective on the existing board. No WebGL yet. Confirm a
            direction before we wire this into review.
          </p>
        </header>

        <section className="otb-proto__stage" aria-label="Board preview">
          <div
            className="otb-proto__table"
            style={{ perspective: isTilted ? "1100px" : "none" }}
          >
            <div
              className="otb-proto__felt"
              style={{
                transform,
                transformStyle: "preserve-3d",
                marginBottom: lift,
              }}
            >
              <div
                className="otb-proto__board-frame"
                style={{ width: BOARD_SIZE }}
              >
                <Chessboard
                  position={DEMO_FEN}
                  boardWidth={BOARD_SIZE}
                  boardOrientation="white"
                  arePiecesDraggable={false}
                  showBoardNotation={!isTilted}
                  animationDuration={200}
                  customDarkSquareStyle={{ backgroundColor: "#769656" }}
                  customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
                  customSquareStyles={
                    showOverlays
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
                {showOverlays ? (
                  <>
                    <LastMoveSquareOverlay
                      from={DEMO_FROM}
                      to={DEMO_TO}
                      boardWidth={BOARD_SIZE}
                      boardOrientation="white"
                    />
                    <BoardArrowOverlay
                      from={DEMO_FROM}
                      to={DEMO_TO}
                      boardWidth={BOARD_SIZE}
                      boardOrientation="white"
                      variant="played"
                    />
                  </>
                ) : null}
              </div>
            </div>
            {isTilted ? <div className="otb-proto__shadow" aria-hidden /> : null}
          </div>
        </section>

        <section className="otb-proto__controls" aria-label="View controls">
          <div className="otb-proto__presets" role="tablist" aria-label="Presets">
            {(Object.keys(PRESETS) as ViewMode[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                className={`otb-proto__preset${mode === key ? " is-active" : ""}`}
                onClick={() => applyPreset(key)}
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
          <p className="otb-proto__note">{PRESETS[mode].note}</p>

          <label className="otb-proto__slider">
            <span>Pitch {pitch}°</span>
            <input
              type="range"
              min={0}
              max={68}
              value={pitch}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPitch(next);
                if (mode === "flat" && next > 0) setMode("soft");
              }}
            />
          </label>
          <label className="otb-proto__slider">
            <span>Yaw {yaw}°</span>
            <input
              type="range"
              min={-18}
              max={18}
              value={yaw}
              onChange={(e) => {
                const next = Number(e.target.value);
                setYaw(next);
                if (mode === "flat" && next !== 0) setMode("soft");
              }}
            />
          </label>
          <label className="otb-proto__check">
            <input
              type="checkbox"
              checked={showOverlays}
              onChange={(e) => setShowOverlays(e.target.checked)}
            />
            Show last-move highlight + arrow
          </label>
        </section>

        <section className="otb-proto__decide">
          <h2>What to confirm</h2>
          <ol>
            <li>
              <strong>A — Soft CSS tilt</strong> (~25–30°). Small change, overlays
              stay readable, pieces remain flat.
            </li>
            <li>
              <strong>B — Strong table CSS tilt</strong> (~50°). More OTB feel;
              foreshortening is stronger; pieces still sprites.
            </li>
            <li>
              <strong>C — Real WebGL 3D</strong> (standing pieces, true depth).
              Heavier: new renderer, overlay remapping, mobile perf work.
            </li>
            <li>
              <strong>Skip</strong> — keep flat board only.
            </li>
          </ol>
          <p className="otb-proto__decide-note">
            Reply with A, B, C, or Skip. Nothing ships into review until you
            confirm.
          </p>
        </section>
      </main>
    </SiteChrome>
  );
}
