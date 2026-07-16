export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface AppErrorEvent {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export type GameSourcePlatform = "chesscom" | "lichess";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractMessage(error: unknown): string | null {
  if (hasText(error)) return error;
  if (error instanceof Error && hasText(error.message)) return error.message;
  return null;
}

function platformLabel(platform?: GameSourcePlatform): string {
  return platform === "lichess" ? "Lichess" : "Chess.com";
}

export function normalizeGameLoadError(
  error: unknown,
  platform?: GameSourcePlatform
): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  const src = platformLabel(platform);
  if (raw.includes("timeout")) {
    return {
      code: "GAME_FETCH_TIMEOUT",
      message: `${src} timed out — paste a game link or PGN.`,
      retryable: true,
    };
  }
  if (raw.includes("not found") || raw.includes("invalid")) {
    return {
      code: "GAME_SOURCE_NOT_FOUND",
      message: `No ${src} profile by that name.`,
      retryable: false,
    };
  }
  if (raw.includes("429") || raw.includes("rate")) {
    return {
      code: "GAME_RATE_LIMITED",
      message: `${src} is rate-limiting — wait a moment, or paste a link / PGN.`,
      retryable: true,
    };
  }
  return {
    code: "GAME_LOAD_FAILED",
    message: `Couldn’t load ${src} games — paste a link or PGN.`,
    retryable: true,
  };
}

export function normalizeAnalysisError(error: unknown): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  if (raw.includes("timeout")) {
    return {
      code: "ANALYSIS_TIMEOUT",
      message: "Review is slow right now — retry or lower depth.",
      retryable: true,
    };
  }
  if (raw.includes("engine") || raw.includes("offline")) {
    return {
      code: "ANALYSIS_ENGINE_UNAVAILABLE",
      message: "Engine unavailable — retry in a moment.",
      retryable: true,
    };
  }
  return {
    code: "ANALYSIS_FAILED",
    message: "Review didn’t finish — please retry.",
    retryable: true,
  };
}

export function normalizeShareError(error: unknown): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  if (raw.includes("not found") || raw.includes("invalid")) {
    return {
      code: "SHARE_NOT_FOUND",
      message: "Share link is invalid or expired.",
      retryable: false,
    };
  }
  if (raw.includes("timeout")) {
    return {
      code: "SHARE_TIMEOUT",
      message: "Share timed out — please retry.",
      retryable: true,
    };
  }
  return {
    code: "SHARE_FAILED",
    message: "Couldn’t share right now — please retry.",
    retryable: true,
  };
}

export function normalizeImportError(error: unknown): AppError {
  const rawMessage = extractMessage(error) ?? "";
  const raw = rawMessage.toLowerCase();
  if (raw.includes("invalid") || raw.includes("supported") || raw.includes("empty")) {
    return {
      code: "IMPORT_INVALID_INPUT",
      message: "Use a full PGN or finished game URL.",
      retryable: false,
    };
  }
  if (raw.includes("not found")) {
    return {
      code: "IMPORT_GAME_NOT_FOUND",
      message: "Game not found — check the link.",
      retryable: true,
    };
  }
  return {
    code: "IMPORT_FAILED",
    message: "Import failed — retry or paste PGN.",
    retryable: true,
  };
}

export function trackAppError(event: AppErrorEvent): void {
  // Lightweight telemetry hook: console + custom event for future analytics wiring.
  console.warn("[app-error]", event.code, event.message, event.context ?? {});
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cr_app_error", { detail: event }));
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
