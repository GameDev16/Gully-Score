import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import { calcAge } from "../utils/format.js";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";

export default function PlayerProfilePage() {
  const { id } = useParams();
  const [filter, setFilter] = useState({ role: "", format: "" });
  const [page, setPage] = useState(1);

  const { data: player } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => (await api.get(`/api/players/${id}`)).data,
  });

  const { data: appData } = useQuery({
    queryKey: ["player-appearances", id, filter, page],
    queryFn: async () =>
      (
        await api.get(`/api/players/${id}/appearances`, {
          params: { page, limit: 20, ...filter },
        })
      ).data,
  });

  if (!player)
    return <div className="p-10 text-center text-slate-500">Loading…</div>;

  const cs = player.career_stats || {};
  const bat = cs.batting || {};
  const bow = cs.bowling || {};
  const hasBowled = (bow.overs || 0) > 0;

  const apps = appData?.items || [];
  const battingTrend = apps
    .filter((a) => a.batting?.didBat)
    .reverse()
    .map((a) => ({
      date: new Date(a.matchDate).toLocaleDateString(),
      runs: a.batting.runs,
    }));
  const bowlingTrend = apps
    .filter((a) => a.bowling?.didBowl)
    .reverse()
    .map((a) => ({
      date: new Date(a.matchDate).toLocaleDateString(),
      wickets: a.bowling.wickets,
    }));

  const dismissalCounts = useMemo(() => {
    const c = {};
    apps.forEach((a) => {
      if (a.batting?.dismissalType) {
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
      >
        <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 text-3xl font-bold flex items-center justify-center">
          {player.avatar ? (
            <img
              src={player.avatar}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            player.name
              ?.split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-3xl font-bold">{player.name}</h1>
            {player.jerseyNumber != null && (
              <span className="text-slate-400 font-mono">
                #{player.jerseyNumber}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {player.teamId && (
              <Link to={`/teams/${player.teamId._id}`} className="player-link">
                {player.teamId.name}
              </Link>
            )}
            {calcAge(player.dateOfBirth) && (
              <> · {calcAge(player.dateOfBirth)} yrs</>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{player.role}</Badge>
            <Badge variant="outline">{player.battingStyle}</Badge>
            {player.bowlingStyle !== "none" && (
              <Badge variant="outline">{player.bowlingStyle}</Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* CAREER STATS */}
      <Section title="Batting Career">
        <StatsGrid
          stats={[
            ["Runs", bat.runs || 0],
            ["Average", (bat.average || 0).toFixed(2)],
            ["SR", (bat.strikeRate || 0).toFixed(2)],
            ["HS", bat.highestScore || 0],
            ["50s", bat.fifties || 0],
            ["100s", bat.hundreds || 0],
            ["4s", bat.fours || 0],
            ["6s", bat.sixes || 0],
          ]}
        />
      </Section>

      {hasBowled && (
        <Section title="Bowling Career">
          <StatsGrid
            stats={[
              ["Wickets", bow.wickets || 0],
              ["Average", (bow.average || 0).toFixed(2)],
              ["Economy", (bow.economy || 0).toFixed(2)],
              [
                "Best",
                `${bow.bestFigures?.wickets || 0}/${bow.bestFigures?.runs || 0}`,
              ],
              ["4w", bow.fourWickets || 0],
              ["5w", bow.fiveWickets || 0],
            ]}
          />
        </Section>
      )}

      {/* TRENDS */}
      {battingTrend.length > 0 && (
        <Section title="Batting Trend">
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={battingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="runs"
                  stroke="#1A7A4A"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {bowlingTrend.length > 0 && (
        <Section title="Bowling Trend">
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bowlingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="wickets" fill="#E89C2F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* DISMISSAL DONUT */}
      {dismissalCounts.length >= 3 && (
        <Section title="How He Gets Out">
          <div className="card p-4 max-w-md">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dismissalCounts}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                >
                  {dismissalCounts.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* APPEARANCES */}
      <Section title="Match Appearances">
        <div className="card p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            <FilterChip
              onClick={() => setFilter({ role: "", format: "" })}
              active={!filter.role && !filter.format}
            >
              All
            </FilterChip>
            <FilterChip
              onClick={() => setFilter((f) => ({ ...f, role: "batting" }))}
              active={filter.role === "batting"}
            >
              Batting
            </FilterChip>
            <FilterChip
              onClick={() => setFilter((f) => ({ ...f, role: "bowling" }))}
              active={filter.role === "bowling"}
            >
              Bowling
            </FilterChip>
            {["T20", "ODI", "T10"].map((f) => (
              <FilterChip
                key={f}
                active={filter.format === f}
                onClick={() =>
                  setFilter((p) => ({ ...p, format: p.format === f ? "" : f }))
                }
              >
                {f}
              </FilterChip>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="text-xs text-slate-500 text-left">
                <tr>
                  <th className="py-2 sticky left-0 bg-white dark:bg-slate-800">
                    Date
                  </th>
                  <th>Match</th>
                  <th>Format</th>
                  <th>vs</th>
                  <th>Bat</th>
                  <th>How Out</th>
                  <th>Bowl</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr
                    key={a._id}
                    className="border-t border-slate-100 dark:border-slate-700"
                  >
                    <td className="py-2 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-800">
                      {a.matchDate &&
                        new Date(a.matchDate).toLocaleDateString()}
                    </td>
                    <td>
                      <Link
                        className="player-link"
                        to={`/matches/${a.matchId?._id}`}
                      >
                        {a.matchTitle || "Match"}
                      </Link>
                      {a.tournamentId && (
                        <div className="text-xs">
                          <Link
                            className="text-slate-500 hover:text-primary-600"
                            to={`/tournaments/${a.tournamentId._id}`}
                          >
                            {a.tournamentId.name}
                          </Link>
                        </div>
                      )}
                    </td>
                    <td>{a.format}</td>
                    <td>
                      {a.oppositionTeamId?.shortName ||
                        a.oppositionTeamId?.name ||
                        "—"}
                    </td>
                    <td className="font-mono">
                      {a.batting?.didBat
                        ? `${a.batting.runs}(${a.batting.balls})`
                        : "—"}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {a.batting?.dismissalType ||
                        (a.batting?.isNotOut ? "not out" : "—")}
                    </td>
                    <td className="font-mono">
                      {a.bowling?.didBowl
                        ? `${a.bowling.overs}-${a.bowling.maidens}-${a.bowling.runs}-${a.bowling.wickets}`
                        : "—"}
                    </td>
                    <td className="text-xs text-slate-500">
                      {a.matchId?.result?.resultText || "—"}
                    </td>
                  </tr>
                ))}
                {!apps.length && (
                  <tr>
                    <td colSpan="8" className="text-center text-slate-500 py-8">
                      No appearances yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {appData?.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <span className="px-3 py-2 text-sm">
                Page {page} / {appData.pages}
              </span>
              <button
                className="btn btn-outline"
                disabled={page >= appData.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

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
        <div className="font-mono text-2xl font-bold mt-1">{val}</div>
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

const FilterChip = ({ children, active, ...props }) => (
  <button
    {...props}
    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
      active
        ? "bg-primary-600 text-white"
        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
    }`}
  >
    {children}
  </button>
);
