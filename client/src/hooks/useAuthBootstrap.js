import { useEffect } from "react";
import api from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";

export function useAuthBootstrap() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setInitializing = useAuthStore((s) => s.setInitializing);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/api/auth/refresh");
        if (data.accessToken) {
          const me = await api.get("/api/users/me", {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          });
          setAuth(data.accessToken, me.data);
        }
      } catch {
        setInitializing(false);
      } finally {
        setInitializing(false);
      }
    })();
  }, [setAuth, setInitializing]);
}
