import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import toast from "react-hot-toast";

export default function AssignScorerPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [email, setEmail] = useState("");

  const { data: match } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => (await api.get(`/api/matches/${id}`)).data,
  });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/matches/${id}/assign-scorer`, { email });
      toast.success("Scorer assigned");
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold mb-4">Assign Scorer</h1>
      <p className="text-sm text-slate-500 mb-4">{match?.title}</p>
      <form onSubmit={submit} className="card p-5 space-y-3">
        <label className="block">
          <div className="text-sm mb-1">Scorer email</div>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn btn-primary w-full">Assign</button>
      </form>
    </div>
  );
}
