import * as THREE from "three";
import type { OtbPbrMaps } from "./otbTextures";

type PieceColor = "w" | "b";
type PieceRole = "p" | "n" | "b" | "r" | "q" | "k";

const SEG = 72;

/**
 * Lacquered wood tuned to ChessReview’s warm-dark UI.
 * Kept deliberately mute so ivory doesn’t bloom under the sitting camera.
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
        ? 0x7a6248
        : 0x6a5a52
      : light
        ? 0x8a7a62 // muted boxwood — readable, not chalky
        : 0x6a4a38, // deep rosewood
    map: diff ?? null,
    normalMap: nor ?? null,
    normalScale: new THREE.Vector2(accent ? 0.25 : 0.4, accent ? 0.25 : 0.4),
    roughnessMap: rough ?? null,
    roughness: accent ? 0.55 : 0.48,
    metalness: 0.0,
    clearcoat: accent ? 0.05 : 0.1,
    clearcoatRoughness: 0.58,
    reflectivity: 0.16,
    envMapIntensity: 0.2,
  });
}

/** Medium oak frame — warm brown that sits on chess-panel, not pale maple. */
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

/** Squares slightly softened for dark UI cohesion. */
export function squareMaterials(): {
  light: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshPhysicalMaterial;
} {
  return {
    light: new THREE.MeshPhysicalMaterial({
      color: 0xe4dfc8,
      roughness: 0.88,
      metalness: 0.0,
      clearcoat: 0.02,
      clearcoatRoughness: 0.8,
    }),
    dark: new THREE.MeshPhysicalMaterial({
      color: 0x6f8f52,
      roughness: 0.9,
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

/**
 * Staunton meshes optimized for the sitting/top review camera:
 * each role keeps a distinct overhead silhouette (dot, square, horse,
 * cleft oval, spike ring, cross).
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
      // Smallest — slender stem + single ball; collar ring reads as a thin halo.
      add(
        g,
        lathe([
          [0.14, 0],
          [0.12, 0.06],
          [0.08, 0.22],
          [0.095, 0.34],
          [0.07, 0.42],
          [0.055, 0.46],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.078, 0.02, 12, 40), accent, 0.66);
      add(g, new THREE.SphereGeometry(0.1, 36, 28), m, 0.8);
      break;
    }
    case "r": {
      // Square battlement crown — unmistakable from above.
      add(
        g,
        lathe([
          [0.155, 0],
          [0.14, 0.08],
          [0.125, 0.28],
          [0.14, 0.44],
          [0.17, 0.54],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.17, 0.018, 10, 40), accent, 0.74);
      // Flat square cap
      add(g, new THREE.BoxGeometry(0.38, 0.08, 0.38), m, 0.84);
      // Four corner merlons — square silhouette from top
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), m);
        tooth.position.set(Math.cos(a) * 0.155, 1.0, Math.sin(a) * 0.155);
        tooth.castShadow = true;
        tooth.receiveShadow = true;
        g.add(tooth);
      }
      // Inner well so the crown reads hollow from above
      add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.06, 24), accent, 0.9);
      break;
    }
    case "n": {
      // Asymmetric horse — long snout axis is the top-down tell.
      add(g, new THREE.CylinderGeometry(0.125, 0.195, 0.14, 40), m, 0.27);
      add(g, new THREE.TorusGeometry(0.14, 0.016, 10, 36), accent, 0.36);

      const profile = new THREE.Shape();
      profile.moveTo(-0.1, 0.0);
      profile.lineTo(0.12, 0.0);
      profile.lineTo(0.14, 0.1);
      profile.bezierCurveTo(0.16, 0.28, 0.02, 0.42, -0.04, 0.54);
      profile.bezierCurveTo(-0.04, 0.66, 0.12, 0.76, 0.24, 0.74);
      profile.lineTo(0.5, 0.62);
      profile.quadraticCurveTo(0.58, 0.54, 0.52, 0.46);
      profile.lineTo(0.32, 0.46);
      profile.lineTo(0.26, 0.4);
      profile.bezierCurveTo(0.12, 0.38, 0.0, 0.28, -0.02, 0.18);
      profile.bezierCurveTo(-0.06, 0.1, -0.12, 0.05, -0.1, 0.0);
      profile.closePath();

      const extrude = new THREE.ExtrudeGeometry(profile, {
        depth: 0.26,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 5,
        curveSegments: 32,
      });
      extrude.translate(0, 0, -0.13);
      const body = new THREE.Mesh(extrude, m);
      body.position.set(0.02, 0.34, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 16), m);
      ear.position.set(0.04, 1.1, 0.02);
      ear.rotation.z = -0.45;
      ear.castShadow = true;
      g.add(ear);

      const mane = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.34, 0.08),
        accent
      );
      mane.position.set(-0.06, 0.82, 0);
      mane.rotation.z = -0.5;
      mane.castShadow = true;
      g.add(mane);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 12, 10),
        accent
      );
      eye.position.set(0.26, 0.96, 0.11);
      g.add(eye);
      break;
    }
    case "b": {
      // Mitre with wide diagonal cleft — oval + slit from above.
      add(
        g,
        lathe([
          [0.14, 0],
          [0.125, 0.08],
          [0.085, 0.28],
          [0.11, 0.5],
          [0.075, 0.66],
          [0.1, 0.8],
          [0.055, 0.88],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.1, 0.016, 10, 36), accent, 0.98);
      // Flattened oval mitre (wider in X) so top view ≠ pawn ball
      const mitre = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 36, 28),
        m
      );
      mitre.scale.set(1.15, 0.95, 0.85);
      mitre.position.y = 1.1;
      mitre.castShadow = true;
      mitre.receiveShadow = true;
      g.add(mitre);
      // Deep cleft groove — dark accent reads as a slash from above
      const cleft = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.3, 0.28),
        accent
      );
      cleft.position.set(0, 1.14, 0.04);
      cleft.rotation.set(-0.2, 0, 0.55);
      cleft.castShadow = true;
      g.add(cleft);
      add(g, new THREE.SphereGeometry(0.045, 16, 12), m, 1.32);
      break;
    }
    case "q": {
      // Coronet of outward spikes — star/ring from above.
      add(
        g,
        lathe([
          [0.16, 0],
          [0.145, 0.08],
          [0.105, 0.3],
          [0.14, 0.5],
          [0.095, 0.72],
          [0.13, 0.88],
          [0.1, 0.94],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.15, 0.02, 10, 40), accent, 1.1);
      add(g, new THREE.CylinderGeometry(0.16, 0.16, 0.07, 40), m, 1.16);
      // Rim disc so the crown diameter reads clearly
      add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.03, 40), accent, 1.22);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.038, 0.22, 12),
          i % 2 === 0 ? accent : m
        );
        // Push spikes outward + slightly up so they form a star from above
        spike.position.set(Math.cos(a) * 0.175, 1.34, Math.sin(a) * 0.175);
        spike.rotation.x = Math.cos(a) * 0.35;
        spike.rotation.z = -Math.sin(a) * 0.35;
        spike.castShadow = true;
        g.add(spike);
      }
      add(g, new THREE.SphereGeometry(0.06, 18, 14), accent, 1.48);
      break;
    }
    case "k": {
      // Wide cross finial — clear + from every overhead angle.
      add(
        g,
        lathe([
          [0.16, 0],
          [0.145, 0.08],
          [0.105, 0.3],
          [0.14, 0.5],
          [0.1, 0.74],
          [0.135, 0.92],
          [0.11, 0.98],
        ]),
        m,
        0.2
      );
      add(g, new THREE.TorusGeometry(0.14, 0.02, 10, 40), accent, 1.14);
      add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.07, 40), m, 1.2);
      // Cap disc under the cross
      add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 32), accent, 1.28);
      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.44, 0.09),
        accent
      );
      crossV.position.y = 1.52;
      crossV.castShadow = true;
      g.add(crossV);
      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.09, 0.09),
        accent
      );
      crossH.position.y = 1.58;
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
