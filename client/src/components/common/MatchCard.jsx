import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import LiveBadge from "./LiveBadge.jsx";
import api from "../../api/client.js";

function TeamScoreRow({ team, innings }) {
  const inn = innings?.find(
    (i) => String(i.battingTeam?._id || i.battingTeam) === String(team?._id),
  );
  const score = inn ? `${inn.totalRuns}/${inn.totalWickets}` : "—";
  const overs = inn ? ` (${formatOvers(inn.totalBalls)})` : "";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
          {team?.shortName || team?.name?.slice(0, 3).toUpperCase() || "—"}
        </div>
        <span className="font-medium truncate">{team?.name || "TBD"}</span>
      </div>
      <span className="score-mono font-bold text-sm shrink-0">
        {score}
        {inn && <span className="text-xs text-slate-400 font-normal">{overs}</span>}
      </span>
    </div>
  );
}

function formatOvers(balls) {
  if (!balls && balls !== 0) return "0.0";
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export default function MatchCard({ match }) {
  const live = match.status === "live" || match.status === "innings-break";
  const completed = match.status === "completed";
  const needState = live || completed;

  const { data: state } = useQuery({
    queryKey: ["match-state-card", match._id],
    queryFn: async () => (await api.get(`/api/matches/${match._id}/state`)).data,
    enabled: needState,
    staleTime: live ? 0 : 60000,
    refetchInterval: live ? 10000 : false,
  });

  const innings = state?.innings || [];

  return (
    <Link
      to={`/matches/${match._id}`}
      className="card p-4 block hover:shadow-md transition"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">
          {match.format} · {match.title}
        </span>
        {live && <LiveBadge />}
        {completed && (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
            Completed
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <TeamScoreRow team={match.teamA} innings={innings} />
        <TeamScoreRow team={match.teamB} innings={innings} />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500">
        {match.result?.resultText ||
          (live ? "In progress" : match.status === "upcoming" ? "Upcoming" : match.status)}
      </div>
    </Link>
  );
}
