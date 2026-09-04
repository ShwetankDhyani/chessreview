/**
 * Single source of truth for support/contact destinations.
 *
 * The Ko-fi URL is shown in more than one place, so it lives here rather than
 * being duplicated per component. `VITE_SUPPORT_LINKS` can override it without
 * a code change.
 */

export interface SupportLink {
  label: string;
  href: string;
}

export const SUPPORT_EMAIL = "admin@chessreview.org";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
export const DEFAULT_KOFI_URL = "https://ko-fi.com/shwetank";

export const CHESSCOM_USERNAME = "ShwetankDhyani";
export const CHESSCOM_MESSAGE_URL = `https://www.chess.com/messages/compose?to=${CHESSCOM_USERNAME}`;

const DEFAULT_SUPPORT_LINKS: SupportLink[] = [
  { label: "Buy me a coffee", href: DEFAULT_KOFI_URL },
];

/** Parse the optional env override, falling back to the built-in Ko-fi link. */
export function parseSupportLinks(raw?: string): SupportLink[] {
  const value = raw ?? (import.meta.env.VITE_SUPPORT_LINKS as string | undefined);
  if (!value?.trim()) return DEFAULT_SUPPORT_LINKS;
  try {
    const parsed = JSON.parse(value) as SupportLink[];
    const links = Array.isArray(parsed)
      ? parsed.filter(
          (l): l is SupportLink =>
            typeof l?.label === "string" &&
            typeof l?.href === "string" &&
            l.label.trim().length > 0 &&
            l.href.trim().length > 0
        )
      : [];
    return links.length > 0 ? links : DEFAULT_SUPPORT_LINKS;
  } catch {
    return DEFAULT_SUPPORT_LINKS;
  }
}

/** Primary place to send someone who wants to chip in. */
export function supportUrl(raw?: string): string {
  return parseSupportLinks(raw)[0]?.href ?? DEFAULT_KOFI_URL;
}
