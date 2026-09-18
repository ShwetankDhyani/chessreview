import * as THREE from "three";
import type { OtbPbrMaps } from "./otbTextures";

type PieceColor = "w" | "b";
type PieceRole = "p" | "n" | "b" | "r" | "q" | "k";

const SEG = 64;

/**
 * Materials tuned for review contrast on cream/green squares:
 * cool bone whites (no warm maple wash) vs deep rosewood blacks.
 */
function mat(
  color: PieceColor,
  accent = false,
  maps?: OtbPbrMaps | null
): THREE.MeshPhysicalMaterial {
  const light = color === "w";
  // Whites skip warm maple albedo — it made pieces match light squares.
  // Keep normal/roughness for wood feel; darks keep rosewood maps.
  const diff = light ? null : maps?.darkDiff ?? null;
  const nor = light ? maps?.lightNor ?? null : maps?.darkNor ?? null;
  const rough = light ? maps?.lightRough ?? null : maps?.darkRough ?? null;

  return new THREE.MeshPhysicalMaterial({
    color: accent
      ? light
        ? 0xb0a090
        : 0x8a7870
      : light
        ? 0xf2eee6 // cool bone — pops on cream + green squares
        : 0x4a3228, // deep rosewood
    map: diff,
    normalMap: nor,
    normalScale: new THREE.Vector2(accent ? 0.2 : 0.35, accent ? 0.2 : 0.35),
    roughnessMap: rough,
    roughness: light ? (accent ? 0.55 : 0.45) : accent ? 0.5 : 0.42,
    metalness: 0.0,
    clearcoat: light ? 0.06 : 0.12,
    clearcoatRoughness: 0.55,
    reflectivity: 0.14,
    envMapIntensity: 0.18,
  });
}

/** Medium oak frame. */
export function frameMaterials(maps?: OtbPbrMaps | null): {
  apron: THREE.MeshPhysicalMaterial;
  lip: THREE.MeshPhysicalMaterial;
} {
  const shared = {
    map: maps?.lightDiff ?? null,
    normalMap: maps?.lightNor ?? null,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughnessMap: maps?.lightRough ?? null,
    metalness: 0.0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.28,
  } as const;
  return {
    apron: new THREE.MeshPhysicalMaterial({
      ...shared,
      color: 0x8f7355,
      roughness: 0.55,
    }),
    lip: new THREE.MeshPhysicalMaterial({
      ...shared,
      color: 0x7a6248,
      roughness: 0.58,
    }),
  };
}

/**
 * Squares: cooler sage-cream light so bone whites separate;
 * green darks stay near board tokens.
 */
export function squareMaterials(): {
  light: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshPhysicalMaterial;
} {
  return {
    light: new THREE.MeshPhysicalMaterial({
      color: 0xd4d8c6, // cooler sage-cream — contrast vs bone pieces
      roughness: 0.9,
      metalness: 0.0,
      clearcoat: 0.02,
      clearcoatRoughness: 0.85,
    }),
    dark: new THREE.MeshPhysicalMaterial({
      color: 0x6a8a4e,
      roughness: 0.92,
      metalness: 0.0,
      clearcoat: 0.02,
      clearcoatRoughness: 0.85,
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

/** Dark glyph material — high-contrast top marks for overhead ID. */
function glyphMat(color: PieceColor): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: color === "w" ? 0x5a5048 : 0x1a1410,
    roughness: 0.7,
    metalness: 0.0,
  });
}

/**
 * Staunton meshes with exaggerated horizontal crowns so each role
 * has a unique XZ silhouette from the review camera.
 */
export function createPieceMesh(
  role: PieceRole,
  color: PieceColor,
  maps?: OtbPbrMaps | null
): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color, false, maps);
  const accent = mat(color, true, maps);
  const glyph = glyphMat(color);

  pedestal(g, m, accent);

  switch (role) {
    case "p": {
      // Dot only — smallest round top.
      add(
        g,
        lathe([
          [0.13, 0],
          [0.11, 0.06],
          [0.075, 0.22],
          [0.09, 0.34],
          [0.06, 0.42],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.07, 0.016, 10, 32), accent, 0.64);
      add(g, new THREE.SphereGeometry(0.095, 32, 24), m, 0.78);
      break;
    }
    case "r": {
      // Square platform + 4 corner blocks — square from above.
      add(
        g,
        lathe([
          [0.15, 0],
          [0.135, 0.08],
          [0.12, 0.3],
          [0.15, 0.48],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.16, 0.016, 10, 36), accent, 0.7);
      add(g, new THREE.BoxGeometry(0.46, 0.1, 0.46), m, 0.82);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.24, 0.15), m);
        tooth.position.set(Math.cos(a) * 0.185, 1.02, Math.sin(a) * 0.185);
        tooth.castShadow = true;
        tooth.receiveShadow = true;
        g.add(tooth);
      }
      // Dark well — reads as hollow square center from above
      add(g, new THREE.BoxGeometry(0.2, 0.08, 0.2), glyph, 0.9);
      break;
    }
    case "n": {
      // Long snout in XZ — only non-radial silhouette.
      add(g, new THREE.CylinderGeometry(0.12, 0.19, 0.13, 36), m, 0.26);
      add(g, new THREE.TorusGeometry(0.135, 0.015, 10, 32), accent, 0.34);

      const profile = new THREE.Shape();
      profile.moveTo(-0.12, 0.0);
      profile.lineTo(0.14, 0.0);
      profile.lineTo(0.16, 0.12);
      profile.bezierCurveTo(0.18, 0.3, 0.04, 0.44, -0.02, 0.56);
      profile.bezierCurveTo(-0.02, 0.68, 0.14, 0.78, 0.28, 0.76);
      profile.lineTo(0.58, 0.6);
      profile.quadraticCurveTo(0.66, 0.5, 0.58, 0.42);
      profile.lineTo(0.34, 0.44);
      profile.lineTo(0.28, 0.36);
      profile.bezierCurveTo(0.12, 0.34, -0.02, 0.24, -0.04, 0.14);
      profile.bezierCurveTo(-0.08, 0.08, -0.14, 0.04, -0.12, 0.0);
      profile.closePath();

      const extrude = new THREE.ExtrudeGeometry(profile, {
        depth: 0.28,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.028,
        bevelSegments: 4,
        curveSegments: 28,
      });
      extrude.translate(0, 0, -0.14);
      const body = new THREE.Mesh(extrude, m);
      body.position.set(0.04, 0.32, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 14), m);
      ear.position.set(0.06, 1.12, 0.02);
      ear.rotation.z = -0.4;
      ear.castShadow = true;
      g.add(ear);

      // Flat top “mane bar” so overhead reads as a directed bar, not a blob
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.1), glyph);
      mane.position.set(0.12, 1.05, 0);
      mane.castShadow = true;
      g.add(mane);
      break;
    }
    case "b": {
      // Flattened oval + bold diagonal glyph slit.
      add(
        g,
        lathe([
          [0.135, 0],
          [0.12, 0.08],
          [0.08, 0.3],
          [0.1, 0.52],
          [0.07, 0.7],
          [0.09, 0.84],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.095, 0.015, 10, 32), accent, 0.96);
      const mitre = new THREE.Mesh(new THREE.SphereGeometry(0.145, 32, 24), m);
      mitre.scale.set(1.35, 0.75, 0.9); // oval from above
      mitre.position.y = 1.08;
      mitre.castShadow = true;
      mitre.receiveShadow = true;
      g.add(mitre);
      // Slit glyph — dark bar across the oval (unique vs pawn)
      const cleft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.36), glyph);
      cleft.position.set(0, 1.16, 0);
      cleft.rotation.y = Math.PI / 4;
      cleft.castShadow = true;
      g.add(cleft);
      add(g, new THREE.SphereGeometry(0.042, 14, 12), m, 1.28);
      break;
    }
    case "q": {
      // Gear/star — 8 radial fins in the XZ plane.
      add(
        g,
        lathe([
          [0.155, 0],
          [0.14, 0.08],
          [0.1, 0.32],
          [0.13, 0.52],
          [0.09, 0.74],
          [0.12, 0.9],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.14, 0.018, 10, 36), accent, 1.06);
      add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 36), m, 1.12);
      // Hub disc
      add(g, new THREE.CylinderGeometry(0.18, 0.18, 0.05, 36), m, 1.2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        // Flat fins lying outward in XZ — star from above
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.07, 0.08),
          i % 2 === 0 ? glyph : m
        );
        fin.position.set(Math.cos(a) * 0.22, 1.24, Math.sin(a) * 0.22);
        fin.rotation.y = -a;
        fin.castShadow = true;
        g.add(fin);
      }
      add(g, new THREE.SphereGeometry(0.07, 16, 12), accent, 1.36);
      break;
    }
    case "k": {
      // Bold + lying flat on a disc — cross from every overhead angle.
      add(
        g,
        lathe([
          [0.155, 0],
          [0.14, 0.08],
          [0.1, 0.32],
          [0.13, 0.52],
          [0.095, 0.76],
          [0.125, 0.92],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.135, 0.018, 10, 36), accent, 1.08);
      add(g, new THREE.CylinderGeometry(0.145, 0.145, 0.06, 36), m, 1.14);
      add(g, new THREE.CylinderGeometry(0.16, 0.16, 0.05, 32), m, 1.22);
      // Horizontal cross in XZ (not just a tall stick)
      const armV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.46), glyph);
      armV.position.y = 1.32;
      armV.castShadow = true;
      g.add(armV);
      const armH = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.12), glyph);
      armH.position.y = 1.32;
      armH.castShadow = true;
      g.add(armH);
      // Short upright nub so it still reads as a king in seat view
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.1), glyph);
      upright.position.y = 1.48;
      upright.castShadow = true;
      g.add(upright);
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
