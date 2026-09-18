import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Chess } from "chess.js";
import {
  createPieceMesh,
  squareToWorld,
  type PieceColor,
  type PieceRole,
} from "../utils/otbPieceMeshes";
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

const LIGHT = 0xeeeed2;
const DARK = 0x769656;
const HI_FROM = 0xf7c948;
const HI_TO = 0xe8b83a;
const ARROW = 0xf7c948;
const HINT = 0x9bc96a;
const PIECE_Y = 0.02;

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
};

function buildBoard(root: THREE.Group, squareMeshes: THREE.Mesh[]) {
  // Thin edge frame only (no solid slab — a thick near face reads as "clipped").
  const wood = new THREE.MeshStandardMaterial({
    color: 0x5c4030,
    roughness: 0.7,
    metalness: 0.05,
  });
  const frameH = 0.08;
  const frameT = 0.22;
  const outer = 8.44;
  const strip = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, frameH, d), wood);
    m.position.set(x, -frameH / 2, z);
    m.receiveShadow = true;
    root.add(m);
  };
  strip(outer, frameT, 0, 4.11); // near (rank 1)
  strip(outer, frameT, 0, -4.11); // far
  strip(frameT, outer - frameT * 2, -4.11, 0); // a-file
  strip(frameT, outer - frameT * 2, 4.11, 0); // h-file

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const isLight = (file + rank) % 2 === 1;
      // Lambert receives piece shadows without specular washout.
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.06, 0.98),
        new THREE.MeshLambertMaterial({
          color: isLight ? LIGHT : DARK,
        })
      );
      mesh.position.set(file - 3.5, 0, 3.5 - rank);
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
    const mat = mesh.material as THREE.MeshLambertMaterial;
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
          m.envMapIntensity = 0.28;
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
  mesh.scale.setScalar(1.02);
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
  pieceEnv: THREE.Texture | null
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
        cell.color as PieceColor
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
    syncPieces(bundle.piecesRoot, targetFen, bundle.pieceEnv);
    return;
  }

  // Ensure actors match the board we're animating from.
  syncPieces(bundle.piecesRoot, prevFen, bundle.pieceEnv);
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
    syncPieces(bundle.piecesRoot, targetFen, bundle.pieceEnv);
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
  syncPieces(bundle.piecesRoot, fen, bundle.pieceEnv);
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

function setCameraForOrientation(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  boardOrientation: "white" | "black",
  contentRoot: THREE.Group
) {
  // Sitting OTB seat — fix the viewing angle, then dolly distance to fit.
  // (Scaling the board down made the same camera read as top-down.)
  const nearSign = boardOrientation === "white" ? 1 : -1;
  const farSign = -nearSign;
  const target = new THREE.Vector3(0, 0.45, nearSign * 0.35);
  camera.fov = 42;
  camera.aspect = 1;
  camera.updateProjectionMatrix();

  // ~52° from vertical ≈ eye-level across a table
  const polar = 0.92;
  const azimuth = nearSign > 0 ? 0 : Math.PI;

  const placeCamera = (radius: number) => {
    const sinP = Math.sin(polar);
    const cosP = Math.cos(polar);
    camera.position.set(
      target.x + radius * sinP * Math.sin(azimuth),
      target.y + radius * cosP,
      target.z + radius * sinP * Math.cos(azimuth)
    );
    controls.target.copy(target);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
  };

  contentRoot.position.set(0, 0, 0);
  contentRoot.scale.setScalar(1);

  const edge = 4.26;
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

  const measure = (radius: number) => {
    placeCamera(radius);
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

  const ndcTarget = 0.93;
  let lo = 8;
  let hi = 22;
  let bestR = 14;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (measure(mid) > ndcTarget) {
      lo = mid; // too close — pull back
    } else {
      bestR = mid;
      hi = mid;
    }
  }
  placeCamera(bestR);

  const euclidean = camera.position.distanceTo(target);
  controls.minDistance = euclidean * 0.8;
  controls.maxDistance = euclidean * 1.6;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.update();
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
    // No ACES remap — it washed the classic green/cream board toward pastel.
    host.appendChild(renderer.domElement);

    // Env map for pieces only — never assign scene.environment (washes board greens).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const pieceEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    // Soft lighting — whites blow out if key/ambient are too hot.
    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const key = new THREE.DirectionalLight(0xfff2dc, 0.85);
    key.position.set(4, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.0008;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.4);
    fill.position.set(-6, 6, -4);
    scene.add(fill);
    // Side skim for form on near pieces — keep dim
    const rim = new THREE.DirectionalLight(0xffe8d0, 0.22);
    rim.position.set(0, 3.5, 12);
    scene.add(rim);

    const contentRoot = new THREE.Group();
    contentRoot.scale.setScalar(1);
    const boardRoot = new THREE.Group();
    const piecesRoot = new THREE.Group();
    const arrowRoot = new THREE.Group();
    const squareMeshes: THREE.Mesh[] = [];
    buildBoard(boardRoot, squareMeshes);
    contentRoot.add(boardRoot);
    contentRoot.add(piecesRoot);
    contentRoot.add(arrowRoot);
    scene.add(contentRoot);

    setCameraForOrientation(camera, controls, boardOrientation, contentRoot);

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
    };
    bundleRef.current = bundle;

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
      controls.update();
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
    setCameraForOrientation(
      bundle.camera,
      bundle.controls,
      boardOrientation,
      bundle.contentRoot
    );
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
      syncPieces(bundle.piecesRoot, position, bundle.pieceEnv);
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
