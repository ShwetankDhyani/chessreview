import { handlePrepRequest } from "../server/prepAnalyze.mjs";

/**
 * H2H / recent-form API.
 * Rewrites: POST /api/h2h/analyze and /api/prep/analyze → /api/prep
 */
export default async function handler(req, res) {
  return handlePrepRequest(req, res);
}
