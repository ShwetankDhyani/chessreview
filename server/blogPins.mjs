/**
 * Blog pin map — works even when the engine blog.mjs predates `pinned` fields.
 *
 * Stored as a reserved published blog post (same pattern as site-settings):
 *   slug: cr-blog-pins
 *   body: { "pins": { "<postId>": <pinOrder> } }
 *
 * Lower pinOrder = higher on the list. Presence in the map means pinned.
 */

import { engineStatsUrl } from "./reviewStats.mjs";

export const BLOG_PINS_SLUG = "cr-blog-pins";
const BLOG_PINS_TITLE = "ChessReview blog pins";

export function isBlogPinsSlug(slug) {
  return String(slug ?? "").trim() === BLOG_PINS_SLUG;
}

export function isReservedBlogSlug(slug) {
  const s = String(slug ?? "").trim();
  return s === "cr-site-settings" || s === BLOG_PINS_SLUG;
}

function normalizeOrder(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(9999, Math.floor(n)));
}

/** @returns {Record<string, number>} */
export function parseBlogPinMap(payload) {
  let raw = payload;
  if (payload && typeof payload === "object" && typeof payload.body === "string") {
    try {
      raw = JSON.parse(payload.body);
    } catch {
      raw = null;
    }
  }
  if (payload?.post && typeof payload.post.body === "string") {
    try {
      raw = JSON.parse(payload.post.body);
    } catch {
      /* keep prior */
    }
  }
  const pins = raw?.pins;
  if (!pins || typeof pins !== "object") return {};
  /** @type {Record<string, number>} */
  const out = {};
  for (const [id, order] of Object.entries(pins)) {
    const key = String(id ?? "").trim();
    if (!key) continue;
    out[key] = normalizeOrder(order);
  }
  return out;
}

export function comparePostsWithPins(a, b) {
  const aPinned = !!a.pinned;
  const bPinned = !!b.pinned;
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  if (aPinned && bPinned) {
    const ao = normalizeOrder(a.pinOrder);
    const bo = normalizeOrder(b.pinOrder);
    if (ao !== bo) return ao - bo;
  }
  return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
}

/**
 * Overlay pin map onto posts. Map entries win when present.
 * Posts already carrying pinned from a newer engine are kept if not in the map.
 */
export function applyPinMapToPosts(posts, pinMap) {
  const map = pinMap && typeof pinMap === "object" ? pinMap : {};
  const hasMap = Object.keys(map).length > 0;
  return (posts ?? []).map((p) => {
    if (!p || typeof p !== "object") return p;
    const id = String(p.id ?? "");
    if (hasMap && Object.prototype.hasOwnProperty.call(map, id)) {
      return {
        ...p,
        pinned: true,
        pinOrder: normalizeOrder(map[id]),
      };
    }
    if (p.pinned) {
      return {
        ...p,
        pinned: true,
        pinOrder: normalizeOrder(p.pinOrder ?? 1),
      };
    }
    return { ...p, pinned: false, pinOrder: 0 };
  });
}

async function engineFetch(path, options = {}) {
  const base = engineStatsUrl();
  if (!base) return null;
  const res = await fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(12_000),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/** Public read — reserved post is published. */
export async function readBlogPinMap() {
  const res = await engineFetch(`/blog/${BLOG_PINS_SLUG}`);
  if (!res?.ok) return {};
  return parseBlogPinMap(res.data);
}

/**
 * Replace the full pin map (admin).
 * @param {Record<string, number>} pins
 */
export async function writeBlogPinMap(pins, adminKey) {
  const base = engineStatsUrl();
  if (!base) {
    // Local/file engines persist pins on the post itself — nothing to sync.
    return pins;
  }

  const clean = {};
  for (const [id, order] of Object.entries(pins ?? {})) {
    const key = String(id ?? "").trim();
    if (!key) continue;
    clean[key] = normalizeOrder(order);
  }
  const body = JSON.stringify({ pins: clean });
  const headers = {
    "Content-Type": "application/json",
    "X-Admin-Key": adminKey,
  };

  const existing = await engineFetch(`/blog/${BLOG_PINS_SLUG}`);
  if (existing?.ok && existing.data?.post?.id) {
    const res = await engineFetch("/blog", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "update",
        id: existing.data.post.id,
        title: BLOG_PINS_TITLE,
        slug: BLOG_PINS_SLUG,
        excerpt: "Internal blog pin map — hidden from the blog.",
        body,
        published: true,
      }),
    });
    if (res?.status === 401) {
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    if (!res?.ok) {
      throw new Error(
        (res?.data && typeof res.data.error === "string" && res.data.error) ||
          "Could not save pin map"
      );
    }
    return clean;
  }

  const created = await engineFetch("/blog", {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: BLOG_PINS_TITLE,
      slug: BLOG_PINS_SLUG,
      excerpt: "Internal blog pin map — hidden from the blog.",
      body,
      published: true,
    }),
  });
  if (created?.status === 401) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  if (!created?.ok) {
    throw new Error(
      (created?.data &&
        typeof created.data.error === "string" &&
        created.data.error) ||
        "Could not create pin map"
    );
  }
  return clean;
}

/** Set or clear one post's pin. Returns the updated map. */
export async function setPostPinInMap(postId, pinned, pinOrder, adminKey) {
  const id = String(postId ?? "").trim();
  if (!id) throw new Error("Missing post id");
  const map = await readBlogPinMap();
  if (pinned) {
    map[id] = normalizeOrder(pinOrder ?? map[id] ?? 1);
  } else {
    delete map[id];
  }
  return writeBlogPinMap(map, adminKey);
}
