import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import PlayerLink from "../components/common/PlayerLink.jsx";

export default function TeamPage() {
  const { id } = useParams();
  const { data: t } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => (await api.get(`/api/teams/${id}`)).data,
  });
  if (!t) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="card p-6 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
          style={{ background: t.homeColor || "#1A7A4A" }}
        >
          {t.shortName || t.name?.slice(0, 3).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{t.name}</h1>
          <div className="text-sm text-slate-500">{t.shortName}</div>
        </div>
      </div>

      <section>
        <h2 className="font-semibold text-lg mb-2">Squad</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {t.players?.map((p) => (
            <div key={p._id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center">
                {p.name
                  ?.split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <PlayerLink player={p} />
                <div className="text-xs text-slate-500 capitalize">
                  {p.role}
                </div>
              </div>
            </div>
          ))}
          {!t.players?.length && (
            <p className="text-slate-500">No players yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
