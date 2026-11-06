/** Reglas de puntuación, multiplicadores y estrellas. Funciones puras. */
import type { Run } from './board';

export const POINTS_PER_PIECE = 10;
const MIN_RUN_LENGTH = 3;
/** Bonificación por cada pieza por encima de 3 en una misma línea. */
export const LONG_RUN_BONUS = 30;
export const MAX_CASCADE_MULTIPLIER = 4;
export const HEALTH_MAX = 100;
export const HEALTH_DECAY_PER_MOVE = 2;
export const HEALTH_WATER_GAIN = 4;
export const HEALTH_SHEARS_GAIN = 3;

/** Multiplicador de cascada: 1x en el primer combo, +0.5x por cada encadenado, máximo 4x. */
export function cascadeMultiplier(cascade: number): number {
  if (cascade <= 1) return 1;
  return Math.min(MAX_CASCADE_MULTIPLIER, 1 + 0.5 * (cascade - 1));
}

/** Puntos de un conjunto de líneas, antes de aplicar multiplicadores. */
export function pointsForRuns(runs: readonly Run[]): number {
  let total = 0;
  for (const run of runs) {
    total += run.cells.length * POINTS_PER_PIECE;
    if (run.cells.length > MIN_RUN_LENGTH) {
      total += (run.cells.length - MIN_RUN_LENGTH) * LONG_RUN_BONUS;
    }
  }
  return total;
}

/** Estrellas al completar un nivel: 0 si no se ganó; 1 por completar, +1 y +1 por umbrales de puntuación. */
export function computeStars(won: boolean, score: number, thresholds: readonly [number, number]): 0 | 1 | 2 | 3 {
  if (!won) return 0;
  const [two, three] = thresholds;
  if (score >= three) return 3;
  if (score >= two) return 2;
  return 1;
}
