/**
 * Punto único de decisión para el acceso Premium. Cualquier comprobación de
 * niveles, dificultad, vidas o anuncios debe pasar por aquí.
 *
 * Reglas:
 * - Gratis: niveles 1–30; dificultad Pro solo en los niveles 1–12 (una estación de prueba);
 *   vidas limitadas; anuncios entre niveles.
 * - Premium: todos los niveles, dificultad Pro completa, vidas ilimitadas, sin anuncios,
 *   fondos y estaciones exclusivas.
 *
 * Este módulo es puro: sirve tanto en el servidor como en el cliente.
 */
import { FREE_LEVEL_LIMIT } from '@/data/levels';
import type { Difficulty } from '@/game/types';

export const FREE_PRO_LEVEL_LIMIT = 12;

export interface PremiumSubject {
  readonly isPremium: boolean;
}

/** Fuente de verdad del estado Premium. */
export function isPremium(user: PremiumSubject | null | undefined): boolean {
  return Boolean(user?.isPremium);
}

export function canPlayLevel(levelId: number, premium: boolean): boolean {
  return premium || levelId <= FREE_LEVEL_LIMIT;
}

export function canUseDifficulty(difficulty: Difficulty, levelId: number, premium: boolean): boolean {
  if (difficulty === 'novato') return true;
  return premium || levelId <= FREE_PRO_LEVEL_LIMIT;
}

export function shouldShowAds(premium: boolean): boolean {
  return !premium;
}
