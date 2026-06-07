/** Sync opening-book lookup for in-memory book maps during analysis. */
export function checkOpeningBookSync(
  fen: string,
  book?: ReadonlySet<string> | ReadonlyMap<string, boolean>
): boolean {
  if (!book) return false;
  if (book instanceof Set) return book.has(fen);
  if (book instanceof Map) return book.get(fen) === true;
  return false;
}
