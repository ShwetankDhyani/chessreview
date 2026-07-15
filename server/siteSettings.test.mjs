import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const DIR = join(tmpdir(), `cr-site-settings-${process.pid}`);

describe("siteSettings file store", () => {
  beforeEach(() => {
    rmSync(DIR, { recursive: true, force: true });
    mkdirSync(DIR, { recursive: true });
    process.env.REVIEW_STATS_DIR = DIR;
    delete process.env.EVAL_SERVER_URL;
    delete process.env.VITE_EVAL_SERVER_URL;
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(DIR, { recursive: true, force: true });
    delete process.env.REVIEW_STATS_DIR;
  });

  it("defaults testingMode to off and persists toggles", async () => {
    const mod = await import("./siteSettings.mjs");
    expect(mod.fileGetSiteSettings()).toEqual({ testingMode: false });
    expect(mod.fileSetSiteSettings({ testingMode: true })).toEqual({
      testingMode: true,
    });
    expect(mod.fileGetSiteSettings()).toEqual({ testingMode: true });
  });

  it("reads an existing settings file", async () => {
    writeFileSync(
      join(DIR, "site-settings.json"),
      JSON.stringify({ testingMode: true }),
      "utf8"
    );
    const mod = await import("./siteSettings.mjs");
    expect(mod.fileGetSiteSettings().testingMode).toBe(true);
  });

  it("recognizes the reserved site-settings blog slug", async () => {
    const mod = await import("./siteSettings.mjs");
    expect(mod.isSiteSettingsSlug("cr-site-settings")).toBe(true);
    expect(mod.isSiteSettingsSlug("hello")).toBe(false);
  });
});
