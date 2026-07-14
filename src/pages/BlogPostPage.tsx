import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import {
  deleteBlogReply,
  fetchBlogPost,
  forgetReplyToken,
  formatBlogDate,
  loadOwnedReplyTokens,
  loadReplyName,
  postBlogReply,
  rememberReplyToken,
  saveReplyName,
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

function toPublicReply(reply: BlogReply): BlogReply {
  const { deleteToken: _token, ...rest } = reply;
  return rest;
}

function fieldClass() {
  return "w-full rounded-lg border border-chess-border/70 bg-chess-bg/60 px-2.5 py-1.5 text-sm text-chess-text placeholder:text-chess-muted/55 focus:outline-none focus:border-chess-accent/45 focus:ring-1 focus:ring-chess-accent/15";
}

export default function BlogPostPage() {
  const slug = slugFromPath();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [replies, setReplies] = useState<BlogReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(() => loadReplyName());
  const [body, setBody] = useState("");
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ownedTokens, setOwnedTokens] = useState<Record<string, string>>(() =>
    loadOwnedReplyTokens()
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    setSubmitting(true);
    try {
      const data = await postBlogReply(slug, {
        name,
        body,
        hp,
      });
      const reply = data.reply;
      if (!reply?.id) throw new Error("Could not post reply");

      saveReplyName(name);
      if (reply.deleteToken) {
        rememberReplyToken(reply.id, reply.deleteToken);
        setOwnedTokens(loadOwnedReplyTokens());
      }

      setReplies((prev) => [...prev, toPublicReply(reply)]);
      setBody("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not reply");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteReply(replyId: string) {
    const deleteToken = ownedTokens[replyId];
    if (!deleteToken) return;
    setDeleteError(null);
    setDeletingId(replyId);
    try {
      await deleteBlogReply(slug, { replyId, deleteToken });
      forgetReplyToken(replyId);
      setOwnedTokens(loadOwnedReplyTokens());
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeletingId(null);
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
            <section id="replies" className="pt-2 border-t border-chess-border/50 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-chess-text">
                  Replies
                  {replies.length > 0 && (
                    <span className="ml-1.5 text-chess-muted font-normal tabular-nums">
                      ({replies.length})
                    </span>
                  )}
                </h2>
              </div>

              <form onSubmit={onReply} className="space-y-2">
                <label className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden">
                  Website
                  <input
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="reply-name"
                    required
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    aria-label="Name"
                    className={`${fieldClass()} sm:w-40 sm:flex-shrink-0`}
                  />
                  <textarea
                    id="reply-body"
                    required
                    maxLength={800}
                    rows={2}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write a reply…"
                    aria-label="Reply"
                    className={`${fieldClass()} resize-y min-h-[2.75rem] flex-1`}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="sm:self-start rounded-lg border border-chess-accent/40 bg-chess-accent/15 px-3.5 py-1.5 text-xs font-semibold text-chess-accent
                      hover:bg-chess-accent/25 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {submitting ? "…" : "Post"}
                  </button>
                </div>

                {submitError && <p className="text-xs text-red-400/90">{submitError}</p>}
              </form>

              {deleteError && (
                <p className="text-xs text-red-400/90">{deleteError}</p>
              )}

              <div className="space-y-2">
                {replies.length === 0 ? (
                  <p className="text-xs text-chess-muted py-1">No replies yet.</p>
                ) : (
                  replies.map((r) => {
                    const canDelete = Boolean(ownedTokens[r.id]);
                    return (
                      <div
                        key={r.id}
                        className="flex items-start gap-2.5 py-2 border-b border-chess-border/40 last:border-0"
                      >
                        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-chess-accent/15 text-[10px] font-bold text-chess-accent">
                          {initialOf(r.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-semibold text-chess-text">
                              {r.name}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <time
                                dateTime={r.createdAt}
                                className="text-[10px] text-chess-muted tabular-nums"
                              >
                                {formatBlogDate(r.createdAt)}
                              </time>
                              {canDelete && (
                                <button
                                  type="button"
                                  disabled={deletingId === r.id}
                                  onClick={() => void onDeleteReply(r.id)}
                                  className="text-[10px] text-chess-muted hover:text-red-400/90 disabled:opacity-50 transition-colors"
                                >
                                  {deletingId === r.id ? "…" : "Delete"}
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="mt-0.5 text-sm text-chess-subtext leading-snug whitespace-pre-wrap break-words">
                            {r.body}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </SiteChrome>
  );
}
