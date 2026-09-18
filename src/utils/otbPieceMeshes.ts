import * as THREE from "three";

type PieceColor = "w" | "b";
type PieceRole = "p" | "n" | "b" | "r" | "q" | "k";

/** Subtle plastic/wood grain baked into a shared canvas texture. */
function makeGrainTexture(seed: number, light: boolean): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const base = light ? "#f2ebe0" : "#2c2c30";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Soft vertical grain
  for (let i = 0; i < 48; i++) {
    const x = ((seed * 17 + i * 19) % size) + 0.5;
    const a = light ? 0.04 + (i % 5) * 0.01 : 0.06 + (i % 5) * 0.012;
    ctx.strokeStyle = light
      ? `rgba(120, 100, 70, ${a})`
      : `rgba(255, 255, 255, ${a})`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + ((i * 3) % 5) - 2, size);
    ctx.stroke();
  }
  // Speckle for plastic feel
  for (let i = 0; i < 220; i++) {
    const x = (seed * 13 + i * 47) % size;
    const y = (seed * 29 + i * 31) % size;
    const a = light ? 0.05 : 0.07;
    ctx.fillStyle = light
      ? `rgba(90, 70, 40, ${a})`
      : `rgba(255, 255, 255, ${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

let whiteGrain: THREE.CanvasTexture | null = null;
let blackGrain: THREE.CanvasTexture | null = null;

function grain(color: PieceColor): THREE.CanvasTexture {
  if (color === "w") {
    whiteGrain ??= makeGrainTexture(3, true);
    return whiteGrain;
  }
  blackGrain ??= makeGrainTexture(7, false);
  return blackGrain;
}

function mat(color: PieceColor, accent = false): THREE.MeshPhysicalMaterial {
  const light = color === "w";
  return new THREE.MeshPhysicalMaterial({
    color: accent
      ? light
        ? 0xc4b492
        : 0x6a6a74
      : light
        ? 0xe8dfd0
        : 0x1a1a1e,
    map: grain(color),
    roughness: light ? 0.45 : 0.5,
    metalness: light ? 0.05 : 0.1,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    reflectivity: 0.35,
  });
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
  segments = 48
): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments
  );
}

function pedestal(group: THREE.Group, m: THREE.Material, accent: THREE.Material) {
  add(group, new THREE.CylinderGeometry(0.3, 0.34, 0.07, 48), m, 0.035);
  add(group, new THREE.CylinderGeometry(0.24, 0.28, 0.05, 48), accent, 0.09);
  add(group, new THREE.TorusGeometry(0.22, 0.025, 12, 48), accent, 0.13);
}

/** Procedural Staunton-ish pieces — glanceable silhouettes from a sitting seat. */
export function createPieceMesh(
  role: PieceRole,
  color: PieceColor
): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color);
  const accent = mat(color, true);

  pedestal(g, m, accent);

  switch (role) {
    case "p": {
      // Classic pear body + collar + ball
      add(
        g,
        lathe([
          [0.17, 0],
          [0.15, 0.08],
          [0.11, 0.22],
          [0.13, 0.34],
          [0.1, 0.42],
        ]),
        m,
        0.16
      );
      add(g, new THREE.TorusGeometry(0.1, 0.022, 12, 36), accent, 0.58);
      add(g, new THREE.SphereGeometry(0.13, 36, 28), m, 0.72);
      break;
    }
    case "r": {
      add(
        g,
        lathe([
          [0.17, 0],
          [0.15, 0.1],
          [0.14, 0.35],
          [0.16, 0.48],
        ]),
        m,
        0.16
      );
      add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.12, 28), m, 0.72);
      // Thick crenellations — readable from across the table
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.16, 0.1),
          m
        );
        tooth.position.set(Math.cos(a) * 0.15, 0.86, Math.sin(a) * 0.15);
        tooth.castShadow = true;
        g.add(tooth);
      }
      break;
    }
    case "n": {
      // Flared base so the knight doesn't read as a thin stalk
      add(g, new THREE.CylinderGeometry(0.13, 0.2, 0.18, 32), m, 0.24);
      // Extruded side-profile — glanceable horse from a sitting seat
      const profile = new THREE.Shape();
      profile.moveTo(-0.08, 0.0);
      profile.lineTo(0.1, 0.0);
      profile.lineTo(0.12, 0.14);
      profile.bezierCurveTo(0.14, 0.3, 0.02, 0.4, -0.02, 0.5);
      profile.bezierCurveTo(-0.02, 0.6, 0.06, 0.66, 0.16, 0.64);
      profile.lineTo(0.36, 0.56);
      profile.lineTo(0.38, 0.5);
      profile.lineTo(0.24, 0.48);
      profile.lineTo(0.2, 0.44);
      profile.bezierCurveTo(0.1, 0.42, 0.02, 0.36, 0.0, 0.28);
      profile.bezierCurveTo(-0.05, 0.2, -0.1, 0.1, -0.08, 0.0);
      profile.closePath();

      const extrude = new THREE.ExtrudeGeometry(profile, {
        depth: 0.18,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.02,
        bevelSegments: 2,
        curveSegments: 16,
      });
      extrude.translate(0, 0, -0.09);
      const body = new THREE.Mesh(extrude, m);
      body.position.set(0.02, 0.32, 0);
      body.castShadow = true;
      g.add(body);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 10), m);
      ear.position.set(0.04, 0.98, 0.02);
      ear.rotation.z = -0.45;
      ear.castShadow = true;
      g.add(ear);

      const mane = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.26, 0.07),
        accent
      );
      mane.position.set(-0.05, 0.74, 0);
      mane.rotation.z = -0.55;
      g.add(mane);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 10, 8),
        accent
      );
      eye.position.set(0.18, 0.88, 0.08);
      g.add(eye);
      break;
    }
    case "b": {
      add(
        g,
        lathe([
          [0.16, 0],
          [0.14, 0.1],
          [0.1, 0.32],
          [0.13, 0.48],
          [0.09, 0.62],
          [0.11, 0.72],
        ]),
        m,
        0.16
      );
      // Mitre bulb
      add(g, new THREE.SphereGeometry(0.13, 24, 18), m, 0.92);
      // Deep cleft — the bishop tell at a glance
      const cleft = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.24, 0.22),
        accent
      );
      cleft.position.set(0, 0.98, 0.05);
      cleft.rotation.x = -0.18;
      g.add(cleft);
      add(g, new THREE.SphereGeometry(0.055, 16, 14), m, 1.14);
      break;
    }
    case "q": {
      add(
        g,
        lathe([
          [0.18, 0],
          [0.16, 0.1],
          [0.12, 0.35],
          [0.16, 0.52],
          [0.11, 0.7],
          [0.14, 0.82],
        ]),
        m,
        0.16
      );
      add(g, new THREE.CylinderGeometry(0.16, 0.16, 0.08, 28), m, 1.0);
      // Coronet spikes
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.035, 0.16, 8),
          m
        );
        spike.position.set(Math.cos(a) * 0.13, 1.12, Math.sin(a) * 0.13);
        spike.castShadow = true;
        g.add(spike);
      }
      add(g, new THREE.SphereGeometry(0.055, 14, 12), m, 1.22);
      break;
    }
    case "k": {
      add(
        g,
        lathe([
          [0.18, 0],
          [0.16, 0.1],
          [0.12, 0.35],
          [0.16, 0.52],
          [0.12, 0.72],
          [0.14, 0.84],
        ]),
        m,
        0.16
      );
      add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.08, 28), m, 1.02);
      // Cross — oversized for OTB readability
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), m);
      crossV.position.y = 1.3;
      crossV.castShadow = true;
      g.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), m);
      crossH.position.y = 1.38;
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
  const fileIdx = file.charCodeAt(0) - 97; // a=0
  if (fileIdx < 0 || fileIdx > 7) return null;

  // Fixed table coords: a-file → -x, rank 1 → +z (near white's seat).
  return { x: fileIdx - 3.5, z: 3.5 - (rank - 1) };
}

export type { PieceColor, PieceRole };
