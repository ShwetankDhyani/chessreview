import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalyzedMove, ReviewSummary } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

let genAI: GoogleGenerativeAI | null = null;
function getClient() {
  if (!API_KEY || API_KEY === "your_api_key_here") return null;
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY);
  return genAI;
}

// ─── Live move comment ────────────────────────────────────────────────────────
export async function getMovComment(move: AnalyzedMove): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const loss = Math.abs(move.deltaE);
  const lossText = loss >= 0.05 ? `${loss.toFixed(2)} pawns` : null;
  const bestText = move.bestMoveSan ? `Engine's top choice: ${move.bestMoveSan}` : "";
  const pvText = move.pvLine?.length ? `Best line: ${move.pvLine.join(" ")}` : "";
  const moveNum = `${move.moveNumber}${move.color === "w" ? "." : "..."}`;

  // Eval context for the AI
  const cpBefore = move.evalBefore?.cp ?? 0;
  const cpAfter = move.evalAfter?.cp ?? 0;
  const sign = move.color === "w" ? 1 : -1;
  const playerEvalBefore = (sign * cpBefore / 100).toFixed(1);
  const playerEvalAfter = (sign * cpAfter / 100).toFixed(1);

  const prompt = `You are a world-class chess coach giving a brief, insightful comment about a move in a student's game.

Position context:
- Move played: ${moveNum}${move.san}
- Classification: ${move.classification}
- Player's eval before: ${playerEvalBefore} (from their perspective)
- Player's eval after: ${playerEvalAfter}
${lossText ? `- Eval cost: ~${lossText}` : ""}
${bestText ? `- ${bestText}` : ""}
${pvText ? `- ${pvText}` : ""}
- Position FEN (before): ${move.fenBefore}

YOUR TASK: Write ONE coaching insight (2-3 sentences, max 180 characters). 

RULES:
- Do NOT just restate the classification ("this is a blunder"). The student can see that.
- Instead, explain the CHESS REASON: what tactical/positional/strategic element makes this move good or bad.
- Reference concrete chess concepts: pins, forks, weak squares, development, king safety, pawn structure, piece activity, tempo, initiative, etc.
- For bad moves: explain what the move fails to address or what it allows the opponent to do.
- For good moves: explain the strategic/tactical idea behind it.
- Be warm, concise, and genuinely helpful — like a mentor, not a textbook.
- No markdown, no asterisks, no emojis.
- Vary your sentence structure. Never start with "This move" or "The move."`;

  try {
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().slice(0, 250);
    // Clean any stray markdown
    return text.replace(/\*+/g, "").replace(/^["']|["']$/g, "");
  } catch {
    return null;
  }
}

// ─── Full game coaching report ────────────────────────────────────────────────
export interface CoachReport {
  summary: string;
  tips: Array<{ icon: string; title: string; body: string; color: string; bg: string; moveIdx?: number }>;
}

export async function getGameReport(
  moves: AnalyzedMove[],
  summary: ReviewSummary,
  playerName: string
): Promise<CoachReport | null> {
  const client = getClient();
  if (!client) return null;

  const blunders  = moves.filter(m => m.classification === "blunder");
  const mistakes  = moves.filter(m => m.classification === "mistake");
  const brilliant = moves.filter(m => m.classification === "brilliant");
  const opening   = moves.slice(0, 6).map(m => m.san).join(" ");
  const wAcc = summary.accuracy.white.toFixed(1);
  const bAcc = summary.accuracy.black.toFixed(1);
  const worstBlunder = [...blunders].sort((a,b) => Math.abs(b.deltaE)-Math.abs(a.deltaE))[0];

  const prompt = `You are a chess coach writing a post-game training report for ${playerName}.

Game stats:
- Accuracy: White ${wAcc}%, Black ${bAcc}%
- Blunders: ${blunders.length}, Mistakes: ${mistakes.length}, Brilliant moves: ${brilliant.length}
- Opening moves: ${opening}
${worstBlunder ? `- Worst blunder: move ${worstBlunder.moveNumber}${worstBlunder.color==="w"?".":"..."}${worstBlunder.san}${worstBlunder.bestMoveSan ? `, should have played ${worstBlunder.bestMoveSan}` : ""}` : ""}

Write a JSON response with this exact structure (no markdown, just raw JSON):
{
  "summary": "A warm 2-sentence overall assessment of the game",
  "tips": [
    {
      "icon": "emoji",
      "title": "Short title (4-6 words)",
      "body": "1-2 sentences of specific, actionable coaching advice",
      "color": "one of: #1baca6 #6daa6d #e6c84a #e07b39 #ca3c3c #5c8bb0 #a88865"
    }
  ]
}

Give 3-4 tips. Be specific, direct, encouraging. Reference actual moves from the game. Vary phrasing — no repetitive sentence starts.`;

  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim()
      .replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(text) as { summary: string; tips: Array<{ icon: string; title: string; body: string; color: string }> };

    return {
      summary: parsed.summary,
      tips: parsed.tips.map(t => ({
        ...t,
        bg: t.color + "18",
        color: t.color,
      })),
    };
  } catch {
    return null;
  }
}

export function isGeminiConfigured(): boolean {
  return !!API_KEY && API_KEY !== "your_api_key_here";
}
