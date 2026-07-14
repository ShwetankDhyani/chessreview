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

  const depthLabelInner = (
    <>
      <span
        className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${
          ui.tone === "offline" ? "animate-pulse" : ""
        }`}
        aria-hidden
      />
      Depth
      <span className="sr-only">{ui.shortLabel}</span>
    </>
  );

  const depthLabel = depthLabelRetry ? (
    <button
      type="button"
      onClick={onRetry}
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${styles.label} hover:underline`}
      title={ui.title}
    >
      {depthLabelInner}
    </button>
  ) : (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${styles.label}`}
      title={ui.title}
    >
      {depthLabelInner}
    </span>
  );

  return (
    <>
      <div className="hidden lg:inline-flex items-center gap-2 h-9 px-2.5 rounded-lg border border-chess-border bg-chess-surface">
        {depthLabel}
        <div className="h-4 w-px bg-chess-border" aria-hidden />
        <div className="flex items-center gap-1">
          {depths.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDepthChange(d)}
              title={`${depthHint(d)} · ${ui.title}`}
              className={`text-xs px-2 py-0.5 rounded font-mono font-semibold transition-colors border ${
                depth === d ? styles.depthActive : styles.depthIdle
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:hidden relative">
        <button
          type="button"
          onClick={ui.tone === "offline" && onRetry ? onRetry : onToggleDepthMenu}
          className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border font-mono font-semibold text-xs transition-colors ${styles.mobileBtn}`}
          title={ui.title}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${
              ui.tone === "offline" ? "animate-pulse" : ""
            }`}
            aria-hidden
          />
          D{depth}
        </button>
        {showDepthMenu && (
          <div className="absolute right-0 top-full mt-1.5 bg-chess-panel border border-chess-border rounded-lg shadow-xl z-50 flex gap-1 p-1.5">
            {depths.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onDepthChange(d);
                  onCloseDepthMenu();
                }}
                className={`text-xs px-2 py-1 rounded font-mono font-semibold border ${
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
