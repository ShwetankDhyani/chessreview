import React, { useCallback, useEffect, useRef, useState } from "react";
import { hapticSelection, hapticTap } from "../utils/chessSounds";

export type CameraPreset = "review" | "seat" | "side" | "flip";

export interface DirectionOrbProps {
  /** Camera azimuth in radians (0 = White seat looking toward Black). */
  azimuth: number;
  /** Current camera preset or "custom" if freely rotated. */
  activePreset: CameraPreset | "custom";
  /** Cycle to next preset on tap. */
  onCyclePreset: () => void;
  /** Orbit camera by pointer delta in pixels. */
  onOrbitDelta: (dx: number, dy: number) => void;
  /** Drag lifecycle callbacks. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
}

const PRESET_LABELS: Record<CameraPreset | "custom", string> = {
  review: "Focus Review",
  seat: "White Seat",
  flip: "Black Seat",
  side: "Side Angle",
  custom: "Free 3D",
};

export function DirectionOrb({
  azimuth,
  activePreset,
  onCyclePreset,
  onOrbitDelta,
  onDragStart,
  onDragEnd,
  className = "",
}: DirectionOrbProps) {
  const [showPill, setShowPill] = useState(false);
  const pillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  const displayPill = useCallback(() => {
    setShowPill(true);
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    pillTimerRef.current = setTimeout(() => setShowPill(false), 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    };
  }, []);

  // Needle angle: azimuth in radians mapped to degrees
  const needleDeg = (-azimuth * 180) / Math.PI;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // Do not preventDefault on mouse so clicks work cleanly; capture pointer for dragging
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    onDragStart?.();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !startPosRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
      onOrbitDelta(dx, dy);
      startPosRef.current = { x: e.clientX, y: e.clientY };
      displayPill();
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    onDragEnd?.();

    // If pointer did not move significantly, treat as a crisp tap
    if (!hasMovedRef.current) {
      hapticTap();
      onCyclePreset();
      displayPill();
    }
    startPosRef.current = null;
    hasMovedRef.current = false;
  };

  return (
    <div
      className={`absolute bottom-3 right-3 z-30 flex flex-col items-end gap-1.5 select-none touch-none ${className}`}
    >
      {/* Dynamic preset indicator pill */}
      <div
        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide backdrop-blur-md border transition-all duration-300 pointer-events-none ${
          showPill ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        } bg-black/75 border-white/15 text-white/90 shadow-md`}
      >
        {PRESET_LABELS[activePreset]}
      </div>

      {/* Frosted Glass Compass Orb */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`3D camera perspective: ${PRESET_LABELS[activePreset]}. Tap to cycle, drag to orbit.`}
        title="Tap to change view, drag to orbit 3D board"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            hapticTap();
            onCyclePreset();
            displayPill();
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onMouseEnter={() => {
          hapticSelection();
          displayPill();
        }}
        className="relative flex items-center justify-center w-11 h-11 rounded-full cursor-pointer transition-transform active:scale-95 bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/25 shadow-lg shadow-black/40 group touch-none"
        style={{ touchAction: "none" }}
      >
        {/* Subtle glass specular highlight ring */}
        <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />

        {/* Cardinal tick marks */}
        <div className="absolute inset-1 rounded-full border border-dashed border-white/15 pointer-events-none" />

        {/* Dynamic Rotating Compass Needle */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75 ease-out"
          style={{ transform: `rotate(${needleDeg}deg)` }}
        >
          {/* North / Opponent tip (Emerald accent) */}
          <div className="absolute top-1 w-1.5 h-3 bg-emerald-400 rounded-t-sm shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          {/* South / White seat tip (Silver/white) */}
          <div className="absolute bottom-1 w-1.5 h-3 bg-white/70 rounded-b-sm" />
        </div>

        {/* Center Orb Core: Mini 3D Perspective Badge */}
        <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-chess-panel/90 border border-white/20 shadow-inner text-white/80 group-hover:text-white transition-colors">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {/* Isometric 3D cube glyph */}
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
      </div>
    </div>
  );
}
