import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import toast from "react-hot-toast";

export default function EditMatchPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: match } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => (await api.get(`/api/matches/${id}`)).data,
  });

  const { data: venues } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => (await api.get("/api/venues")).data,
  });

  useEffect(() => {
    if (match && !form) {
      setForm({
        title: match.title || "",
        format: match.format || "T20",
        overs: match.overs || 20,
        venueName: match.venue?.name || "",
        date: match.date ? match.date.slice(0, 16) : "",
        umpire1: match.umpire1 || "",
        umpire2: match.umpire2 || "",
        notes: match.notes || "",
      });
    }
  }, [match]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/api/matches/${id}`, form);
      toast.success("Match updated");
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-3xl font-bold mb-2">Edit Match</h1>
      <p className="text-sm text-slate-500 mb-6">{match?.title}</p>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <input
          className="input"
          placeholder="Match title"
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
        <input
          className="input"
          placeholder="Venue (e.g. DY Patil Stadium)"
          value={form.venueName}
          onChange={(e) => set("venueName", e.target.value)}
          required
        />
        <input
          type="datetime-local"
          className="input"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Umpire 1"
            value={form.umpire1}
            onChange={(e) => set("umpire1", e.target.value)}
          />
          <input
            className="input"
            placeholder="Umpire 2"
            value={form.umpire2}
            onChange={(e) => set("umpire2", e.target.value)}
          />
        </div>
        <textarea
          className="input"
          rows={3}
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => nav("/dashboard")}
            className="btn btn-outline flex-1"
          >
            Cancel
          </button>
          <button className="btn btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
