import { create } from 'zustand';
import type { User, UserRole } from '../../shared/types.js';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (u: User) => void;
  canEdit: () => boolean;
  isAdmin: () => boolean;
}

const TOKEN_KEY = 'assetms_token';
const USER_KEY = 'assetms_user';

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as User : null;
  } catch { return null; }
}

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: loadUser(),
  login: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
  setUser: (u) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    set({ user: u });
  },
  canEdit: () => {
    const r = get().user?.role;
    return r === 'admin' || r === 'editor';
  },
  isAdmin: () => get().user?.role === 'admin',
}));

interface ToastState {
  items: { id: number; type: 'info' | 'success' | 'error' | 'warning'; message: string }[];
  push: (type: ToastState['items'][0]['type'], message: string) => void;
  remove: (id: number) => void;
}

let toastId = 0;
export const useToast = create<ToastState>((set, _get) => ({
  items: [],
  push: (type, message) => {
    const id = ++toastId;
    set(s => ({ items: [...s.items, { id, type, message }] }));
    setTimeout(() => set(s => ({ items: s.items.filter(i => i.id !== id) })), 3500);
  },
  remove: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
}));

interface FilterState {
  type: 'all' | UserRole | undefined;
  search: string;
  assetType: 'all' | 'model' | 'texture' | 'other';
  archived: boolean | undefined;
  setSearch: (s: string) => void;
  setType: (t: FilterState['type']) => void;
  setAssetType: (t: FilterState['assetType']) => void;
  setArchived: (a: boolean | undefined) => void;
}

export const useFilters = create<FilterState>((set) => ({
  type: 'all',
  search: '',
  assetType: 'all',
  archived: false,
  setSearch: (s) => set({ search: s }),
  setType: (t) => set({ type: t }),
  setAssetType: (t) => set({ assetType: t }),
  setArchived: (a) => set({ archived: a }),
}));
