export type SiteSettings = {
  testingMode: boolean;
};

/** Reads Testing Mode from public stats (no extra serverless function). */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch("/api/stats/public", { cache: "no-store" });
    if (!res.ok) return { testingMode: false };
    const data = await res.json();
    return { testingMode: !!data.testingMode };
  } catch {
    return { testingMode: false };
  }
}

export async function updateSiteSettings(
  adminKey: string,
  patch: Partial<SiteSettings>
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
  return { testingMode: !!data.testingMode };
}
