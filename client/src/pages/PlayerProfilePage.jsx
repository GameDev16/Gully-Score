import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import { calcAge } from "../utils/format.js";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

export default function PlayerProfilePage() {
  const { id } = useParams();
  const [filter, setFilter] = useState({ role: "", format: "" });
  const [page, setPage] = useState(1);

  const {
    data: player,
    isLoading: playerLoading,
    error: playerError,
  } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      const res = await api.get(`/api/players/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: appData } = useQuery({
    queryKey: ["player-appearances", id, filter, page],
    queryFn: async () => {
      const res = await api.get(`/api/players/${id}/appearances`, {
        params: { page, limit: 20, ...filter },
      });
      return res.data;
    },
    enabled: !!id,
  });

  if (playerLoading)
    return (
      <div className="p-10 text-center text-slate-500">
        <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
        <div>Loading player…</div>
      </div>
    );

  if (playerError || !player)
    return (
      <div className="p-10 text-center space-y-3">
        <div className="text-4xl">🏏</div>
        <h2 className="font-display text-xl font-bold">Player not found</h2>
        <p className="text-slate-500 text-sm">
          This player may have been removed or the link is invalid.
        </p>
        <Link to="/" className="btn btn-primary">
          Go Home
        </Link>
      </div>
    );

  const cs = player.career_stats || {};
  const bat = cs.batting || {};
  const bow = cs.bowling || {};
  const hasBowled = (bow.wickets || 0) > 0 || (bow.overs || 0) > 0;

  const apps = Array.isArray(appData?.items) ? appData.items : [];

  const battingTrend = apps
    .filter((a) => a?.batting?.didBat)
    .slice()
    .reverse()
    .map((a) => ({
      date: a.matchDate
        ? new Date(a.matchDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })
        : "—",
      runs: a.batting?.runs ?? 0,
    }));

  const bowlingTrend = apps
    .filter((a) => a?.bowling?.didBowl)
    .slice()
    .reverse()
    .map((a) => ({
      date: a.matchDate
        ? new Date(a.matchDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })
        : "—",
      wickets: a.bowling?.wickets ?? 0,
    }));

  const dismissalCounts = useMemo(() => {
    const c = {};
    apps.forEach((a) => {
      if (a?.batting?.dismissalType) {
        c[a.batting.dismissalType] = (c[a.batting.dismissalType] || 0) + 1;
      }
    });
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [apps]);

  const PIE_COLORS = [
    "#1A7A4A",
    "#E89C2F",
    "#DC2626",
    "#3B82F6",
    "#A855F7",
    "#475569",
  ];

  const initials = player.name
    ?.split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
      >
        <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 text-3xl font-bold flex items-center justify-center overflow-hidden shrink-0">
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-3xl font-bold break-words">
              {player.name}
            </h1>
            {player.jerseyNumber != null && (
              <span className="text-slate-400 font-mono text-lg">
                #{player.jerseyNumber}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
            {player.teamId && (
              <Link
                to={`/teams/${player.teamId._id || player.teamId}`}
                className="player-link"
              >
                {player.teamId.name || "Team"}
              </Link>
            )}
            {calcAge(player.dateOfBirth) && (
              <span>· {calcAge(player.dateOfBirth)} yrs</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {player.role && <Badge>{player.role}</Badge>}
            {player.battingStyle && (
              <Badge variant="outline">{player.battingStyle}</Badge>
            )}
            {player.bowlingStyle && player.bowlingStyle !== "none" && (
              <Badge variant="outline">{player.bowlingStyle}</Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* BATTING CAREER */}
      <Section title="Batting">
        <StatsGrid
          stats={[
            ["Matches", bat.innings || cs.matches || 0],
            ["Runs", bat.runs || 0],
            ["Average", (bat.average || 0).toFixed(1)],
            ["Strike Rate", (bat.strikeRate || 0).toFixed(1)],
            ["High Score", bat.highestScore || 0],
            ["50s", bat.fifties || 0],
            ["100s", bat.hundreds || 0],
            ["4s / 6s", `${bat.fours || 0} / ${bat.sixes || 0}`],
          ]}
        />
      </Section>

      {/* BOWLING CAREER */}
      {hasBowled && (
        <Section title="Bowling">
          <StatsGrid
            stats={[
              ["Wickets", bow.wickets || 0],
              ["Overs", (bow.overs || 0).toFixed(1)],
              ["Economy", (bow.economy || 0).toFixed(2)],
              ["Average", (bow.average || 0).toFixed(1)],
              [
                "Best",
                `${bow.bestFigures?.wickets || 0}/${bow.bestFigures?.runs || 0}`,
              ],
              ["4-fors", bow.fourWickets || 0],
              ["5-fors", bow.fiveWickets || 0],
            ]}
          />
        </Section>
      )}

      {/* BATTING TREND */}
      {battingTrend.length >= 2 && (
        <Section title="Runs per Innings">
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={battingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="runs"
                  stroke="#1A7A4A"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#1A7A4A" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* BOWLING TREND */}
      {bowlingTrend.length >= 2 && (
        <Section title="Wickets per Spell">
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bowlingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="wickets" fill="#E89C2F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* DISMISSAL CHART */}
      {dismissalCounts.length >= 2 && (
        <Section title="Dismissal Types">
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={dismissalCounts}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {dismissalCounts.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* MATCH APPEARANCES */}
      <Section title="Match Appearances">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          <FilterChip
            active={!filter.role && !filter.format}
            onClick={() => { setFilter({ role: "", format: "" }); setPage(1); }}
          >
            All
          </FilterChip>
          {["batting", "bowling"].map((r) => (
            <FilterChip
              key={r}
              active={filter.role === r}
              onClick={() => { setFilter((f) => ({ ...f, role: f.role === r ? "" : r })); setPage(1); }}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </FilterChip>
          ))}
          {["T10", "T20", "ODI"].map((f) => (
            <FilterChip
              key={f}
              active={filter.format === f}
              onClick={() => { setFilter((p) => ({ ...p, format: p.format === f ? "" : f })); setPage(1); }}
            >
              {f}
            </FilterChip>
          ))}
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs text-slate-500 text-left bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Match</th>
                <th className="p-2">Vs</th>
                <th className="p-2">Bat</th>
                <th className="p-2">How Out</th>
                <th className="p-2">Bowl</th>
                <th className="p-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a, i) => (
                <tr
                  key={a._id || i}
                  className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="p-2 whitespace-nowrap text-slate-500 text-xs">
                    {a.matchDate
                      ? new Date(a.matchDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="p-2">
                    {a.matchId?._id ? (
                      <Link className="player-link text-xs" to={`/matches/${a.matchId._id}`}>
                        {a.matchTitle || a.matchId?.title || "Match"}
                      </Link>
                    ) : (
                      <span className="text-xs">{a.matchTitle || "—"}</span>
                    )}
                    {a.tournamentId && (
                      <div className="text-xs text-slate-400">
                        <Link
                          to={`/tournaments/${a.tournamentId._id}`}
                          className="hover:text-primary-600"
                        >
                          {a.tournamentId.name}
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-xs">
                    {a.oppositionTeamId?.shortName ||
                      a.oppositionTeamId?.name ||
                      "—"}
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {a.batting?.didBat
                      ? `${a.batting.runs}(${a.batting.balls})`
                      : "—"}
                  </td>
                  <td className="p-2 text-xs text-slate-500">
                    {a.batting?.dismissalType ||
                      (a.batting?.isNotOut ? "not out" : "—")}
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {a.bowling?.didBowl
                      ? `${a.bowling.overs}-${a.bowling.maidens}-${a.bowling.runs}-${a.bowling.wickets}`
                      : "—"}
                  </td>
                  <td className="p-2 text-xs text-slate-400">
                    {a.matchId?.result?.resultText || "—"}
                  </td>
                </tr>
              ))}
              {!apps.length && (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center text-slate-500 py-10 text-sm"
                  >
                    No match appearances recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {appData?.pages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              className="btn btn-outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span className="px-3 py-2 text-sm text-slate-500">
              {page} / {appData.pages}
            </span>
            <button
              className="btn btn-outline"
              disabled={page >= appData.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---- Sub-components ---- */
const Section = ({ title, children }) => (
  <section>
    <h2 className="font-display text-xl font-bold mb-3">{title}</h2>
    {children}
  </section>
);

const StatsGrid = ({ stats }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {stats.map(([label, val], i) => (
      <motion.div
        key={label}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04 }}
        className="card p-4"
      >
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="font-mono text-2xl font-bold mt-1">{val ?? "—"}</div>
      </motion.div>
    ))}
  </div>
);

const Badge = ({ children, variant }) => (
  <span
    className={`text-xs px-2.5 py-1 rounded-full uppercase font-semibold tracking-wide ${
      variant === "outline"
        ? "border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
        : "bg-primary-100 text-primary-700"
    }`}
  >
    {children}
  </span>
);

const FilterChip = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
      active
        ? "bg-primary-600 text-white"
        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
    }`}
  >
    {children}
  </button>
);
