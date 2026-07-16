/** Public “Pinned” label with pin icon — shown to all visitors. */
export function BlogPinnedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded border border-chess-accent/30 bg-chess-accent/12 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-chess-accent ${className}`}
      title="Pinned"
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
        className="shrink-0 opacity-95"
      >
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2V22h1.6v-6H18v-2l-2-2z" />
      </svg>
      Pinned
    </span>
  );
}
