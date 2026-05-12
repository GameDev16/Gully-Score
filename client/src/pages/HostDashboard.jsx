import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import { Link } from "react-router-dom";
import ImageUploader from "../components/common/ImageUploader.jsx";
import toast from "react-hot-toast";
import {
  Plus,
  Trophy,
  Users,
  Calendar,
  UserPlus,
  Edit,
  User,
  LayoutDashboard,
} from "lucide-react";
import { useAuthStore } from "../store/authStore.js";

const TABS = [
  { id: "host", label: "Host Dashboard", icon: LayoutDashboard },
  { id: "tournament", label: "Tournaments", icon: Trophy },
  { id: "profile", label: "Host Profile", icon: User },
];

export default function HostDashboard() {
  const [tab, setTab] = useState("host");
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ["my-dashboard"],
    queryFn: async () => (await api.get("/api/users/me/dashboard")).data,
  });

  const tournaments = data?.tournaments || [];
  const matches = data?.matches || [];

  // Scorer 5-min notification
  useEffect(() => {
    if (!matches.length) return;
    const checkUpcoming = () => {
      const now = new Date().getTime();
      matches.forEach((m) => {
        if (m.status === "upcoming" && m.date) {
          // If the user is the assigned scorer
          if (m.scorerId?._id === user?._id || m.scorerId === user?._id) {
            const diff = new Date(m.date).getTime() - now;
            // Between 0 and 5 minutes
            if (diff > 0 && diff <= 300000) {
              const key = `notified_${m._id}`;
              if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, "1");
                toast.success(`Match ${m.title || "starting"} is in 5 minutes!`, {
                  icon: "⏰",
                  duration: 6000,
                });
              }
            }
          }
        }
      });
    };

    checkUpcoming();
    const timer = setInterval(checkUpcoming, 60000); // check every minute
    return () => clearInterval(timer);
  }, [matches, user]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "host" && (
        <HostTab matches={matches} tournaments={tournaments} />
      )}
      {tab === "tournament" && (
        <TournamentTab tournaments={tournaments} />
      )}
      {tab === "profile" && (
        <ProfileTab user={user} matches={matches} tournaments={tournaments} />
      )}
    </div>
  );
}

/* ---- Host Dashboard Tab ---- */
function HostTab({ matches, tournaments }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl font-bold">Host Dashboard</h1>
        <div className="flex gap-2">
          <Link className="btn btn-outline" to="/dashboard/new-tournament">
            <Trophy className="w-4 h-4 mr-1" /> New Tournament
          </Link>
          <Link className="btn btn-primary" to="/dashboard/new-match">
            <Plus className="w-4 h-4 mr-1" /> New Match
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Tournaments" value={tournaments.length} icon={Trophy} />
        <Stat label="Matches" value={matches.length} icon={Calendar} />
        <Stat
          label="Live"
          value={matches.filter((m) => m.status === "live").length}
          icon={Users}
        />
        <Stat
          label="Completed"
          value={matches.filter((m) => m.status === "completed").length}
          icon={Users}
        />
      </div>

      <section className="space-y-6">
        <div>
          <h2 className="font-semibold text-lg mb-2">Live & Upcoming Matches</h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {matches.filter((m) => m.status !== "completed").map((m) => (
              <MatchRow key={m._id} m={m} />
            ))}
            {!matches.filter((m) => m.status !== "completed").length && (
              <p className="p-6 text-slate-500 text-center">No live or upcoming matches.</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-lg mb-2">Completed Matches</h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {matches.filter((m) => m.status === "completed").map((m) => (
              <MatchRow key={m._id} m={m} />
            ))}
            {!matches.filter((m) => m.status === "completed").length && (
              <p className="p-6 text-slate-500 text-center">No completed matches.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MatchRow({ m }) {
  const isCompleted = m.status === "completed";
  return (
    <div className="p-4 flex items-center justify-between flex-wrap gap-2">
      <div>
        <Link to={`/matches/${m._id}`} className="player-link font-medium">
          {m.title}
        </Link>
        <div className="text-xs text-slate-500">
          {m.teamA?.name} vs {m.teamB?.name} · {m.format}
          {m.tournamentId && <> · {m.tournamentId.name}</>}
          {m.scorerId ? (
            <> · Scorer: {m.scorerId.name}</>
          ) : (
            <span className="ml-1 text-amber-600"> · No scorer</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs uppercase px-2 py-0.5 rounded ${
          isCompleted
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "bg-slate-100 dark:bg-slate-700"
        }`}>
          {m.status}
        </span>
        {!isCompleted && (
          <>
            {/* Edit match */}
            <Link
              to={`/dashboard/matches/${m._id}/edit`}
              className="btn btn-outline text-sm"
            >
              <Edit className="w-4 h-4 mr-1" /> Edit
            </Link>
            {/* Assign/Re-assign scorer */}
            <Link
              to={`/dashboard/matches/${m._id}/assign`}
              className="btn btn-outline text-sm"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              {m.scorerId ? "Re-assign" : "Assign"} Scorer
            </Link>
            <Link to={`/score/${m._id}`} className="btn btn-primary text-sm">
              Score
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/* ---- Tournament Dashboard Tab ---- */
function TournamentTab({ tournaments }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Tournaments</h2>
        <Link className="btn btn-primary" to="/dashboard/new-tournament">
          <Trophy className="w-4 h-4 mr-1" /> New Tournament
        </Link>
      </div>
      {!tournaments.length && (
        <p className="text-slate-500">No tournaments yet.</p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournaments.map((t) => (
          <div key={t._id} className="card p-4 space-y-3">
            <div>
              <div className="text-xs text-slate-500">
                {t.format} · {t.shortCode}
              </div>
              <div className="font-bold text-lg mt-0.5">{t.name}</div>
              {t.description && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {t.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                to={`/tournaments/${t._id}`}
                className="btn btn-outline text-sm flex-1 text-center"
              >
                View
              </Link>
              <Link
                to={`/dashboard/tournaments/${t._id}/edit`}
                className="btn btn-outline text-sm"
              >
                <Edit className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Host Profile Tab ---- */
function ProfileTab({ user, matches, tournaments }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () => api.put("/api/users/me", { name, phone, avatar }),
    onSuccess: () => {
      toast.success("Profile updated");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["my-dashboard"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-display text-2xl font-bold">Host Profile</h2>

      {/* Identity card */}
      <div className="card p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ImageUploader round value={avatar} onChange={setAvatar} label="Avatar" />
              <div className="flex-1 space-y-3">
                <input className="input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                <input className="input" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn btn-outline flex-1">Cancel</button>
              <button onClick={() => saveProfile()} disabled={isPending} className="btn btn-primary flex-1">
                {isPending ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
                  {user?.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div>
                <div className="font-bold text-xl">{user?.name}</div>
                <div className="text-sm text-slate-500">{user?.email}</div>
                {user?.phone && <div className="text-sm text-slate-500">{user.phone}</div>}
              </div>
            </div>
            <button onClick={() => { setName(user?.name||""); setPhone(user?.phone||""); setAvatar(user?.avatar||""); setEditing(true); }} className="btn btn-outline text-sm">
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold font-mono">{tournaments.length}</div>
          <div className="text-xs text-slate-500 mt-1">Tournaments</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold font-mono">{matches.length}</div>
          <div className="text-xs text-slate-500 mt-1">Matches</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold font-mono">
            {matches.filter((m) => m.status === "completed").length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Completed</div>
        </div>
      </div>

      {/* Tournaments list */}
      <section>
        <h3 className="font-semibold text-base mb-2">Tournaments Created</h3>
        {!tournaments.length && (
          <p className="text-slate-500 text-sm">None yet.</p>
        )}
        <div className="space-y-2">
          {tournaments.map((t) => (
            <Link
              key={t._id}
              to={`/tournaments/${t._id}`}
              className="card p-3 flex items-center justify-between hover:shadow-md"
            >
              <div>
                <span className="font-medium">{t.name}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {t.format} · {t.shortCode}
                </span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  t.status === "live"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.status}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Matches list */}
      <section className="space-y-4">
        <div>
          <h3 className="font-semibold text-base mb-2">Live & Upcoming Matches</h3>
          {!matches.filter((m) => m.status !== "completed").length && (
            <p className="text-slate-500 text-sm">None yet.</p>
          )}
          <div className="space-y-2">
            {matches.filter((m) => m.status !== "completed").map((m) => (
              <Link
                key={m._id}
                to={`/matches/${m._id}`}
                className="card p-3 flex items-center justify-between hover:shadow-md"
              >
                <div>
                  <span className="font-medium">{m.title}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {m.teamA?.name} vs {m.teamB?.name}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    m.status === "live" || m.status === "innings-break"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {m.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-base mb-2">Completed Matches</h3>
          {!matches.filter((m) => m.status === "completed").length && (
            <p className="text-slate-500 text-sm">None yet.</p>
          )}
          <div className="space-y-2">
            {matches.filter((m) => m.status === "completed").map((m) => (
              <Link
                key={m._id}
                to={`/matches/${m._id}`}
                className="card p-3 flex items-center justify-between hover:shadow-md"
              >
                <div>
                  <span className="font-medium">{m.title}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {m.teamA?.name} vs {m.teamB?.name}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                  {m.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const Stat = ({ label, value, icon: Icon }) => (
  <div className="card p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold font-mono">{value}</div>
    </div>
  </div>
);
