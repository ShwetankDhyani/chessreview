import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import {
  buildReplyTree,
  deleteBlogReply,
  fetchBlogPost,
  forgetReplyToken,
  formatBlogDate,
  loadOwnedReplyTokens,
  loadReplyName,
  loadSessionAdminKey,
  MAX_REPLY_DEPTH,
  postBlogReply,
  rememberReplyToken,
  replyDepth,
  saveReplyName,
  type BlogPost,
  type BlogReply,
  type BlogReplyNode,
} from "../utils/blogApi";
import { renderBlogMarkdown } from "../utils/blogMarkdown";
import { blogPostJsonLd, SITE_ORIGIN } from "../utils/seo";

function initialOf(name: string) {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

function replyShowsAsAuthor(reply: BlogReply, authorName?: string): boolean {
  if (reply.isAuthor === true) return true;
  if (reply.isAuthor === false) return false;
  // Legacy replies (no isAuthor field yet): match the post byline.
  if (!authorName) return false;
  return reply.name.trim().toLowerCase() === authorName.trim().toLowerCase();
}

function toPublicReply(reply: BlogReply): BlogReply {
  const { deleteToken: _token, ...rest } = reply;
  const out: BlogReply = {
    ...rest,
    parentId: rest.parentId || null,
  };
  if (rest.isAuthor === true) out.isAuthor = true;
  else if (rest.isAuthor === false) out.isAuthor = false;
  else delete out.isAuthor;
  return out;
}

function fieldClass() {
  return "w-full rounded-lg border border-chess-border/70 bg-chess-bg/60 px-2.5 py-1.5 text-sm text-chess-text placeholder:text-chess-muted/55 focus:outline-none focus:border-chess-accent/45 focus:ring-1 focus:ring-chess-accent/15";
}

function ReplyComposer({
  name,
  body,
  hp,
  submitting,
  error,
  placeholder,
  submitLabel,
  asAuthor = false,
  onNameChange,
  onBodyChange,
  onHpChange,
  onSubmit,
  onCancel,
}: {
  name: string;
  body: string;
  hp: string;
  submitting: boolean;
  error: string | null;
  placeholder?: string;
  submitLabel?: string;
  asAuthor?: boolean;
  onNameChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onHpChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden">
        Website
        <input
          value={hp}
          onChange={(e) => onHpChange(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>

      {asAuthor ? (
        <p className="text-[11px] text-chess-muted">
          Replying as{" "}
          <span className="font-semibold text-chess-accent">{name}</span>
          <span className="ml-1.5 rounded border border-chess-accent/35 bg-chess-accent/12 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-chess-accent align-middle">
            Author
          </span>
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        {!asAuthor && (
          <input
            required
            maxLength={40}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Name"
            aria-label="Name"
            className={`${fieldClass()} sm:w-36 sm:flex-shrink-0`}
          />
        )}
        <textarea
          required
          maxLength={800}
          rows={2}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder={placeholder ?? "Write a reply…"}
          aria-label="Reply"
          className={`${fieldClass()} resize-y min-h-[2.75rem] flex-1`}
        />
        <div className="flex gap-2 sm:flex-col">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg border border-chess-accent/40 bg-chess-accent/15 px-3.5 py-1.5 text-xs font-semibold text-chess-accent
              hover:bg-chess-accent/25 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {submitting ? "…" : submitLabel ?? "Post"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-2.5 py-1.5 text-xs text-chess-muted hover:text-chess-text transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-400/90">{error}</p>}
    </form>
  );
}

function ReplyThread({
  nodes,
  depth,
  ownedTokens,
  isAdmin,
  authorName,
  deletingId,
  replyToId,
  composer,
  onStartReply,
  onCancelReply,
  onDelete,
}: {
  nodes: BlogReplyNode[];
  depth: number;
  ownedTokens: Record<string, string>;
  isAdmin: boolean;
  authorName?: string;
  deletingId: string | null;
  replyToId: string | null;
  composer: ReactNode;
  onStartReply: (id: string) => void;
  onCancelReply: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={depth === 0 ? "space-y-3" : "mt-2 space-y-2"}>
      {nodes.map((r) => {
        const canDelete = isAdmin || Boolean(ownedTokens[r.id]);
        const canNest = depth + 1 < MAX_REPLY_DEPTH;
        const isAuthor = replyShowsAsAuthor(r, authorName);
        return (
          <div key={r.id} className={depth > 0 ? "pl-3 sm:pl-4 border-l border-chess-border/50" : ""}>
            <div className="flex items-start gap-2.5 py-1.5">
              <span
                className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isAuthor
                    ? "bg-chess-accent/25 text-chess-accent ring-1 ring-chess-accent/40"
                    : "bg-chess-accent/15 text-chess-accent"
                }`}
              >
                {initialOf(r.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span
                      className={`text-xs font-semibold ${
                        isAuthor ? "text-chess-accent" : "text-chess-text"
                      }`}
                    >
                      {r.name}
                    </span>
                    {isAuthor ? (
                      <span className="rounded border border-chess-accent/40 bg-chess-accent/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-chess-accent">
                        Author
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
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
                        onClick={() => onDelete(r.id)}
                        className="text-[10px] font-medium text-red-400/90 hover:text-red-300 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === r.id ? "…" : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-0.5 text-sm text-chess-subtext leading-snug whitespace-pre-wrap break-words">
                  {r.body}
                </p>
                {canNest && (
                  <button
                    type="button"
                    onClick={() =>
                      replyToId === r.id ? onCancelReply() : onStartReply(r.id)
                    }
                    className="mt-1 text-[10px] font-medium text-chess-muted hover:text-chess-accent transition-colors"
                  >
                    {replyToId === r.id ? "Cancel" : "Reply"}
                  </button>
                )}
                {replyToId === r.id && <div className="mt-2">{composer}</div>}
              </div>
            </div>
            {r.children.length > 0 && (
              <ReplyThread
                nodes={r.children}
                depth={depth + 1}
                ownedTokens={ownedTokens}
                isAdmin={isAdmin}
                authorName={authorName}
                deletingId={deletingId}
                replyToId={replyToId}
                composer={composer}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BlogPostPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = decodeURIComponent(slugParam || "");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [replies, setReplies] = useState<BlogReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(() => loadReplyName());
  const [body, setBody] = useState("");
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [ownedTokens, setOwnedTokens] = useState<Record<string, string>>(() =>
    loadOwnedReplyTokens()
  );
  const [adminKey, setAdminKey] = useState(() => loadSessionAdminKey());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Keep admin session in sync if the key was set after this page mounted.
  useEffect(() => {
    const syncAdmin = () => setAdminKey(loadSessionAdminKey());
    syncAdmin();
    window.addEventListener("focus", syncAdmin);
    document.addEventListener("visibilitychange", syncAdmin);
    return () => {
      window.removeEventListener("focus", syncAdmin);
      document.removeEventListener("visibilitychange", syncAdmin);
    };
  }, []);

  const tree = useMemo(() => buildReplyTree(replies), [replies]);
  const asAuthor = Boolean(adminKey);
  const authorDisplayName = post?.authorName?.trim() || "Author";

  usePageSeo({
    title: post ? `${post.title} — ChessReview Blog` : "Blog — ChessReview",
    description:
      post?.excerpt ||
      "Articles and notes from ChessReview for amateur and club chess players.",
    path: `/blog/${slug}`,
    ogType: post ? "article" : "website",
    ogImage: post?.coverImage
      ? post.coverImage.startsWith("http")
        ? post.coverImage
        : `${SITE_ORIGIN}${post.coverImage}`
      : undefined,
    articlePublished: post?.createdAt,
    articleModified: post?.updatedAt || post?.createdAt,
    jsonLd: post
      ? blogPostJsonLd({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          authorName: post.authorName,
          coverImage: post.coverImage,
        })
      : undefined,
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

  async function submitReply(e: FormEvent, parentId: string | null) {
    e.preventDefault();
    setSubmitError(null);
    if (parentId) {
      const depth = replyDepth(replies, parentId);
      if (depth + 1 >= MAX_REPLY_DEPTH) {
        setSubmitError("Thread is too deep");
        return;
      }
    }
    const key = loadSessionAdminKey() || adminKey;
    const signingAsAuthor = Boolean(key);
    setSubmitting(true);
    try {
      const data = await postBlogReply(
        slug,
        {
          name: signingAsAuthor ? authorDisplayName : name,
          body,
          parentId: parentId || undefined,
          hp,
        },
        signingAsAuthor ? key : undefined
      );
      const reply = data.reply;
      if (!reply?.id) throw new Error("Could not post reply");

      if (!signingAsAuthor) saveReplyName(name);
      if (reply.deleteToken) {
        rememberReplyToken(reply.id, reply.deleteToken);
        setOwnedTokens(loadOwnedReplyTokens());
      }

      // Ensure author badge shows even if a stale engine omitted isAuthor.
      const publicReply = toPublicReply(reply);
      if (signingAsAuthor && publicReply.isAuthor !== true) {
        publicReply.isAuthor = true;
        publicReply.name = authorDisplayName;
      }
      setReplies((prev) => [...prev, publicReply]);
      setBody("");
      setHp("");
      setReplyToId(null);
      if (key) setAdminKey(key);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not reply");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteReply(replyId: string) {
    const key = loadSessionAdminKey() || adminKey;
    const deleteToken = ownedTokens[replyId];
    if (!key && !deleteToken) return;
    setDeleteError(null);
    setDeletingId(replyId);
    try {
      const result = await deleteBlogReply(
        slug,
        { replyId, deleteToken },
        key || undefined
      );
      const removed = new Set(result.deletedIds?.length ? result.deletedIds : [replyId]);
      for (const id of removed) forgetReplyToken(id);
      setOwnedTokens(loadOwnedReplyTokens());
      setReplies((prev) => prev.filter((r) => !removed.has(r.id)));
      if (replyToId && removed.has(replyToId)) setReplyToId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeletingId(null);
    }
  }

  const composer = (
    <ReplyComposer
      name={asAuthor ? authorDisplayName : name}
      body={body}
      hp={hp}
      submitting={submitting}
      error={submitError}
      placeholder={asAuthor ? "Write your author reply…" : "Write a reply…"}
      submitLabel={asAuthor ? "Post as author" : replyToId ? "Reply" : "Post"}
      asAuthor={asAuthor}
      onNameChange={setName}
      onBodyChange={setBody}
      onHpChange={setHp}
      onSubmit={(e) => void submitReply(e, replyToId)}
      onCancel={replyToId ? () => setReplyToId(null) : undefined}
    />
  );

  return (
    <SiteChrome title="Blog">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.11),transparent_60%)]"
          aria-hidden
        />

        <main className="relative max-w-2xl mx-auto px-4 py-6 sm:py-9 pb-12 space-y-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-chess-muted hover:text-chess-accent transition-colors"
          >
            <span aria-hidden>←</span> All posts
          </Link>

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

              {!replyToId && (
                <ReplyComposer
                  name={asAuthor ? authorDisplayName : name}
                  body={body}
                  hp={hp}
                  submitting={submitting}
                  error={submitError}
                  placeholder={asAuthor ? "Write your author reply…" : "Write a reply…"}
                  submitLabel={asAuthor ? "Post as author" : "Post"}
                  asAuthor={asAuthor}
                  onNameChange={setName}
                  onBodyChange={setBody}
                  onHpChange={setHp}
                  onSubmit={(e) => void submitReply(e, null)}
                />
              )}

              {deleteError && (
                <p className="text-xs text-red-400/90">{deleteError}</p>
              )}

              {replies.length === 0 ? (
                <p className="text-xs text-chess-muted py-1">No replies yet.</p>
              ) : (
                <ReplyThread
                  nodes={tree}
                  depth={0}
                  ownedTokens={ownedTokens}
                  isAdmin={Boolean(adminKey)}
                  authorName={post.authorName}
                  deletingId={deletingId}
                  replyToId={replyToId}
                  composer={composer}
                  onStartReply={(id) => {
                    setSubmitError(null);
                    setReplyToId(id);
                  }}
                  onCancelReply={() => {
                    setSubmitError(null);
                    setReplyToId(null);
                  }}
                  onDelete={(id) => void onDeleteReply(id)}
                />
              )}
            </section>
          )}
        </main>
      </div>
    </SiteChrome>
  );
}
