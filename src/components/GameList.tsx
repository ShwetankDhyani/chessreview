import React, { useState, useEffect } from "react";
import type { GameListItem } from "../types";
import { fetchRecentGames, getResultLabel, formatDate } from "../utils/chesscomApi";
import { RatingStat, TimeClassIcon } from "./TimeClassIcon";
import { fetchLichessGames } from "../utils/lichessApi";
import { AccountLinkPromo } from "./AccountLinkPromo";
import { PgnPastePanel } from "./PgnPastePanel";

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
      <div className="page-inline-pad flex-shrink-0 border-b border-chess-border py-3 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5 truncate text-sm font-bold text-chess-text">
                <span className="leading-none text-chess-muted">
                  {platform === "lichess" ? "♞" : "♟"}
                </span>
                <span className="truncate">{inputVal}</span>
              </span>
              {stats && (
                <div className="mt-0.5 flex items-center gap-2.5 text-chess-muted">
                  <RatingStat type="bullet" value={stats.bullet} />
                  <RatingStat type="blitz" value={stats.blitz} />
                  <RatingStat type="rapid" value={stats.rapid} />
                </div>
              )}
              {games.length > 0 && !loading && (
                <span className="mt-0.5 text-[10px] italic text-chess-muted">
                  Showing {filteredGames.length} of {games.length} cached games
                </span>
              )}
            </div>
            <button
              onClick={handleGo}
              disabled={loading}
              className="flex-shrink-0 rounded bg-chess-hover px-3 py-1.5 text-xs font-semibold text-chess-text transition-colors hover:bg-chess-border disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-chess-muted border-t-transparent" />
              ) : (
                "Fetch Latest"
              )}
            </button>
          </div>

        {error && <p className="text-xs text-move-blunder">{error}</p>}

        {games.length > 0 && !loading && (
          <div className="space-y-2 border-t border-chess-border/60 pt-2.5">
            <input
              type="text"
              value={opponentSearch}
              onChange={(e) => setOpponentSearch(e.target.value)}
              placeholder="Search opponent…"
              className="w-full rounded border border-chess-border bg-chess-bg px-2.5 py-1.5 text-xs text-chess-text placeholder-chess-muted transition-colors focus:border-move-best focus:outline-none"
            />
            <div className="flex gap-1.5">
              <div className="flex flex-1 overflow-hidden rounded border border-chess-border text-xs">
                {(["all", "win", "loss", "draw"] as ResultFilter[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResultFilter(r)}
                    className={`flex-1 py-1 font-semibold transition-colors ${
                      resultFilter === r
                        ? r === "win"
                          ? "bg-move-best text-white"
                          : r === "loss"
                            ? "bg-move-blunder text-white"
                            : r === "draw"
                              ? "bg-chess-muted text-white"
                              : "bg-chess-hover text-chess-text"
                        : "bg-chess-bg text-chess-muted hover:text-chess-text"
                    }`}
                  >
                    {r === "all" ? "All" : r === "win" ? "W" : r === "loss" ? "L" : "D"}
                  </button>
                ))}
              </div>
              <select
                value={ratingSort}
                onChange={(e) => setRatingSort(e.target.value as RatingSort)}
                className="rounded border border-chess-border bg-chess-bg px-1.5 py-1 text-xs text-chess-text focus:border-move-best focus:outline-none"
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
                    className={`rounded border px-2 py-0.5 text-xs capitalize transition-colors ${
                      formatFilter === f
                        ? "border-chess-accent/60 bg-chess-accent/10 text-chess-accent"
                        : "border-chess-border bg-chess-bg text-chess-muted hover:text-chess-text"
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

      {!inputVal && onLinkProfile && (
        <div className="flex-1 min-h-0 flex flex-col max-w-md mx-auto w-full">
          <AccountLinkPromo onConnect={onLinkProfile} />
          <div className="page-inline-pad flex-1 min-h-0 flex flex-col py-3 pb-5">
            <PgnPastePanel onLoad={onGameSelect} compact className="flex-1 min-h-0" />
          </div>
        </div>
      )}
      {!inputVal && !onLinkProfile && (
        <div className="page-inline-pad flex-1 min-h-0 flex flex-col py-4 max-w-md mx-auto w-full">
          <PgnPastePanel onLoad={onGameSelect} compact />
        </div>
      )}

      {/* ── Game list ── */}
      {inputVal && (
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {games.length === 0 && !loading && (
          <div className="page-inline-pad py-4 flex flex-col gap-3 flex-shrink-0 border-b border-chess-border max-h-[50vh]">
            <button
              type="button"
              onClick={handleGo}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-chess-hover text-chess-text hover:bg-chess-border transition-colors mx-auto"
            >
              Fetch games
            </button>
            <PgnPastePanel onLoad={onGameSelect} compact />
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
              className={`page-inline-pad w-full text-left py-2.5 border-b border-chess-border transition-colors duration-100 flex items-center gap-3 ${
                selectedGameId === game.id
                  ? "bg-chess-hover border-l-2 border-l-move-best"
                  : "hover:bg-chess-hover"
              }`}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-chess-border/80">
                <TimeClassIcon timeClass={game.timeClass} size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor: color === "white" ? "#e8e6e3" : "#3a3a3a",
                      border: color === "black" ? "1px solid #888" : "1px solid #ccc",
                    }}
                  />
                  <span className="truncate text-sm font-medium text-chess-text">
                    {opponent}
                  </span>
                  <span className="flex-shrink-0 text-xs text-chess-muted">
                    ({oppRating})
                  </span>
                </div>
                <div className="mt-0.5 text-xs capitalize text-chess-muted">
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
