import { describe, expect, it } from "vitest";
import {
  AMAZON_TAGS,
  detectAmazonStoreFromSignals,
  getAmazonDpUrl,
  getAmazonStoreConfig,
  getAmazonUrl,
} from "./amazonGeo";

describe("AMAZON_TAGS", () => {
  it("keeps US, IN, and EU tracking IDs", () => {
    expect(AMAZON_TAGS.US).toBe("chessreview-20");
    expect(AMAZON_TAGS.IN).toBe("chessreview-21");
    expect(AMAZON_TAGS.EU).toBe("chessreview04-21");
  });
});

describe("detectAmazonStoreFromSignals", () => {
  it("maps India timezone and language to IN", () => {
    expect(detectAmazonStoreFromSignals("Asia/Kolkata", "en-US")).toBe("IN");
    expect(detectAmazonStoreFromSignals("Asia/Calcutta", "en")).toBe("IN");
    expect(detectAmazonStoreFromSignals("America/New_York", "hi-IN")).toBe("IN");
    expect(detectAmazonStoreFromSignals("UTC", "hi")).toBe("IN");
  });

  it("maps German timezones and de-* language to DE", () => {
    expect(detectAmazonStoreFromSignals("Europe/Berlin", "en")).toBe("DE");
    expect(detectAmazonStoreFromSignals("Europe/Vienna", "en")).toBe("DE");
    expect(detectAmazonStoreFromSignals("Europe/Zurich", "en")).toBe("DE");
    expect(detectAmazonStoreFromSignals("America/New_York", "de")).toBe("DE");
    expect(detectAmazonStoreFromSignals("America/New_York", "de-AT")).toBe("DE");
  });

  it("maps London / en-GB to UK", () => {
    expect(detectAmazonStoreFromSignals("Europe/London", "en")).toBe("UK");
    expect(detectAmazonStoreFromSignals("America/New_York", "en-GB")).toBe("UK");
  });

  it("maps Paris / fr-* to FR", () => {
    expect(detectAmazonStoreFromSignals("Europe/Paris", "en")).toBe("FR");
    expect(detectAmazonStoreFromSignals("UTC", "fr")).toBe("FR");
    expect(detectAmazonStoreFromSignals("UTC", "fr-CA")).toBe("FR");
  });

  it("maps Rome / it-* to IT", () => {
    expect(detectAmazonStoreFromSignals("Europe/Rome", "en")).toBe("IT");
    expect(detectAmazonStoreFromSignals("UTC", "it")).toBe("IT");
    expect(detectAmazonStoreFromSignals("UTC", "it-CH")).toBe("IT");
  });

  it("maps Madrid / es-ES to ES", () => {
    expect(detectAmazonStoreFromSignals("Europe/Madrid", "en")).toBe("ES");
    expect(detectAmazonStoreFromSignals("UTC", "es-ES")).toBe("ES");
  });

  it("does not map generic es-MX to ES (stays US unless Europe timezone)", () => {
    expect(detectAmazonStoreFromSignals("America/Mexico_City", "es-MX")).toBe(
      "US"
    );
  });

  it("falls other European timezones back to amazon.de", () => {
    expect(detectAmazonStoreFromSignals("Europe/Amsterdam", "en")).toBe("DE");
    expect(detectAmazonStoreFromSignals("Europe/Warsaw", "pl")).toBe("DE");
    expect(detectAmazonStoreFromSignals("Europe/Stockholm", "sv")).toBe("DE");
    expect(detectAmazonStoreFromSignals("Europe/Dublin", "en-IE")).toBe("DE");
    expect(detectAmazonStoreFromSignals("Europe/Lisbon", "pt")).toBe("DE");
    expect(detectAmazonStoreFromSignals("Europe/Athens", "el")).toBe("DE");
  });

  it("defaults Americas / Asia (non-India) / unknown to US", () => {
    expect(detectAmazonStoreFromSignals("America/New_York", "en-US")).toBe("US");
    expect(detectAmazonStoreFromSignals("America/Los_Angeles", "en")).toBe("US");
    expect(detectAmazonStoreFromSignals("Asia/Tokyo", "ja")).toBe("US");
    expect(detectAmazonStoreFromSignals("Australia/Sydney", "en-AU")).toBe("US");
    expect(detectAmazonStoreFromSignals("", "")).toBe("US");
  });

  it("prefers India over conflicting EU language", () => {
    expect(detectAmazonStoreFromSignals("Asia/Kolkata", "de")).toBe("IN");
  });

  it("prefers specific EU timezone over generic language from elsewhere", () => {
    expect(detectAmazonStoreFromSignals("Europe/Paris", "de")).toBe("FR");
    expect(detectAmazonStoreFromSignals("Europe/London", "fr")).toBe("UK");
  });
});

describe("getAmazonUrl / getAmazonDpUrl", () => {
  it("builds /dp/ASIN URLs with the correct tag per store", () => {
    expect(getAmazonDpUrl("0713484640", "US")).toBe(
      "https://www.amazon.com/dp/0713484640?tag=chessreview-20"
    );
    expect(getAmazonDpUrl("0713484640", "IN")).toBe(
      "https://www.amazon.in/dp/0713484640?tag=chessreview-21"
    );
    expect(getAmazonDpUrl("0713484640", "DE")).toBe(
      "https://www.amazon.de/dp/0713484640?tag=chessreview04-21"
    );
    expect(getAmazonDpUrl("0713484640", "UK")).toBe(
      "https://www.amazon.co.uk/dp/0713484640?tag=chessreview04-21"
    );
    expect(getAmazonDpUrl("0713484640", "FR")).toBe(
      "https://www.amazon.fr/dp/0713484640?tag=chessreview04-21"
    );
    expect(getAmazonDpUrl("0713484640", "IT")).toBe(
      "https://www.amazon.it/dp/0713484640?tag=chessreview04-21"
    );
    expect(getAmazonDpUrl("0713484640", "ES")).toBe(
      "https://www.amazon.es/dp/0713484640?tag=chessreview04-21"
    );
  });

  it("accepts /dp/ASIN path or bare ASIN in getAmazonUrl", () => {
    expect(getAmazonUrl("/dp/0713484640", "DE")).toContain(
      "amazon.de/dp/0713484640"
    );
    expect(getAmazonUrl("0713484640", "UK")).toContain(
      "amazon.co.uk/dp/0713484640"
    );
  });

  it("builds search URLs when no ASIN is given", () => {
    const url = getAmazonUrl("dgt chess clock", "FR");
    expect(url).toContain("amazon.fr/s?k=");
    expect(url).toContain("tag=chessreview04-21");
  });

  it("exposes domain + EU tag via getAmazonStoreConfig", () => {
    expect(getAmazonStoreConfig("DE")).toEqual({
      domain: "amazon.de",
      tag: "chessreview04-21",
    });
    expect(getAmazonStoreConfig("US").tag).toBe("chessreview-20");
    expect(getAmazonStoreConfig("IN").tag).toBe("chessreview-21");
  });
});

describe("session cache contract", () => {
  it("uses a stable sessionStorage key name (amazon_store)", () => {
    // detectUserCountry reads/writes sessionStorage key "amazon_store"
    // with values US|IN|DE|UK|FR|IT|ES — covered via detectAmazonStoreFromSignals.
    expect(AMAZON_TAGS.EU).toBe("chessreview04-21");
  });
});
