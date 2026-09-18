import * as THREE from "three";
import type { OtbPbrMaps } from "./otbTextures";

type PieceColor = "w" | "b";
type PieceRole = "p" | "n" | "b" | "r" | "q" | "k";

const SEG = 64;

/**
 * Luxury handcrafted Staunton materials:
 * - White: Polished boxwood (warm creamy ivory with fine maple grain and satin clearcoat).
 * - Black: Royal ebonized rosewood (deep espresso-ebony with specular luster and rosewood grain).
 */
function mat(
  color: PieceColor,
  accent = false,
  maps?: OtbPbrMaps | null
): THREE.MeshPhysicalMaterial {
  const light = color === "w";
  const diff = light ? maps?.lightDiff ?? null : maps?.darkDiff ?? null;
  const nor = light ? maps?.lightNor ?? null : maps?.darkNor ?? null;
  const rough = light ? maps?.lightRough ?? null : maps?.darkRough ?? null;

  return new THREE.MeshPhysicalMaterial({
    color: accent
      ? light
        ? 0xe2d6c6 // warm honey-boxwood accent ring
        : 0x3d2b22 // lifted warm mahogany accent ring
      : light
        ? 0xf4ede2 // warm creamy polished boxwood
        : 0x241a16, // deep lustrous ebonized rosewood
    map: diff,
    normalMap: nor,
    normalScale: new THREE.Vector2(accent ? 0.18 : 0.22, accent ? 0.18 : 0.22),
    roughnessMap: rough,
    roughness: light ? (accent ? 0.42 : 0.36) : accent ? 0.38 : 0.32,
    metalness: 0.0,
    clearcoat: light ? (accent ? 0.22 : 0.32) : accent ? 0.26 : 0.38,
    clearcoatRoughness: light ? 0.4 : 0.32,
    reflectivity: light ? 0.22 : 0.28,
    envMapIntensity: light ? 0.45 : 0.55,
  });
}

/** Authentic tournament green felt pad under the base of every piece. */
function feltMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x18381d,
    roughness: 0.96,
    metalness: 0.0,
  });
}

/** Medium oak frame for the chessboard. */
export function frameMaterials(maps?: OtbPbrMaps | null): {
  apron: THREE.MeshPhysicalMaterial;
  lip: THREE.MeshPhysicalMaterial;
} {
  const shared = {
    map: maps?.lightDiff ?? null,
    normalMap: maps?.lightNor ?? null,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: maps?.lightRough ?? null,
    metalness: 0.0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.32,
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
 * Tournament board squares:
 * - Light: Cool sage-cream for crisp separation against warm ivory boxwood.
 * - Dark: Rich tournament green.
 */
export function squareMaterials(): {
  light: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshPhysicalMaterial;
} {
  return {
    light: new THREE.MeshPhysicalMaterial({
      color: 0xd4d8c6,
      roughness: 0.88,
      metalness: 0.0,
      clearcoat: 0.04,
      clearcoatRoughness: 0.8,
    }),
    dark: new THREE.MeshPhysicalMaterial({
      color: 0x6a8a4e,
      roughness: 0.9,
      metalness: 0.0,
      clearcoat: 0.04,
      clearcoatRoughness: 0.8,
    }),
  };
}

function add(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  y: number,
  scale: [number, number, number] = [1, 1, 1],
  rot: [number, number, number] = [0, 0, 0],
  posOffset: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(posOffset[0], y + posOffset[1], posOffset[2]);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rot);
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

/**
 * Classical Staunton pedestal with:
 * - Deep green tournament felt base pad
 * - Double-scotia turned wooden foot
 * - Turned annular bead molding (astragal)
 * - Graceful concave cove flaring to the stem
 */
function pedestal(
  group: THREE.Group,
  baseR: number,
  m: THREE.Material,
  accent: THREE.Material,
  felt: THREE.Material
) {
  // 1. Felt baize disc under the base (grounds the piece to the board)
  const feltMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(baseR * 0.94, baseR * 0.94, 0.012, SEG),
    felt
  );
  feltMesh.position.y = 0.006;
  feltMesh.receiveShadow = true;
  group.add(feltMesh);

  // 2. Classical lathe foot profile
  const footProfile: Array<[number, number]> = [
    [0.0, 0.01],
    [baseR * 0.96, 0.01],
    [baseR, 0.024],
    [baseR * 0.97, 0.045],
    [baseR * 0.88, 0.07],
    [baseR * 0.82, 0.095],
    [baseR * 0.79, 0.115],
  ];
  add(group, lathe(footProfile), m, 0);

  // 3. Annular bead molding (accent ring)
  add(
    group,
    new THREE.TorusGeometry(baseR * 0.77, baseR * 0.065, 16, SEG),
    accent,
    0.125,
    [1, 0.8, 1],
    [Math.PI / 2, 0, 0]
  );

  // 4. Upper cove collar transitioning to stem
  const coveProfile: Array<[number, number]> = [
    [baseR * 0.75, 0.135],
    [baseR * 0.68, 0.16],
    [baseR * 0.6, 0.19],
    [baseR * 0.52, 0.22],
  ];
  add(group, lathe(coveProfile), m, 0);
}

/**
 * Master Staunton 3D piece generator.
 * Produces organic turned geometries and sculpted anatomical knights
 * with unmistakable silhouettes from both seat and overhead perspectives.
 */
export function createPieceMesh(
  role: PieceRole,
  color: PieceColor,
  maps?: OtbPbrMaps | null
): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color, false, maps);
  const accent = mat(color, true, maps);
  const felt = feltMat();

  switch (role) {
    case "p": {
      // Base radius: 0.30, total height ~0.84
      pedestal(g, 0.3, m, accent, felt);

      // Slender concave stem
      add(
        g,
        lathe([
          [0.156, 0.22],
          [0.125, 0.29],
          [0.095, 0.39],
          [0.082, 0.49],
          [0.096, 0.58],
          [0.122, 0.63],
        ]),
        m,
        0
      );

      // Flared neck collar (astragal ring)
      add(
        g,
        new THREE.TorusGeometry(0.124, 0.024, 14, SEG),
        accent,
        0.645,
        [1, 0.75, 1],
        [Math.PI / 2, 0, 0]
      );

      // Classical spherical head (clean, perfectly proportioned)
      add(g, new THREE.SphereGeometry(0.098, 36, 28), m, 0.755);
      break;
    }

    case "r": {
      // Base radius: 0.33, total height ~1.03
      pedestal(g, 0.33, m, accent, felt);

      // Muscular circular tower stem
      add(
        g,
        lathe([
          [0.172, 0.22],
          [0.155, 0.36],
          [0.144, 0.52],
          [0.152, 0.66],
          [0.174, 0.74],
          // Machicolated flared cornice / capital
          [0.21, 0.79],
          [0.245, 0.83],
          [0.245, 0.87],
        ]),
        m,
        0
      );

      // Collar accent under cornice
      add(
        g,
        new THREE.TorusGeometry(0.18, 0.02, 14, SEG),
        accent,
        0.75,
        [1, 0.8, 1],
        [Math.PI / 2, 0, 0]
      );

      // Sunken central turret floor
      add(g, new THREE.CylinderGeometry(0.165, 0.165, 0.02, SEG), accent, 0.875);

      // 4 circular crenellated merlons (embrasures at 90° intervals)
      // Crafted as curved ring sectors with smooth beveled tops
      const rIn = 0.165;
      const rOut = 0.245;
      const merlonArc = Math.PI * 0.32; // ~58° width per merlon, leaving ~32° embrasure gaps
      const steps = 14;

      const merlonShape = new THREE.Shape();
      for (let s = 0; s <= steps; s++) {
        const theta = -merlonArc / 2 + (merlonArc * s) / steps;
        const x = Math.cos(theta) * rOut;
        const y = Math.sin(theta) * rOut;
        if (s === 0) merlonShape.moveTo(x, y);
        else merlonShape.lineTo(x, y);
      }
      for (let s = steps; s >= 0; s--) {
        const theta = -merlonArc / 2 + (merlonArc * s) / steps;
        const x = Math.cos(theta) * rIn;
        const y = Math.sin(theta) * rIn;
        merlonShape.lineTo(x, y);
      }
      merlonShape.closePath();

      const merlonGeo = new THREE.ExtrudeGeometry(merlonShape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.012,
        bevelSegments: 3,
      });
      // Orient horizontally in XZ, extrude upward in Y
      merlonGeo.rotateX(Math.PI / 2);

      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const merlon = new THREE.Mesh(merlonGeo, m);
        merlon.position.set(0, 1.01, 0);
        merlon.rotation.y = a;
        merlon.castShadow = true;
        merlon.receiveShadow = true;
        g.add(merlon);
      }
      break;
    }

    case "n": {
      // Base radius: 0.33, total height ~1.14
      pedestal(g, 0.33, m, accent, felt);

      // Turned plinth collar
      add(
        g,
        lathe([
          [0.172, 0.22],
          [0.16, 0.26],
          [0.175, 0.29],
          [0.14, 0.32],
        ]),
        m,
        0
      );
      add(
        g,
        new THREE.TorusGeometry(0.165, 0.018, 12, SEG),
        accent,
        0.29,
        [1, 0.8, 1],
        [Math.PI / 2, 0, 0]
      );

      // Sculpted 3D Equine Profile (smooth anatomical curves)
      const horseShape = new THREE.Shape();
      // Back of neck
      horseShape.moveTo(-0.16, 0.32);
      // Breast and throat
      horseShape.bezierCurveTo(-0.06, 0.32, 0.1, 0.34, 0.14, 0.44);
      horseShape.bezierCurveTo(0.16, 0.52, 0.14, 0.62, 0.13, 0.68);
      // Lower jaw and chin
      horseShape.bezierCurveTo(0.16, 0.71, 0.23, 0.71, 0.27, 0.74);
      // Muzzle, lips, nose
      horseShape.lineTo(0.38, 0.77);
      horseShape.bezierCurveTo(0.42, 0.8, 0.4, 0.86, 0.35, 0.87);
      // Nasal bridge and brow
      horseShape.bezierCurveTo(0.28, 0.9, 0.21, 0.97, 0.14, 1.03);
      // Crown between ears
      horseShape.lineTo(0.04, 1.07);
      // Arched crest and flowing dorsal mane curve
      horseShape.bezierCurveTo(-0.06, 1.04, -0.16, 0.92, -0.19, 0.78);
      horseShape.bezierCurveTo(-0.21, 0.64, -0.19, 0.48, -0.16, 0.32);
      horseShape.closePath();

      const horseGeo = new THREE.ExtrudeGeometry(horseShape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelThickness: 0.042,
        bevelSize: 0.032,
        bevelSegments: 4,
        curveSegments: 32,
      });
      horseGeo.translate(0, 0, -0.11);
      const horseBody = new THREE.Mesh(horseGeo, m);
      horseBody.castShadow = true;
      horseBody.receiveShadow = true;
      g.add(horseBody);

      // Anatomical Mandibular / Cheek Swell (realistic equine width at jaw, tapering to muzzle)
      for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 20, 16),
          m
        );
        cheek.position.set(0.07, 0.75, side * 0.095);
        cheek.scale.set(1.15, 0.85, 0.45);
        cheek.castShadow = true;
        g.add(cheek);
      }

      // Sculpted Muzzle / Nostril flutes
      for (const side of [-1, 1]) {
        const nostril = new THREE.Mesh(
          new THREE.SphereGeometry(0.032, 12, 10),
          accent
        );
        nostril.position.set(0.33, 0.82, side * 0.055);
        nostril.scale.set(1.4, 0.7, 0.6);
        nostril.castShadow = true;
        g.add(nostril);
      }

      // Alert, Forward-Tilted Equine Ears
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.038, 0.17, 14),
          m
        );
        ear.position.set(0.03, 1.11, side * 0.068);
        ear.rotation.set(side * 0.16, 0, -0.26);
        ear.scale.set(1.1, 1.0, 0.65);
        ear.castShadow = true;
        g.add(ear);
      }

      // Sculpted Cascading Mane Ridges along dorsal crest
      const manePts: Array<[number, number, number]> = [
        [-0.01, 1.03, 0.08],
        [-0.09, 0.94, 0.085],
        [-0.15, 0.82, 0.09],
        [-0.17, 0.68, 0.095],
        [-0.15, 0.54, 0.09],
      ];
      for (const [mx, my, mw] of manePts) {
        const tuft = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.06, mw * 2),
          accent
        );
        tuft.position.set(mx, my, 0);
        tuft.rotation.z = -0.55;
        tuft.castShadow = true;
        g.add(tuft);
      }
      break;
    }

    case "b": {
      // Base radius: 0.33, total height ~1.23
      pedestal(g, 0.33, m, accent, felt);

      // Slender waisted column
      add(
        g,
        lathe([
          [0.172, 0.22],
          [0.13, 0.34],
          [0.094, 0.48],
          [0.104, 0.62],
          [0.136, 0.72],
        ]),
        m,
        0
      );

      // Dual neck collar (astragal)
      add(
        g,
        new THREE.TorusGeometry(0.138, 0.02, 14, SEG),
        accent,
        0.74,
        [1, 0.75, 1],
        [Math.PI / 2, 0, 0]
      );
      add(
        g,
        new THREE.TorusGeometry(0.12, 0.016, 14, SEG),
        m,
        0.78,
        [1, 0.75, 1],
        [Math.PI / 2, 0, 0]
      );

      // Majestic Bishop's Miter Dome
      add(
        g,
        lathe([
          [0.08, 0.8],
          [0.128, 0.84],
          [0.156, 0.92],
          [0.158, 1.0],
          [0.132, 1.08],
          [0.082, 1.14],
          [0.035, 1.17],
        ]),
        m,
        0
      );

      // Authentic Diagonal Miter Cleft (ceremonial liturgical slit)
      const cleftBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.18, 0.34),
        accent
      );
      cleftBox.position.set(0.02, 1.05, 0);
      cleftBox.rotation.set(0, Math.PI / 4, 0.45);
      cleftBox.castShadow = true;
      g.add(cleftBox);

      // Finial neck ring
      add(
        g,
        new THREE.TorusGeometry(0.048, 0.012, 12, SEG),
        accent,
        1.172,
        [1, 0.8, 1],
        [Math.PI / 2, 0, 0]
      );

      // Apex finial bead (pearl)
      add(g, new THREE.SphereGeometry(0.046, 24, 18), accent, 1.215);
      break;
    }

    case "q": {
      // Base radius: 0.35, total height ~1.37
      pedestal(g, 0.35, m, accent, felt);

      // Regal waisted column
      add(
        g,
        lathe([
          [0.182, 0.22],
          [0.14, 0.36],
          [0.104, 0.52],
          [0.116, 0.7],
          [0.148, 0.84],
        ]),
        m,
        0
      );

      // Triple-fillet capital rings
      add(
        g,
        new THREE.TorusGeometry(0.152, 0.018, 14, SEG),
        accent,
        0.86,
        [1, 0.75, 1],
        [Math.PI / 2, 0, 0]
      );
      add(
        g,
        new THREE.TorusGeometry(0.135, 0.015, 14, SEG),
        m,
        0.9,
        [1, 0.75, 1],
        [Math.PI / 2, 0, 0]
      );

      // Flared Coronet Bowl
      add(
        g,
        lathe([
          [0.12, 0.92],
          [0.145, 0.98],
          [0.185, 1.06],
          [0.225, 1.15],
          [0.238, 1.19],
        ]),
        m,
        0
      );

      // Inner Coronet Cushion
      add(
        g,
        lathe([
          [0.0, 1.05],
          [0.11, 1.06],
          [0.14, 1.1],
          [0.0, 1.16],
        ]),
        accent,
        0
      );

      // Scalloped 8-Pearl Crown Rim (radiating coronet mandala)
      const crownR = 0.232;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.027, 16, 14),
          accent
        );
        pearl.position.set(Math.cos(a) * crownR, 1.205, Math.sin(a) * crownR);
        pearl.castShadow = true;
        g.add(pearl);
      }

      // Royal Central Finial Pearl
      add(g, new THREE.SphereGeometry(0.065, 24, 18), accent, 1.285);
      break;
    }

    case "k": {
      // Base radius: 0.37 (broadest, most commanding), total height ~1.54
      pedestal(g, 0.37, m, accent, felt);

      // Stately, muscular royal column
      add(
        g,
        lathe([
          [0.192, 0.22],
          [0.155, 0.38],
          [0.124, 0.56],
          [0.136, 0.76],
          [0.176, 0.92],
        ]),
        m,
        0
      );

      // Multi-tiered royal neck capital
      add(
        g,
        new THREE.TorusGeometry(0.178, 0.02, 14, SEG),
        accent,
        0.94,
        [1, 0.75, 1],
        [Math.PI / 2, 0, 0]
      );
      add(
        g,
        new THREE.TorusGeometry(0.155, 0.016, 14, SEG),
        m,
        0.98,
        [1, 0.75, 1],
        [Math.PI / 2, 0, 0]
      );

      // Flared Imperial Campanulate Capital & Crown Dome
      add(
        g,
        lathe([
          [0.14, 1.0],
          [0.18, 1.06],
          [0.225, 1.14],
          [0.232, 1.18],
          [0.19, 1.22],
          [0.11, 1.25],
          [0.0, 1.26],
        ]),
        m,
        0
      );

      // Imperial Gallery Ring
      add(
        g,
        new THREE.TorusGeometry(0.225, 0.018, 14, SEG),
        accent,
        1.17,
        [1, 0.75, 1],
        [Math.PI / 2, 0, 0]
      );

      // Turned Finial Pedestal
      add(
        g,
        new THREE.CylinderGeometry(0.065, 0.08, 0.04, SEG),
        accent,
        1.28
      );
      add(g, new THREE.SphereGeometry(0.045, 16, 12), accent, 1.315);

      // Noble 3D Staunton Cross Pattée Finial
      // Vertical shaft
      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.056, 0.22, 0.056),
        accent
      );
      crossV.position.y = 1.42;
      crossV.castShadow = true;
      g.add(crossV);

      // Horizontal crossbar
      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.21, 0.056, 0.056),
        accent
      );
      crossH.position.y = 1.44;
      crossH.castShadow = true;
      g.add(crossH);

      // Flared Cross Pattée finial caps (widening at the tips)
      // Top cap
      const topCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.084, 0.03, 0.068),
        accent
      );
      topCap.position.y = 1.525;
      topCap.castShadow = true;
      g.add(topCap);

      // Left cap
      const leftCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.084, 0.068),
        accent
      );
      leftCap.position.set(-0.11, 1.44, 0);
      leftCap.castShadow = true;
      g.add(leftCap);

      // Right cap
      const rightCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.084, 0.068),
        accent
      );
      rightCap.position.set(0.11, 1.44, 0);
      rightCap.castShadow = true;
      g.add(rightCap);

      // Center cabochon jewel at the cross intersection
      const centerJewel = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 12, 10),
        m
      );
      centerJewel.position.set(0, 1.44, 0);
      centerJewel.castShadow = true;
      g.add(centerJewel);
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
