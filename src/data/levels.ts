/**
 * Catálogo de niveles: 4 estaciones × 12 niveles = 48 niveles.
 * Los niveles 1–30 son gratuitos; del 31 al 48 requieren Premium.
 * Los niveles se generan a partir de reglas, así la curva de dificultad es regular y fácil de ajustar.
 */
import type { BonsaiStyle, Goal, PieceType, Season } from '@/game/types';
import { BONSAI_STYLES, SEASONS } from '@/game/types';
import type { LevelBase } from '@/game/difficulty';

export const LEVELS_PER_SEASON = 12;
export const TOTAL_LEVELS = SEASONS.length * LEVELS_PER_SEASON;
export const FREE_LEVEL_LIMIT = 30;

export interface LevelDef extends LevelBase {
  readonly season: Season;
  /** Posición dentro de la estación (1–12). */
  readonly index: number;
  readonly style: BonsaiStyle;
}

/** Orden en que se introducen las piezas a medida que avanza el juego. */
const PIECE_ORDER: readonly PieceType[] = ['leaf', 'blossom', 'water', 'seed', 'shears', 'stone', 'fertilizer'];

function poolFor(globalIndex: number): PieceType[] {
  const count = Math.min(PIECE_ORDER.length, 4 + Math.floor((globalIndex - 1) / 8));
  return PIECE_ORDER.slice(0, count);
}

function goalsFor(globalIndex: number, pool: readonly PieceType[]): Goal[] {
  const collectable = pool.filter((p) => p !== 'fertilizer');
  const primaryPiece = collectable[globalIndex % collectable.length];
  const goals: Goal[] = [{ type: 'collect', piece: primaryPiece, count: 12 + Math.round(globalIndex * 0.8) }];

  if (pool.includes('shears') && globalIndex >= 5) {
    goals.push({ type: 'prune', count: 3 + Math.floor(globalIndex / 6) });
  }
  if (globalIndex >= 10) {
    goals.push({ type: 'cascade', count: globalIndex >= 30 ? 3 : 2 });
  }
  return goals;
}

function buildLevel(globalIndex: number): LevelDef {
  const seasonIdx = Math.floor((globalIndex - 1) / LEVELS_PER_SEASON);
  const index = ((globalIndex - 1) % LEVELS_PER_SEASON) + 1;
  const pool = poolFor(globalIndex);
  return {
    id: globalIndex,
    season: SEASONS[seasonIdx],
    index,
    style: BONSAI_STYLES[(index - 1) % BONSAI_STYLES.length],
    pool,
    goals: goalsFor(globalIndex, pool),
    moves: 22 + Math.floor(globalIndex * 0.6),
    timeLimit: 120 + globalIndex * 4,
    starThresholds: [800 + globalIndex * 60, 1400 + globalIndex * 100],
  };
}

export const LEVELS: readonly LevelDef[] = Array.from({ length: TOTAL_LEVELS }, (_, i) => buildLevel(i + 1));

const BY_ID = new Map(LEVELS.map((l) => [l.id, l] as const));

export function levelById(id: number): LevelDef | undefined {
  return BY_ID.get(id);
}

export function seasonOfLevel(id: number): Season | undefined {
  return BY_ID.get(id)?.season;
}

export function levelsOfSeason(season: Season): LevelDef[] {
  return LEVELS.filter((l) => l.season === season);
}

/** Último nivel de una estación (el que decide el final Pro). */
export function isSeasonFinal(id: number): boolean {
  return id % LEVELS_PER_SEASON === 0;
}

/** Niveles que un jugador gratuito puede jugar. */
export function isFreeLevel(id: number): boolean {
  return id <= FREE_LEVEL_LIMIT;
}
