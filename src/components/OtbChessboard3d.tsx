import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Chess } from "chess.js";
import {
  createPieceMesh,
  squareToWorld,
  type PieceColor,
  type PieceRole,
} from "../utils/otbPieceMeshes";
import type { MoveClassification } from "../types";
import { CLASSIFICATION_META } from "../utils/classificationMeta";

const LIGHT = 0xeeeed2;
const DARK = 0x769656;
const HI_FROM = 0xf7c948;
const HI_TO = 0xe8b83a;
const ARROW = 0xf7c948;
const HINT = 0x9bc96a;

export interface OtbChessboard3dProps {
  position: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  dimmed?: boolean;
  lastMoveHighlight: { from: string; to: string } | null;
  moveClassification?: MoveClassification;
  continuationArrow: { from: string; to: string } | null;
  showBestMoveArrow: boolean;
  bestMove?: string;
}

type SceneBundle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  piecesRoot: THREE.Group;
  arrowRoot: THREE.Group;
  squareMeshes: THREE.Mesh[];
  raf: number;
  disposed: boolean;
};

function buildBoard(root: THREE.Group, squareMeshes: THREE.Mesh[]) {
  // Large table plane so the canvas fills edge-to-edge (no void letterbox).
  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshStandardMaterial({
      color: 0x2a241c,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.2;
  table.receiveShadow = true;
  root.add(table);

  const felt = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 48),
    new THREE.MeshStandardMaterial({
      color: 0x1e3a24,
      roughness: 0.95,
      metalness: 0,
    })
  );
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = -0.16;
  felt.receiveShadow = true;
  root.add(felt);

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 0.18, 8.5),
    new THREE.MeshStandardMaterial({
      color: 0x5c4030,
      roughness: 0.7,
      metalness: 0.05,
    })
  );
  rim.position.y = -0.1;
  rim.receiveShadow = true;
  root.add(rim);

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const isLight = (file + rank) % 2 === 1;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.06, 0.98),
        new THREE.MeshStandardMaterial({
          color: isLight ? LIGHT : DARK,
          roughness: 0.85,
          metalness: 0.02,
        })
      );
      mesh.position.set(file - 3.5, 0, 3.5 - rank);
      mesh.receiveShadow = true;
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

function makeArrowMesh(
  from: string,
  to: string,
  color: number
): THREE.Group | null {
  const a = squareToWorld(from);
  const b = squareToWorld(to);
  if (!a || !b) return null;

  const group = new THREE.Group();
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.2) return null;

  const ux = dx / len;
  const uz = dz / len;
  const shaftLen = Math.max(0.2, len - 0.55);
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.04, shaftLen),
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.88,
      roughness: 0.5,
      depthWrite: false,
    })
  );
  shaft.position.set(
    a.x + ux * (shaftLen / 2 + 0.2),
    0.08,
    a.z + uz * (shaftLen / 2 + 0.2)
  );
  shaft.rotation.y = Math.atan2(ux, uz);
  group.add(shaft);

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.42, 10),
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      roughness: 0.5,
      depthWrite: false,
    })
  );
  head.position.set(b.x - ux * 0.28, 0.1, b.z - uz * 0.28);
  head.rotation.x = Math.PI / 2;
  head.rotation.z = Math.atan2(ux, uz);
  group.add(head);
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
      mat.emissive.setHex(0x665010);
      mat.emissiveIntensity = 0.35;
    } else if (lastMove && square === lastMove.to) {
      mat.color.setHex(HI_TO);
      mat.emissive.setHex(0x554008);
      mat.emissiveIntensity = 0.28;
    } else {
      mat.color.setHex(base);
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }
}

function syncPieces(piecesRoot: THREE.Group, fen: string) {
  clearGroup(piecesRoot);
  let chess: Chess;
  try {
    chess = new Chess(fen);
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
      const world = squareToWorld(square);
      if (!world) continue;
      const mesh = createPieceMesh(
        cell.type as PieceRole,
        cell.color as PieceColor
      );
      mesh.position.set(world.x, 0.02, world.z);
      mesh.scale.setScalar(0.95);
      if (cell.type === "n") {
        mesh.rotation.y = cell.color === "w" ? 0 : Math.PI;
      }
      piecesRoot.add(mesh);
    }
  }
}

function setCameraForOrientation(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  boardOrientation: "white" | "black"
) {
  // OTB seat angle, then pull distance until the board rim + piece tops
  // fit the square canvas with a small margin (no clip, minimal letterbox).
  const nearSign = boardOrientation === "white" ? 1 : -1;
  const elev = 0.78;
  const depth = 0.8;
  const target = new THREE.Vector3(0, 0.04, 0);
  const corners = [
    new THREE.Vector3(-4.3, 0, -4.3),
    new THREE.Vector3(4.3, 0, -4.3),
    new THREE.Vector3(-4.3, 0, 4.3),
    new THREE.Vector3(4.3, 0, 4.3),
    new THREE.Vector3(-4.3, 1.2, -4.3),
    new THREE.Vector3(4.3, 1.2, -4.3),
    new THREE.Vector3(-4.3, 1.2, 4.3),
    new THREE.Vector3(4.3, 1.2, 4.3),
  ];

  camera.fov = 38;
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  controls.target.copy(target);

  let lo = 5.5;
  let hi = 13;
  let best = 8.2;
  const ndc = new THREE.Vector3();
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    camera.position.set(0, mid * elev, nearSign * mid * depth);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);

    let maxAbs = 0;
    for (const corner of corners) {
      ndc.copy(corner).project(camera);
      maxAbs = Math.max(maxAbs, Math.abs(ndc.x), Math.abs(ndc.y));
    }
    // Target ~0.93 NDC so the board nearly fills the square.
    if (maxAbs > 0.93) {
      lo = mid;
    } else {
      best = mid;
      hi = mid;
    }
  }

  camera.position.set(0, best * elev, nearSign * best * depth);
  controls.minDistance = best * 0.78;
  controls.maxDistance = best * 1.4;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minPolarAngle = Math.PI * 0.2;
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
  dimmed = false,
  lastMoveHighlight,
  moveClassification,
  continuationArrow,
  showBestMoveArrow,
  bestMove,
}: OtbChessboard3dProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bundleRef = useRef<SceneBundle | null>(null);
  const badgeAnchorRef = useRef<HTMLDivElement>(null);
  const lastMoveRef = useRef(lastMoveHighlight);
  lastMoveRef.current = lastMoveHighlight;

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

  const classMeta =
    moveClassification && CLASSIFICATION_META[moveClassification]
      ? CLASSIFICATION_META[moveClassification]
      : null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    // Soft room tone — table plane fills the frame edge-to-edge.
    scene.background = new THREE.Color(0x1a1814);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xfff2dc, 1.15);
    key.position.set(4, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.35);
    fill.position.set(-6, 6, -4);
    scene.add(fill);

    const boardRoot = new THREE.Group();
    const piecesRoot = new THREE.Group();
    const arrowRoot = new THREE.Group();
    const squareMeshes: THREE.Mesh[] = [];
    buildBoard(boardRoot, squareMeshes);
    scene.add(boardRoot);
    scene.add(piecesRoot);
    scene.add(arrowRoot);

    setCameraForOrientation(camera, controls, boardOrientation);

    const bundle: SceneBundle = {
      renderer,
      scene,
      camera,
      controls,
      piecesRoot,
      arrowRoot,
      squareMeshes,
      raf: 0,
      disposed: false,
    };
    bundleRef.current = bundle;

    const tick = () => {
      if (bundle.disposed) return;
      bundle.raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);

      const badge = badgeAnchorRef.current;
      const to = lastMoveRef.current?.to;
      if (badge && to) {
        const world = squareToWorld(to);
        if (world) {
          const v = new THREE.Vector3(world.x, 1.15, world.z);
          v.project(camera);
          const w = host.clientWidth;
          const h = host.clientHeight;
          badge.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${
            (-v.y * 0.5 + 0.5) * h
          }px) translate(-50%, -120%)`;
          badge.style.opacity = v.z > 1 ? "0" : "1";
        }
      } else if (badge) {
        badge.style.opacity = "0";
      }
    };
    tick();

    return () => {
      bundle.disposed = true;
      cancelAnimationFrame(bundle.raf);
      controls.dispose();
      clearGroup(piecesRoot);
      clearGroup(arrowRoot);
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
    bundle.renderer.setSize(w, w, false);
    bundle.camera.aspect = 1;
    bundle.camera.updateProjectionMatrix();
    bundle.renderer.domElement.style.width = "100%";
    bundle.renderer.domElement.style.height = "100%";
  }, [boardWidth]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    setCameraForOrientation(bundle.camera, bundle.controls, boardOrientation);
  }, [boardOrientation]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    syncPieces(bundle.piecesRoot, position);
    applyHighlights(bundle.squareMeshes, lastMoveHighlight);
    clearGroup(bundle.arrowRoot);
    if (arrow) {
      const mesh = makeArrowMesh(arrow.from, arrow.to, arrow.color);
      if (mesh) bundle.arrowRoot.add(mesh);
    }
  }, [position, lastMoveHighlight, arrow]);

  return (
    <div
      className={`relative otb3d-viewport${dimmed ? " board-viewport--dimmed" : ""}`}
      style={{ width: boardWidth, maxWidth: "100%" }}
    >
      <div
        ref={hostRef}
        className="relative w-full aspect-square overflow-hidden rounded-sm otb3d-canvas-host"
        style={{ maxWidth: boardWidth }}
        aria-label="3D over-the-board chessboard"
      />
      {lastMoveHighlight && classMeta ? (
        <div
          ref={badgeAnchorRef}
          className="pointer-events-none absolute left-0 top-0 z-20 drop-shadow-md"
          style={{ opacity: 0 }}
          title={classMeta.label}
          aria-label={classMeta.label}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill={classMeta.color} />
            <circle
              cx="12"
              cy="12"
              r="10.25"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

export default OtbChessboard3d;
