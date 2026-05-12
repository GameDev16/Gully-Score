import { create } from "zustand";

export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  isInitializing: true,
  setAuth: (accessToken, user) => set({ accessToken, user, isInitializing: false }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  clear: () => set({ accessToken: null, user: null }),
}));
