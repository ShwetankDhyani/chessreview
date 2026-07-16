/**
 * Blog API — engine file store with local fallback for non-Vercel.
 */

import { engineStatsUrl } from "./reviewStats.mjs";
import {
  fileAddReply,
  fileCreatePost,
  fileDeletePost,
  fileDeleteReply,
  fileGetPostBySlug,
  fileListPosts,
  fileReadBlogMedia,
  fileSaveBlogMedia,
  fileUpdatePost,
} from "./blog.mjs";
import {
  applyPinMapToPosts,
  comparePostsWithPins,
  isReservedBlogSlug,
  readBlogPinMap,
  setPostPinInMap,
} from "./blogPins.mjs";

function isWritableStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return true;
}

function adminKeyFrom(req) {
  return (
    req.headers?.["x-admin-key"] ??
    String(req.headers?.authorization ?? "").replace(/^Bearer\s+/i, "")
  ).trim();
}

function expectedAdmin() {
  return (process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY ?? "").trim();
}

async function engineJson(path, options = {}) {
  const base = engineStatsUrl();
  if (!base) return null;
  const res = await fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(20_000),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      `Blog failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function withPinsApplied(posts) {
  let pinMap = {};
  try {
    pinMap = await readBlogPinMap();
  } catch {
    pinMap = {};
  }
  return applyPinMapToPosts(posts, pinMap).sort(comparePostsWithPins);
}

async function syncPinFromBody(postId, body, adminKey) {
  if (!postId || body?.pinned === undefined) return;
  const pinned = !!body.pinned;
  const pinOrder = pinned ? body.pinOrder ?? 1 : 0;
  try {
    await setPostPinInMap(postId, pinned, pinOrder, adminKey);
  } catch (e) {
    // Pin map is required on Vercel (old engines strip post.pinned).
    if (!isWritableStore()) throw e;
  }
}

export async function listBlogPosts({ includeDrafts = false, adminKey = "" } = {}) {
  const base = engineStatsUrl();
  let data = null;
  if (base) {
    try {
      const qs = includeDrafts ? "?drafts=1" : "";
      const headers = {};
      if (includeDrafts && adminKey) headers["X-Admin-Key"] = adminKey;
      data = await engineJson(`/blog${qs}`, { headers });
    } catch (e) {
      if (!isWritableStore()) throw e;
    }
  }
  if (!data) data = { posts: fileListPosts({ includeDrafts }) };
  const posts = (data.posts ?? []).filter((p) => !isReservedBlogSlug(p?.slug));
  return {
    ...data,
    posts: await withPinsApplied(posts),
  };
}

export async function getBlogPost(slug, { adminKey = "" } = {}) {
  if (isReservedBlogSlug(slug)) return null;
  const base = engineStatsUrl();
  let data = null;
  if (base) {
    try {
      const headers = {};
      if (adminKey) headers["X-Admin-Key"] = adminKey;
      data = await engineJson(`/blog/${encodeURIComponent(slug)}`, { headers });
    } catch (e) {
      if (!isWritableStore()) throw e;
    }
  }
  if (!data) data = fileGetPostBySlug(slug, { includeDrafts: !!adminKey });
  if (!data?.post) return data;
  const [post] = await withPinsApplied([data.post]);
  return { ...data, post };
}

export async function createBlogPost(body, adminKey) {
  const base = engineStatsUrl();
  let result;
  if (base) {
    result = await engineJson("/blog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify(body),
    });
  } else {
    if (!isWritableStore()) {
      throw new Error("Blog storage unavailable. Set EVAL_SERVER_URL.");
    }
    result = { ok: true, post: fileCreatePost(body) };
  }
  const postId = result?.post?.id;
  await syncPinFromBody(postId, body, adminKey);
  if (result?.post) {
    const [post] = await withPinsApplied([result.post]);
    return { ...result, post };
  }
  return result;
}

export async function updateBlogPost(body, adminKey) {
  const base = engineStatsUrl();
  let result;
  if (base) {
    result = await engineJson("/blog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ ...body, action: "update" }),
    });
  } else {
    if (!isWritableStore()) throw new Error("Blog storage unavailable");
    result = { ok: true, post: fileUpdatePost(body.id, body) };
  }
  await syncPinFromBody(body?.id, body, adminKey);
  if (result?.post) {
    const [post] = await withPinsApplied([result.post]);
    return { ...result, post };
  }
  return result;
}

export async function deleteBlogPost(id, adminKey) {
  const base = engineStatsUrl();
  if (base) {
    const result = await engineJson("/blog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ action: "delete", id }),
    });
    try {
      await setPostPinInMap(id, false, 0, adminKey);
    } catch {
      /* best-effort cleanup */
    }
    return result;
  }
  if (!isWritableStore()) throw new Error("Blog storage unavailable");
  return fileDeletePost(id);
}

export async function uploadBlogMedia(body, adminKey) {
  const base = engineStatsUrl();
  if (base) {
    return engineJson("/blog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ ...body, action: "upload" }),
    });
  }
  if (!isWritableStore()) throw new Error("Blog storage unavailable");
  return { ok: true, ...fileSaveBlogMedia(body) };
}

export async function addBlogReply(slug, body, { adminKey = "" } = {}) {
  const asAuthor = !!(adminKey && adminKey === expectedAdmin());
  const base = engineStatsUrl();
  if (base) {
    return engineJson(`/blog/${encodeURIComponent(slug)}/replies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminKey ? { "X-Admin-Key": adminKey } : {}),
      },
      body: JSON.stringify(body),
    });
  }
  if (!isWritableStore()) throw new Error("Blog storage unavailable");
  const data = fileGetPostBySlug(slug);
  if (!data?.post) throw new Error("Post not found");
  return {
    ok: true,
    reply: fileAddReply(data.post.id, body, { asAuthor }),
  };
}

export async function deleteBlogReply(slug, body, { adminKey = "" } = {}) {
  const replyId = String(body?.replyId ?? body?.id ?? "").trim();
  const deleteToken = String(body?.deleteToken ?? "").trim();
  const asAdmin = !!(adminKey && adminKey === expectedAdmin());
  if (!replyId) throw new Error("Missing reply id");
  if (!asAdmin && !deleteToken) throw new Error("Missing reply credentials");

  const base = engineStatsUrl();
  if (base) {
    return engineJson(`/blog/${encodeURIComponent(slug)}/replies/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminKey ? { "X-Admin-Key": adminKey } : {}),
      },
      body: JSON.stringify({ replyId, deleteToken }),
    });
  }
  if (!isWritableStore()) throw new Error("Blog storage unavailable");
  const data = fileGetPostBySlug(slug, { includeDrafts: true });
  if (!data?.post) throw new Error("Post not found");
  return fileDeleteReply(data.post.id, replyId, { deleteToken, asAdmin });
}

export async function readBlogMedia(id) {
  const base = engineStatsUrl();
  if (base) {
    const res = await fetch(`${base}/blog-media/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return { buffer, contentType };
  }
  return fileReadBlogMedia(id);
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(data));
}

export function createBlogMiddleware() {
  return async (req, res, next) => {
    const rawUrl = req.url ?? "";
    const pathOnly = rawUrl.split("?")[0];

    if (pathOnly.startsWith("/api/blog-media/")) {
      const id = pathOnly.slice("/api/blog-media/".length);
      try {
        const file = await readBlogMedia(decodeURIComponent(id));
        if (!file) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", file.contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.end(file.buffer);
      } catch {
        res.statusCode = 500;
        res.end("Error");
      }
      return;
    }

    if (!pathOnly.startsWith("/api/blog")) return next();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      if (pathOnly === "/api/blog" && req.method === "GET") {
        const url = new URL(rawUrl, "http://localhost");
        const drafts = url.searchParams.get("drafts") === "1";
        const key = adminKeyFrom(req);
        if (drafts && key !== expectedAdmin()) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }
        const data = await listBlogPosts({
          includeDrafts: drafts,
          adminKey: key,
        });
        return sendJson(res, 200, data);
      }

      if (pathOnly === "/api/blog" && req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (body.action === "reply") {
          const slug = String(body.slug ?? "").trim();
          if (!slug) return sendJson(res, 400, { error: "Missing slug" });
          return sendJson(
            res,
            200,
            await addBlogReply(slug, body, { adminKey: adminKeyFrom(req) })
          );
        }
        if (body.action === "delete-reply") {
          const slug = String(body.slug ?? "").trim();
          if (!slug) return sendJson(res, 400, { error: "Missing slug" });
          return sendJson(
            res,
            200,
            await deleteBlogReply(slug, body, { adminKey: adminKeyFrom(req) })
          );
        }
        const key = adminKeyFrom(req);
        if (key !== expectedAdmin()) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }
        if (body.action === "upload") {
          return sendJson(res, 200, await uploadBlogMedia(body, key));
        }
        if (body.action === "update") {
          return sendJson(res, 200, await updateBlogPost(body, key));
        }
        if (body.action === "delete") {
          return sendJson(res, 200, await deleteBlogPost(body.id, key));
        }
        return sendJson(res, 200, await createBlogPost(body, key));
      }

      const replyMatch = pathOnly.match(/^\/api\/blog\/([^/]+)\/replies$/);
      if (replyMatch && req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        return sendJson(
          res,
          200,
          await addBlogReply(decodeURIComponent(replyMatch[1]), body, {
            adminKey: adminKeyFrom(req),
          })
        );
      }

      const postMatch = pathOnly.match(/^\/api\/blog\/([^/]+)$/);
      if (postMatch && req.method === "GET") {
        const data = await getBlogPost(decodeURIComponent(postMatch[1]), {
          adminKey: adminKeyFrom(req),
        });
        if (!data) return sendJson(res, 404, { error: "Not found" });
        return sendJson(res, 200, data);
      }

      return sendJson(res, 405, { error: "Method not allowed" });
    } catch (e) {
      const status = e?.status === 401 ? 401 : 400;
      return sendJson(res, status, {
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  };
}
