import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import { useAuthStore } from "../../store/authStore.js";

export default function NotificationsBell() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/api/users/me/notifications")).data,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  if (!user) return null;
  const unread = data.filter((n) => !n.isRead).length;

  const markRead = async (id) => {
    await api.patch(`/api/users/me/notifications/${id}/read`);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const markAll = async () => {
    await api.patch("/api/users/me/notifications/read-all");
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn btn-ghost relative">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[10px] flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto card z-40">
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-xs text-primary-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          {data.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              All caught up.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map((n) => (
                <li
                  key={n._id}
                  className={`p-3 ${n.isRead ? "" : "bg-primary-50/50 dark:bg-primary-800/10"}`}
                >
                  <div className="flex items-start gap-2">
                    <Link
                      to={n.link || "#"}
                      onClick={() => {
                        setOpen(false);
                        if (!n.isRead) markRead(n._id);
                      }}
                      className="flex-1 text-sm hover:text-primary-600"
                    >
                      {n.message}
                    </Link>
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n._id)}
                        className="text-slate-400 hover:text-primary-600"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
