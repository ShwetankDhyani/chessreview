interface WelcomeBannerProps {
  onDismiss: () => void;
}

/** A quiet introduction that leaves the game import controls in view. */
export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <section className="welcome-note relative overflow-hidden rounded-2xl border border-chess-accent/20 p-4 pr-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-chess-accent">
        Free · Unlimited · No ads
      </p>
      <h2 className="mt-2 text-lg font-extrabold leading-snug tracking-tight text-chess-text">
        Every game has a lesson.
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-chess-subtext">
        Bring a game. Find your best moves, missed chances, and what to work on next.
      </p>
      <button type="button" onClick={onDismiss}
        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-chess-muted transition-colors hover:bg-white/5 hover:text-chess-text"
        aria-label="Dismiss welcome message">×</button>
    </section>
  );
}
