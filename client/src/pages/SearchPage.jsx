import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import MatchCard from "../components/common/MatchCard.jsx";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: async () => (await api.get("/api/search", { params: { q } })).data,
    enabled: !!q,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-2xl font-bold">Results for "{q}"</h1>
      {isLoading && <p>Searching…</p>}
      {data && (
        <>
          <Section title="Matches">
            {data.matches.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {data.matches.map((m) => (
                  <MatchCard key={m._id} match={m} />
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </Section>

          <Section title="Tournaments">
            {data.tournaments.length ? (
              <div className="grid sm:grid-cols-3 gap-3">
                {data.tournaments.map((t) => (
                  <Link
                    key={t._id}
                    to={`/tournaments/${t._id}`}
                    className="card p-4 hover:shadow-md"
                  >
                    <div className="text-xs text-slate-500">
                      {t.format} · {t.shortCode}
                    </div>
                    <div className="font-bold">{t.name}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </Section>

          <Section title="Teams">
            {data.teams.length ? (
              <div className="grid sm:grid-cols-3 gap-3">
                {data.teams.map((t) => (
                  <Link
                    key={t._id}
                    to={`/teams/${t._id}`}
                    className="card p-4 hover:shadow-md"
                  >
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.shortName}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </Section>

          <Section title="Players">
            {data.players.length ? (
              <div className="grid sm:grid-cols-3 gap-3">
                {data.players.map((p) => (
                  <Link
                    key={p._id}
                    to={`/players/${p._id}`}
                    className="card p-4 hover:shadow-md"
                  >
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.role} · {p.teamId?.name || "Free agent"}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
const Section = ({ title, children }) => (
  <section>
    <h2 className="font-semibold text-lg mb-2">{title}</h2>
    {children}
  </section>
);
const Empty = () => <p className="text-sm text-slate-500">No results.</p>;
