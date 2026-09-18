import * as THREE from "three";

type PieceColor = "w" | "b";
type PieceRole = "p" | "n" | "b" | "r" | "q" | "k";

const WHITE_MAT = {
  color: 0xf3efe4,
  roughness: 0.42,
  metalness: 0.08,
};
const BLACK_MAT = {
  color: 0x2a2a2e,
  roughness: 0.48,
  metalness: 0.12,
};

function mat(color: PieceColor): THREE.MeshStandardMaterial {
  const base = color === "w" ? WHITE_MAT : BLACK_MAT;
  return new THREE.MeshStandardMaterial({ ...base });
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
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function lathe(
  points: Array<[number, number]>,
  segments = 24
): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments
  );
}

/** Procedural Staunton-ish pieces — no external GPL assets. */
export function createPieceMesh(
  role: PieceRole,
  color: PieceColor
): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color);
  const accent =
    color === "w"
      ? new THREE.MeshStandardMaterial({
          color: 0xd8d0c0,
          roughness: 0.4,
          metalness: 0.1,
        })
      : new THREE.MeshStandardMaterial({
          color: 0x3a3a40,
          roughness: 0.45,
          metalness: 0.15,
        });

  // Shared pedestal
  add(g, new THREE.CylinderGeometry(0.28, 0.32, 0.08, 24), m, 0.04);
  add(g, new THREE.CylinderGeometry(0.22, 0.26, 0.06, 24), accent, 0.1);

  switch (role) {
    case "p": {
      add(g, new THREE.CylinderGeometry(0.12, 0.18, 0.28, 20), m, 0.3);
      add(g, new THREE.SphereGeometry(0.14, 20, 16), m, 0.52);
      break;
    }
    case "r": {
      add(g, new THREE.CylinderGeometry(0.16, 0.2, 0.42, 20), m, 0.36);
      add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.1, 20), m, 0.62);
      // Battlements
      for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.12, 0.08),
          m
        );
        tooth.position.set(Math.cos(a) * 0.14, 0.74, Math.sin(a) * 0.14);
        tooth.castShadow = false;
        g.add(tooth);
      }
      break;
    }
    case "n": {
      add(g, new THREE.CylinderGeometry(0.12, 0.2, 0.22, 20), m, 0.26);
      const neck = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.34, 0.28),
        m
      );
      neck.position.set(0.02, 0.5, 0);
      neck.rotation.z = -0.25;
      neck.castShadow = false;
      g.add(neck);
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.16, 0.18),
        m
      );
      head.position.set(0.1, 0.68, 0);
      head.rotation.z = -0.35;
      head.castShadow = false;
      g.add(head);
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.14, 8),
        m
      );
      ear.position.set(0.02, 0.8, 0.04);
      ear.castShadow = false;
      g.add(ear);
      break;
    }
    case "b": {
      add(
        g,
        lathe([
          [0.16, 0],
          [0.14, 0.12],
          [0.1, 0.35],
          [0.12, 0.5],
          [0.08, 0.62],
        ]),
        m,
        0.18
      );
      add(g, new THREE.SphereGeometry(0.12, 18, 14), m, 0.78);
      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.14, 0.16),
        accent
      );
      slit.position.set(0, 0.82, 0.02);
      g.add(slit);
      add(g, new THREE.SphereGeometry(0.045, 12, 10), m, 0.94);
      break;
    }
    case "q": {
      add(
        g,
        lathe([
          [0.18, 0],
          [0.15, 0.15],
          [0.12, 0.4],
          [0.16, 0.55],
          [0.1, 0.7],
        ]),
        m,
        0.18
      );
      add(g, new THREE.CylinderGeometry(0.14, 0.14, 0.08, 20), m, 0.9);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 10, 8),
          m
        );
        tip.position.set(Math.cos(a) * 0.12, 1.0, Math.sin(a) * 0.12);
        tip.castShadow = false;
        g.add(tip);
      }
      add(g, new THREE.SphereGeometry(0.05, 12, 10), m, 1.08);
      break;
    }
    case "k": {
      add(
        g,
        lathe([
          [0.18, 0],
          [0.15, 0.15],
          [0.12, 0.4],
          [0.16, 0.55],
          [0.11, 0.72],
        ]),
        m,
        0.18
      );
      add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20), m, 0.92);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), m);
      crossV.position.y = 1.12;
      crossV.castShadow = false;
      g.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), m);
      crossH.position.y = 1.18;
      crossH.castShadow = false;
      g.add(crossH);
      break;
    }
  }

  // Knights face the opponent by default (+Z); caller may yaw.
  g.userData.pieceRole = role;
  g.userData.pieceColor = color;
  return g;
}

export function squareToWorld(square: string): { x: number; z: number } | null {
  const file = square[0];
  const rank = Number(square[1]);
  if (!file || rank < 1 || rank > 8) return null;
  const fileIdx = file.charCodeAt(0) - 97; // a=0
  if (fileIdx < 0 || fileIdx > 7) return null;

  // Fixed table coords: a-file → -x, rank 1 → +z (near white's seat).
  return { x: fileIdx - 3.5, z: 3.5 - (rank - 1) };
}

export type { PieceColor, PieceRole };
