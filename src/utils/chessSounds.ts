export type MoveSoundKind = "move" | "capture" | "castle" | "check" | "promote";

const SOUND_KEY = "cr_sound";
const HAPTIC_KEY = "cr_haptics";

export function soundsEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(HAPTIC_KEY) !== "off";
  } catch {
    return true;
  }
}

export function soundKindFromSan(san: string): MoveSoundKind {
  if (/^O-O(-O)?[+#]?$/.test(san)) return "castle";
  if (san.includes("=")) return "promote";
  if (san.includes("x")) return "capture";
  if (san.includes("+")) return "check";
  return "move";
}

let audioCtx: AudioContext | null = null;

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

/** Soft wooden knock — short, low, no arcade noise. */
function fillWoodKnock(
  data: Float32Array,
  sampleRate: number,
  opts: { baseHz: number; duration: number; peak: number; thump?: number }
): void {
  const { baseHz, duration, peak, thump = 0 } = opts;
  const len = data.length;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const attack = 1 - Math.exp(-t * 1200);
    const decay = Math.exp(-t * (42 + thump * 12));
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
    move: { duration: 0.045, baseHz: 168, peak: 0.14, thump: 0 },
    capture: { duration: 0.065, baseHz: 118, peak: 0.17, thump: 1 },
    castle: { duration: 0.055, baseHz: 145, peak: 0.15, thump: 0.4 },
    check: { duration: 0.05, baseHz: 195, peak: 0.13, thump: 0 },
    promote: { duration: 0.06, baseHz: 155, peak: 0.16, thump: 0.5 },
  };
  const p = profile[kind];
  const length = Math.floor(sampleRate * p.duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  fillWoodKnock(data, sampleRate, {
    baseHz: p.baseHz,
    duration: p.duration,
    peak: p.peak,
    thump: p.thump,
  });

  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = kind === "capture" ? 520 : 680;
  filter.Q.value = 0.6;
  gain.gain.value = 0.92;
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

export function hapticTap(): void {
  vibrate(22);
}

export function hapticTapStrong(): void {
  vibrate([28, 18, 36]);
}

export function playMoveFeedback(san: string): void {
  const kind = soundKindFromSan(san);
  unlockChessAudio();
  void playMoveSound(kind);

  switch (kind) {
    case "capture":
      vibrate([24, 40, 32, 48]);
      break;
    case "check":
      vibrate([28, 52, 36]);
      break;
    case "castle":
      vibrate([22, 32, 28]);
      break;
    case "promote":
      vibrate([20, 36, 32]);
      break;
    default:
      vibrate([18, 14, 32]);
  }
}
