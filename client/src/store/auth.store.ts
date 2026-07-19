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
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  login: (user) => {
    set({ isAuthenticated: true, user, isLoading: false });
  },
  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
    set({ isAuthenticated: false, user: null, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
