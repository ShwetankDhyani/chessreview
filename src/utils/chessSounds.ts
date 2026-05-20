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
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  start: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine"
) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

export function playMoveSound(kind: MoveSoundKind): void {
  if (!soundsEnabled()) return;
  switch (kind) {
    case "capture":
      tone(180, 0, 0.07, 0.14, "triangle");
      tone(120, 0.02, 0.09, 0.1, "sine");
      break;
    case "castle":
      tone(220, 0, 0.05, 0.1);
      tone(280, 0.04, 0.06, 0.08);
      break;
    case "check":
      tone(440, 0, 0.04, 0.09);
      tone(330, 0.03, 0.05, 0.07);
      break;
    case "promote":
      tone(260, 0, 0.05, 0.1);
      tone(390, 0.04, 0.08, 0.09);
      break;
    default:
      tone(240, 0, 0.04, 0.08);
      tone(190, 0.015, 0.05, 0.06);
  }
}

export function playMoveFeedback(san: string): void {
  const kind = soundKindFromSan(san);
  playMoveSound(kind);
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
