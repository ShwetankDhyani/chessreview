/**
 * Sensory hierarchy:
 * - Navigation (tabs, profile, filters): lighter haptic — register the tap, nothing more
 * - Buttons / primary chrome: medium haptic
 * - Chess board plies: strongest haptics + Chess.com-like move sounds
 * - Rare soft review announcement tones
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

export type AnnounceKind = "start" | "done" | "warn" | "error";

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

function shouldPlayHapticProxy(): boolean {
  const vibrateOk =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  return isTouchFeelDevice() || !vibrateOk;
}

/* ── Chess.com–inspired board sounds ──────────────────────────────────── */

function fillImpulse(
  data: Float32Array,
  sampleRate: number,
  opts: {
    baseHz: number;
    peak: number;
    attack: number;
    decay: number;
    noise: number;
    bend?: number;
  }
): void {
  const { baseHz, peak, attack, decay, noise, bend = 2.4 } = opts;
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const env = (1 - Math.exp(-t * attack)) * Math.exp(-t * decay);
    const f = baseHz * Math.max(0.55, 1 - t * bend);
    const tone =
      Math.sin(2 * Math.PI * f * t) * 0.72 +
      Math.sin(2 * Math.PI * f * 0.5 * t) * 0.28;
    const grit = (Math.random() * 2 - 1) * noise;
    data[i] = (tone * (1 - noise * 0.35) + grit) * env * peak;
  }
}

function playBuffered(
  ctx: AudioContext,
  buffer: AudioBuffer,
  opts: { lp: number; gain?: number; when?: number }
): void {
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.lp;
  filter.Q.value = 0.55;
  gain.gain.value = opts.gain ?? 0.95;
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(opts.when ?? ctx.currentTime);
}

/** Distinctive piece sounds in the Chess.com / modern online-chess vein. */
function playWoodSound(ctx: AudioContext, kind: MoveSoundKind): void {
  const sampleRate = ctx.sampleRate;
  const t0 = ctx.currentTime + 0.001;

  const make = (
    dur: number,
    fill: (data: Float32Array) => void,
    lp: number,
    when = t0,
    gain = 0.95
  ) => {
    const length = Math.max(1, Math.floor(sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    fill(buffer.getChannelData(0));
    playBuffered(ctx, buffer, { lp, when, gain });
  };

  switch (kind) {
    case "move":
      // Crisp wood drop — clear but not loud.
      make(
        0.055,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 185,
            peak: 0.16,
            attack: 1600,
            decay: 48,
            noise: 0.12,
            bend: 2.6,
          }),
        780
      );
      break;
    case "capture":
      // Heavier board thump + short clack.
      make(
        0.07,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 95,
            peak: 0.2,
            attack: 1200,
            decay: 34,
            noise: 0.22,
            bend: 1.8,
          }),
        420
      );
      make(
        0.04,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 240,
            peak: 0.1,
            attack: 2000,
            decay: 70,
            noise: 0.08,
            bend: 3.2,
          }),
        900,
        t0 + 0.018,
        0.7
      );
      break;
    case "castle":
      // Two quick wood taps (king + rook).
      make(
        0.045,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 165,
            peak: 0.14,
            attack: 1500,
            decay: 55,
            noise: 0.1,
          }),
        700
      );
      make(
        0.05,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 145,
            peak: 0.13,
            attack: 1400,
            decay: 48,
            noise: 0.12,
          }),
        650,
        t0 + 0.055
      );
      break;
    case "check":
      // Piece drop + bright alert tick.
      make(
        0.05,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 175,
            peak: 0.145,
            attack: 1600,
            decay: 50,
            noise: 0.1,
          }),
        720
      );
      make(
        0.035,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 520,
            peak: 0.075,
            attack: 2200,
            decay: 90,
            noise: 0.04,
            bend: 1.2,
          }),
        1800,
        t0 + 0.028,
        0.65
      );
      break;
    case "promote":
      // Soft climb — restrained, still special.
      make(
        0.05,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 160,
            peak: 0.14,
            attack: 1400,
            decay: 48,
            noise: 0.1,
          }),
        680
      );
      make(
        0.06,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 280,
            peak: 0.09,
            attack: 1200,
            decay: 40,
            noise: 0.05,
            bend: 1.4,
          }),
        1100,
        t0 + 0.04,
        0.7
      );
      make(
        0.07,
        (data) =>
          fillImpulse(data, sampleRate, {
            baseHz: 360,
            peak: 0.07,
            attack: 1000,
            decay: 36,
            noise: 0.03,
            bend: 1.1,
          }),
        1400,
        t0 + 0.085,
        0.55
      );
      break;
  }
}

export async function playMoveSound(kind: MoveSoundKind): Promise<void> {
  if (!soundsEnabled()) return;
  unlockChessAudio();
  const ctx = await ensureAudioReady();
  if (!ctx) return;
  playWoodSound(ctx, kind);
}

/* ── Soft low announcement cues (rare) ────────────────────────────────── */

function playAnnounceTone(ctx: AudioContext, kind: AnnounceKind): void {
  const sampleRate = ctx.sampleRate;
  type Tone = { hz: number; dur: number; peak: number; delay: number };
  const seq: Record<AnnounceKind, Tone[]> = {
    start: [{ hz: 164, dur: 0.09, peak: 0.055, delay: 0 }],
    done: [
      { hz: 148, dur: 0.07, peak: 0.045, delay: 0 },
      { hz: 196, dur: 0.1, peak: 0.05, delay: 0.08 },
    ],
    warn: [
      { hz: 140, dur: 0.08, peak: 0.048, delay: 0 },
      { hz: 118, dur: 0.09, peak: 0.042, delay: 0.09 },
    ],
    error: [
      { hz: 110, dur: 0.09, peak: 0.055, delay: 0 },
      { hz: 88, dur: 0.12, peak: 0.05, delay: 0.1 },
    ],
  };

  const t0 = ctx.currentTime + 0.002;
  for (const tone of seq[kind]) {
    const length = Math.max(1, Math.floor(sampleRate * tone.dur));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = (1 - Math.exp(-t * 80)) * Math.exp(-t * 28);
      data[i] = Math.sin(2 * Math.PI * tone.hz * t) * env * tone.peak;
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.4;
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(gain);
    gain.gain.value = 0.8;
    gain.connect(ctx.destination);
    src.start(t0 + tone.delay);
  }
}

/** Soft site announcement — review start/done and rare warnings. */
export function announce(kind: AnnounceKind): void {
  if (!soundsEnabled()) return;
  if (!canFire(`announce:${kind}`, 400)) return;
  unlockChessAudio();
  void ensureAudioReady().then((ctx) => {
    if (!ctx) return;
    playAnnounceTone(ctx, kind);
  });
}

/* ── Haptics ───────────────────────────────────────────────────────────── */

/**
 * Hierarchy (approx):
 *   selection / soft  ≈ ½ of board move  → navigation chrome
 *   light / medium    → buttons & primary UI
 *   board plies       → strongest (+ sound)
 */
const VIBRATE: Record<SensoryKind, number | number[]> = {
  selection: 10,
  soft: 12,
  light: 22,
  medium: 32,
  rigid: [18, 22, 30],
  heavy: [26, 28, 44],
  success: [16, 36, 22, 46],
  warning: [22, 46, 26],
  error: [32, 42, 36, 48],
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

function playHapticProxy(ctx: AudioContext, kind: SensoryKind): void {
  const sampleRate = ctx.sampleRate;
  // Nav (selection/soft) ~ half of previous strong peaks; buttons mid; board uses rigid/medium via moves.
  const profile: Record<SensoryKind, { hz: number; dur: number; peak: number }> = {
    selection: { hz: 120, dur: 0.014, peak: 0.034 },
    soft: { hz: 100, dur: 0.018, peak: 0.04 },
    light: { hz: 98, dur: 0.026, peak: 0.075 },
    medium: { hz: 82, dur: 0.034, peak: 0.1 },
    rigid: { hz: 92, dur: 0.032, peak: 0.12 },
    heavy: { hz: 70, dur: 0.044, peak: 0.135 },
    success: { hz: 100, dur: 0.036, peak: 0.095 },
    warning: { hz: 78, dur: 0.038, peak: 0.1 },
    error: { hz: 64, dur: 0.048, peak: 0.125 },
  };
  const p = profile[kind];
  const length = Math.max(1, Math.floor(sampleRate * p.dur));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = (1 - Math.exp(-t * 1400)) * Math.exp(-t * 75);
    const body =
      Math.sin(2 * Math.PI * p.hz * t) * 0.8 +
      Math.sin(2 * Math.PI * p.hz * 0.5 * t) * 0.2 +
      (Math.random() * 2 - 1) * 0.06;
    data[i] = body * env * p.peak;
  }
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = kind === "selection" || kind === "soft" ? 320 : 380;
  filter.Q.value = 0.55;
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(gain);
  gain.gain.value = 1;
  gain.connect(ctx.destination);
  src.start();
}

function sensoryGap(kind: SensoryKind): number {
  switch (kind) {
    case "selection":
      return 12;
    case "light":
    case "soft":
      return 20;
    case "medium":
    case "rigid":
      return 28;
    case "heavy":
      return 60;
    case "success":
    case "warning":
    case "error":
      return 280;
    default:
      return 24;
  }
}

/** Chrome haptic (navigation / buttons). */
export function sensate(kind: SensoryKind): void {
  if (!hapticsEnabled()) return;
  if (!canFire(`s:${kind}`, sensoryGap(kind))) return;

  vibrate(VIBRATE[kind]);
  if (!shouldPlayHapticProxy()) return;
  unlockChessAudio();
  void ensureAudioReady().then((ctx) => {
    if (!ctx) return;
    playHapticProxy(ctx, kind);
  });
}

/** Tabs, profile, filters — light enough to register, half of board intensity. */
export function hapticSelection(): void {
  sensate("selection");
}

/** Default chrome / secondary button tap. */
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

/** Review finished (or similar). */
export function notifySuccess(): void {
  sensate("success");
  announce("done");
}

/** Soft caution (cancel, missing profile, etc.). */
export function notifyWarning(): void {
  sensate("warning");
  announce("warn");
}

/** Hard failure. */
export function notifyError(): void {
  sensate("error");
  announce("error");
}

/** Analysis / review just began. */
export function notifyReviewStart(): void {
  sensate("medium");
  announce("start");
}

const MOVE_VIBRATE: Record<MoveSoundKind, number | number[]> = {
  move: [18, 20, 28],
  capture: [26, 32, 34, 44],
  castle: [20, 24, 22, 28],
  check: [30, 36, 34],
  promote: [22, 28, 24, 36, 26],
};

/**
 * Board step: Chess.com-like sound for every ply + strong event-matched haptics.
 */
export function playMoveFeedback(san: string): void {
  if (!san) return;
  const kind = soundKindFromSan(san);
  unlockChessAudio();
  void playMoveSound(kind);

  if (!hapticsEnabled()) return;
  if (!canFire(`move:${kind}`, 16)) return;
  vibrate(MOVE_VIBRATE[kind]);

  if (!shouldPlayHapticProxy()) return;
  void ensureAudioReady().then((ctx) => {
    if (!ctx) return;
    const proxy: SensoryKind =
      kind === "capture" || kind === "check" || kind === "promote"
        ? "rigid"
        : kind === "castle"
          ? "medium"
          : "medium";
    // Board plies stay on the strong tier (medium/rigid), above nav selection.
    playHapticProxy(ctx, proxy);
  });
}
