/**
 * Opening book stub — plug in your database / API.
 */
export async function checkOpeningBook(fen: string): Promise<boolean> {
  void fen;
  return false;
}

/** Sync fast path for in-memory book maps during analysis. */
export function checkOpeningBookSync(
  fen: string,
  book?: ReadonlySet<string> | ReadonlyMap<string, boolean>
): boolean {
  if (!book) return false;
  if (book instanceof Set) return book.has(fen);
  if (book instanceof Map) return book.get(fen) === true;
  return false;
}
