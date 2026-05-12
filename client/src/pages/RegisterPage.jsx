import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const nav = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/auth/register", form);
      setAuth(data.accessToken, data.user);
      toast.success("Account created!");
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-6">Host on PitchDay</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <input
          className="input"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input"
          type="password"
          placeholder="Password (min 6)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="btn btn-primary w-full">Create account</button>
        <p className="text-sm text-center text-slate-500">
          Have an account?{" "}
          <Link to="/login" className="player-link">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
