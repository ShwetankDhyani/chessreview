import { describe, expect, it } from "vitest";
import {
  APPEAL_FOR_HELP_SLUG,
  getStaticBlogPost,
  mergeStaticBlogPosts,
  STATIC_BLOG_POSTS,
} from "./staticBlogPosts.mjs";

describe("staticBlogPosts", () => {
  it("ships Appeal for Help with the existing Ko-fi link", () => {
    const post = getStaticBlogPost(APPEAL_FOR_HELP_SLUG);
    expect(post).toBeTruthy();
    expect(post.title).toBe("Appeal for Help");
    expect(post.body).toContain("https://ko-fi.com/shwetank");
    expect(post.body).toMatch(/free/i);
    expect(post.published).toBe(true);
  });

  it("merges static posts when the engine list lacks them", () => {
    const merged = mergeStaticBlogPosts([
      {
        id: "1",
        slug: "server-upgrade-complete",
        title: "Upgrade",
        excerpt: "",
        body: "x",
        published: true,
      },
    ]);
    expect(merged.some((p) => p.slug === APPEAL_FOR_HELP_SLUG)).toBe(true);
    expect(merged).toHaveLength(1 + STATIC_BLOG_POSTS.length);
  });

  it("does not duplicate a slug already present on the engine", () => {
    const merged = mergeStaticBlogPosts([
      {
        id: "engine-copy",
        slug: APPEAL_FOR_HELP_SLUG,
        title: "Engine copy",
        excerpt: "",
        body: "from engine",
        published: true,
      },
    ]);
    const appeals = merged.filter((p) => p.slug === APPEAL_FOR_HELP_SLUG);
    expect(appeals).toHaveLength(1);
    expect(appeals[0].title).toBe("Engine copy");
  });
});
