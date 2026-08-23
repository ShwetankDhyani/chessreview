import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chessProfileUrl,
  countryLabel,
  fetchAdminStats,
  formatReviewsServed,
  platformLabel,
  type AdminReviewStats,
  type RecentReviewRow,
} from "../utils/reviewStats";
import {
  fetchSiteSettings,
  updateSiteSettings,
} from "../utils/siteSettings";
import { usePageSeo } from "../hooks/usePageSeo";
import { AdminBlogPanel } from "../components/AdminBlogPanel";
import {
  TestingModeBanner,
  TESTING_MODE_CHANGED,
} from "../components/TestingModeBanner";
import { AdminSection } from "../components/admin/AdminSection";
import { AdminSwitch } from "../components/admin/AdminSwitch";
import { hapticSoft } from "../utils/chessSounds";
import {
  clearSessionAdminKey,
  fetchBlogList,
  loadSessionAdminKey,
  saveSessionAdminKey,
  type BlogPostSummary,
} from "../utils/blogApi";

const RECENT_PAGE_SIZE = 10;

type HomeGamesNewsChoice = "__auto__" | "__none__" | string;

function homeGamesNewsChoiceFromSettings(
  slug: string | null | undefined
): HomeGamesNewsChoice {
  if (slug === null) return "__none__";
  if (typeof slug === "string" && slug.length > 0) return slug;
  return "__auto__";
}

function homeGamesNewsSlugFromChoice(
  choice: HomeGamesNewsChoice
): string | null | "__auto__" {
  if (choice === "__auto__") return "__auto__";
  if (choice === "__none__") return null;
  return choice;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function locationLabel(row: RecentReviewRow) {
  const parts = [row.city, row.region, countryLabel(row.country_code)].filter(
    Boolean
  );
  return parts.join(", ") || "—";
}

function playersLabel(row: RecentReviewRow) {
  const w = row.white_rating
    ? `${row.white_player} (${row.white_rating})`
    : row.white_player;
  const b = row.black_rating
    ? `${row.black_player} (${row.black_rating})`
    : row.black_player;
  return `${w} vs ${b}`;
}

export default function AdminPage() {
  usePageSeo({
    title: "Admin — ChessReview",
    description: "ChessReview control panel.",
    path: "/admin",
    noindex: true,
  });

  const [adminKey, setAdminKey] = useState(() => loadSessionAdminKey());
  const [inputKey, setInputKey] = useState("");
  const [stats, setStats] = useState<AdminReviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentPage, setRecentPage] = useState(0);
  const [testingMode, setTestingMode] = useState(false);
  const [testingBusy, setTestingBusy] = useState(false);
  const [testingError, setTestingError] = useState<string | null>(null);
  const [testingBannerKey, setTestingBannerKey] = useState(0);
  const [homeGamesNewsChoice, setHomeGamesNewsChoice] =
    useState<HomeGamesNewsChoice>("__auto__");
  const [homeGamesNewsBusy, setHomeGamesNewsBusy] = useState(false);
  const [homeGamesNewsError, setHomeGamesNewsError] = useState<string | null>(
    null
  );
  const [blogPosts, setBlogPosts] = useState<BlogPostSummary[]>([]);

  const load = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStats(key);
      setStats(data);
      setRecentPage(0);
      saveSessionAdminKey(key);
      setAdminKey(key);
      try {
        const [settings, posts] = await Promise.all([
          fetchSiteSettings(),
          fetchBlogList({ drafts: true, adminKey: key }),
        ]);
        setTestingMode(!!settings.testingMode);
        setHomeGamesNewsChoice(
          homeGamesNewsChoiceFromSettings(settings.homeGamesNewsSlug)
        );
        setBlogPosts(posts.filter((post) => post.published !== false));
        setTestingError(null);
        setHomeGamesNewsError(null);
      } catch {
        /* settings optional relative to analytics */
      }
    } catch (e) {
      setStats(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const setTestingModeValue = async (next: boolean) => {
    if (!adminKey || testingBusy) return;
    const prev = testingMode;
    setTestingMode(next);
    setTestingBusy(true);
    setTestingError(null);
    try {
      const settings = await updateSiteSettings(adminKey, {
        testingMode: next,
      });
      const live = !!settings.testingMode;
      setTestingMode(live);
      setTestingBannerKey((k) => k + 1);
      window.dispatchEvent(
        new CustomEvent(TESTING_MODE_CHANGED, {
          detail: { testingMode: live },
        })
      );
    } catch (e) {
      setTestingMode(prev);
      setTestingError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setTestingBusy(false);
    }
  };

  const setHomeGamesNewsValue = async (next: HomeGamesNewsChoice) => {
    if (!adminKey || homeGamesNewsBusy) return;
    const prev = homeGamesNewsChoice;
    setHomeGamesNewsChoice(next);
    setHomeGamesNewsBusy(true);
    setHomeGamesNewsError(null);
    try {
      const settings = await updateSiteSettings(adminKey, {
        homeGamesNewsSlug: homeGamesNewsSlugFromChoice(next),
      });
      const confirmed = homeGamesNewsChoiceFromSettings(
        settings.homeGamesNewsSlug
      );
      if (confirmed !== next) {
        setHomeGamesNewsChoice(prev);
        setHomeGamesNewsError(
          "Setting did not save. Try again in a moment."
        );
        return;
      }
      setHomeGamesNewsChoice(confirmed);
    } catch (e) {
      setHomeGamesNewsChoice(prev);
      setHomeGamesNewsError(
        e instanceof Error ? e.message : "Could not update"
      );
    } finally {
      setHomeGamesNewsBusy(false);
    }
  };

  const signOut = () => {
    hapticSoft();
    clearSessionAdminKey();
    setAdminKey("");
    setStats(null);
    setInputKey("");
    setError(null);
  };

  useEffect(() => {
    if (adminKey) void load(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentTotal =
    stats?.recentTotal ?? stats?.recent?.length ?? 0;
  const recentPageCount = Math.max(
    1,
    Math.ceil(recentTotal / RECENT_PAGE_SIZE)
  );

  const recentSlice = useMemo(() => {
    const all = stats?.recent ?? [];
    const start = recentPage * RECENT_PAGE_SIZE;
    return all.slice(start, start + RECENT_PAGE_SIZE);
  }, [stats?.recent, recentPage]);

  const savedGames = stats?.savedGames;
  const savedTotal = savedGames?.total ?? 0;
  const savedByUser = savedGames?.byUser ?? [];

  const countryRows = stats?.countries ?? [];
  const countryChartHeight = Math.max(countryRows.length * 28, 160);

  useEffect(() => {
    if (recentPage > 0 && recentPage >= recentPageCount) {
      setRecentPage(Math.max(0, recentPageCount - 1));
    }
  }, [recentPage, recentPageCount]);

  if (!adminKey || error === "Invalid admin key") {
    return (
      <div className="page-scroll-root bg-chess-bg text-chess-text flex items-center justify-center p-6">
        <form
          className="w-full max-w-xs space-y-3 rounded-xl border border-chess-border bg-chess-panel p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void load(inputKey.trim());
          }}
        >
          <div>
            <h1 className="text-base font-bold text-chess-text">Control panel</h1>
            <p className="mt-1 text-[11px] text-chess-muted">
              Sign in with your admin password.
            </p>
          </div>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-chess-border bg-chess-bg px-3 py-2.5 text-sm"
            autoComplete="current-password"
            autoFocus
          />
          {error && error !== "Invalid admin key" && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          {error === "Invalid admin key" && (
            <p className="text-xs text-red-400">Wrong password</p>
          )}
          <button
            type="submit"
            disabled={!inputKey.trim() || loading}
            className="w-full rounded-lg bg-chess-accent text-chess-bg font-semibold py-2 text-sm disabled:opacity-50"
          >
            {loading ? "…" : "Enter"}
          </button>
          <a
            href="/"
            className="block text-center text-xs text-chess-muted hover:text-chess-accent"
          >
            ← Back to site
          </a>
        </form>
      </div>
    );
  }

  const recentStart =
    recentTotal === 0 ? 0 : recentPage * RECENT_PAGE_SIZE + 1;
  const recentEnd = Math.min(recentTotal, (recentPage + 1) * RECENT_PAGE_SIZE);

  return (
    <div className="page-scroll-root bg-chess-bg text-chess-text">
      <TestingModeBanner key={testingBannerKey} />
      <header className="sticky top-0 z-10 border-b border-chess-border bg-chess-panel/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-chess-muted">
              ChessReview
            </p>
            <h1 className="text-base font-bold tracking-tight text-chess-text">
              Control panel
            </h1>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void load(adminKey)}
              disabled={loading}
              className="rounded-lg border border-chess-border px-3 py-1.5 text-xs font-semibold text-chess-subtext hover:bg-chess-hover disabled:opacity-50"
            >
              {loading ? "…" : "Refresh"}
            </button>
            <a
              href="/"
              className="rounded-lg border border-chess-border px-3 py-1.5 text-xs font-semibold text-chess-subtext hover:bg-chess-hover hover:text-chess-accent"
            >
              Site
            </a>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-chess-border px-3 py-1.5 text-xs font-semibold text-chess-muted hover:bg-chess-hover hover:text-chess-text"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-3 px-4 py-5 pb-14">
        <AdminSection
          id="site"
          title="Site"
          description="Live flags visitors see on the site."
          defaultOpen
          badge={
            testingMode
              ? "Testing on"
              : homeGamesNewsChoice === "__none__"
                ? "No home news"
                : undefined
          }
        >
          <div className="flex items-center justify-between gap-4 rounded-lg border border-chess-border/70 bg-chess-bg/35 px-3 py-2.5">
            <div className="min-w-0">
              <p
                className={`text-[12px] font-semibold leading-snug ${
                  testingMode ? "text-chess-accent" : "text-chess-text"
                }`}
              >
                Testing Mode
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-chess-muted">
                Shows a top banner: features may glitch.
              </p>
            </div>
            <AdminSwitch
              label="Testing Mode"
              checked={testingMode}
              disabled={testingBusy}
              onChange={(next) => void setTestingModeValue(next)}
            />
          </div>
          {testingError ? (
            <p className="mt-2 text-[11px] text-red-400">{testingError}</p>
          ) : null}

          <div className="mt-3 rounded-lg border border-chess-border/70 bg-chess-bg/35 px-3 py-2.5">
            <label
              htmlFor="home-games-news"
              className="block text-[12px] font-semibold leading-snug text-chess-text"
            >
              Home Games tab news
            </label>
            <p className="mt-0.5 text-[11px] leading-snug text-chess-muted">
              Which blog post shows above the game list on the home Games tab.
              “Automatic” follows your blog pin order (same as the top post on
              /blog). “None” hides it.
            </p>
            <select
              id="home-games-news"
              value={homeGamesNewsChoice}
              disabled={homeGamesNewsBusy}
              onChange={(e) => void setHomeGamesNewsValue(e.target.value)}
              className="mt-2 w-full rounded-lg border border-chess-border bg-chess-panel px-2.5 py-2 text-[12px] text-chess-text outline-none focus:border-chess-accent/70 disabled:opacity-60"
            >
              <option value="__auto__">
                Automatic — top of blog list (by pin)
              </option>
              <option value="__none__">None — hide news banner</option>
              {blogPosts.map((post) => (
                <option key={post.id} value={post.slug}>
                  {post.title}
                </option>
              ))}
            </select>
            {homeGamesNewsError ? (
              <p className="mt-2 text-[11px] text-red-400">
                {homeGamesNewsError}
              </p>
            ) : null}
          </div>
        </AdminSection>

        <AdminSection
          id="overview"
          title="Overview"
          description="High-level review volume and reach."
          defaultOpen
          badge={
            stats?.reviewsServed != null
              ? formatReviewsServed(stats.reviewsServed)
              : undefined
          }
        >
          {loading && !stats ? (
            <p className="text-sm text-chess-muted">Loading…</p>
          ) : !stats?.configured ? (
            <p className="text-sm text-chess-muted">
              Could not load analytics stats.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Reviews served"
                value={formatReviewsServed(stats.reviewsServed ?? 0)}
                accent
              />
              <StatCard
                label="Countries"
                value={String(stats.countryCount ?? 0)}
              />
              <StatCard
                label="Avg white rating"
                value={
                  stats.ratingSummary?.avgWhite
                    ? String(stats.ratingSummary.avgWhite)
                    : "—"
                }
              />
              <StatCard
                label="Avg black rating"
                value={
                  stats.ratingSummary?.avgBlack
                    ? String(stats.ratingSummary.avgBlack)
                    : "—"
                }
              />
            </div>
          )}
        </AdminSection>

        <AdminSection
          id="analytics"
          title="Analytics"
          description="Breakdowns by country and engine depth."
          defaultOpen={false}
          badge={
            countryRows.length > 0
              ? `${countryRows.length} countries`
              : undefined
          }
        >
          {!stats?.configured ? (
            <p className="text-sm text-chess-muted">No analytics yet.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-chess-muted">
                  By country
                </h3>
                {countryRows.length === 0 ? (
                  <p className="text-sm text-chess-muted">No country data yet.</p>
                ) : (
                  <div className="max-h-[28rem] overflow-y-auto">
                    <div
                      style={{
                        height: countryChartHeight,
                        minHeight: countryChartHeight,
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={countryRows}
                          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                        >
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fill: "#666", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="countryCode"
                            width={88}
                            tick={{ fill: "#888", fontSize: 10 }}
                            tickFormatter={(code) =>
                              countryLabel(String(code))
                            }
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.[0]) return null;
                              const row = payload[0].payload as {
                                countryCode: string;
                                count: number;
                              };
                              return (
                                <div className="rounded-lg border border-chess-border bg-chess-panel px-2 py-1 text-xs">
                                  {countryLabel(row.countryCode)}: {row.count}
                                </div>
                              );
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#96bc4b"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-chess-muted">
                  By engine depth
                </h3>
                {(stats.byDepth?.length ?? 0) === 0 ? (
                  <p className="text-sm text-chess-muted">
                    No depth breakdown yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-chess-border/50 text-left text-chess-muted">
                          <th className="py-2 pr-3">Depth</th>
                          <th className="py-2 pr-3">Reviews</th>
                          <th className="py-2">Avg time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byDepth?.map((d) => (
                          <tr
                            key={d.depth}
                            className="border-b border-chess-border/30"
                          >
                            <td className="py-2 pr-3 tabular-nums">
                              D{d.depth}
                            </td>
                            <td className="py-2 pr-3 tabular-nums">
                              {d.count}
                            </td>
                            <td className="py-2 tabular-nums">
                              {formatDuration(d.avgDurationMs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </AdminSection>

        <AdminSection
          id="saved"
          title="Saved games"
          description="Cloud-saved reviews by signed-in Chess.com / Lichess users."
          defaultOpen={false}
          badge={savedTotal > 0 ? String(savedTotal) : undefined}
        >
          {savedTotal === 0 ? (
            <p className="text-sm text-chess-muted">No saved games yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-chess-border/60">
              <table className="w-full min-w-[480px] text-xs">
                <thead>
                  <tr className="bg-chess-bg/40 text-left text-chess-muted">
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Platform</th>
                    <th className="px-3 py-2">Saved</th>
                    <th className="px-3 py-2">Last save</th>
                  </tr>
                </thead>
                <tbody>
                  {savedByUser.map((row) => {
                    const profileUrl = chessProfileUrl(
                      row.platform,
                      row.username
                    );
                    return (
                      <tr
                        key={`${row.platform}:${row.username}`}
                        className="border-t border-chess-border/30 hover:bg-chess-hover/20"
                      >
                        <td className="px-3 py-2 font-medium text-chess-text">
                          {profileUrl ? (
                            <a
                              href={profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-chess-accent hover:underline"
                            >
                              {row.username}
                            </a>
                          ) : (
                            row.username
                          )}
                        </td>
                        <td className="px-3 py-2 text-chess-muted">
                          {platformLabel(row.platform)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.count}</td>
                        <td className="px-3 py-2 text-chess-muted">
                          {row.lastSavedAt
                            ? formatWhen(new Date(row.lastSavedAt).toISOString())
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-3 py-2 text-[11px] text-chess-muted">
                {savedTotal.toLocaleString()} saved game
                {savedTotal === 1 ? "" : "s"} across{" "}
                {savedByUser.length.toLocaleString()} user
                {savedByUser.length === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </AdminSection>

        <AdminSection
          id="recent"
          title="Review history"
          description="Every completed analysis, newest first."
          defaultOpen={false}
          badge={recentTotal > 0 ? String(recentTotal) : undefined}
        >
          {!stats?.configured ? (
            <p className="text-sm text-chess-muted">No reviews yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-chess-border/60">
                <table className="w-full min-w-[720px] text-xs">
                  <thead>
                    <tr className="bg-chess-bg/40 text-left text-chess-muted">
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Match</th>
                      <th className="px-3 py-2">Result</th>
                      <th className="px-3 py-2">Reviewer</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Depth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTotal === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-chess-muted"
                        >
                          No reviews yet.
                        </td>
                      </tr>
                    ) : (
                      recentSlice.map((row, i) => (
                        <tr
                          key={`${row.reviewed_at}-${i}`}
                          className="border-t border-chess-border/30 hover:bg-chess-hover/20"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-chess-muted">
                            {formatWhen(row.reviewed_at)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="max-w-[200px] truncate font-medium text-chess-text">
                              {playersLabel(row)}
                            </div>
                            {row.plies != null && (
                              <div className="text-chess-muted">
                                {row.plies} plies
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {row.result ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {row.username ? (
                              <span>
                                {(() => {
                                  const profileUrl = chessProfileUrl(
                                    row.reviewer_platform,
                                    row.username
                                  );
                                  return profileUrl ? (
                                    <a
                                      href={profileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-chess-accent hover:underline"
                                    >
                                      {row.username}
                                    </a>
                                  ) : (
                                    <span className="font-medium">
                                      {row.username}
                                    </span>
                                  );
                                })()}
                                {row.reviewer_platform ? (
                                  <span className="text-chess-muted">
                                    {" "}
                                    · {platformLabel(row.reviewer_platform)}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-chess-muted">
                            {locationLabel(row)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            D{row.depth}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {recentTotal > RECENT_PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setRecentPage((p) => Math.max(0, p - 1))}
                    disabled={recentPage <= 0}
                    className="rounded-lg border border-chess-border px-3 py-1.5 text-xs font-semibold hover:bg-chess-hover disabled:pointer-events-none disabled:opacity-40"
                  >
                    ← Previous
                  </button>
                  <span className="text-[11px] tabular-nums text-chess-muted">
                    {recentStart}–{recentEnd} of {recentTotal}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRecentPage((p) =>
                        Math.min(recentPageCount - 1, p + 1)
                      )
                    }
                    disabled={recentPage >= recentPageCount - 1}
                    className="rounded-lg border border-chess-border px-3 py-1.5 text-xs font-semibold hover:bg-chess-hover disabled:pointer-events-none disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </AdminSection>

        <AdminSection
          id="blog"
          title="Blog"
          description="Write, edit, and publish posts."
          defaultOpen={false}
        >
          <AdminBlogPanel adminKey={adminKey} embedded />
        </AdminSection>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-chess-border/70 bg-chess-bg/35 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent ? "text-chess-accent" : "text-chess-text"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
