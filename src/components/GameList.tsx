import React, { useState, useEffect } from "react";
import type { GameListItem } from "../types";
import { fetchRecentGames, getResultLabel, formatDate, timeClassIcon } from "../utils/chesscomApi";
import { fetchLichessGames } from "../utils/lichessApi";
import { PgnPastePanel } from "./PgnPastePanel";

type Platform = "chesscom" | "lichess";

const STORAGE_KEY_USER    = "cr_username";
const STORAGE_KEY_PLAT    = "cr_platform";
const STORAGE_KEY_GAMES   = "cr_games";

interface GameListProps {
  username: string;
  onGameSelect: (pgn: string) => void;
  onLinkProfile?: () => void;
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
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    try {
      const list = plat === "chesscom"
        ? await fetchRecentGames(uname.trim())
        : await fetchLichessGames(uname.trim());
      setGames(list);

      // Fetch stats
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch games");
    } finally {
      setLoading(false);
    }
  };

  const handleGo = () => loadGames(inputVal, platform);


  const resultBadge = (result: "win" | "loss" | "draw") => {
    const map = {
      win:  { label: "W", cls: "bg-move-best text-white" },
      loss: { label: "L", cls: "bg-move-blunder text-white" },
      draw: { label: "D", cls: "bg-chess-muted text-white" },
    };
    const { label, cls } = map[result];
    return <span className={`${cls} text-xs font-bold px-1.5 py-0.5 rounded leading-none flex-shrink-0`}>{label}</span>;
  };

  const storedUser = localStorage.getItem(STORAGE_KEY_USER);
  const showingCached = games.length > 0 && !loading && storedUser === inputVal.trim();

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
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header (profile only) ── */}
      {inputVal && (
      <div className="p-3 border-b border-chess-border space-y-2.5 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-chess-text flex items-center gap-1.5">
                <span className="leading-none">{platform === "lichess" ? "🏳" : "♟"}</span>
                {inputVal}
              </span>
              {stats && (
                <div className="flex items-center gap-2 text-[10px] font-semibold text-chess-muted mt-0.5">
                  {stats.bullet && <span title="Bullet" className="flex items-center gap-0.5"><span className="text-sm">🚅</span> {stats.bullet}</span>}
                  {stats.blitz && <span title="Blitz" className="flex items-center gap-0.5"><span className="text-sm">⚡</span> {stats.blitz}</span>}
                  {stats.rapid && <span title="Rapid" className="flex items-center gap-0.5"><span className="text-sm">⏱</span> {stats.rapid}</span>}
                </div>
              )}
              {games.length > 0 && !loading && (
                <span className="text-[10px] text-chess-muted italic mt-0.5">
                  Showing {filteredGames.length} of {games.length} cached games
                </span>
              )}
            </div>
            <button
              onClick={handleGo}
              disabled={loading}
              className="flex-shrink-0 bg-chess-hover hover:bg-chess-border disabled:opacity-50 text-chess-text text-xs font-semibold px-3 py-1.5 rounded transition-colors"
            >
              {loading ? <span className="inline-block w-3 h-3 border-2 border-chess-muted border-t-transparent rounded-full animate-spin" /> : "Fetch Latest"}
            </button>
          </div>

        {error && <p className="text-xs text-move-blunder pt-2">{error}</p>}

        {/* Filters — only show when games are loaded */}
        {games.length > 0 && !loading && (
          <div className="space-y-1.5 pt-1">
            {/* Opponent search */}
            <input
              type="text"
              value={opponentSearch}
              onChange={e => setOpponentSearch(e.target.value)}
              placeholder="Search opponent…"
              className="w-full bg-chess-bg border border-chess-border rounded px-2.5 py-1 text-xs text-chess-text placeholder-chess-muted focus:outline-none focus:border-move-best transition-colors"
            />
            <div className="flex gap-1.5">
              {/* Result filter */}
              <div className="flex rounded overflow-hidden border border-chess-border text-xs flex-1">
                {(["all","win","loss","draw"] as ResultFilter[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setResultFilter(r)}
                    className={`flex-1 py-1 font-semibold transition-colors ${
                      resultFilter === r
                        ? r === "win" ? "bg-move-best text-white"
                          : r === "loss" ? "bg-move-blunder text-white"
                          : r === "draw" ? "bg-chess-muted text-white"
                          : "bg-chess-hover text-chess-text"
                        : "bg-chess-bg text-chess-muted hover:text-chess-text"
                    }`}
                  >
                    {r === "all" ? "All" : r === "win" ? "W" : r === "loss" ? "L" : "D"}
                  </button>
                ))}
              </div>
              {/* Rating sort */}
              <select
                value={ratingSort}
                onChange={e => setRatingSort(e.target.value as RatingSort)}
                className="bg-chess-bg border border-chess-border rounded px-1.5 py-1 text-xs text-chess-text focus:outline-none focus:border-move-best"
              >
                <option value="none">Rating ↕</option>
                <option value="high">Rating ↓</option>
                <option value="low">Rating ↑</option>
              </select>
            </div>
            {/* Format filter */}
            {availableFormats.length > 1 && (
              <div className="flex gap-1 flex-wrap">
                {["all", ...availableFormats].map(f => (
                  <button
                    key={f}
                    onClick={() => setFormatFilter(f)}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors capitalize ${
                      formatFilter === f
                        ? "bg-move-best border-move-best text-white"
                        : "bg-chess-bg border-chess-border text-chess-muted hover:text-chess-text"
                    }`}
                  >
                    {f === "all" ? "All formats" : f}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {!inputVal && (
        <div className="flex-1 min-h-0 flex flex-col px-4 py-5 max-w-md mx-auto w-full">
          <PgnPastePanel onLoad={onGameSelect} onLinkProfile={onLinkProfile} />
        </div>
      )}

      {/* ── Game list ── */}
      {inputVal && (
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {games.length === 0 && !loading && (
          <div className="px-4 py-4 flex flex-col gap-3 flex-shrink-0 border-b border-chess-border max-h-[50vh]">
            <button
              type="button"
              onClick={handleGo}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-chess-hover text-chess-text hover:bg-chess-border transition-colors mx-auto"
            >
              Fetch games
            </button>
            <PgnPastePanel onLoad={onGameSelect} onLinkProfile={onLinkProfile} />
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center h-32 text-chess-muted text-sm gap-2">
            <div className="w-4 h-4 border-2 border-move-best border-t-transparent rounded-full animate-spin" />
            Loading games…
          </div>
        )}
        {!loading && games.length > 0 && filteredGames.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-chess-muted text-xs gap-1">
            <span>No games match filters</span>
            <button onClick={() => { setOpponentSearch(""); setResultFilter("all"); setFormatFilter("all"); setRatingSort("none"); }} className="text-move-best hover:underline">Clear filters</button>
          </div>
        )}
        {filteredGames.map((game) => {
          const isWhite = game.white.toLowerCase() === activeUser.trim().toLowerCase();
          const color = isWhite ? "white" : "black";
          const opponent = isWhite ? game.black : game.white;
          const oppRating = isWhite ? game.blackRating : game.whiteRating;
          const result = getResultLabel(isWhite ? game.whiteResult : game.blackResult, color, game);

          return (
            <button
              key={game.id}
              onClick={() => onGameSelect(game.pgn)}
              className={`w-full text-left px-3 py-2.5 border-b border-chess-border transition-colors duration-100 flex items-center gap-3 ${
                selectedGameId === game.id
                  ? "bg-chess-hover border-l-2 border-l-move-best"
                  : "hover:bg-chess-hover"
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-chess-border rounded-full flex items-center justify-center text-lg">
                {timeClassIcon(game.timeClass)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: color === "white" ? "#e8e6e3" : "#3a3a3a",
                      border: color === "black" ? "1px solid #888" : "1px solid #ccc",
                    }}
                  />
                  <span className="text-sm font-medium text-chess-text truncate">{opponent}</span>
                  <span className="text-xs text-chess-muted flex-shrink-0">({oppRating})</span>
                </div>
                <div className="text-xs text-chess-muted mt-0.5 capitalize">
                  {game.timeClass} · {formatDate(game.endTime)}
                </div>
              </div>
              {resultBadge(result)}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
};
