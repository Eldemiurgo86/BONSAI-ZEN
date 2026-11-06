import { describe, expect, it } from 'vitest';
import { LEVELS, FREE_LEVEL_LIMIT, TOTAL_LEVELS, isFreeLevel, isSeasonFinal, levelById } from '@/data/levels';
import { ACHIEVEMENTS, unlockedAchievementIds } from '@/data/achievements';
import { CHAPTERS, ENDINGS } from '@/data/story';
import { consumeLife, computeLives, LIFE_REGEN_MS, MAX_LIVES } from '@/game/lives';
import {
  applyOutcome,
  coinsForOutcome,
  completedSeasons,
  currentStage,
  EMPTY_STATS,
  endingFor,
  stageForProgress,
  type LevelOutcome,
} from '@/game/progression';
import { buildTree, STAGE_PARAMS } from '@/game/bonsai';
import { isPremium, canPlayLevel } from '@/lib/premium';
import { translate } from '@/data/i18n';
import { SEASONS } from '@/game/types';

const outcome = (over: Partial<LevelOutcome> = {}): LevelOutcome => ({
  levelId: 1,
  difficulty: 'novato',
  won: true,
  stars: 2,
  score: 1000,
  matches: 10,
  prunes: 1,
  seeds: 6,
  maxCascade: 2,
  boostersUsed: 1,
  ...over,
});

describe('catálogo de niveles', () => {
  it('tiene 48 niveles repartidos en 4 estaciones de 12', () => {
    expect(LEVELS).toHaveLength(TOTAL_LEVELS);
    for (const season of SEASONS) {
      expect(LEVELS.filter((l) => l.season === season)).toHaveLength(12);
    }
  });

  it('cada nivel tiene objetivos alcanzables y piezas suficientes', () => {
    for (const l of LEVELS) {
      expect(l.goals.length).toBeGreaterThan(0);
      expect(l.pool.length).toBeGreaterThanOrEqual(4);
      expect(l.starThresholds[0]).toBeLessThan(l.starThresholds[1]);
    }
  });

  it('los niveles 1–30 son gratuitos y 31–48 requieren Premium', () => {
    expect(FREE_LEVEL_LIMIT).toBe(30);
    expect(isFreeLevel(30)).toBe(true);
    expect(isFreeLevel(31)).toBe(false);
    expect(canPlayLevel(31, false)).toBe(false);
    expect(canPlayLevel(31, true)).toBe(true);
  });

  it('el último nivel de cada estación es 12, 24, 36 y 48', () => {
    expect([12, 24, 36, 48].every(isSeasonFinal)).toBe(true);
    expect(levelById(12)?.season).toBe('primavera');
    expect(levelById(48)?.season).toBe('invierno');
  });
});

describe('vidas', () => {
  const T0 = 1_000_000_000_000;

  it('una cuenta llena no regenera ni tiene próxima recarga', () => {
    const s = computeLives(MAX_LIVES, T0, T0 + LIFE_REGEN_MS * 10);
    expect(s.lives).toBe(MAX_LIVES);
    expect(s.nextRegenAt).toBeNull();
  });

  it('regenera una vida cada 30 minutos', () => {
    const s = computeLives(2, T0, T0 + LIFE_REGEN_MS * 2 + 1);
    expect(s.lives).toBe(4);
    expect(s.nextRegenAt).toBe(T0 + LIFE_REGEN_MS * 3);
  });

  it('gastar una vida desde llena inicia la regeneración', () => {
    const r = consumeLife(MAX_LIVES, T0, T0 + 500);
    expect(r.ok).toBe(true);
    expect(r.lives).toBe(MAX_LIVES - 1);
    expect(r.nextRegenAt).toBe(T0 + 500 + LIFE_REGEN_MS);
  });

  it('no permite jugar sin vidas', () => {
    expect(consumeLife(0, T0, T0 + 1000).ok).toBe(false);
    expect(consumeLife(0, T0, T0 + LIFE_REGEN_MS).ok).toBe(true);
  });
});

describe('progresión y estadísticas', () => {
  it('las etapas del bonsái avanzan con los niveles completados', () => {
    expect(stageForProgress(0)).toBe('semilla');
    expect(stageForProgress(1)).toBe('brote');
    expect(stageForProgress(4)).toBe('juvenil');
    expect(stageForProgress(12)).toBe('maduro');
    expect(stageForProgress(24)).toBe('obra');
  });

  it('aplica un resultado ganado sin duplicar niveles', () => {
    const once = applyOutcome(EMPTY_STATS, outcome({ levelId: 3 }));
    const twice = applyOutcome(once, outcome({ levelId: 3 }));
    expect(twice.completedIds).toEqual([3]);
    expect(once.lastStyle).toBe(levelById(3)?.style);
  });

  it('una derrota no completa el nivel pero suma estadísticas', () => {
    const s = applyOutcome(EMPTY_STATS, outcome({ won: false, stars: 0, matches: 4, seeds: 3 }));
    expect(s.completedIds).toHaveLength(0);
    expect(s.totalMatches).toBe(4);
  });

  it('registra victorias Pro y estrellas', () => {
    const s = applyOutcome(EMPTY_STATS, outcome({ levelId: 12, difficulty: 'pro', stars: 3 }));
    expect(s.proCompletedIds).toEqual([12]);
    expect(s.threeStarIds).toEqual([12]);
  });

  it('el final Pro exige completar el último nivel de cada estación en Pro', () => {
    let s = EMPTY_STATS;
    for (const id of [12, 24, 36]) s = applyOutcome(s, outcome({ levelId: id, difficulty: 'pro' }));
    expect(endingFor(s)).toBe('standard');
    s = applyOutcome(s, outcome({ levelId: 48, difficulty: 'pro' }));
    expect(endingFor(s)).toBe('pro');
    // Un final de estación completado en Novato no cuenta para el final Pro.
    const novice = applyOutcome(applyOutcome(applyOutcome(EMPTY_STATS, outcome({ levelId: 12, difficulty: 'pro' })), outcome({ levelId: 24, difficulty: 'pro' })), outcome({ levelId: 36, difficulty: 'novato' }));
    expect(endingFor(applyOutcome(novice, outcome({ levelId: 48, difficulty: 'pro' })))).toBe('standard');
  });

  it('una estación está completa cuando todos sus niveles están completados', () => {
    let s = EMPTY_STATS;
    for (const l of LEVELS.filter((x) => x.season === 'primavera')) s = applyOutcome(s, outcome({ levelId: l.id }));
    expect(completedSeasons(s)).toEqual(['primavera']);
  });

  it('las monedas crecen con las estrellas, las semillas y la dificultad Pro', () => {
    const novice = coinsForOutcome(outcome({ stars: 1, seeds: 0 }));
    const pro = coinsForOutcome(outcome({ stars: 1, seeds: 0, difficulty: 'pro' }));
    expect(pro).toBe(novice * 2);
    expect(coinsForOutcome(outcome({ won: false, seeds: 9, stars: 0 }))).toBe(3);
  });

  it('currentStage deriva la etapa de los niveles completados', () => {
    const s = applyOutcome(EMPTY_STATS, outcome({ levelId: 1 }));
    expect(currentStage(s)).toBe('brote');
  });
});

describe('logros', () => {
  it('hay al menos 15 logros con identificadores únicos', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('desbloquea logros según las estadísticas', () => {
    const s = applyOutcome(EMPTY_STATS, outcome({ levelId: 1, maxCascade: 5, prunes: 1 }));
    const ids = unlockedAchievementIds(s);
    expect(ids).toContain('primer-brote');
    expect(ids).toContain('primera-poda');
    expect(ids).toContain('cascada-x5');
    expect(ids).not.toContain('obra-maestra');
  });
});

describe('bonsái procedural', () => {
  it('es determinista para la misma semilla y crece con la etapa', () => {
    const a = buildTree('juvenil', 'cascada', 42);
    const b = buildTree('juvenil', 'cascada', 42);
    expect(a).toEqual(b);
    const counts = (['semilla', 'brote', 'juvenil', 'maduro', 'obra'] as const).map((st) => buildTree(st, 'japones', 7).branches.length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1]);
    expect(STAGE_PARAMS.obra.depth).toBeGreaterThan(STAGE_PARAMS.brote.depth);
  });

  it('el estilo cascada hace que las ramas caigan más que el estilo vertical', () => {
    const lowest = (m: ReturnType<typeof buildTree>) => Math.min(...m.foliage.map((f) => f.position[1]));
    const cascade = buildTree('maduro', 'cascada', 3);
    const vertical = buildTree('maduro', 'vertical', 3);
    expect(lowest(cascade)).toBeLessThan(lowest(vertical));
  });
});

describe('premium y textos', () => {
  it('isPremium lee solo la marca del usuario', () => {
    expect(isPremium({ isPremium: true })).toBe(true);
    expect(isPremium({ isPremium: false })).toBe(false);
  });

  it('cada capítulo y final tiene texto en ambos idiomas', () => {
    expect(CHAPTERS).toHaveLength(4);
    for (const c of CHAPTERS) {
      expect(c.intro.every((l) => l.text.es && l.text.en)).toBe(true);
    }
    for (const e of Object.values(ENDINGS)) expect(e.lines.length).toBeGreaterThan(0);
  });

  it('translate sustituye variables y recurre al español si falta una clave', () => {
    expect(translate('en', 'goal.collect', { piece: 'Leaf' })).toBe('Collect: Leaf');
    expect(translate('es', 'levels.level', { n: 5 })).toBe('Nivel 5');
  });
});
