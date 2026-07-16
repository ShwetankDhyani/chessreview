import { useEffect, useRef, type FormEvent } from "react";
import { FeedbackSettings } from "./FeedbackSettings";
import {
  hapticSelection,
  hapticTap,
  notifyWarning,
} from "../utils/chessSounds";

export type HeaderProfile = {
  name: string;
  platform: "chesscom" | "lichess";
};

interface ProfileMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  profiles: HeaderProfile[];
  activeProfileIdx: number;
  activeUser: HeaderProfile | null;
  onSwitchProfile: (idx: number) => void;
  onRemoveProfile: (idx: number) => void;
  addPlatform: "chesscom" | "lichess";
  onAddPlatformChange: (p: "chesscom" | "lichess") => void;
  addName: string;
  onAddNameChange: (v: string) => void;
  addLoading: boolean;
  addError: string | null;
  onAddSubmit: () => void;
  onCancelAdd: () => void;
  savedCount: number;
  savedLoading: boolean;
  onOpenSavedGames: () => void;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 text-chess-muted transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <svg
      className="h-4 w-4 text-chess-subtext"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </svg>
  );
}

function PlatformBadge({ platform }: { platform: "chesscom" | "lichess" }) {
  const isLichess = platform === "lichess";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider ${
        isLichess
          ? "bg-[#b58863]/20 text-[#d4b896]"
          : "bg-chess-accent/15 text-chess-accent"
      }`}
    >
      {isLichess ? "Lichess" : "Chess.com"}
    </span>
  );
}

function RemoveIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
    </svg>
  );
}

function initialOf(name: string) {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

/** Header account control + profile / prefs panel. */
export function ProfileMenu({
  open,
  onToggle,
  onClose,
  profiles,
  activeProfileIdx,
  activeUser,
  onSwitchProfile,
  onRemoveProfile,
  addPlatform,
  onAddPlatformChange,
  addName,
  onAddNameChange,
  addLoading,
  addError,
  onAddSubmit,
  onCancelAdd,
  savedCount,
  savedLoading,
  onOpenSavedGames,
}: ProfileMenuProps) {
  const profileInitial = activeUser ? initialOf(activeUser.name) : null;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    if (addName.trim() && !addLoading) onAddSubmit();
  }

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => {
          hapticSelection();
          onToggle();
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={activeUser ? `Profile: ${activeUser.name}` : "Sign in"}
        className={`group inline-flex h-9 items-center gap-2 rounded-lg border px-2 sm:px-2.5 transition-all duration-150
          ${
            open
              ? "border-chess-accent/45 bg-chess-surface shadow-[inset_0_0_0_1px_rgba(129,182,76,0.12)]"
              : "border-chess-border-strong bg-chess-surface/90 hover:border-chess-accent/35 hover:bg-chess-hover"
          }`}
      >
        {activeUser ? (
          <>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-chess-accent to-chess-accent/70 text-[11px] font-bold text-white shadow-sm ring-1 ring-white/10 select-none">
              {profileInitial}
            </span>
            <span className="hidden sm:block max-w-[7.5rem] truncate text-left">
              <span className="block text-[13px] font-semibold leading-tight text-chess-text">
                {activeUser.name}
              </span>
              <span className="block text-[9px] font-medium leading-tight text-chess-muted">
                {activeUser.platform === "lichess" ? "Lichess" : "Chess.com"}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chess-bg/80 ring-1 ring-chess-border">
              <UserGlyph />
            </span>
            <span className="hidden sm:inline text-[13px] font-semibold text-chess-text">
              Sign in
            </span>
          </>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Account"
          className="fixed left-2 right-2 top-[calc(var(--app-header-h)+0.35rem)] z-[70] flex max-h-[min(78dvh,560px)] flex-col overflow-hidden rounded-2xl border border-chess-border/90 bg-chess-panel shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03)]
            lg:absolute lg:inset-auto lg:right-0 lg:top-[calc(100%+0.4rem)] lg:left-auto lg:w-[19.5rem]"
        >
          <div className="flex items-center justify-between border-b border-chess-border/70 bg-chess-bg/40 px-3.5 py-2.5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-chess-muted">
                Account
              </p>
              <p className="mt-0.5 text-[12px] text-chess-subtext">
                {profiles.length === 0
                  ? "Link a Chess.com or Lichess profile"
                  : `${profiles.length} of 5 profiles`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-chess-muted transition-colors hover:bg-chess-hover hover:text-chess-text lg:hidden"
              aria-label="Close"
            >
              <RemoveIcon />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {profiles.length > 0 && (
              <section className="border-b border-chess-border/70 py-1.5">
                <p className="px-3.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-chess-muted">
                  Profiles
                </p>
                <ul className="flex flex-col gap-0.5 px-1.5">
                  {profiles.map((p, i) => {
                    const active = i === activeProfileIdx;
                    return (
                      <li key={`${p.platform}-${p.name}`}>
                        <div
                          className={`rounded-xl transition-colors ${
                            active
                              ? "bg-chess-accent/[0.12] ring-1 ring-chess-accent/25"
                              : "hover:bg-chess-hover/70"
                          }`}
                        >
                          <div className="flex items-center gap-1 pr-1">
                            <button
                              type="button"
                              onClick={() => {
                                hapticSelection();
                                onSwitchProfile(i);
                                onClose();
                              }}
                              className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left"
                            >
                              <span
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold select-none ${
                                  active
                                    ? "bg-chess-accent text-white"
                                    : "bg-chess-surface text-chess-subtext ring-1 ring-chess-border"
                                }`}
                              >
                                {initialOf(p.name)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block truncate text-[13px] font-semibold leading-tight ${
                                    active ? "text-chess-accent" : "text-chess-text"
                                  }`}
                                >
                                  {p.name}
                                </span>
                                <span className="mt-0.5 block">
                                  <PlatformBadge platform={p.platform} />
                                </span>
                              </span>
                              {active && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-chess-accent">
                                  Active
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                notifyWarning();
                                onRemoveProfile(i);
                              }}
                              title="Remove profile"
                              aria-label={`Remove ${p.name}`}
                              className="mr-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-chess-muted transition-colors hover:bg-move-blunder/20 hover:text-move-blunder"
                            >
                              <RemoveIcon />
                            </button>
                          </div>
                          {active && activeUser && (
                            <button
                              type="button"
                              onClick={() => {
                                hapticTap();
                                onOpenSavedGames();
                              }}
                              className="mx-1.5 mb-1.5 flex w-[calc(100%-0.75rem)] items-center justify-between gap-2 rounded-lg border border-chess-border/60 bg-chess-bg/50 px-2.5 py-1.5 text-left transition-colors hover:border-chess-accent/30 hover:bg-chess-hover/50"
                            >
                              <span className="text-[12px] font-medium text-chess-subtext">
                                Saved games
                              </span>
                              <span className="rounded-md bg-chess-surface px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-chess-muted ring-1 ring-chess-border">
                                {savedLoading ? "…" : savedCount}
                              </span>
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {profiles.length < 5 ? (
              <section className="border-b border-chess-border/70 px-3.5 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-chess-muted">
                  Add profile
                </p>
                <div
                  className="mb-2 grid grid-cols-2 gap-0.5 rounded-lg bg-chess-bg/80 p-0.5 ring-1 ring-chess-border/80"
                  role="group"
                  aria-label="Platform"
                >
                  {(
                    [
                      ["chesscom", "Chess.com"],
                      ["lichess", "Lichess"],
                    ] as const
                  ).map(([id, label]) => {
                    const selected = addPlatform === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          hapticSelection();
                          onAddPlatformChange(id);
                        }}
                        className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                          selected
                            ? id === "lichess"
                              ? "bg-[#b58863] text-white shadow-sm"
                              : "bg-chess-accent text-white shadow-sm"
                            : "text-chess-muted hover:text-chess-text"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <form onSubmit={submitAdd} className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => onAddNameChange(e.target.value)}
                      placeholder="Username"
                      autoComplete="username"
                      className="min-w-0 flex-1 rounded-lg border border-chess-border bg-chess-bg/70 px-2.5 py-2 text-[13px] text-chess-text placeholder:text-chess-muted/70 focus:border-chess-accent/50 focus:outline-none focus:ring-1 focus:ring-chess-accent/25"
                    />
                    <button
                      type="submit"
                      disabled={!addName.trim() || addLoading}
                      className="inline-flex min-w-[3.25rem] items-center justify-center rounded-lg bg-chess-accent px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-chess-accent-hover disabled:opacity-40"
                    >
                      {addLoading ? (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "Add"
                      )}
                    </button>
                  </div>
                  {addLoading && (
                    <button
                      type="button"
                      onClick={onCancelAdd}
                      className="self-start text-[11px] font-medium text-chess-muted underline-offset-2 hover:text-chess-text hover:underline"
                    >
                      Cancel request
                    </button>
                  )}
                  {addError && (
                    <p className="rounded-lg border border-chess-border/70 bg-chess-bg/50 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-chess-subtext">
                      {addError}
                    </p>
                  )}
                </form>
              </section>
            ) : (
              <p className="border-b border-chess-border/70 px-3.5 py-3 text-center text-[12px] text-chess-muted">
                Maximum of 5 profiles reached.
              </p>
            )}

            <section className="px-1 pb-1 pt-1">
              <p className="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-chess-muted">
                Preferences
              </p>
              <FeedbackSettings className="border-0 px-2 py-1" />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
