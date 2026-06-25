import React, { useState, useEffect, useRef, useCallback } from "react";
import type { GameListItem } from "../types";
import { fetchRecentGames, getResultLabel, formatDate } from "../utils/chesscomApi";
import { RatingStat, TimeClassIcon } from "./TimeClassIcon";
import { fetchLichessGames } from "../utils/lichessApi";
import { AccountLinkPromo } from "./AccountLinkPromo";
import { PgnPastePanel } from "./PgnPastePanel";
import { GameUrlImport } from "./GameUrlImport";

type Platform = "chesscom" | "lichess";

const STORAGE_KEY_USER    = "cr_username";
const STORAGE_KEY_PLAT    = "cr_platform";
const STORAGE_KEY_GAMES   = "cr_games";

interface GameListProps {
  username: string;
  onGameSelect: (pgn: string) => void;
  onLinkProfile?: (platform: Platform) => void;
  selectedGameId?: string;
}

type ResultFilter = "all" | "win" | "loss" | "draw";
type RatingSort   = "none" | "high" | "low";

export const GameList: React.FC<GameListProps> = ({
  onGameSelect,
  onLinkProfile,
  selectedGameId,
}) => {
  const [platform, setPlatform] = useState<Platform>(
    () => (localStorage.getItem(STORAGE_KEY_PLAT) as Platform) ?? "chesscom"
  );
  const [inputVal, setInputVal] = useState(
    () => localStorage.getItem(STORAGE_KEY_USER) ?? ""
  );
  const [games, setGames] = useState<GameListItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GAMES);
      return raw ? (JSON.parse(raw) as GameListItem[]) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [showSlowRetry, setShowSlowRetry] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSucceededRef = useRef(false);
  const gamesRef = useRef(games);
  gamesRef.current = games;

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }, []);

  const startSlowTimer = useCallback(() => {
    clearSlowTimer();
    setShowSlowRetry(false);
    loadSucceededRef.current = false;
    slowTimerRef.current = setTimeout(() => {
      if (!loadSucceededRef.current && gamesRef.current.length === 0) {
        setShowSlowRetry(true);
      }
    }, 5000);
  }, [clearSlowTimer]);

  useEffect(() => () => clearSlowTimer(), [clearSlowTimer]);

  const [stats, setStats] = useState<{ bullet?: number, blitz?: number, rapid?: number } | null>(() => {
    try {
      const raw = localStorage.getItem("cr_stats");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  // Filters
  const [opponentSearch, setOpponentSearch] = useState("");
  const [resultFilter, setResultFilter]     = useState<ResultFilter>("all");
  const [formatFilter, setFormatFilter]     = useState("all");
  const [ratingSort, setRatingSort]         = useState<RatingSort>("none");

  // Persist platform selection
  useEffect(() => { localStorage.setItem(STORAGE_KEY_PLAT, platform); }, [platform]);

  // Auto-load on mount if username is saved but cache is empty
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    const savedPlat = (localStorage.getItem(STORAGE_KEY_PLAT) as Platform) ?? "chesscom";
    if (saved && games.length === 0) {
      loadGames(saved, savedPlat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for profile switches from the header dock
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent).detail as { name: string; platform: Platform } | null;
      if (detail?.name) {
        setInputVal(detail.name);
        setPlatform(detail.platform);
        setGames([]);
        gamesRef.current = [];
        setStats(null);
        loadGames(detail.name, detail.platform);
      } else {
        setInputVal("");
        setGames([]);
        setStats(null);
      }
    };
    window.addEventListener("cr_profile_switch", onSwitch);
    return () => window.removeEventListener("cr_profile_switch", onSwitch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGames = async (uname: string, plat: Platform) => {
    if (!uname.trim()) return;
    const hadCachedGames = gamesRef.current.length > 0;
    setLoading(true);
    startSlowTimer();
    try {
      const list = plat === "chesscom"
        ? await fetchRecentGames(uname.trim())
        : await fetchLichessGames(uname.trim());
      setGames(list);
      loadSucceededRef.current = true;
      clearSlowTimer();
      setShowSlowRetry(false);

      // Fetch stats (failures are silent)
      let newStats = null;
      try {
        if (plat === "chesscom") {
          const res = await fetch(`https://api.chess.com/pub/player/${uname.toLowerCase()}/stats`);
          if (res.ok) {
            const data = await res.json();
            newStats = {
              bullet: data.chess_bullet?.last?.rating,
              blitz: data.chess_blitz?.last?.rating,
              rapid: data.chess_rapid?.last?.rating
            };
          }
        } else {
          const res = await fetch(`https://lichess.org/api/user/${uname.toLowerCase()}`);
          if (res.ok) {
            const data = await res.json();
            newStats = {
              bullet: data.perfs?.bullet?.rating,
              blitz: data.perfs?.blitz?.rating,
              rapid: data.perfs?.rapid?.rating
            };
          }
        }
      } catch { /* ignore stats error */ }

      setStats(newStats);
      if (newStats) localStorage.setItem("cr_stats", JSON.stringify(newStats));
      else localStorage.removeItem("cr_stats");

      localStorage.setItem(STORAGE_KEY_USER, uname.trim());
      localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(list));
    } catch {
      if (hadCachedGames) {
        clearSlowTimer();
        setShowSlowRetry(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGo = () => loadGames(inputVal, platform);


  const resultBadge = (result: "win" | "loss" | "draw") => {
    const map = {
      win: { label: "W", cls: "bg-move-best text-white" },
      loss: { label: "L", cls: "bg-move-blunder text-white" },
      draw: { label: "D", cls: "bg-chess-muted/80 text-white" },
    };
    const { label, cls } = map[result];
    return (
      <span className={`mobile-result-badge ${cls}`}>{label}</span>
    );
  };

  const storedUser = localStorage.getItem(STORAGE_KEY_USER);

  // Derive filtered + sorted games
  const activeUser = storedUser ?? inputVal.trim();
  const availableFormats = Array.from(new Set(games.map(g => g.timeClass))).filter(Boolean);

  const filteredGames = games
    .filter(g => {
      const isWhite = g.white.toLowerCase() === activeUser.toLowerCase();
      const opponent = isWhite ? g.black : g.white;
      const result = getResultLabel(isWhite ? g.whiteResult : g.blackResult, isWhite ? "white" : "black", g);
      if (opponentSearch && !opponent.toLowerCase().includes(opponentSearch.toLowerCase())) return false;
      if (resultFilter !== "all" && result !== resultFilter) return false;
      if (formatFilter !== "all" && g.timeClass !== formatFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (ratingSort === "none") return 0;
      const aIsWhite = a.white.toLowerCase() === activeUser.toLowerCase();
      const bIsWhite = b.white.toLowerCase() === activeUser.toLowerCase();
      const aOppRating = (aIsWhite ? a.blackRating : a.whiteRating) ?? 0;
      const bOppRating = (bIsWhite ? b.blackRating : b.whiteRating) ?? 0;
      return ratingSort === "high" ? bOppRating - aOppRating : aOppRating - bOppRating;
    });

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      {inputVal ? (
        <div className="page-inline-pad flex flex-col flex-1 min-h-0 pt-2 pb-2">
          <div className="mobile-surface flex flex-col flex-1 min-h-0 max-w-md mx-auto w-full">
            <div className="mobile-surface-section py-2">
              <GameUrlImport onImported={onGameSelect} compact />
            </div>

            <div className="mobile-surface-section py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-chess-text">
                    <span className="text-chess-muted leading-none">
                      {platform === "lichess" ? "♞" : "♟"}
                    </span>
                    <span className="truncate">{inputVal}</span>
                  </div>
                  {stats && (
                    <div className="mt-1 flex items-center gap-2 text-chess-muted">
                      <RatingStat type="bullet" value={stats.bullet} />
                      <RatingStat type="blitz" value={stats.blitz} />
                      <RatingStat type="rapid" value={stats.rapid} />
                    </div>
                  )}
                  {games.length > 0 && !loading && (
                    <p className="mt-0.5 text-[10px] text-chess-muted">
                      {filteredGames.length} of {games.length} games
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGo}
                  disabled={loading}
                  className="mobile-icon-btn"
                  title="Fetch latest games"
                  aria-label="Fetch latest games"
                >
                  {loading ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-chess-muted border-t-transparent" />
                  ) : (
                    "↻"
                  )}
                </button>
              </div>

              {showSlowRetry && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-chess-border/60 bg-black/20 px-2 py-1.5 text-[11px] text-chess-subtext">
                  <span className="inline-block h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-chess-accent/40 border-t-chess-accent" />
                  <span className="flex-1 min-w-0">
                    {loading ? "Still loading…" : "Couldn't refresh."}
                  </span>
                  <button
                    type="button"
                    onClick={handleGo}
                    disabled={loading}
                    className="flex-shrink-0 font-semibold text-chess-accent"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {games.length > 0 && !loading && (
              <div className="mobile-surface-section py-2 space-y-1.5">
                <input
                  type="text"
                  value={opponentSearch}
                  onChange={(e) => setOpponentSearch(e.target.value)}
                  placeholder="Search opponent…"
                  className="mobile-field"
                />
                <div className="flex gap-1.5">
                  <div className="mobile-segment">
                    {(["all", "win", "loss", "draw"] as ResultFilter[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setResultFilter(r)}
                        className={`mobile-segment-btn ${
                          resultFilter === r
                            ? `mobile-segment-btn--active mobile-segment-btn--${r}`
                            : ""
                        }`}
                      >
                        {r === "all" ? "All" : r === "win" ? "W" : r === "loss" ? "L" : "D"}
                      </button>
                    ))}
                  </div>
                  <select
                    value={ratingSort}
                    onChange={(e) => setRatingSort(e.target.value as RatingSort)}
                    className="mobile-field mobile-field--select"
                    aria-label="Sort by opponent rating"
                  >
                    <option value="none">Rating ↕</option>
                    <option value="high">Rating ↓</option>
                    <option value="low">Rating ↑</option>
                  </select>
                </div>
                {availableFormats.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {["all", ...availableFormats].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormatFilter(f)}
                        className={`mobile-chip ${formatFilter === f ? "mobile-chip--active" : ""}`}
                      >
                        {f === "all" ? "All" : f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mobile-surface-list">
              {games.length === 0 && !loading && (
                <div className="mobile-surface-section py-4 flex flex-col gap-2 items-center">
                  <button type="button" onClick={handleGo} className="mobile-chip mobile-chip--active">
                    Fetch games
                  </button>
                  <PgnPastePanel onLoad={onGameSelect} compact />
                </div>
              )}
              {loading && showSlowRetry && games.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-chess-subtext text-xs gap-2 px-4 text-center">
                  <div className="w-4 h-4 border-2 border-chess-accent/40 border-t-chess-accent rounded-full animate-spin" />
                  <span>Still loading games…</span>
                </div>
              )}
              {!loading && games.length > 0 && filteredGames.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-chess-muted text-xs gap-1">
                  <span>No games match filters</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpponentSearch("");
                      setResultFilter("all");
                      setFormatFilter("all");
                      setRatingSort("none");
                    }}
                    className="text-chess-accent hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
              {filteredGames.map((game) => {
                const isWhite = game.white.toLowerCase() === activeUser.trim().toLowerCase();
                const color = isWhite ? "white" : "black";
                const opponent = isWhite ? game.black : game.white;
                const oppRating = isWhite ? game.blackRating : game.whiteRating;
                const result = getResultLabel(
                  isWhite ? game.whiteResult : game.blackResult,
                  color,
                  game
                );

                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => onGameSelect(game.pgn)}
                    className={`mobile-list-row ${
                      selectedGameId === game.id ? "mobile-list-row--active" : ""
                    }`}
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/5">
                      <TimeClassIcon timeClass={game.timeClass} size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <div
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{
                            backgroundColor: color === "white" ? "#e8e6e3" : "#3a3a3a",
                            border: color === "black" ? "1px solid #888" : "1px solid #ccc",
                          }}
                        />
                        <span className="truncate text-[13px] font-medium text-chess-text">
                          {opponent}
                        </span>
                        <span className="flex-shrink-0 text-[11px] text-chess-muted tabular-nums">
                          {oppRating}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] capitalize text-chess-muted">
                        {game.timeClass} · {formatDate(game.endTime)}
                      </div>
                    </div>
                    {resultBadge(result)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="page-inline-pad flex flex-col flex-1 min-h-0 pt-2 pb-2">
          <div className="mobile-surface flex flex-col flex-1 min-h-0 max-w-md mx-auto w-full overflow-hidden">
            {onLinkProfile && (
              <div className="mobile-surface-section">
                <AccountLinkPromo onConnect={onLinkProfile} embedded />
              </div>
            )}
            <div className="mobile-surface-section flex-1 min-h-0 flex flex-col py-3">
              <p className="text-[10px] text-chess-muted mb-2 text-center">
                Or paste PGN / open a .pgn file
              </p>
              <PgnPastePanel
                onLoad={onGameSelect}
                compact
                className={onLinkProfile ? "flex-1 min-h-0" : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
