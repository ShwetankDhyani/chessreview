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
  if (raw.includes("not found") || raw.includes("invalid")) {
    return {
      code: "GAME_SOURCE_NOT_FOUND",
      message: "Profile not found on the selected platform.",
      retryable: false,
    };
  }
  if (raw.includes("429") || raw.includes("rate")) {
    return {
      code: "GAME_RATE_LIMITED",
      message: "Rate-limited by provider. Please retry in a few seconds.",
      retryable: true,
    };
  }
  return {
    code: "GAME_LOAD_FAILED",
    message: "Could not load games right now. Check connection and retry.",
    retryable: true,
  };
}

export function normalizeAnalysisError(error: unknown): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  if (raw.includes("timeout")) {
    return {
      code: "ANALYSIS_TIMEOUT",
      message:
        "Analysis is taking too long. Retry or lower depth for faster results.",
      retryable: true,
    };
  }
  if (raw.includes("engine") || raw.includes("offline")) {
    return {
      code: "ANALYSIS_ENGINE_UNAVAILABLE",
      message: "Engine is unavailable. Reconnect and retry analysis.",
      retryable: true,
    };
  }
  return {
    code: "ANALYSIS_FAILED",
    message: "Analysis failed. Please retry in a moment.",
    retryable: true,
  };
}

export function normalizeShareError(error: unknown): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  if (raw.includes("not found") || raw.includes("invalid")) {
    return {
      code: "SHARE_NOT_FOUND",
      message: "This shared review link is invalid or no longer available.",
      retryable: false,
    };
  }
  if (raw.includes("timeout")) {
    return {
      code: "SHARE_TIMEOUT",
      message: "Share request timed out. Please try again.",
      retryable: true,
    };
  }
  return {
    code: "SHARE_FAILED",
    message: "Could not complete sharing right now. Please retry.",
    retryable: true,
  };
}

export function normalizeImportError(error: unknown): AppError {
  const rawMessage = extractMessage(error) ?? "";
  const raw = rawMessage.toLowerCase();
  if (raw.includes("invalid") || raw.includes("supported") || raw.includes("empty")) {
    return {
      code: "IMPORT_INVALID_INPUT",
      message: "Invalid game input. Paste a valid PGN or supported game URL.",
      retryable: false,
    };
  }
  if (raw.includes("not found")) {
    return {
      code: "IMPORT_GAME_NOT_FOUND",
      message: "Game not found at that URL. Verify link and try again.",
      retryable: true,
    };
  }
  return {
    code: "IMPORT_FAILED",
    message: "Could not import game right now. Retry or paste PGN manually.",
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
