/**
 * Servicio de progreso (lado servidor). Toda la lógica de vidas, resultados,
 * monedas, logros y avance de nivel vive aquí; el cliente solo envía el resultado.
 */
import type { PoolClient } from 'pg';
import { unlockedAchievementIds } from '@/data/achievements';
import { levelById, TOTAL_LEVELS, isSeasonFinal, seasonOfLevel } from '@/data/levels';
import { computeLives, consumeLife, MAX_LIVES } from '@/game/lives';
import {
  applyOutcome,
  coinsForOutcome,
  completedSeasons,
  currentStage,
  EMPTY_STATS,
  endingFor,
  type Ending,
  type LevelOutcome,
  type PlayerStats,
} from '@/game/progression';
import { computeStars } from '@/game/scoring';
import { BOOSTERS, type Booster, type Difficulty, type Season } from '@/game/types';
import { canPlayLevel, canUseDifficulty, isPremium } from './premium';
import { BOOSTER_PRICES } from './progress-prices';
import { query, withTransaction } from './db';
import { ApiError, readBool, readInt, readOneOf } from './api';
import type { UserRecord } from './auth';
import type { BoosterInventory, ProgressSummary } from './dto';

export type { BoosterInventory, ProgressSummary } from './dto';

export { BOOSTER_PRICES };
export const STARTING_COINS = 50;

interface ProgressRow {
  user_id: string;
  difficulty: Difficulty;
  current_level: number;
  season: Season;
  bonsai_seed: number;
  coins: number;
  boosters: BoosterInventory;
  lives: number;
  lives_anchor: Date;
  stats: PlayerStats;
  achievements: string[];
}

const PROGRESS_COLUMNS = `user_id::text, difficulty, current_level, season, bonsai_seed, coins, boosters,
  lives, lives_anchor, stats, achievements`;

function normalizeStats(raw: Partial<PlayerStats> | null): PlayerStats {
  return { ...EMPTY_STATS, ...(raw ?? {}) };
}

/** Crea el progreso inicial de un jugador nuevo. Debe ejecutarse dentro de la misma transacción que el alta. */
export async function createInitialProgress(client: PoolClient, userId: string): Promise<void> {
  const seed = Math.floor(Math.random() * 0x7fffffff);
  await client.query(
    `insert into player_progress (user_id, bonsai_seed, coins, lives, lives_anchor, stats)
     values ($1, $2, $3, $4, now(), $5)`,
    [userId, seed, STARTING_COINS, MAX_LIVES, JSON.stringify(EMPTY_STATS)],
  );
}

async function lockProgress(client: PoolClient, userId: string): Promise<ProgressRow> {
  const { rows } = await client.query<ProgressRow>(
    `select ${PROGRESS_COLUMNS} from player_progress where user_id = $1 for update`,
    [userId],
  );
  const row = rows[0];
  if (!row) throw new ApiError(404, 'progress_not_found');
  return { ...row, stats: normalizeStats(row.stats) };
}


function summarize(row: ProgressRow, premium: boolean, now: number): ProgressSummary {
  const lives = computeLives(row.lives, row.lives_anchor.getTime(), now);
  const stats = row.stats;
  return {
    difficulty: row.difficulty,
    currentLevel: row.current_level,
    season: seasonOfLevel(row.current_level) ?? 'primavera',
    coins: row.coins,
    boosters: row.boosters,
    lives: premium ? null : lives.lives,
    maxLives: MAX_LIVES,
    nextRegenAt: premium ? null : lives.nextRegenAt,
    bonsai: { seed: row.bonsai_seed, stage: currentStage(stats), style: stats.lastStyle ?? 'japones' },
    stats,
    achievements: unlockedAchievementIds(stats),
    completedSeasons: completedSeasons(stats),
    totalLevels: TOTAL_LEVELS,
  };
}

/** Progreso resumido para la pantalla principal (sin escribir nada). */
export async function getProgressSummary(user: UserRecord): Promise<ProgressSummary> {
  const { rows } = await query<ProgressRow>(`select ${PROGRESS_COLUMNS} from player_progress where user_id = $1`, [user.id]);
  const row = rows[0];
  if (!row) throw new ApiError(404, 'progress_not_found');
  return summarize({ ...row, stats: normalizeStats(row.stats) }, isPremium(user), Date.now());
}

export async function setDifficulty(user: UserRecord, difficulty: Difficulty): Promise<void> {
  await query('update player_progress set difficulty = $2, updated_at = now() where user_id = $1', [user.id, difficulty]);
}

/** Valida y consume una vida al empezar un nivel. Premium no consume vidas. */
export async function startLevel(
  user: UserRecord,
  levelId: number,
  difficulty: Difficulty,
  now = Date.now(),
): Promise<{ lives: number | null; nextRegenAt: number | null }> {
  const level = levelById(levelId);
  if (!level) throw new ApiError(404, 'level_not_found');
  const premium = isPremium(user);
  if (!canPlayLevel(levelId, premium)) throw new ApiError(403, 'premium_required');
  if (!canUseDifficulty(difficulty, levelId, premium)) throw new ApiError(403, 'difficulty_premium_required');

  return withTransaction(async (client) => {
    const row = await lockProgress(client, user.id);
    if (levelId > row.current_level) throw new ApiError(409, 'level_locked');
    if (premium) return { lives: null, nextRegenAt: null };

    const result = consumeLife(row.lives, row.lives_anchor.getTime(), now);
    if (!result.ok) throw new ApiError(409, 'no_lives', { nextRegenAt: result.nextRegenAt });

    await client.query(
      'update player_progress set lives = $2, lives_anchor = $3, updated_at = now() where user_id = $1',
      [user.id, result.lives, new Date(result.anchorMs)],
    );
    return { lives: result.lives, nextRegenAt: result.nextRegenAt };
  });
}

export interface FinishInput {
  levelId: number;
  difficulty: Difficulty;
  won: boolean;
  score: number;
  matches: number;
  prunes: number;
  seeds: number;
  maxCascade: number;
  boosters: BoosterInventory;
}

export function parseFinishInput(body: Record<string, unknown>): FinishInput {
  const boostersRaw = (body.boosters ?? {}) as Record<string, unknown>;
  const boosters = Object.fromEntries(
    BOOSTERS.map((b) => [b, boostersRaw[b] === undefined ? 0 : readInt(boostersRaw[b], `booster_${b}`, 0, 50)]),
  ) as BoosterInventory;
  return {
    levelId: readInt(body.levelId, 'level', 1, TOTAL_LEVELS),
    difficulty: readOneOf(body.difficulty, 'difficulty', ['novato', 'pro'] as const),
    won: readBool(body.won, 'won'),
    score: readInt(body.score, 'score', 0, 1_000_000),
    matches: readInt(body.matches, 'matches', 0, 5_000),
    prunes: readInt(body.prunes, 'prunes', 0, 5_000),
    seeds: readInt(body.seeds, 'seeds', 0, 5_000),
    maxCascade: readInt(body.maxCascade, 'maxCascade', 0, 50),
    boosters,
  };
}

export interface FinishResult {
  stars: 0 | 1 | 2 | 3;
  coinsEarned: number;
  newAchievements: string[];
  chapterCompleted: Season | null;
  ending: Ending | null;
  progress: ProgressSummary;
}

/** Registra el resultado de una partida: estrellas (calculadas en el servidor), monedas, logros y avance. */
export async function finishLevel(user: UserRecord, input: FinishInput, now = Date.now()): Promise<FinishResult> {
  const level = levelById(input.levelId);
  if (!level) throw new ApiError(404, 'level_not_found');
  const premium = isPremium(user);
  if (!canPlayLevel(input.levelId, premium)) throw new ApiError(403, 'premium_required');
  if (!canUseDifficulty(input.difficulty, input.levelId, premium)) throw new ApiError(403, 'difficulty_premium_required');

  return withTransaction(async (client) => {
    const row = await lockProgress(client, user.id);
    if (input.levelId > row.current_level) throw new ApiError(409, 'level_locked');

    // Las estrellas las decide el servidor a partir de la puntuación; el cliente no puede inflarlas.
    const stars = computeStars(input.won, input.score, level.starThresholds);

    // Los boosters usados se descuentan del inventario (nunca por debajo de cero).
    const boosters = { ...row.boosters };
    let boostersUsed = 0;
    for (const b of BOOSTERS) {
      const used = Math.min(input.boosters[b], boosters[b]);
      boosters[b] -= used;
      boostersUsed += used;
    }

    const outcome: LevelOutcome = {
      levelId: input.levelId,
      difficulty: input.difficulty,
      won: input.won,
      stars,
      score: input.score,
      matches: input.matches,
      prunes: input.prunes,
      seeds: input.seeds,
      maxCascade: input.maxCascade,
      boostersUsed,
    };

    const stats = applyOutcome(row.stats, outcome);
    const earned = coinsForOutcome(outcome);
    const coins = row.coins + earned;
    const unlocked = unlockedAchievementIds(stats);
    const newAchievements = unlocked.filter((id) => !row.achievements.includes(id));

    let currentLevel = row.current_level;
    if (input.won && input.levelId === currentLevel && currentLevel < TOTAL_LEVELS) {
      currentLevel += 1;
    }
    const season = seasonOfLevel(currentLevel) ?? row.season;

    // Vidas: en modo gratis, la regeneración se recalcula para que el contador sea coherente con el nuevo estado.
    const lives = computeLives(row.lives, row.lives_anchor.getTime(), now);

    await client.query(
      `insert into level_results (user_id, level_id, difficulty, won, stars, score)
       values ($1, $2, $3, $4, $5, $6)`,
      [user.id, input.levelId, input.difficulty, input.won, stars, input.score],
    );
    await client.query(
      `update player_progress
          set stats = $2, coins = $3, boosters = $4, current_level = $5, season = $6,
              achievements = $7, lives = $8, lives_anchor = $9, updated_at = now()
        where user_id = $1`,
      [
        user.id,
        JSON.stringify(stats),
        coins,
        JSON.stringify(boosters),
        currentLevel,
        season,
        unlocked,
        lives.lives,
        new Date(lives.anchorMs),
      ],
    );

    const chapterCompleted = input.won && isSeasonFinal(input.levelId) ? (level.season as Season) : null;
    const ending = input.won && input.levelId === TOTAL_LEVELS ? endingFor(stats) : null;

    const summary = summarize(
      { ...row, stats, coins, boosters, current_level: currentLevel, season, achievements: unlocked, lives: lives.lives, lives_anchor: new Date(lives.anchorMs) },
      premium,
      now,
    );

    return { stars, coinsEarned: earned, newAchievements, chapterCompleted, ending, progress: summary };
  });
}

export async function buyBooster(user: UserRecord, booster: Booster): Promise<{ coins: number; boosters: BoosterInventory }> {
  const price = BOOSTER_PRICES[booster];
  return withTransaction(async (client) => {
    const row = await lockProgress(client, user.id);
    if (row.coins < price) throw new ApiError(409, 'not_enough_coins');
    const boosters = { ...row.boosters, [booster]: row.boosters[booster] + 1 };
    const coins = row.coins - price;
    await client.query('update player_progress set coins = $2, boosters = $3, updated_at = now() where user_id = $1', [
      user.id,
      coins,
      JSON.stringify(boosters),
    ]);
    return { coins, boosters };
  });
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  difficulty: string;
}

/** Mejor puntuación por jugador (global o por dificultad). */
export async function leaderboard(filter: 'all' | Difficulty, limit: number): Promise<LeaderboardEntry[]> {
  const { rows } = await query<{ name: string; score: number; difficulty: string }>(
    `select u.name, max(r.score)::int as score, $1::text as difficulty
       from level_results r
       join users u on u.id = r.user_id
      where ($1::text = 'all' or r.difficulty = $1::text)
      group by u.id, u.name
      order by score desc, u.name asc
      limit $2`,
    [filter, limit],
  );
  return rows.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, difficulty: filter }));
}

