import { describe, expect, it } from "vitest";
import {
  soundKindFromSan,
  soundsEnabled,
  setSoundsEnabled,
  hapticsEnabled,
  setHapticsEnabled,
  playMoveSound,
  playMoveFeedback,
  announce,
} from "./chessSounds";
import { CHESS_AUDIO_BASE64 } from "./chessAudioData";

describe("soundKindFromSan", () => {
  it("classifies move kinds matching Chess.com behavior", () => {
    expect(soundKindFromSan("e4")).toBe("move");
    expect(soundKindFromSan("Nxe5")).toBe("capture");
    expect(soundKindFromSan("O-O")).toBe("castle");
    expect(soundKindFromSan("O-O-O")).toBe("castle");
    expect(soundKindFromSan("e8=Q")).toBe("promote");
    expect(soundKindFromSan("Qh5+")).toBe("check");
    expect(soundKindFromSan("Qh5#")).toBe("check");
    // Captures that deliver check play the check audio cue
    expect(soundKindFromSan("Nxe5+")).toBe("check");
    expect(soundKindFromSan("Qxf7#")).toBe("check");
  });
});

describe("CHESS_AUDIO_BASE64 assets", () => {
  it("contains all essential Chess.com sound effects", () => {
    const required = [
      "move",
      "capture",
      "castle",
      "check",
      "promote",
      "start",
      "done",
      "warn",
      "error",
    ];
    for (const key of required) {
      expect(CHESS_AUDIO_BASE64[key]).toBeDefined();
      expect(CHESS_AUDIO_BASE64[key].length).toBeGreaterThan(1000);
    }
  });
});

describe("sound & haptic controls", () => {
  it("toggles and persists sound and haptic preferences", () => {
    const origSound = soundsEnabled();
    const origHaptic = hapticsEnabled();

    setSoundsEnabled(false);
    expect(soundsEnabled()).toBe(false);
    setSoundsEnabled(true);
    expect(soundsEnabled()).toBe(true);

    setHapticsEnabled(false);
    expect(hapticsEnabled()).toBe(false);
    setHapticsEnabled(true);
    expect(hapticsEnabled()).toBe(true);

    // Restore
    setSoundsEnabled(origSound);
    setHapticsEnabled(origHaptic);
  });

  it("handles sound playback calls safely in test environment", () => {
    expect(() => {
      playMoveSound("move");
      playMoveSound("capture");
      playMoveSound("castle");
      playMoveSound("check");
      playMoveSound("promote");
      playMoveFeedback("e4");
      playMoveFeedback("Nxe5");
      playMoveFeedback("O-O");
      playMoveFeedback("Qh5+");
      announce("start");
      announce("done");
      announce("warn");
      announce("error");
    }).not.toThrow();
  });
});
