import { safeGetItem, safeRemoveItem, safeSetItem } from "./safeStorage";
export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string | null;
  published: boolean;
  /** When true, post is sorted above unpinned posts. */
  pinned?: boolean;
  /** Lower numbers appear first among pinned posts (1 = topmost). */
  pinOrder?: number;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  replyCount: number;
  bodyPreview?: string;
};

export type BlogPost = BlogPostSummary & {
  body: string;
};

export type BlogReply = {
  id: string;
  name: string;
  body: string;
  parentId?: string | null;
  chesscom: string | null;
  lichess: string | null;
  createdAt: string;
  deleteToken?: string;
  /** Server-set when posted with a valid admin key. */
  isAuthor?: boolean;
};

export type BlogReplyNode = BlogReply & { children: BlogReplyNode[] };

const REPLY_TOKEN_KEY = "cr_blog_reply_tokens";
const REPLY_NAME_KEY = "cr_blog_reply_name";
const ADMIN_KEY_STORAGE = "cr_admin_key";
/** Fired on window when the admin key is set or cleared. */
export const ADMIN_KEY_CHANGED = "cr_admin_key_changed";
export const MAX_REPLY_DEPTH = 5;

/**
 * Admin key is kept in localStorage so signed-in devices keep the footer
 * control-panel entry across tabs and browser restarts (until Sign out).
 * Older sessionStorage values are migrated once.
 */
export function loadSessionAdminKey(): string {
  try {
    const fromLocal = safeGetItem(ADMIN_KEY_STORAGE)?.trim() ?? "";
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(ADMIN_KEY_STORAGE)?.trim() ?? "";
    if (fromSession) {
      safeSetItem(ADMIN_KEY_STORAGE, fromSession);
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
      return fromSession;
    }
    return "";
  } catch {
    return "";
  }
}

export function saveSessionAdminKey(key: string): void {
  const trimmed = key.trim();
  try {
    if (trimmed) {
      safeSetItem(ADMIN_KEY_STORAGE, trimmed);
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    } else {
      safeRemoveItem(ADMIN_KEY_STORAGE);
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(ADMIN_KEY_CHANGED, { detail: { hasKey: !!trimmed } })
  );
}

export function clearSessionAdminKey(): void {
  saveSessionAdminKey("");
}

export function buildReplyTree(replies: BlogReply[]): BlogReplyNode[] {
  const nodes = new Map<string, BlogReplyNode>();
  for (const r of replies) {
    nodes.set(r.id, { ...r, parentId: r.parentId || null, children: [] });
  }
  const roots: BlogReplyNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (list: BlogReplyNode[]) => {
    list.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    for (const n of list) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

export function replyDepth(replies: BlogReply[], replyId: string): number {
  const byId = new Map(replies.map((r) => [r.id, r]));
  let depth = 0;
  let cur = byId.get(replyId);
  while (cur?.parentId) {
    depth += 1;
    cur = byId.get(cur.parentId);
    if (depth > MAX_REPLY_DEPTH) break;
  }
  return depth;
}

export function loadReplyName(): string {
  try {
    return safeGetItem(REPLY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveReplyName(name: string) {
  try {
    safeSetItem(REPLY_NAME_KEY, name.trim().slice(0, 40));
  } catch {
    /* ignore */
  }
}

export function loadOwnedReplyTokens(): Record<string, string> {
  try {
    const raw = safeGetItem(REPLY_TOKEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function rememberReplyToken(replyId: string, deleteToken: string) {
  if (!replyId || !deleteToken) return;
  try {
    const map = loadOwnedReplyTokens();
    map[replyId] = deleteToken;
    safeSetItem(REPLY_TOKEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function forgetReplyToken(replyId: string) {
  try {
    const map = loadOwnedReplyTokens();
    delete map[replyId];
    safeSetItem(REPLY_TOKEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function adminHeaders(adminKey?: string): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (adminKey) h["X-Admin-Key"] = adminKey;
  return h;
}

export async function fetchBlogPost(
  slug: string,
  adminKey?: string
): Promise<{ post: BlogPost; replies: BlogReply[] }> {
  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const sources = [
    `/api/blog?slug=${encodeURIComponent(slug)}`,
    engineUrl ? `${engineUrl}/blog/${encodeURIComponent(slug)}` : null,
  ].filter(Boolean) as string[];

  let lastError = "Post not found";
  for (const url of sources) {
    try {
      const res = await fetch(url, { headers: adminHeaders(adminKey) });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        lastError = "Post API unavailable";
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastError = typeof data.error === "string" ? data.error : "Post not found";
        continue;
      }
      return data;
    } catch {
      continue;
    }
  }
  throw new Error(lastError);
}

export async function fetchBlogList(opts?: {
  drafts?: boolean;
  adminKey?: string;
}): Promise<BlogPostSummary[]> {
  const qs = opts?.drafts ? "?drafts=1" : "";
  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const sources = [
    `/api/blog${qs}`,
    engineUrl ? `${engineUrl}/blog${qs}` : null,
  ].filter(Boolean) as string[];

  let lastError = "Could not load blog";
  for (const url of sources) {
    try {
      const res = await fetch(url, { headers: adminHeaders(opts?.adminKey) });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) continue;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastError = typeof data.error === "string" ? data.error : lastError;
        continue;
      }
      return Array.isArray(data.posts) ? data.posts : [];
    } catch {
      continue;
    }
  }
  throw new Error(lastError);
}

export async function createBlogPost(
  payload: Record<string, unknown>,
  adminKey: string
) {
  const res = await fetch("/api/blog", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Create failed");
  }
  return data;
}

export async function updateBlogPost(
  payload: Record<string, unknown>,
  adminKey: string
) {
  const res = await fetch("/api/blog", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ ...payload, action: "update" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Update failed");
  }
  return data;
}

export async function deleteBlogPost(id: string, adminKey: string) {
  const res = await fetch("/api/blog", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ action: "delete", id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Delete failed");
  }
  return data;
}

export async function uploadBlogImage(
  file: File,
  adminKey: string
): Promise<{ id: string; urlPath: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/blog", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({
      action: "upload",
      base64: dataUrl,
      contentType: file.type,
      filename: file.name,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
  }
  return data;
}

export async function postBlogReply(
  slug: string,
  payload: {
    name: string;
    body: string;
    parentId?: string | null;
    chesscom?: string;
    lichess?: string;
    hp?: string;
  },
  adminKey?: string
): Promise<{ ok: boolean; reply: BlogReply }> {
  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const body = JSON.stringify({ ...payload, action: "reply", slug });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (adminKey?.trim()) headers["X-Admin-Key"] = adminKey.trim();
  const sources = [
    { url: "/api/blog", body },
    {
      url: `/api/blog?slug=${encodeURIComponent(slug)}&replies=1`,
      body: JSON.stringify(payload),
    },
    engineUrl
      ? {
          url: `${engineUrl}/blog/${encodeURIComponent(slug)}/replies`,
          body: JSON.stringify(payload),
        }
      : null,
  ].filter(Boolean) as { url: string; body: string }[];

  let lastError = "Could not post reply";
  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        method: "POST",
        headers,
        body: src.body,
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        lastError = "Reply API unavailable";
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastError =
          typeof data.error === "string" ? data.error : "Could not post reply";
        continue;
      }
      return data as { ok: boolean; reply: BlogReply };
    } catch {
      continue;
    }
  }
  throw new Error(lastError);
}

export async function deleteBlogReply(
  slug: string,
  payload: { replyId: string; deleteToken?: string },
  adminKey?: string
): Promise<{ ok: boolean; deletedIds?: string[] }> {
  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  const body = JSON.stringify({
    action: "delete-reply",
    slug,
    replyId: payload.replyId,
    deleteToken: payload.deleteToken ?? "",
  });
  const sources = [
    { url: "/api/blog", body },
    engineUrl
      ? {
          url: `${engineUrl}/blog/${encodeURIComponent(slug)}/replies/delete`,
          body: JSON.stringify({
            replyId: payload.replyId,
            deleteToken: payload.deleteToken ?? "",
          }),
        }
      : null,
  ].filter(Boolean) as { url: string; body: string }[];

  let lastError = "Could not delete reply";
  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        method: "POST",
        headers: adminHeaders(adminKey),
        body: src.body,
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        lastError = "Delete API unavailable";
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastError =
          typeof data.error === "string" ? data.error : "Could not delete reply";
        continue;
      }
      return data as { ok: boolean; deletedIds?: string[] };
    } catch {
      continue;
    }
  }
  throw new Error(lastError);
}

/** Date + local time for blog posts and comments. */
export function formatBlogDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
