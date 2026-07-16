/**
 * Engine-line edge glow should only appear while the board is actually on a
 * continuation (user stepped into the better line). A best-move preview arrow
 * alone must not light the glow.
 */
export function shouldShowEngineLineGlow(opts: {
  continuationActive?: boolean;
  continuationFen?: string | null;
}): boolean {
  return Boolean(opts.continuationActive) || Boolean(opts.continuationFen);
}
