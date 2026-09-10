import { handlePrepRequest } from "../server/prepAnalyze.mjs";

/**
 * Opponent prep / current-form API.
 * Rewrites: POST /api/prep/analyze → /api/prep
 */
export default async function handler(req, res) {
  return handlePrepRequest(req, res);
}
