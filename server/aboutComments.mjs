/**
 * Guestbook comments for the About page (engine server file store).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { randomBytes } from "crypto";
import { join } from "path";

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const COMMENTS_FILE = join(DATA_DIR, "about-comments.json");
const MAX_COMMENTS = 500;
const MAX_NAME = 40;
const MAX_BODY = 600;
const DEFAULT_PAGE_SIZE = 8;

function loadState() {
  try {
    if (!existsSync(COMMENTS_FILE)) return { comments: [] };
    const parsed = JSON.parse(readFileSync(COMMENTS_FILE, "utf8"));
    return {
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    };
  } catch {
    return { comments: [] };
  }
}

function saveState(state) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${COMMENTS_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, COMMENTS_FILE);
}

function newId() {
  return randomBytes(5).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x").slice(0, 10);
}

function sanitizeText(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function validateComment(body) {
  // Honeypot — bots fill this; humans leave it empty.
  if (body?.website || body?.hp) {
    throw new Error("Rejected");
  }
  const name = sanitizeText(body?.name, MAX_NAME);
  const text = sanitizeText(body?.body ?? body?.text, MAX_BODY);
  if (name.length < 2) throw new Error("Name must be at least 2 characters");
  if (text.length < 3) throw new Error("Comment is too short");
  if (text.length > MAX_BODY) throw new Error("Comment is too long");
  return { name, body: text };
}

export function fileListComments({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const size = Math.min(Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1), 20);
  const pageNum = Math.max(Number(page) || 1, 1);
  const s = loadState();
  const sorted = [...s.comments].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  );
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(pageNum, totalPages);
  const start = (current - 1) * size;
  const items = sorted.slice(start, start + size).map(({ id, name, body, createdAt }) => ({
    id,
    name,
    body,
    createdAt,
  }));
  return { items, page: current, pageSize: size, total, totalPages };
}

export function fileCreateComment(payload) {
  const { name, body } = validateComment(payload);
  const s = loadState();
  const row = {
    id: newId(),
    name,
    body,
    createdAt: new Date().toISOString(),
  };
  s.comments.unshift(row);
  if (s.comments.length > MAX_COMMENTS) {
    s.comments = s.comments.slice(0, MAX_COMMENTS);
  }
  saveState(s);
  return { id: row.id, createdAt: row.createdAt };
}

export function handleEngineAboutCommentsRequest(req, res, url, { readJsonBody }) {
  if (url.pathname !== "/about-comments") return false;

  if (req.method === "GET") {
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);
    res.writeHead(200);
    res.end(JSON.stringify(fileListComments({ page, pageSize })));
    return true;
  }

  if (req.method === "POST") {
    void (async () => {
      try {
        const body = await readJsonBody(req);
        const result = fileCreateComment(body);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed";
        res.writeHead(400);
        res.end(JSON.stringify({ error: message }));
      }
    })();
    return true;
  }

  res.writeHead(405);
  res.end(JSON.stringify({ error: "GET or POST only" }));
  return true;
}
