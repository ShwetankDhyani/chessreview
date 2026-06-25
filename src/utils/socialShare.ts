export function buildReviewShareText(input: {
  whiteName: string;
  blackName: string;
  whiteAccuracy?: number;
  blackAccuracy?: number;
}): string {
  const { whiteName, blackName, whiteAccuracy, blackAccuracy } = input;
  const acc =
    typeof whiteAccuracy === "number" && typeof blackAccuracy === "number"
      ? ` (${Math.round(whiteAccuracy)}% vs ${Math.round(blackAccuracy)}% accuracy)`
      : "";
  return `${whiteName} vs ${blackName} — chess game review on ChessReview${acc}`;
}

export function whatsAppShareUrl(url: string, text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/** Instagram has no web share intent — copy link and open the app/site. */
export function instagramShareUrl(): string {
  return "https://www.instagram.com/";
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareViaNativeSheet(
  url: string,
  text: string
): Promise<"shared" | "cancelled" | "unavailable"> {
  if (!canUseNativeShare()) return "unavailable";
  try {
    await navigator.share({ title: "ChessReview", text, url });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    return "unavailable";
  }
}

export async function copyShareText(url: string, text: string): Promise<boolean> {
  const payload = `${text}\n${url}`;
  try {
    await navigator.clipboard.writeText(payload);
    return true;
  } catch {
    return false;
  }
}
