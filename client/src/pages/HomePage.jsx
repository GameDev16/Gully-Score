import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import MatchCard from "../components/common/MatchCard.jsx";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const { data: live } = useQuery({
    queryKey: ["matches", "live"],
    queryFn: async () =>
      (await api.get("/api/matches", { params: { status: "live" } })).data,
  });
  const { data: upcoming } = useQuery({
    queryKey: ["matches", "upcoming"],
    queryFn: async () =>
      (await api.get("/api/matches", { params: { status: "upcoming" } })).data,
  });
  const { data: completed } = useQuery({
    queryKey: ["matches", "completed"],
    queryFn: async () =>
      (await api.get("/api/matches", { params: { status: "completed" } })).data,
  });
  const { data: tournaments } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => (await api.get("/api/tournaments")).data,
  });

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-3">
            Live cricket. <br /> Hosted by you.
          </h1>
          <p className="text-primary-100 mb-6">
            Follow ball-by-ball updates from grassroots to clubs, or host your
            own tournament in minutes.
          </p>
          <form onSubmit={submit} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search match key, team, player…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-slate-900 focus:outline-none"
              />
            </div>
            <button className="px-5 py-2.5 rounded-lg bg-accent text-slate-900 font-semibold hover:opacity-90">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Live strip */}
      <Section title="🔴 Live Now" empty={!live?.length}>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
          {live?.map((m) => (
            <div key={m._id} className="min-w-[300px] max-w-[300px]">
              <MatchCard match={m} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Upcoming" empty={!upcoming?.length}>
        <Grid items={upcoming} />
      </Section>

      <Section title="Recently Completed" empty={!completed?.length}>
        <Grid items={completed} />
      </Section>

      <Section title="Featured Tournaments" empty={!tournaments?.length}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments?.map((t) => (
            <Link
              key={t._id}
              to={`/tournaments/${t._id}`}
              className="card p-5 hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-primary-100 text-primary-700">
                  {t.format}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {t.shortCode}
                </span>
              </div>
              <h3 className="font-display font-bold text-lg">{t.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">
                {t.description || "Click to view fixtures and points table."}
              </p>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

const Section = ({ title, children, empty }) => (
  <section>
    <h2 className="font-display text-2xl font-bold mb-4">{title}</h2>
    {empty ? <p className="text-sm text-slate-500">No data yet.</p> : children}
  </section>
);
const Grid = ({ items }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {items?.map((m) => (
      <MatchCard key={m._id} match={m} />
    ))}
  </div>
);
