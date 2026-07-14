import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SiteChrome } from "../components/SiteChrome";
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

function initialOf(name: string) {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

function fieldClass() {
  return "w-full rounded-xl border border-chess-border/80 bg-chess-bg/70 px-3 py-2.5 text-sm text-chess-text placeholder:text-chess-muted/60 focus:outline-none focus:border-chess-accent/50 focus:ring-1 focus:ring-chess-accent/20 transition-shadow";
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
    <SiteChrome title="Blog">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.11),transparent_60%)]"
          aria-hidden
        />

        <main className="relative max-w-2xl mx-auto px-4 py-6 sm:py-9 pb-12 space-y-8">
          <a
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-chess-muted hover:text-chess-accent transition-colors"
          >
            <span aria-hidden>←</span> All posts
          </a>

          {loading && (
            <div className="space-y-4 py-6">
              <div className="h-10 w-3/4 rounded-lg bg-chess-panel/60 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-chess-panel/40 animate-pulse" />
              <div className="h-40 rounded-2xl bg-chess-panel/30 animate-pulse" />
            </div>
          )}
          {error && !loading && (
            <p className="text-sm text-chess-muted text-center py-12">{error}</p>
          )}

          {post && !loading && (
            <article className="relative">
              {post.coverImage ? (
                <div className="relative mb-7 overflow-hidden rounded-2xl border border-chess-border/80 shadow-[0_16px_48px_rgba(0,0,0,0.3)]">
                  <img
                    src={post.coverImage}
                    alt=""
                    className="w-full max-h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-chess-bg/80 via-transparent to-transparent" />
                </div>
              ) : (
                <div className="mb-6 h-1.5 w-14 rounded-full bg-gradient-to-r from-chess-accent to-chess-accent/20" />
              )}

              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-chess-accent/90 mb-3">
                Journal
              </p>
              <h1 className="text-3xl sm:text-[2.15rem] font-bold text-chess-text leading-[1.15] tracking-tight">
                {post.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-chess-border/70 bg-chess-panel/70 px-2.5 py-1">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chess-accent/20 text-[11px] font-bold text-chess-accent">
                    {initialOf(post.authorName)}
                  </span>
                  <span className="text-xs font-medium text-chess-subtext">{post.authorName}</span>
                </span>
                <time
                  dateTime={post.createdAt}
                  className="rounded-full border border-chess-border/60 bg-chess-bg/50 px-2.5 py-1 text-[11px] tabular-nums text-chess-muted"
                >
                  {formatBlogDate(post.createdAt)}
                </time>
                {post.updatedAt !== post.createdAt && (
                  <span className="rounded-full border border-chess-border/60 bg-chess-bg/50 px-2.5 py-1 text-[11px] text-chess-muted">
                    Updated {formatBlogDate(post.updatedAt)}
                  </span>
                )}
              </div>

              <div className="mt-8 rounded-2xl border border-chess-border/70 bg-gradient-to-b from-chess-panel/50 to-transparent px-4 py-5 sm:px-6 sm:py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="blog-prose">{renderBlogMarkdown(post.body)}</div>
              </div>
            </article>
          )}

          {post && !loading && (
            <section
              id="replies"
              className="rounded-2xl border border-chess-border/80 bg-gradient-to-br from-chess-panel via-chess-panel to-chess-bg p-4 sm:p-6 space-y-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-chess-text tracking-tight">Replies</h2>
                  <p className="text-xs text-chess-muted mt-1">
                    Leave a name — Chess.com or Lichess optional.
                  </p>
                </div>
                <span className="rounded-full border border-chess-border/70 bg-chess-bg/50 px-2.5 py-1 text-[11px] tabular-nums text-chess-muted">
                  {replies.length}
                </span>
              </div>

              <form
                onSubmit={onReply}
                className="rounded-xl border border-chess-border/60 bg-chess-bg/40 p-3.5 sm:p-4 space-y-3"
              >
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
                      className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1.5"
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
                      className={fieldClass()}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="reply-chesscom"
                        className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1.5"
                      >
                        Chess.com
                      </label>
                      <input
                        id="reply-chesscom"
                        maxLength={40}
                        value={chesscom}
                        onChange={(e) => setChesscom(e.target.value)}
                        placeholder="optional"
                        className={fieldClass()}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reply-lichess"
                        className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1.5"
                      >
                        Lichess
                      </label>
                      <input
                        id="reply-lichess"
                        maxLength={40}
                        value={lichess}
                        onChange={(e) => setLichess(e.target.value)}
                        placeholder="optional"
                        className={fieldClass()}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reply-body"
                    className="block text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1.5"
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
                    className={`${fieldClass()} resize-y min-h-[5.5rem]`}
                  />
                  <p className="text-[10px] text-chess-muted mt-1.5 text-right tabular-nums">
                    {body.length}/800
                  </p>
                </div>

                {submitError && <p className="text-xs text-red-400/90">{submitError}</p>}
                {submitOk && <p className="text-xs text-chess-accent">{submitOk}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto rounded-xl border border-chess-accent/45 bg-chess-accent/20 px-5 py-2.5 text-sm font-semibold text-chess-accent
                    hover:bg-chess-accent/30 hover:border-chess-accent/60 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Posting…" : "Post reply"}
                </button>
              </form>

              <div className="space-y-3">
                {replies.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-chess-border/70 px-4 py-8 text-center">
                    <p className="text-xs text-chess-muted">No replies yet — start the thread.</p>
                  </div>
                ) : (
                  replies.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-chess-border/60 bg-chess-bg/45 px-3.5 py-3.5
                        hover:border-chess-border-strong transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-chess-accent/30 to-chess-accent/5 border border-chess-accent/25 text-xs font-bold text-chess-accent">
                          {initialOf(r.name)}
                        </span>
                        <div className="min-w-0 flex-1">
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
                              className="text-[10px] text-chess-muted flex-shrink-0 tabular-nums"
                            >
                              {formatBlogDate(r.createdAt)}
                            </time>
                          </div>
                          <p className="text-sm text-chess-subtext leading-relaxed whitespace-pre-wrap break-words">
                            {r.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </SiteChrome>
  );
}
