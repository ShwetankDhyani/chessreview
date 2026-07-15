export type SiteSettings = {
  testingMode: boolean;
};

const engineUrl = () =>
  import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "") || "";

/** Reads Testing Mode from public stats (no extra serverless function). */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const sources = [
    "/api/stats/public",
    engineUrl() ? `${engineUrl()}/site-settings` : null,
  ].filter(Boolean) as string[];

  for (const url of sources) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (typeof data.testingMode === "boolean") {
        return { testingMode: data.testingMode };
      }
      // Engine /site-settings shape
      if (url.includes("/site-settings")) {
        return { testingMode: !!data.testingMode };
      }
    } catch {
      /* try next */
    }
  }
  return { testingMode: false };
}

export async function updateSiteSettings(
  adminKey: string,
  patch: Partial<SiteSettings>
): Promise<SiteSettings> {
  const trimmed = adminKey.trim();
  const sources = [
    { url: "/api/stats/admin", viaStats: true },
    engineUrl()
      ? { url: `${engineUrl()}/site-settings`, viaStats: false }
      : null,
  ].filter(Boolean) as Array<{ url: string; viaStats: boolean }>;

  let lastError: Error | null = null;
  for (const { url, viaStats } of sources) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": trimmed,
        },
        body: JSON.stringify(
          viaStats ? { action: "site-settings", ...patch } : patch
        ),
      });
      if (res.status === 401) {
        throw new Error("Invalid admin key");
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Update failed"
        );
      }
      const data = await res.json();
      return { testingMode: !!data.testingMode };
    } catch (e) {
      if (e instanceof Error && e.message === "Invalid admin key") throw e;
      lastError = e instanceof Error ? e : new Error("Update failed");
    }
  }
  throw lastError ?? new Error("Could not update site settings");
}
