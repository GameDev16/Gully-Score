import { Link, useNavigate } from "react-router-dom";
import { Search, LogOut, LayoutDashboard, Sun, Moon } from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import api from "../../api/client.js";
import { useState } from "react";
import NotificationsBell from "../common/NotificationsBell.jsx";
import { useTheme } from "../../hooks/useTheme.js";

export default function Header() {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  // ✅ Theme hook properly placed
  const { dark, toggle } = useTheme();

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {}
    clear();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link
          to="/"
          className="font-display text-2xl font-bold text-primary-600"
        >
          PitchDay
        </Link>

        <form onSubmit={submit} className="flex-1 max-w-lg hidden sm:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search matches, tournaments, teams, players, match key…"
              className="input pl-10"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            className="btn btn-ghost text-sm"
            title="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <>
              <NotificationsBell />

              <Link
                to="/dashboard"
                className="btn btn-ghost text-sm hidden sm:inline-flex"
              >
                <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
              </Link>

              <button onClick={logout} className="btn btn-ghost text-sm">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost text-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary text-sm">
                Host a Match
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
