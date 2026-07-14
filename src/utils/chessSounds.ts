/**
 * Sensory hierarchy:
 * - Navigation: lighter haptic
 * - Buttons / toggles / board plies: stronger haptic
 * - Chess board: quiet Lichess-like wood sounds + matching haptics
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

/* ── Lichess-inspired board sounds — quiet, dry, classy ───────────────── */

function fillSoftWood(
  data: Float32Array,
  sampleRate: number,
  opts: {
    baseHz: number;
    peak: number;
    decay: number;
    noise?: number;
    bend?: number;
  }
): void {
  const { baseHz, peak, decay, noise = 0.06, bend = 2.2 } = opts;
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const env = (1 - Math.exp(-t * 1400)) * Math.exp(-t * decay);
    const f = baseHz * Math.max(0.6, 1 - t * bend);
    const tone =
      Math.sin(2 * Math.PI * f * t) * 0.82 +
      Math.sin(2 * Math.PI * f * 0.5 * t) * 0.18;
    const grit = (Math.random() * 2 - 1) * noise * Math.exp(-t * 80);
    data[i] = (tone + grit) * env * peak;
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
  filter.Q.value = 0.45;
  gain.gain.value = opts.gain ?? 0.75;
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(opts.when ?? ctx.currentTime);
}

/** Soft piece sounds — muted wood, Lichess-like restraint. */
function playWoodSound(ctx: AudioContext, kind: MoveSoundKind): void {
  const sampleRate = ctx.sampleRate;
  const t0 = ctx.currentTime + 0.001;

  const make = (
    dur: number,
    fill: (data: Float32Array) => void,
    lp: number,
    when = t0,
    gain = 0.72
  ) => {
    const length = Math.max(1, Math.floor(sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    fill(buffer.getChannelData(0));
    playBuffered(ctx, buffer, { lp, when, gain });
  };

  switch (kind) {
    case "move":
      make(
        0.042,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 155,
            peak: 0.085,
            decay: 58,
            noise: 0.05,
          }),
        620
      );
      break;
    case "capture":
      // Deeper soft thud — present, not harsh.
      make(
        0.055,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 92,
            peak: 0.11,
            decay: 40,
            noise: 0.08,
            bend: 1.7,
          }),
        440,
        t0,
        0.78
      );
      make(
        0.03,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 180,
            peak: 0.045,
            decay: 70,
            noise: 0.04,
          }),
        700,
        t0 + 0.012,
        0.5
      );
      break;
    case "castle":
      make(
        0.036,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 148,
            peak: 0.075,
            decay: 62,
          }),
        600
      );
      make(
        0.04,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 132,
            peak: 0.07,
            decay: 55,
          }),
        560,
        t0 + 0.048,
        0.65
      );
      break;
    case "check":
      // Soft piece + one restrained high tick — alert without alarm.
      make(
        0.038,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 160,
            peak: 0.08,
            decay: 60,
          }),
        640,
        t0,
        0.65
      );
      make(
        0.04,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 420,
            peak: 0.05,
            decay: 55,
            noise: 0.02,
            bend: 1.1,
          }),
        1400,
        t0 + 0.028,
        0.48
      );
      break;
    case "promote":
      make(
        0.04,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 150,
            peak: 0.08,
            decay: 55,
          }),
        600
      );
      make(
        0.05,
        (data) =>
          fillSoftWood(data, sampleRate, {
            baseHz: 230,
            peak: 0.045,
            decay: 48,
            noise: 0.025,
            bend: 1.3,
          }),
        900,
        t0 + 0.035,
        0.5
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
    start: [{ hz: 152, dur: 0.07, peak: 0.035, delay: 0 }],
    done: [
      { hz: 140, dur: 0.055, peak: 0.03, delay: 0 },
      { hz: 178, dur: 0.075, peak: 0.032, delay: 0.07 },
    ],
    warn: [
      { hz: 130, dur: 0.06, peak: 0.032, delay: 0 },
      { hz: 112, dur: 0.07, peak: 0.028, delay: 0.08 },
    ],
    error: [
      { hz: 105, dur: 0.07, peak: 0.036, delay: 0 },
      { hz: 86, dur: 0.09, peak: 0.032, delay: 0.085 },
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
 *   selection / soft  → navigation chrome (noticeable, lighter than board)
 *   light / medium / rigid → buttons, toggles, board plies (toggle = board strength)
 */
const VIBRATE: Record<SensoryKind, number | number[]> = {
  selection: 15,
  soft: 18,
  light: 28,
  medium: [18, 20, 28],
  rigid: [26, 32, 34, 44],
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
  // Nav bumped ~50% from prior; toggles/buttons use medium/rigid matching board plies.
  const profile: Record<SensoryKind, { hz: number; dur: number; peak: number }> = {
    selection: { hz: 118, dur: 0.018, peak: 0.051 },
    soft: { hz: 100, dur: 0.022, peak: 0.06 },
    light: { hz: 90, dur: 0.03, peak: 0.095 },
    medium: { hz: 82, dur: 0.034, peak: 0.11 },
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

/** Tabs, profile, filters — noticeable nav tap (~board × 0.5, +50% from prior). */
export function hapticSelection(): void {
  sensate("selection");
}

/** Default chrome / secondary button tap. */
export function hapticTap(): void {
  sensate("light");
}

/** Primary press / toggles — same weight as a board ply. */
export function hapticTapStrong(): void {
  sensate("medium");
}

/** Toggle switches — match chess piece move strength. */
export function hapticToggle(): void {
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
 * Board step: quiet Lichess-like wood sound for every ply + event-matched haptics.
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
