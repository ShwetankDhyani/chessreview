/**
 * Blog posts + replies (engine file store).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { join, extname } from "path";

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const BLOG_FILE = join(DATA_DIR, "blog.json");
const MEDIA_DIR = join(DATA_DIR, "blog-media");
const MAX_POSTS = 200;
const MAX_REPLIES_PER_POST = 500;
const MAX_TITLE = 160;
const MAX_EXCERPT = 320;
const MAX_BODY = 80_000;
const MAX_REPLY = 800;
const MAX_NAME = 40;
const MAX_MEDIA_BYTES = 2_500_000;
const MAX_REPLY_DEPTH = 5;

function newId(len = 10) {
  return randomBytes(8)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "x")
    .slice(0, len);
}

function hashDeleteToken(token) {
  return createHash("sha256").update(String(token ?? "")).digest("hex");
}

function publicReply(row) {
  return {
    id: row.id,
    name: row.name,
    body: row.body,
    parentId: row.parentId || null,
    chesscom: row.chesscom || null,
    lichess: row.lichess || null,
    createdAt: row.createdAt,
    isAuthor: !!row.isAuthor,
  };
}

function tokensMatch(provided, expectedHash) {
  const got = hashDeleteToken(provided);
  const expected = String(expectedHash ?? "");
  if (!expected || got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

function slugify(title) {
  const base = String(title ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return base || `post-${newId(6)}`;
}

function clip(value, max) {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

function loadState() {
  try {
    if (!existsSync(BLOG_FILE)) return { posts: [], replies: {} };
    const parsed = JSON.parse(readFileSync(BLOG_FILE, "utf8"));
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      replies:
        parsed.replies && typeof parsed.replies === "object" ? parsed.replies : {},
    };
  } catch {
    return { posts: [], replies: {} };
  }
}

function saveState(state) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${BLOG_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, BLOG_FILE);
}

function publicPost(p, replyCount = 0) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt || "",
    body: p.body,
    coverImage: p.coverImage || null,
    published: !!p.published,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    authorName: p.authorName || "ChessReview",
    replyCount,
  };
}

function replyCount(state, postId) {
  const list = state.replies[postId];
  return Array.isArray(list) ? list.length : 0;
}

export function fileListPosts({ includeDrafts = false } = {}) {
  const s = loadState();
  return s.posts
    .filter((p) => includeDrafts || p.published)
    .filter((p) => p.slug !== "cr-site-settings")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((p) => {
      const { body, ...rest } = publicPost(p, replyCount(s, p.id));
      return { ...rest, bodyPreview: clip(p.excerpt || p.body, 220) };
    });
}

export function fileGetPostBySlug(slug, { includeDrafts = false } = {}) {
  const key = String(slug ?? "").trim();
  if (!key) return null;
  const s = loadState();
  const p = s.posts.find((x) => x.slug === key);
  if (!p) return null;
  if (!includeDrafts && !p.published) return null;
  const replies = (s.replies[p.id] ?? [])
    .slice()
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((row) => publicReply(row));
  return { post: publicPost(p, replies.length), replies };
}

export function fileCreatePost(input) {
  const title = clip(input.title, MAX_TITLE);
  const body = clip(input.body, MAX_BODY);
  if (title.length < 2) throw new Error("Title is too short");
  if (body.length < 1) throw new Error("Body is required");

  const s = loadState();
  let slug = slugify(input.slug || title);
  while (s.posts.some((p) => p.slug === slug)) {
    slug = `${slugify(title)}-${newId(4)}`;
  }
  const now = new Date().toISOString();
  const post = {
    id: newId(12),
    slug,
    title,
    excerpt: clip(input.excerpt || body.replace(/[#>*`\[\]]/g, "").slice(0, MAX_EXCERPT), MAX_EXCERPT),
    body,
    coverImage: clip(input.coverImage, 500) || null,
    published: input.published !== false,
    authorName: clip(input.authorName || "ChessReview", 80) || "ChessReview",
    createdAt: now,
    updatedAt: now,
  };
  s.posts.unshift(post);
  if (s.posts.length > MAX_POSTS) s.posts.length = MAX_POSTS;
  s.replies[post.id] = [];
  saveState(s);
  return publicPost(post, 0);
}

export function fileUpdatePost(id, input) {
  const s = loadState();
  const idx = s.posts.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Post not found");
  const prev = s.posts[idx];
  const title = input.title != null ? clip(input.title, MAX_TITLE) : prev.title;
  const body = input.body != null ? clip(input.body, MAX_BODY) : prev.body;
  if (title.length < 2) throw new Error("Title is too short");
  if (body.length < 1) throw new Error("Body is required");

  let slug = prev.slug;
  if (input.slug != null && clip(input.slug, 80)) {
    slug = slugify(input.slug);
    if (s.posts.some((p) => p.slug === slug && p.id !== id)) {
      throw new Error("Slug already in use");
    }
  }

  const next = {
    ...prev,
    title,
    body,
    slug,
    excerpt:
      input.excerpt != null
        ? clip(input.excerpt, MAX_EXCERPT)
        : prev.excerpt,
    coverImage:
      input.coverImage !== undefined
        ? clip(input.coverImage, 500) || null
        : prev.coverImage,
    published:
      input.published !== undefined ? !!input.published : prev.published,
    authorName:
      input.authorName != null
        ? clip(input.authorName, 80) || "ChessReview"
        : prev.authorName,
    updatedAt: new Date().toISOString(),
  };
  s.posts[idx] = next;
  saveState(s);
  return publicPost(next, replyCount(s, next.id));
}

export function fileDeletePost(id) {
  const s = loadState();
  const idx = s.posts.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Post not found");
  s.posts.splice(idx, 1);
  delete s.replies[id];
  saveState(s);
  return { ok: true };
}

export function fileAddReply(postId, input, { asAuthor = false } = {}) {
  if (String(input?.website ?? "").trim() || String(input?.hp ?? "").trim()) {
    throw new Error("Rejected");
  }
  const body = clip(input?.body ?? input?.text, MAX_REPLY);
  if (body.length < 2) throw new Error("Reply is too short");

  const chesscom = clip(input?.chesscom ?? input?.chessCom, 40).replace(
    /^@/,
    ""
  );
  const lichess = clip(input?.lichess, 40).replace(/^@/, "");
  const parentId = clip(input?.parentId, 24) || null;

  const s = loadState();
  const post = s.posts.find((p) => p.id === postId);
  if (!post || !post.published) throw new Error("Post not found");

  // Author badge is server-set only (valid admin key). Spoof-proof vs typing the name.
  const authorName = clip(post.authorName || "ChessReview", MAX_NAME) || "ChessReview";
  const name = asAuthor ? authorName : clip(input?.name, MAX_NAME);
  if (name.length < 2) throw new Error("Name must be at least 2 characters");

  const list = Array.isArray(s.replies[postId]) ? s.replies[postId] : [];
  if (parentId) {
    const parent = list.find((r) => r.id === parentId);
    if (!parent) throw new Error("Parent reply not found");
    let depth = 1;
    let cursor = parent;
    while (cursor?.parentId) {
      depth += 1;
      cursor = list.find((r) => r.id === cursor.parentId);
      if (!cursor) break;
      if (depth >= MAX_REPLY_DEPTH) throw new Error("Thread is too deep");
    }
  }

  const deleteToken = randomBytes(18).toString("hex");
  const row = {
    id: newId(10),
    name,
    body,
    parentId,
    chesscom: chesscom || null,
    lichess: lichess || null,
    createdAt: new Date().toISOString(),
    deleteHash: hashDeleteToken(deleteToken),
    isAuthor: !!asAuthor,
  };
  list.push(row);
  if (list.length > MAX_REPLIES_PER_POST) {
    s.replies[postId] = list.slice(-MAX_REPLIES_PER_POST);
  } else {
    s.replies[postId] = list;
  }
  saveState(s);
  return { ...publicReply(row), deleteToken };
}

export function fileDeleteReply(postId, replyId, { deleteToken = "", asAdmin = false } = {}) {
  const s = loadState();
  const list = Array.isArray(s.replies[postId]) ? [...s.replies[postId]] : [];
  const idx = list.findIndex((r) => r.id === replyId);
  if (idx < 0) throw new Error("Reply not found");
  const row = list[idx];
  if (!asAdmin && !tokensMatch(deleteToken, row.deleteHash)) {
    throw new Error("Not allowed to delete this reply");
  }

  const remove = new Set([replyId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of list) {
      if (r.parentId && remove.has(r.parentId) && !remove.has(r.id)) {
        remove.add(r.id);
        changed = true;
      }
    }
  }

  s.replies[postId] = list.filter((r) => !remove.has(r.id));
  saveState(s);
  return { ok: true, deletedIds: [...remove] };
}

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

export function fileSaveBlogMedia({ base64, contentType, filename }) {
  const raw = String(base64 ?? "");
  const b64 = raw.includes(",") ? raw.split(",").pop() : raw;
  if (!b64) throw new Error("Missing image data");
  const buf = Buffer.from(b64, "base64");
  if (buf.length === 0) throw new Error("Empty image");
  if (buf.length > MAX_MEDIA_BYTES) throw new Error("Image too large (max ~2.5MB)");

  let ext = (extname(String(filename ?? "")) || "").toLowerCase();
  const ct = String(contentType ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    if (ct.includes("png")) ext = ".png";
    else if (ct.includes("webp")) ext = ".webp";
    else if (ct.includes("gif")) ext = ".gif";
    else ext = ".jpg";
  }
  if (!ALLOWED_EXT.has(ext)) throw new Error("Unsupported image type");

  mkdirSync(MEDIA_DIR, { recursive: true });
  const id = `${newId(12)}${ext}`;
  writeFileSync(join(MEDIA_DIR, id), buf);
  return { id, urlPath: `/api/blog-media/${id}` };
}

export function fileReadBlogMedia(id) {
  const safe = String(id ?? "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe !== id) return null;
  const path = join(MEDIA_DIR, safe);
  if (!existsSync(path)) return null;
  const ext = extname(safe).toLowerCase();
  const type =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/jpeg";
  return { buffer: readFileSync(path), contentType: type };
}

export function handleEngineBlogRequest(req, res, url, { readJsonBody, adminSecret }) {
  const path = url.pathname;

  // Media GET
  const mediaGet = path.match(/^\/blog-media\/([^/]+)$/);
  if (mediaGet && req.method === "GET") {
    const file = fileReadBlogMedia(decodeURIComponent(mediaGet[1]));
    if (!file) {
      res.writeHead(404);
      res.end("Not found");
      return true;
    }
    res.writeHead(200, {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(file.buffer);
    return true;
  }

  if (path === "/blog" && req.method === "GET") {
    const drafts = url.searchParams.get("drafts") === "1";
    const key = (
      req.headers["x-admin-key"] ??
      String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
    ).trim();
    const includeDrafts = drafts && adminSecret && key === adminSecret;
    res.writeHead(200);
    res.end(JSON.stringify({ posts: fileListPosts({ includeDrafts }) }));
    return true;
  }

  const postGet = path.match(/^\/blog\/([^/]+)$/);
  if (postGet && req.method === "GET") {
    const key = (
      req.headers["x-admin-key"] ??
      String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
    ).trim();
    const includeDrafts = !!(adminSecret && key === adminSecret);
    const data = fileGetPostBySlug(decodeURIComponent(postGet[1]), {
      includeDrafts,
    });
    if (!data) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
      return true;
    }
    res.writeHead(200);
    res.end(JSON.stringify(data));
    return true;
  }

  if (path === "/blog" && req.method === "POST") {
    void (async () => {
      try {
        const key = (
          req.headers["x-admin-key"] ??
          String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
        ).trim();
        if (!adminSecret || key !== adminSecret) {
          res.writeHead(401);
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
        const body = await readJsonBody(req);
        if (body?.action === "upload") {
          const media = fileSaveBlogMedia(body);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, ...media }));
          return;
        }
        if (body?.action === "update") {
          const post = fileUpdatePost(body.id, body);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, post }));
          return;
        }
        if (body?.action === "delete") {
          fileDeletePost(body.id);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        const post = fileCreatePost(body);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, post }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }));
      }
    })();
    return true;
  }

  const replyPost = path.match(/^\/blog\/([^/]+)\/replies$/);
  if (replyPost && req.method === "POST") {
    void (async () => {
      try {
        const slug = decodeURIComponent(replyPost[1]);
        const s = loadState();
        const post = s.posts.find((p) => p.slug === slug || p.id === slug);
        if (!post) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        const body = await readJsonBody(req);
        const key = (
          req.headers["x-admin-key"] ??
          String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
        ).trim();
        const asAuthor = !!(adminSecret && key && key === adminSecret);
        const reply = fileAddReply(post.id, body, { asAuthor });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, reply }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }));
      }
    })();
    return true;
  }

  const replyDelete = path.match(/^\/blog\/([^/]+)\/replies\/delete$/);
  if (replyDelete && req.method === "POST") {
    void (async () => {
      try {
        const slug = decodeURIComponent(replyDelete[1]);
        const s = loadState();
        const post = s.posts.find((p) => p.slug === slug || p.id === slug);
        if (!post) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        const body = await readJsonBody(req);
        const key = (
          req.headers["x-admin-key"] ??
          String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
        ).trim();
        const asAdmin = !!(adminSecret && key === adminSecret);
        const result = fileDeleteReply(post.id, String(body?.replyId ?? body?.id ?? "").trim(), {
          deleteToken: String(body?.deleteToken ?? "").trim(),
          asAdmin,
        });
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }));
      }
    })();
    return true;
  }

  return false;
}
