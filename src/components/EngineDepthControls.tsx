import { hapticSelection } from "../utils/chessSounds";
import {
  ENGINE_TONE_STYLES,
  resolveEngineUi,
  type EngineBackend,
} from "../utils/engineUiStatus";

interface EngineDepthControlsProps {
  depth: number;
  engineBackend: EngineBackend;
  hasRemoteEngine: boolean;
  onDepthChange: (d: number) => void;
  onRetry?: () => void;
  showDepthMenu: boolean;
  onToggleDepthMenu: () => void;
  onCloseDepthMenu: () => void;
}

function depthOptions(
  hasRemoteEngine: boolean,
  engineBackend: EngineBackend
): readonly number[] {
  if (hasRemoteEngine || engineBackend === "native") {
    return [14, 16, 18] as const;
  }
  return import.meta.env.PROD ? ([14] as const) : ([14, 16, 18, 20, 24] as const);
}

function depthHint(d: number): string {
  if (d === 14) return "Default (recommended)";
  if (d === 16) return "Stronger, slower than default";
  if (d === 18) return "Deep (long waits)";
  return "Max";
}

export function EngineDepthControls({
  depth,
  engineBackend,
  hasRemoteEngine,
  onDepthChange,
  onRetry,
  showDepthMenu,
  onToggleDepthMenu,
  onCloseDepthMenu,
}: EngineDepthControlsProps) {
  const ui = resolveEngineUi(engineBackend, hasRemoteEngine);
  const styles = ENGINE_TONE_STYLES[ui.tone];
  const depths = depthOptions(hasRemoteEngine, engineBackend);
  const depthLabelRetry = ui.tone === "offline" && onRetry;

  const statusDot = (
    <span
      className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${
        ui.tone === "offline" ? "animate-pulse" : ""
      }`}
      aria-hidden
    />
  );

  const depthLabel = depthLabelRetry ? (
    <button
      type="button"
      onClick={onRetry}
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${styles.label} hover:underline`}
      title={ui.title}
    >
      {statusDot}
      Depth
      <span className="sr-only">{ui.shortLabel}</span>
    </button>
  ) : (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${styles.label}`}
      title={ui.title}
    >
      {statusDot}
      Depth
      <span className="sr-only">{ui.shortLabel}</span>
    </span>
  );

  return (
    <>
      {/* Desktop: segmented depth strip */}
      <div className="hidden lg:inline-flex h-9 items-center gap-2 rounded-lg border border-chess-border-strong bg-chess-surface/90 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {depthLabel}
        <div className="h-4 w-px bg-chess-border" aria-hidden />
        <div
          className="flex items-center gap-0.5 rounded-md bg-chess-bg/50 p-0.5"
          role="group"
          aria-label="Analysis depth"
        >
          {depths.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                hapticSelection();
                onDepthChange(d);
              }}
              title={`${depthHint(d)} · ${ui.title}`}
              className={`min-w-[1.85rem] rounded px-1.5 py-0.5 font-mono text-[11px] font-bold transition-all ${
                depth === d
                  ? styles.depthActive
                  : `${styles.depthIdle} border-transparent`
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: compact depth chip */}
      <div className="relative lg:hidden">
        <button
          type="button"
          onClick={() => {
            hapticSelection();
            (ui.tone === "offline" && onRetry ? onRetry : onToggleDepthMenu)();
          }}
          aria-expanded={showDepthMenu}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-xs font-bold transition-colors ${styles.mobileBtn}`}
          title={ui.title}
        >
          {statusDot}
          D{depth}
        </button>
        {showDepthMenu && (
          <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 flex gap-0.5 rounded-xl border border-chess-hairline-strong bg-chess-panel p-1.5 shadow-elev-4">
            {depths.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  hapticSelection();
                  onDepthChange(d);
                  onCloseDepthMenu();
                }}
                className={`min-w-[2rem] rounded-md px-2 py-1.5 font-mono text-xs font-bold border ${
                  depth === d ? styles.depthActive : styles.depthIdle
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
