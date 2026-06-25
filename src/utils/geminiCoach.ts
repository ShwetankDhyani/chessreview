import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalyzedMove, ReviewSummary } from "../types";
import { buildFactualMoveComment } from "./factualMoveComment";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

let genAI: GoogleGenerativeAI | null = null;

function getClient() {
  if (!API_KEY || API_KEY === "your_api_key_here") return null;
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY);
  return genAI;
}

export function clearCoachMemory() {
  /* no per-move phrase memory — move comments are factual/deterministic */
}

export interface MoveCommentContext {
  moveIdx?: number;
  openingHint?: string;
  moves?: AnalyzedMove[];
}

/** Per-move coach text is always factual — no Gemini for individual plies. */
export async function getMovComment(
  _move: AnalyzedMove,
  _ctx: MoveCommentContext = {}
): Promise<string | null> {
  return null;
}

export function getFallbackMoveComment(
  move: AnalyzedMove,
  openingHint?: string,
  moveIdx = 0,
  moves?: AnalyzedMove[]
): string | null {
  return buildFactualMoveComment(move, { openingHint, moveIdx, moves });
}

// ─── Full game coaching report ────────────────────────────────────────────────
export interface CoachReport {
  summary: string;
  tips: Array<{
    icon: string;
    title: string;
    body: string;
    color: string;
    bg: string;
    moveIdx?: number;
  }>;
}

export async function getGameReport(
  moves: AnalyzedMove[],
  summary: ReviewSummary,
  playerName: string
): Promise<CoachReport | null> {
  const client = getClient();
  if (!client) return null;

  const blunders = moves.filter((m) => m.classification === "blunder");
  const mistakes = moves.filter((m) => m.classification === "mistake");
  const brilliant = moves.filter((m) => m.classification === "brilliant");
  const opening = moves.slice(0, 6).map((m) => m.san).join(" ");
  const wAcc = summary.accuracy.white.toFixed(1);
  const bAcc = summary.accuracy.black.toFixed(1);
  const worstBlunder = [...blunders].sort(
    (a, b) => Math.abs(b.deltaE) - Math.abs(a.deltaE)
  )[0];

  const prompt = `You are a chess coach writing a post-game training report for ${playerName}.

Game stats:
- Accuracy: White ${wAcc}%, Black ${bAcc}%
- Blunders: ${blunders.length}, Mistakes: ${mistakes.length}, Brilliant moves: ${brilliant.length}
- Opening moves: ${opening}
${worstBlunder ? `- Worst blunder: move ${worstBlunder.moveNumber}${worstBlunder.color === "w" ? "." : "..."}${worstBlunder.san}${worstBlunder.bestMoveSan ? `, should have played ${worstBlunder.bestMoveSan}` : ""}` : ""}

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

Give 3-4 tips. Be specific and conversational. Never reuse the same sentence opener twice.`;

  try {
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0.85, maxOutputTokens: 600 },
    });
    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .trim()
      .replace(/^```json\n?/, "")
      .replace(/^```\n?/, "")
      .replace(/\n?```$/, "");
    const parsed = JSON.parse(text) as {
      summary: string;
      tips: Array<{ icon: string; title: string; body: string; color: string }>;
    };

    return {
      summary: parsed.summary,
      tips: parsed.tips.map((t) => ({
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
