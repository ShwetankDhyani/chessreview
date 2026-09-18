import * as THREE from "three";

type PieceColor = "w" | "b";
type PieceRole = "p" | "n" | "b" | "r" | "q" | "k";

/** Subtle plastic grain — darker bases so whites don't blow out under lights. */
function makeGrainTexture(seed: number, light: boolean): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // Bone ivory / charcoal — not near-white
  const base = light ? "#b09a78" : "#4a4a54";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 56; i++) {
    const x = ((seed * 17 + i * 19) % size) + 0.5;
    const a = light ? 0.07 + (i % 5) * 0.015 : 0.08 + (i % 5) * 0.015;
    ctx.strokeStyle = light
      ? `rgba(70, 50, 30, ${a})`
      : `rgba(255, 255, 255, ${a})`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + ((i * 3) % 5) - 2, size);
    ctx.stroke();
  }
  for (let i = 0; i < 260; i++) {
    const x = (seed * 13 + i * 47) % size;
    const y = (seed * 29 + i * 31) % size;
    ctx.fillStyle = light
      ? `rgba(60, 40, 20, ${0.06 + (i % 4) * 0.02})`
      : `rgba(255, 255, 255, ${0.05 + (i % 4) * 0.015})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
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

/**
 * Matte plastic set: bone whites (not blown-out), readable charcoal blacks.
 * Accents are much darker/lighter than the body so crowns/clefts/crosses read.
 */
function mat(color: PieceColor, accent = false): THREE.MeshStandardMaterial {
  const light = color === "w";
  return new THREE.MeshStandardMaterial({
    color: accent
      ? light
        ? 0x6e5840 // dark walnut rings / features on white
        : 0x8a8a96 // lighter rim features on black
      : light
        ? 0xb09a78 // muted bone — readable against cream squares
        : 0x4a4a54,
    map: grain(color),
    roughness: light ? 0.72 : 0.68,
    metalness: 0.02,
    envMapIntensity: 0.25, // overridden per-piece sync; keep low
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
  segments = 40
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
  add(group, new THREE.CylinderGeometry(0.3, 0.34, 0.07, 40), m, 0.035);
  add(group, new THREE.CylinderGeometry(0.24, 0.28, 0.05, 40), accent, 0.09);
  add(group, new THREE.TorusGeometry(0.22, 0.028, 10, 40), accent, 0.13);
}

/** Procedural Staunton pieces — high-contrast tells for OTB glance ID. */
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
      add(
        g,
        lathe([
          [0.16, 0],
          [0.14, 0.08],
          [0.1, 0.22],
          [0.12, 0.34],
          [0.09, 0.4],
        ]),
        m,
        0.16
      );
      add(g, new THREE.TorusGeometry(0.09, 0.024, 10, 32), accent, 0.56);
      add(g, new THREE.SphereGeometry(0.12, 28, 22), m, 0.7);
      break;
    }
    case "r": {
      add(
        g,
        lathe([
          [0.16, 0],
          [0.14, 0.1],
          [0.13, 0.38],
          [0.15, 0.5],
        ]),
        m,
        0.16
      );
      add(g, new THREE.CylinderGeometry(0.19, 0.19, 0.12, 28), m, 0.74);
      // Tall battlements — the rook tell
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.11), m);
        tooth.position.set(Math.cos(a) * 0.14, 0.9, Math.sin(a) * 0.14);
        tooth.castShadow = true;
        g.add(tooth);
      }
      // Dark collar under the crown for contrast
      add(g, new THREE.TorusGeometry(0.17, 0.02, 8, 28), accent, 0.66);
      break;
    }
    case "n": {
      add(g, new THREE.CylinderGeometry(0.13, 0.2, 0.16, 28), m, 0.24);
      const profile = new THREE.Shape();
      // Exaggerated horse silhouette (snout + ear + jaw undercut)
      profile.moveTo(-0.1, 0.0);
      profile.lineTo(0.1, 0.0);
      profile.lineTo(0.12, 0.12);
      profile.bezierCurveTo(0.14, 0.28, 0.0, 0.4, -0.04, 0.52);
      profile.bezierCurveTo(-0.04, 0.62, 0.08, 0.7, 0.18, 0.68);
      profile.lineTo(0.4, 0.58);
      profile.lineTo(0.42, 0.5);
      profile.lineTo(0.26, 0.48);
      profile.lineTo(0.22, 0.42);
      profile.bezierCurveTo(0.1, 0.4, 0.0, 0.32, -0.02, 0.22);
      profile.bezierCurveTo(-0.06, 0.14, -0.12, 0.08, -0.1, 0.0);
      profile.closePath();

      const extrude = new THREE.ExtrudeGeometry(profile, {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelSegments: 2,
        curveSegments: 18,
      });
      extrude.translate(0, 0, -0.1);
      const body = new THREE.Mesh(extrude, m);
      body.position.set(0.02, 0.3, 0);
      body.castShadow = true;
      g.add(body);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 10), m);
      ear.position.set(0.02, 1.02, 0.02);
      ear.rotation.z = -0.5;
      ear.castShadow = true;
      g.add(ear);

      const mane = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.3, 0.08),
        accent
      );
      mane.position.set(-0.06, 0.76, 0);
      mane.rotation.z = -0.55;
      g.add(mane);

      // Dark eye — tiny but helps ID
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 10, 8),
        accent
      );
      eye.position.set(0.2, 0.9, 0.09);
      g.add(eye);
      break;
    }
    case "b": {
      add(
        g,
        lathe([
          [0.15, 0],
          [0.13, 0.1],
          [0.09, 0.32],
          [0.12, 0.5],
          [0.08, 0.64],
          [0.1, 0.74],
        ]),
        m,
        0.16
      );
      add(g, new THREE.SphereGeometry(0.135, 24, 18), m, 0.94);
      // Wide dark cleft — unmistakable bishop mark
      const cleft = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.28, 0.24),
        accent
      );
      cleft.position.set(0, 1.0, 0.06);
      cleft.rotation.x = -0.2;
      g.add(cleft);
      add(g, new THREE.SphereGeometry(0.055, 14, 12), m, 1.16);
      add(g, new THREE.TorusGeometry(0.1, 0.02, 8, 24), accent, 0.78);
      break;
    }
    case "q": {
      add(
        g,
        lathe([
          [0.17, 0],
          [0.15, 0.1],
          [0.11, 0.35],
          [0.15, 0.52],
          [0.1, 0.72],
          [0.14, 0.86],
        ]),
        m,
        0.16
      );
      add(g, new THREE.CylinderGeometry(0.16, 0.16, 0.08, 28), m, 1.02);
      add(g, new THREE.TorusGeometry(0.15, 0.022, 8, 28), accent, 0.96);
      // Tall coronet spikes with dark tips
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.038, 0.2, 8),
          i % 2 === 0 ? accent : m
        );
        spike.position.set(Math.cos(a) * 0.135, 1.18, Math.sin(a) * 0.135);
        spike.castShadow = true;
        g.add(spike);
      }
      add(g, new THREE.SphereGeometry(0.06, 14, 12), accent, 1.3);
      break;
    }
    case "k": {
      add(
        g,
        lathe([
          [0.17, 0],
          [0.15, 0.1],
          [0.11, 0.35],
          [0.15, 0.52],
          [0.11, 0.74],
          [0.14, 0.88],
        ]),
        m,
        0.16
      );
      add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.08, 28), m, 1.04);
      add(g, new THREE.TorusGeometry(0.14, 0.022, 8, 28), accent, 0.98);
      // Oversized dark cross — the king tell at a glance
      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.44, 0.09),
        accent
      );
      crossV.position.y = 1.34;
      crossV.castShadow = true;
      g.add(crossV);
      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.09, 0.09),
        accent
      );
      crossH.position.y = 1.42;
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
