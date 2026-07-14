/**
 * Premium sensory layer — UIKit-inspired impacts + notification patterns,
 * wood move audio, and sonic haptic ticks for iOS Safari (no Vibration API).
 */

export type MoveSoundKind = "move" | "capture" | "castle" | "check" | "promote";

/** Mirrors UIImpactFeedbackStyle + UISelectionFeedbackGenerator + UINotificationFeedbackType. */
export type SensoryKind =
  | "selection"
  | "light"
  | "soft"
  | "medium"
  | "rigid"
  | "heavy"
  | "success"
  | "warning"
  | "error";

const SOUND_KEY = "cr_sound";
const HAPTIC_KEY = "cr_haptics";

type ChangeListener = () => void;
const prefsListeners = new Set<ChangeListener>();

function readPref(key: string, fallback = true): boolean {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return fallback;
  }
}

function writePref(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  prefsListeners.forEach((fn) => fn());
}

export function soundsEnabled(): boolean {
  return readPref(SOUND_KEY);
}

export function hapticsEnabled(): boolean {
  return readPref(HAPTIC_KEY);
}

export function setSoundsEnabled(on: boolean): void {
  writePref(SOUND_KEY, on);
}

export function setHapticsEnabled(on: boolean): void {
  writePref(HAPTIC_KEY, on);
}

export function subscribeSensoryPrefs(listener: ChangeListener): () => void {
  prefsListeners.add(listener);
  return () => prefsListeners.delete(listener);
}

export function soundKindFromSan(san: string): MoveSoundKind {
  if (/^O-O(-O)?[+#]?$/.test(san)) return "castle";
  if (san.includes("=")) return "promote";
  if (san.includes("x")) return "capture";
  if (san.includes("+") || san.includes("#")) return "check";
  return "move";
}

let audioCtx: AudioContext | null = null;
const lastFireAt = new Map<string, number>();

function canFire(slot: string, minGapMs: number): boolean {
  const now = performance.now();
  const prev = lastFireAt.get(slot) ?? 0;
  if (now - prev < minGapMs) return false;
  lastFireAt.set(slot, now);
  return true;
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** True when the device is likely touch-primary (phone / tablet). */
export function isTouchFeelDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if (window.matchMedia("(hover: none)").matches) return true;
  } catch {
    /* ignore */
  }
  return "ontouchstart" in window;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

export function unlockChessAudio(): void {
  void prepareChessAudio();
}

export async function prepareChessAudio(): Promise<void> {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    src.stop(0);
  } catch {
    /* ignore */
  }
}

async function ensureAudioReady(): Promise<AudioContext | null> {
  const ctx = getCtx();
  if (!ctx) return null;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state === "running" ? ctx : null;
  } catch {
    return null;
  }
}

function fillWoodKnock(
  data: Float32Array,
  sampleRate: number,
  opts: { baseHz: number; peak: number; thump?: number }
): void {
  const { baseHz, peak, thump = 0 } = opts;
  const len = data.length;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const attack = 1 - Math.exp(-t * 1400);
    const decay = Math.exp(-t * (46 + thump * 14));
    const env = attack * decay;
    const bend = 1 - t * (2.8 + thump * 0.6);
    const f1 = baseHz * Math.max(0.55, bend);
    const f2 = f1 * 0.5;
    const body =
      Math.sin(2 * Math.PI * f1 * t) * 0.72 +
      Math.sin(2 * Math.PI * f2 * t) * 0.28;
    data[i] = body * env * peak;
  }
}

function playWoodSound(ctx: AudioContext, kind: MoveSoundKind): void {
  const sampleRate = ctx.sampleRate;
  const profile: Record<
    MoveSoundKind,
    { duration: number; baseHz: number; peak: number; thump: number }
  > = {
    move: { duration: 0.042, baseHz: 172, peak: 0.13, thump: 0 },
    capture: { duration: 0.062, baseHz: 112, peak: 0.175, thump: 1.15 },
    castle: { duration: 0.058, baseHz: 148, peak: 0.145, thump: 0.45 },
    check: { duration: 0.048, baseHz: 205, peak: 0.125, thump: 0.15 },
    promote: { duration: 0.07, baseHz: 158, peak: 0.155, thump: 0.55 },
  };
  const p = profile[kind];
  const length = Math.floor(sampleRate * p.duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  fillWoodKnock(data, sampleRate, {
    baseHz: p.baseHz,
    peak: p.peak,
    thump: p.thump,
  });

  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = kind === "capture" ? 500 : 720;
  filter.Q.value = 0.55;
  gain.gain.value = 0.9;
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export async function playMoveSound(kind: MoveSoundKind): Promise<void> {
  if (!soundsEnabled()) return;
  unlockChessAudio();
  const ctx = await ensureAudioReady();
  if (!ctx) return;
  playWoodSound(ctx, kind);
}

/** Android Vibration API patterns modeled on UIKit feedback timings (ms). */
const VIBRATE: Record<SensoryKind, number | number[]> = {
  selection: 8,
  light: 12,
  soft: 16,
  medium: 22,
  rigid: [10, 16, 18],
  heavy: [18, 22, 32],
  success: [10, 40, 14, 48, 18],
  warning: [18, 60, 22],
  error: [28, 48, 36, 48, 48],
};

function vibrate(pattern: number | number[]): void {
  if (!hapticsEnabled() || typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/**
 * Micro-click / taptic proxy for iOS Safari (vibrate is unavailable).
 * Extremely short, quiet — felt as “click” more than heard when volume is normal.
 */
function playSonicTick(
  ctx: AudioContext,
  kind: SensoryKind,
  opts: { asHapticProxy: boolean; asUiSound: boolean }
): void {
  if (!opts.asHapticProxy && !opts.asUiSound) return;

  const sampleRate = ctx.sampleRate;
  type Tone = { hz: number; dur: number; peak: number; noise?: number };
  const tones: Record<SensoryKind, Tone[]> = {
    selection: [{ hz: 1180, dur: 0.009, peak: 0.045, noise: 0.08 }],
    light: [{ hz: 920, dur: 0.012, peak: 0.05, noise: 0.06 }],
    soft: [{ hz: 210, dur: 0.028, peak: 0.055, noise: 0.12 }],
    medium: [
      { hz: 180, dur: 0.018, peak: 0.06, noise: 0.1 },
      { hz: 980, dur: 0.01, peak: 0.032, noise: 0.05 },
    ],
    rigid: [
      { hz: 240, dur: 0.014, peak: 0.07, noise: 0.15 },
      { hz: 1400, dur: 0.008, peak: 0.04, noise: 0.04 },
    ],
    heavy: [
      { hz: 120, dur: 0.034, peak: 0.09, noise: 0.2 },
      { hz: 420, dur: 0.02, peak: 0.035, noise: 0.08 },
    ],
    success: [
      { hz: 520, dur: 0.03, peak: 0.045 },
      { hz: 690, dur: 0.032, peak: 0.05 },
      { hz: 880, dur: 0.04, peak: 0.055 },
    ],
    warning: [
      { hz: 420, dur: 0.04, peak: 0.05 },
      { hz: 380, dur: 0.05, peak: 0.045 },
    ],
    error: [
      { hz: 240, dur: 0.045, peak: 0.07, noise: 0.18 },
      { hz: 170, dur: 0.06, peak: 0.06, noise: 0.22 },
    ],
  };

  const hapticScale = opts.asHapticProxy ? (opts.asUiSound ? 0.72 : 1) : 0;
  const soundScale = opts.asUiSound ? (reducedMotion() ? 0.55 : 0.85) : 0;
  const amp = Math.max(hapticScale, soundScale);
  if (amp <= 0) return;

  let t0 = ctx.currentTime + 0.001;
  const seq = tones[kind];
  for (let i = 0; i < seq.length; i++) {
    const tone = seq[i]!;
    const length = Math.max(1, Math.floor(sampleRate * tone.dur));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let s = 0; s < length; s++) {
      const t = s / sampleRate;
      const attack = 1 - Math.exp(-t * 2200);
      const decay = Math.exp(-t * (90 + (kind === "heavy" ? 20 : 40)));
      const env = attack * decay;
      const sine = Math.sin(2 * Math.PI * tone.hz * t);
      const noise =
        (tone.noise ?? 0) > 0 ? (Math.random() * 2 - 1) * (tone.noise ?? 0) : 0;
      data[s] = (sine * (1 - (tone.noise ?? 0) * 0.4) + noise) * env * tone.peak * amp;
    }

    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = kind === "soft" || kind === "heavy" ? "lowpass" : "highpass";
    filter.frequency.value =
      kind === "soft" || kind === "heavy"
        ? 900
        : kind === "selection"
          ? 700
          : 420;
    filter.Q.value = 0.5;
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(gain);
    gain.gain.value = 1;
    gain.connect(ctx.destination);

    // Stagger notification chords like UINotificationFeedback.
    const gap =
      kind === "success" ? 0.045 : kind === "warning" ? 0.07 : kind === "error" ? 0.055 : 0;
    src.start(t0 + i * gap);
  }
}

function sensoryGap(kind: SensoryKind): number {
  switch (kind) {
    case "selection":
      return 14;
    case "light":
    case "soft":
      return 28;
    case "medium":
    case "rigid":
      return 40;
    case "heavy":
      return 80;
    case "success":
    case "warning":
    case "error":
      return 320;
    default:
      return 30;
  }
}

/**
 * Fire a UIKit-style impact / selection / notification.
 * On iPhone, pairs Android-style vibrate patterns with sonic ticks so feel survives Safari.
 */
export function sensate(kind: SensoryKind): void {
  if (!hapticsEnabled() && !soundsEnabled()) return;
  if (!canFire(`s:${kind}`, sensoryGap(kind))) return;

  unlockChessAudio();
  vibrate(VIBRATE[kind]);

  const touch = isTouchFeelDevice();
  const asHapticProxy = hapticsEnabled() && touch;
  // On touch: micro-ticks when haptics on (iOS proxy). Richer UI chirps when sounds on.
  // On desktop: only play chirps when sounds are on (avoid surprise clicks on mouse).
  const asUiSound =
    soundsEnabled() &&
    (kind === "success" ||
      kind === "warning" ||
      kind === "error" ||
      (touch && (kind === "medium" || kind === "rigid" || kind === "heavy")));

  if (!asHapticProxy && !asUiSound) return;

  void ensureAudioReady().then((ctx) => {
    if (!ctx) return;
    playSonicTick(ctx, kind, { asHapticProxy, asUiSound });
  });
}

/** Selection Changed — tabs, filters, switches. */
export function hapticSelection(): void {
  sensate("selection");
}

/** Default chrome tap (UIImpact light). */
export function hapticTap(): void {
  sensate("light");
}

/** Primary / confirming press. */
export function hapticTapStrong(): void {
  sensate("medium");
}

export function hapticSoft(): void {
  sensate("soft");
}

export function hapticRigid(): void {
  sensate("rigid");
}

export function hapticHeavy(): void {
  sensate("heavy");
}

export function notifySuccess(): void {
  sensate("success");
}

export function notifyWarning(): void {
  sensate("warning");
}

export function notifyError(): void {
  sensate("error");
}

const MOVE_VIBRATE: Record<MoveSoundKind, number | number[]> = {
  move: [10, 12, 16],
  capture: [16, 28, 22, 36],
  castle: [12, 20, 14, 18],
  check: [18, 36, 22],
  promote: [12, 24, 16, 28, 14],
};

export function playMoveFeedback(san: string): void {
  const kind = soundKindFromSan(san);
  unlockChessAudio();
  void playMoveSound(kind);

  if (!hapticsEnabled()) return;
  if (!canFire(`move:${kind}`, 28)) return;
  vibrate(MOVE_VIBRATE[kind]);

  // Subtle taptic proxy under the wood knock on phones (doesn’t fight the piece sound).
  if (isTouchFeelDevice()) {
    void ensureAudioReady().then((ctx) => {
      if (!ctx) return;
      playSonicTick(ctx, kind === "capture" || kind === "check" ? "rigid" : "light", {
        asHapticProxy: true,
        asUiSound: false,
      });
    });
  }
}
