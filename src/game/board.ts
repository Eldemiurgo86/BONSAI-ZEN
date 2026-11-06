/**
 * Operaciones puras sobre el tablero: generación, detección de combinaciones,
 * intercambio, gravedad y relleno. Todas devuelven tableros nuevos (inmutables).
 */
import { nextFloat } from './rng';
import type { Grid, Piece, PieceType, Pos } from './types';

export interface Run {
  readonly type: PieceType;
  readonly cells: readonly Pos[];
}

export const MIN_RUN = 3;

export function posKey(p: Pos): number {
  return p.row * 1000 + p.col;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function inBounds(p: Pos, size: number): boolean {
  return p.row >= 0 && p.col >= 0 && p.row < size && p.col < size;
}

/** Busca todas las líneas de al menos MIN_RUN piezas iguales (horizontales y verticales). */
export function findRuns(grid: Grid): Run[] {
  const size = grid.length;
  const runs: Run[] = [];

  for (let r = 0; r < size; r++) {
    let start = 0;
    for (let c = 1; c <= size; c++) {
      const same = c < size && grid[r][c].type === grid[r][start].type;
      if (!same) {
        if (c - start >= MIN_RUN) {
          const cells: Pos[] = [];
          for (let k = start; k < c; k++) cells.push({ row: r, col: k });
          runs.push({ type: grid[r][start].type, cells });
        }
        start = c;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let start = 0;
    for (let r = 1; r <= size; r++) {
      const same = r < size && grid[r][c].type === grid[start][c].type;
      if (!same) {
        if (r - start >= MIN_RUN) {
          const cells: Pos[] = [];
          for (let k = start; k < r; k++) cells.push({ row: k, col: c });
          runs.push({ type: grid[start][c].type, cells });
        }
        start = r;
      }
    }
  }

  return runs;
}

/** Posiciones únicas afectadas por un conjunto de líneas (una celda puede estar en dos líneas). */
export function uniqueCells(runs: readonly Run[]): Pos[] {
  const seen = new Map<number, Pos>();
  for (const run of runs) for (const p of run.cells) seen.set(posKey(p), p);
  return [...seen.values()];
}

/** Intercambia dos piezas. Las piezas conservan su `id`. */
export function swapCells(grid: Grid, a: Pos, b: Pos): Grid {
  const next = grid.map((row) => row.slice());
  const pa = grid[a.row][a.col];
  const pb = grid[b.row][b.col];
  next[a.row][a.col] = pb;
  next[b.row][b.col] = pa;
  return next;
}

/** ¿Existe al menos un intercambio que produzca una combinación? */
export function hasValidMove(grid: Grid): boolean {
  return findHint(grid) !== null;
}

/** Devuelve un par de posiciones que forma una combinación al intercambiarse, o null. */
export function findHint(grid: Grid): [Pos, Pos] | null {
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const candidates: Pos[] = [];
      if (c + 1 < size) candidates.push({ row: r, col: c + 1 });
      if (r + 1 < size) candidates.push({ row: r + 1, col: c });
      for (const n of candidates) {
        const from = { row: r, col: c };
        if (findRuns(swapCells(grid, from, n)).length > 0) return [from, n];
      }
    }
  }
  return null;
}

export interface BoardResult {
  readonly grid: Grid;
  readonly seed: number;
  readonly nextId: number;
}

/**
 * Elimina las celdas indicadas, deja caer las piezas de cada columna y rellena
 * la parte superior con piezas nuevas tomadas de `pool`.
 */
export function collapseAndRefill(
  grid: Grid,
  cleared: ReadonlySet<number>,
  pool: readonly PieceType[],
  seed: number,
  nextId: number,
): BoardResult {
  const size = grid.length;
  const next: Piece[][] = Array.from({ length: size }, () => new Array<Piece>(size));
  let s = seed;
  let id = nextId;

  for (let c = 0; c < size; c++) {
    const survivors: Piece[] = [];
    for (let r = size - 1; r >= 0; r--) {
      if (!cleared.has(posKey({ row: r, col: c }))) survivors.push(grid[r][c]);
    }
    let r = size - 1;
    for (const piece of survivors) {
      next[r][c] = piece;
      r--;
    }
    while (r >= 0) {
      const [v, s2] = nextFloat(s);
      s = s2;
      next[r][c] = { id: id++, type: pool[Math.floor(v * pool.length)] };
      r--;
    }
  }

  return { grid: next, seed: s, nextId: id };
}

/**
 * Crea un tablero aleatorio sin combinaciones iniciales y con al menos una jugada.
 * Reintenta con otra semilla si el tablero resulta sin jugadas (muy raro).
 */
export function createBoard(seed: number, size: number, pool: readonly PieceType[], nextId: number): BoardResult {
  let s = seed;
  let id = nextId;
  for (let attempt = 0; attempt < 50; attempt++) {
    const grid: Piece[][] = [];
    for (let r = 0; r < size; r++) {
      const row: Piece[] = [];
      for (let c = 0; c < size; c++) {
        const forbidden = new Set<PieceType>();
        if (c >= 2 && row[c - 1].type === row[c - 2].type) forbidden.add(row[c - 1].type);
        if (r >= 2 && grid[r - 1][c].type === grid[r - 2][c].type) forbidden.add(grid[r - 1][c].type);
        const options = pool.filter((t) => !forbidden.has(t));
        const [v, s2] = nextFloat(s);
        s = s2;
        row.push({ id: id++, type: options[Math.floor(v * options.length)] });
      }
      grid.push(row);
    }
    if (findRuns(grid).length === 0 && hasValidMove(grid)) return { grid, seed: s, nextId: id };
  }
  throw new Error('No se pudo generar un tablero jugable');
}
