import { trackAppError } from "./appError";

/**
 * Catch-all reporting for failures that escape component-level handling.
 *
 * Error boundaries only see errors thrown during render. Anything thrown from
 * an event handler, a timer, or a floating promise bypasses them entirely and
 * previously vanished into the console. These listeners give every such failure
 * one consistent reporting path.
 */

let installed = false;

/** Chunk errors after a deploy are recoverable, but only reload once. */
const RELOAD_MARKER = "cr_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 60_000;

function messageOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value).slice(0, 300);
    } catch {
      return "Unserialisable rejection value";
    }
  }
  return String(value);
}

/**
 * A stale index.html requesting hashed chunks that no longer exist. Common for
 * a tab left open across a deploy, and fixed by reloading once.
 */
export function isStaleChunkError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("error loading dynamically imported module") ||
    m.includes("importing a module script failed") ||
    (m.includes("unexpected token") && m.includes("<"))
  );
}

function reloadOnceForStaleChunks(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_MARKER) ?? "0");
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) {
      // Already tried recently — reloading again would loop.
      return;
    }
    sessionStorage.setItem(RELOAD_MARKER, String(Date.now()));
    window.location.reload();
  } catch {
    /* sessionStorage unavailable — skip the auto-reload rather than risk a loop */
  }
}

export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("unhandledrejection", (event) => {
    const message = messageOf(event.reason);
    // Cancelled work is expected and reported by whoever initiated it.
    if (/aborterror|the operation was aborted/i.test(message)) return;

    trackAppError({
      code: "UNHANDLED_REJECTION",
      message,
      context: {
        stack:
          event.reason instanceof Error
            ? event.reason.stack?.slice(0, 600)
            : undefined,
      },
    });

    if (isStaleChunkError(message)) reloadOnceForStaleChunks();
  });

  window.addEventListener("error", (event) => {
    // Failed <img>/<script> loads surface here with no message; ignore them.
    if (!event.message) return;

    trackAppError({
      code: "UNCAUGHT_ERROR",
      message: event.message,
      context: {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error instanceof Error
          ? event.error.stack?.slice(0, 600)
          : undefined,
      },
    });

    if (isStaleChunkError(event.message)) reloadOnceForStaleChunks();
  });
}

/** Test seam. */
export function resetGlobalErrorHandlersForTests(): void {
  installed = false;
}
