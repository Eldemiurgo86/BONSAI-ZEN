'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang } from '@/data/i18n';

export type BackgroundId = 'jardin' | 'bambu' | 'luna' | 'templo';

export interface SettingsState {
  lang: Lang;
  sound: boolean;
  /** Interruptor de animaciones de la app. Desactivado equivale a reducir movimiento. */
  animations: boolean;
  /** Reducir movimiento manualmente (además de la preferencia del sistema). */
  reduceMotion: boolean;
  background: BackgroundId;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

/**
 * Preferencias de la sesión del navegador. `skipHydration` evita diferencias entre
 * servidor y cliente: se rehidratan en `Providers` tras el primer render.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'es',
      sound: true,
      animations: true,
      reduceMotion: false,
      background: 'jardin',
      set: (patch) => set(patch),
    }),
    {
      name: 'bonsai-zen-settings',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ lang: s.lang, sound: s.sound, animations: s.animations, reduceMotion: s.reduceMotion, background: s.background }),
    },
  ),
);
