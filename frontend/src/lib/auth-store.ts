'use client';

import { create } from 'zustand';
import { api, setAccessToken } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  async hydrate() {
    try {
      // Try refresh first — if cookie still valid, we get an access token
      const r = await api.post<{ data: { accessToken: string } }>('/auth/refresh');
      setAccessToken(r.data.data.accessToken);
      const me = await api.get<{ data: AuthUser }>('/auth/me');
      set({ user: me.data.data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  async login(email, password) {
    const r = await api.post<{ data: { accessToken: string; user: AuthUser } }>('/auth/login', {
      email,
      password,
    });
    setAccessToken(r.data.data.accessToken);
    set({ user: r.data.data.user });
  },

  async logout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    set({ user: null });
  },

  can(permission) {
    const u = get().user;
    return !!u && u.permissions.includes(permission);
  },
}));
