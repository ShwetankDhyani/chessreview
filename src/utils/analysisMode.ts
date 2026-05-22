import type { EngineBackend } from "./engineUiStatus";

export type AnalysisQuality =
  | "deep-native"
  | "shallow-cloud"
  | "fallback-lichess"
  | "offline"
  | "local-dev";

export interface AnalysisModeInfo {
  quality: AnalysisQuality;
  badge: string;
  title: string;
  description: string;
}

export function resolveAnalysisMode(
  engineBackend: EngineBackend,
  hasRemoteEngine: boolean,
  depth: number
): AnalysisModeInfo {
  if (hasRemoteEngine && engineBackend === "native") {
    return {
      quality: "deep-native",
      badge: "Deep review",
      title: `Dedicated Stockfish · depth ${depth}`,
      description:
        "Full-game analysis on your server with best moves and engine lines.",
    };
  }

  if (hasRemoteEngine && engineBackend === "unavailable") {
    return {
      quality: "offline",
      badge: "Engine offline",
      title: "Review server unreachable",
      description:
        "Tap Depth to retry. Until connected, only a shallow cloud preview is possible.",
    };
  }

  if (hasRemoteEngine && (engineBackend === "cloud" || engineBackend === "browser")) {
    return {
      quality: "fallback-lichess",
      badge: "Fallback",
      title: "Lichess cloud eval (limited)",
      description:
        "Your review server is not connected — analysis is slower and may skip later moves.",
    };
  }

  if (!hasRemoteEngine && import.meta.env.PROD) {
    return {
      quality: "shallow-cloud",
      badge: "Fast mode",
      title: "Shallow cloud eval",
      description:
        "Set VITE_EVAL_SERVER_URL for deep Stockfish on every move. Current mode uses rate-limited cloud eval.",
    };
  }

  if (engineBackend === "native") {
    return {
      quality: "local-dev",
      badge: "Local engine",
      title: `Local Stockfish · depth ${depth}`,
      description: "Development mode — native eval server on this machine.",
    };
  }

  return {
    quality: "shallow-cloud",
    badge: "Cloud",
    title: "Cloud / browser engine",
    description: "Mixed Lichess and in-browser engine — good for quick checks.",
  };
}
