/**
 * Adapta un nivel base a la dificultad elegida.
 * - Novato: tiempo y movimientos ilimitados, menos objetivos (máx. 2) con cantidades reducidas, sin marchitado ni clima.
 * - Pro: límite de movimientos y de tiempo, un objetivo extra de puntuación, marchitado y clima dinámico.
 */
import type { Difficulty, EffectiveLevel, Goal, PieceType } from './types';

export interface LevelBase {
  readonly id: number;
  readonly pool: readonly PieceType[];
  readonly goals: readonly Goal[];
  readonly moves: number;
  readonly timeLimit: number;
  readonly starThresholds: readonly [number, number];
}

export const BOARD_SIZE = 8;
export const NOVICE_MAX_GOALS = 2;
export const NOVICE_GOAL_FACTOR = 0.75;

export function applyDifficulty(base: LevelBase, difficulty: Difficulty): EffectiveLevel {
  if (difficulty === 'novato') {
    const goals = base.goals.slice(0, NOVICE_MAX_GOALS).map((g) => ({
      ...g,
      count: Math.max(1, Math.ceil(g.count * NOVICE_GOAL_FACTOR)),
    }));
    return {
      id: base.id,
      size: BOARD_SIZE,
      pool: [...base.pool],
      goals,
      moves: null,
      timeLimit: null,
      withering: false,
      weatherEnabled: false,
      starThresholds: base.starThresholds,
      difficulty,
    };
  }

  const goals: Goal[] = [...base.goals];
  if (!goals.some((g) => g.type === 'score')) {
    goals.push({ type: 'score', count: base.starThresholds[0] });
  }
  return {
    id: base.id,
    size: BOARD_SIZE,
    pool: [...base.pool],
    goals,
    moves: base.moves,
    timeLimit: base.timeLimit,
    withering: true,
    weatherEnabled: true,
    starThresholds: base.starThresholds,
    difficulty,
  };
}
