import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import MatchCard from "../components/common/MatchCard.jsx";
import { useAuthStore } from "../store/authStore.js";
import { Edit } from "lucide-react";

export default function TournamentPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);

  const { data: t } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => (await api.get(`/api/tournaments/${id}`)).data,
  });

  const { data: pointsTable } = useQuery({
    queryKey: ["points-table", id],
    queryFn: async () =>
      (await api.get(`/api/tournaments/${id}/points-table`)).data,
    enabled: !!id,
  });

  if (!t) return <div className="p-10 text-center">Loading…</div>;

  const isHost = user && String(user._id) === String(t.hostId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-slate-500">
              {t.format} · {t.shortCode}
            </div>
            <h1 className="font-display text-3xl font-bold mt-1">{t.name}</h1>
            {t.description && (
              <p className="text-slate-600 mt-2">{t.description}</p>
            )}
          </div>
          {isHost && (
            <Link
              to={`/dashboard/tournaments/${t._id}/edit`}
              className="btn btn-outline text-sm shrink-0"
            >
              <Edit className="w-4 h-4 mr-1" /> Edit Tournament
            </Link>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-semibold text-lg mb-2">Points Table</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="text-xs text-slate-500 text-left bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="p-2 w-6">#</th>
                <th className="p-2">Team</th>
                <th className="p-2">P</th>
                <th className="p-2">W</th>
                <th className="p-2">L</th>
                <th className="p-2">T</th>
                <th className="p-2">NRR</th>
                <th className="p-2 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {pointsTable?.map((row, i) => {
                const team = row.teamId;
                return (
                  <tr
                    key={i}
                    className="border-t border-slate-100 dark:border-slate-700"
                  >
                    <td className="p-2 text-slate-400 text-xs font-mono">
                      {i + 1}
                    </td>
                    <td className="p-2">
                      <Link
                        className="player-link"
                        to={`/teams/${team?._id}`}
                      >
                        {team?.name || "Unknown"}
                      </Link>
                    </td>
                    <td className="font-mono p-2">{row.played}</td>
                    <td className="font-mono p-2">{row.won}</td>
                    <td className="font-mono p-2">{row.lost}</td>
                    <td className="font-mono p-2">{row.tied}</td>
                    <td className="font-mono p-2">
                      {row.nrr != null
                        ? (row.nrr >= 0 ? "+" : "") + row.nrr.toFixed(3)
                        : "—"}
                    </td>
                    <td className="font-mono font-bold p-2">{row.points}</td>
                  </tr>
                );
              })}
              {!pointsTable?.length && (
                <tr>
                  <td colSpan="8" className="p-4 text-center text-slate-500">
                    No standings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">Fixtures</h2>
          {isHost && (
            <Link
              to="/dashboard/new-match"
              className="btn btn-outline text-sm"
            >
              + Add Match
            </Link>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {t.matches?.map((m) => (
            <MatchCard key={m._id} match={m} />
          ))}
          {!t.matches?.length && (
            <p className="text-slate-500">No matches yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-2">Teams</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {t.teams?.map((team) => (
            <Link
              key={team._id}
              to={`/teams/${team._id}`}
              className="card p-4 hover:shadow-md"
            >
              <div className="font-bold">{team.name}</div>
              <div className="text-xs text-slate-500">{team.shortName}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
