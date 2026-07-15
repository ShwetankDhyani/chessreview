import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  createBlogPost,
  deleteBlogPost,
  fetchBlogList,
  formatBlogDate,
  updateBlogPost,
  uploadBlogImage,
  type BlogPostSummary,
} from "../utils/blogApi";
import { renderBlogMarkdown } from "../utils/blogMarkdown";
import { hapticToggle } from "../utils/chessSounds";

type Props = { adminKey: string; embedded?: boolean };

const emptyForm = {
  id: "",
  title: "",
  excerpt: "",
  body: "",
  coverImage: "",
  published: true,
  authorName: "ChessReview",
};

export function AdminBlogPanel({ adminKey, embedded = false }: Props) {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await fetchBlogList({ drafts: true, adminKey }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load posts");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    void load();
  }, [load]);

  function insertAtCursor(snippet: string) {
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, body: f.body + snippet }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + snippet + el.value.slice(end);
    setForm((f) => ({ ...f, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function wrapSelection(before: string, after = before) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = el.value.slice(start, end) || "text";
    const snippet = `${before}${selected}${after}`;
    const next = el.value.slice(0, start) + snippet + el.value.slice(end);
    setForm((f) => ({ ...f, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  async function onUploadImage(file: File) {
    setStatus(null);
    try {
      const { urlPath } = await uploadBlogImage(file, adminKey);
      insertAtCursor(`\n![image](${urlPath})\n`);
      if (!form.coverImage) {
        setForm((f) => ({ ...f, coverImage: urlPath }));
      }
      setStatus("Image uploaded and inserted.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        id: form.id,
        title: form.title,
        excerpt: form.excerpt,
        body: form.body,
        coverImage: form.coverImage || null,
        published: form.published,
        authorName: form.authorName,
      };
      if (editing && form.id) {
        await updateBlogPost(payload, adminKey);
        setStatus("Post updated.");
      } else {
        await createBlogPost(payload, adminKey);
        setStatus("Post published.");
      }
      setForm(emptyForm);
      setEditing(false);
      setPreview(false);
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this post and its replies?")) return;
    try {
      await deleteBlogPost(id, adminKey);
      if (form.id === id) {
        setForm(emptyForm);
        setEditing(false);
      }
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function startEdit(slug: string) {
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`, {
        headers: { "X-Admin-Key": adminKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      const p = data.post;
      setForm({
        id: p.id,
        title: p.title,
        excerpt: p.excerpt || "",
        body: p.body || "",
        coverImage: p.coverImage || "",
        published: !!p.published,
        authorName: p.authorName || "ChessReview",
      });
      setEditing(true);
      setPreview(false);
      setStatus(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not open post");
    }
  }

  const toolbarBtn =
    "px-2 py-1 rounded border border-chess-border text-[10px] font-semibold text-chess-muted hover:text-chess-accent hover:border-chess-accent/40 transition-colors";

  return (
    <div
      className={
        embedded
          ? "space-y-5"
          : "rounded-xl border border-chess-border bg-chess-panel p-4 space-y-5"
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        {!embedded ? (
          <h2 className="text-xs font-semibold uppercase tracking-wider text-chess-muted">
            Blog
          </h2>
        ) : (
          <p className="text-[11px] text-chess-muted">
            Posts and drafts for chessreview.org/blog
          </p>
        )}
        <a
          href="/blog"
          className="text-[11px] text-chess-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open blog ↗
        </a>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-chess-text">
            {editing ? "Edit post" : "New post"}
          </p>
          {editing && (
            <button
              type="button"
              className="text-[11px] text-chess-muted hover:text-chess-accent"
              onClick={() => {
                setForm(emptyForm);
                setEditing(false);
                setPreview(false);
              }}
            >
              Cancel edit
            </button>
          )}
        </div>

        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          placeholder="Title"
          className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text focus:outline-none focus:border-chess-accent/50"
        />
        <input
          value={form.excerpt}
          onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
          placeholder="Short excerpt (optional)"
          className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text focus:outline-none focus:border-chess-accent/50"
        />
        <input
          value={form.coverImage}
          onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
          placeholder="Cover image URL (optional)"
          className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm text-chess-text focus:outline-none focus:border-chess-accent/50"
        />

        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={toolbarBtn} onClick={() => wrapSelection("**")}>
            Bold
          </button>
          <button type="button" className={toolbarBtn} onClick={() => wrapSelection("*")}>
            Italic
          </button>
          <button type="button" className={toolbarBtn} onClick={() => insertAtCursor("\n## Heading\n")}>
            H2
          </button>
          <button type="button" className={toolbarBtn} onClick={() => insertAtCursor("\n> Quote\n")}>
            Quote
          </button>
          <button type="button" className={toolbarBtn} onClick={() => insertAtCursor("\n- List item\n")}>
            List
          </button>
          <button
            type="button"
            className={toolbarBtn}
            onClick={() => insertAtCursor("[link text](https://)")}
          >
            Link
          </button>
          <button type="button" className={toolbarBtn} onClick={() => fileRef.current?.click()}>
            Image
          </button>
          <button
            type="button"
            className={toolbarBtn}
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? "Edit" : "Preview"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUploadImage(f);
              e.target.value = "";
            }}
          />
        </div>

        {preview ? (
          <div className="rounded-lg border border-chess-border bg-chess-bg/60 px-3 py-2 min-h-[12rem]">
            {renderBlogMarkdown(form.body || "_Nothing to preview_")}
          </div>
        ) : (
          <textarea
            ref={bodyRef}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            required
            rows={12}
            placeholder="Write in Markdown… Use the toolbar for formatting and images."
            className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2 text-sm font-mono text-chess-text focus:outline-none focus:border-chess-accent/50 resize-y min-h-[12rem]"
          />
        )}

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs text-chess-subtext">
            <span>Published</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.published}
              aria-label="Published"
              onClick={() => {
                hapticToggle();
                setForm((f) => ({ ...f, published: !f.published }));
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                form.published ? "bg-chess-accent" : "bg-chess-border-strong"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  form.published ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </label>
          <input
            value={form.authorName}
            onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
            className="rounded-lg border border-chess-border bg-chess-bg px-2 py-1 text-xs text-chess-text w-40 focus:outline-none focus:border-chess-accent/50"
            placeholder="Author"
          />
          <button
            type="submit"
            disabled={saving}
            className="ml-auto rounded-lg border border-chess-accent/40 bg-chess-accent/20 px-4 py-2 text-sm font-semibold text-chess-accent hover:bg-chess-accent/30 disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Update post" : "Publish post"}
          </button>
        </div>
        {status && <p className="text-xs text-chess-muted">{status}</p>}
      </form>

      <div className="border-t border-chess-border/70 pt-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted">
          Existing posts
        </p>
        {loading && <p className="text-xs text-chess-muted">Loading…</p>}
        {error && <p className="text-xs text-red-400/90">{error}</p>}
        {!loading && posts.length === 0 && (
          <p className="text-xs text-chess-muted">No posts yet.</p>
        )}
        {posts.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-lg border border-chess-border/60 bg-chess-bg/40 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-chess-text truncate">{p.title}</div>
              <div className="text-[10px] text-chess-muted">
                {formatBlogDate(p.createdAt)}
                {!p.published ? " · Draft" : ""}
                {` · ${p.replyCount} replies`}
              </div>
            </div>
            <a
              href={`/blog/${encodeURIComponent(p.slug)}`}
              className="text-[11px] text-chess-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View
            </a>
            <button
              type="button"
              onClick={() => void startEdit(p.slug)}
              className="text-[11px] text-chess-muted hover:text-chess-accent"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void onDelete(p.id)}
              className="text-[11px] text-red-400/80 hover:text-red-400"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
