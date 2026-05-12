import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

export default function RequireAuth({ children }) {
  const { user, isInitializing } = useAuthStore();
  if (isInitializing) return <div className="p-10 text-center text-slate-500">Loading profile...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
