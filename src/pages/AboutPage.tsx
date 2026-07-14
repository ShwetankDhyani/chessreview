import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { usePageSeo } from "../hooks/usePageSeo";

const CHESSCOM_USERNAME = "ShwetankDhyani";
const CHESSCOM_PROFILE = `https://www.chess.com/member/${CHESSCOM_USERNAME.toLowerCase()}`;
/** Chess.com preserves this return URL after login — closest public “message me” deep link. */
const CHESSCOM_COMPOSE = `https://www.chess.com/messages/compose?to=${CHESSCOM_USERNAME}`;
const PAGE_SIZE = 8;

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
};

type CommentsResponse = {
  items: Comment[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

async function fetchComments(page: number): Promise<CommentsResponse> {
  const res = await fetch(
    `/api/about-comments?page=${encodeURIComponent(String(page))}&pageSize=${PAGE_SIZE}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not load comments"
    );
  }
  return data as CommentsResponse;
}

export default function AboutPage() {
  usePageSeo({
    title: "About — ChessReview",
    description:
      "ChessReview is a personal project that grew into a free place to review chess games — sync Chess.com, save studies, leave a note for Shwetank.",
    path: "/about",
  });

  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchComments(p);
      setComments(data.items ?? []);
      setPage(data.page ?? p);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
      setTotal(data.total ?? 0);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load comments");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitMsg(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/about-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not post comment"
        );
      }
      setName("");
      setBody("");
      setSubmitMsg("Thanks — your note is up.");
      await load(1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text">
      <header className="border-b border-chess-border bg-chess-panel/80">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-start justify-between gap-3">
          <div>
            <a
              href="/"
              className="text-sm font-bold text-chess-accent hover:underline"
            >
              ← ChessReview
            </a>
            <h1 className="text-lg font-bold mt-2">About</h1>
          </div>
          <a
            href={CHESSCOM_COMPOSE}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 rounded-lg border border-chess-accent/40 bg-chess-accent/15 px-3 py-2 text-xs font-semibold text-chess-accent hover:bg-chess-accent/25 transition-colors"
          >
            <MessageIcon />
            Contact
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10 pb-16">
        <article className="space-y-5 text-sm text-chess-subtext leading-relaxed">
          <p className="text-chess-muted text-[11px] uppercase tracking-wider font-semibold">
            A short note from the builder
          </p>

          <p className="text-base text-chess-text leading-relaxed">
            ChessReview started as a personal project — something I wanted for
            myself: review games without friction, sync with Chess.com, save the
            ones worth coming back to, and keep the whole thing uncomplicated.
          </p>

          <p>
            We are not perfect. Features will keep evolving, edges will need
            polish, and some days the engine path is slower than we like. Still,
            we have built the kind of board-side companion we actually want to
            use: load a game, see the story of the moves, share a review when it
            matters — without paywalls or clutter.
          </p>

          <p>
            What surprised us is how many players from around the world found
            their way here organically. No big campaign — just people studying
            chess, one game at a time. Watching reviews light up from places we
            have never been is one of the quieter joys of shipping this.
          </p>

          <p className="text-chess-text">
            Thank you for being here. If ChessReview has helped a session or two,
            that already means more than we expected when this was just a
            weekend idea.
          </p>

          <p>
            If you feel like saying hello, leave a comment below — or message me
            on Chess.com. I read both.
          </p>

          <footer className="pt-6 mt-2 border-t border-chess-border/80 space-y-4">
            <div>
              <p className="text-chess-text font-semibold">Shwetank Dhyani</p>
              <p className="text-chess-muted text-xs mt-0.5">
                Builder of ChessReview.org
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={CHESSCOM_PROFILE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-chess-border bg-chess-surface/80 px-3 py-2 text-xs font-medium text-chess-subtext hover:border-chess-accent/40 hover:text-chess-accent transition-colors"
              >
                <ChessComGlyph />
                chess.com/{CHESSCOM_USERNAME}
              </a>
              <a
                href={CHESSCOM_COMPOSE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-chess-accent/40 bg-chess-accent/15 px-3 py-2 text-xs font-semibold text-chess-accent hover:bg-chess-accent/25 transition-colors"
              >
                <MessageIcon />
                Message on Chess.com
              </a>
            </div>

            <p className="text-[11px] text-chess-muted leading-relaxed">
              The contact button opens Chess.com’s message compose for{" "}
              <span className="text-chess-subtext">{CHESSCOM_USERNAME}</span>.
              You may need to be signed in; if the recipient field is empty,
              search for that username once.
            </p>
          </footer>
        </article>

        <section
          id="comments"
          className="rounded-xl border border-chess-border bg-chess-panel/60 p-4 sm:p-5 space-y-5"
        >
          <div>
            <h2 className="text-base font-bold text-chess-text">Comments</h2>
            <p className="text-xs text-chess-muted mt-1">
              Say thanks, share a thought, or just leave a mark. Newest first.
              {total > 0 ? ` ${total} note${total === 1 ? "" : "s"} so far.` : ""}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {/* Honeypot — hidden from users */}
            <label className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
              Website
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
              />
            </label>

            <div>
              <label
                htmlFor="about-name"
                className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1"
              >
                Name
              </label>
              <input
                id="about-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
                placeholder="How should we show you?"
                className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text placeholder:text-chess-muted/70 focus:outline-none focus:border-chess-accent/50"
              />
            </div>
            <div>
              <label
                htmlFor="about-body"
                className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1"
              >
                Comment
              </label>
              <textarea
                id="about-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={600}
                required
                rows={3}
                placeholder="A short note for the guestbook…"
                className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text placeholder:text-chess-muted/70 focus:outline-none focus:border-chess-accent/50 resize-y min-h-[5rem]"
              />
              <p className="text-[10px] text-chess-muted mt-1 text-right">
                {body.length}/600
              </p>
            </div>

            {submitError && (
              <p className="text-xs text-red-400/90">{submitError}</p>
            )}
            {submitMsg && (
              <p className="text-xs text-chess-accent">{submitMsg}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto rounded-lg border border-chess-accent/40 bg-chess-accent/20 px-4 py-2 text-sm font-semibold text-chess-accent hover:bg-chess-accent/30 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Posting…" : "Post comment"}
            </button>
          </form>

          <div className="border-t border-chess-border/70 pt-4 space-y-3">
            {loading && (
              <p className="text-xs text-chess-muted py-4 text-center">
                Loading comments…
              </p>
            )}
            {!loading && loadError && (
              <p className="text-xs text-chess-muted py-4 text-center">
                {loadError}
              </p>
            )}
            {!loading && !loadError && comments.length === 0 && (
              <p className="text-xs text-chess-muted py-4 text-center">
                No comments yet — be the first.
              </p>
            )}
            {!loading &&
              comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-chess-border/60 bg-chess-bg/50 px-3.5 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-chess-text truncate">
                      {c.name}
                    </span>
                    <time
                      dateTime={c.createdAt}
                      className="text-[10px] text-chess-muted flex-shrink-0"
                    >
                      {formatDate(c.createdAt)}
                    </time>
                  </div>
                  <p className="text-sm text-chess-subtext leading-relaxed whitespace-pre-wrap break-words">
                    {c.body}
                  </p>
                </div>
              ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => void load(page - 1)}
                  className="text-xs font-medium text-chess-muted hover:text-chess-accent disabled:opacity-40 disabled:hover:text-chess-muted transition-colors"
                >
                  ← Newer
                </button>
                <span className="text-[11px] text-chess-muted">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => void load(page + 1)}
                  className="text-xs font-medium text-chess-muted hover:text-chess-accent disabled:opacity-40 disabled:hover:text-chess-muted transition-colors"
                >
                  Older →
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChessComGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-90">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M8 16V8h2.2c1.4 0 2.3.8 2.3 2 0 .9-.5 1.5-1.2 1.8L14 16h-2.1l-2.3-3.8H10V16H8zm2-5.5h.4c.5 0 .8-.3.8-.7s-.3-.7-.8-.7H10v1.4z"
        fill="currentColor"
      />
    </svg>
  );
}
