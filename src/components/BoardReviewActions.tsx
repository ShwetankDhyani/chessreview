import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReanalyzeButton } from "./ReanalyzeButton";
import { hapticSelection, hapticTap } from "../utils/chessSounds";

interface BoardReviewActionsProps {
  canReanalyze: boolean;
  canSave: boolean;
  canExportPgn: boolean;
  saving: boolean;
  isAnalyzing: boolean;
  saveMessage: string | null;
  onReanalyze: () => void;
  onSave: () => void;
  onDownloadPgn: () => void;
  onCopyPgn: () => void;
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

function DownloadIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

function CopyIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

type MenuPos = { top: number; left: number; placeAbove: boolean };

/** Export control: one tap opens Download / Copy (portaled so overflow parents can't clip it). */
function PgnExportMenu({
  disabled,
  compact,
  onDownload,
  onCopy,
}: {
  disabled: boolean;
  compact: boolean;
  onDownload: () => void;
  onCopy: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sizeClass = compact ? "h-8 w-8" : "h-9 w-9";
  const iconSize = compact ? 14 : 16;

  const updatePos = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuW = 176;
    const menuH = 112;
    const gap = 6;
    const pad = 8;
    const spaceBelow = window.innerHeight - r.bottom;
    const placeAbove = compact || spaceBelow < menuH + gap + pad;
    let top = placeAbove ? r.top - gap - menuH : r.bottom + gap;
    let left = compact ? r.left : r.left + r.width / 2 - menuW / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuW - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - menuH - pad));
    setPos({ top, left, placeAbove });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
  }, [open, compact]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePos();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, compact]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const menu =
    open && pos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Export PGN"
            className="fixed z-[200] w-44 overflow-hidden rounded-xl border border-chess-hairline-strong bg-chess-panel shadow-elev-4"
            style={{ top: pos.top, left: pos.left }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                hapticTap();
                setOpen(false);
                onDownload();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] font-semibold text-chess-text transition-colors hover:bg-chess-hover touch-manipulation"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-chess-accent/15 text-chess-accent">
                <DownloadIcon size={14} />
              </span>
              <span>
                <span className="block leading-tight">Download</span>
                <span className="block text-[10px] font-medium text-chess-muted">
                  Save .pgn file
                </span>
              </span>
            </button>
            <div className="h-px bg-chess-border/70" aria-hidden />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                hapticTap();
                setOpen(false);
                onCopy();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] font-semibold text-chess-text transition-colors hover:bg-chess-hover touch-manipulation"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-chess-surface text-chess-subtext ring-1 ring-chess-border">
                <CopyIcon size={14} />
              </span>
              <span>
                <span className="block leading-tight">Copy</span>
                <span className="block text-[10px] font-medium text-chess-muted">
                  Paste anywhere
                </span>
              </span>
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (disabled) return;
          hapticSelection();
          setOpen((v) => !v);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Export PGN"
        title="Export PGN"
        className={`inline-flex items-center justify-center ${sizeClass} rounded-lg border transition-colors touch-manipulation disabled:opacity-50 disabled:pointer-events-none ${
          open
            ? "border-chess-accent/45 bg-chess-surface text-chess-accent"
            : "border-chess-border-strong bg-chess-surface text-chess-subtext hover:text-chess-accent hover:border-chess-accent/40 hover:bg-chess-hover"
        }`}
      >
        <DownloadIcon size={iconSize} />
      </button>
      {menu}
    </div>
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
  onDownloadPgn,
  onCopyPgn,
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
        <PgnExportMenu
          onDownload={onDownloadPgn}
          onCopy={onCopyPgn}
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
