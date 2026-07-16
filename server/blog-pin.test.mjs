import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const DIR = join(tmpdir(), `cr-blog-pin-${process.pid}`);

describe("blog pin ordering", () => {
  beforeEach(() => {
    rmSync(DIR, { recursive: true, force: true });
    mkdirSync(DIR, { recursive: true });
    process.env.REVIEW_STATS_DIR = DIR;
    delete process.env.EVAL_SERVER_URL;
    delete process.env.VITE_EVAL_SERVER_URL;
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(DIR, { recursive: true, force: true });
    delete process.env.REVIEW_STATS_DIR;
  });

  it("lists pinned posts first by pinOrder, then by createdAt", async () => {
    const blog = await import("./blog.mjs");
    const older = blog.fileCreatePost({
      title: "Older unpinned",
      body: "body",
      published: true,
    });
    // Ensure distinct timestamps for createdAt sort among unpinned.
    await new Promise((r) => setTimeout(r, 5));
    const newer = blog.fileCreatePost({
      title: "Newer unpinned",
      body: "body",
      published: true,
    });
    const pinSecond = blog.fileCreatePost({
      title: "Pinned second",
      body: "body",
      published: true,
      pinned: true,
      pinOrder: 2,
    });
    const pinFirst = blog.fileCreatePost({
      title: "Pinned first",
      body: "body",
      published: true,
      pinned: true,
      pinOrder: 1,
    });

    const posts = blog.fileListPosts({ includeDrafts: true });
    expect(posts.map((p) => p.id)).toEqual([
      pinFirst.id,
      pinSecond.id,
      newer.id,
      older.id,
    ]);
    expect(posts[0].pinned).toBe(true);
    expect(posts[0].pinOrder).toBe(1);
    expect(posts[1].pinOrder).toBe(2);
    expect(posts[2].pinned).toBe(false);
  });

  it("updates pin fields and reorders on update", async () => {
    const blog = await import("./blog.mjs");
    const a = blog.fileCreatePost({
      title: "Post A",
      body: "body",
      pinned: true,
      pinOrder: 1,
    });
    const b = blog.fileCreatePost({
      title: "Post B",
      body: "body",
      pinned: true,
      pinOrder: 2,
    });
    blog.fileUpdatePost(b.id, { pinned: true, pinOrder: 1 });
    blog.fileUpdatePost(a.id, { pinned: true, pinOrder: 2 });
    const posts = blog.fileListPosts({ includeDrafts: true });
    expect(posts.map((p) => p.id)).toEqual([b.id, a.id]);
  });
});
