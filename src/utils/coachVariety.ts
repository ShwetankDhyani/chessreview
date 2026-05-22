/** Tracks commentary templates used in the current game review session. */

const usedTemplates = new Set<string>();

export function commentarySeed(
  move: { san: string; classification?: string | null; deltaE?: number },
  moveIdx: number
): number {
  const c = move.classification ?? "";
  return (
    moveIdx * 31 +
    move.san.length * 7 +
    c.length * 17 +
    Math.round(Math.abs(move.deltaE ?? 0) * 100)
  );
}

const MOVE_TOKEN =
  /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O-O|O-O)\b/g;

export function phraseTemplate(line: string): string {
  return line
    .replace(MOVE_TOKEN, "{move}")
    .toLowerCase()
    .replace(/[^a-z0-9{} ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function clearCoachPhraseMemory(): void {
  usedTemplates.clear();
}

export function rememberCoachPhrase(line: string): void {
  const t = phraseTemplate(line);
  if (t.length > 8) usedTemplates.add(t);
}

export function getUsedCoachPhraseTemplates(): string[] {
  return [...usedTemplates];
}

/** Pick a line whose template has not been used yet this game; walks the pool from seed. */
export function pickVariedLine<T extends string>(
  seed: number,
  lines: readonly T[],
  extraUsed: Iterable<string> = []
): T {
  if (!lines.length) throw new Error("pickVariedLine: empty pool");

  const used = new Set<string>([
    ...usedTemplates,
    ...[...extraUsed].map(phraseTemplate),
  ]);

  for (let i = 0; i < lines.length; i++) {
    const idx = (Math.abs(seed) + i) % lines.length;
    const line = lines[idx];
    if (!used.has(phraseTemplate(line))) {
      return line;
    }
  }

  const fallbackIdx = (Math.abs(seed) + used.size * 13) % lines.length;
  return lines[fallbackIdx];
}

export function pickSeededLine<T>(seed: number, lines: readonly T[]): T {
  if (!lines.length) throw new Error("pickSeededLine: empty pool");
  return lines[Math.abs(seed) % lines.length];
}

/** True if text shares too many words with any recent line or uses a banned opener. */
export function isRoboticRepetition(
  text: string,
  recent: string[],
  bannedSubstrings: readonly string[] = []
): boolean {
  const lower = text.toLowerCase();
  if (bannedSubstrings.some((p) => lower.includes(p))) return true;

  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  if (words.length < 4) return false;

  for (const prev of recent) {
    const prevWords = prev.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (prevWords.length < 4) continue;
    const overlap = words.filter((w) => prevWords.includes(w)).length;
    if (overlap / Math.min(words.length, prevWords.length) > 0.5) return true;

    const openerA = words.slice(0, 3).join(" ");
    const openerB = prevWords.slice(0, 3).join(" ");
    if (openerA === openerB) return true;
  }

  const tmpl = phraseTemplate(text);
  if (usedTemplates.has(tmpl)) return true;

  return false;
}
