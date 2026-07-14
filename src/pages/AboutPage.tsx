import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { usePageSeo } from "../hooks/usePageSeo";

const CHESSCOM_USERNAME = "ShwetankDhyani";
const CHESSCOM_CHALLENGE = `https://www.chess.com/play/${CHESSCOM_USERNAME}`;
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
    description: "ChessReview — free game review. Challenge Shwetank on Chess.com.",
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
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a
            href="/"
            className="text-sm font-bold text-chess-accent hover:underline"
          >
            ← ChessReview
          </a>
          <h1 className="text-lg font-bold mt-2">About</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10 pb-16">
        <div className="flex justify-center py-6">
          <a
            href={CHESSCOM_CHALLENGE}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-xl border border-chess-border bg-chess-panel/60 px-6 py-4 text-chess-text hover:border-chess-accent/40 hover:bg-chess-accent/[0.08] transition-colors"
          >
            <span className="text-lg font-bold tracking-wide">Challenge Me</span>
            <span className="flex items-center gap-1 text-chess-accent" aria-hidden>
              <SwordIcon className="group-hover:translate-x-0.5 transition-transform" />
              <SwordIcon mirrored className="group-hover:-translate-x-0.5 transition-transform" />
            </span>
          </a>
        </div>

        <section
          id="comments"
          className="rounded-xl border border-chess-border bg-chess-panel/60 p-4 sm:p-5 space-y-5"
        >
          <div>
            <h2 className="text-base font-bold text-chess-text">Comments</h2>
            <p className="text-xs text-chess-muted mt-1">
              Newest first.
              {total > 0 ? ` ${total} note${total === 1 ? "" : "s"} so far.` : ""}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
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
                placeholder="Your name"
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
                placeholder="Say something…"
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

function SwordIcon({
  mirrored = false,
  className = "",
}: {
  mirrored?: boolean;
  className?: string;
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${mirrored ? "scale-x-[-1]" : ""} ${className}`}
      aria-hidden
    >
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
    </svg>
  );
}
