import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Chess } from "chess.js";
import {
  createPieceMesh,
  frameMaterials,
  squareMaterials,
  squareToWorld,
  type PieceColor,
  type PieceRole,
} from "../utils/otbPieceMeshes";
import { loadOtbTextures, type OtbPbrMaps } from "../utils/otbTextures";
import {
  normalizeFen,
  samePosition,
} from "../utils/boardPosition";
import {
  easeInOutCubic,
  glideHop,
  otbGlideDurationMs,
  resolveOtbMoveAnim,
} from "../utils/otbMoveAnimation";
import type { MoveClassification } from "../types";
import { CLASSIFICATION_META } from "../utils/classificationMeta";
import { ClassificationBadgeSvg } from "./MoveClassificationBadge";
import { DirectionOrb, type CameraPreset } from "./DirectionOrb";

const LIGHT = 0xd4d8c6;
const DARK = 0x6a8a4e;
const HI_FROM = 0xf7c948;
const HI_TO = 0xe8b83a;
const ARROW = 0xf7c948;
const HINT = 0x9bc96a;
const PIECE_Y = 0.035;

export interface OtbChessboard3dProps {
  position: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  /** Same signal as 2D react-chessboard — >0 enables a one-ply glide. */
  animationDuration?: number;
  dimmed?: boolean;
  lastMoveHighlight: { from: string; to: string } | null;
  moveClassification?: MoveClassification;
  continuationArrow: { from: string; to: string } | null;
  showBestMoveArrow: boolean;
  bestMove?: string;
}

type PieceAnim = {
  mesh: THREE.Object3D;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t0: number;
  duration: number;
  hop: number;
  mode: "glide" | "sink";
};

type CameraAnim = {
  t0: number;
  dur: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
};

type SceneBundle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  contentRoot: THREE.Group;
  piecesRoot: THREE.Group;
  arrowRoot: THREE.Group;
  squareMeshes: THREE.Mesh[];
  pieceEnv: THREE.Texture;
  pbrMaps: OtbPbrMaps | null;
  /** Destination square for classification badge projection (null = hide). */
  badgeSquare: string | null;
  boardOrientation: "white" | "black";
  boardPx: number;
  badgePx: number;
  raf: number;
  disposed: boolean;
  anims: PieceAnim[];
  animToken: number;
  prevFen: string | null;
  pendingFen: string | null;
  cameraAnim: CameraAnim | null;
};

function buildBoard(
  root: THREE.Group,
  squareMeshes: THREE.Mesh[],
  maps: OtbPbrMaps | null
) {
  const { apron, lip } = frameMaterials(maps);
  const sq = squareMaterials();

  // Thin honey-maple apron only — no disc/tray under the set.
  const frameH = 0.08;
  const frameT = 0.22;
  const outer = 8.44;
  const lipW = 0.1;
  const strip = (
    w: number,
    d: number,
    x: number,
    z: number,
    y: number,
    mat: THREE.Material
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, frameH, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    root.add(m);
  };
  strip(outer, frameT, 0, 4.11, -frameH / 2, apron);
  strip(outer, frameT, 0, -4.11, -frameH / 2, apron);
  strip(frameT, outer - frameT * 2, -4.11, 0, -frameH / 2, apron);
  strip(frameT, outer - frameT * 2, 4.11, 0, -frameH / 2, apron);

  const inner = 8.04;
  strip(inner, lipW, 0, 4.0, 0.01, lip);
  strip(inner, lipW, 0, -4.0, 0.01, lip);
  strip(lipW, inner - lipW * 2, -4.0, 0, 0.01, lip);
  strip(lipW, inner - lipW * 2, 4.0, 0, 0.01, lip);

  const bed = new THREE.Mesh(
    new THREE.BoxGeometry(8.0, 0.03, 8.0),
    new THREE.MeshStandardMaterial({ color: 0x6e5640, roughness: 0.88 })
  );
  bed.position.y = -0.03;
  bed.receiveShadow = true;
  root.add(bed);

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const isLight = (file + rank) % 2 === 1;
      const mat = (isLight ? sq.light : sq.dark).clone();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.05, 0.98),
        mat
      );
      mesh.position.set(file - 3.5, 0.01, 3.5 - rank);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.userData.baseColor = isLight ? LIGHT : DARK;
      mesh.userData.file = file;
      mesh.userData.rank = rank;
      root.add(mesh);
      squareMeshes.push(mesh);
    }
  }
}

function clearGroup(group: THREE.Group) {
  while (group.children.length) {
    const child = group.children[0]!;
    group.remove(child);
    child.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}

function makeArrowMesh(
  from: string,
  to: string,
  color: number
): THREE.Group | null {
  const a = squareToWorld(from);
  const b = squareToWorld(to);
  if (!a || !b) return null;

  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.2) return null;

  const ux = dx / len;
  const uz = dz / len;
  const yaw = Math.atan2(ux, uz);

  const headLen = Math.min(0.42, len * 0.28);
  const headHalf = 0.26;
  const halfShaft = 0.07;
  const inset = 0.28;
  const tipPull = 0.42; // stop short of destination piece volume
  const usable = Math.max(0.2, len - inset - tipPull);
  const shaftLen = Math.max(0.04, usable - headLen);

  // One flat Shape — continuous silhouette, no cone/euler tip bugs.
  const shape = new THREE.Shape();
  shape.moveTo(-halfShaft, 0);
  shape.lineTo(-halfShaft, shaftLen);
  shape.lineTo(-headHalf, shaftLen);
  shape.lineTo(0, shaftLen + headLen);
  shape.lineTo(headHalf, shaftLen);
  shape.lineTo(halfShaft, shaftLen);
  shape.lineTo(halfShaft, 0);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(Math.PI / 2); // XY → XZ, +Y → +Z

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;

  const group = new THREE.Group();
  group.position.set(a.x + ux * inset, 0.22, a.z + uz * inset);
  group.rotation.y = yaw;
  group.add(mesh);
  return group;
}

function applyHighlights(
  squareMeshes: THREE.Mesh[],
  lastMove: { from: string; to: string } | null
) {
  for (const mesh of squareMeshes) {
    const file = mesh.userData.file as number;
    const rank = mesh.userData.rank as number;
    const square = `${String.fromCharCode(97 + file)}${rank + 1}`;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const base = mesh.userData.baseColor as number;
    if (lastMove && square === lastMove.from) {
      mat.color.setHex(HI_FROM);
    } else if (lastMove && square === lastMove.to) {
      mat.color.setHex(HI_TO);
    } else {
      mat.color.setHex(base);
    }
  }
}

function applyPieceEnv(mesh: THREE.Object3D, pieceEnv: THREE.Texture | null) {
  if (!pieceEnv) return;
  mesh.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (
          m instanceof THREE.MeshStandardMaterial ||
          m instanceof THREE.MeshPhysicalMaterial
        ) {
          m.envMap = pieceEnv;
          m.envMapIntensity =
            m instanceof THREE.MeshPhysicalMaterial ? 0.55 : 0.4;
          m.needsUpdate = true;
        }
      }
    }
  });
}

function placePieceMesh(
  mesh: THREE.Object3D,
  square: string,
  role: PieceRole,
  color: PieceColor
) {
  const world = squareToWorld(square);
  if (!world) return;
  mesh.position.set(world.x, PIECE_Y, world.z);
  mesh.scale.setScalar(1.06);
  mesh.userData.square = square;
  mesh.userData.pieceRole = role;
  mesh.userData.pieceColor = color;
  if (role === "n") {
    // Snout is local +X; yaw so it faces the opponent (±Z).
    mesh.rotation.y = color === "w" ? Math.PI / 2 : -Math.PI / 2;
  } else {
    mesh.rotation.y = 0;
  }
}

function findPieceAt(
  piecesRoot: THREE.Group,
  square: string
): THREE.Object3D | null {
  for (const child of piecesRoot.children) {
    if (child.userData.square === square) return child;
  }
  return null;
}

function syncPieces(
  piecesRoot: THREE.Group,
  fen: string,
  pieceEnv: THREE.Texture | null,
  maps: OtbPbrMaps | null = null
) {
  clearGroup(piecesRoot);
  let chess: Chess;
  try {
    chess = new Chess(normalizeFen(fen));
  } catch {
    try {
      chess = new Chess(fen.split(" ")[0]);
    } catch {
      return;
    }
  }

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r]?.[f];
      if (!cell) continue;
      const square = `${String.fromCharCode(97 + f)}${8 - r}`;
      const mesh = createPieceMesh(
        cell.type as PieceRole,
        cell.color as PieceColor,
        maps
      );
      placePieceMesh(
        mesh,
        square,
        cell.type as PieceRole,
        cell.color as PieceColor
      );
      applyPieceEnv(mesh, pieceEnv);
      piecesRoot.add(mesh);
    }
  }
}

function cancelAnims(bundle: SceneBundle) {
  bundle.animToken += 1;
  bundle.anims.length = 0;
  bundle.pendingFen = null;
}

function worldAt(square: string): THREE.Vector3 | null {
  const w = squareToWorld(square);
  if (!w) return null;
  return new THREE.Vector3(w.x, PIECE_Y, w.z);
}

function startGlide(
  bundle: SceneBundle,
  mesh: THREE.Object3D,
  fromSq: string,
  toSq: string,
  duration: number,
  hop: number,
  now: number
) {
  const from = worldAt(fromSq);
  const to = worldAt(toSq);
  if (!from || !to) return;
  mesh.position.copy(from);
  mesh.userData.square = toSq;
  // Lift render order so the gliding piece clears stationary ones.
  mesh.renderOrder = 3;
  mesh.traverse((o) => {
    if (o instanceof THREE.Mesh) o.renderOrder = 3;
  });
  bundle.anims.push({
    mesh,
    from,
    to,
    t0: now,
    duration,
    hop,
    mode: "glide",
  });
}

function startSink(
  bundle: SceneBundle,
  mesh: THREE.Object3D,
  duration: number,
  now: number
) {
  const from = mesh.position.clone();
  const to = from.clone();
  to.y = -0.55;
  mesh.renderOrder = 1;
  bundle.anims.push({
    mesh,
    from,
    to,
    t0: now,
    duration: duration * 0.85,
    hop: 0,
    mode: "sink",
  });
}

function beginMoveAnimation(
  bundle: SceneBundle,
  prevFen: string,
  targetFen: string,
  highlight: { from: string; to: string } | null,
  durationMs: number
) {
  const resolved = resolveOtbMoveAnim(prevFen, targetFen, highlight);
  if (!resolved) {
    cancelAnims(bundle);
    syncPieces(bundle.piecesRoot, targetFen, bundle.pieceEnv, bundle.pbrMaps);
    return;
  }

  // Ensure actors match the board we're animating from.
  syncPieces(bundle.piecesRoot, prevFen, bundle.pieceEnv, bundle.pbrMaps);
  cancelAnims(bundle);
  const token = bundle.animToken;
  const now = performance.now();
  const { move, direction, captureSquare, rook } = resolved;

  if (direction === "forward") {
    if (captureSquare) {
      const victim = findPieceAt(bundle.piecesRoot, captureSquare);
      if (victim) startSink(bundle, victim, durationMs, now);
    }
    const mover = findPieceAt(bundle.piecesRoot, move.from);
    if (mover) {
      startGlide(
        bundle,
        mover,
        move.from,
        move.to,
        durationMs,
        glideHop(move.piece),
        now
      );
    }
    if (rook) {
      const rookMesh = findPieceAt(bundle.piecesRoot, rook.from);
      if (rookMesh) {
        startGlide(
          bundle,
          rookMesh,
          rook.from,
          rook.to,
          durationMs,
          glideHop("r"),
          now
        );
      }
    }
  } else {
    // Undo: piece retreats to `from`; castling rook reverses; capture restored at end.
    const mover = findPieceAt(bundle.piecesRoot, move.to);
    if (mover) {
      startGlide(
        bundle,
        mover,
        move.to,
        move.from,
        durationMs,
        glideHop(move.piece),
        now
      );
    }
    if (rook) {
      const rookMesh = findPieceAt(bundle.piecesRoot, rook.to);
      if (rookMesh) {
        startGlide(
          bundle,
          rookMesh,
          rook.to,
          rook.from,
          durationMs,
          glideHop("r"),
          now
        );
      }
    }
  }

  bundle.pendingFen = targetFen;

  // If somehow no anims started, snap.
  if (bundle.anims.length === 0) {
    syncPieces(bundle.piecesRoot, targetFen, bundle.pieceEnv, bundle.pbrMaps);
    bundle.pendingFen = null;
    return;
  }

  // Safety: if anims stall, still land on the target FEN.
  window.setTimeout(() => {
    if (bundle.disposed || bundle.animToken !== token) return;
    if (bundle.pendingFen === targetFen) {
      finishAnims(bundle, targetFen);
    }
  }, durationMs + 120);
}

function finishAnims(bundle: SceneBundle, fen: string) {
  bundle.anims.length = 0;
  bundle.pendingFen = null;
  syncPieces(bundle.piecesRoot, fen, bundle.pieceEnv, bundle.pbrMaps);
}

function tickAnims(bundle: SceneBundle, now: number) {
  if (bundle.anims.length === 0) return;

  const still: PieceAnim[] = [];

  for (const anim of bundle.anims) {
    const u = (now - anim.t0) / anim.duration;
    const t = easeInOutCubic(u);
    if (anim.mode === "glide") {
      const x = anim.from.x + (anim.to.x - anim.from.x) * t;
      const z = anim.from.z + (anim.to.z - anim.from.z) * t;
      const y =
        anim.from.y +
        (anim.to.y - anim.from.y) * t +
        anim.hop * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      anim.mesh.position.set(x, y, z);
      // Tiny roll sway while airborne — reads as "alive" without spinning.
      if (anim.hop > 0.3) {
        anim.mesh.rotation.z = Math.sin(Math.PI * t) * 0.06;
      }
    } else {
      const x = anim.from.x + (anim.to.x - anim.from.x) * t;
      const y = anim.from.y + (anim.to.y - anim.from.y) * t;
      const z = anim.from.z + (anim.to.z - anim.from.z) * t;
      anim.mesh.position.set(x, y, z);
      const s = 1.02 * (1 - 0.7 * t);
      anim.mesh.scale.setScalar(Math.max(0.05, s));
    }

    if (u >= 1) {
      if (anim.mode === "glide") {
        anim.mesh.position.copy(anim.to);
        anim.mesh.rotation.z = 0;
        anim.mesh.renderOrder = 0;
        anim.mesh.traverse((o) => {
          if (o instanceof THREE.Mesh) o.renderOrder = 0;
        });
      } else {
        anim.mesh.parent?.remove(anim.mesh);
        disposeObject(anim.mesh);
      }
    } else {
      still.push(anim);
    }
  }

  bundle.anims = still;

  if (still.length === 0 && bundle.pendingFen) {
    finishAnims(bundle, bundle.pendingFen);
  }
}

export type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  radius: number;
  polar: number;
  azimuth: number;
};

export function computeCameraPose(
  camera: THREE.PerspectiveCamera,
  preset: CameraPreset,
  boardOrientation: "white" | "black",
  isMobile: boolean
): CameraPose {
  const nearSign = boardOrientation === "white" ? 1 : -1;
  const farSign = -nearSign;

  camera.fov = 42;
  camera.aspect = 1;
  camera.updateProjectionMatrix();

  let polar = 0.92;
  let azimuth = nearSign > 0 ? 0 : Math.PI;
  let target = new THREE.Vector3(0, 0.45, nearSign * 0.35);
  let ndcTarget = 0.93;

  if (preset === "review") {
    // Steeper polar angle so board squares fill screen with ~35% larger size on mobile
    polar = isMobile ? 0.58 : 0.68;
    ndcTarget = isMobile ? 0.98 : 0.95;
    target = new THREE.Vector3(0, 0.25, nearSign * 0.15);
    azimuth = nearSign > 0 ? 0 : Math.PI;
  } else if (preset === "seat") {
    polar = 0.92;
    azimuth = 0;
    target = new THREE.Vector3(0, 0.45, 0.35);
    ndcTarget = 0.93;
  } else if (preset === "flip") {
    polar = 0.92;
    azimuth = Math.PI;
    target = new THREE.Vector3(0, 0.45, -0.35);
    ndcTarget = 0.93;
  } else if (preset === "side") {
    polar = 0.78;
    azimuth = Math.PI * 0.35;
    target = new THREE.Vector3(0, 0.35, 0);
    ndcTarget = 0.94;
  }

  const sinP = Math.sin(polar);
  const cosP = Math.cos(polar);

  const edge = 4.4;
  const frameCorners = [
    new THREE.Vector3(-edge, -0.06, -edge),
    new THREE.Vector3(edge, -0.06, -edge),
    new THREE.Vector3(-edge, -0.06, edge),
    new THREE.Vector3(edge, -0.06, edge),
  ];
  const pieceCorners = [
    new THREE.Vector3(-edge, 1.4, farSign * edge),
    new THREE.Vector3(edge, 1.4, farSign * edge),
    new THREE.Vector3(-edge * 0.35, 1.45, nearSign * edge * 0.6),
    new THREE.Vector3(edge * 0.35, 1.45, nearSign * edge * 0.6),
    new THREE.Vector3(0, 1.5, nearSign * edge),
  ];

  const testPos = new THREE.Vector3();
  const measure = (radius: number) => {
    testPos.set(
      target.x + radius * sinP * Math.sin(azimuth),
      target.y + radius * cosP,
      target.z + radius * sinP * Math.cos(azimuth)
    );
    camera.position.copy(testPos);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);

    let maxAbs = 0;
    const world = new THREE.Vector3();
    const ndc = new THREE.Vector3();
    for (const c of [...frameCorners, ...pieceCorners]) {
      world.copy(c);
      ndc.copy(world).project(camera);
      maxAbs = Math.max(maxAbs, Math.abs(ndc.x), Math.abs(ndc.y));
    }
    return maxAbs;
  };

  let lo = 6;
  let hi = 24;
  let bestR = 14;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (measure(mid) > ndcTarget) {
      lo = mid;
    } else {
      bestR = mid;
      hi = mid;
    }
  }

  const finalPos = new THREE.Vector3(
    target.x + bestR * sinP * Math.sin(azimuth),
    target.y + bestR * cosP,
    target.z + bestR * sinP * Math.cos(azimuth)
  );

  return {
    position: finalPos,
    target,
    radius: bestR,
    polar,
    azimuth,
  };
}

function applyCameraPose(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  pose: CameraPose
) {
  camera.position.copy(pose.position);
  controls.target.copy(pose.target);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld(true);

  const euclidean = pose.radius;
  controls.minDistance = euclidean * 0.75;
  controls.maxDistance = euclidean * 1.6;
  controls.minPolarAngle = 0.32;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.update();
}

function transitionCameraToPose(
  bundle: SceneBundle,
  targetPose: CameraPose,
  durationMs = 420
) {
  bundle.cameraAnim = {
    t0: performance.now(),
    dur: durationMs,
    fromPos: bundle.camera.position.clone(),
    toPos: targetPose.position.clone(),
    fromTarget: bundle.controls.target.clone(),
    toTarget: targetPose.target.clone(),
  };
  const euclidean = targetPose.radius;
  bundle.controls.minDistance = euclidean * 0.75;
  bundle.controls.maxDistance = euclidean * 1.6;
}

/**
 * WebGL over-the-board board with standing procedural pieces.
 * Lazy-loaded from ReviewChessboard when view === otb3d.
 */
export function OtbChessboard3d({
  position,
  boardWidth,
  boardOrientation,
  animationDuration = 0,
  dimmed = false,
  lastMoveHighlight,
  moveClassification,
  continuationArrow,
  showBestMoveArrow,
  bestMove,
}: OtbChessboard3dProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const bundleRef = useRef<SceneBundle | null>(null);
  const animDurationRef = useRef(animationDuration);
  animDurationRef.current = animationDuration;
  const lastMoveHighlightRef = useRef(lastMoveHighlight);
  lastMoveHighlightRef.current = lastMoveHighlight;

  const [activePreset, setActivePreset] = useState<CameraPreset | "custom">("review");
  const activePresetRef = useRef(activePreset);
  activePresetRef.current = activePreset;

  const [azimuth, setAzimuth] = useState<number>(() =>
    boardOrientation === "white" ? 0 : Math.PI
  );

  const PRESET_CYCLE: CameraPreset[] = ["review", "seat", "flip", "side"];

  const handleCyclePreset = useCallback(() => {
    const currentIndex =
      activePresetRef.current === "custom"
        ? -1
        : PRESET_CYCLE.indexOf(activePresetRef.current);
    const nextPreset = PRESET_CYCLE[(currentIndex + 1) % PRESET_CYCLE.length];
    setActivePreset(nextPreset);

    const bundle = bundleRef.current;
    if (!bundle) return;
    const isMobile = bundle.boardPx < 500;
    const pose = computeCameraPose(
      bundle.camera,
      nextPreset,
      bundle.boardOrientation,
      isMobile
    );
    transitionCameraToPose(bundle, pose, 420);
    setAzimuth(pose.azimuth);
  }, []);

  const handleOrbitDelta = useCallback((dx: number, dy: number) => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    bundle.cameraAnim = null;

    const { camera, controls } = bundle;
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    spherical.theta -= (dx / 120) * Math.PI;
    spherical.phi += (dy / 120) * Math.PI * 0.5;
    spherical.phi = Math.max(
      controls.minPolarAngle,
      Math.min(controls.maxPolarAngle, spherical.phi)
    );
    spherical.makeSafe();

    offset.setFromSpherical(spherical);
    camera.position.addVectors(controls.target, offset);
    camera.lookAt(controls.target);
    controls.update();

    setActivePreset("custom");
    setAzimuth(spherical.theta);
  }, []);

  const classMeta =
    moveClassification && CLASSIFICATION_META[moveClassification]
      ? CLASSIFICATION_META[moveClassification]
      : null;
  const badgeSquare =
    moveClassification && lastMoveHighlight?.to
      ? lastMoveHighlight.to
      : null;
  // Compact pip beside the piece — large enough to read, small enough to clear.
  const badgeSize = Math.max(14, Math.min(18, Math.round(boardWidth * 0.022)));

  const arrow = useMemo(() => {
    if (continuationArrow) {
      return { ...continuationArrow, color: HINT };
    }
    if (showBestMoveArrow && bestMove && bestMove.length >= 4) {
      return {
        from: bestMove.slice(0, 2),
        to: bestMove.slice(2, 4),
        color: HINT,
      };
    }
    if (lastMoveHighlight) {
      return { ...lastMoveHighlight, color: ARROW };
    }
    return null;
  }, [continuationArrow, showBestMoveArrow, bestMove, lastMoveHighlight]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      // Needed so screenshots / compositors can read the last frame.
      preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Linear output keeps tournament greens / wood tones honest (ACES washed them).
    host.appendChild(renderer.domElement);

    // Env map for pieces only — never assign scene.environment (washes board greens).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const pieceEnv = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (isTouch || boardWidth < 500) {
      // Direct single-touch canvas rotation is disabled on mobile so page scrolling
      // is never trapped, while Orbiting is handled seamlessly by the Direction Orb.
      (controls.touches as any).ONE = null;
      controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      renderer.domElement.style.touchAction = "pan-y";
    }

    controls.addEventListener("start", () => {
      const b = bundleRef.current;
      if (b) b.cameraAnim = null;
      setActivePreset("custom");
    });
    controls.addEventListener("change", () => {
      const b = bundleRef.current;
      if (!b || b.disposed || b.cameraAnim) return;
      const dx = camera.position.x - controls.target.x;
      const dz = camera.position.z - controls.target.z;
      const az = Math.atan2(dx, dz);
      setAzimuth(az);
    });

    // High-end tournament studio lighting: warm key, soft ambient fill, and dual rim contour lights
    scene.add(new THREE.AmbientLight(0xffefe4, 0.34));
    scene.add(new THREE.HemisphereLight(0xfff5ea, 0x221d18, 0.28));
    const key = new THREE.DirectionalLight(0xffeade, 0.72);
    key.position.set(6, 15, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -11;
    key.shadow.camera.right = 11;
    key.shadow.camera.top = 11;
    key.shadow.camera.bottom = -11;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcad4dc, 0.32);
    fill.position.set(-8, 8, -6);
    scene.add(fill);
    // Dual rim lights ensure pieces on both white and black sides have crisp edge separation
    const frontRim = new THREE.DirectionalLight(0xf4e6d4, 0.28);
    frontRim.position.set(0, 5, 13);
    scene.add(frontRim);
    const backRim = new THREE.DirectionalLight(0xdce6f4, 0.22);
    backRim.position.set(0, 6, -13);
    scene.add(backRim);

    const contentRoot = new THREE.Group();
    contentRoot.scale.setScalar(1);
    const boardRoot = new THREE.Group();
    const piecesRoot = new THREE.Group();
    const arrowRoot = new THREE.Group();
    const squareMeshes: THREE.Mesh[] = [];
    // Build immediately with procedural fallbacks; swap in PBR maps when ready.
    buildBoard(boardRoot, squareMeshes, null);
    contentRoot.add(boardRoot);
    contentRoot.add(piecesRoot);
    contentRoot.add(arrowRoot);
    scene.add(contentRoot);

    const isMobile = boardWidth < 500;
    const initialPose = computeCameraPose(
      camera,
      "review",
      boardOrientation,
      isMobile
    );
    applyCameraPose(camera, controls, initialPose);

    const projectScratch = new THREE.Vector3();
    const bundle: SceneBundle = {
      renderer,
      scene,
      camera,
      controls,
      contentRoot,
      piecesRoot,
      arrowRoot,
      squareMeshes,
      pieceEnv,
      pbrMaps: null,
      badgeSquare: null,
      boardOrientation,
      boardPx: boardWidth,
      badgePx: Math.max(14, Math.min(18, Math.round(boardWidth * 0.022))),
      raf: 0,
      disposed: false,
      anims: [],
      animToken: 0,
      prevFen: null,
      pendingFen: null,
      cameraAnim: null,
    };
    bundleRef.current = bundle;

    void loadOtbTextures()
      .then((maps) => {
        if (bundle.disposed) return;
        bundle.pbrMaps = maps;
        // Rebuild frame with photo-real light oak maps (still no under-tray).
        clearGroup(boardRoot);
        squareMeshes.length = 0;
        buildBoard(boardRoot, squareMeshes, maps);
        const fen = bundle.prevFen;
        if (fen) {
          cancelAnims(bundle);
          syncPieces(piecesRoot, fen, pieceEnv, maps);
        }
        applyHighlights(squareMeshes, lastMoveHighlightRef.current);
      })
      .catch(() => {
        // Keep procedural materials if textures fail to load.
      });

    const syncBadge = () => {
      const el = badgeRef.current;
      if (!el) return;
      const sq = bundle.badgeSquare;
      if (!sq) {
        el.style.visibility = "hidden";
        return;
      }
      const world = squareToWorld(sq);
      if (!world) {
        el.style.visibility = "hidden";
        return;
      }
      // h-file floor edge of the destination square — beside the base, not in
      // front of (covers) or above (covers crown) the piece.
      projectScratch.set(world.x + 0.64, 0.14, world.z);
      projectScratch.applyMatrix4(bundle.contentRoot.matrixWorld);
      projectScratch.project(bundle.camera);
      if (
        projectScratch.z < -1 ||
        projectScratch.z > 1 ||
        Math.abs(projectScratch.x) > 1.2 ||
        Math.abs(projectScratch.y) > 1.2
      ) {
        el.style.visibility = "hidden";
        return;
      }
      const px = bundle.boardPx;
      const size = bundle.badgePx;
      const x = (projectScratch.x * 0.5 + 0.5) * px;
      const y = (-projectScratch.y * 0.5 + 0.5) * px;
      el.style.visibility = "visible";
      el.style.transform = `translate(${x - size * 0.25}px, ${y - size * 0.75}px)`;
    };

    const tick = () => {
      if (bundle.disposed) return;
      bundle.raf = requestAnimationFrame(tick);
      tickAnims(bundle, performance.now());
      if (bundle.cameraAnim) {
        const u =
          (performance.now() - bundle.cameraAnim.t0) / bundle.cameraAnim.dur;
        const t = easeInOutCubic(Math.min(1, Math.max(0, u)));
        bundle.camera.position.lerpVectors(
          bundle.cameraAnim.fromPos,
          bundle.cameraAnim.toPos,
          t
        );
        bundle.controls.target.lerpVectors(
          bundle.cameraAnim.fromTarget,
          bundle.cameraAnim.toTarget,
          t
        );
        bundle.camera.lookAt(bundle.controls.target);
        bundle.controls.update();
        const dx = bundle.camera.position.x - bundle.controls.target.x;
        const dz = bundle.camera.position.z - bundle.controls.target.z;
        setAzimuth(Math.atan2(dx, dz));
        if (u >= 1) {
          bundle.cameraAnim = null;
        }
      } else {
        controls.update();
      }
      renderer.render(scene, camera);
      syncBadge();
    };
    tick();

    return () => {
      bundle.disposed = true;
      cancelAnimationFrame(bundle.raf);
      cancelAnims(bundle);
      controls.dispose();
      clearGroup(piecesRoot);
      clearGroup(arrowRoot);
      pieceEnv.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      bundleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    const w = Math.max(1, boardWidth);
    bundle.boardPx = w;
    bundle.badgePx = badgeSize;
    bundle.boardOrientation = boardOrientation;
    bundle.renderer.setSize(w, w, false);
    bundle.camera.aspect = 1;
    bundle.camera.updateProjectionMatrix();
    bundle.renderer.domElement.style.width = "100%";
    bundle.renderer.domElement.style.height = "100%";

    const isMobile = w < 500;
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (isTouch || isMobile) {
      (bundle.controls.touches as any).ONE = null;
      bundle.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      bundle.renderer.domElement.style.touchAction = "pan-y";
    } else {
      bundle.controls.touches.ONE = THREE.TOUCH.ROTATE;
      bundle.renderer.domElement.style.touchAction = "none";
    }

    const presetToApply =
      activePresetRef.current === "custom" ? "review" : activePresetRef.current;
    const pose = computeCameraPose(
      bundle.camera,
      presetToApply,
      boardOrientation,
      isMobile
    );
    applyCameraPose(bundle.camera, bundle.controls, pose);
    setAzimuth(pose.azimuth);
  }, [boardWidth, boardOrientation, badgeSize]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;

    const prev = bundle.prevFen;

    // Highlight-only updates (same board) must not cancel an in-flight glide.
    if (prev && samePosition(prev, position)) {
      applyHighlights(bundle.squareMeshes, lastMoveHighlight);
      bundle.prevFen = position;
      return;
    }

    const resolved = prev
      ? resolveOtbMoveAnim(prev, position, lastMoveHighlight)
      : null;
    const glideMs = otbGlideDurationMs(animDurationRef.current);

    if (resolved) {
      beginMoveAnimation(
        bundle,
        prev!,
        position,
        lastMoveHighlight,
        glideMs
      );
    } else {
      cancelAnims(bundle);
      syncPieces(bundle.piecesRoot, position, bundle.pieceEnv, bundle.pbrMaps);
    }
    bundle.prevFen = position;
    applyHighlights(bundle.squareMeshes, lastMoveHighlight);
  }, [position, lastMoveHighlight]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    clearGroup(bundle.arrowRoot);
    if (arrow) {
      const mesh = makeArrowMesh(arrow.from, arrow.to, arrow.color);
      if (mesh) bundle.arrowRoot.add(mesh);
    }
  }, [arrow]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    bundle.badgeSquare = badgeSquare;
  }, [badgeSquare]);

  return (
    <div
      className={`relative otb3d-viewport${dimmed ? " board-viewport--dimmed" : ""}`}
      style={{ width: boardWidth, maxWidth: "100%" }}
    >
      <div
        ref={hostRef}
        className="relative w-full aspect-square overflow-visible otb3d-canvas-host"
        style={{ maxWidth: boardWidth }}
        aria-label="3D over-the-board chessboard"
      />
      <DirectionOrb
        azimuth={azimuth}
        activePreset={activePreset}
        onCyclePreset={handleCyclePreset}
        onOrbitDelta={handleOrbitDelta}
      />
      {classMeta && moveClassification ? (
        <div
          ref={badgeRef}
          className="absolute left-0 top-0 pointer-events-none z-[45]"
          style={{
            width: badgeSize,
            height: badgeSize,
            visibility: "hidden",
            willChange: "transform",
            filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.65))",
          }}
          title={classMeta.label}
          aria-label={classMeta.label}
          data-classification={moveClassification}
        >
          <ClassificationBadgeSvg
            type={moveClassification}
            color={classMeta.color}
            size={badgeSize}
          />
        </div>
      ) : null}
    </div>
  );
}

export default OtbChessboard3d;
