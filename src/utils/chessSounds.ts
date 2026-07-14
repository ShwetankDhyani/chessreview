/**
 * Sensory layer — strong chrome/move haptics + reserved rare audio.
 *
 * Policy:
 * - Almost every interaction: tangible haptics (tabs, buttons, board plies…).
 * - Chess sound only for takes, checks, and promotions (plus rare review cues).
 * - iOS Safari has no Vibration API — strong low thumps stand in for taptic.
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

/* ── Chess wood knocks — low, dry, subtle ─────────────────────────────── */

function fillWoodKnock(
  data: Float32Array,
  sampleRate: number,
  opts: { baseHz: number; peak: number; thump?: number }
): void {
  const { baseHz, peak, thump = 0 } = opts;
  const len = data.length;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const attack = 1 - Math.exp(-t * 1100);
    const decay = Math.exp(-t * (38 + thump * 10));
    const env = attack * decay;
    const bend = 1 - t * (2.2 + thump * 0.45);
    const f1 = baseHz * Math.max(0.58, bend);
    const f2 = f1 * 0.48;
    const body =
      Math.sin(2 * Math.PI * f1 * t) * 0.78 +
      Math.sin(2 * Math.PI * f2 * t) * 0.22;
    data[i] = body * env * peak;
  }
}

function playWoodSound(ctx: AudioContext, kind: MoveSoundKind): void {
  const sampleRate = ctx.sampleRate;
  // Intentionally low / muted — board presence without arcade flash.
  const profile: Record<
    MoveSoundKind,
    { duration: number; baseHz: number; peak: number; thump: number; lp: number }
  > = {
    move: { duration: 0.048, baseHz: 118, peak: 0.09, thump: 0.1, lp: 420 },
    capture: { duration: 0.072, baseHz: 86, peak: 0.125, thump: 1.25, lp: 340 },
    castle: { duration: 0.065, baseHz: 102, peak: 0.1, thump: 0.5, lp: 380 },
    check: { duration: 0.055, baseHz: 132, peak: 0.1, thump: 0.35, lp: 460 },
    promote: { duration: 0.08, baseHz: 110, peak: 0.115, thump: 0.7, lp: 400 },
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
  filter.frequency.value = p.lp;
  filter.Q.value = 0.45;
  gain.gain.value = 0.85;
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

/* ── Haptics (chrome) ─────────────────────────────────────────────────── */

/** Android Vibration API — strong enough to feel on modern phones. */
const VIBRATE: Record<SensoryKind, number | number[]> = {
  selection: 18,
  light: 24,
  soft: 28,
  medium: 36,
  rigid: [20, 24, 32],
  heavy: [28, 30, 48],
  success: [18, 40, 24, 50],
  warning: [24, 50, 28],
  error: [36, 45, 40, 50],
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
 * Strong low thump used as haptic feel (especially iOS Safari — no Vibration API).
 * Gated by haptics only — never by the Sounds preference.
 */
function playHapticProxy(ctx: AudioContext, kind: SensoryKind): void {
  const sampleRate = ctx.sampleRate;
  const profile: Record<SensoryKind, { hz: number; dur: number; peak: number }> = {
    selection: { hz: 110, dur: 0.022, peak: 0.07 },
    light: { hz: 98, dur: 0.028, peak: 0.085 },
    soft: { hz: 86, dur: 0.034, peak: 0.09 },
    medium: { hz: 80, dur: 0.036, peak: 0.11 },
    rigid: { hz: 92, dur: 0.032, peak: 0.125 },
    heavy: { hz: 70, dur: 0.045, peak: 0.14 },
    success: { hz: 100, dur: 0.038, peak: 0.1 },
    warning: { hz: 78, dur: 0.04, peak: 0.11 },
    error: { hz: 64, dur: 0.05, peak: 0.13 },
  };
  const p = profile[kind];
  const length = Math.max(1, Math.floor(sampleRate * p.dur));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = (1 - Math.exp(-t * 1400)) * Math.exp(-t * 70);
    const body =
      Math.sin(2 * Math.PI * p.hz * t) * 0.8 +
      Math.sin(2 * Math.PI * p.hz * 0.5 * t) * 0.2 +
      (Math.random() * 2 - 1) * 0.08;
    data[i] = body * env * p.peak;
  }
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 360;
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

/**
 * Chrome / navigation feel — haptics only.
 * Always fires a tangible proxy on touch devices (iPhone has no vibrate).
 */
export function sensate(kind: SensoryKind): void {
  if (!hapticsEnabled()) return;
  if (!canFire(`s:${kind}`, sensoryGap(kind))) return;

  vibrate(VIBRATE[kind]);
  unlockChessAudio();
  void ensureAudioReady().then((ctx) => {
    if (!ctx) return;
    // Prefer proxy on any device when vibrate is unavailable; always on touch.
    const vibrateOk =
      typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
    if (isTouchFeelDevice() || !vibrateOk) {
      playHapticProxy(ctx, kind);
    }
  });
}

/** Selection Changed — tabs, filters, profile, switches. */
export function hapticSelection(): void {
  sensate("selection");
}

/** Default chrome tap. */
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
  move: [16, 18, 24],
  capture: [24, 30, 32, 40],
  castle: [18, 22, 20, 26],
  check: [28, 34, 32],
  promote: [20, 26, 22, 34, 24],
};

function moveSoundWorthy(kind: MoveSoundKind): boolean {
  return kind === "capture" || kind === "check" || kind === "promote";
}

/**
 * Board step feedback.
 * - Haptics on every ply (strong, consistent).
 * - Sound only for takes, checks, and promotions.
 */
export function playMoveFeedback(san: string): void {
  if (!san) return;
  const kind = soundKindFromSan(san);
  unlockChessAudio();

  if (moveSoundWorthy(kind) && soundsEnabled()) {
    void playMoveSound(kind);
  }

  if (!hapticsEnabled()) return;
  // Allow rapid scrubbing while still letting most steps feel.
  if (!canFire(`move:${kind}`, 16)) return;
  vibrate(MOVE_VIBRATE[kind]);

  void ensureAudioReady().then((ctx) => {
    if (!ctx) return;
    const vibrateOk =
      typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
    if (!(isTouchFeelDevice() || !vibrateOk)) return;
    const proxy: SensoryKind =
      kind === "capture" || kind === "check" || kind === "promote"
        ? "rigid"
        : kind === "castle"
          ? "medium"
          : "light";
    playHapticProxy(ctx, proxy);
  });
}
