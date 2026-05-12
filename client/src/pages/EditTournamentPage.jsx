import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import toast from "react-hot-toast";
import { Plus, Trash2, UserPlus, Edit } from "lucide-react";

export default function EditTournamentPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: tournament, refetch } = useQuery({
    queryKey: ["tournament-edit", id],
    queryFn: async () => (await api.get(`/api/tournaments/${id}`)).data,
  });

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("details");

  useEffect(() => {
    if (tournament && !form) {
      setForm({
        name: tournament.name || "",
        description: tournament.description || "",
        format: tournament.format || "T20",
        overs: tournament.overs || 20,
        venue: tournament.venue || "",
        startDate: tournament.startDate ? tournament.startDate.slice(0, 10) : "",
        endDate: tournament.endDate ? tournament.endDate.slice(0, 10) : "",
        status: tournament.status || "upcoming",
        isPublic: tournament.isPublic !== false,
      });
    }
  }, [tournament]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/api/tournaments/${id}`, form);
      toast.success("Tournament updated");
      qc.invalidateQueries({ queryKey: ["tournament", id] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (!form || !tournament) return <div className="p-10 text-center">Loading…</div>;

  const TABS = [
    { id: "details", label: "Details" },
    { id: "teams", label: `Teams (${tournament.teams?.length || 0})` },
    { id: "matches", label: `Matches (${tournament.matches?.length || 0})` },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Edit Tournament</h1>
          <p className="text-sm text-slate-500">{tournament.shortCode} · {tournament.format}</p>
        </div>
        <div className="flex gap-2">
          {tournament.status !== "completed" && (
            <button
              onClick={async () => {
                if (!confirm("End tournament and mark all incomplete matches as finished?")) return;
                try {
                  await api.put(`/api/tournaments/${id}`, { status: "completed" });
                  toast.success("Tournament marked as completed");
                  qc.invalidateQueries({ queryKey: ["tournament", id] });
                  setForm(f => ({ ...f, status: "completed" }));
                } catch (err) {
                  toast.error("Failed to end tournament");
                }
              }}
              className="btn bg-amber-600 text-white hover:bg-amber-700 text-sm"
            >
              End Tournament
            </button>
          )}
          <Link to={`/tournaments/${id}`} className="btn btn-outline text-sm">View Page</Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {tab === "details" && (
        <form onSubmit={saveDetails} className="card p-6 space-y-4">
          <input className="input" placeholder="Tournament name" value={form.name} onChange={e => set("name", e.target.value)} required />
          <textarea className="input" rows={3} placeholder="Description" value={form.description} onChange={e => set("description", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.format} onChange={e => set("format", e.target.value)}>
              {["T10", "T20", "ODI", "Test", "Custom"].map(f => <option key={f}>{f}</option>)}
            </select>
            <input type="number" className="input" placeholder="Overs" value={form.overs} onChange={e => set("overs", Number(e.target.value))} />
          </div>
          <input className="input" placeholder="Venue / city" value={form.venue} onChange={e => set("venue", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><div className="text-xs text-slate-500 mb-1">Start date</div>
              <input type="date" className="input" value={form.startDate} onChange={e => set("startDate", e.target.value)} /></label>
            <label className="block"><div className="text-xs text-slate-500 mb-1">End date</div>
              <input type="date" className="input" value={form.endDate} onChange={e => set("endDate", e.target.value)} /></label>
          </div>
          <select className="input" value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublic} onChange={e => set("isPublic", e.target.checked)} />
            Public tournament
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => nav("/dashboard")} className="btn btn-outline flex-1">Cancel</button>
            <button className="btn btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Save Details"}</button>
          </div>
        </form>
      )}

      {/* Teams tab */}
      {tab === "teams" && (
        <TeamsManager tournamentId={id} teams={tournament.teams || []} onRefresh={refetch} />
      )}

      {/* Matches tab */}
      {tab === "matches" && (
        <MatchesManager tournamentId={id} tournament={tournament} onRefresh={refetch} />
      )}
    </div>
  );
}

/* ---- Teams Manager ---- */
function TeamsManager({ tournamentId, teams, onRefresh }) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newShortName, setNewShortName] = useState("");
  const [adding, setAdding] = useState(false);

  const addTeam = async () => {
    if (!newTeamName.trim()) return toast.error("Team name required");
    setAdding(true);
    try {
      const { data: team } = await api.post("/api/teams", {
        name: newTeamName.trim(),
        shortName: (newShortName || newTeamName.slice(0, 3)).toUpperCase(),
        tournamentId,
      });
      await api.put(`/api/tournaments/${tournamentId}`, {
        $push_team: team._id,
      }).catch(() => {}); // May need explicit endpoint
      // Fallback: use update with teams array
      await api.put(`/api/tournaments/${tournamentId}`, {
        teams: [...teams.map(t => t._id), team._id],
      });
      toast.success("Team added");
      setNewTeamName("");
      setNewShortName("");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setAdding(false);
    }
  };

  const removeTeam = async (teamId) => {
    if (!confirm("Remove this team from the tournament?")) return;
    try {
      await api.put(`/api/tournaments/${tournamentId}`, {
        teams: teams.filter(t => String(t._id) !== String(teamId)).map(t => t._id),
      });
      toast.success("Team removed");
      onRefresh();
    } catch (err) {
      toast.error("Failed to remove team");
    }
  };

  return (
    <div className="space-y-4">
      {/* Add team */}
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Add New Team</h3>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Team name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
          <input className="input w-24" placeholder="Short" maxLength={4} value={newShortName} onChange={e => setNewShortName(e.target.value.toUpperCase())} />
          <button onClick={addTeam} disabled={adding} className="btn btn-primary">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Team list */}
      <div className="card divide-y divide-slate-100 dark:divide-slate-700">
        {teams.map(team => (
          <div key={team._id} className="p-3 flex items-center justify-between">
            <div>
              <span className="font-medium">{team.name}</span>
              <span className="ml-2 text-xs text-slate-400">{team.shortName}</span>
              <span className="ml-2 text-xs text-slate-400">{team.players?.length || 0} players</span>
            </div>
            <div className="flex gap-2">
              <Link to={`/teams/${team._id}`} className="btn btn-outline text-xs">Manage Players</Link>
              <button onClick={() => removeTeam(team._id)} className="btn btn-ghost text-red-500 text-xs">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {!teams.length && <p className="p-4 text-slate-500 text-sm">No teams yet.</p>}
      </div>
    </div>
  );
}

/* ---- Matches Manager ---- */
function MatchesManager({ tournamentId, tournament, onRefresh }) {
  const [newMatch, setNewMatch] = useState({ teamAIdx: 0, teamBIdx: 1, date: "", scorerEmail: "" });
  const [adding, setAdding] = useState(false);
  const teams = tournament.teams || [];
  const matches = tournament.matches || [];

  const addMatch = async () => {
    if (teams.length < 2) return toast.error("Need at least 2 teams");
    if (newMatch.teamAIdx === newMatch.teamBIdx) return toast.error("Teams must be different");
    setAdding(true);
    try {
      const tA = teams[newMatch.teamAIdx];
      const tB = teams[newMatch.teamBIdx];
      const { data: match } = await api.post("/api/matches", {
        title: `${tA.name} vs ${tB.name}`,
        format: tournament.format,
        overs: tournament.overs,
        teamA: tA._id,
        teamB: tB._id,
        date: newMatch.date || undefined,
        tournamentId,
      });
      if (newMatch.scorerEmail.trim()) {
        try {
          await api.post(`/api/matches/${match._id}/assign-scorer`, { email: newMatch.scorerEmail.trim() });
        } catch {
          toast("Scorer not found — assign later");
        }
      }
      toast.success("Match scheduled");
      setNewMatch({ teamAIdx: 0, teamBIdx: 1, date: "", scorerEmail: "" });
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Tournament Matches</h3>
        <Link 
          to={`/dashboard/tournaments/${tournamentId}/new-match`} 
          className={`btn btn-primary ${teams.length < 2 ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Plus className="w-4 h-4 mr-1" /> Schedule Match
        </Link>
      </div>
      {teams.length < 2 && (
        <div className="text-sm text-slate-500 mb-2">Add at least 2 teams before scheduling matches.</div>
      )}

      <div className="card divide-y divide-slate-100 dark:divide-slate-700">
        {matches.map(m => (
          <div key={m._id} className="p-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-medium text-sm">{m.title || `${m.teamA?.name} vs ${m.teamB?.name}`}</div>
              <div className="text-xs text-slate-400">
                {m.status}
                {m.date && ` · ${new Date(m.date).toLocaleDateString()}`}
                {m.scorerId && ` · Scorer: ${m.scorerId.name || m.scorerId.email || "assigned"}`}
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/dashboard/matches/${m._id}/assign`} className="btn btn-outline text-xs">
                <UserPlus className="w-3 h-3 mr-1" /> Scorer
              </Link>
              <Link to={`/dashboard/matches/${m._id}/edit`} className="btn btn-outline text-xs">
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Link>
              <button
                onClick={async () => {
                  if (!confirm(`Delete match "${m.title || 'this match'}"? This cannot be undone.`)) return;
                  try {
                    await api.delete(`/api/matches/${m._id}`);
                    toast.success("Match deleted");
                    onRefresh();
                  } catch (err) {
                    toast.error(err.response?.data?.message || "Failed to delete");
                  }
                }}
                className="btn btn-ghost text-red-500 text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </button>
            </div>
          </div>
        ))}
        {!matches.length && <p className="p-4 text-slate-500 text-sm">No matches scheduled yet.</p>}
      </div>
    </div>
  );
}
