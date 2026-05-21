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
      title: "Laptop engine connected",
      shortLabel: "Native",
    };
  }
  if (engineBackend === "unavailable") {
    return {
      tone: "offline",
      title: "Laptop engine offline — tap Depth to retry",
      shortLabel: "Offline",
    };
  }
  return {
    tone: "fallback",
    title: "Lichess fallback (slower than laptop engine)",
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
    label: "text-move-best",
    dot: "bg-move-best",
    depthActive: "bg-move-best text-white border-move-best",
    depthIdle:
      "bg-chess-panel text-chess-muted border-chess-border hover:text-move-best hover:border-move-best/40",
    mobileBtn: "border-move-best/45 text-move-best bg-move-best/10",
  },
  offline: {
    label: "text-amber-400",
    dot: "bg-amber-400",
    depthActive: "bg-amber-500/90 text-white border-amber-500",
    depthIdle:
      "bg-chess-panel text-amber-400/80 border-amber-500/30 hover:text-amber-300 hover:border-amber-500/50",
    mobileBtn: "border-amber-500/50 text-amber-400 bg-amber-500/10",
  },
  fallback: {
    label: "text-amber-300/90",
    dot: "bg-amber-400/80",
    depthActive: "bg-amber-600/80 text-white border-amber-600",
    depthIdle:
      "bg-chess-panel text-chess-muted border-chess-border hover:text-amber-300",
    mobileBtn: "border-amber-500/35 text-amber-300 bg-amber-500/5",
  },
  cloud: {
    label: "text-chess-muted",
    dot: "bg-chess-muted",
    depthActive: "bg-chess-border text-chess-text border-chess-border",
    depthIdle:
      "bg-chess-panel text-chess-muted border-chess-border hover:text-chess-text",
    mobileBtn: "border-chess-border text-chess-muted bg-chess-panel",
  },
};
