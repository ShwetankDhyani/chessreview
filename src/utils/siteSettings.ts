export type SiteSettings = {
  testingMode: boolean;
  /** Missing = auto (top pinned post). Null = hidden. String = specific post slug. */
  homeGamesNewsSlug?: string | null;
};

export type SiteSettingsPatch = Partial<
  SiteSettings & { homeGamesNewsSlug?: string | null | "__auto__" }
>;

function parseSiteSettings(data: Record<string, unknown>): SiteSettings {
  const settings: SiteSettings = { testingMode: !!data.testingMode };
  if ("homeGamesNewsSlug" in data) {
    settings.homeGamesNewsSlug =
      typeof data.homeGamesNewsSlug === "string"
        ? data.homeGamesNewsSlug
        : data.homeGamesNewsSlug === null
          ? null
          : null;
  }
  return settings;
}

/** Reads site flags from public stats (no extra serverless function). */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch("/api/stats/public", { cache: "no-store" });
    if (!res.ok) return { testingMode: false };
    const data = await res.json();
    return parseSiteSettings(data);
  } catch {
    return { testingMode: false };
  }
}

export async function updateSiteSettings(
  adminKey: string,
  patch: SiteSettingsPatch
): Promise<SiteSettings> {
  const trimmed = adminKey.trim();
  const res = await fetch("/api/stats/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": trimmed,
    },
    body: JSON.stringify({ action: "site-settings", ...patch }),
  });
  if (res.status === 401) {
    throw new Error("Invalid admin key");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Update failed"
    );
  }
  return parseSiteSettings(data);
}
