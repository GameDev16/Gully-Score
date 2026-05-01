import { Link } from "react-router-dom";
import LiveBadge from "./LiveBadge.jsx";

const TeamRow = ({ team, score }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
        {team?.shortName || team?.name?.slice(0, 3).toUpperCase() || "—"}
      </div>
      <span className="font-medium truncate">{team?.name || "TBD"}</span>
    </div>
    <span className="score-mono font-bold">{score || "—"}</span>
  </div>
);

export default function MatchCard({ match }) {
  const live = match.status === "live";
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
      </div>
      <div className="space-y-1">
        <TeamRow team={match.teamA} />
        <TeamRow team={match.teamB} />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500">
        {match.result?.resultText || (live ? "In progress" : match.status)}
      </div>
    </Link>
  );
}
