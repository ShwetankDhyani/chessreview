/** Public “Pinned” label with pin icon — shown to all visitors. */
export function BlogPinnedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-chess-accent/35 bg-chess-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-chess-accent ${className}`}
      title="Pinned"
    >
      <svg
        width="10"
        height="10"
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
