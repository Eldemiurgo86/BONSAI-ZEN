import { describe, expect, it } from 'vitest';
import { collapseAndRefill, createBoard, findHint, findRuns, hasValidMove, swapCells, uniqueCells } from '@/game/board';
import { PIECE_TYPES, type Grid } from '@/game/types';
import { gridFromRows, rowsOf } from './helpers';

const FULL_POOL = [...PIECE_TYPES];

function allIds(grid: Grid): number[] {
  return grid.flat().map((p) => p.id);
}

describe('createBoard', () => {
  it('genera un tablero 8x8 sin combinaciones iniciales y con al menos una jugada', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { grid } = createBoard(seed, 8, FULL_POOL, 1);
      expect(grid).toHaveLength(8);
      expect(grid.every((row) => row.length === 8)).toBe(true);
      expect(findRuns(grid)).toHaveLength(0);
      expect(hasValidMove(grid)).toBe(true);
    }
  });

  it('es determinista para una misma semilla', () => {
    const a = createBoard(12345, 8, FULL_POOL, 1);
    const b = createBoard(12345, 8, FULL_POOL, 1);
    expect(rowsOf(a.grid)).toEqual(rowsOf(b.grid));
    expect(a.seed).toBe(b.seed);
  });

  it('asigna ids únicos a cada pieza', () => {
    const { grid } = createBoard(7, 8, FULL_POOL, 1);
    const ids = allIds(grid);
    expect(new Set(ids).size).toBe(64);
  });
});

describe('findRuns', () => {
  it('detecta líneas horizontales y verticales de tres o más', () => {
    const grid = gridFromRows(['LLLBB', 'WWWSS', 'BBBBB', 'DDTTF', 'FFTTF']);
    const runs = findRuns(grid);
    const types = runs.map((r) => `${r.type}:${r.cells.length}`).sort();
    expect(types).toEqual(['blossom:5', 'leaf:3', 'water:3']);
  });

  it('detecta una línea vertical', () => {
    const grid = gridFromRows(['LBWS', 'LWSB', 'LSBW', 'WBSS']);
    const runs = findRuns(grid);
    expect(runs).toHaveLength(1);
    expect(runs[0].type).toBe('leaf');
    expect(runs[0].cells).toHaveLength(3);
  });

  it('cuenta una celda compartida por dos líneas una sola vez', () => {
    const grid = gridFromRows(['LLLB', 'LBWS', 'LWSB', 'SBWT']);
    const cells = uniqueCells(findRuns(grid));
    expect(cells.length).toBe(5);
  });
});

describe('swapCells', () => {
  it('intercambia piezas conservando su id', () => {
    const grid = gridFromRows(['LB', 'WS']);
    const original = grid[0][0].id;
    const swapped = swapCells(grid, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(rowsOf(swapped)).toEqual(['BL', 'WS']);
    expect(swapped[0][1].id).toBe(original);
  });
});

describe('collapseAndRefill', () => {
  it('hace caer las piezas y conserva sus ids', () => {
    const grid = gridFromRows(['LB', 'WS']);
    const topLeftId = grid[0][0].id;
    const topRightId = grid[0][1].id;
    // Se elimina la pieza inferior izquierda (1,0). La pieza (0,0) cae a la fila 1 conservando su id.
    const cleared = new Set([1 * 1000 + 0]);
    const result = collapseAndRefill(grid, cleared, ['leaf'], 9, 500);
    expect(result.grid[1][0].id).toBe(topLeftId);
    expect(result.grid[1][0].type).toBe('leaf');
    expect(result.grid[0][0].id).toBeGreaterThanOrEqual(500);
    expect(result.grid[1][1].id).toBe(grid[1][1].id);
    expect(result.grid[0][1].id).toBe(topRightId);
  });
});

describe('findHint', () => {
  it('devuelve un intercambio que produce combinación', () => {
    const grid = gridFromRows(['LBL', 'BLB', 'LBB']);
    const hint = findHint(grid);
    expect(hint).not.toBeNull();
    if (hint) {
      const swapped = swapCells(grid, hint[0], hint[1]);
      expect(findRuns(swapped).length).toBeGreaterThan(0);
    }
  });
});
