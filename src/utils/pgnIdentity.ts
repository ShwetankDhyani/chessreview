/** Collapse whitespace so the same game compares equal across list/PGN paste. */
export function normalizePgn(pgn: string): string {
  return pgn.replace(/\s+/g, " ").trim();
}

export function samePgn(a: string, b: string): boolean {
  return normalizePgn(a) === normalizePgn(b);
}
