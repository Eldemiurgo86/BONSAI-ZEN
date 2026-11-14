'use client';
import { create } from 'zustand';
import { api, ApiClientError } from '@/lib/api-client';
import type { ProgressSummary, UserDTO } from '@/lib/dto';

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'guest' | 'error';

interface MeResponse {
  user: UserDTO | null;
  progress: ProgressSummary | null;
}

interface SessionState {
  status: SessionStatus;
  /** Código de error de la última vez que no se pudo crear o cargar la sesión. */
  lastError: string | null;
  user: UserDTO | null;
  progress: ProgressSummary | null;
  /** Carga /api/me. Devuelve false si no hay sesión. */
  refresh: () => Promise<boolean>;
  /** Garantiza una sesión: si no existe, crea una cuenta de invitado. */
  ensure: () => Promise<boolean>;
  setProgress: (progress: ProgressSummary) => void;
  setUser: (user: UserDTO | null) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()((set, get) => ({
  status: 'idle',
  lastError: null,
  user: null,
  progress: null,
  refresh: async () => {
    set({ status: 'loading' });
    try {
      const data = await api<MeResponse>('/api/me');
      if (!data.user || !data.progress) {
        set({ status: 'guest', user: null, progress: null });
        return false;
      }
      set({ status: 'ready', user: data.user, progress: data.progress });
      return true;
    } catch (err) {
      set({ status: 'error' });
      return false;
    }
  },
  ensure: async () => {
    if (await get().refresh()) return true;
    try {
      await api('/api/auth/guest', { method: 'POST' });
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'network_error';
      set({ status: 'error', lastError: code });
      return false;
    }
    return get().refresh();
  },
  setProgress: (progress) => set({ progress }),
  setUser: (user) => set({ user }),
  clear: () => set({ status: 'guest', user: null, progress: null }),
}));
