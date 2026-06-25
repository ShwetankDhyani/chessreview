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

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractMessage(error: unknown): string | null {
  if (hasText(error)) return error;
  if (error instanceof Error && hasText(error.message)) return error.message;
  return null;
}

export function normalizeGameLoadError(error: unknown): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  if (raw.includes("timeout")) {
    return {
      code: "GAME_FETCH_TIMEOUT",
      message:
        "This is taking longer than usual (likely provider/API delay). Please retry now, or paste PGN / import a game URL so you can keep reviewing.",
      retryable: true,
    };
  }
  if (raw.includes("not found") || raw.includes("invalid")) {
    return {
      code: "GAME_SOURCE_NOT_FOUND",
      message:
        "I couldn't find that profile on the selected platform. Check spelling or paste a game PGN instead.",
      retryable: false,
    };
  }
  if (raw.includes("429") || raw.includes("rate")) {
    return {
      code: "GAME_RATE_LIMITED",
      message:
        "The game provider is rate-limiting requests right now. Please wait a few seconds and retry.",
      retryable: true,
    };
  }
  return {
    code: "GAME_LOAD_FAILED",
    message:
      "I couldn't load profile games right now (network/provider issue). Retry, or use PGN/game URL import so you're not blocked.",
    retryable: true,
  };
}

export function normalizeAnalysisError(error: unknown): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  if (raw.includes("timeout")) {
    return {
      code: "ANALYSIS_TIMEOUT",
      message:
        "Review is slower than usual, likely due to engine/server load. Retry now or lower depth for a faster pass.",
      retryable: true,
    };
  }
  if (raw.includes("engine") || raw.includes("offline")) {
    return {
      code: "ANALYSIS_ENGINE_UNAVAILABLE",
      message:
        "The review engine is currently unavailable. Retry in a moment, or import and browse moves while it recovers.",
      retryable: true,
    };
  }
  return {
    code: "ANALYSIS_FAILED",
    message:
      "Review couldn't finish this run. Please retry; if it keeps happening, try a lower depth for now.",
    retryable: true,
  };
}

export function normalizeShareError(error: unknown): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  if (raw.includes("not found") || raw.includes("invalid")) {
    return {
      code: "SHARE_NOT_FOUND",
      message:
        "This share link looks invalid or expired. Ask for a fresh link or open the game and share again.",
      retryable: false,
    };
  }
  if (raw.includes("timeout")) {
    return {
      code: "SHARE_TIMEOUT",
      message:
        "Sharing timed out (server took too long). Please retry in a moment.",
      retryable: true,
    };
  }
  return {
    code: "SHARE_FAILED",
    message:
      "I couldn't complete sharing right now. Please retry; your review data is still safe here.",
    retryable: true,
  };
}

export function normalizeImportError(error: unknown): AppError {
  const rawMessage = extractMessage(error) ?? "";
  const raw = rawMessage.toLowerCase();
  if (raw.includes("invalid") || raw.includes("supported") || raw.includes("empty")) {
    return {
      code: "IMPORT_INVALID_INPUT",
      message:
        "That input doesn't look like a valid game yet. Paste a full PGN or a finished chess.com/lichess game URL.",
      retryable: false,
    };
  }
  if (raw.includes("not found")) {
    return {
      code: "IMPORT_GAME_NOT_FOUND",
      message:
        "I couldn't find a game at that URL. Double-check the link, or paste PGN directly.",
      retryable: true,
    };
  }
  return {
    code: "IMPORT_FAILED",
    message:
      "Import didn't complete this time (usually network/provider related). Retry, or paste PGN manually to continue now.",
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
