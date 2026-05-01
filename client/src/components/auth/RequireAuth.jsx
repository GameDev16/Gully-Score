import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

export default function RequireAuth({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
