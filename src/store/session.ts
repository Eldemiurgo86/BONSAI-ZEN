'use client';
import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type { ProgressSummary, UserDTO } from '@/lib/dto';

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'guest' | 'error';

interface MeResponse {
  user: UserDTO | null;
  progress: ProgressSummary | null;
}

interface SessionState {
  status: SessionStatus;
  user: UserDTO | null;
  progress: ProgressSummary | null;
  /** Carga /api/me. Devuelve false si no hay sesión. */
  refresh: () => Promise<boolean>;
  setProgress: (progress: ProgressSummary) => void;
  setUser: (user: UserDTO | null) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()((set) => ({
  status: 'idle',
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
  setProgress: (progress) => set({ progress }),
  setUser: (user) => set({ user }),
  clear: () => set({ status: 'guest', user: null, progress: null }),
}));
