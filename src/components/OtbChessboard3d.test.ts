import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { computeCameraPose } from "./OtbChessboard3d";

describe("OtbChessboard3d Camera Framing", () => {
  it("computes steeper angle and tight edge-to-edge framing for mobile review", () => {
    const camMobile = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const camDesktop = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

    const mobilePose = computeCameraPose(camMobile, "white", true);
    const desktopPose = computeCameraPose(camDesktop, "white", false);

    // Mobile review has steeper polar angle (0.58 vs 0.68) to expand squares edge-to-edge
    expect(mobilePose.polar).toBe(0.58);
    expect(desktopPose.polar).toBe(0.68);

    // Mobile review elevates camera looking down across the board
    expect(mobilePose.position.y).toBeGreaterThan(10);
    expect(mobilePose.azimuth).toBe(0);
    expect(mobilePose.target.z).toBeGreaterThan(0);
  });

  it("handles flipped orientation for Black", () => {
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

    const blackPose = computeCameraPose(cam, "black", true);
    expect(blackPose.azimuth).toBe(Math.PI);
    expect(blackPose.target.z).toBeLessThan(0);
  });
});
