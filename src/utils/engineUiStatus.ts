export type EngineBackend = "native" | "cloud" | "browser" | "unavailable";
export type EngineTone = "online" | "offline" | "fallback" | "cloud";

export interface EngineUiStatus {
  tone: EngineTone;
  title: string;
  shortLabel: string;
}

export function resolveEngineUi(
  engineBackend: EngineBackend,
  hasRemoteEngine: boolean
): EngineUiStatus {
  if (!hasRemoteEngine) {
    if (engineBackend === "native") {
      return {
        tone: "online",
        title: "Native Stockfish",
        shortLabel: "Native",
      };
    }
    return {
      tone: "cloud",
      title: "Cloud / browser engine",
      shortLabel: "Cloud",
    };
  }
  if (engineBackend === "native") {
    return {
      tone: "online",
      title: "Deep review server connected",
      shortLabel: "Deep",
    };
  }
  if (engineBackend === "unavailable") {
    return {
      tone: "offline",
      title: "Review server offline — tap Depth to retry",
      shortLabel: "Offline",
    };
  }
  return {
    tone: "fallback",
    title: "Lichess fallback — connect your review server for full depth",
    shortLabel: "Fallback",
  };
}

export const ENGINE_TONE_STYLES: Record<
  EngineTone,
  {
    label: string;
    dot: string;
    depthActive: string;
    depthIdle: string;
    mobileBtn: string;
  }
> = {
  online: {
    label: "text-chess-accent",
    dot: "bg-chess-accent shadow-[0_0_8px_rgba(129,182,76,0.65)]",
    depthActive:
      "bg-chess-accent text-white border-chess-accent shadow-[0_0_10px_rgba(129,182,76,0.35)]",
    depthIdle:
      "bg-chess-surface text-chess-subtext border-chess-accent/25 hover:text-chess-accent hover:border-chess-accent/55",
    mobileBtn:
      "border-chess-accent/55 text-chess-accent bg-chess-accent/12 shadow-[0_0_8px_rgba(129,182,76,0.25)]",
  },
  offline: {
    label: "text-amber-400",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    depthActive: "bg-amber-500/90 text-white border-amber-500",
    depthIdle:
      "bg-chess-surface text-amber-400/85 border-amber-500/30 hover:text-amber-300 hover:border-amber-500/50",
    mobileBtn: "border-amber-500/55 text-amber-400 bg-amber-500/12",
  },
  fallback: {
    label: "text-amber-300/90",
    dot: "bg-amber-400/80",
    depthActive: "bg-amber-600/85 text-white border-amber-600",
    depthIdle:
      "bg-chess-surface text-chess-subtext border-amber-500/20 hover:text-amber-300 hover:border-amber-500/40",
    mobileBtn: "border-amber-500/35 text-amber-300 bg-amber-500/8",
  },
  cloud: {
    label: "text-chess-subtext",
    dot: "bg-chess-muted",
    depthActive: "bg-chess-border-strong text-chess-text border-chess-border-strong",
    depthIdle:
      "bg-chess-surface text-chess-subtext border-chess-border hover:text-chess-text",
    mobileBtn: "border-chess-border text-chess-subtext bg-chess-surface",
  },
};
