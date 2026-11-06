/**
 * Catálogo de logros (18). Cada logro se evalúa a partir de las estadísticas
 * del jugador; no hay estado extra que mantener.
 */
import { completedSeasons, currentStage, type PlayerStats } from '@/game/progression';

export interface AchievementDef {
  readonly id: string;
  readonly icon: string;
  readonly title: { readonly es: string; readonly en: string };
  readonly description: { readonly es: string; readonly en: string };
  readonly check: (stats: PlayerStats) => boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'primer-brote',
    icon: '🌱',
    title: { es: 'Primer brote', en: 'First sprout' },
    description: { es: 'Completa tu primer nivel.', en: 'Complete your first level.' },
    check: (s) => s.completedIds.length >= 1,
  },
  {
    id: 'primera-poda',
    icon: '✂️',
    title: { es: 'Primera poda', en: 'First pruning' },
    description: { es: 'Elimina tu primera tijera de poda.', en: 'Clear your first pair of shears.' },
    check: (s) => s.totalPrunes >= 1,
  },
  {
    id: 'mano-firme',
    icon: '🪒',
    title: { es: 'Mano firme', en: 'Steady hand' },
    description: { es: 'Poda 50 veces en total.', en: 'Prune 50 times in total.' },
    check: (s) => s.totalPrunes >= 50,
  },
  {
    id: 'ola-de-hojas',
    icon: '🍃',
    title: { es: 'Ola de hojas', en: 'Leaf wave' },
    description: { es: 'Logra una cascada de 3 combinaciones.', en: 'Chain 3 combinations in one move.' },
    check: (s) => s.maxCascade >= 3,
  },
  {
    id: 'cascada-x5',
    icon: '🌊',
    title: { es: 'Cascada x5', en: 'Cascade x5' },
    description: { es: 'Logra una cascada de 5 combinaciones.', en: 'Chain 5 combinations in one move.' },
    check: (s) => s.maxCascade >= 5,
  },
  {
    id: 'tres-estrellas',
    icon: '⭐',
    title: { es: 'Tres estrellas', en: 'Three stars' },
    description: { es: 'Consigue 3 estrellas en un nivel.', en: 'Earn 3 stars on a level.' },
    check: (s) => s.threeStarIds.length >= 1,
  },
  {
    id: 'maestro-del-detalle',
    icon: '🏅',
    title: { es: 'Maestro del detalle', en: 'Master of detail' },
    description: { es: 'Consigue 3 estrellas en 10 niveles.', en: 'Earn 3 stars on 10 levels.' },
    check: (s) => s.threeStarIds.length >= 10,
  },
  {
    id: 'granjero-de-semillas',
    icon: '🌰',
    title: { es: 'Granjero de semillas', en: 'Seed farmer' },
    description: { es: 'Recoge 50 semillas.', en: 'Collect 50 seeds.' },
    check: (s) => s.totalSeeds >= 50,
  },
  {
    id: 'diez-mil-hojas',
    icon: '💯',
    title: { es: 'Diez mil hojas', en: 'Ten thousand leaves' },
    description: { es: 'Supera 10 000 puntos en una partida.', en: 'Score over 10,000 points in one game.' },
    check: (s) => s.bestScore >= 10000,
  },
  {
    id: 'mil-combinaciones',
    icon: '🔷',
    title: { es: 'Mil combinaciones', en: 'A thousand matches' },
    description: { es: 'Haz 500 combinaciones.', en: 'Make 500 matches.' },
    check: (s) => s.totalMatches >= 500,
  },
  {
    id: 'herramientas-del-oficio',
    icon: '🧰',
    title: { es: 'Herramientas del oficio', en: 'Tools of the trade' },
    description: { es: 'Usa 10 boosters.', en: 'Use 10 boosters.' },
    check: (s) => s.boosterUses >= 10,
  },
  {
    id: 'primer-desafio',
    icon: '🔥',
    title: { es: 'Primer desafío', en: 'First challenge' },
    description: { es: 'Completa un nivel en modo Pro.', en: 'Complete a level on Pro.' },
    check: (s) => s.proCompletedIds.length >= 1,
  },
  {
    id: 'aprendiz-en-la-sombra',
    icon: '🌑',
    title: { es: 'Aprendiz en la sombra', en: 'Apprentice in the shadows' },
    description: { es: 'Completa 10 niveles en modo Pro.', en: 'Complete 10 levels on Pro.' },
    check: (s) => s.proCompletedIds.length >= 10,
  },
  {
    id: 'bonsai-maduro',
    icon: '🌳',
    title: { es: 'Bonsái maduro', en: 'Mature bonsai' },
    description: { es: 'Alcanza la etapa madura del bonsái.', en: 'Grow your bonsai to the mature stage.' },
    check: (s) => ['maduro', 'obra'].includes(currentStage(s)),
  },
  {
    id: 'obra-maestra',
    icon: '🏆',
    title: { es: 'Obra maestra', en: 'Masterpiece' },
    description: { es: 'Alcanza la etapa de obra maestra.', en: 'Grow your bonsai into a masterpiece.' },
    check: (s) => currentStage(s) === 'obra',
  },
  {
    id: 'primavera-completa',
    icon: '🌸',
    title: { es: 'Primavera completa', en: 'Full spring' },
    description: { es: 'Completa todos los niveles de primavera.', en: 'Complete every spring level.' },
    check: (s) => completedSeasons(s).includes('primavera'),
  },
  {
    id: 'cuatro-estaciones',
    icon: '🍂',
    title: { es: 'Cuatro estaciones', en: 'Four seasons' },
    description: { es: 'Completa las cuatro estaciones.', en: 'Complete all four seasons.' },
    check: (s) => completedSeasons(s).length === 4,
  },
  {
    id: 'mas-alla-de-la-frontera',
    icon: '🗝️',
    title: { es: 'Más allá de la frontera', en: 'Beyond the gate' },
    description: { es: 'Completa el nivel 30, el último gratuito.', en: 'Complete level 30, the last free level.' },
    check: (s) => s.completedIds.includes(30),
  },
];

export function unlockedAchievementIds(stats: PlayerStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(stats)).map((a) => a.id);
}
