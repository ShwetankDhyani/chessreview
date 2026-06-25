import { ReanalyzeButton } from "./ReanalyzeButton";

interface BoardReviewActionsProps {
  canReanalyze: boolean;
  canSave: boolean;
  canExportPgn: boolean;
  saving: boolean;
  isAnalyzing: boolean;
  saveMessage: string | null;
  onReanalyze: () => void;
  onSave: () => void;
  onExportPgn: () => void;
  className?: string;
  /** Inline icon row for mobile player bar — no message line */
  inline?: boolean;
}

function SaveGameButton({
  onSave,
  disabled,
  saving,
  compact,
}: {
  onSave: () => void;
  disabled: boolean;
  saving: boolean;
  compact: boolean;
}) {
  const sizeClass = compact ? "h-8 w-8" : "h-9 w-9";
  const iconSize = compact ? 14 : 16;

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={disabled}
      aria-label="Save game"
      title={saving ? "Saving game…" : "Save game"}
      className={`inline-flex items-center justify-center ${sizeClass} flex-shrink-0 rounded-lg border border-chess-border-strong bg-chess-surface text-chess-subtext hover:text-chess-accent hover:border-chess-accent/40 hover:bg-chess-hover transition-colors disabled:opacity-50 disabled:pointer-events-none touch-manipulation`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </svg>
    </button>
  );
}

function ExportPgnButton({
  onExport,
  disabled,
  compact,
}: {
  onExport: () => void;
  disabled: boolean;
  compact: boolean;
}) {
  const sizeClass = compact ? "h-8 w-8" : "h-9 w-9";
  const iconSize = compact ? 14 : 16;

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      aria-label="Export PGN"
      title="Export PGN"
      className={`inline-flex items-center justify-center ${sizeClass} flex-shrink-0 rounded-lg border border-chess-border-strong bg-chess-surface text-chess-subtext hover:text-chess-accent hover:border-chess-accent/40 hover:bg-chess-hover transition-colors disabled:opacity-50 disabled:pointer-events-none touch-manipulation`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}

/** Compact re-analyze, save, and export controls shown under the board (desktop) or inline (mobile). */
export function BoardReviewActions({
  canReanalyze,
  canSave,
  canExportPgn,
  saving,
  isAnalyzing,
  saveMessage,
  onReanalyze,
  onSave,
  onExportPgn,
  className = "",
  inline = false,
}: BoardReviewActionsProps) {
  if (!canReanalyze && !canSave && !canExportPgn && !saveMessage) return null;

  const buttons = (
    <>
      {canReanalyze && (
        <ReanalyzeButton
          onClick={onReanalyze}
          disabled={isAnalyzing}
          spinning={isAnalyzing}
          compact={inline}
        />
      )}
      <SaveGameButton
        onSave={onSave}
        disabled={!canSave || saving || isAnalyzing}
        saving={saving}
        compact={inline}
      />
      {canExportPgn && (
        <ExportPgnButton
          onExport={onExportPgn}
          disabled={isAnalyzing}
          compact={inline}
        />
      )}
    </>
  );

  if (inline) {
    if (!canReanalyze && !canSave && !canExportPgn) return null;
    return <div className={`flex items-center gap-1 ${className}`}>{buttons}</div>;
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="flex items-center gap-1.5">{buttons}</div>
      {saveMessage && (
        <p className="text-[11px] text-chess-subtext text-center">{saveMessage}</p>
      )}
    </div>
  );
}
