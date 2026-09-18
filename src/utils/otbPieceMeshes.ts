import * as THREE from "three";
import type { OtbPbrMaps } from "./otbTextures";

type PieceColor = "w" | "b";
type PieceRole = "p" | "n" | "b" | "r" | "q" | "k";

const SEG = 72;

/**
 * Photo-real lacquered wood — light oak/boxwood vs rosewood.
 * Uses Poly Haven PBR maps when provided.
 */
function mat(
  color: PieceColor,
  accent = false,
  maps?: OtbPbrMaps | null
): THREE.MeshPhysicalMaterial {
  const light = color === "w";
  const diff = light ? maps?.lightDiff : maps?.darkDiff;
  const nor = light ? maps?.lightNor : maps?.darkNor;
  const rough = light ? maps?.lightRough : maps?.darkRough;

  return new THREE.MeshPhysicalMaterial({
    color: accent
      ? light
        ? 0x8a6640
        : 0xb0a098
      : light
        ? 0xf5e4c4 // pale boxwood tint over oak albedo
        : 0x5c3c30, // warm rosewood — lighter so grain reads, not ebony
    map: diff ?? null,
    normalMap: nor ?? null,
    normalScale: new THREE.Vector2(accent ? 0.4 : 0.65, accent ? 0.4 : 0.65),
    roughnessMap: rough ?? null,
    roughness: accent ? 0.4 : 0.3,
    metalness: 0.02,
    clearcoat: accent ? 0.28 : 0.58,
    clearcoatRoughness: 0.2,
    reflectivity: 0.42,
    envMapIntensity: 0.7,
  });
}

/** Light honey-oak frame maps (same light wood set, lower repeat). */
export function frameMaterials(maps?: OtbPbrMaps | null): {
  apron: THREE.MeshPhysicalMaterial;
  lip: THREE.MeshPhysicalMaterial;
} {
  const shared = {
    map: maps?.lightDiff ?? null,
    normalMap: maps?.lightNor ?? null,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: maps?.lightRough ?? null,
    metalness: 0.02,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.4,
  } as const;
  return {
    apron: new THREE.MeshPhysicalMaterial({
      ...shared,
      color: 0xf0d4a8, // pale honey oak — not dark walnut
      roughness: 0.46,
    }),
    lip: new THREE.MeshPhysicalMaterial({
      ...shared,
      color: 0xe2c090,
      roughness: 0.5,
    }),
  };
}

/** Soft tournament square materials. */
export function squareMaterials(): {
  light: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshPhysicalMaterial;
} {
  return {
    light: new THREE.MeshPhysicalMaterial({
      color: 0xf3ecd4,
      roughness: 0.78,
      metalness: 0.0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.6,
    }),
    dark: new THREE.MeshPhysicalMaterial({
      color: 0x769656,
      roughness: 0.82,
      metalness: 0.0,
      clearcoat: 0.05,
      clearcoatRoughness: 0.7,
    }),
  };
}

function add(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  y: number,
  scale: [number, number, number] = [1, 1, 1]
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = y;
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function lathe(
  points: Array<[number, number]>,
  segments = SEG
): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments
  );
}

function pedestal(
  group: THREE.Group,
  m: THREE.Material,
  accent: THREE.Material
) {
  add(
    group,
    lathe([
      [0.0, 0],
      [0.34, 0],
      [0.35, 0.02],
      [0.32, 0.06],
      [0.28, 0.09],
    ]),
    m,
    0
  );
  add(group, new THREE.CylinderGeometry(0.26, 0.29, 0.045, SEG), m, 0.11);
  add(group, new THREE.TorusGeometry(0.235, 0.022, 12, SEG), accent, 0.145);
  add(group, new THREE.CylinderGeometry(0.2, 0.24, 0.035, SEG), m, 0.175);
}

/**
 * Championship Staunton meshes with photo-real wood PBR when maps are ready.
 */
export function createPieceMesh(
  role: PieceRole,
  color: PieceColor,
  maps?: OtbPbrMaps | null
): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color, false, maps);
  const accent = mat(color, true, maps);

  pedestal(g, m, accent);

  switch (role) {
    case "p": {
      add(
        g,
        lathe([
          [0.155, 0],
          [0.14, 0.06],
          [0.095, 0.2],
          [0.11, 0.32],
          [0.085, 0.4],
          [0.07, 0.44],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.085, 0.018, 12, 40), accent, 0.64);
      add(g, new THREE.SphereGeometry(0.115, 40, 32), m, 0.78);
      break;
    }
    case "r": {
      add(
        g,
        lathe([
          [0.155, 0],
          [0.14, 0.08],
          [0.125, 0.28],
          [0.13, 0.42],
          [0.15, 0.52],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.155, 0.016, 10, 40), accent, 0.72);
      add(g, new THREE.CylinderGeometry(0.185, 0.185, 0.11, 40), m, 0.82);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), m);
        tooth.position.set(Math.cos(a) * 0.135, 0.98, Math.sin(a) * 0.135);
        tooth.castShadow = true;
        tooth.receiveShadow = true;
        g.add(tooth);
      }
      add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24), accent, 0.9);
      break;
    }
    case "n": {
      add(g, new THREE.CylinderGeometry(0.125, 0.195, 0.14, 40), m, 0.27);
      add(g, new THREE.TorusGeometry(0.14, 0.016, 10, 36), accent, 0.36);

      const profile = new THREE.Shape();
      profile.moveTo(-0.08, 0.0);
      profile.lineTo(0.1, 0.0);
      profile.lineTo(0.12, 0.1);
      profile.bezierCurveTo(0.15, 0.26, 0.02, 0.4, -0.02, 0.52);
      profile.bezierCurveTo(-0.02, 0.62, 0.1, 0.72, 0.2, 0.7);
      profile.lineTo(0.42, 0.6);
      profile.quadraticCurveTo(0.48, 0.54, 0.44, 0.48);
      profile.lineTo(0.28, 0.48);
      profile.lineTo(0.24, 0.42);
      profile.bezierCurveTo(0.12, 0.4, 0.02, 0.3, 0.0, 0.2);
      profile.bezierCurveTo(-0.04, 0.12, -0.1, 0.06, -0.08, 0.0);
      profile.closePath();

      const extrude = new THREE.ExtrudeGeometry(profile, {
        depth: 0.22,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.025,
        bevelSegments: 5,
        curveSegments: 32,
      });
      extrude.translate(0, 0, -0.11);
      const body = new THREE.Mesh(extrude, m);
      body.position.set(0.02, 0.34, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.17, 16), m);
      ear.position.set(0.04, 1.08, 0.02);
      ear.rotation.z = -0.45;
      ear.castShadow = true;
      g.add(ear);

      const mane = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.32, 0.07),
        accent
      );
      mane.position.set(-0.05, 0.8, 0);
      mane.rotation.z = -0.5;
      mane.castShadow = true;
      g.add(mane);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 12, 10),
        accent
      );
      eye.position.set(0.22, 0.94, 0.1);
      g.add(eye);
      break;
    }
    case "b": {
      add(
        g,
        lathe([
          [0.145, 0],
          [0.13, 0.08],
          [0.09, 0.28],
          [0.115, 0.48],
          [0.08, 0.62],
          [0.095, 0.74],
          [0.06, 0.8],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.095, 0.016, 10, 36), accent, 0.9);
      add(g, new THREE.SphereGeometry(0.13, 40, 32), m, 1.02);
      const cleft = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.26, 0.22),
        accent
      );
      cleft.position.set(0, 1.08, 0.05);
      cleft.rotation.x = -0.18;
      cleft.castShadow = true;
      g.add(cleft);
      add(g, new THREE.SphereGeometry(0.048, 18, 14), m, 1.24);
      break;
    }
    case "q": {
      add(
        g,
        lathe([
          [0.165, 0],
          [0.15, 0.08],
          [0.11, 0.3],
          [0.145, 0.5],
          [0.1, 0.7],
          [0.13, 0.86],
          [0.1, 0.92],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.14, 0.018, 10, 40), accent, 1.08);
      add(g, new THREE.CylinderGeometry(0.155, 0.155, 0.07, 40), m, 1.14);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.034, 0.2, 12),
          i % 2 === 0 ? accent : m
        );
        spike.position.set(Math.cos(a) * 0.13, 1.3, Math.sin(a) * 0.13);
        spike.castShadow = true;
        g.add(spike);
      }
      add(g, new THREE.SphereGeometry(0.055, 18, 14), accent, 1.42);
      break;
    }
    case "k": {
      add(
        g,
        lathe([
          [0.165, 0],
          [0.15, 0.08],
          [0.11, 0.3],
          [0.145, 0.5],
          [0.105, 0.72],
          [0.135, 0.9],
          [0.11, 0.96],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.135, 0.018, 10, 40), accent, 1.12);
      add(g, new THREE.CylinderGeometry(0.145, 0.145, 0.07, 40), m, 1.18);
      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.4, 0.075),
        accent
      );
      crossV.position.y = 1.46;
      crossV.castShadow = true;
      g.add(crossV);
      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.075, 0.075),
        accent
      );
      crossH.position.y = 1.52;
      crossH.castShadow = true;
      g.add(crossH);
      break;
    }
  }

  g.userData.pieceRole = role;
  g.userData.pieceColor = color;
  return g;
}

export function squareToWorld(square: string): { x: number; z: number } | null {
  const file = square[0];
  const rank = Number(square[1]);
  if (!file || rank < 1 || rank > 8) return null;
  const fileIdx = file.charCodeAt(0) - 97;
  if (fileIdx < 0 || fileIdx > 7) return null;
  return { x: fileIdx - 3.5, z: 3.5 - (rank - 1) };
}

export type { PieceColor, PieceRole };
