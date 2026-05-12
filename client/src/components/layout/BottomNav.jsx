import { NavLink } from "react-router-dom";
import { Home, Search, Trophy, User, ClipboardList } from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client.js";

export default function BottomNav() {
  const user = useAuthStore((s) => s.user);

  // Check if user has scoring assignments
  const { data: assignments } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: async () => (await api.get("/api/users/me/assignments")).data,
    enabled: !!user,
  });

  const hasAssignments = assignments && assignments.length > 0;

  const items = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/search", icon: Search, label: "Search" },
    ...(user ? [{ to: "/dashboard", icon: Trophy, label: "Host" }] : []),
    ...(user && hasAssignments
      ? [
          {
            to: "/scoring",
            icon: ClipboardList,
            label: "Scoring",
            badge: assignments.filter(
              (m) => m.status === "live" || m.status === "upcoming",
            ).length,
          },
        ]
      : []),
    { to: user ? "/dashboard" : "/login", icon: User, label: user ? user.name?.split(" ")[0] : "Account" },
  ];

  // Deduplicate in case user is host + scorer
  const seen = new Set();
  const deduped = items.filter((i) => {
    if (seen.has(i.to)) return false;
    seen.add(i.to);
    return true;
  });

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30">
      <div className={`grid grid-cols-${Math.min(deduped.length, 5)}`}>
        {deduped.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to + label}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-xs relative ${isActive ? "text-primary-600" : "text-slate-500"}`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5 mb-0.5" />
              {badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-green-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
