'use client';
import Link from 'next/link';
import { ScreenHeader, Chip } from '@/components/ui';
import { CoinsChip, LivesChip } from '@/components/Hud';
import { LEVELS_PER_SEASON, LEVELS, FREE_LEVEL_LIMIT, isFreeLevel } from '@/data/levels';
import { useSessionGate } from '@/lib/use-session-gate';
import { useT } from '@/lib/use-t';
import { SEASONS } from '@/game/types';
import { completedSeasons } from '@/game/progression';

export default function LevelsPage() {
  const t = useT();
  const { ready, user, progress } = useSessionGate();

  if (!ready || !user || !progress) {
    return <div className="flex min-h-dvh items-center justify-center font-display text-xl" role="status">{t('common.loading')}</div>;
  }

  const completed = new Set(progress.stats.completedIds);
  const threeStars = new Set(progress.stats.threeStarIds);
  const premium = user.isPremium;

  return (
    <>
      <ScreenHeader title={t('levels.title')} backHref="/menu" />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{t('levels.progress', { done: completed.size, total: LEVELS.length })}</p>
            <CoinsChip />
            <LivesChip />
          </div>
          <Link href="/difficulty" className="text-sm font-bold underline underline-offset-4">
            {t('levels.changeDifficulty')} · {t(progress.difficulty === 'pro' ? 'difficulty.pro' : 'difficulty.novato')}
          </Link>
        </div>
        {!premium && <p className="text-sm text-[color:var(--muted)]">{t('levels.freeLimit')}</p>}

        {SEASONS.map((season, si) => {
          const levels = LEVELS.filter((l) => l.season === season);
          const done = completedSeasons(progress.stats).includes(season);
          return (
            <section key={season} aria-labelledby={`season-${season}`} className="card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id={`season-${season}`} className="font-display text-2xl font-bold">
                  {t(`levels.season.${season}`)}
                </h2>
                {done ? <Chip tone="moss">{t('levels.seasonDone')}</Chip> : <Chip tone="sky">{`${si + 1}/4`}</Chip>}
              </div>
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {levels.map((level) => {
                  const isDone = completed.has(level.id);
                  const isCurrent = level.id === progress.currentLevel;
                  const unlocked = level.id <= progress.currentLevel;
                  const needsPremium = !isFreeLevel(level.id) && !premium;
                  const playable = unlocked && !needsPremium;
                  const label = t('levels.level', { n: level.id });
                  const tone = isDone
                    ? 'bg-moss text-white'
                    : isCurrent
                      ? 'bg-sun text-ink animate-pulse'
                      : needsPremium
                        ? 'bg-plum/20 text-[color:var(--muted)]'
                        : unlocked
                          ? 'bg-sky text-white'
                          : 'bg-black/10 text-[color:var(--muted)]';
                  const content = (
                    <>
                      <span className="font-display text-xl font-bold">{level.id}</span>
                      <span className="text-xs" aria-hidden>
                        {isDone ? (threeStars.has(level.id) ? '★★★' : '✓') : needsPremium ? '👑' : !unlocked ? '🔒' : isCurrent ? '▶' : ''}
                      </span>
                    </>
                  );
                  return (
                    <li key={level.id}>
                      {playable ? (
                        <Link href={`/play/${level.id}`} aria-label={`${label}${isDone ? ' ✓' : ''}`} className={`flex aspect-square flex-col items-center justify-center rounded-2xl shadow-[0_4px_0_rgba(29,43,58,.2)] transition hover:scale-105 focus-visible:outline-4 focus-visible:outline-sun ${tone}`}>
                          {content}
                        </Link>
                      ) : needsPremium ? (
                        <Link href="/shop" aria-label={`${label} · ${t('levels.premiumOnly')}`} title={t('levels.unlock')} className={`flex aspect-square flex-col items-center justify-center rounded-2xl ${tone}`}>
                          {content}
                        </Link>
                      ) : (
                        <div aria-disabled="true" aria-label={`${label} · ${t('levels.locked')}`} className={`flex aspect-square flex-col items-center justify-center rounded-2xl ${tone}`}>
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="text-center text-sm text-[color:var(--muted)]">
          {FREE_LEVEL_LIMIT} / {LEVELS.length} · {LEVELS_PER_SEASON} × {SEASONS.length}
        </p>
      </main>
    </>
  );
}
