import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createPieceMesh,
  frameMaterials,
  squareMaterials,
  squareToWorld,
  type PieceRole,
  type PieceColor,
} from "./otbPieceMeshes";

describe("otbPieceMeshes", () => {
  const roles: PieceRole[] = ["p", "r", "n", "b", "q", "k"];
  const colors: PieceColor[] = ["w", "b"];

  it("creates valid meshes for all piece roles and colors", () => {
    for (const color of colors) {
      for (const role of roles) {
        const mesh = createPieceMesh(role, color, null);
        expect(mesh).toBeInstanceOf(THREE.Group);
        expect(mesh.userData.pieceRole).toBe(role);
        expect(mesh.userData.pieceColor).toBe(color);
        expect(mesh.children.length).toBeGreaterThan(0);

        // Verify shadows are enabled on child meshes
        let hasShadowMesh = false;
        mesh.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            hasShadowMesh = true;
            expect(obj.castShadow || obj.receiveShadow).toBe(true);
          }
        });
        expect(hasShadowMesh).toBe(true);
      }
    }
  });

  it("preserves authentic Staunton height hierarchy: P < R < N < B < Q < K", () => {
    const heights: Record<PieceRole, number> = {} as any;

    for (const role of roles) {
      const mesh = createPieceMesh(role, "w", null);
      const box = new THREE.Box3().setFromObject(mesh);
      heights[role] = box.max.y - box.min.y;
    }

    // Pawn is the most compact piece (~0.85)
    expect(heights.p).toBeGreaterThan(0.7);
    expect(heights.p).toBeLessThan(0.95);

    // Strict Staunton height hierarchy
    expect(heights.p).toBeLessThan(heights.r);
    expect(heights.r).toBeLessThan(heights.n);
    expect(heights.n).toBeLessThan(heights.b);
    expect(heights.b).toBeLessThan(heights.q);
    expect(heights.q).toBeLessThan(heights.k);

    // King is the tallest piece (~1.54)
    expect(heights.k).toBeGreaterThan(1.45);
    expect(heights.k).toBeLessThan(1.65);
  });

  it("includes a felt base pad under each piece for board grounding", () => {
    for (const role of roles) {
      const mesh = createPieceMesh(role, "w", null);
      let foundFelt = false;
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.color && mat.color.getHex() === 0x18381d) {
            foundFelt = true;
          }
        }
      });
      expect(foundFelt, `Piece ${role} must include a tournament green felt base`).toBe(true);
    }
  });

  it("provides frame and square materials with tournament contrast", () => {
    const frame = frameMaterials(null);
    expect(frame.apron).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(frame.lip).toBeInstanceOf(THREE.MeshPhysicalMaterial);

    const squares = squareMaterials();
    expect(squares.light).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(squares.dark).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(squares.light.color.getHex()).toBe(0xd4d8c6);
    expect(squares.dark.color.getHex()).toBe(0x6a8a4e);
  });

  it("maps board squares to 3D world coordinates correctly", () => {
    expect(squareToWorld("e4")).toEqual({ x: 0.5, z: 0.5 });
    expect(squareToWorld("d5")).toEqual({ x: -0.5, z: -0.5 });
    expect(squareToWorld("a1")).toEqual({ x: -3.5, z: 3.5 });
    expect(squareToWorld("h8")).toEqual({ x: 3.5, z: -3.5 });
    expect(squareToWorld("invalid")).toBeNull();
  });
});
