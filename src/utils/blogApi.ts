export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string | null;
  published: boolean;
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
  chesscom: string | null;
  lichess: string | null;
  createdAt: string;
};

function adminHeaders(adminKey?: string): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (adminKey) h["X-Admin-Key"] = adminKey;
  return h;
}

export async function fetchBlogList(opts?: {
  drafts?: boolean;
  adminKey?: string;
}): Promise<BlogPostSummary[]> {
  const qs = opts?.drafts ? "?drafts=1" : "";
  const res = await fetch(`/api/blog${qs}`, {
    headers: adminHeaders(opts?.adminKey),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Could not load blog");
  }
  return Array.isArray(data.posts) ? data.posts : [];
}

export async function fetchBlogPost(
  slug: string,
  adminKey?: string
): Promise<{ post: BlogPost; replies: BlogReply[] }> {
  const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`, {
    headers: adminHeaders(adminKey),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Post not found");
  }
  return data;
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
    chesscom?: string;
    lichess?: string;
    hp?: string;
  }
) {
  const res = await fetch(`/api/blog/${encodeURIComponent(slug)}?replies=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Could not post reply");
  }
  return data;
}

export function formatBlogDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
