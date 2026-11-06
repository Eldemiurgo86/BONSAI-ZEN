/**
 * Formas de datos que la API devuelve al cliente. Solo tipos: seguro para importar desde componentes cliente.
 */
import type { Booster, Difficulty, Season } from '@/game/types';
import type { PlayerStats, Ending } from '@/game/progression';

export type BoosterInventory = Record<Booster, number>;

export interface ProgressSummary {
  difficulty: Difficulty;
  currentLevel: number;
  season: Season;
  coins: number;
  boosters: BoosterInventory;
  lives: number | null;
  maxLives: number;
  nextRegenAt: number | null;
  bonsai: { seed: number; stage: string; style: string };
  stats: PlayerStats;
  achievements: string[];
  completedSeasons: Season[];
  totalLevels: number;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
}

export interface FinishResponse {
  ok: true;
  stars: 0 | 1 | 2 | 3;
  coinsEarned: number;
  newAchievements: string[];
  chapterCompleted: Season | null;
  ending: Ending | null;
  progress: ProgressSummary;
}
