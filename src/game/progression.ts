/**
 * Progresión del jugador: estadísticas acumuladas, etapas del bonsái, estaciones y final.
 * Lógica pura; el servidor la usa para guardar y validar resultados.
 */
import { LEVELS, LEVELS_PER_SEASON, levelById } from '@/data/levels';
import type { BonsaiStyle, Difficulty, Season } from './types';
import { SEASONS } from './types';

export const BONSAI_STAGES = ['semilla', 'brote', 'juvenil', 'maduro', 'obra'] as const;
export type BonsaiStage = (typeof BONSAI_STAGES)[number];

/** Número mínimo de niveles completados para cada etapa. */
const STAGE_THRESHOLDS: ReadonlyArray<readonly [number, BonsaiStage]> = [
  [0, 'semilla'],
  [1, 'brote'],
  [4, 'juvenil'],
  [12, 'maduro'],
  [24, 'obra'],
];

export function stageForProgress(levelsCompleted: number): BonsaiStage {
  let stage: BonsaiStage = 'semilla';
  for (const [min, s] of STAGE_THRESHOLDS) {
    if (levelsCompleted >= min) stage = s;
  }
  return stage;
}

export interface PlayerStats {
  readonly completedIds: readonly number[];
  readonly proCompletedIds: readonly number[];
  readonly threeStarIds: readonly number[];
  readonly bestScore: number;
  readonly totalMatches: number;
  readonly totalPrunes: number;
  readonly totalSeeds: number;
  readonly maxCascade: number;
  readonly boosterUses: number;
  readonly lastStyle: BonsaiStyle | null;
}

export const EMPTY_STATS: PlayerStats = {
  completedIds: [],
  proCompletedIds: [],
  threeStarIds: [],
  bestScore: 0,
  totalMatches: 0,
  totalPrunes: 0,
  totalSeeds: 0,
  maxCascade: 0,
  boosterUses: 0,
  lastStyle: null,
};

/** Resultado de una partida enviado por el cliente y validado por el servidor. */
export interface LevelOutcome {
  readonly levelId: number;
  readonly difficulty: Difficulty;
  readonly won: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly score: number;
  readonly matches: number;
  readonly prunes: number;
  readonly seeds: number;
  readonly maxCascade: number;
  readonly boostersUsed: number;
}

function addUnique(list: readonly number[], id: number): number[] {
  return list.includes(id) ? [...list] : [...list, id];
}

/** Aplica el resultado de una partida a las estadísticas. */
export function applyOutcome(stats: PlayerStats, outcome: LevelOutcome): PlayerStats {
  const base: PlayerStats = {
    ...stats,
    bestScore: Math.max(stats.bestScore, outcome.score),
    totalMatches: stats.totalMatches + outcome.matches,
    totalPrunes: stats.totalPrunes + outcome.prunes,
    totalSeeds: stats.totalSeeds + outcome.seeds,
    maxCascade: Math.max(stats.maxCascade, outcome.maxCascade),
    boosterUses: stats.boosterUses + outcome.boostersUsed,
  };
  if (!outcome.won) return base;

  const style = levelById(outcome.levelId)?.style ?? null;
  return {
    ...base,
    completedIds: addUnique(stats.completedIds, outcome.levelId),
    proCompletedIds:
      outcome.difficulty === 'pro' ? addUnique(stats.proCompletedIds, outcome.levelId) : [...stats.proCompletedIds],
    threeStarIds: outcome.stars === 3 ? addUnique(stats.threeStarIds, outcome.levelId) : [...stats.threeStarIds],
    lastStyle: style,
  };
}

/** Estaciones con todos sus niveles completados. */
export function completedSeasons(stats: PlayerStats): Season[] {
  return SEASONS.filter((season) => {
    const ids = LEVELS.filter((l) => l.season === season).map((l) => l.id);
    return ids.every((id) => stats.completedIds.includes(id));
  });
}

/** Final A (`pro`): se completa el último nivel de cada estación en Pro. Final B (`standard`): cualquier otro caso. */
export type Ending = 'pro' | 'standard';

export function endingFor(stats: PlayerStats): Ending {
  const finals = SEASONS.map((_, i) => (i + 1) * LEVELS_PER_SEASON);
  return finals.every((id) => stats.proCompletedIds.includes(id)) ? 'pro' : 'standard';
}

/** Etapa actual del bonsái según niveles completados. */
export function currentStage(stats: PlayerStats): BonsaiStage {
  return stageForProgress(stats.completedIds.length);
}

/** Monedas por completar un nivel: base + 1 moneda cada 3 semillas recogidas, x2 en Pro. */
export function coinsForOutcome(outcome: LevelOutcome): number {
  if (!outcome.won) return Math.floor(outcome.seeds / 3);
  const base = 10 + outcome.stars * 5;
  const seedCoins = Math.floor(outcome.seeds / 3);
  const multiplier = outcome.difficulty === 'pro' ? 2 : 1;
  return (base + seedCoins) * multiplier;
}
