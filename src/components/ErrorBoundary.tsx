import React from "react";
import { trackAppError } from "../utils/appError";

interface Props {
  children: React.ReactNode;
  /** Identifies the failing area in copy and telemetry. */
  name: string;
  /**
   * Rendered instead of the default panel. Receives a reset callback so a
   * section can offer "try again" without reloading the page.
   */
  fallback?: (info: { error: Error; reset: () => void }) => React.ReactNode;
  /** Remount children when any of these change (e.g. route key). */
  resetKeys?: unknown[];
}

interface State {
  error: Error | null;
  /** Short code shown to the user so a report can be tied to a log line. */
  errorId: string | null;
}

function makeErrorId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function keysChanged(a: unknown[] = [], b: unknown[] = []): boolean {
  if (a.length !== b.length) return true;
  return a.some((value, i) => !Object.is(value, b[i]));
}

/**
 * Stops one broken subtree from taking down the app.
 *
 * React unmounts the entire tree on an uncaught render error, so without a
 * boundary any single throw leaves a blank page with no way back. Each
 * boundary keeps the failure local and always offers a route forward.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorId: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, errorId: makeErrorId() };
  }

  componentDidUpdate(prev: Props) {
    if (
      this.state.error &&
      keysChanged(prev.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    trackAppError({
      code: "RENDER_CRASH",
      message: error.message || "Render failed",
      context: {
        boundary: this.props.name,
        errorId: this.state.errorId,
        stack: error.stack?.slice(0, 800),
        componentStack: info.componentStack?.slice(0, 800),
      },
    });
  }

  reset = () => {
    this.setState({ error: null, errorId: null });
  };

  render() {
    const { error, errorId } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return (
      <div className="flex min-h-[12rem] flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-chess-hairline bg-chess-panel/80 p-5 text-center shadow-elev-2">
          <h2 className="text-sm font-bold tracking-tight text-chess-text">
            Something went wrong here
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-chess-muted">
            The rest of the app is still working. You can retry this section, or
            reload if it keeps happening.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-lg bg-chess-accent px-3 py-2 text-xs font-semibold text-white shadow-elev-1 transition-all duration-200 ease-soft hover:bg-chess-accent-hover active:scale-[0.97]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-chess-hairline px-3 py-2 text-xs font-semibold text-chess-subtext transition-all duration-200 ease-soft hover:bg-chess-hover active:scale-[0.97]"
            >
              Reload
            </button>
          </div>
          {errorId && (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-chess-muted/70">
              Ref {errorId}
            </p>
          )}
        </div>
      </div>
    );
  }
}
