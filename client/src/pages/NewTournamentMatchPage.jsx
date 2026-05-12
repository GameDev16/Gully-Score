import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore.js";

export default function NewTournamentMatchPage() {
  const { id: tournamentId } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: async () => (await api.get(`/api/tournaments/${tournamentId}`)).data,
  });

  const [form, setForm] = useState({
    title: "",
    format: "T20",
    overs: 20,
    teamAIdx: 0,
    teamBIdx: 1,
    venueName: "",
    date: "",
  });
  const [scorerEmail, setScorerEmail] = useState("");
  const [assignToSelf, setAssignToSelf] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Set default format and overs based on tournament when it loads
  useEffect(() => {
    if (tournament) {
      setForm(f => ({ ...f, format: tournament.format, overs: tournament.overs || 20 }));
    }
  }, [tournament]);

  if (isLoading || !tournament) return <div className="p-10 text-center">Loading…</div>;

  const teams = tournament.teams || [];
  if (teams.length < 2) {
    return <div className="p-10 text-center text-slate-500">Not enough teams in this tournament to schedule a match.</div>;
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.teamAIdx === form.teamBIdx) return toast.error("Teams must be different");
    if (!form.venueName.trim()) return toast.error("Venue is required");
    if (!form.date) return toast.error("Date is required");

    setSubmitting(true);
    try {
      const tA = teams[form.teamAIdx];
      const tB = teams[form.teamBIdx];

      // Create venue
      let venueId = "";
      if (form.venueName.trim()) {
        const vr = await api.post("/api/venues", { name: form.venueName.trim(), city: "" });
        venueId = vr.data._id;
      }

      // Create match
      const matchBody = {
        title: form.title || `${tA.name} vs ${tB.name}`,
        format: form.format,
        overs: form.overs,
        teamA: tA._id,
        teamB: tB._id,
        date: form.date,
        venue: venueId,
        tournamentId
      };

      const { data: match } = await api.post("/api/matches", matchBody);
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] });

      // Assign scorer
      const emailToAssign = assignToSelf ? user?.email : scorerEmail.trim();
      if (emailToAssign) {
        try {
          await api.post(`/api/matches/${match._id}/assign-scorer`, { email: emailToAssign });
          toast.success(`Match created & scorer assigned.`);
        } catch {
          toast.success(`Match created.`);
          toast.error("Scorer not found — assign later from dashboard");
        }
      } else {
        toast.success(`Match created.`);
      }
      nav(`/dashboard/tournaments/${tournamentId}/edit`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create match");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-3xl font-bold mb-2">Schedule Tournament Match</h1>
      <p className="text-sm text-slate-500 mb-6">
        {tournament.name} ({tournament.shortCode})
      </p>

      <form onSubmit={submit} className="space-y-4">
        {/* Match title */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-base">Match Details</h2>
          <input
            className="input"
            placeholder="Match title (e.g., Final, Semi-Final) — optional"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.format} onChange={(e) => set("format", e.target.value)}>
              {["T10", "T20", "ODI", "Test", "Custom"].map((f) => <option key={f}>{f}</option>)}
            </select>
            <input
              type="number"
              className="input"
              placeholder="Overs"
              value={form.overs}
              min={1}
              onChange={(e) => set("overs", Number(e.target.value))}
            />
          </div>
          <input
            type="datetime-local"
            className="input"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>

        {/* Teams */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-base">Select Teams</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">Team A *</label>
              <select className="input" value={form.teamAIdx} onChange={e => {
                const val = Number(e.target.value);
                setForm(f => ({ ...f, teamAIdx: val, teamBIdx: val === f.teamBIdx ? (val === 0 ? 1 : 0) : f.teamBIdx }));
              }}>
                {teams.map((t, i) => <option key={t._id} value={i}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">Team B *</label>
              <select className="input" value={form.teamBIdx} onChange={e => set("teamBIdx", Number(e.target.value))}>
                {teams.map((t, i) => <option key={t._id} value={i} disabled={i === form.teamAIdx}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Venue */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-base">Venue *</h2>
          <input
            className="input"
            placeholder="e.g. DY Patil Stadium"
            value={form.venueName}
            onChange={(e) => set("venueName", e.target.value)}
            required
          />
        </div>

        {/* Scorer */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-base">Assign Scorer</h2>
          
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input 
              type="checkbox" 
              checked={assignToSelf} 
              onChange={(e) => setAssignToSelf(e.target.checked)} 
              className="rounded text-primary-600 border-slate-300 focus:ring-primary-500"
            />
            Assign to me (Host)
          </label>
          
          <input
            className="input disabled:opacity-50 disabled:bg-slate-50"
            type="email"
            placeholder="scorer@example.com"
            value={assignToSelf ? user?.email : scorerEmail}
            onChange={(e) => setScorerEmail(e.target.value)}
            disabled={assignToSelf}
          />
          <p className="text-xs text-slate-400">Scorer will be notified with a direct link to this match.</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => nav(`/dashboard/tournaments/${tournamentId}/edit`)}
            className="btn btn-outline flex-1"
          >
            Cancel
          </button>
          <button className="btn btn-primary flex-1" disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule Match"}
          </button>
        </div>
      </form>
    </div>
  );
}
