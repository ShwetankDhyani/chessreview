import { getPublicStats } from "../../server/reviewStats.mjs";
import { getSiteSettings } from "../../server/siteSettings.mjs";

export default async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const [stats, settings] = await Promise.all([
      getPublicStats(),
      getSiteSettings().catch(() => ({ testingMode: false })),
    ]);
    return res.status(200).json({
      ...stats,
      testingMode: !!settings?.testingMode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stats failed";
    return res.status(500).json({ error: message, configured: false });
  }
}
