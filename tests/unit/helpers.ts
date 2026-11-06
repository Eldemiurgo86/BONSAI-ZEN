import type { Grid, Piece, PieceType } from '@/game/types';
import type { GameState } from '@/game/engine';

const CODE: Record<string, PieceType> = {
  L: 'leaf',
  B: 'blossom',
  W: 'water',
  S: 'shears',
  F: 'fertilizer',
  T: 'stone',
  D: 'seed',
};

/** Construye un tablero a partir de filas de letras (L hoja, B flor, W agua, S tijera, F fertilizante, T piedra, D semilla). */
export function gridFromRows(rows: string[]): Grid {
  let id = 1_000_000;
  return rows.map((row) =>
    [...row].map((ch): Piece => {
      const type = CODE[ch];
      if (!type) throw new Error(`Código de pieza desconocido: ${ch}`);
      return { id: id++, type };
    }),
  );
}

export function withGrid(state: GameState, rows: string[]): GameState {
  return { ...state, grid: gridFromRows(rows) };
}

export function rowsOf(grid: Grid): string[] {
  const inv: Record<PieceType, string> = {
    leaf: 'L',
    blossom: 'B',
    water: 'W',
    shears: 'S',
    fertilizer: 'F',
    stone: 'T',
    seed: 'D',
  };
  return grid.map((row) => row.map((p) => inv[p.type]).join(''));
}
