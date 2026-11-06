/**
 * Tipos compartidos de la lógica del juego. Este módulo no depende de React.
 */

export const PIECE_TYPES = [
  'leaf', // hoja
  'blossom', // flor de cerezo
  'water', // gota de agua (riego)
  'shears', // tijera de poda
  'fertilizer', // fertilizante
  'stone', // piedra decorativa
  'seed', // semilla (da monedas)
] as const;

export type PieceType = (typeof PIECE_TYPES)[number];

/** Pieza con identidad estable: el `id` viaja con la pieza durante caídas y swaps (útil para animar). */
export interface Piece {
  readonly id: number;
  readonly type: PieceType;
}

/** Tablero indexado como `grid[row][col]`; la fila 0 es la superior. */
export type Grid = Piece[][];

export interface Pos {
  readonly row: number;
  readonly col: number;
}

export type Difficulty = 'novato' | 'pro';

export const SEASONS = ['primavera', 'verano', 'otono', 'invierno'] as const;
export type Season = (typeof SEASONS)[number];

export const BONSAI_STYLES = ['cascada', 'japones', 'vertical'] as const;
export type BonsaiStyle = (typeof BONSAI_STYLES)[number];

export const BOOSTERS = ['scissors', 'rain', 'fertilizer'] as const;
export type Booster = (typeof BOOSTERS)[number];

export const WEATHERS = ['soleado', 'sequia', 'viento', 'helada'] as const;
export type Weather = (typeof WEATHERS)[number];

/** Objetivos de un nivel. */
export type Goal =
  | { readonly type: 'collect'; readonly piece: PieceType; readonly count: number }
  | { readonly type: 'score'; readonly count: number }
  | { readonly type: 'prune'; readonly count: number }
  | { readonly type: 'cascade'; readonly count: number };

/** Nivel ya adaptado a la dificultad elegida. Es lo que consume el motor. */
export interface EffectiveLevel {
  readonly id: number;
  readonly size: number;
  readonly pool: readonly PieceType[];
  readonly goals: readonly Goal[];
  /** null = movimientos ilimitados (Novato). */
  readonly moves: number | null;
  /** Segundos; null = sin límite de tiempo. */
  readonly timeLimit: number | null;
  /** Si el bonsái puede marchitarse (solo Pro). */
  readonly withering: boolean;
  /** Si el clima cambia las piezas disponibles (solo Pro). */
  readonly weatherEnabled: boolean;
  /** Puntuación mínima para 2 y 3 estrellas. */
  readonly starThresholds: readonly [number, number];
  readonly difficulty: Difficulty;
}
