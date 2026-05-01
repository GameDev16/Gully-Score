import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import MatchCard from "../components/common/MatchCard.jsx";

export default function TournamentPage() {
  const { id } = useParams();
  const { data: t } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => (await api.get(`/api/tournaments/${id}`)).data,
  });
  if (!t) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="card p-6">
        <div className="text-xs text-slate-500">
          {t.format} · {t.shortCode}
        </div>
        <h1 className="font-display text-3xl font-bold mt-1">{t.name}</h1>
        {t.description && (
          <p className="text-slate-600 mt-2">{t.description}</p>
        )}
      </div>

      <section>
        <h2 className="font-semibold text-lg mb-2">Points Table</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="text-xs text-slate-500 text-left">
              <tr>
                <th className="p-2">Team</th>
                <th>P</th>
                <th>W</th>
                <th>L</th>
                <th>T</th>
                <th>NRR</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {t.pointsTable?.map((row, i) => {
                const team = t.teams.find(
                  (x) => String(x._id) === String(row.teamId),
                );
                return (
                  <tr
                    key={i}
                    className="border-t border-slate-100 dark:border-slate-700"
                  >
                    <td className="p-2">
                      <Link className="player-link" to={`/teams/${team?._id}`}>
                        {team?.name}
                      </Link>
                    </td>
                    <td className="font-mono">{row.played}</td>
                    <td className="font-mono">{row.won}</td>
                    <td className="font-mono">{row.lost}</td>
                    <td className="font-mono">{row.tied}</td>
                    <td className="font-mono">{row.nrr?.toFixed(2)}</td>
                    <td className="font-mono font-bold">{row.points}</td>
                  </tr>
                );
              })}
              {!t.pointsTable?.length && (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-slate-500">
                    No standings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-2">Fixtures</h2>
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
