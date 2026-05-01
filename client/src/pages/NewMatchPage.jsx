import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import toast from "react-hot-toast";

export default function NewMatchPage() {
  const nav = useNavigate();
  const { data: dash } = useQuery({
    queryKey: ["my-dashboard"],
    queryFn: async () => (await api.get("/api/users/me/dashboard")).data,
  });
  const { data: venues } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => (await api.get("/api/venues")).data,
  });

  const [form, setForm] = useState({
    title: "",
    format: "T20",
    overs: 20,
    teamA: "",
    teamB: "",
    venue: "",
    date: "",
  });

  // Fetch all teams from user's tournaments (simplified: pull from dashboard tournaments)
  const myTeams = dash?.tournaments?.flatMap((t) => t.teams || []) || [];

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/matches", form);
      toast.success(`Match created. Key: ${data.matchKey}`);
      nav(`/matches/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-3xl font-bold mb-6">New Match</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <input
          className="input"
          placeholder="Match title (e.g., Final)"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className="input"
            value={form.format}
            onChange={(e) => set("format", e.target.value)}
          >
            {["T10", "T20", "ODI", "Test", "Custom"].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <input
            type="number"
            className="input"
            placeholder="Overs"
            value={form.overs}
            onChange={(e) => set("overs", Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            className="input"
            value={form.teamA}
            onChange={(e) => set("teamA", e.target.value)}
            required
          >
            <option value="">— Team A —</option>
            {myTeams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={form.teamB}
            onChange={(e) => set("teamB", e.target.value)}
            required
          >
            <option value="">— Team B —</option>
            {myTeams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <select
          className="input"
          value={form.venue}
          onChange={(e) => set("venue", e.target.value)}
        >
          <option value="">— Venue —</option>
          {venues?.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          className="input"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
        />
        <button className="btn btn-primary w-full">Create Match</button>
      </form>
    </div>
  );
}
