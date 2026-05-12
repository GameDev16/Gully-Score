import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore.js";
import { Plus } from "lucide-react";

export default function NewMatchPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [form, setForm] = useState({
    title: "",
    format: "T20",
    overs: 20,
    teamAName: "",
    teamBName: "",
    venueName: "",
    date: "",
  });
  const [teamAPlayers, setTeamAPlayers] = useState([{ id: Date.now(), name: "" }]);
  const [teamBPlayers, setTeamBPlayers] = useState([{ id: Date.now() + 1, name: "" }]);
  const [scorerEmail, setScorerEmail] = useState("");
  const [assignToSelf, setAssignToSelf] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.teamAName.trim() || !form.teamBName.trim())
      return toast.error("Both team names are required");
    if (!form.venueName.trim()) return toast.error("Venue is required");
    if (!form.date) return toast.error("Date is required");

    setSubmitting(true);
    try {
      // 1. Create teams on the fly
      const [tA, tB] = await Promise.all([
        api.post("/api/teams", { name: form.teamAName.trim(), shortName: form.teamAName.trim().slice(0, 3).toUpperCase() }).then(r => r.data),
        api.post("/api/teams", { name: form.teamBName.trim(), shortName: form.teamBName.trim().slice(0, 3).toUpperCase() }).then(r => r.data),
      ]);

      // Add players
      const addPlayers = async (teamId, playersArray) => {
        const names = playersArray.map(p => p.name.trim()).filter(Boolean);
        for (const name of names) {
          await api.post(`/api/teams/${teamId}/players`, { name, role: "batsman" });
        }
      };
      await Promise.all([
        addPlayers(tA._id, teamAPlayers),
        addPlayers(tB._id, teamBPlayers)
      ]);

      // 2. Create venue
      let venueId = "";
      if (form.venueName.trim()) {
        const vr = await api.post("/api/venues", { name: form.venueName.trim(), city: "" });
        venueId = vr.data._id;
      }

      // 3. Create match
      const matchBody = {
        title: form.title || `${form.teamAName} vs ${form.teamBName}`,
        format: form.format,
        overs: form.overs,
        teamA: tA._id,
        teamB: tB._id,
        date: form.date,
        venue: venueId
      };

      const { data: match } = await api.post("/api/matches", matchBody);
      qc.invalidateQueries({ queryKey: ["matches"] });

      // 4. Assign scorer
      const emailToAssign = assignToSelf ? user.email : scorerEmail.trim();
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
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create match");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-3xl font-bold mb-2">New Match</h1>
      <p className="text-sm text-slate-500 mb-6">
        Quick standalone match — enter team names and get started
      </p>

      <form onSubmit={submit} className="space-y-4">
        {/* Match title */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-base">Match Details</h2>
          <input
            className="input"
            placeholder="Match title (e.g., Sunday League Final) — optional"
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
          <h2 className="font-semibold text-base">Teams & Players</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">Team A *</label>
              <input
                className="input"
                placeholder="e.g. Mumbai Lions"
                value={form.teamAName}
                onChange={(e) => set("teamAName", e.target.value)}
                required
              />
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Players</span>
                  <button type="button" onClick={() => setTeamAPlayers([...teamAPlayers, { id: Date.now(), name: "" }])} className="btn btn-primary text-xs py-1 px-3 rounded-full"><Plus className="w-3.5 h-3.5 mr-1" />Add Player</button>
                </div>
                {teamAPlayers.map((p, idx) => (
                  <div key={p.id} className="flex gap-2">
                    <input
                      className="input py-1.5 text-sm"
                      placeholder={`Player ${idx + 1}`}
                      value={p.name}
                      onChange={(e) => setTeamAPlayers(teamAPlayers.map(player => player.id === p.id ? { ...player, name: e.target.value } : player))}
                    />
                    <button type="button" onClick={() => setTeamAPlayers(teamAPlayers.filter(player => player.id !== p.id))} className="text-danger text-sm px-2">✕</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">Team B *</label>
              <input
                className="input"
                placeholder="e.g. Delhi Eagles"
                value={form.teamBName}
                onChange={(e) => set("teamBName", e.target.value)}
                required
              />
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Players</span>
                  <button type="button" onClick={() => setTeamBPlayers([...teamBPlayers, { id: Date.now(), name: "" }])} className="btn btn-primary text-xs py-1 px-3 rounded-full"><Plus className="w-3.5 h-3.5 mr-1" />Add Player</button>
                </div>
                {teamBPlayers.map((p, idx) => (
                  <div key={p.id} className="flex gap-2">
                    <input
                      className="input py-1.5 text-sm"
                      placeholder={`Player ${idx + 1}`}
                      value={p.name}
                      onChange={(e) => setTeamBPlayers(teamBPlayers.map(player => player.id === p.id ? { ...player, name: e.target.value } : player))}
                    />
                    <button type="button" onClick={() => setTeamBPlayers(teamBPlayers.filter(player => player.id !== p.id))} className="text-danger text-sm px-2">✕</button>
                  </div>
                ))}
              </div>
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

        <button className="btn btn-primary w-full py-3 text-base" disabled={submitting}>
          {submitting ? "Creating match…" : "Create Match"}
        </button>
      </form>
    </div>
  );
}
