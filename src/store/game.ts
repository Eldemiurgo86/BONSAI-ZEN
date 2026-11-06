'use client';
import { create } from 'zustand';
import { trySwap, useBooster, tick, type GameState, type Step } from '@/game/engine';
import { sfx } from '@/lib/sound';
import { useSettings } from './settings';
import type { Booster, Difficulty, Grid, Pos, Season } from '@/game/types';
import type { Ending } from '@/game/progression';
import type { TranslationKey } from '@/data/i18n';

export interface LastResult {
  levelId: number;
  difficulty: Difficulty;
  won: boolean;
  score: number;
  stars: 0 | 1 | 2 | 3;
  coinsEarned: number;
  newAchievements: string[];
  chapterCompleted: Season | null;
  ending: Ending | null;
  stageBefore: string;
  stageAfter: string;
  style: string;
  seed: number;
}

export interface Burst {
  readonly key: number;
  readonly cells: readonly Pos[];
}

interface GameStore {
  levelId: number | null;
  difficulty: Difficulty;
  game: GameState | null;
  busy: boolean;
  selected: Pos | null;
  boosterMode: Booster | null;
  paused: boolean;
  hint: [Pos, Pos] | null;
  cascade: { key: number; n: number } | null;
  burst: Burst | null;
  used: Record<Booster, number>;
  message: TranslationKey | null;
  lastResult: LastResult | null;
  init: (levelId: number, difficulty: Difficulty, game: GameState) => void;
  select: (p: Pos | null) => void;
  setPaused: (paused: boolean) => void;
  setBoosterMode: (b: Booster | null) => void;
  setHint: (h: [Pos, Pos] | null) => void;
  swap: (a: Pos, b: Pos) => Promise<void>;
  applyBooster: (b: Booster, target?: Pos) => Promise<void>;
  tickSecond: () => void;
  setMessage: (m: TranslationKey | null) => void;
  setLastResult: (r: LastResult | null) => void;
  reset: () => void;
}

const STEP_MS = 280;
const SWAP_MS = 150;
let burstKey = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const animDelay = (ms: number) => (useSettings.getState().animations && !useSettings.getState().reduceMotion ? ms : Math.round(ms / 4));

/** Posiciones actuales de las piezas con los ids indicados (para la explosión de partículas). */
function positionsOf(grid: Grid, ids: readonly number[]): Pos[] {
  const wanted = new Set(ids);
  const out: Pos[] = [];
  grid.forEach((row, r) => row.forEach((p, c) => {
    if (wanted.has(p.id)) out.push({ row: r, col: c });
  }));
  return out;
}

async function playSteps(steps: readonly Step[], set: (p: Partial<GameStore>) => void, get: () => GameStore) {
  for (const step of steps) {
    const current = get().game;
    if (!current) return;
    const prev = current.grid;
    const cleared = step.cleared.length > 0;
    if (cleared) {
      sfx.match(step.cascade);
      if (step.cascade >= 2) {
        set({ cascade: { key: ++burstKey, n: step.cascade } });
      }
    }
    set({
      game: { ...current, grid: step.grid, score: current.score + step.points },
      burst: cleared ? { key: ++burstKey, cells: positionsOf(prev, step.cleared) } : get().burst,
    });
    await sleep(animDelay(cleared ? STEP_MS : SWAP_MS));
  }
}

export const useGame = create<GameStore>()((set, get) => ({
  levelId: null,
  difficulty: 'novato',
  game: null,
  busy: false,
  selected: null,
  boosterMode: null,
  paused: false,
  hint: null,
  cascade: null,
  burst: null,
  used: { scissors: 0, rain: 0, fertilizer: 0 },
  message: null,
  lastResult: null,

  init: (levelId, difficulty, game) =>
    set({ levelId, difficulty, game, busy: false, selected: null, boosterMode: null, paused: false, hint: null, used: { scissors: 0, rain: 0, fertilizer: 0 }, message: null }),

  select: (p) => set({ selected: p }),
  setPaused: (paused) => set({ paused }),
  setBoosterMode: (b) => set({ boosterMode: b, selected: null }),
  setHint: (h) => set({ hint: h }),
  setMessage: (m) => set({ message: m }),
  setLastResult: (r) => set({ lastResult: r }),

  swap: async (a, b) => {
    const { game, busy, paused } = get();
    if (!game || busy || paused || game.status !== 'playing') return;
    set({ busy: true, selected: null, hint: null });
    const result = trySwap(game, a, b);
    if (result.valid) sfx.swap(); else sfx.invalid();
    await playSteps(result.steps, set, get);
    // Un intercambio válido adopta el estado final del motor; uno inválido conserva el anterior.
    set({ game: result.valid ? result.state : game, busy: false });
    if (result.valid && result.state.status !== 'playing') sfx.end(result.state.status === 'won');
  },

  applyBooster: async (booster, target) => {
    const { game, busy, paused, used } = get();
    if (!game || busy || paused || game.status !== 'playing') return;
    set({ busy: true, boosterMode: null, selected: null, hint: null });
    const result = useBooster(game, booster, target);
    if (!result.valid) {
      set({ busy: false });
      return;
    }
    sfx.booster();
    set({ used: { ...used, [booster]: used[booster] + 1 } });
    await playSteps(result.steps, set, get);
    set({ game: result.state, busy: false });
  },

  tickSecond: () => {
    const { game, paused, busy } = get();
    if (!game || paused || busy || game.status !== 'playing' || game.timeLeft === null) return;
    set({ game: tick(game, 1) });
  },

  reset: () => set({ levelId: null, game: null, busy: false, selected: null, boosterMode: null, paused: false, hint: null, cascade: null, burst: null, message: null }),
}));
