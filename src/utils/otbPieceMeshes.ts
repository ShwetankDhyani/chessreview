import * as THREE from "three";

type PieceColor = "w" | "b";
type PieceRole = "p" | "n" | "b" | "r" | "q" | "k";

const SEG = 64; // lathe / cylinder fidelity for a championship set

/** Procedural wood grain — boxwood (light) or ebony (dark). */
function makeWoodTexture(seed: number, light: boolean): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Boxwood ivory vs deep ebony — tournament Staunton palette
  const base = light ? "#c9b48a" : "#16161c";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Growth rings / longitudinal grain
  for (let i = 0; i < 90; i++) {
    const x = ((seed * 17 + i * 13) % size) + 0.5;
    const a = light ? 0.04 + (i % 6) * 0.012 : 0.05 + (i % 6) * 0.014;
    ctx.strokeStyle = light
      ? `rgba(90, 62, 28, ${a})`
      : `rgba(210, 210, 220, ${a})`;
    ctx.lineWidth = 0.8 + (i % 4) * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    const wobble = ((i * 7) % 9) - 4;
    ctx.bezierCurveTo(x + wobble, size * 0.35, x - wobble * 0.6, size * 0.65, x + wobble * 0.3, size);
    ctx.stroke();
  }

  // Pore / fleck noise
  for (let i = 0; i < 520; i++) {
    const x = (seed * 13 + i * 47) % size;
    const y = (seed * 29 + i * 31) % size;
    ctx.fillStyle = light
      ? `rgba(70, 45, 20, ${0.035 + (i % 5) * 0.012})`
      : `rgba(255, 255, 255, ${0.03 + (i % 5) * 0.01})`;
    ctx.fillRect(x, y, 1 + (i % 2), 1);
  }

  // Soft lacquer sheen bands
  for (let i = 0; i < 8; i++) {
    const y = ((seed * 11 + i * 31) % size);
    ctx.fillStyle = light
      ? `rgba(255, 248, 230, ${0.03 + (i % 3) * 0.01})`
      : `rgba(255, 255, 255, ${0.02 + (i % 3) * 0.008})`;
    ctx.fillRect(0, y, size, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Grayscale bump sibling of the wood albedo. */
function makeWoodBump(seed: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const x = ((seed * 17 + i * 13) % size) + 0.5;
    const v = 110 + (i % 7) * 12;
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    const wobble = ((i * 7) % 9) - 4;
    ctx.bezierCurveTo(x + wobble, size * 0.35, x - wobble * 0.6, size * 0.65, x + wobble * 0.3, size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  tex.needsUpdate = true;
  return tex;
}

/** Walnut frame / table grain for the board rim. */
export function makeWalnutTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#5a3a22";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const y = (i * 19 + 7) % size;
    ctx.strokeStyle = `rgba(30, 16, 8, ${0.08 + (i % 5) * 0.03})`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + 4, size * 0.7, y - 3, size, y + 2);
    ctx.stroke();
  }
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(20, 10, 4, ${0.04 + (i % 4) * 0.02})`;
    ctx.fillRect((i * 37) % size, (i * 53) % size, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Subtle felt / maple variation on playing squares. */
export function makeSquareTexture(light: boolean): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = light ? "#f0ead2" : "#6e9450";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 180; i++) {
    const x = (i * 41) % size;
    const y = (i * 73) % size;
    ctx.fillStyle = light
      ? `rgba(160, 140, 90, ${0.04 + (i % 3) * 0.02})`
      : `rgba(20, 40, 10, ${0.05 + (i % 3) * 0.02})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Soft vignette toward square edges
  const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 70);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, light ? "rgba(80,60,30,0.06)" : "rgba(0,0,0,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

let whiteWood: THREE.CanvasTexture | null = null;
let blackWood: THREE.CanvasTexture | null = null;
let whiteBump: THREE.CanvasTexture | null = null;
let blackBump: THREE.CanvasTexture | null = null;

function wood(color: PieceColor): THREE.CanvasTexture {
  if (color === "w") {
    whiteWood ??= makeWoodTexture(3, true);
    return whiteWood;
  }
  blackWood ??= makeWoodTexture(7, false);
  return blackWood;
}

function bump(color: PieceColor): THREE.CanvasTexture {
  if (color === "w") {
    whiteBump ??= makeWoodBump(3);
    return whiteBump;
  }
  blackBump ??= makeWoodBump(7);
  return blackBump;
}

/**
 * Polished tournament wood — boxwood / ebony with clearcoat lacquer.
 * Accents are carved recesses (darker on white, lighter on black).
 */
function mat(color: PieceColor, accent = false): THREE.MeshPhysicalMaterial {
  const light = color === "w";
  return new THREE.MeshPhysicalMaterial({
    color: accent
      ? light
        ? 0x5c4228 // walnut collar / cleft on boxwood
        : 0x8e8e9a // silvered highlight on ebony carvings
      : light
        ? 0xb8975e // warm boxwood — distinct from cream squares
        : 0x1a1a20, // deep ebony
    map: wood(color),
    bumpMap: bump(color),
    bumpScale: accent ? 0.018 : 0.028,
    roughness: accent ? (light ? 0.52 : 0.48) : light ? 0.46 : 0.42,
    metalness: 0.03,
    clearcoat: accent ? 0.22 : 0.38,
    clearcoatRoughness: 0.35,
    reflectivity: 0.28,
    envMapIntensity: 0.4,
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
  segments = SEG
): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments
  );
}

/** Classic weighted Staunton base — wide foot, collar ring, throat. */
function pedestal(
  group: THREE.Group,
  m: THREE.Material,
  accent: THREE.Material
) {
  // Weighted foot
  add(group, lathe([
    [0.0, 0],
    [0.34, 0],
    [0.35, 0.02],
    [0.32, 0.06],
    [0.28, 0.09],
  ]), m, 0);
  // Step / plinth
  add(group, new THREE.CylinderGeometry(0.26, 0.29, 0.045, SEG), m, 0.11);
  // Accent collar — the classic Staunton tell
  add(group, new THREE.TorusGeometry(0.235, 0.022, 12, SEG), accent, 0.145);
  add(group, new THREE.CylinderGeometry(0.2, 0.24, 0.035, SEG), m, 0.175);
}

/**
 * Procedural championship Staunton set — boxwood & ebony, lacquered,
 * glanceable silhouettes at OTB viewing distance.
 */
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
      add(g, new THREE.SphereGeometry(0.115, 36, 28), m, 0.78);
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
      // Battlements
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.18, 0.1),
          m
        );
        tooth.position.set(Math.cos(a) * 0.135, 0.98, Math.sin(a) * 0.135);
        tooth.castShadow = true;
        tooth.receiveShadow = true;
        g.add(tooth);
      }
      // Inner well
      add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24), accent, 0.9);
      break;
    }
    case "n": {
      add(g, new THREE.CylinderGeometry(0.125, 0.195, 0.14, 40), m, 0.27);
      add(g, new THREE.TorusGeometry(0.14, 0.016, 10, 36), accent, 0.36);

      const profile = new THREE.Shape();
      // Carved horse — snout, jaw undercut, ear line, arched neck
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
        bevelSegments: 4,
        curveSegments: 28,
      });
      extrude.translate(0, 0, -0.11);
      const body = new THREE.Mesh(extrude, m);
      body.position.set(0.02, 0.34, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.17, 14), m);
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
      add(g, new THREE.SphereGeometry(0.13, 36, 28), m, 1.02);
      // Mitre cleft
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
      // Cross — slightly refined proportions
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
