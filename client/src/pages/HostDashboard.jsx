import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import { Link } from "react-router-dom";
import { Plus, Trophy, Users, Calendar, UserPlus } from "lucide-react";

export default function HostDashboard() {
  const { data } = useQuery({
    queryKey: ["my-dashboard"],
    queryFn: async () => (await api.get("/api/users/me/dashboard")).data,
  });

  const tournaments = data?.tournaments || [];
  const matches = data?.matches || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl font-bold">Host Dashboard</h1>
        <div className="flex gap-2">
          <Link className="btn btn-outline" to="/dashboard/new-tournament">
            <Trophy className="w-4 h-4 mr-1" /> New Tournament
          </Link>
          <Link className="btn btn-primary" to="/dashboard/new-match">
            <Plus className="w-4 h-4 mr-1" /> New Match
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Tournaments" value={tournaments.length} icon={Trophy} />
        <Stat label="Matches" value={matches.length} icon={Calendar} />
        <Stat
          label="Live"
          value={matches.filter((m) => m.status === "live").length}
          icon={Users}
        />
        <Stat
          label="Completed"
          value={matches.filter((m) => m.status === "completed").length}
          icon={Users}
        />
      </div>

      <section>
        <h2 className="font-semibold text-lg mb-2">Your Matches</h2>
        <div className="card divide-y divide-slate-100 dark:divide-slate-700">
          {matches.map((m) => (
            <div
              key={m._id}
              className="p-4 flex items-center justify-between flex-wrap gap-2"
            >
              <div>
                <Link
                  to={`/matches/${m._id}`}
                  className="player-link font-medium"
                >
                  {m.title}
                </Link>
                <div className="text-xs text-slate-500">
                  {m.teamA?.name} vs {m.teamB?.name} · {m.format}
                  {m.scorerId && <> · Scorer: {m.scorerId.name}</>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                  {m.status}
                </span>
                {!m.scorerId && (
                  <Link
                    to={`/dashboard/matches/${m._id}/assign`}
                    className="btn btn-outline text-sm"
                  >
                    <UserPlus className="w-4 h-4 mr-1" /> Assign Scorer
                  </Link>
                )}
                <Link
                  to={`/score/${m._id}`}
                  className="btn btn-primary text-sm"
                >
                  Score
                </Link>
              </div>
            </div>
          ))}
          {!matches.length && (
            <p className="p-6 text-slate-500 text-center">No matches yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-2">Your Tournaments</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tournaments.map((t) => (
            <Link
              key={t._id}
              to={`/tournaments/${t._id}`}
              className="card p-4 hover:shadow-md"
            >
              <div className="text-xs text-slate-500">
                {t.format} · {t.shortCode}
              </div>
              <div className="font-bold mt-1">{t.name}</div>
            </Link>
          ))}
          {!tournaments.length && (
            <p className="text-slate-500">No tournaments yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

const Stat = ({ label, value, icon: Icon }) => (
  <div className="card p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold font-mono">{value}</div>
    </div>
  </div>
);
