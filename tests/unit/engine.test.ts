import { describe, expect, it } from 'vitest';
import { findRuns, hasValidMove } from '@/game/board';
import { createGame, getHint, goalsProgress, trySwap, tick, useBooster, weatherAt, currentPool, emptyCollected } from '@/game/engine';
import { applyDifficulty } from '@/game/difficulty';
import { LEVELS } from '@/data/levels';
import { rowsOf, withGrid } from './helpers';
import type { EffectiveLevel } from '@/game/types';

const level: EffectiveLevel = {
  id: 999,
  size: 8,
  pool: ['leaf', 'blossom', 'water', 'seed', 'shears', 'stone'],
  goals: [{ type: 'collect', piece: 'leaf', count: 3 }],
  moves: 10,
  timeLimit: null,
  withering: false,
  weatherEnabled: false,
  starThresholds: [100, 300],
  difficulty: 'novato',
};


describe('trySwap', () => {
  it('rechaza intercambios que no forman combinación y deja el estado intacto', () => {
    // Patrón cíclico de 7 tipos: sin combinaciones iniciales.
    const rows = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => 'LBWSDTF'[(r * 3 + c) % 7]).join(''),
    );
    const state = withGrid(createGame(level, 3), rows);
    expect(findRuns(state.grid)).toHaveLength(0);
    const grid = state.grid;
    const res = trySwap(state, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(res.valid).toBe(false);
    expect(res.state).toBe(state);
    expect(res.steps).toHaveLength(2);
    expect(rowsOf(res.state.grid)).toEqual(rowsOf(grid));
  });

  it('rechaza intercambios no adyacentes', () => {
    const state = createGame(level, 3);
    expect(trySwap(state, { row: 0, col: 0 }, { row: 2, col: 2 }).valid).toBe(false);
  });

  it('una combinación válida suma puntos, cuenta piezas y gasta un movimiento', () => {
    // Fila 0: L L B L  -> al intercambiar (0,2) con (0,3) se forma LLL.
    const rows = ['LLBLTTTT', 'BBWWTTTT', 'WWSSDDDD', 'SSDDWWWW', 'DDTTSSSS', 'TTWWDDDD', 'SSLLBBBB', 'DDTTWWWW'];
    const state = withGrid(createGame(level, 5), rows);
    const res = trySwap(state, { row: 0, col: 2 }, { row: 0, col: 3 });
    expect(res.valid).toBe(true);
    expect(res.state.score).toBeGreaterThanOrEqual(30);
    expect(res.state.collected.leaf).toBeGreaterThanOrEqual(3);
    expect(res.state.movesLeft).toBe(9);
    expect(res.state.movesMade).toBe(1);
    expect(findRuns(res.state.grid)).toHaveLength(0);
  });

  it('el tablero resultante nunca contiene combinaciones y siempre tiene jugadas', () => {
    let state = createGame(applyDifficulty({ ...LEVELS[0] }, 'novato'), 42);
    for (let i = 0; i < 200 && state.status === 'playing'; i++) {
      const hint = getHint(state);
      if (!hint) throw new Error('sin jugadas');
      const res = trySwap(state, hint[0], hint[1]);
      state = res.state;
      expect(findRuns(state.grid)).toHaveLength(0);
      expect(hasValidMove(state.grid)).toBe(true);
    }
  });

  it('un movimiento válido produce pasos intermedios animables', () => {
    // Se combina la línea de hojas en la fila 1; al caer piezas, aparece otra línea de hojas.
    const rows = ['TTTTTTTT', 'LLBLTTTT', 'BBBBTTTT', 'WWWWTTTT', 'LLWSTTTT', 'WSWSDDDD', 'DDDDDDDD', 'SSSSSSSS'];
    const state = withGrid(createGame(level, 11), rows);
    const res = trySwap(state, { row: 1, col: 2 }, { row: 1, col: 3 });
    expect(res.valid).toBe(true);
    expect(res.steps.length).toBeGreaterThanOrEqual(2);
    expect(res.steps[0].cleared).toHaveLength(0);
    expect(res.steps.slice(1).every((s) => s.cascade >= 1)).toBe(true);
  });
});

describe('boosters', () => {
  it('tijera elimina la fila indicada', () => {
    const rows = ['TTTTTTTT', 'TTTTTTTT', 'TTTTTTTT', 'TTTTTTTT', 'TTTTTTTT', 'TTTTTTTT', 'TTTTTTTT', 'TTTTTTTT'];
    const state = withGrid(createGame(level, 2), rows);
    const res = useBooster(state, 'scissors', { row: 0, col: 0 });
    expect(res.valid).toBe(true);
    expect(res.steps[0].cleared).toHaveLength(8);
  });

  it('lluvia elimina seis piezas al azar', () => {
    const state = createGame(level, 2);
    const res = useBooster(state, 'rain');
    expect(res.valid).toBe(true);
    expect(res.steps[0].cleared).toHaveLength(6);
  });

  it('fertilizante arma el siguiente combinado y duplica las piezas contadas', () => {
    const rows = ['LLBLTTTT', 'BBWWTTTT', 'WWSSDDDD', 'SSDDWWWW', 'DDTTSSSS', 'TTWWDDDD', 'SSLLBBBB', 'DDTTWWWW'];
    const base = withGrid(createGame(level, 5), rows);
    const armed = useBooster(base, 'fertilizer');
    expect(armed.state.fertilizerArmed).toBe(true);
    const res = trySwap(armed.state, { row: 0, col: 2 }, { row: 0, col: 3 });
    expect(res.state.fertilizerArmed).toBe(false);
    expect(res.state.collected.leaf).toBeGreaterThanOrEqual(6);
  });
});

describe('objetivos y estado final', () => {
  it('gana al cumplir todos los objetivos', () => {
    const easy: EffectiveLevel = { ...level, goals: [{ type: 'score', count: 1 }], starThresholds: [1, 2] };
    const rows = ['LLBLTTTT', 'BBWWTTTT', 'WWSSDDDD', 'SSDDWWWW', 'DDTTSSSS', 'TTWWDDDD', 'SSLLBBBB', 'DDTTWWWW'];
    const state = withGrid(createGame(easy, 5), rows);
    const res = trySwap(state, { row: 0, col: 2 }, { row: 0, col: 3 });
    expect(res.state.status).toBe('won');
    expect(res.state.stars).toBe(3);
    expect(goalsProgress(res.state)[0].done).toBe(true);
  });

  it('pierde al quedarse sin movimientos (Pro)', () => {
    const pro = applyDifficulty(
      { id: 1, pool: ['leaf', 'blossom', 'water', 'seed'], goals: [{ type: 'collect', piece: 'leaf', count: 999 }], moves: 1, timeLimit: 100, starThresholds: [1, 2] },
      'pro',
    );
    const rows = ['LLBLTTTT', 'BBWWTTTT', 'WWSSDDDD', 'SSDDWWWW', 'DDTTSSSS', 'TTWWDDDD', 'SSLLBBBB', 'DDTTWWWW'];
    const state = withGrid(createGame(pro, 5), rows);
    const res = trySwap(state, { row: 0, col: 2 }, { row: 0, col: 3 });
    expect(res.state.status).toBe('lost');
  });

  it('pierde cuando se acaba el tiempo (Pro)', () => {
    const pro = applyDifficulty(
      { id: 1, pool: ['leaf', 'blossom', 'water', 'seed'], goals: [{ type: 'collect', piece: 'leaf', count: 999 }], moves: 30, timeLimit: 5, starThresholds: [1, 2] },
      'pro',
    );
    const state = createGame(pro, 5);
    expect(tick(state, 3).status).toBe('playing');
    expect(tick(state, 6).status).toBe('lost');
  });
});

describe('Pro: clima y marchitado', () => {
  it('el clima cambia cada 8 movimientos y excluye un tipo de pieza', () => {
    expect(weatherAt(0, true)).toBe('soleado');
    expect(weatherAt(8, true)).toBe('sequia');
    expect(weatherAt(16, true)).toBe('viento');
    expect(weatherAt(8, false)).toBe('soleado');
    const pool = currentPool({ level: { ...level, pool: ['leaf', 'blossom', 'water', 'seed', 'shears'] }, weather: 'sequia' });
    expect(pool).not.toContain('water');
  });

  it('el bonsái empieza con salud en Pro y no existe en Novato', () => {
    const pro = applyDifficulty({ id: 1, pool: ['leaf', 'blossom', 'water', 'seed'], goals: [{ type: 'collect', piece: 'leaf', count: 9 }], moves: 20, timeLimit: 100, starThresholds: [1, 2] }, 'pro');
    expect(createGame(pro, 1).health).toBe(100);
    expect(createGame(level, 1).health).toBeNull();
  });
});

describe('dificultad', () => {
  const base = LEVELS[10];

  it('Novato: sin límite de movimientos ni tiempo, máximo dos objetivos reducidos', () => {
    const e = applyDifficulty(base, 'novato');
    expect(e.moves).toBeNull();
    expect(e.timeLimit).toBeNull();
    expect(e.goals.length).toBeLessThanOrEqual(2);
    expect(e.withering).toBe(false);
  });

  it('Pro: límite de movimientos y tiempo, marchitado y un objetivo de puntuación extra', () => {
    const e = applyDifficulty(base, 'pro');
    expect(e.moves).toBe(base.moves);
    expect(e.timeLimit).toBe(base.timeLimit);
    expect(e.withering).toBe(true);
    expect(e.weatherEnabled).toBe(true);
    expect(e.goals.some((g) => g.type === 'score')).toBe(true);
  });
});

describe('estado inicial', () => {
  it('empieza en estado jugando con contadores a cero', () => {
    const s = createGame(level, 1);
    expect(s.status).toBe('playing');
    expect(s.score).toBe(0);
    expect(s.collected).toEqual(emptyCollected());
  });
});
