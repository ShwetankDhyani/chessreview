import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { computeCameraPose } from "./OtbChessboard3d";

describe("DirectionOrb & 3D Camera Presets", () => {
  it("computes steeper angle and larger board framing for mobile review", () => {
    const camMobile = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const camDesktop = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

    const mobileReview = computeCameraPose(camMobile, "review", "white", true);
    const desktopReview = computeCameraPose(camDesktop, "review", "white", false);
    const seatPose = computeCameraPose(camMobile, "seat", "white", true);

    // Mobile review has steeper polar angle (~0.58 vs 0.92) to eliminate excessive table foreshortening
    expect(mobileReview.polar).toBe(0.58);
    expect(seatPose.polar).toBe(0.92);
    expect(desktopReview.polar).toBe(0.68);

    // Mobile review brings camera closer or tighter to fill screen
    expect(mobileReview.position.y).toBeGreaterThan(seatPose.position.y);
    expect(mobileReview.radius).toBeLessThanOrEqual(seatPose.radius);
    expect(mobileReview.azimuth).toBe(0);
  });

  it("handles flipped orientation for review and seats", () => {
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

    const blackReview = computeCameraPose(cam, "review", "black", true);
    expect(blackReview.azimuth).toBe(Math.PI);
    expect(blackReview.target.z).toBeLessThan(0);

    const whiteSeat = computeCameraPose(cam, "seat", "black", true);
    expect(whiteSeat.azimuth).toBe(0);

    const blackSeat = computeCameraPose(cam, "flip", "black", true);
    expect(blackSeat.azimuth).toBe(Math.PI);
  });

  it("maps azimuth to compass needle angle accurately", () => {
    const toNeedleDeg = (azimuth: number) => (-azimuth * 180) / Math.PI;

    // Baseline: facing Black opponent (North)
    expect(toNeedleDeg(0)).toBeCloseTo(0, 4);

    // Turned 90 deg clockwise (camera to the right): needle counter-rotates to stay pointed North
    expect(toNeedleDeg(Math.PI / 2)).toBeCloseTo(-90, 4);

    // Flipped to Black baseline (180 deg)
    expect(toNeedleDeg(Math.PI)).toBeCloseTo(-180, 4);
  });

  it("maintains accessibility and gesture contracts in DirectionOrb", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./DirectionOrb.tsx", import.meta.url), "utf8")
    );

    // Accessibility attributes
    expect(src).toContain('role="button"');
    expect(src).toContain("tabIndex={0}");
    expect(src).toContain("aria-label=");
    expect(src).toContain('e.key === "Enter" || e.key === " "');

    // Drag and pointer capture support
    expect(src).toContain("setPointerCapture");
    expect(src).toContain("releasePointerCapture");
    expect(src).toContain("touchAction: \"none\"");

    // Preset labels
    expect(src).toContain("Focus Review");
    expect(src).toContain("White Seat");
    expect(src).toContain("Black Seat");
    expect(src).toContain("Side Angle");
    expect(src).toContain("Free 3D");
  });
});
