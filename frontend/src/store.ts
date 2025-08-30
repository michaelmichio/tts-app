import { create } from "zustand";

type User = { id: string; email: string } | null;

type AuthState = {
  token: string | null;
  user: User;
  setAuth: (token: string, user: NonNullable<User>) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: sessionStorage.getItem("token"),
  user: sessionStorage.getItem("user") ? JSON.parse(sessionStorage.getItem("user")!) : null,
  setAuth: (token, user) => {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },
  clear: () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    set({ token: null, user: null });
  },
}));
