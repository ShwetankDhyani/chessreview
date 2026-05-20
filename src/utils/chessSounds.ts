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

/** Call on first user gesture so mobile browsers allow playback. */
export function unlockChessAudio(): void {
  void prepareChessAudio();
}

/** Await before playing the first sound in the same tap/click. */
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

function playBuffer(ctx: AudioContext, kind: MoveSoundKind): void {
  const sampleRate = ctx.sampleRate;
  const duration =
    kind === "capture" ? 0.1 : kind === "check" ? 0.07 : 0.06;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const baseFreq =
    kind === "capture"
      ? 140
      : kind === "castle"
        ? 260
        : kind === "check"
          ? 520
          : kind === "promote"
            ? 340
            : 220;
  const peak =
    kind === "capture" ? 0.55 : kind === "check" ? 0.45 : 0.38;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * (kind === "capture" ? 28 : 35));
    let sample = Math.sin(2 * Math.PI * baseFreq * t) * env * peak;
    if (kind === "capture") {
      sample += (Math.random() * 2 - 1) * env * 0.12;
    }
    if (kind === "castle") {
      sample += Math.sin(2 * Math.PI * 380 * t) * env * 0.15;
    }
    if (kind === "check") {
      sample += Math.sin(2 * Math.PI * 780 * t) * env * 0.12;
    }
    data[i] = sample;
  }

  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = 1;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export async function playMoveSound(kind: MoveSoundKind): Promise<void> {
  if (!soundsEnabled()) return;
  unlockChessAudio();
  const ctx = await ensureAudioReady();
  if (!ctx) return;
  playBuffer(ctx, kind);
}

export function playMoveFeedback(san: string): void {
  const kind = soundKindFromSan(san);
  unlockChessAudio();
  void playMoveSound(kind);

  if (!hapticsEnabled() || typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }
  try {
    switch (kind) {
      case "capture":
        navigator.vibrate([10, 35, 18]);
        break;
      case "check":
        navigator.vibrate([16, 28, 16]);
        break;
      case "castle":
        navigator.vibrate([8, 20, 10]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch {
    /* ignore */
  }
}
