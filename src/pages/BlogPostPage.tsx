import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { usePageSeo } from "../hooks/usePageSeo";
import {
  fetchBlogPost,
  formatBlogDate,
  postBlogReply,
  type BlogPost,
  type BlogReply,
} from "../utils/blogApi";
import { renderBlogMarkdown } from "../utils/blogMarkdown";

function slugFromPath() {
  const parts = window.location.pathname.replace(/\/$/, "").split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

export default function BlogPostPage() {
  const slug = slugFromPath();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [replies, setReplies] = useState<BlogReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [chesscom, setChesscom] = useState("");
  const [lichess, setLichess] = useState("");
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  usePageSeo({
    title: post ? `${post.title} — ChessReview Blog` : "Blog — ChessReview",
    description: post?.excerpt || "ChessReview blog post",
    path: `/blog/${slug}`,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBlogPost(slug);
      setPost(data.post);
      setReplies(data.replies ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not found");
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onReply(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitOk(null);
    setSubmitting(true);
    try {
      await postBlogReply(slug, {
        name,
        body,
        chesscom: chesscom.trim() || undefined,
        lichess: lichess.trim() || undefined,
        hp,
      });
      setBody("");
      setSubmitOk("Reply posted.");
      await load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not reply");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text">
      <header className="border-b border-chess-border bg-chess-panel/80">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a href="/blog" className="text-sm font-bold text-chess-accent hover:underline">
            ← Blog
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-20 space-y-10">
        {loading && <p className="text-sm text-chess-muted text-center py-12">Loading…</p>}
        {error && !loading && (
          <p className="text-sm text-chess-muted text-center py-12">{error}</p>
        )}

        {post && !loading && (
          <article>
            {post.coverImage ? (
              <img
                src={post.coverImage}
                alt=""
                className="w-full max-h-72 object-cover rounded-xl border border-chess-border mb-6"
              />
            ) : null}
            <h1 className="text-2xl font-bold text-chess-text leading-tight">{post.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-chess-muted">
              <span>{post.authorName}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.createdAt}>{formatBlogDate(post.createdAt)}</time>
              {post.updatedAt !== post.createdAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>Updated {formatBlogDate(post.updatedAt)}</span>
                </>
              )}
            </div>
            <div className="mt-6 border-t border-chess-border/70 pt-2">
              {renderBlogMarkdown(post.body)}
            </div>
          </article>
        )}

        {post && !loading && (
          <section
            id="replies"
            className="rounded-xl border border-chess-border bg-chess-panel/60 p-4 sm:p-5 space-y-5"
          >
            <div>
              <h2 className="text-base font-bold text-chess-text">Replies</h2>
              <p className="text-xs text-chess-muted mt-1">
                Join the conversation. Add a Chess.com or Lichess handle if you like —
                or just leave a name.
              </p>
            </div>

            <form onSubmit={onReply} className="space-y-3">
              <label className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden">
                Website
                <input
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reply-name"
                    className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="reply-name"
                    required
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How should we show you?"
                    className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text placeholder:text-chess-muted/70 focus:outline-none focus:border-chess-accent/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="reply-chesscom"
                      className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1"
                    >
                      Chess.com
                    </label>
                    <input
                      id="reply-chesscom"
                      maxLength={40}
                      value={chesscom}
                      onChange={(e) => setChesscom(e.target.value)}
                      placeholder="optional"
                      className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text placeholder:text-chess-muted/70 focus:outline-none focus:border-chess-accent/50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reply-lichess"
                      className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1"
                    >
                      Lichess
                    </label>
                    <input
                      id="reply-lichess"
                      maxLength={40}
                      value={lichess}
                      onChange={(e) => setLichess(e.target.value)}
                      placeholder="optional"
                      className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text placeholder:text-chess-muted/70 focus:outline-none focus:border-chess-accent/50"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reply-body"
                  className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1"
                >
                  Reply
                </label>
                <textarea
                  id="reply-body"
                  required
                  maxLength={800}
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a reply…"
                  className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text placeholder:text-chess-muted/70 focus:outline-none focus:border-chess-accent/50 resize-y min-h-[5rem]"
                />
                <p className="text-[10px] text-chess-muted mt-1 text-right">
                  {body.length}/800
                </p>
              </div>

              {submitError && <p className="text-xs text-red-400/90">{submitError}</p>}
              {submitOk && <p className="text-xs text-chess-accent">{submitOk}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg border border-chess-accent/40 bg-chess-accent/20 px-4 py-2 text-sm font-semibold text-chess-accent hover:bg-chess-accent/30 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Posting…" : "Post reply"}
              </button>
            </form>

            <div className="border-t border-chess-border/70 pt-4 space-y-3">
              {replies.length === 0 ? (
                <p className="text-xs text-chess-muted text-center py-4">
                  No replies yet — start the thread.
                </p>
              ) : (
                replies.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-chess-border/60 bg-chess-bg/50 px-3.5 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-chess-text">{r.name}</span>
                        <span className="ml-2 inline-flex flex-wrap gap-2 text-[10px]">
                          {r.chesscom && (
                            <a
                              href={`https://www.chess.com/member/${encodeURIComponent(r.chesscom)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-chess-accent hover:underline"
                            >
                              chess.com/{r.chesscom}
                            </a>
                          )}
                          {r.lichess && (
                            <a
                              href={`https://lichess.org/@/${encodeURIComponent(r.lichess)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-chess-accent hover:underline"
                            >
                              lichess/{r.lichess}
                            </a>
                          )}
                        </span>
                      </div>
                      <time
                        dateTime={r.createdAt}
                        className="text-[10px] text-chess-muted flex-shrink-0"
                      >
                        {formatBlogDate(r.createdAt)}
                      </time>
                    </div>
                    <p className="text-sm text-chess-subtext leading-relaxed whitespace-pre-wrap break-words">
                      {r.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
