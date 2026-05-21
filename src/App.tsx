import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ReviewChessboard } from "./components/ReviewChessboard";
import { MoveList } from "./components/MoveList";
import { ReviewSummaryPanel } from "./components/ReviewSummary";
import { EvalChart } from "./components/EvalChart";
import { GameList } from "./components/GameList";
import { analyzePgn } from "./utils/analyzer";
import type { AnalyzedMove, ReviewSummary, EvalResult, AnalysisState } from "./types";
import {
  setCloudOnlyMode,
  getEvalBackend,
  refreshNativeEngineProbe,
} from "./engine/evaluationService";
import { MoveReviewPanel } from "./components/MoveReviewPanel";
import { CoachPanel } from "./components/CoachPanel";
import { EvalBadge } from "./components/EvalBadge";
import { MobileAnalysisStatus } from "./components/MobileAnalysisStatus";
import { GameEndBanner } from "./components/GameEndBanner";
import { MobileBoardShell } from "./components/MobileBoardShell";
import { MobileGameHero } from "./components/MobileGameHero";
import { getGameEndInfo } from "./utils/gameEnd";
import { parseGameText } from "./utils/pgnParse";
import { countPgnPlies } from "./utils/pgnPlies";
import { hapticTap, playMoveFeedback, unlockChessAudio } from "./utils/chessSounds";

type SidebarTab = "games" | "review" | "moves";

interface GameMeta {
  white: string;
  black: string;
  whiteRating: number | null;
  blackRating: number | null;
  result: "1-0" | "0-1" | "1/2-1/2" | "*" | null;
  termination: string | null;
}

function extractGameMeta(pgn: string): GameMeta {
  const tag = (t: string) => pgn.match(new RegExp(`\\[${t} "([^"]+)"\\]`))?.[1] ?? null;
  const wr = tag("WhiteElo"); const br = tag("BlackElo");
  const res = tag("Result") as GameMeta["result"];
  return {
    white: tag("White") ?? "White",
    black: tag("Black") ?? "Black",
    whiteRating: wr ? parseInt(wr, 10) : null,
    blackRating: br ? parseInt(br, 10) : null,
    result: res ?? null,
    termination: tag("Termination"),
  };
}

function extractClocks(pgn: string): (number | null)[] {
  // Matches { [%clk h:mm:ss] } or { [%clk mm:ss] } annotations
  const re = /\{\s*\[%clk (\d+:)??(\d+):(\d+(?:\.\d+)?)\]\s*\}/g;
  const clocks: (number | null)[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pgn)) !== null) {
    const h = m[1] ? parseInt(m[1], 10) : 0;
    const min = parseInt(m[2], 10);
    const sec = parseFloat(m[3]);
    clocks.push(h * 3600 + min * 60 + sec);
  }
  return clocks;
}

function formatClock(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export default function App() {
  const [tab, setTab] = useState<SidebarTab>("games");
  const [pgn, setPgn] = useState("");
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);
  const [gamePlyCount, setGamePlyCount] = useState(0);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [currentFen, setCurrentFen] = useState("start");
  const [currentEval, setCurrentEval] = useState<EvalResult | null>(null);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [playerNames, setPlayerNames] = useState({ white: "White", black: "Black" });
  const [gameMeta, setGameMeta] = useState<GameMeta | null>(null);
  const [clocks, setClocks] = useState<(number | null)[]>([]);
  const abortRef = useRef(false);
  const hasRemoteEngine = !!import.meta.env.VITE_EVAL_SERVER_URL;
  const [engineBackend, setEngineBackend] = useState<"native" | "cloud" | "browser" | "unavailable">(
    hasRemoteEngine ? "unavailable" : "cloud"
  );

  const [depth, setDepth] = useState<number>(() => {
    const saved = localStorage.getItem("cr_depth");
    const fallback = hasRemoteEngine ? "16" : import.meta.env.PROD ? "12" : "16";
    return parseInt(saved ?? fallback, 10);
  });

  useEffect(() => {
    setCloudOnlyMode(!hasRemoteEngine && (import.meta.env.PROD || depth <= 12));
  }, [depth, hasRemoteEngine]);

  const openProfilePanel = useCallback(
    (platform: "chesscom" | "lichess" = "chesscom") => {
      hapticTap();
      setAddProfilePlatform(platform);
      setAddProfileError(null);
      setShowAddProfile(true);
    },
    []
  );

  const recheckEngine = useCallback(async () => {
    const ok = await refreshNativeEngineProbe();
    setEngineBackend(getEvalBackend());
    return ok;
  }, []);

  useEffect(() => {
    void recheckEngine().then((ok) => {
      if (!ok && hasRemoteEngine) {
        console.warn(
          "[ChessReview] Native engine unreachable — using Lichess (slow). Keep eval-server + tunnel running on Fedora."
        );
      }
    });
  }, [hasRemoteEngine, recheckEngine]);

  useEffect(() => {
    if (!hasRemoteEngine) return;
    const id = window.setInterval(() => {
      void recheckEngine();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [hasRemoteEngine, recheckEngine]);
  const [showBestMove, setShowBestMove] = useState(true);
  const [continuationActive, setContinuationActive] = useState(false);
  const [continuationFen, setContinuationFen] = useState<string | null>(null);
  const [continuationEval, setContinuationEval] = useState<EvalResult | null>(null);
  const [continuationArrow, setContinuationArrow] = useState<{ from: string; to: string } | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [moveAnim, setMoveAnim] = useState<{ from: string; to: string } | null>(null);
  const [boardDimmed, setBoardDimmed] = useState(false);
  const [boardPieceAnimMs, setBoardPieceAnimMs] = useState(220);
  const boardTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boardAnimGenRef = useRef(0);

  const BOARD_STEP_MS = 220;
  const BOARD_PLAY_MOVE_MS = 420;
  const BOARD_FADE_MS = 180;
  const BOARD_SETUP_MS = 300;

  const clearBoardTimers = useCallback(() => {
    boardTimersRef.current.forEach(clearTimeout);
    boardTimersRef.current = [];
  }, []);

  const scheduleBoard = useCallback(
    (fn: () => void, ms: number, gen: number) => {
      const id = setTimeout(() => {
        if (boardAnimGenRef.current === gen) fn();
      }, ms);
      boardTimersRef.current.push(id);
    },
    []
  );

  const playMoveOnBoard = useCallback(
    (
      fenBefore: string,
      fenAfter: string,
      fromSq: string,
      toSq: string,
      skipSetup: boolean
    ) => {
      const gen = ++boardAnimGenRef.current;
      clearBoardTimers();
      setMoveAnim({ from: fromSq, to: toSq });

      const playTheMove = () => {
        setBoardPieceAnimMs(BOARD_PLAY_MOVE_MS);
        setCurrentFen(fenAfter);
        scheduleBoard(() => {
          setMoveAnim(null);
          setBoardPieceAnimMs(BOARD_STEP_MS);
          setBoardDimmed(false);
        }, BOARD_PLAY_MOVE_MS + 40, gen);
      };

      if (skipSetup) {
        setBoardDimmed(false);
        setBoardPieceAnimMs(BOARD_STEP_MS);
        setCurrentFen(fenBefore);
        scheduleBoard(playTheMove, 24, gen);
        return;
      }

      // Far jump: fade out → glide pieces to pre-move position → fade in → play move
      setBoardDimmed(true);
      scheduleBoard(() => {
        setBoardPieceAnimMs(BOARD_SETUP_MS);
        setCurrentFen(fenBefore);
        scheduleBoard(() => {
          setBoardDimmed(false);
          scheduleBoard(playTheMove, BOARD_FADE_MS, gen);
        }, BOARD_SETUP_MS, gen);
      }, BOARD_FADE_MS, gen);
    },
    [
      BOARD_FADE_MS,
      BOARD_PLAY_MOVE_MS,
      BOARD_SETUP_MS,
      BOARD_STEP_MS,
      clearBoardTimers,
      scheduleBoard,
    ]
  );

  const fadeBoardToFen = useCallback(
    (fen: string) => {
      const gen = ++boardAnimGenRef.current;
      clearBoardTimers();
      setMoveAnim(null);
      setBoardDimmed(true);
      scheduleBoard(() => {
        setBoardPieceAnimMs(BOARD_SETUP_MS);
        setCurrentFen(fen);
        scheduleBoard(() => {
          setBoardDimmed(false);
          setBoardPieceAnimMs(BOARD_STEP_MS);
        }, BOARD_SETUP_MS + BOARD_FADE_MS, gen);
      }, BOARD_FADE_MS, gen);
    },
    [BOARD_FADE_MS, BOARD_SETUP_MS, BOARD_STEP_MS, clearBoardTimers, scheduleBoard]
  );
  // ── Multi-profile system (up to 5 profiles) ──
  interface ChessProfile {
    name: string;
    platform: "chesscom" | "lichess";
  }

  const PROFILES_KEY = "cr_profiles";
  const ACTIVE_PROFILE_KEY = "cr_active_profile_idx";

  const loadProfiles = (): ChessProfile[] => {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const [profiles, setProfiles] = useState<ChessProfile[]>(loadProfiles);
  const [activeProfileIdx, setActiveProfileIdx] = useState<number>(() => {
    const idx = parseInt(localStorage.getItem(ACTIVE_PROFILE_KEY) ?? "0", 10);
    return idx;
  });
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [addProfilePlatform, setAddProfilePlatform] = useState<"chesscom" | "lichess">("chesscom");
  const [addProfileName, setAddProfileName] = useState("");
  const [addProfileLoading, setAddProfileLoading] = useState(false);
  const [addProfileError, setAddProfileError] = useState<string | null>(null);

  const activeUser = profiles[activeProfileIdx] ?? null;

  const saveProfiles = (ps: ChessProfile[], activeIdx?: number) => {
    setProfiles(ps);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(ps));
    if (activeIdx !== undefined) {
      setActiveProfileIdx(activeIdx);
      localStorage.setItem(ACTIVE_PROFILE_KEY, String(activeIdx));
    }
    // Sync the legacy keys so GameList picks it up
    const active = ps[activeIdx ?? activeProfileIdx];
    if (active) {
      localStorage.setItem("cr_username", active.name);
      localStorage.setItem("cr_platform", active.platform);
    }
    // Fire storage event for same-tab listeners
    window.dispatchEvent(new Event("storage"));
  };

  // Migrate legacy single-profile to new system on first load
  useEffect(() => {
    if (profiles.length === 0) {
      const name = localStorage.getItem("cr_username");
      const platform = (localStorage.getItem("cr_platform") ?? "chesscom") as "chesscom" | "lichess";
      if (name) {
        const migrated = [{ name, platform }];
        saveProfiles(migrated, 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchProfile = (idx: number) => {
    if (idx === activeProfileIdx) return;
    setActiveProfileIdx(idx);
    localStorage.setItem(ACTIVE_PROFILE_KEY, String(idx));
    const p = profiles[idx];
    if (p) {
      localStorage.setItem("cr_username", p.name);
      localStorage.setItem("cr_platform", p.platform);
      // Clear cached games and stats so GameList reloads for the new profile
      localStorage.removeItem("cr_games");
      localStorage.removeItem("cr_stats");
      window.dispatchEvent(new Event("storage"));
      // Force GameList to reload
      window.dispatchEvent(new CustomEvent("cr_profile_switch", { detail: p }));
    }
  };

  const verifyUserExists = async (name: string, platform: "chesscom" | "lichess"): Promise<string | null> => {
    try {
      const url = platform === "chesscom" 
        ? `https://api.chess.com/pub/player/${name.toLowerCase()}`
        : `https://lichess.org/api/user/${name.toLowerCase()}`;
      const res = await fetch(url);
      if (res.status === 200) {
        const data = await res.json();
        if (platform === "chesscom" && data.url) {
          // Chess.com API returns `username` in lowercase, but `url` preserves casing.
          // e.g. "https://www.chess.com/member/MagnusCarlsen"
          const parts = data.url.split("/");
          return parts[parts.length - 1] || data.username || name;
        }
        return data.username || name;
      }
      return null;
    } catch {
      return null;
    }
  };

  const addProfile = async (name: string, platform: "chesscom" | "lichess", skipVerify = false) => {
    if (profiles.length >= 5) return;
    // Don't add duplicates
    const exists = profiles.some(p => p.name.toLowerCase() === name.toLowerCase() && p.platform === platform);
    if (exists) {
      setAddProfileError("Profile already added");
      return;
    }

    let finalName = name;
    if (!skipVerify) {
      setAddProfileLoading(true);
      setAddProfileError(null);
      const officialName = await verifyUserExists(name, platform);
      setAddProfileLoading(false);
      if (!officialName) {
        setAddProfileError(`User not found on ${platform === "chesscom" ? "Chess.com" : "Lichess"}`);
        return;
      }
      finalName = officialName;
    }

    const updated = [...profiles, { name: finalName, platform }];
    saveProfiles(updated, updated.length - 1);
    setShowAddProfile(false);
    setAddProfileName("");
    setAddProfileError(null);
    // Clear games cache and trigger reload
    localStorage.removeItem("cr_games");
    window.dispatchEvent(new CustomEvent("cr_profile_switch", { detail: { name: finalName, platform } }));
  };

  const removeProfile = (idx: number) => {
    const isRemovingActive = idx === activeProfileIdx;
    const updated = profiles.filter((_, i) => i !== idx);
    const newActiveIdx = activeProfileIdx >= updated.length
      ? Math.max(0, updated.length - 1)
      : activeProfileIdx > idx ? activeProfileIdx - 1 : activeProfileIdx;
    saveProfiles(updated, newActiveIdx);
    
    if (updated.length === 0) {
      localStorage.removeItem("cr_username");
      localStorage.removeItem("cr_platform");
      localStorage.removeItem("cr_games");
      localStorage.removeItem("cr_stats");
      window.dispatchEvent(new CustomEvent("cr_profile_switch", { detail: null }));
    } else if (isRemovingActive) {
      localStorage.removeItem("cr_games");
      localStorage.removeItem("cr_stats");
      window.dispatchEvent(new CustomEvent("cr_profile_switch", { detail: updated[newActiveIdx] }));
    }
  };

  const handleDepthChange = useCallback((d: number) => {
    setDepth(d);
    localStorage.setItem("cr_depth", String(d));
    // depth < 16 implies cloud-only fallback is fine; only block local for very shallow
    setCloudOnlyMode(d <= 12);
  }, []);

  const handleContinuationFen = useCallback((fen: string | null) => {
    if (!fen) {
      setContinuationFen(null);
      setMoveAnim(null);
      return;
    }
    setContinuationFen(fen);
    setMoveAnim(null);
  }, []);

  const handleContinuationActive = useCallback((active: boolean) => {
    setContinuationActive(active);
    if (!active) {
      setContinuationFen(null);
      setContinuationEval(null);
      setContinuationArrow(null);
      // Do not clearBoardTimers here — ContinuationViewer mounts/unmounts on
      // every move click and would cancel the main board navigation animation.
    }
  }, []);

  const handleContinuationEval = useCallback((ev: EvalResult | null) => {
    setContinuationEval(ev);
  }, []);

  const handleContinuationArrow = useCallback((arrow: { from: string; to: string } | null) => {
    setContinuationArrow(arrow);
  }, []);

  const navigateToMove = useCallback((idx: number, animate = true) => {
    setContinuationActive(false);
    setContinuationFen(null);
    setContinuationEval(null);
    setContinuationArrow(null);
    clearBoardTimers();
    setMoveAnim(null);
    if (idx < 0) {
      setCurrentMoveIdx(-1);
      setCurrentEval(null);
      fadeBoardToFen("start");
      return;
    }
    if (idx >= moves.length) return;
    const m = moves[idx];
    const fromSq = m.uci?.slice(0, 2);
    const toSq = m.uci?.slice(2, 4);

    setCurrentMoveIdx(idx);
    setCurrentEval(m.evalAfter);

    if (animate && m.san) {
      playMoveFeedback(m.san);
    }

    if (animate && fromSq && toSq && m.fenBefore) {
      const skipSetup = currentFen === m.fenBefore;
      playMoveOnBoard(m.fenBefore, m.fenAfter, fromSq, toSq, skipSetup);
    } else {
      setBoardDimmed(false);
      setBoardPieceAnimMs(BOARD_STEP_MS);
      setCurrentFen(m.fenAfter);
    }
  }, [moves, playMoveOnBoard, fadeBoardToFen, currentFen, clearBoardTimers, BOARD_STEP_MS]);

  const KEY_CLASSIFICATIONS = new Set(["brilliant", "great", "mistake", "blunder"]);

  const navigateToKeyMove = useCallback((direction: "prev" | "next") => {
    const indices = moves
      .map((m, i) => ({ i, c: m.classification }))
      .filter(({ c }) => c && KEY_CLASSIFICATIONS.has(c))
      .map(({ i }) => i);
    if (!indices.length) return;
    if (direction === "next") {
      const next = indices.find((i) => i > currentMoveIdx);
      if (next !== undefined) navigateToMove(next);
    } else {
      const prev = [...indices].reverse().find((i) => i < currentMoveIdx);
      if (prev !== undefined) navigateToMove(prev);
    }
  }, [moves, currentMoveIdx, navigateToMove]);

  const startAnalysis = useCallback(async (pgnStr: string) => {
    if (!pgnStr.trim()) return;
    abortRef.current = false;
    await recheckEngine();
    setAnalysisState("analyzing");
    setGamePlyCount(countPgnPlies(pgnStr));
    setMoves([]);
    setSummary(null);
    setCurrentMoveIdx(-1);
    setCurrentFen("start");
    setCurrentEval(null);
    setProgress({ done: 0, total: 0 });

    const meta = extractGameMeta(pgnStr);
    setPlayerNames({ white: meta.white, black: meta.black });
    setGameMeta(meta);
    setClocks(extractClocks(pgnStr));

    try {
      const { moves: analyzedMoves, summary: reviewSummary } = await analyzePgn(
        pgnStr,
        (done, total) => {
          if (abortRef.current) return;
          setProgress({ done, total });
        },
        depth
      );
      if (!abortRef.current) {
        setMoves(analyzedMoves);
        setSummary(reviewSummary);
        setAnalysisState("done");
        setTab("review");
        if (analyzedMoves.length > 0) navigateToMove(analyzedMoves.length - 1, false);
      }
    } catch (e) {
      console.error(e);
      setAnalysisState("error");
    }
  }, [navigateToMove, depth, recheckEngine]);

  const loadPgn = useCallback((pgnStr: string) => {
    const parsed = parseGameText(pgnStr);
    if (!parsed.ok) {
      alert(parsed.error);
      return;
    }
    setPgn(parsed.pgn);
    setGamePlyCount(parsed.moveCount);
    setMoves([]);
    setSummary(null);
    setCurrentMoveIdx(-1);
    setCurrentFen("start");
    setCurrentEval(null);
    setAnalysisState("loading");
    setTab("moves");
    const meta = extractGameMeta(parsed.pgn);
    setPlayerNames({ white: meta.white, black: meta.black });
    setGameMeta(meta);
    setClocks(extractClocks(parsed.pgn));
  }, []);

  // Unlock Web Audio on first touch (required on iOS / Android Chrome)
  useEffect(() => {
    const unlock = () => unlockChessAudio();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Sync profiles when GameList saves a new username (e.g. first-time user)
  useEffect(() => {
    const onStorage = () => {
      const name = localStorage.getItem("cr_username");
      const platform = (localStorage.getItem("cr_platform") ?? "chesscom") as "chesscom" | "lichess";
      if (name && !profiles.some(p => p.name.toLowerCase() === name.toLowerCase() && p.platform === platform)) {
        // New user entered in GameList — auto-add to profiles, skip verify as API check happened in GameList
        addProfile(name, platform, true);
      }
    };
    window.addEventListener("storage", onStorage);
    const interval = setInterval(onStorage, 2000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        navigateToMove(Math.min(currentMoveIdx + 1, moves.length - 1), false);
      } else if (e.key === "ArrowLeft") {
        navigateToMove(Math.max(currentMoveIdx - 1, -1), false);
      } else if (e.key === "ArrowUp") {
        navigateToMove(-1, false);
      } else if (e.key === "ArrowDown") {
        navigateToMove(moves.length - 1, false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMoveIdx, moves.length, navigateToMove]);

  const currentMove = currentMoveIdx >= 0 ? moves[currentMoveIdx] : null;

  const gameEnd = useMemo(() => {
    if (!gameMeta?.result || gameMeta.result === "*") return null;
    const finalFen =
      moves.length > 0 ? moves[moves.length - 1].fenAfter : undefined;
    return getGameEndInfo(
      gameMeta.result,
      gameMeta.termination,
      playerNames.white,
      playerNames.black,
      finalFen
    );
  }, [gameMeta, moves, playerNames.white, playerNames.black]);

  const atGameEnd =
    moves.length > 0 && currentMoveIdx === moves.length - 1;

  const progressPercent =
    progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  const [showDepth, setShowDepth] = useState(false);
  const [showMobileGraph, setShowMobileGraph] = useState(false);

  const [winWidth, setWinWidth] = useState(() => typeof window !== "undefined" ? window.innerWidth : 480);
  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const boardWidth =
    winWidth < 1024
      ? Math.min(Math.floor(winWidth * 0.88), winWidth - 44)
      : Math.min(winWidth - 520, window.innerHeight - 260);

  return (
    <div className="h-[100dvh] overflow-hidden bg-chess-bg text-chess-text font-sans flex flex-col">
      <header className="flex items-center gap-2 px-3 py-2 bg-chess-panel border-b border-chess-border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl select-none">♟</span>
          <span className="font-bold text-base tracking-tight text-chess-text">
            Chess<span className="text-move-best">Review</span><span className="text-chess-muted font-normal text-xs">.org</span>
          </span>
        </div>
        <div className="flex-1" />

        {engineBackend === "native" && (
          <span className="hidden sm:inline text-[10px] font-medium px-2 py-0.5 rounded-full bg-move-best/20 text-move-best border border-move-best/40">
            Native engine
          </span>
        )}
        {hasRemoteEngine && engineBackend === "unavailable" && (
          <button
            type="button"
            onClick={() => void recheckEngine()}
            className="text-[10px] text-amber-400 hover:text-amber-300 max-w-[42vw] truncate sm:max-w-none"
            title="Laptop: npm run laptop:server — then tap to retry"
          >
            <span className="sm:hidden">Offline · retry</span>
            <span className="hidden sm:inline">Engine offline · Lichess (slow) — retry</span>
          </button>
        )}
        {hasRemoteEngine && engineBackend === "cloud" && (
          <span className="hidden sm:inline text-[10px] text-chess-muted" title="No native server configured">
            Cloud engine
          </span>
        )}

        {/* Depth — hidden on mobile, shown on md+ */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-xs text-chess-muted">Depth:</span>
          {(hasRemoteEngine || engineBackend === "native"
            ? ([12, 16, 18, 20] as const)
            : import.meta.env.PROD
              ? ([12] as const)
              : ([12, 16, 18, 20, 24] as const)
          ).map(d => {
            const hint = d === 12
              ? "Fast / cloud-only"
              : d === 16 ? "Recommended (native Stockfish)" : d === 18 ? "Deep" : d === 20 ? "Very deep" : "Max";
            return (
              <button key={d} onClick={() => handleDepthChange(d)} title={hint}
                className={`text-xs px-2 py-0.5 rounded font-mono font-semibold transition-colors border ${
                  depth === d ? "bg-move-best text-white border-move-best" : "bg-chess-panel text-chess-muted border-chess-border hover:text-chess-text"
                }`}>{d}</button>
            );
          })}
        </div>

        {/* Depth toggle on mobile */}
        <div className="lg:hidden relative">
          <button onClick={() => setShowDepth(v => !v)}
            className="text-xs px-2 py-1 rounded border border-chess-border text-chess-muted bg-chess-panel">
            D:{depth}
          </button>
          {showDepth && (
            <div className="absolute right-0 top-full mt-1 bg-chess-panel border border-chess-border rounded-lg shadow-xl z-50 flex gap-1 p-1.5">
              {(hasRemoteEngine || engineBackend === "native"
                ? ([12, 16, 18, 20] as const)
                : import.meta.env.PROD
                  ? ([12] as const)
                  : ([12, 16, 18, 20, 24] as const)
              ).map(d => (
                <button key={d} onClick={() => { handleDepthChange(d); setShowDepth(false); }}
                  className={`text-xs px-2 py-1 rounded font-mono font-semibold border ${
                    depth === d ? "bg-move-best text-white border-move-best" : "bg-chess-bg text-chess-muted border-chess-border"
                  }`}>{d}</button>
              ))}
            </div>
          )}
        </div>

        {/* ── Profile Dropdown ── */}
        <div className="flex items-center relative ml-1 sm:ml-3 flex-shrink-0">
          <button
            onClick={() => setShowAddProfile(v => !v)}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-chess-border bg-chess-bg text-xs sm:text-sm font-semibold transition-colors hover:bg-chess-hover hover:text-chess-text text-chess-muted max-w-[140px] sm:max-w-none"
          >
            {activeUser ? (
              <>
                <span className="leading-none">{activeUser.platform === "lichess" ? "🏳" : "♟"}</span>
                <span className="truncate text-chess-text">{activeUser.name}</span>
                <span className="text-[10px] flex-shrink-0">▼</span>
              </>
            ) : (
              <>
                <span className="leading-none">👤</span>
                <span>Profile</span>
                <span className="text-[10px] flex-shrink-0">▼</span>
              </>
            )}
          </button>

          {showAddProfile && (
            <div
              className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
              onClick={() => setShowAddProfile(false)}
              aria-hidden
            />
          )}

          {/* Dropdown — full-width sheet on mobile, anchored panel on desktop */}
          {showAddProfile && (
            <div className="fixed left-2 right-2 top-12 z-[70] max-h-[min(75dvh,520px)] overflow-y-auto rounded-xl border border-chess-border bg-chess-panel shadow-2xl flex flex-col lg:fixed lg:inset-auto lg:absolute lg:right-0 lg:top-full lg:left-auto lg:mt-2 lg:w-72 lg:max-h-96 lg:rounded-lg">
              {profiles.length > 0 && (
                <div className="flex flex-col border-b border-chess-border max-h-48 overflow-y-auto">
                  <div className="text-xs font-semibold text-chess-muted px-3 py-2 bg-chess-bg">Your Profiles</div>
                  {profiles.map((p, i) => (
                    <div
                      key={`${p.platform}-${p.name}`}
                      className={`flex items-center justify-between px-3 py-2 transition-colors ${
                        i === activeProfileIdx ? "bg-move-best/15 border-l-2 border-move-best" : "hover:bg-chess-hover border-l-2 border-transparent"
                      }`}
                    >
                      <button
                        onClick={() => { switchProfile(i); setShowAddProfile(false); }}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        <span className="text-sm leading-none">{p.platform === "lichess" ? "🏳" : "♟"}</span>
                        <span className={`text-sm font-semibold truncate ${i === activeProfileIdx ? "text-move-best" : "text-chess-text"}`}>
                          {p.name}
                        </span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeProfile(i); }}
                        title="Remove profile"
                        className="w-6 h-6 flex items-center justify-center rounded text-chess-muted hover:bg-move-blunder hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Profile Section */}
              {profiles.length < 5 ? (
                <div className="p-3 bg-chess-panel">
                  <div className="text-xs font-semibold text-chess-text mb-2">Add New Profile</div>
                  <div className="flex rounded overflow-hidden border border-chess-border text-xs font-semibold mb-2">
                    <button
                      onClick={() => { setAddProfilePlatform("chesscom"); setAddProfileError(null); }}
                      className={`flex-1 py-1.5 flex items-center justify-center gap-1 transition-colors ${
                        addProfilePlatform === "chesscom" ? "bg-move-best text-white" : "bg-chess-bg text-chess-muted hover:text-chess-text"
                      }`}
                    >♟ Chess.com</button>
                    <button
                      onClick={() => { setAddProfilePlatform("lichess"); setAddProfileError(null); }}
                      className={`flex-1 py-1.5 flex items-center justify-center gap-1 border-l border-chess-border transition-colors ${
                        addProfilePlatform === "lichess" ? "bg-[#b58863] text-white" : "bg-chess-bg text-chess-muted hover:text-chess-text"
                      }`}
                    >🏳 Lichess</button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (addProfileName.trim() && !addProfileLoading) {
                      addProfile(addProfileName.trim(), addProfilePlatform);
                    }
                  }}>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={addProfileName}
                          onChange={(e) => { setAddProfileName(e.target.value); setAddProfileError(null); }}
                          placeholder="Username"
                          className="flex-1 min-w-0 bg-chess-bg border border-chess-border rounded px-2 py-1.5 text-xs text-chess-text placeholder-chess-muted focus:outline-none focus:border-move-best"
                        />
                        <button
                          type="submit"
                          disabled={!addProfileName.trim() || addProfileLoading}
                          className="px-3 py-1.5 w-14 bg-move-best text-white text-xs font-semibold rounded hover:bg-green-600 transition-colors disabled:opacity-40 flex justify-center items-center"
                        >
                          {addProfileLoading ? <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Add"}
                        </button>
                      </div>
                      {addProfileError && (
                        <div className="text-[10px] text-move-blunder leading-tight px-1 font-semibold">{addProfileError}</div>
                      )}
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-3 text-xs text-chess-muted text-center italic bg-chess-bg">
                  Maximum of 5 profiles reached.
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <MobileAnalysisStatus
        state={analysisState}
        progress={progress}
        whiteName={playerNames.white}
        blackName={playerNames.black}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Mobile bottom tab bar ── */}
        {/* Rendered inside the sidebar on desktop; on mobile it's a fixed bottom bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-chess-panel border-t border-chess-border flex">
          {(["games","moves","review"] as SidebarTab[]).map(t => (
            <button key={t} onClick={() => { hapticTap(); setTab(t); }}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === t ? "text-move-best border-t-2 border-move-best -mt-px" : "text-chess-muted"
              }`}>
              {t === "games" ? "🎮 Games" : t === "moves" ? "♟ Moves" : "📊 Review"}
            </button>
          ))}
        </div>

        {/* Mobile content pane (Games / Moves / Review) — shown above bottom bar */}
        {tab !== "moves" && (
          <div className="lg:hidden fixed inset-0 top-[44px] bottom-[48px] z-30 bg-chess-sidebar flex flex-col overflow-hidden pb-safe">
            {tab === "games" && (
              <GameList
                username=""
                onGameSelect={(pgnStr) => {
                  loadPgn(pgnStr);
                  setTab("moves");
                }}
                onLinkProfile={openProfilePanel}
              />
            )}
            {tab === "review" && (
              <div className="flex-1 overflow-y-auto min-h-0">
                {summary ? (
                  <ReviewSummaryPanel summary={summary} whiteName={playerNames.white} blackName={playerNames.black}
                    moves={moves} onMoveClick={(idx) => { navigateToMove(idx); setTab("moves"); }} />
                ) : (
                  <div className="px-4 py-8 text-chess-muted text-xs text-center leading-relaxed">
                    Load and analyze a game to see the review summary.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sidebar — hidden on mobile, visible on md+ */}
        <aside className="hidden lg:flex w-72 flex-shrink-0 bg-chess-sidebar border-r border-chess-border flex-col overflow-hidden">
          <div className="flex border-b border-chess-border">
            {(["games", "moves", "review"] as SidebarTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  tab === t
                    ? "text-move-best border-b-2 border-move-best"
                    : "text-chess-muted hover:text-chess-text"
                }`}
              >
                {t === "games" ? "Games" : t === "moves" ? "Moves" : "Review"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
            {tab === "games" && (
              <GameList
                username=""
                onGameSelect={(pgnStr) => loadPgn(pgnStr)}
                onLinkProfile={openProfilePanel}
              />
            )}

            {tab === "moves" && (
              <div className="flex flex-col h-full">
                {pgn ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-chess-border flex-shrink-0">
                      <span className="text-xs text-chess-muted font-semibold uppercase tracking-wider">
                        {playerNames.white} vs {playerNames.black}
                      </span>
                      {analysisState === "loading" && (
                        <button
                          onClick={() => startAnalysis(pgn)}
                          className="text-xs bg-move-best hover:bg-green-600 text-white font-semibold px-2.5 py-1 rounded transition-colors"
                        >
                          Analyze
                        </button>
                      )}
                    </div>

                    {analysisState === "analyzing" && (
                      <div className="px-3 py-2 border-b border-chess-border flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs text-chess-muted mb-1.5">
                          <div className="w-3 h-3 border-2 border-move-best border-t-transparent rounded-full animate-spin" />
                          Analyzing… {Math.round(progressPercent)}%
                        </div>
                        <div className="w-full bg-chess-border rounded-full h-1">
                          <div
                            className="bg-move-best h-1 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-2">
                      {moves.length > 0 ? (
                        <MoveList
                          moves={moves}
                          currentMoveIndex={currentMoveIdx}
                          onMoveSelect={navigateToMove}
                          markGameEnd={!!gameEnd}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-chess-muted text-xs gap-2">
                          {analysisState === "loading" && (
                            <>
                              <span className="text-2xl">🔍</span>
                              <span>Click Analyze to start engine evaluation</span>
                            </>
                          )}
                          {analysisState === "idle" && (
                            <span>No game loaded</span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[240px] px-6 text-center gap-4">
                    <span className="text-3xl opacity-40 select-none" aria-hidden>
                      ♟
                    </span>
                    <p className="text-sm text-chess-muted">Load a game first</p>
                    <button
                      type="button"
                      onClick={() => setTab("games")}
                      className="text-sm font-semibold text-move-best hover:text-green-400 transition-colors"
                    >
                      Go to Games →
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "review" && (
              <div className="h-full overflow-y-auto min-h-0">
                {gameEnd && (
                  <GameEndBanner
                    end={gameEnd}
                    whiteName={playerNames.white}
                    blackName={playerNames.black}
                    atFinalPosition
                  />
                )}
                {summary ? (
                  <ReviewSummaryPanel
                    summary={summary}
                    whiteName={playerNames.white}
                    blackName={playerNames.black}
                    moves={moves}
                    onMoveClick={(idx) => { navigateToMove(idx); setTab("moves"); }}
                  />
                ) : (
                  <div className="px-4 py-8 text-chess-muted text-xs text-center leading-relaxed">
                    Load and analyze a game to see the review summary.
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* ── Desktop board area ── */}
          <div className="hidden lg:flex flex-1 flex-col min-h-0 overflow-hidden">
            {gameEnd && (
              <div className="flex-shrink-0 px-4 pt-2">
                <GameEndBanner
                  end={gameEnd}
                  whiteName={playerNames.white}
                  blackName={playerNames.black}
                  atFinalPosition={atGameEnd}
                  compact={!atGameEnd}
                />
              </div>
            )}
          <div className="flex flex-1 items-center justify-center p-4 gap-4 min-h-0 overflow-hidden">
            <div className="flex items-stretch gap-2 h-full max-h-[min(calc(100vw-480px),calc(100vh-180px))]">
              <div className="relative flex flex-col gap-1">
                <PlayerTag
                  name={boardFlipped ? playerNames.white : playerNames.black}
                  color={boardFlipped ? "white" : "black"}
                  rating={boardFlipped ? gameMeta?.whiteRating : gameMeta?.blackRating}
                  result={gameMeta?.result ?? null}
                  isLastMove={currentMoveIdx === moves.length - 1}
                  clock={(() => {
                    // clocks array is flat: index 0=white move1, 1=black move1, 2=white move2...
                    // Top player is black (unflipped) or white (flipped)
                    const topIsBlack = !boardFlipped;
                    // Find latest clock for this player up to currentMoveIdx
                    for (let i = currentMoveIdx; i >= 0; i--) {
                      const isBlackMove = i % 2 === 1;
                      if (topIsBlack === isBlackMove && clocks[i] !== undefined && clocks[i] !== null) return clocks[i];
                    }
                    return null;
                  })()}
                  clockColor={boardFlipped ? "w" : "b"}
                  side={boardFlipped ? "w" : "b"}
                />
                <ReviewChessboard
                  position={continuationFen ?? currentFen}
                  boardWidth={Math.min(
                    window.innerWidth - 400,
                    window.innerHeight - 260
                  )}
                  boardOrientation={boardFlipped ? "black" : "white"}
                  animationDuration={boardPieceAnimMs}
                  dimmed={boardDimmed && !continuationFen}
                  continuationActive={continuationActive}
                  moveAnim={moveAnim}
                  continuationArrow={continuationArrow}
                  showBestMoveArrow={
                    !continuationActive &&
                    !!showBestMove &&
                    !!currentMove?.bestMove &&
                    (currentMove.classification === "inaccuracy" ||
                      currentMove.classification === "mistake" ||
                      currentMove.classification === "blunder")
                  }
                  bestMove={currentMove?.bestMove}
                />
                <PlayerTag
                  name={boardFlipped ? playerNames.black : playerNames.white}
                  color={boardFlipped ? "black" : "white"}
                  rating={boardFlipped ? gameMeta?.blackRating : gameMeta?.whiteRating}
                  result={gameMeta?.result ?? null}
                  isLastMove={currentMoveIdx === moves.length - 1}
                  clock={(() => {
                    // Bottom player is white (unflipped) or black (flipped)
                    const bottomIsBlack = boardFlipped;
                    for (let i = currentMoveIdx; i >= 0; i--) {
                      const isBlackMove = i % 2 === 1;
                      if (bottomIsBlack === isBlackMove && clocks[i] !== undefined && clocks[i] !== null) return clocks[i];
                    }
                    return null;
                  })()}
                  clockColor={boardFlipped ? "b" : "w"}
                  side={boardFlipped ? "b" : "w"}
                />
              </div>

              <div className="flex flex-col gap-2 w-10">
                <button
                  onClick={() => setBoardFlipped((f: boolean) => !f)}
                  className="bg-chess-panel border border-chess-border hover:bg-chess-hover rounded p-1.5 text-chess-muted hover:text-chess-text transition-colors"
                  title="Flip board"
                >
                  ⇅
                </button>
                <button
                  onClick={() => navigateToMove(-1, false)}
                  className="bg-chess-panel border border-chess-border hover:bg-chess-hover rounded p-1.5 text-chess-muted hover:text-chess-text transition-colors text-xs"
                  title="Go to start"
                >
                  ⏮
                </button>
                <button
                  onClick={() => navigateToMove(Math.max(currentMoveIdx - 1, -1), false)}
                  className="bg-chess-panel border border-chess-border hover:bg-chess-hover rounded p-1.5 text-chess-muted hover:text-chess-text transition-colors text-xs"
                  title="Previous move"
                >
                  ◀
                </button>
                <button
                  onClick={() => navigateToMove(Math.min(currentMoveIdx + 1, moves.length - 1), false)}
                  className="bg-chess-panel border border-chess-border hover:bg-chess-hover rounded p-1.5 text-chess-muted hover:text-chess-text transition-colors text-xs"
                  title="Next move"
                >
                  ▶
                </button>
                <button
                  onClick={() => navigateToMove(moves.length - 1, false)}
                  className="bg-chess-panel border border-chess-border hover:bg-chess-hover rounded p-1.5 text-chess-muted hover:text-chess-text transition-colors text-xs"
                  title="Go to end"
                >
                  ⏭
                </button>
                {moves.length > 0 && (
                  <>
                    <div className="w-px h-5 bg-chess-border mx-0.5" />
                    <button
                      onClick={() => navigateToKeyMove("prev")}
                      className="bg-chess-panel border border-chess-border hover:bg-chess-hover rounded p-1.5 text-amber-400 hover:text-amber-300 transition-colors text-xs"
                      title="Previous key move (blunder/mistake/brilliant)"
                    >
                      ⚠◀
                    </button>
                    <button
                      onClick={() => navigateToKeyMove("next")}
                      className="bg-chess-panel border border-chess-border hover:bg-chess-hover rounded p-1.5 text-amber-400 hover:text-amber-300 transition-colors text-xs"
                      title="Next key move (blunder/mistake/brilliant)"
                    >
                      ▶⚠
                    </button>
                  </>
                )}
              </div>

              {/* Coach panel — move notes, eval, engine line */}
              {moves.length > 0 && (
                <div className="w-52 flex-shrink-0 flex flex-col bg-chess-panel border border-chess-border rounded-lg overflow-hidden self-stretch">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-chess-border flex-shrink-0">
                    <span className="text-xs font-semibold text-chess-subtext uppercase tracking-wide">
                      Coach
                    </span>
                    <EvalBadge
                      evalResult={continuationEval ?? currentEval}
                      compact
                    />
                  </div>
                  <div className="flex items-center justify-between px-3 py-1 border-b border-chess-border/60 flex-shrink-0">
                    <span className="text-[10px] text-chess-muted">Best-move arrow</span>
                    <button
                      type="button"
                      onClick={() => setShowBestMove((b) => !b)}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                        showBestMove
                          ? "bg-move-best text-white"
                          : "bg-chess-border text-chess-muted"
                      }`}
                    >
                      {showBestMove ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                    <MoveReviewPanel
                      move={currentMove}
                      moveIdx={currentMoveIdx}
                      moves={moves}
                      onContinuationFen={handleContinuationFen}
                      onContinuationEval={handleContinuationEval}
                      onContinuationActive={handleContinuationActive}
                      onContinuationArrow={handleContinuationArrow}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          {moves.length > 0 && (
            <div className="hidden lg:block flex-shrink-0">
              <EvalChart moves={moves} currentMoveIndex={currentMoveIdx} onMoveSelect={navigateToMove} />
            </div>
          )}

          {/* ── Mobile layout ── */}
          <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-shrink-0 flex flex-col items-center px-2 pt-2 pb-2 gap-1">
              {moves.length > 0 ? (
                <>
              <PlayerTag
                compact
                name={boardFlipped ? playerNames.white : playerNames.black}
                color={boardFlipped ? "white" : "black"}
                rating={boardFlipped ? gameMeta?.whiteRating : gameMeta?.blackRating}
                result={gameMeta?.result ?? null}
                isLastMove={currentMoveIdx === moves.length - 1}
                side={boardFlipped ? "w" : "b"}
              />
                <MobileBoardShell
                  evalResult={continuationEval ?? currentEval}
                  position={continuationFen ?? currentFen}
                  boardWidth={boardWidth}
                  boardOrientation={boardFlipped ? "black" : "white"}
                  animationDuration={boardPieceAnimMs}
                  dimmed={boardDimmed && !continuationFen}
                  continuationActive={continuationActive}
                  moveAnim={moveAnim}
                  continuationArrow={continuationArrow}
                  showBestMoveArrow={
                    !continuationActive &&
                    !!showBestMove &&
                    !!currentMove?.bestMove &&
                    ["inaccuracy", "mistake", "blunder"].includes(
                      currentMove.classification ?? ""
                    )
                  }
                  bestMove={currentMove?.bestMove}
                  moveIndex={currentMoveIdx}
                  moveCount={gamePlyCount || moves.length}
                  canPrev={currentMoveIdx > -1}
                  canNext={currentMoveIdx < moves.length - 1}
                  onPrev={() =>
                    navigateToMove(Math.max(currentMoveIdx - 1, -1))
                  }
                  onNext={() =>
                    navigateToMove(
                      Math.min(currentMoveIdx + 1, moves.length - 1)
                    )
                  }
                />
              <PlayerTag
                compact
                name={boardFlipped ? playerNames.black : playerNames.white}
                color={boardFlipped ? "black" : "white"}
                rating={boardFlipped ? gameMeta?.blackRating : gameMeta?.whiteRating}
                result={gameMeta?.result ?? null}
                isLastMove={currentMoveIdx === moves.length - 1}
                side={boardFlipped ? "b" : "w"}
              />
              {gameEnd && atGameEnd && (
                <p className="text-[10px] text-chess-muted text-center w-full truncate px-1">
                  {gameEnd.icon} {gameEnd.detail}
                </p>
              )}
              <div className="flex items-center justify-center w-full gap-2 py-0.5">
                <button
                  type="button"
                  onClick={() => setBoardFlipped((f) => !f)}
                  className="p-2 rounded-lg border border-chess-border text-chess-muted text-sm active:bg-chess-hover"
                  aria-label="Flip board"
                >
                  ⇅
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileGraph((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    showMobileGraph
                      ? "border-move-best text-move-best bg-move-best/10"
                      : "border-chess-border text-chess-muted"
                  }`}
                >
                  {showMobileGraph ? "Coach" : "Graph"}
                </button>
                <span className="text-[10px] text-chess-muted">Tap sides</span>
              </div>
                </>
              ) : (
                <>
                <MobileGameHero
                  boardWidth={boardWidth}
                  boardOrientation={boardFlipped ? "black" : "white"}
                  whiteName={playerNames.white}
                  blackName={playerNames.black}
                  whiteRating={gameMeta?.whiteRating}
                  blackRating={gameMeta?.blackRating}
                  hasGame={!!pgn}
                  analyzing={analysisState === "analyzing"}
                  onAnalyze={pgn ? () => startAnalysis(pgn) : undefined}
                />
                {pgn && (
                  <button
                    type="button"
                    onClick={() => setBoardFlipped((f) => !f)}
                    className="text-[10px] text-chess-muted px-2 py-1 border border-chess-border rounded"
                  >
                    ⇅ Flip board
                  </button>
                )}
                </>
              )}
            </div>

            {moves.length > 0 && (
            <div className="flex-1 overflow-y-auto min-h-0 pb-14 bg-chess-panel">
                {showMobileGraph ? (
                  <div className="w-full p-2">
                    <EvalChart
                      moves={moves}
                      currentMoveIndex={currentMoveIdx}
                      onMoveSelect={navigateToMove}
                    />
                  </div>
                ) : (
                  <div className="border-t border-chess-border flex flex-col">
                    <MoveReviewPanel
                      move={currentMove}
                      moveIdx={currentMoveIdx}
                      moves={moves}
                      onContinuationFen={handleContinuationFen}
                      onContinuationEval={handleContinuationEval}
                      onContinuationActive={handleContinuationActive}
                      onContinuationArrow={handleContinuationArrow}
                    />
                  </div>
                )}
            </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PlayerTag({
  name,
  color,
  rating,
  result,
  isLastMove,
  clock,
  clockColor,
  side,
  compact = false,
}: {
  name: string;
  color: "white" | "black";
  rating?: number | null;
  result?: "1-0" | "0-1" | "1/2-1/2" | "*" | null;
  isLastMove?: boolean;
  clock?: number | null;
  clockColor?: "w" | "b";
  side?: "w" | "b";
  compact?: boolean;
}) {
  const mySide = side ?? (color === "white" ? "w" : "b");
  const won  = result === "1-0" ? "w" : result === "0-1" ? "b" : result === "1/2-1/2" ? "draw" : null;
  const didWin  = won === mySide;
  const didLose = won !== null && won !== "draw" && won !== mySide;
  const isDraw  = won === "draw";

  const hasClock = !compact && clock !== null && clock !== undefined;
  const clockSecs = hasClock ? clock! : null;
  const clockColor_ = clockSecs !== null
    ? clockSecs < 30
      ? "#ca3c3c"
      : clockSecs < 60
        ? "#e6c84a"
        : clockSecs < 120
          ? "#e07b39"
          : "#888"
    : "#888";

  return (
    <div
      className={`flex items-center gap-1.5 w-full rounded transition-all ${
        compact ? "px-1 py-0.5 text-xs" : "px-1 py-0.5 gap-2"
      } ${isLastMove && didLose ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      style={isLastMove && didLose ? { opacity: 0.7 } : undefined}
    >
      <div
        className={`rounded-sm border flex-shrink-0 ${compact ? "w-3 h-3" : "w-4 h-4"}`}
        style={{
          backgroundColor: color === "white" ? "#e8e6e3" : "#1a1a1a",
          borderColor: color === "white" ? "#ccc" : "#666",
        }}
      />
      <span
        className={`font-bold text-chess-text truncate ${compact ? "text-xs" : "text-sm"}`}
      >
        {name}
      </span>
      {didWin && (
        <span title="Winner" className={`leading-none ${compact ? "text-xs" : "text-sm"}`}>
          👑
        </span>
      )}
      {isDraw && (
        <span className="text-[10px] font-bold text-chess-muted">½-½</span>
      )}
      {rating && (
        <span className="text-[10px] text-chess-muted flex-shrink-0">({rating})</span>
      )}
      {hasClock && (
        <span
          className={`text-xs font-mono ml-auto flex-shrink-0 tabular-nums ${
            clockSecs !== null && clockSecs < 30 ? "animate-pulse" : ""
          }`}
          style={{ color: clockColor_ }}
        >
          {clockSecs !== null ? formatClock(clockSecs) : "--:--"}
        </span>
      )}
    </div>
  );
}

