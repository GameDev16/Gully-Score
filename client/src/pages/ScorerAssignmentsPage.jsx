import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { ClipboardList } from "lucide-react";

export default function ScorerAssignmentsPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: async () => (await api.get("/api/users/me/assignments")).data,
  });

  if (isLoading) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-7 h-7 text-primary-600" />
        <h1 className="font-display text-3xl font-bold">My Scoring Assignments</h1>
      </div>

      {!matches?.length ? (
        <div className="card p-10 text-center text-slate-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No matches assigned yet.</p>
          <p className="text-sm mt-1">
            When a host assigns you as scorer, it will appear here.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-700">
          {matches.map((m) => (
            <div
              key={m._id}
              className="p-4 flex items-center justify-between flex-wrap gap-3"
            >
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {m.teamA?.name} vs {m.teamB?.name}
                  {m.tournamentId && <> · {m.tournamentId.name}</>}
                  {m.date && (
                    <>
                      {" "}
                      ·{" "}
                      {new Date(m.date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs uppercase px-2 py-0.5 rounded font-medium ${
                    m.status === "live"
                      ? "bg-green-100 text-green-700"
                      : m.status === "completed"
                        ? "bg-slate-100 text-slate-500"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {m.status}
                </span>
                <Link
                  to={`/score/${m._id}`}
                  className="btn btn-primary text-sm"
                >
                  Open Scoring Pad
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
