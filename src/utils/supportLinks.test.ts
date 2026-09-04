import { describe, expect, it } from "vitest";
import {
  DEFAULT_KOFI_URL,
  parseSupportLinks,
  supportUrl,
} from "./supportLinks";

describe("parseSupportLinks", () => {
  it("falls back to the built-in Ko-fi link when unset", () => {
    expect(parseSupportLinks("")).toEqual([
      { label: "Buy me a coffee", href: DEFAULT_KOFI_URL },
    ]);
    expect(parseSupportLinks("   ")[0].href).toBe(DEFAULT_KOFI_URL);
  });

  it("uses a valid override", () => {
    const links = parseSupportLinks(
      JSON.stringify([{ label: "Support", href: "https://example.test/give" }])
    );
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe("https://example.test/give");
  });

  it("ignores malformed JSON rather than breaking the page", () => {
    expect(parseSupportLinks("{not json")[0].href).toBe(DEFAULT_KOFI_URL);
  });

  it("drops entries missing a label or href", () => {
    const links = parseSupportLinks(
      JSON.stringify([
        { label: "", href: "https://example.test/a" },
        { label: "No href" },
        { label: "Good", href: "https://example.test/b" },
      ])
    );
    expect(links).toHaveLength(1);
    expect(links[0].label).toBe("Good");
  });

  it("falls back when the override is not an array", () => {
    expect(parseSupportLinks(JSON.stringify({ label: "x" }))[0].href).toBe(
      DEFAULT_KOFI_URL
    );
  });

  it("falls back when every entry is unusable", () => {
    expect(parseSupportLinks(JSON.stringify([{}, null]))[0].href).toBe(
      DEFAULT_KOFI_URL
    );
  });
});

describe("supportUrl", () => {
  it("returns the first configured destination", () => {
    expect(
      supportUrl(
        JSON.stringify([
          { label: "First", href: "https://example.test/1" },
          { label: "Second", href: "https://example.test/2" },
        ])
      )
    ).toBe("https://example.test/1");
  });

  it("returns the Ko-fi link by default", () => {
    expect(supportUrl("")).toBe(DEFAULT_KOFI_URL);
  });
});
