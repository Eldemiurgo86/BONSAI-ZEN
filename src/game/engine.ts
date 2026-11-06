/**
 * Motor de partida (puro, sin React). Cada acción devuelve un estado nuevo y una
 * lista de `steps` (instantáneas del tablero) que la UI reproduce como animación.
 */
import {
  collapseAndRefill,
  createBoard,
  findHint,
  findRuns,
  hasValidMove,
  inBounds,
  isAdjacent,
  posKey,
  swapCells,
  uniqueCells,
} from './board';
import { nextInt } from './rng';
import {
  cascadeMultiplier,
  computeStars,
  HEALTH_DECAY_PER_MOVE,
  HEALTH_MAX,
  HEALTH_SHEARS_GAIN,
  HEALTH_WATER_GAIN,
  POINTS_PER_PIECE,
  pointsForRuns,
} from './scoring';
import type { Run } from './board';
import { PIECE_TYPES, type Booster, type EffectiveLevel, type Goal, type Grid, type PieceType, type Pos, type Weather } from './types';

export type GameStatus = 'playing' | 'won' | 'lost';

/** Instantánea del tablero para animar una acción. `cleared` son los ids de las piezas eliminadas en ese paso. */
export interface Step {
  readonly grid: Grid;
  readonly cleared: readonly number[];
  readonly cascade: number;
  readonly points: number;
}

export interface GameState {
  readonly level: EffectiveLevel;
  readonly grid: Grid;
  readonly seed: number;
  readonly nextId: number;
  readonly score: number;
  readonly movesMade: number;
  readonly movesLeft: number | null;
  readonly timeLeft: number | null;
  readonly collected: Readonly<Record<PieceType, number>>;
  readonly pruned: number;
  readonly maxCascade: number;
  readonly matches: number;
  /** Salud del bonsái (solo Pro). null en Novato. */
  readonly health: number | null;
  readonly weather: Weather;
  readonly fertilizerArmed: boolean;
  readonly status: GameStatus;
  readonly stars: 0 | 1 | 2 | 3;
}

export interface MoveResult {
  readonly state: GameState;
  readonly steps: readonly Step[];
  readonly valid: boolean;
}

export const WEATHER_INTERVAL = 8;
export const RAIN_CELLS = 6;

const WEATHER_CYCLE: readonly Weather[] = ['soleado', 'sequia', 'viento', 'helada'];
/** Tipo de pieza que el clima retira del reabastecimiento. */
const WEATHER_EXCLUDE: Record<Weather, PieceType | null> = {
  soleado: null,
  sequia: 'water',
  viento: 'blossom',
  helada: 'leaf',
};

export function emptyCollected(): Record<PieceType, number> {
  return Object.fromEntries(PIECE_TYPES.map((t) => [t, 0])) as Record<PieceType, number>;
}

/** Clima activo tras `movesMade` jugadas (solo cambia si el nivel lo permite). */
export function weatherAt(movesMade: number, enabled: boolean): Weather {
  if (!enabled) return 'soleado';
  return WEATHER_CYCLE[Math.floor(movesMade / WEATHER_INTERVAL) % WEATHER_CYCLE.length];
}

/** Piezas que pueden aparecer ahora mismo, según el clima. */
export function currentPool(state: Pick<GameState, 'level' | 'weather'>): PieceType[] {
  const excluded = WEATHER_EXCLUDE[state.weather];
  const pool = state.level.pool.filter((t) => t !== excluded);
  return pool.length >= 3 ? pool : [...state.level.pool];
}

export function createGame(level: EffectiveLevel, seed: number): GameState {
  const board = createBoard(seed, level.size, level.pool, 1);
  return {
    level,
    grid: board.grid,
    seed: board.seed,
    nextId: board.nextId,
    score: 0,
    movesMade: 0,
    movesLeft: level.moves,
    timeLeft: level.timeLimit,
    collected: emptyCollected(),
    pruned: 0,
    maxCascade: 0,
    matches: 0,
    health: level.withering ? HEALTH_MAX : null,
    weather: 'soleado',
    fertilizerArmed: false,
    status: 'playing',
    stars: 0,
  };
}

/** Progreso actual de un objetivo. */
export function goalCurrent(state: GameState, goal: Goal): number {
  switch (goal.type) {
    case 'collect':
      return state.collected[goal.piece];
    case 'score':
      return state.score;
    case 'prune':
      return state.pruned;
    case 'cascade':
      return state.maxCascade;
  }
}

export interface GoalProgress {
  readonly goal: Goal;
  readonly current: number;
  readonly target: number;
  readonly done: boolean;
}

export function goalsProgress(state: GameState): GoalProgress[] {
  return state.level.goals.map((goal) => {
    const current = Math.min(goalCurrent(state, goal), goal.count);
    return { goal, current, target: goal.count, done: goalCurrent(state, goal) >= goal.count };
  });
}

export function goalsMet(state: GameState): boolean {
  return state.level.goals.every((g) => goalCurrent(state, g) >= g.count);
}

/** Cambia el estado a ganado/perdido según objetivos, movimientos, tiempo y salud; reabastece si no quedan jugadas. */
function finalize(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  if (goalsMet(state)) {
    return { ...state, status: 'won', stars: computeStars(true, state.score, state.level.starThresholds) };
  }
  const outOfMoves = state.movesLeft !== null && state.movesLeft <= 0;
  const outOfTime = state.timeLeft !== null && state.timeLeft <= 0;
  const withered = state.health !== null && state.health <= 0;
  if (outOfMoves || outOfTime || withered) {
    return { ...state, status: 'lost', stars: 0 };
  }

  if (!hasValidMove(state.grid)) {
    // Sin jugadas posibles: se baraja el tablero (las piezas reciben ids nuevos).
    const board = createBoard(state.seed, state.level.size, currentPool(state), state.nextId);
    return { ...state, grid: board.grid, seed: board.seed, nextId: board.nextId };
  }
  return state;
}

/**
 * Resuelve combinaciones en cadena. Si `forced` viene informado, esas celdas se
 * eliminan primero (uso de booster) y no cuentan como cascada ni consumen fertilizante.
 */
function resolve(state: GameState, steps: Step[], forced: readonly Pos[] | null): GameState {
  const pool = currentPool(state);
  let grid = state.grid;
  let seed = state.seed;
  let nextId = state.nextId;
  let score = state.score;
  const collected: Record<PieceType, number> = { ...state.collected };
  let pruned = state.pruned;
  let maxCascade = state.maxCascade;
  let matches = state.matches;
  let health = state.health;
  let fertilizer = state.fertilizerArmed;
  let pending: readonly Pos[] | null = forced;
  let cascade = 0;

  for (;;) {
    let cells: readonly Pos[];
    let base: number;
    let boosted = false;

    if (pending) {
      cells = pending;
      pending = null;
      base = cells.length * POINTS_PER_PIECE;
    } else {
      const runs: Run[] = findRuns(grid);
      if (runs.length === 0) break;
      cascade++;
      cells = uniqueCells(runs);
      base = pointsForRuns(runs);
      matches += runs.length;
      maxCascade = Math.max(maxCascade, cascade);
      boosted = fertilizer && cascade === 1;
    }

    const multiplier = (boosted ? 2 : 1) * cascadeMultiplier(cascade);
    const points = Math.round(base * multiplier);
    score += points;

    const cleared = new Set<number>();
    const ids: number[] = [];
    for (const p of cells) {
      const piece = grid[p.row][p.col];
      cleared.add(posKey(p));
      ids.push(piece.id);
      collected[piece.type] += boosted ? 2 : 1;
      if (piece.type === 'shears') pruned++;
      if (health !== null) {
        if (piece.type === 'water') health = Math.min(HEALTH_MAX, health + HEALTH_WATER_GAIN);
        if (piece.type === 'shears') health = Math.min(HEALTH_MAX, health + HEALTH_SHEARS_GAIN);
      }
    }

    const refilled = collapseAndRefill(grid, cleared, pool, seed, nextId);
    grid = refilled.grid;
    seed = refilled.seed;
    nextId = refilled.nextId;
    steps.push({ grid, cleared: ids, cascade, points });

    if (boosted) fertilizer = false;
  }

  return {
    ...state,
    grid,
    seed,
    nextId,
    score,
    collected,
    pruned,
    maxCascade,
    matches,
    health,
    fertilizerArmed: fertilizer,
  };
}

const invalid = (state: GameState): MoveResult => ({ state, steps: [], valid: false });

/**
 * Intenta intercambiar dos piezas adyacentes. Si no forman combinación, el
 * estado no cambia y `steps` contiene el intercambio y su reversión para animarlo.
 */
export function trySwap(state: GameState, a: Pos, b: Pos): MoveResult {
  const size = state.level.size;
  if (state.status !== 'playing' || !inBounds(a, size) || !inBounds(b, size) || !isAdjacent(a, b)) {
    return invalid(state);
  }

  const swapped = swapCells(state.grid, a, b);
  if (findRuns(swapped).length === 0) {
    const steps: Step[] = [
      { grid: swapped, cleared: [], cascade: 0, points: 0 },
      { grid: state.grid, cleared: [], cascade: 0, points: 0 },
    ];
    return { state, steps, valid: false };
  }

  const steps: Step[] = [{ grid: swapped, cleared: [], cascade: 0, points: 0 }];
  let next: GameState = {
    ...state,
    grid: swapped,
    movesMade: state.movesMade + 1,
    movesLeft: state.movesLeft === null ? null : state.movesLeft - 1,
    health: state.health === null ? null : Math.max(0, state.health - HEALTH_DECAY_PER_MOVE),
  };
  next = resolve(next, steps, null);
  next = { ...next, weather: weatherAt(next.movesMade, next.level.weatherEnabled) };
  return { state: finalize(next), steps, valid: true };
}

/** Descuenta tiempo (Pro). Llamar cada segundo desde la UI. */
export function tick(state: GameState, seconds: number): GameState {
  if (state.status !== 'playing' || state.timeLeft === null) return state;
  return finalize({ ...state, timeLeft: Math.max(0, state.timeLeft - seconds) });
}

/**
 * Usa un booster.
 * - scissors: elimina la fila de `target`.
 * - rain: elimina piezas al azar.
 * - fertilizer: el siguiente combinado duplica puntos y piezas contadas.
 */
export function useBooster(state: GameState, booster: Booster, target?: Pos): MoveResult {
  if (state.status !== 'playing') return invalid(state);

  if (booster === 'fertilizer') {
    return { state: { ...state, fertilizerArmed: true }, steps: [], valid: true };
  }

  const size = state.level.size;
  const steps: Step[] = [];

  if (booster === 'scissors') {
    if (!target || !inBounds(target, size)) return invalid(state);
    const cells: Pos[] = [];
    for (let c = 0; c < size; c++) cells.push({ row: target.row, col: c });
    return { state: finalize(resolve(state, steps, cells)), steps, valid: true };
  }

  // rain
  const total = size * size;
  const chosen = new Set<number>();
  let seed = state.seed;
  while (chosen.size < Math.min(RAIN_CELLS, total)) {
    const [i, s] = nextInt(seed, total);
    seed = s;
    chosen.add(i);
  }
  const cells = [...chosen].map((i) => ({ row: Math.floor(i / size), col: i % size }));
  return { state: finalize(resolve({ ...state, seed }, steps, cells)), steps, valid: true };
}

/** Pista para el modo Novato: un intercambio que produce combinación. */
export function getHint(state: GameState): [Pos, Pos] | null {
  return findHint(state.grid);
}

/** Cantidad de piezas de un tipo en el tablero (útil para la UI y pruebas). */
export function countPieces(grid: Grid, type: PieceType): number {
  let n = 0;
  for (const row of grid) for (const p of row) if (p.type === type) n++;
  return n;
}
