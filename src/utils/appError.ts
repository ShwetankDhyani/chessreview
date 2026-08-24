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

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

function httpStatusOf(error: unknown): number | null {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return null;
}

/**
 * Classify a game-load failure.
 *
 * Typed errors from `netRetry` are checked first. Substring matching is only a
 * fallback for legacy throw sites — it must never be the reason a profile is
 * treated as nonexistent, since that unlinks the account.
 */
export function normalizeGameLoadError(
  error: unknown,
  platform?: GameSourcePlatform
): AppError {
  const raw = (extractMessage(error) ?? "").toLowerCase();
  const src = platformLabel(platform);
  const name = errorName(error);
  const status = httpStatusOf(error);

  const timedOut = name === "TimeoutError" || name === "AbortError";
  const notFound = name === "NotFoundError";
  const rateLimited = status === 429 || status === 403;
  const upstreamDown = status != null && status >= 500;
  const networkDown = name === "NetworkError";

  if (notFound) {
    return {
      code: "GAME_SOURCE_NOT_FOUND",
      message: `No ${src} profile by that name.`,
      retryable: false,
    };
  }

  if (rateLimited) {
    return {
      code: "GAME_RATE_LIMITED",
      message: `${src} is rate-limiting — wait a moment, or paste a link / PGN.`,
      retryable: true,
    };
  }

  if (upstreamDown) {
    return {
      code: "GAME_SOURCE_UNAVAILABLE",
      message: `${src} is having trouble right now — retry, or paste a link / PGN.`,
      retryable: true,
    };
  }

  if (networkDown) {
    return {
      code: "GAME_NETWORK_ERROR",
      message: `Can’t reach ${src} — check your connection and retry.`,
      retryable: true,
    };
  }

  if (timedOut || raw.includes("timeout") || raw.includes("timed out")) {
    return {
      code: "GAME_FETCH_TIMEOUT",
      message: `${src} timed out — retry, or paste a game link or PGN.`,
      retryable: true,
    };
  }

  if (raw.includes("429") || raw.includes("rate limit")) {
    return {
      code: "GAME_RATE_LIMITED",
      message: `${src} is rate-limiting — wait a moment, or paste a link / PGN.`,
      retryable: true,
    };
  }

  // Legacy string fallback. Kept last and deliberately strict so a transient
  // message containing "not found" cannot masquerade as a missing account.
  if (raw.includes("not found on")) {
    return {
      code: "GAME_SOURCE_NOT_FOUND",
      message: `No ${src} profile by that name.`,
      retryable: false,
    };
  }

  return {
    code: "GAME_LOAD_FAILED",
    message: `Couldn’t load ${src} games — retry, or paste a link or PGN.`,
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
