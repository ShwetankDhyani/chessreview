import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AnalyzeBoardStack } from "./components/AnalyzeBoardStack";
import { MoveList } from "./components/MoveList";
import { ReviewSummaryPanel } from "./components/ReviewSummary";
import { ReviewEmptyState } from "./components/ReviewEmptyState";
import { EvalBar } from "./components/EvalBar";
import { EvalChartPanel } from "./components/EvalChartPanel";
import { GameList } from "./components/GameList";
import { analyzePgn } from "./utils/analyzer";
import { SiteFooter } from "./components/SiteFooter";
import type {
  AnalyzedMove,
  ReviewResult,
  ReviewSummary,
  EvalResult,
  AnalysisState,
} from "./types";
import {
  setCloudOnlyMode,
  getEvalBackend,
  refreshNativeEngineProbe,
} from "./engine/evaluationService";
import { MoveReviewPanel } from "./components/MoveReviewPanel";
import { EvalBadge } from "./components/EvalBadge";
import { MobileBoardShell } from "./components/MobileBoardShell";
import { MobileGameHero } from "./components/MobileGameHero";
import { getGameEndInfo } from "./utils/gameEnd";
import { parseGameText } from "./utils/pgnParse";
import { samePgn } from "./utils/pgnIdentity";
import {
  clearSessionReviewPin,
  getSessionReviewPin,
  jobFromPin,
  matchesReviewIdentity,
  resolveActiveReview,
  setSessionReviewPin,
  shouldSoftBrowseOtherGame,
  type SessionReviewPin,
} from "./utils/sessionReviewPin";
import { countPgnPlies, formatChessMoveCounter } from "./utils/pgnPlies";
import { buildPgnReplayFrames, type ReplayFrame } from "./utils/pgnReplay";
import { useAnalysisBoardReplay } from "./hooks/useAnalysisBoardReplay";
import { usePredictedAnalysisProgress } from "./hooks/usePredictedAnalysisProgress";
import { useReviewTimingModel } from "./hooks/useReviewTimingModel";
import {
  announce,
  hapticHeavy,
  hapticSelection,
  hapticSoft,
  hapticTap,
  hapticTapStrong,
  hapticToggle,
  notifyError,
  notifyReviewStart,
  notifySuccess,
  notifyWarning,
  playMoveFeedback,
  unlockChessAudio,
} from "./utils/chessSounds";
import { ProfileMenu } from "./components/ProfileMenu";
import { computeDesktopBoardSize, computeMobileBoardSize, MOBILE_LAYOUT } from "./utils/boardLayout";
import {
  BOARD_START_FEN,
  canAnimateBoardStep,
  highlightFromMove,
  highlightFromUci,
  resolveBoardNavStep,
} from "./utils/boardPosition";
import { AnalyzeNowButton } from "./components/AnalyzeNowButton";
import { BoardReviewActions } from "./components/BoardReviewActions";
import { buildPgnFilename, copyPgnToClipboard, downloadPgn } from "./utils/exportPgn";
import { EngineDepthControls } from "./components/EngineDepthControls";
import { BoardAnalysisStrip } from "./components/BoardAnalysisStrip";
import { AnalyzingMoveList } from "./components/AnalyzingMoveList";
import { progressToReplayPly } from "./utils/pgnReplay";
import {
  analysisStageLabel,
  formatEtaGuess,
  remainingEtaSeconds,
} from "./utils/analysisProgressUi";
import { coachShowsBestWas } from "./utils/moveFactSheet";
import { boardMoveClassification } from "./utils/boardMoveClassification";
import { shouldShowEngineLineGlow } from "./utils/engineLineGlow";
import { EngineLineNavBar } from "./components/EngineLineNavBar";
import type { ContinuationNavHandlers } from "./utils/continuationNav";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { recordReviewCompleted } from "./utils/reviewStats";
import { createShareLink, shareUrlForId } from "./utils/shareReview";
import { usePageSeo } from "./hooks/usePageSeo";
import { DEFAULT_SEO, homeJsonLd } from "./utils/seo";
import { InlineErrorNotice } from "./components/InlineErrorNotice";
import { SavedGamesModal } from "./components/SavedGamesModal";
import {
  deleteSavedReview,
  listSavedReviews,
  loadSavedReviewById,
  saveReviewToCloud,
  type SavedReviewListItem,
} from "./utils/savedReviews";
import {
  normalizeAnalysisError,
  normalizeShareError,
  trackAppError,
} from "./utils/appError";

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

export default function App({ isCovered = false }: { isCovered?: boolean }) {
  usePageSeo({
    path: "/",
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    jsonLd: homeJsonLd(),
  });

  const [tab, setTab] = useState<SidebarTab>("games");
  const [pgn, setPgn] = useState("");
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);
  const [gamePlyCount, setGamePlyCount] = useState(0);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const currentMoveIdxRef = useRef(-1);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  /** True after at least one successful review — keeps re-analyze visible while re-running. */
  const [reviewReady, setReviewReady] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [showAnalysisProgress, setShowAnalysisProgress] = useState(false);
  const showAnalysisProgressRef = useRef(false);
  const analysisGenerationRef = useRef(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [analysisElapsedSec, setAnalysisElapsedSec] = useState(0);
  /** List-row id for the PGN currently shown on the board. */
  const [sessionGameId, setSessionGameId] = useState<string | null>(null);
  /**
   * In-flight (or just-finished, parked) review job. Stays pinned on Games even
   * if the user opens a different board without canceling.
   */
  const [reviewJob, setReviewJob] = useState<{
    pgn: string;
    label: string;
    gameId: string | null;
  } | null>(null);
  const reviewJobRef = useRef<{
    pgn: string;
    label: string;
    gameId: string | null;
  } | null>(null);
  /** Completed review for `reviewJob` while the user was viewing another game. */
  const [parkedResult, setParkedResult] = useState<ReviewResult | null>(null);
  /** Completed review pinned on Games for this browser session (cleared on refresh). */
  const [completedPin, setCompletedPinState] = useState<SessionReviewPin | null>(
    () => getSessionReviewPin()
  );
  const setCompletedPin = useCallback((pin: SessionReviewPin | null) => {
    setSessionReviewPin(pin);
    setCompletedPinState(pin);
  }, []);
  const clearCompletedPin = useCallback(() => {
    clearSessionReviewPin();
    setCompletedPinState(null);
  }, []);
  const displayPgnRef = useRef("");
  const sessionGameIdRef = useRef<string | null>(null);
  const [replayFrames, setReplayFrames] = useState<ReplayFrame[]>([]);
  const [currentFen, setCurrentFen] = useState("start");
  const currentFenRef = useRef("start");
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
    const parsed = parseInt(saved ?? "14", 10);
    return Number.isFinite(parsed) ? Math.max(14, parsed) : 14;
  });
  const { timingModel, noteCompletedReview } = useReviewTimingModel();

  useEffect(() => {
    setCloudOnlyMode(!hasRemoteEngine && (import.meta.env.PROD || depth <= 14));
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
  const [continuationNav, setContinuationNav] = useState<ContinuationNavHandlers | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [moveAnim, setMoveAnim] = useState<{ from: string; to: string } | null>(null);
  const [boardDimmed, setBoardDimmed] = useState(false);
  const [boardPieceAnimMs, setBoardPieceAnimMs] = useState(0);
  const [boardRemountKey, setBoardRemountKey] = useState(0);
  const boardTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boardAnimGenRef = useRef(0);
  /** FEN the Chessboard last actually rendered (updated post-paint). */
  const lastRenderedFenRef = useRef("start");

  // Slow enough that the eye can follow the piece travelling between squares.
  const BOARD_PLAY_MOVE_MS = 380;
  const HIGHLIGHT_HOLD_MS = 700;

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

  /**
   * Set board to `fen`.
   *  - `animate=true` is only honoured if the board last *actually rendered*
   *    the position immediately before `fen` (true one-ply step). Otherwise
   *    we fall back to a clean remount + snap so react-chessboard can never
   *    animate a multi-piece diff (which is what causes "both moves at once").
   */
  const setBoardToFen = useCallback(
    (
      fen: string,
      highlight: { from: string; to: string } | null,
      animate: boolean
    ) => {
      clearBoardTimers();
      setBoardDimmed(false);
      // Persist the from/to highlight for as long as the user stays on this
      // move. The next navigate call overwrites it; clearing it explicitly
      // happens for start-position / new-game / continuation.
      setMoveAnim(highlight);

      const safeToAnimate =
        animate &&
        canAnimateBoardStep(lastRenderedFenRef.current, fen, highlight);

      currentFenRef.current = fen;

      // Set duration first so React batches it with the position change in the
      // same render → react-chessboard sees the new position with the new
      // duration and either animates a single piece or snaps cleanly. We avoid
      // remounting the board on every snap (which caused a visible flash).
      if (safeToAnimate) {
        setBoardPieceAnimMs(BOARD_PLAY_MOVE_MS);
      } else {
        setBoardPieceAnimMs(0);
      }
      setCurrentFen(fen);
    },
    [BOARD_PLAY_MOVE_MS, clearBoardTimers]
  );

  // Track what the Chessboard actually rendered (post-paint) so we can decide
  // safely whether the next nav can animate. Without this, fast clicks see a
  // stale ref and the library animates a multi-ply diff.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      lastRenderedFenRef.current = currentFen;
    });
    return () => cancelAnimationFrame(id);
  }, [currentFen]);
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
  const addProfileReqGenRef = useRef(0);
  const addProfileAbortRef = useRef<AbortController | null>(null);
  const [savedReviews, setSavedReviews] = useState<SavedReviewListItem[]>([]);
  const [savedReviewsLoading, setSavedReviewsLoading] = useState(false);
  const [showSavedGamesModal, setShowSavedGamesModal] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [saveReviewMessage, setSaveReviewMessage] = useState<string | null>(null);

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

  const verifyUserExists = async (
    name: string,
    platform: "chesscom" | "lichess",
    signal?: AbortSignal
  ): Promise<string | "__aborted__" | null> => {
    try {
      const url = platform === "chesscom" 
        ? `https://api.chess.com/pub/player/${name.toLowerCase()}`
        : `https://lichess.org/api/user/${name.toLowerCase()}`;
      const res = await fetch(url, { signal });
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
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "__aborted__";
      }
      return null;
    }
  };

  const cancelAddProfile = useCallback(() => {
    addProfileReqGenRef.current += 1;
    addProfileAbortRef.current?.abort();
    addProfileAbortRef.current = null;
    setAddProfileLoading(false);
    setAddProfileError(null);
  }, []);

  const addProfile = async (name: string, platform: "chesscom" | "lichess", skipVerify = false) => {
    if (profiles.length >= 5) return;
    // Don't add duplicates
    const exists = profiles.some(p => p.name.toLowerCase() === name.toLowerCase() && p.platform === platform);
    if (exists) {
      setAddProfileError("Profile already added");
      notifyWarning();
      return;
    }

    let finalName = name;
    if (!skipVerify) {
      const reqId = ++addProfileReqGenRef.current;
      setAddProfileLoading(true);
      setAddProfileError(null);
      const controller = new AbortController();
      addProfileAbortRef.current = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      const officialName = await verifyUserExists(name, platform, controller.signal);
      window.clearTimeout(timeoutId);
      if (reqId !== addProfileReqGenRef.current) return;
      setAddProfileLoading(false);
      addProfileAbortRef.current = null;
      if (officialName === "__aborted__") {
        setAddProfileError(
          "Profile check timed out after 5s. You can retry or paste PGN/game URL to keep reviewing."
        );
        notifyWarning();
        return;
      }
      if (!officialName) {
        setAddProfileError(`User not found on ${platform === "chesscom" ? "Chess.com" : "Lichess"}`);
        notifyError();
        return;
      }
      finalName = officialName;
    }

    // Re-check duplicates after normalization/verification (e.g. casing changes).
    const normalizedExists = profiles.some(
      (p) => p.platform === platform && p.name.toLowerCase() === finalName.toLowerCase()
    );
    if (normalizedExists) {
      setAddProfileError("Profile already added");
      notifyWarning();
      return;
    }

    const updated = [...profiles, { name: finalName, platform }];
    saveProfiles(updated, updated.length - 1);
    setShowAddProfile(false);
    setAddProfileName("");
    setAddProfileError(null);
    notifySuccess();
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

  useEffect(() => {
    const onInvalidProfile = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        name?: string;
        platform?: "chesscom" | "lichess";
      } | null;
      if (!detail?.name || !detail.platform) return;
      const idx = profiles.findIndex(
        (p) =>
          p.platform === detail.platform &&
          p.name.toLowerCase() === detail.name!.toLowerCase()
      );
      if (idx >= 0) {
        removeProfile(idx);
      }
    };
    window.addEventListener("cr_profile_invalid", onInvalidProfile);
    return () => window.removeEventListener("cr_profile_invalid", onInvalidProfile);
  }, [profiles, removeProfile]);

  const handleDepthChange = useCallback((d: number) => {
    setDepth(d);
    localStorage.setItem("cr_depth", String(d));
    // depth < 16 implies cloud-only fallback is fine; only block local for very shallow
    setCloudOnlyMode(d <= 12);
    hapticSelection();
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
  }, []);

  const handleContinuationEval = useCallback((ev: EvalResult | null) => {
    setContinuationEval(ev);
  }, []);

  const handleContinuationArrow = useCallback((arrow: { from: string; to: string } | null) => {
    setContinuationArrow(arrow);
  }, []);

  const handleRegisterContinuationNav = useCallback(
    (nav: ContinuationNavHandlers | null) => {
      setContinuationNav(nav);
    },
    []
  );

  const navigateToMove = useCallback((idx: number, animate = true) => {
    setContinuationNav(null);
    setContinuationActive(false);
    setContinuationFen(null);
    setContinuationEval(null);
    setContinuationArrow(null);
    clearBoardTimers();
    setMoveAnim(null);
    if (idx >= moves.length) return;

    const fromIdx = currentMoveIdxRef.current;
    const onePly = Math.abs(idx - fromIdx) === 1;
    const { fen, highlight } = resolveBoardNavStep(moves, fromIdx, idx);

    if (idx < 0) {
      if (fromIdx !== -1) hapticSoft();
      setCurrentMoveIdx(-1);
      currentMoveIdxRef.current = -1;
      setCurrentEval(null);
      setBoardToFen(fen, highlight, animate && onePly);
      return;
    }

    const m = moves[idx];
    setCurrentMoveIdx(idx);
    currentMoveIdxRef.current = idx;
    setCurrentEval(m.evalAfter);

    const moveHighlight = highlightFromMove(m);
    if (m.san) {
      playMoveFeedback(m.san);
    } else if (fromIdx !== idx) {
      hapticSoft();
    }

    setBoardToFen(fen, highlight, animate && onePly);
    setMoveAnim(moveHighlight);
  }, [moves, setBoardToFen]);

  useEffect(() => {
    currentFenRef.current = currentFen;
  }, [currentFen]);

  useEffect(() => {
    displayPgnRef.current = pgn;
  }, [pgn]);

  useEffect(() => {
    sessionGameIdRef.current = sessionGameId;
  }, [sessionGameId]);

  // Heal React state from the tab-memory pin after remounts / HMR.
  useEffect(() => {
    const pin = getSessionReviewPin();
    if (!pin) return;
    if (!completedPin) setCompletedPinState(pin);
    if (!reviewJobRef.current) {
      const job = jobFromPin(pin);
      reviewJobRef.current = job;
      setReviewJob(job);
    }
    if (!parkedResult) setParkedResult(pin.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / memory heal only
  }, []);

  useEffect(() => {
    currentMoveIdxRef.current = currentMoveIdx;
  }, [currentMoveIdx]);

  const stepBoardMove = useCallback(
    (delta: number, animate = true) => {
      const next = Math.max(
        -1,
        Math.min(moves.length - 1, currentMoveIdxRef.current + delta)
      );
      navigateToMove(next, animate);
    },
    [moves.length, navigateToMove]
  );

  useEffect(() => {
    showAnalysisProgressRef.current = showAnalysisProgress;
  }, [showAnalysisProgress]);

  useEffect(() => {
    if (!analysisRunning || !analysisStartedAt) {
      setAnalysisElapsedSec(0);
      return;
    }
    const tick = () => {
      setAnalysisElapsedSec(Math.max(0, Math.floor((Date.now() - analysisStartedAt) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [analysisRunning, analysisStartedAt]);

  const runAnalysis = useCallback(
    async (pgnStr: string, options: { visible: boolean }) => {
      if (!pgnStr.trim()) return;
      const gen = ++analysisGenerationRef.current;
      abortRef.current = false;
      await recheckEngine();
      setContinuationActive(false);
      setContinuationFen(null);
      setContinuationEval(null);
      setContinuationArrow(null);

      const meta = extractGameMeta(pgnStr);
      const job = {
        pgn: pgnStr,
        label: `${meta.white} vs ${meta.black}`,
        gameId: sessionGameIdRef.current,
      };
      reviewJobRef.current = job;
      setReviewJob(job);
      setParkedResult(null);

      const visible = options.visible;
      if (visible) {
        showAnalysisProgressRef.current = true;
        setShowAnalysisProgress(true);
        setAnalysisState("analyzing");
        setMoves([]);
        setSummary(null);
        setReviewResult(null);
        setCurrentMoveIdx(-1);
        currentMoveIdxRef.current = -1;
        setCurrentEval(null);
        // Keep the current board position under the analysis veil — snapping to
        // start caused a visible blink before the overlay settled.
        setProgress({ done: 2, total: 100 });
        setPlayerNames({ white: meta.white, black: meta.black });
        setGameMeta(meta);
        setClocks(extractClocks(pgnStr));
      } else {
        setAnalysisState("analyzing");
        setProgress((p) => (p.total > 0 ? p : { done: 2, total: 100 }));
      }

      setAnalysisRunning(true);
      const analysisStartedAt = Date.now();
      setAnalysisStartedAt(analysisStartedAt);

      try {
        const result = await analyzePgn(
          pgnStr,
          (done, total) => {
            if (abortRef.current || gen !== analysisGenerationRef.current) return;
            setProgress({ done, total });
          },
          depth,
          {
            whiteRating: meta.whiteRating ?? null,
            blackRating: meta.blackRating ?? null,
          }
        );
        if (abortRef.current || gen !== analysisGenerationRef.current) return;

        const viewingAway = !samePgn(displayPgnRef.current, pgnStr);
        setProgress({ done: 100, total: 100 });
        setAnalysisRunning(false);
        setShowAnalysisProgress(false);
        showAnalysisProgressRef.current = false;
        setAnalysisStartedAt(null);

        const durationMs = Math.max(0, Date.now() - analysisStartedAt);
        recordReviewCompleted({
          runId: result.run.runId,
          username: activeUser?.name ?? null,
          reviewerPlatform: activeUser?.platform ?? null,
          whitePlayer: meta.white,
          blackPlayer: meta.black,
          whiteRating: meta.whiteRating,
          blackRating: meta.blackRating,
          result: meta.result,
          plies: result.moves.length,
          depth,
          durationMs,
          source: activeUser?.platform ?? "pgn",
        });
        noteCompletedReview({
          plies: result.moves.length,
          depth,
          durationMs,
        });
        window.dispatchEvent(new CustomEvent("cr_review_logged"));

        if (viewingAway) {
          setParkedResult(result);
          setCompletedPin({
            pgn: job.pgn,
            label: job.label,
            gameId: job.gameId,
            result,
          });
          return;
        }

        setMoves(result.moves);
        setSummary(result.summary);
        setReviewResult(result);
        setSaveReviewMessage(null);
        setAnalysisState("done");
        setReviewReady(true);
        // Keep the job parked so Games pin survives browsing another board.
        setParkedResult(result);
        setCompletedPin({
          pgn: job.pgn,
          label: job.label,
          gameId: job.gameId,
          result,
        });
        // Leave reviewJob set — pin identity for this session.

        setTab("moves");
        // Open finished reviews at the start of the game.
        if (result.moves.length > 0) {
          const startFen = result.moves[0]!.fenBefore || "start";
          setCurrentMoveIdx(-1);
          currentMoveIdxRef.current = -1;
          setCurrentEval(null);
          setBoardPieceAnimMs(0);
          setCurrentFen(startFen);
          currentFenRef.current = startFen;
          lastRenderedFenRef.current = startFen;
          setMoveAnim(null);
        }
        notifySuccess();
      } catch (e) {
        if (gen !== analysisGenerationRef.current) return;
        console.error(e);
        const normalized = normalizeAnalysisError(e);
        trackAppError({
          code: normalized.code,
          message: normalized.message,
          context: { depth, phase: "run-analysis" },
        });
        setAnalysisRunning(false);
        setShowAnalysisProgress(false);
        showAnalysisProgressRef.current = false;
        setAnalysisStartedAt(null);
        setParkedResult(null);
        reviewJobRef.current = null;
        setReviewJob(null);
        setAnalysisState("loading");
        notifyError();
      }
    },
    [depth, recheckEngine, activeUser, noteCompletedReview]
  );

  const clearReviewJob = useCallback(() => {
    reviewJobRef.current = null;
    setReviewJob(null);
    setParkedResult(null);
  }, []);

  const cancelAnalysis = useCallback(() => {
    abortRef.current = true;
    analysisGenerationRef.current += 1;
    setAnalysisRunning(false);
    setShowAnalysisProgress(false);
    showAnalysisProgressRef.current = false;
    setAnalysisStartedAt(null);
    clearReviewJob();
    if (pgn.trim()) {
      setAnalysisState("loading");
    } else {
      setAnalysisState("idle");
    }
    notifyWarning();
  }, [pgn, clearReviewJob]);

  /** Soft-load a PGN onto the board without aborting an in-flight review job. */
  const loadPgn = useCallback((pgnStr: string, opts?: { keepAnalysis?: boolean }) => {
    const parsed = parseGameText(pgnStr);
    if (!parsed.ok) {
      setLoadError(parsed.error);
      return false;
    }
    const keepAnalysis = opts?.keepAnalysis === true;
    setLoadError(null);
    setShareUrl(null);
    setShareError(null);

    if (!keepAnalysis) {
      // Only cancel a *running* analysis. Never drop a finished session pin —
      // browsing another game must leave the Games pin intact.
      if (analysisRunning) {
        abortRef.current = true;
        analysisGenerationRef.current += 1;
        setAnalysisRunning(false);
        setShowAnalysisProgress(false);
        showAnalysisProgressRef.current = false;
        setAnalysisStartedAt(null);
        reviewJobRef.current = null;
        setReviewJob(null);
        setParkedResult(null);
      }
      setAnalysisState("loading");
      setReviewReady(false);
      setShowAnalysisProgress(false);
      showAnalysisProgressRef.current = false;
    }

    const frames = buildPgnReplayFrames(parsed.pgn);
    const last = frames.length > 0 ? frames[frames.length - 1]! : null;
    const targetFen = last?.fenAfter ?? "start";
    const highlight = last ? { from: last.from, to: last.to } : null;

    setPgn(parsed.pgn);
    displayPgnRef.current = parsed.pgn;
    setReplayFrames(frames);
    setGamePlyCount(parsed.moveCount);
    setMoves([]);
    setSummary(null);
    setReviewResult(null);
    setCurrentMoveIdx(-1);
    currentMoveIdxRef.current = -1;
    setCurrentEval(null);
    setContinuationNav(null);
    setContinuationActive(false);
    setContinuationFen(null);
    setContinuationEval(null);
    setContinuationArrow(null);
    setTab("moves");
    // Keep the Chessboard mounted — remounting here is what caused the blink.
    // Snap to the game's final position with zero animation in the same paint.
    setBoardPieceAnimMs(0);
    setCurrentFen(targetFen);
    currentFenRef.current = targetFen;
    lastRenderedFenRef.current = targetFen;
    setMoveAnim(highlight);
    setBoardDimmed(false);
    const meta = extractGameMeta(parsed.pgn);
    setPlayerNames({ white: meta.white, black: meta.black });
    setGameMeta(meta);
    setClocks(extractClocks(parsed.pgn));
    return true;
  }, [analysisRunning]);

  /** Reattach the finished Games pin so soft-browse never drops it. */
  const retainCompletedPin = useCallback(() => {
    const pin = completedPin ?? getSessionReviewPin();
    if (!pin) return null;
    if (!completedPin) setCompletedPin(pin);
    if (!reviewJobRef.current) {
      const job = jobFromPin(pin);
      reviewJobRef.current = job;
      setReviewJob(job);
    }
    if (!parkedResult) setParkedResult(pin.result);
    return pin;
  }, [completedPin, parkedResult, setCompletedPin]);

  /** User pressed Analyze — reveal progress UI or open review if already finished. */
  const requestAnalysisUi = useCallback(() => {
    if (!pgn.trim()) return;
    if (analysisState === "done" && moves.length > 0) {
      hapticTapStrong();
      setTab("moves");
      if (currentMoveIdxRef.current < 0) {
        navigateToMove(-1, false);
      }
      return;
    }
    if (analysisRunning) {
      // Another game is analyzing — board conflict plaque handles Cancel & analyze.
      if (reviewJob && !samePgn(pgn, reviewJob.pgn)) return;
      hapticTapStrong();
      showAnalysisProgressRef.current = true;
      setShowAnalysisProgress(true);
      setAnalysisState("analyzing");
      return;
    }
    const pin = completedPin ?? getSessionReviewPin();
    if (pin && !matchesReviewIdentity({ pgn, gameId: sessionGameId }, pin)) {
      // Finished review still parked — board plaque handles Open / Analyze this.
      return;
    }
    notifyReviewStart();
    void runAnalysis(pgn, { visible: true });
  }, [
    pgn,
    analysisState,
    moves.length,
    analysisRunning,
    reviewJob,
    completedPin,
    sessionGameId,
    runAnalysis,
    navigateToMove,
  ]);

  /** Re-run full analysis (e.g. after depth change or accuracy formula update). */
  const requestReanalysis = useCallback(() => {
    if (!pgn.trim() || analysisRunning) return;
    notifyReviewStart();
    void runAnalysis(pgn, { visible: true });
  }, [pgn, analysisRunning, runAnalysis]);

  const canReanalyze = !!pgn.trim() && reviewReady;
  const canExportPgn = !!pgn.trim();
  const canSaveCurrentReview = !!activeUser && analysisState === "done" && moves.length > 0;

  const applyReviewResult = useCallback(
    (result: ReviewResult, pinMeta?: { pgn: string; label: string; gameId: string | null }) => {
      const nextMoves = result.moves;
      setMoves(nextMoves);
      setSummary(result.summary);
      setReviewResult(result);
      setProgress({ done: 100, total: 100 });
      setAnalysisState("done");
      setReviewReady(true);
      setAnalysisRunning(false);
      setShowAnalysisProgress(false);
      showAnalysisProgressRef.current = false;
      setAnalysisStartedAt(null);
      setSaveReviewMessage(null);
      if (pinMeta) {
        const pin = { ...pinMeta, result };
        setCompletedPin(pin);
        reviewJobRef.current = {
          pgn: pinMeta.pgn,
          label: pinMeta.label,
          gameId: pinMeta.gameId,
        };
        setReviewJob(reviewJobRef.current);
        setParkedResult(result);
      }
      setContinuationNav(null);
      setContinuationActive(false);
      setContinuationFen(null);
      setContinuationEval(null);
      setContinuationArrow(null);
      // Snap finished / restored reviews to the start of the game.
      if (nextMoves.length > 0) {
        const startFen = nextMoves[0]!.fenBefore || "start";
        setCurrentMoveIdx(-1);
        currentMoveIdxRef.current = -1;
        setCurrentEval(null);
        setBoardPieceAnimMs(0);
        setCurrentFen(startFen);
        currentFenRef.current = startFen;
        lastRenderedFenRef.current = startFen;
        setMoveAnim(null);
      } else {
        setCurrentMoveIdx(-1);
        currentMoveIdxRef.current = -1;
        setCurrentEval(null);
        setBoardPieceAnimMs(0);
        setCurrentFen("start");
        currentFenRef.current = "start";
        lastRenderedFenRef.current = "start";
        setMoveAnim(null);
      }
    },
    [setCompletedPin]
  );

  const dismissWelcome = useCallback(() => {
    localStorage.setItem("cr_welcome_dismissed", "1");
    setShowWelcome(false);
    hapticSoft();
  }, []);

  const restoreCompletedPin = useCallback(() => {
    const pin = retainCompletedPin();
    if (!pin) return false;
    setSessionGameId(pin.gameId);
    sessionGameIdRef.current = pin.gameId;
    const loaded = loadPgn(pin.pgn, { keepAnalysis: true });
    if (!loaded) return false;
    applyReviewResult(pin.result, {
      pgn: pin.pgn,
      label: pin.label,
      gameId: pin.gameId,
    });
    setTab("moves");
    return true;
  }, [retainCompletedPin, loadPgn, applyReviewResult]);

  const returnToActiveReview = useCallback(() => {
    hapticSoft();
    const job = reviewJob ?? (completedPin ? jobFromPin(completedPin) : null);
    if (!job) {
      if (restoreCompletedPin()) return;
      setTab("moves");
      return;
    }
    setSessionGameId(job.gameId);
    sessionGameIdRef.current = job.gameId;
    if (analysisRunning) {
      loadPgn(job.pgn, { keepAnalysis: true });
      showAnalysisProgressRef.current = true;
      setShowAnalysisProgress(true);
      setAnalysisState("analyzing");
      setTab("moves");
      return;
    }
    if (parkedResult || completedPin) {
      const parked = parkedResult ?? completedPin!.result;
      loadPgn(job.pgn, { keepAnalysis: true });
      applyReviewResult(parked, {
        pgn: job.pgn,
        label: job.label,
        gameId: job.gameId,
      });
      setTab("moves");
      return;
    }
    if (restoreCompletedPin()) return;
    loadPgn(job.pgn, { keepAnalysis: true });
    setTab("moves");
  }, [
    reviewJob,
    analysisRunning,
    parkedResult,
    completedPin,
    loadPgn,
    applyReviewResult,
    restoreCompletedPin,
  ]);

  const cancelAndAnalyzeCurrent = useCallback(() => {
    if (!pgn.trim()) return;
    hapticHeavy();
    announce("start");
    abortRef.current = true;
    analysisGenerationRef.current += 1;
    setAnalysisRunning(false);
    setShowAnalysisProgress(false);
    showAnalysisProgressRef.current = false;
    setAnalysisStartedAt(null);
    clearReviewJob();
    clearCompletedPin();
    void runAnalysis(pgn, { visible: true });
  }, [pgn, clearReviewJob, clearCompletedPin, runAnalysis]);

  const selectGame = useCallback(
    (pgnStr: string, meta?: { id?: string }) => {
      hapticSelection();
      const pin = retainCompletedPin() ?? completedPin ?? getSessionReviewPin();
      const target = { pgn: pgnStr, gameId: meta?.id ?? null };
      // Jump back to the game that is already analyzing / parked / pinned.
      if (matchesReviewIdentity(target, reviewJob)) {
        if (meta?.id) {
          setSessionGameId(meta.id);
          sessionGameIdRef.current = meta.id;
        }
        returnToActiveReview();
        return;
      }
      if (
        pin &&
        matchesReviewIdentity(target, pin) &&
        !analysisRunning
      ) {
        if (meta?.id) {
          setSessionGameId(meta.id);
          sessionGameIdRef.current = meta.id;
        }
        restoreCompletedPin();
        return;
      }
      // Open another board without killing the in-flight review.
      if (analysisRunning && reviewJob && !matchesReviewIdentity(target, reviewJob)) {
        setSessionGameId(meta?.id ?? null);
        sessionGameIdRef.current = meta?.id ?? null;
        const loaded = loadPgn(pgnStr, { keepAnalysis: true });
        if (!loaded) return;
        setSaveReviewMessage(null);
        return;
      }
      if (pgn.trim() && samePgn(pgnStr, pgn)) {
        if (meta?.id) {
          setSessionGameId(meta.id);
          sessionGameIdRef.current = meta.id;
        }
        setTab("moves");
        if (analysisRunning) {
          showAnalysisProgressRef.current = true;
          setShowAnalysisProgress(true);
        }
        return;
      }
      // Browse another game — never wipe a finished session pin.
      setSessionGameId(meta?.id ?? null);
      sessionGameIdRef.current = meta?.id ?? null;
      const keep = shouldSoftBrowseOtherGame({
        analysisRunning,
        reviewJob,
        pin,
      });
      const loaded = loadPgn(pgnStr, { keepAnalysis: keep });
      if (!loaded) return;
      if (pin && !analysisRunning) {
        // Soft-browse: board shows the new game, pin keeps the finished review.
        retainCompletedPin();
        setMoves([]);
        setSummary(null);
        setReviewResult(null);
        setAnalysisState("loading");
        setReviewReady(false);
        setShowAnalysisProgress(false);
        showAnalysisProgressRef.current = false;
      }
      setSaveReviewMessage(null);
    },
    [
      analysisRunning,
      pgn,
      loadPgn,
      reviewJob,
      completedPin,
      returnToActiveReview,
      restoreCompletedPin,
      retainCompletedPin,
    ]
  );

  const openActiveReview = returnToActiveReview;

  const handleShareReview = useCallback(async () => {
    if (!pgn || !summary || moves.length === 0) return;
    setSharing(true);
    setShareError(null);
    try {
      const result = await createShareLink({
        pgn,
        whiteName: playerNames.white,
        blackName: playerNames.black,
        summary,
        moves,
        run: reviewResult?.run ?? null,
      });
      setShareUrl(shareUrlForId(result.id));
    } catch (e) {
      const normalized = normalizeShareError(e);
      trackAppError({
        code: normalized.code,
        message: normalized.message,
        context: { phase: "share-create" },
      });
      setShareError(normalized.message);
    } finally {
      setSharing(false);
    }
  }, [pgn, summary, moves, playerNames, reviewResult]);

  const refreshSavedReviews = useCallback(async () => {
    if (!activeUser?.name) {
      setSavedReviews([]);
      return;
    }
    setSavedReviewsLoading(true);
    try {
      const items = await listSavedReviews({
        platform: activeUser.platform,
        username: activeUser.name,
      });
      setSavedReviews(items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load saved games";
      setSaveReviewMessage(msg);
    } finally {
      setSavedReviewsLoading(false);
    }
  }, [activeUser]);

  useEffect(() => {
    void refreshSavedReviews();
  }, [refreshSavedReviews]);

  const handleSaveReview = useCallback(async () => {
    if (!activeUser?.name) {
      setSaveReviewMessage("Link a profile to save games.");
      notifyWarning();
      return;
    }
    if (!pgn || !reviewResult || !summary || moves.length === 0) {
      setSaveReviewMessage("Complete a review first, then save.");
      notifyWarning();
      return;
    }
    hapticTapStrong();
    setSavingReview(true);
    setSaveReviewMessage(null);
    try {
      await saveReviewToCloud({
        platform: activeUser.platform,
        username: activeUser.name,
        pgn,
        whiteName: playerNames.white,
        blackName: playerNames.black,
        summary,
        moves,
        run: reviewResult.run ?? null,
      });
      setSaveReviewMessage("Saved to your account.");
      await refreshSavedReviews();
      notifySuccess();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Could not save game";
      setSaveReviewMessage(
        /not found|unavailable/i.test(raw)
          ? "Cloud save is unavailable right now. Try again shortly."
          : raw
      );
      notifyError();
    } finally {
      setSavingReview(false);
    }
  }, [activeUser, pgn, reviewResult, summary, moves, playerNames, refreshSavedReviews]);

  const handleDownloadPgn = useCallback(() => {
    if (!pgn.trim()) return;
    hapticTap();
    downloadPgn(pgn, buildPgnFilename(playerNames.white, playerNames.black));
    setSaveReviewMessage("PGN downloaded.");
    notifySuccess();
    window.setTimeout(() => setSaveReviewMessage(null), 2500);
  }, [pgn, playerNames.white, playerNames.black]);

  const handleCopyPgn = useCallback(() => {
    if (!pgn.trim()) return;
    void (async () => {
      hapticTap();
      const ok = await copyPgnToClipboard(pgn);
      if (ok) {
        setSaveReviewMessage("PGN copied.");
        notifySuccess();
      } else {
        setSaveReviewMessage("Could not copy PGN.");
        notifyError();
      }
      window.setTimeout(() => setSaveReviewMessage(null), 2500);
    })();
  }, [pgn]);

  const handleOpenSavedReview = useCallback(
    async (id: string) => {
      if (!activeUser?.name) return;
      try {
        const saved = await loadSavedReviewById({
          id,
          platform: activeUser.platform,
          username: activeUser.name,
        });
        setSessionGameId(null);
        const loaded = loadPgn(saved.pgn);
        if (!loaded) return;
        const fallbackRun = {
          runId: "saved-review",
          engineVersion: "saved",
          startedAt: new Date(saved.savedAt).toISOString(),
          finishedAt: new Date(saved.savedAt).toISOString(),
          requestedDepth: depth,
          fastDepth: depth,
          deepDepth: depth,
          backendPolicy: "consensus" as const,
          pgnHash: "saved",
        };
        const loadedResult: ReviewResult = {
          moves: saved.moves,
          summary: saved.summary,
          run: saved.run ?? reviewResult?.run ?? fallbackRun,
        };
        applyReviewResult(loadedResult, {
          pgn: saved.pgn,
          label: `${saved.whiteName} vs ${saved.blackName}`,
          gameId: null,
        });
      } catch (e) {
        setSaveReviewMessage(e instanceof Error ? e.message : "Could not open saved game");
      }
    },
    [activeUser, loadPgn, reviewResult, depth, applyReviewResult]
  );

  const handleDeleteSavedReview = useCallback(
    async (id: string) => {
      if (!activeUser?.name) return;
      try {
        await deleteSavedReview({
          id,
          platform: activeUser.platform,
          username: activeUser.name,
        });
        await refreshSavedReviews();
      } catch (e) {
        setSaveReviewMessage(e instanceof Error ? e.message : "Could not delete saved game");
      }
    },
    [activeUser, refreshSavedReviews]
  );

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
    if (isCovered) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        stepBoardMove(1, true);
      } else if (e.key === "ArrowLeft") {
        stepBoardMove(-1, true);
      } else if (e.key === "ArrowUp") {
        navigateToMove(-1, false);
        hapticSoft();
      } else if (e.key === "ArrowDown") {
        navigateToMove(moves.length - 1, false);
        hapticSoft();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCovered, moves.length, navigateToMove, stepBoardMove]);

  useEffect(() => {
    if (!activeUser?.name?.trim() || !pgn) return;
    const u = activeUser.name.trim().toLowerCase();
    const w = playerNames.white.trim().toLowerCase();
    const b = playerNames.black.trim().toLowerCase();
    const matches = (tag: string) =>
      tag.length > 0 && (tag === u || tag.includes(u) || u.includes(tag));
    if (matches(b)) setBoardFlipped(true);
    else if (matches(w)) setBoardFlipped(false);
  }, [activeUser, pgn, playerNames.white, playerNames.black]);

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

  const rawProgressPercent =
    progress.total === 100
      ? progress.done
      : progress.total > 0
        ? (progress.done / progress.total) * 100
        : 0;

  const isViewingAway = !!(
    reviewJob &&
    analysisRunning &&
    !samePgn(pgn, reviewJob.pgn)
  );

  const pinForAway = completedPin ?? getSessionReviewPin();
  const isViewingAwayFromCompleted = !!(
    pinForAway &&
    !analysisRunning &&
    pgn.trim() &&
    !matchesReviewIdentity(
      { pgn, gameId: sessionGameId },
      pinForAway
    )
  );

  const isAnalyzing = analysisRunning && analysisState === "analyzing" && !isViewingAway;

  const analysisPlyCount = gamePlyCount || replayFrames.length;

  const { percent: progressPercent, remainingMs: analysisRemainingMs } =
    usePredictedAnalysisProgress(
      analysisState,
      rawProgressPercent,
      analysisStartedAt,
      analysisPlyCount,
      depth,
      timingModel
    );

  const analyzingReplayPly =
    replayFrames.length > 0
      ? progressToReplayPly(progressPercent, 100, replayFrames.length)
      : -1;
  const analyzingMoveSan =
    analyzingReplayPly >= 0 ? replayFrames[analyzingReplayPly]?.san : undefined;
  const analysisStage = analysisStageLabel(progressPercent, depth);
  const analysisEtaLabel = formatEtaGuess(
    remainingEtaSeconds(analysisRemainingMs)
  );

  const vsLabel = `${playerNames.white} vs ${playerNames.black}`;
  const activeReview = useMemo(() => {
    const pin = completedPin ?? getSessionReviewPin();
    return resolveActiveReview({
      reviewJob,
      analysisRunning,
      parkedResult,
      pin,
      progressPercent,
      pgn,
      analysisState,
      movesLength: moves.length,
      sessionGameId,
      vsLabel,
    });
  }, [
    reviewJob,
    analysisRunning,
    parkedResult,
    completedPin,
    progressPercent,
    pgn,
    analysisState,
    moves.length,
    sessionGameId,
    vsLabel,
  ]);

  const reviewConflict = isViewingAway
    ? {
        runningLabel: reviewJob!.label,
        progressPercent,
        onWait: returnToActiveReview,
        onCancelAndAnalyze: cancelAndAnalyzeCurrent,
      }
    : isViewingAwayFromCompleted
      ? {
          runningLabel: pinForAway!.label,
          progressPercent: 100,
          done: true,
          onWait: returnToActiveReview,
          onCancelAndAnalyze: cancelAndAnalyzeCurrent,
        }
      : null;

  const boardPositionFen = continuationFen ?? currentFen;
  // Glow only while browsing the engine line — not when a best-move arrow is
  // merely previewed for inaccuracy/mistake/blunder.
  const engineLineGlow = shouldShowEngineLineGlow({
    continuationActive,
    continuationFen,
  });

  const boardLastMoveHighlight = useMemo(() => {
    // Only leave the game-move highlight when the board fen is actually on a
    // continuation (user stepped into the better line). Mounting the viewer
    // alone used to clear highlights via continuationActive and hid badges.
    if (continuationFen) {
      if (currentMoveIdx > 0) {
        return highlightFromMove(moves[currentMoveIdx - 1] ?? {});
      }
      return null;
    }
    if (currentMoveIdx >= 0) {
      return highlightFromMove(moves[currentMoveIdx] ?? {}) ?? moveAnim;
    }
    return moveAnim;
  }, [continuationFen, moveAnim, currentMoveIdx, moves]);

  useAnalysisBoardReplay({
    active: isAnalyzing,
    replayFrames,
    progressDone: progressPercent,
    progressTotal: 100,
    setBoardToFen,
    clearBoardTimers,
    setMoveAnim,
    getCurrentFen: () => currentFenRef.current,
  });

  const [showDepth, setShowDepth] = useState(false);
  const [desktopEvalGraphOpen, setDesktopEvalGraphOpen] = useState(false);
  const [mobileEvalGraphOpen, setMobileEvalGraphOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem("cr_welcome_dismissed")
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 480,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const winWidth = viewport.w;
  const isMobileLayout = winWidth < 1024;
  const desktopBoardSize = computeDesktopBoardSize(viewport.w, viewport.h, {
    evalGraphOpen: desktopEvalGraphOpen,
    // Reserve coach column whenever a game is loaded so the board width does
    // not jump when moves appear/clear during open ↔ analyze transitions.
    hasAnalyzedMoves: moves.length > 0 || !!pgn.trim(),
  });
  const mobileInlinePad = 12;
  const mobileEvalBar = MOBILE_LAYOUT.evalBar;
  const mobileFullWidthBoard = Math.max(
    240,
    Math.floor(winWidth - mobileInlinePad - mobileEvalBar)
  );
  const mobileReviewing =
    isMobileLayout &&
    tab === "moves" &&
    (moves.length > 0 || (!!pgn && isAnalyzing));
  const boardWidth =
    winWidth < 1024
      ? mobileReviewing
        ? computeMobileBoardSize(viewport.w, viewport.h, {
            evalGraphOpen: mobileEvalGraphOpen && moves.length > 0,
          })
        : mobileFullWidthBoard
      : desktopBoardSize;

  const showBoardAnalyzeOverlay =
    !!pgn &&
    (!isMobileLayout || tab === "moves") &&
    (isViewingAway ||
      isViewingAwayFromCompleted ||
      isAnalyzing ||
      (moves.length === 0 && analysisState === "loading"));

  const showBoardProgressOrb = false;

  const showBoardMoveNav = !isAnalyzing && moves.length > 0;
  const canBoardStepBack = showBoardMoveNav && currentMoveIdx > -1;
  const canBoardStepForward =
    showBoardMoveNav && currentMoveIdx < moves.length - 1;

  // Only show the game-end verdict when:
  //  - PGN actually has a result
  //  - analysis is complete (so we know the final position is real)
  //  - the user is sitting on the last analyzed move
  //  - the board is showing the true final position (no continuation hop)
  //  - not in an analyze-CTA state
  const showBoardGameEnd =
    !!gameEnd &&
    atGameEnd &&
    analysisState === "done" &&
    !continuationFen &&
    !showBoardAnalyzeOverlay;

  return (
    <div className="h-full min-h-0 overflow-hidden bg-chess-bg text-chess-text font-sans flex flex-col">
      <h1 className="sr-only">
        ChessReview — Free chess game analysis online for club and amateur players
      </h1>
      <header className="relative z-50 flex flex-shrink-0 items-center gap-2 sm:gap-3 page-inline-pad min-h-[var(--app-header-h)] py-2 bg-chess-panel after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-chess-border after:via-chess-accent/30 after:to-chess-border">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-chess-accent/25 to-chess-accent/[0.04] border border-chess-accent/35 text-chess-accent select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5.5 21h13l-.7-3.4H6.2L5.5 21zM6.5 16h11l-.5-2H7L6.5 16zM7.2 12.6h9.6c-.3-1-1-2.4-2-3.4l1.7-1.7-1.4-1.4-1.7 1.7c-1-1-2.4-1.7-3.4-2L11 4l-1.6.4c-1 .3-2.4 1-3.4 2L4.3 4.7 2.9 6.1l1.7 1.7c-1 1-1.7 2.4-2 3.4l4.6 1.4zM12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
            </svg>
          </span>
          <span className="font-bold text-[17px] tracking-tight leading-none inline-flex items-baseline">
            <span className="text-chess-subtext">Chess</span>
            <span className="text-chess-accent">Review</span>
            <span className="ml-0.5 text-chess-muted font-medium text-xs tracking-normal">
              .org
            </span>
          </span>
        </div>
        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <EngineDepthControls
            depth={depth}
            engineBackend={engineBackend}
            hasRemoteEngine={hasRemoteEngine}
            onDepthChange={handleDepthChange}
            onRetry={hasRemoteEngine ? () => void recheckEngine() : undefined}
            showDepthMenu={showDepth}
            onToggleDepthMenu={() => setShowDepth((v) => !v)}
            onCloseDepthMenu={() => setShowDepth(false)}
          />

          <ProfileMenu
            open={showAddProfile}
            onToggle={() => setShowAddProfile((v) => !v)}
            onClose={() => setShowAddProfile(false)}
            profiles={profiles}
            activeProfileIdx={activeProfileIdx}
            activeUser={activeUser}
            onSwitchProfile={switchProfile}
            onRemoveProfile={removeProfile}
            addPlatform={addProfilePlatform}
            onAddPlatformChange={(p) => {
              setAddProfilePlatform(p);
              setAddProfileError(null);
            }}
            addName={addProfileName}
            onAddNameChange={(v) => {
              setAddProfileName(v);
              setAddProfileError(null);
            }}
            addLoading={addProfileLoading}
            addError={addProfileError}
            onAddSubmit={() =>
              void addProfile(addProfileName.trim(), addProfilePlatform)
            }
            onCancelAdd={cancelAddProfile}
            savedCount={savedReviews.length}
            savedLoading={savedReviewsLoading}
            onOpenSavedGames={() => {
              setShowSavedGamesModal(true);
              void refreshSavedReviews();
            }}
          />
        </div>
      </header>

      {loadError && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-red-900/40">
          <InlineErrorNotice
            message={loadError}
            onDismiss={() => {
              setLoadError(null);
            }}
          />
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Mobile bottom tab bar ── */}
        {/* Rendered inside the sidebar on desktop; on mobile it's a fixed bottom bar */}
        <div
          className="lg:hidden fixed left-0 right-0 z-50 border-t border-chess-border bg-chess-panel shadow-[0_-4px_14px_rgba(0,0,0,0.4)]"
          style={{ bottom: "var(--mobile-footer-stack)" }}
        >
          <div className="page-inline-pad flex min-h-[56px]">
          {(["games", "moves", "review"] as SidebarTab[]).map((t) => {
            const isActive = tab === t;
            const label = t === "games" ? "Games" : t === "moves" ? "Moves" : "Review";
            const icon =
              t === "games" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="14" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M8 6V4M16 6V4" />
                </svg>
              ) : t === "moves" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 3l-1 2-2 .5L13 8l-1 3 3-1.5L18 11l-.5-3 2-2-3-.3L14 3z M11 13l-2 2-3 .5 2 2.5-1 3 3-1.5 3 1.5-1-3 2-2.5-3-.5-2-2z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21V10M9 21V4M15 21v-8M21 21V8" />
                </svg>
              );
            return (
              <button
                key={t}
                onClick={() => {
                  hapticSelection();
                  setTab(t);
                }}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 px-2 transition-colors ${
                  isActive ? "text-chess-accent" : "text-chess-muted"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 inset-x-6 h-0.5 rounded-b bg-chess-accent" />
                )}
                {icon}
                <span className={`text-[10px] uppercase tracking-wider ${isActive ? "font-bold" : "font-semibold"}`}>{label}</span>
              </button>
            );
          })}
          </div>
        </div>

        {/* Sidebar — desktop only (avoid duplicate GameList fetch on mobile) */}
        {isDesktop && (
        <aside className="w-72 flex-shrink-0 bg-chess-sidebar border-r border-chess-border flex flex-col overflow-hidden">
          <div className="flex bg-chess-bg/40 border-b border-chess-border">
            {(["games", "moves", "review"] as SidebarTab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  hapticSelection();
                  setTab(t);
                }}
                className={`relative flex-1 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                  tab === t
                    ? "text-chess-accent"
                    : "text-chess-muted hover:text-chess-text"
                }`}
              >
                {t === "games" ? "Games" : t === "moves" ? "Moves" : "Review"}
                {tab === t && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-chess-accent" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col overscroll-contain">
            {tab === "games" && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {showWelcome && !pgn && (
                  <div className="px-3 pt-3 flex-shrink-0">
                    <WelcomeBanner onDismiss={dismissWelcome} />
                  </div>
                )}
                <GameList
                  username=""
                  onGameSelect={selectGame}
                  onLinkProfile={openProfilePanel}
                  selectedGameId={sessionGameId ?? undefined}
                  activeReview={activeReview}
                  onOpenActiveReview={openActiveReview}
                />
              </div>
            )}


            {tab === "moves" && (
              <div className="flex flex-col h-full overflow-y-auto min-h-0">
                {pgn ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-chess-border flex-shrink-0 gap-2">
                      <span className="text-xs text-chess-muted font-semibold uppercase tracking-wider truncate min-w-0">
                        {playerNames.white} vs {playerNames.black}
                      </span>
                      {isViewingAway ? (
                        <button
                          type="button"
                          onClick={returnToActiveReview}
                          className="flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-chess-border-strong bg-chess-surface text-[11px] font-semibold text-chess-accent hover:border-chess-accent/40"
                        >
                          Wait · {Math.round(progressPercent)}%
                        </button>
                      ) : isViewingAwayFromCompleted ? (
                        <button
                          type="button"
                          onClick={returnToActiveReview}
                          className="flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-chess-border-strong bg-chess-surface text-[11px] font-semibold text-chess-accent hover:border-chess-accent/40"
                        >
                          Open review
                        </button>
                      ) : analysisState === "loading" ? (
                        <AnalyzeNowButton
                          variant="compact"
                          onClick={() => requestAnalysisUi()}
                        />
                      ) : null}
                      {isAnalyzing && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] text-chess-accent font-semibold tabular-nums">
                          <span className="h-1.5 w-1.5 rounded-full bg-chess-accent animate-pulse" />
                          {Math.round(progressPercent)}%
                        </span>
                      )}
                    </div>

                    <div className="p-2">
                      {moves.length > 0 ? (
                        <MoveList
                          moves={moves}
                          currentMoveIndex={currentMoveIdx}
                          onMoveSelect={navigateToMove}
                          markGameEnd={!!gameEnd}
                        />
                      ) : isAnalyzing ? (
                        <AnalyzingMoveList
                          frames={replayFrames}
                          currentPly={analyzingReplayPly}
                        />
                      ) : isViewingAway ? (
                        <div className="flex flex-col items-center justify-center h-full text-chess-muted text-xs gap-2 px-3 text-center">
                          <span>
                            Another review is running. Cancel it on the board to
                            analyze this game, or wait for it to finish.
                          </span>
                        </div>
                      ) : isViewingAwayFromCompleted ? (
                        <div className="flex flex-col items-center justify-center h-full text-chess-muted text-xs gap-2 px-3 text-center">
                          <span>
                            Your last review is still open. Tap Open review to
                            return, or analyze this game instead.
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-chess-muted text-xs gap-2 px-3 text-center">
                          {analysisState === "loading" && (
                            <span>Use Analyze now on the board or sidebar</span>
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
                      className="text-sm font-semibold text-chess-accent hover:text-chess-accent-hover transition-colors"
                    >
                      Go to Games →
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "review" && (
              <div className="h-full overflow-y-auto min-h-0">
                {summary ? (
                  <>
                    <ReviewSummaryPanel
                      summary={summary}
                      whiteName={playerNames.white}
                      blackName={playerNames.black}
                      moves={moves}
                      run={reviewResult?.run}
                      onMoveClick={(idx) => { navigateToMove(idx); setTab("moves"); }}
                      onShare={() => void handleShareReview()}
                      sharing={sharing}
                      shareUrl={shareUrl}
                      shareError={shareError}
                    />
                  </>
                ) : (
                  <ReviewEmptyState onGoToGames={() => setTab("games")} />
                )}
              </div>
            )}
          </div>
        </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* ── Desktop board area ── */}
          <div className="hidden lg:flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex flex-1 items-center justify-center px-4 py-3 gap-4 min-h-0 overflow-hidden">
            <div className="flex items-stretch gap-2 max-h-full">
              <div className="relative flex flex-col gap-1">
                {isAnalyzing && replayFrames.length > 0 ? (
                  <div className="pl-[34px]">
                    <BoardAnalysisStrip
                      progressPercent={progressPercent}
                      currentPly={analyzingReplayPly + 1}
                      totalPlies={replayFrames.length}
                      currentSan={analyzingMoveSan}
                      stageLabel={analysisStage}
                      etaLabel={analysisEtaLabel}
                    />
                  </div>
                ) : (
                  <div className="pl-[34px]">
                    <PlayerTag
                      name={boardFlipped ? playerNames.white : playerNames.black}
                      color={boardFlipped ? "white" : "black"}
                      rating={boardFlipped ? gameMeta?.whiteRating : gameMeta?.blackRating}
                      result={gameMeta?.result ?? null}
                      isLastMove={currentMoveIdx === moves.length - 1}
                      clock={(() => {
                        const topIsBlack = !boardFlipped;
                        for (let i = currentMoveIdx; i >= 0; i--) {
                          const isBlackMove = i % 2 === 1;
                          if (topIsBlack === isBlackMove && clocks[i] !== undefined && clocks[i] !== null) return clocks[i];
                        }
                        return null;
                      })()}
                      clockColor={boardFlipped ? "w" : "b"}
                      side={boardFlipped ? "w" : "b"}
                    />
                  </div>
                )}
                <div className="flex items-stretch gap-1.5">
                <EvalBar
                  evalResult={continuationEval ?? currentEval}
                  boardFlipped={boardFlipped}
                  barHeight={desktopBoardSize}
                />
                <AnalyzeBoardStack
                  position={boardPositionFen}
                  boardWidth={desktopBoardSize}
                  boardOrientation={boardFlipped ? "black" : "white"}
                  animationDuration={boardPieceAnimMs}
                  remountKey={boardRemountKey}
                  dimmed={boardDimmed && !continuationFen && !isAnalyzing}
                  continuationActive={continuationActive}
                  engineLineGlow={engineLineGlow}
                  lastMoveHighlight={boardLastMoveHighlight}
                  moveClassification={boardMoveClassification(
                    currentMove?.classification,
                    { continuationFen, isAnalyzing }
                  )}
                  continuationArrow={continuationArrow}
                  showBestMoveArrow={
                    !continuationActive &&
                    !isAnalyzing &&
                    !showBoardGameEnd &&
                    !!showBestMove &&
                    coachShowsBestWas(currentMove)
                  }
                  bestMove={currentMove?.bestMove}
                  analysisState={analysisState}
                  showAnalyzeButton={showBoardAnalyzeOverlay}
                  showGameEnd={showBoardGameEnd}
                  gameEnd={gameEnd}
                  whiteName={playerNames.white}
                  blackName={playerNames.black}
                  onAnalyze={pgn ? () => requestAnalysisUi() : undefined}
                  onCancelAnalysis={isAnalyzing ? () => cancelAnalysis() : undefined}
                  progressPercent={progressPercent}
                  analysisStageLabel={analysisStage}
                  analyzingMoveSan={analyzingMoveSan}
                  analysisEtaLabel={analysisEtaLabel}
                  showProgressOrb={showBoardProgressOrb}
                  reviewConflict={reviewConflict}
                />
                </div>
                <div className="pl-[34px]">
                  <PlayerTag
                    name={boardFlipped ? playerNames.black : playerNames.white}
                    color={boardFlipped ? "black" : "white"}
                    rating={boardFlipped ? gameMeta?.blackRating : gameMeta?.whiteRating}
                    result={gameMeta?.result ?? null}
                    isLastMove={currentMoveIdx === moves.length - 1}
                    clock={(() => {
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
                <BoardReviewActions
                  canReanalyze={canReanalyze}
                  canSave={canSaveCurrentReview}
                  canExportPgn={canExportPgn}
                  saving={savingReview}
                  isAnalyzing={isAnalyzing}
                  saveMessage={saveReviewMessage}
                  onReanalyze={requestReanalysis}
                  onSave={() => void handleSaveReview()}
                  onDownloadPgn={handleDownloadPgn}
                  onCopyPgn={handleCopyPgn}
                  className="pl-[34px] pt-1.5"
                />
              </div>

              <div className="flex flex-col items-stretch gap-1 w-11">
                <button
                  onClick={() => {
                    hapticSoft();
                    setBoardFlipped((f: boolean) => !f);
                  }}
                  className="board-nav-btn"
                  title="Flip board"
                  aria-label="Flip board"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4l-3 3 3 3" />
                    <path d="M4 7h12a4 4 0 0 1 4 4" />
                    <path d="M17 20l3-3-3-3" />
                    <path d="M20 17H8a4 4 0 0 1-4-4" />
                  </svg>
                </button>
                {moves.length > 0 && (
                  <>
                    <div className="h-px bg-chess-border my-1" />
                    <button
                      onClick={() => {
                        navigateToMove(-1, false);
                      }}
                      className="board-nav-btn"
                      title="Go to start"
                      aria-label="Go to start"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM10 12l8-7v14z" /></svg>
                    </button>
                    <button
                      onClick={() => stepBoardMove(-1)}
                      disabled={currentMoveIdx <= -1 || isAnalyzing}
                      className="board-nav-btn"
                      title="Previous move"
                      aria-label="Previous move"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 5l-9 7 9 7z" /></svg>
                    </button>
                    <button
                      onClick={() => stepBoardMove(1)}
                      disabled={currentMoveIdx >= moves.length - 1 || isAnalyzing}
                      className="board-nav-btn board-nav-btn--primary"
                      title="Next move"
                      aria-label="Next move"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5l9 7-9 7z" /></svg>
                    </button>
                    <button
                      onClick={() => {
                        navigateToMove(moves.length - 1, false);
                      }}
                      className="board-nav-btn"
                      title="Go to end"
                      aria-label="Go to end"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM6 5l8 7-8 7z" /></svg>
                    </button>
                  </>
                )}
              </div>

              {/* Coach panel — move notes, eval, engine line */}
              {moves.length > 0 && (
                <div className="w-56 flex-shrink-0 flex flex-col bg-chess-panel border border-chess-border rounded-lg overflow-hidden self-stretch shadow-md">
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-chess-border bg-chess-bg/40 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-chess-text uppercase tracking-[0.08em]">
                      <span className="h-1.5 w-1.5 rounded-full bg-chess-accent" />
                      Coach
                    </span>
                    <EvalBadge
                      evalResult={continuationEval ?? currentEval}
                      compact
                      boardFlipped={boardFlipped}
                    />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-chess-border/70 flex-shrink-0">
                    <span className="text-[11px] text-chess-subtext">Best-move arrow</span>
                    <button
                      type="button"
                      onClick={() => {
                        hapticToggle();
                        setShowBestMove((b) => !b);
                      }}
                      role="switch"
                      aria-checked={showBestMove}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        showBestMove ? "bg-chess-accent" : "bg-chess-border"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          showBestMove ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                    <MoveReviewPanel
                      move={currentMove}
                      moveIdx={currentMoveIdx}
                      moves={moves}
                      runId={reviewResult?.run.runId}
                      onContinuationFen={handleContinuationFen}
                      onContinuationEval={handleContinuationEval}
                      onContinuationActive={handleContinuationActive}
                      onContinuationArrow={handleContinuationArrow}
                      onRegisterContinuationNav={handleRegisterContinuationNav}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          {moves.length > 0 && (
            <EvalChartPanel
              className="hidden lg:block"
              moves={moves}
              currentMoveIndex={currentMoveIdx}
              onMoveSelect={navigateToMove}
              open={desktopEvalGraphOpen}
              onOpenChange={setDesktopEvalGraphOpen}
            />
          )}

          {/* ── Mobile: one shell for Games / Moves / Review (shared header padding) ── */}
          <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
            <div
              className={`flex-1 min-h-0 overflow-hidden flex flex-col bg-chess-sidebar ${
                tab === "games" ? "" : "hidden"
              }`}
              style={{ paddingBottom: "var(--mobile-chrome-bottom)" }}
            >
                {showWelcome && !pgn && (
                  <div className="page-inline-pad pt-2 flex-shrink-0 w-full">
                    <WelcomeBanner onDismiss={dismissWelcome} />
                  </div>
                )}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <GameList
                    username=""
                    onGameSelect={selectGame}
                    onLinkProfile={openProfilePanel}
                    selectedGameId={sessionGameId ?? undefined}
                    activeReview={activeReview}
                    onOpenActiveReview={openActiveReview}
                  />
                </div>
            </div>

            <div
              className={`flex-1 overflow-y-auto min-h-0 page-inline-pad pt-2 mobile-review-scroll ${
                tab === "review" ? "" : "hidden"
              }`}
              style={{ paddingBottom: "var(--mobile-chrome-bottom)" }}
            >
                <div className="w-full">
                {summary ? (
                  <ReviewSummaryPanel
                      summary={summary}
                      whiteName={playerNames.white}
                      blackName={playerNames.black}
                      moves={moves}
                      run={reviewResult?.run}
                      onMoveClick={(idx) => {
                        navigateToMove(idx);
                        setTab("moves");
                      }}
                      onShare={() => void handleShareReview()}
                      sharing={sharing}
                      shareUrl={shareUrl}
                      shareError={shareError}
                  />
                ) : (
                  <ReviewEmptyState onGoToGames={() => setTab("games")} />
                )}
                </div>
              </div>

            <div
              className={`flex flex-col flex-1 min-h-0 overflow-hidden ${
                tab === "moves" ? "" : "hidden"
              }`}
            >
            <div className="flex-shrink-0 page-inline-pad pt-1.5 pb-0">
              {moves.length > 0 || (pgn && (tab === "moves" || isAnalyzing)) ? (
                <div className="review-flow-stack w-full">
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
                  position={boardPositionFen}
                  boardWidth={boardWidth}
                  boardOrientation={boardFlipped ? "black" : "white"}
                  animationDuration={boardPieceAnimMs}
                  remountKey={boardRemountKey}
                  dimmed={boardDimmed && !continuationFen && !isAnalyzing}
                  continuationActive={continuationActive}
                  engineLineGlow={engineLineGlow}
                  lastMoveHighlight={boardLastMoveHighlight}
                  moveClassification={boardMoveClassification(
                    currentMove?.classification,
                    { continuationFen, isAnalyzing }
                  )}
                  continuationArrow={continuationArrow}
                  showBestMoveArrow={
                    !isAnalyzing &&
                    !continuationActive &&
                    !!showBestMove &&
                    coachShowsBestWas(currentMove)
                  }
                  bestMove={currentMove?.bestMove}
                  analysisState={analysisState}
                  showAnalyzeButton={showBoardAnalyzeOverlay}
                  showGameEnd={showBoardGameEnd}
                  gameEnd={gameEnd}
                  whiteName={playerNames.white}
                  blackName={playerNames.black}
                  onAnalyze={pgn ? () => requestAnalysisUi() : undefined}
                  onCancelAnalysis={isAnalyzing ? () => cancelAnalysis() : undefined}
                  progressPercent={progressPercent}
                  analysisStageLabel={analysisStage}
                  analyzingMoveSan={analyzingMoveSan}
                  analysisEtaLabel={analysisEtaLabel}
                  showProgressOrb={showBoardProgressOrb}
                  analyzingPly={analyzingReplayPly}
                  analyzingTotalPlies={replayFrames.length}
                  reviewConflict={reviewConflict}
                  onPrev={(animate = true) => stepBoardMove(-1, animate)}
                  onNext={(animate = true) => stepBoardMove(1, animate)}
                  canPrev={canBoardStepBack}
                  canNext={canBoardStepForward}
                />
              <PlayerTag
                compact
                name={boardFlipped ? playerNames.black : playerNames.white}
                color={boardFlipped ? "black" : "white"}
                rating={boardFlipped ? gameMeta?.blackRating : gameMeta?.whiteRating}
                result={gameMeta?.result ?? null}
                isLastMove={currentMoveIdx === moves.length - 1}
                side={boardFlipped ? "b" : "w"}
                trailing={
                  <MobileBoardControls
                    moveIndex={currentMoveIdx}
                    moveCount={
                      gamePlyCount || moves.length || replayFrames.length
                    }
                    onFlip={() => setBoardFlipped((f) => !f)}
                    leading={
                      (canReanalyze || canSaveCurrentReview || canExportPgn) ? (
                        <BoardReviewActions
                          inline
                          canReanalyze={canReanalyze}
                          canSave={canSaveCurrentReview}
                          canExportPgn={canExportPgn}
                          saving={savingReview}
                          isAnalyzing={isAnalyzing}
                          saveMessage={null}
                          onReanalyze={requestReanalysis}
                          onSave={() => void handleSaveReview()}
                          onDownloadPgn={handleDownloadPgn}
                          onCopyPgn={handleCopyPgn}
                        />
                      ) : undefined
                    }
                  />
                }
              />
              {moves.length > 0 && (
                <EvalChartPanel
                  moves={moves}
                  currentMoveIndex={currentMoveIdx}
                  onMoveSelect={navigateToMove}
                  open={mobileEvalGraphOpen}
                  onOpenChange={setMobileEvalGraphOpen}
                  docked
                />
              )}
                </div>
              ) : (
                <MobileGameHero
                  boardWidth={boardWidth}
                  boardOrientation={boardFlipped ? "black" : "white"}
                  whiteName={playerNames.white}
                  blackName={playerNames.black}
                  whiteRating={gameMeta?.whiteRating}
                  blackRating={gameMeta?.blackRating}
                  hasGame={false}
                />
              )}
            </div>
            {moves.length > 0 && (
              <div
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-review-scroll mobile-coach-pane page-inline-pad border-t border-chess-border/40"
                style={{ paddingBottom: "var(--mobile-chrome-bottom)" }}
              >
                {saveReviewMessage && (
                  <p className="text-[10px] text-chess-subtext text-center pt-2 pb-1">
                    {saveReviewMessage}
                  </p>
                )}
                {continuationNav && (
                  <EngineLineNavBar nav={continuationNav} />
                )}
                <div className="review-flow-coach">
                  <MoveReviewPanel
                    move={currentMove}
                    moveIdx={currentMoveIdx}
                    moves={moves}
                    runId={reviewResult?.run.runId}
                    onContinuationFen={handleContinuationFen}
                    onContinuationEval={handleContinuationEval}
                    onContinuationActive={handleContinuationActive}
                    onContinuationArrow={handleContinuationArrow}
                    onRegisterContinuationNav={handleRegisterContinuationNav}
                    embedded
                  />
                </div>
              </div>
            )}
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />

      <SavedGamesModal
        open={showSavedGamesModal}
        onClose={() => setShowSavedGamesModal(false)}
        loading={savedReviewsLoading}
        items={savedReviews}
        onOpen={(id) => {
          void handleOpenSavedReview(id);
          setShowSavedGamesModal(false);
          setShowAddProfile(false);
          setTab("moves");
        }}
        onDelete={(id) => void handleDeleteSavedReview(id)}
      />
    </div>
  );
}

function MobileBoardControls({
  moveIndex,
  moveCount,
  onFlip,
  leading,
}: {
  moveIndex: number;
  moveCount: number;
  onFlip: () => void;
  leading?: React.ReactNode;
}) {
  if (moveCount <= 0) {
    return (
      <div className="ml-auto flex items-center gap-1.5">
        {leading}
        <button
          type="button"
          onClick={onFlip}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-chess-border bg-chess-surface text-chess-subtext active:bg-chess-hover transition-colors touch-manipulation"
          aria-label="Flip board"
        >
          <FlipBoardIcon />
        </button>
      </div>
    );
  }

  const label = formatChessMoveCounter(moveIndex, moveCount);

  return (
    <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
      {leading}
      <span
        className="text-[11px] text-chess-muted font-mono tabular-nums"
        title="Full move number"
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onFlip}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-chess-border bg-chess-surface text-chess-subtext active:bg-chess-hover transition-colors touch-manipulation"
        aria-label="Flip board"
      >
        <FlipBoardIcon />
      </button>
    </div>
  );
}

function FlipBoardIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 4l-3 3 3 3" />
      <path d="M4 7h12a4 4 0 0 1 4 4" />
      <path d="M17 20l3-3-3-3" />
      <path d="M20 17H8a4 4 0 0 1-4-4" />
    </svg>
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
  trailing,
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
  trailing?: React.ReactNode;
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
      className={`flex items-center w-full rounded-md transition-all ${
        compact ? "px-1.5 py-1 gap-1.5" : "px-2 py-1.5 gap-2.5"
      } ${isLastMove && didLose ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      style={isLastMove && didLose ? { opacity: 0.75 } : undefined}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div
          className={`rounded-sm border flex-shrink-0 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`}
          style={{
            backgroundColor: color === "white" ? "#f0eee5" : "#1f1d1b",
            borderColor: color === "white" ? "#cdcbc4" : "#5a5754",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        />
        <span
          className={`font-semibold text-chess-text truncate tracking-tight ${compact ? "text-xs" : "text-sm"}`}
        >
          {name}
        </span>
        {rating && (
          <span
            className={`text-chess-muted flex-shrink-0 tabular-nums ${compact ? "text-[10px]" : "text-xs"}`}
          >
            {rating}
          </span>
        )}
        {didWin && (
          <span
            title="Winner"
            className={`leading-none ml-0.5 ${compact ? "text-xs" : "text-sm"}`}
          >
            👑
          </span>
        )}
        {isDraw && (
          <span className="text-[10px] font-bold text-chess-muted ml-0.5">½-½</span>
        )}
      </div>
      {trailing}
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

