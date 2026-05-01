import { NavLink } from "react-router-dom";
import { Home, Search, Trophy, User } from "lucide-react";

export default function BottomNav() {
  const items = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/dashboard", icon: Trophy, label: "Host" },
    { to: "/login", icon: User, label: "Account" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30">
      <div className="grid grid-cols-4">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-xs ${isActive ? "text-primary-600" : "text-slate-500"}`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
