import { create } from "zustand";

function decodeExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

type User = { id: string; email: string } | null;

type AuthState = {
  token: string | null;
  user: User;
  setAuth: (token: string, user: NonNullable<User>) => void;
  clear: () => void;
  isValid: () => boolean;
};

const loadInitial = () => {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  if (!token || !userStr) return { token: null, user: null };
  const exp = decodeExp(token);
  if (!exp || Date.now() >= exp) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { token: null, user: null };
  }
  return { token, user: JSON.parse(userStr) as NonNullable<User> };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadInitial(),
  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },
  clear: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },
  isValid: () => {
    const t = get().token;
    if (!t) return false;
    const exp = decodeExp(t);
    if (!exp || Date.now() >= exp) {
      get().clear();
      return false;
    }
    return true;
  },
}));

// export const useAuthStore = create<AuthState>((set) => ({
//   token: sessionStorage.getItem("token"),
//   user: sessionStorage.getItem("user") ? JSON.parse(sessionStorage.getItem("user")!) : null,
//   setAuth: (token, user) => {
//     sessionStorage.setItem("token", token);
//     sessionStorage.setItem("user", JSON.stringify(user));
//     set({ token, user });
//   },
//   clear: () => {
//     sessionStorage.removeItem("token");
//     sessionStorage.removeItem("user");
//     set({ token: null, user: null });
//   },
// }));
