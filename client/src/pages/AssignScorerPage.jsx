import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import toast from "react-hot-toast";
import { UserCheck } from "lucide-react";

export default function AssignScorerPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignToSelf, setAssignToSelf] = useState(false);
  const user = useAuthStore((s) => s.user);

  const { data: match } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => (await api.get(`/api/matches/${id}`)).data,
  });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const emailToAssign = assignToSelf ? user?.email : email.trim();
    try {
      await api.post(`/api/matches/${id}/assign-scorer`, { email: emailToAssign });
      toast.success("Scorer assigned — they've been notified");
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold mb-1">
        {match?.scorerId ? "Re-assign Scorer" : "Assign Scorer"}
      </h1>
      <p className="text-sm text-slate-500 mb-4">{match?.title}</p>

      {match?.scorerId && (
        <div className="card p-3 mb-4 flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
          <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Currently assigned to{" "}
            <strong>{match.scorerId?.name || "a scorer"}</strong>. Submitting
            will replace them.
          </span>
        </div>
      )}

      <form onSubmit={submit} className="card p-5 space-y-3">
        <label className="block">
          <div className="text-sm font-medium mb-1">Scorer email</div>
          <div className="text-xs text-slate-500 mb-2">
            The scorer will receive a notification with a direct link to this
            match.
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
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
            required={!assignToSelf}
            placeholder="scorer@example.com"
            value={assignToSelf ? user?.email : email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={assignToSelf}
          />
        </label>
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Assigning…" : "Assign Scorer"}
        </button>
      </form>
    </div>
  );
}
