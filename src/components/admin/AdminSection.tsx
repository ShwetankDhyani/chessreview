import { useEffect, useId, useState, type ReactNode } from "react";
import { hapticSelection } from "../../utils/chessSounds";

type Props = {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/** Foldable control-panel section with persisted open state. */
export function AdminSection({
  id,
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: Props) {
  const storageKey = `cr_admin_section_${id}`;
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "1") return true;
      if (saved === "0") return false;
    } catch {
      /* ignore */
    }
    return defaultOpen;
  });
  const panelId = useId();

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, storageKey]);

  return (
    <section className="overflow-hidden rounded-xl border border-chess-border bg-chess-panel">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          hapticSelection();
          setOpen((v) => !v);
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-chess-hover/40"
      >
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-chess-border/80 bg-chess-bg/50 text-chess-muted transition-transform ${
            open ? "rotate-90 text-chess-accent" : ""
          }`}
          aria-hidden
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3.2 1.2l4.2 3.8-4.2 3.8V1.2z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-chess-text">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-[11px] leading-snug text-chess-muted">
              {description}
            </span>
          ) : null}
        </span>
        {badge ? (
          <span className="flex-shrink-0 rounded-md border border-chess-border/70 bg-chess-bg/40 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-chess-muted">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          className="border-t border-chess-border/60 px-4 py-4"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
