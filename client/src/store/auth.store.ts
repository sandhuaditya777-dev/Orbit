import { create } from 'zustand';

const TOKEN_KEY = 'orbit_token';

export interface User {
  sub: string;
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  // Re-hydrate token from localStorage on startup
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  isLoading: false,
  login: (token, user) => {
    if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
    set({ isAuthenticated: true, token, user, isLoading: false });
  },
  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
    set({ isAuthenticated: false, token: null, user: null, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
