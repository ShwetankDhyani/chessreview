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
    expect(mod.fileSetSiteSettings({ testingMode: false })).toEqual({
      testingMode: false,
    });
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
});
