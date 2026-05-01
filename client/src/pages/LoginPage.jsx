import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      setAuth(data.accessToken, data.user);
      toast.success(`Welcome, ${data.user.name}`);
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-6">Welcome back</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary w-full">Sign in</button>
        <p className="text-sm text-center text-slate-500">
          New to PitchDay?{" "}
          <Link to="/register" className="player-link">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
