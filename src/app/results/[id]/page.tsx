'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AdSlot } from '@/components/AdSlot';
import { BonsaiView } from '@/components/BonsaiView';
import { StoryDialog } from '@/components/StoryDialog';
import { Stars } from '@/components/Stars';
import { Chip, Panel, ScreenHeader } from '@/components/ui';
import { ACHIEVEMENTS } from '@/data/achievements';
import { CHAPTERS } from '@/data/story';
import { levelById, isSeasonFinal, TOTAL_LEVELS } from '@/data/levels';
import { useSessionGate } from '@/lib/use-session-gate';
import { useLang, useT } from '@/lib/use-t';
import { useGame } from '@/store/game';
import { useSettings } from '@/store/settings';
import { translate, type TranslationKey } from '@/data/i18n';

export default function ResultsPage() {
  const t = useT();
  const lang = useLang();
  const params = useParams<{ id: string }>();
  const levelId = Number(params.id);
  const level = levelById(levelId);
  const result = useGame((s) => s.lastResult);
  const { ready, user } = useSessionGate();
  const animations = useSettings((s) => s.animations && !s.reduceMotion);
  const [chapterOpen, setChapterOpen] = useState(false);

  if (!level) return null;
  if (!ready || !result || result.levelId !== levelId) {
    return (
      <>
        <ScreenHeader title={t('results.title')} backHref="/levels" />
        <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
          <Panel>
            <p>{ready ? t('results.none') : t('common.loading')}</p>
          </Panel>
          <Link href="/levels" className="btn btn-moss">{t('results.toMap')}</Link>
        </main>
      </>
    );
  }

  const premium = user?.isPremium ?? false;
  const chapter = result.chapterCompleted ? CHAPTERS.find((c) => c.season === result.chapterCompleted) : undefined;
  const nextLevel = levelId < TOTAL_LEVELS ? levelId + 1 : null;
  const stageChanged = result.stageBefore !== result.stageAfter;
  const achievements = result.newAchievements
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter((a): a is (typeof ACHIEVEMENTS)[number] => Boolean(a));

  return (
    <>
      {chapterOpen && chapter && (
        <StoryDialog title={t(`levels.season.${level.season}`)} lines={chapter.outro} onDone={() => setChapterOpen(false)} />
      )}
      <ScreenHeader title={t('results.title')} backHref="/levels" />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-10">
        <Panel className="flex flex-col items-center gap-3 text-center">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-moss-deep">
            {translate(lang, 'levels.level', { n: levelId })} · {t(result.difficulty === 'pro' ? 'difficulty.pro' : 'difficulty.novato')}
          </p>
          <h2 className="font-display text-4xl font-bold">{t(result.won ? 'play.won' : 'play.lost')}</h2>
          <Stars count={result.stars} />
          <div className="grid w-full grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-sun/30 p-3">
              <p className="text-xs font-bold uppercase text-[color:var(--muted)]">{t('results.score')}</p>
              <p className="font-display text-3xl font-bold">{result.score.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}</p>
            </div>
            <div className="rounded-2xl bg-moss/20 p-3">
              <p className="text-xs font-bold uppercase text-[color:var(--muted)]">{t('results.coins')}</p>
              <p className="font-display text-3xl font-bold">+{result.coinsEarned}</p>
            </div>
          </div>
          {!result.won && <p className="text-[color:var(--muted)]">{t('results.lost')}</p>}
        </Panel>

        <Panel className="flex flex-col items-center gap-3">
          <BonsaiView
            stage={result.stageAfter as 'semilla'}
            style={result.style as 'japones'}
            seed={result.seed}
            season={level.season}
            animate={animations}
            glow={achievements.length > 0}
            className="h-64 w-full"
          />
          {stageChanged ? (
            <p className="text-center font-bold">
              {t('results.stage')}: <Chip tone="moss">{t(`stage.${result.stageAfter}` as TranslationKey)}</Chip>
            </p>
          ) : null}
        </Panel>

        <Panel>
          <h3 className="font-display text-xl font-bold">{t('results.newAchievements')}</h3>
          {achievements.length === 0 ? (
            <p className="mt-2 text-[color:var(--muted)]">{t('results.achievementsNone')}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {achievements.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-sky/15 p-3">
                  <span className="text-3xl" aria-hidden>{a.icon}</span>
                  <div>
                    <p className="font-bold">{a.title[lang]}</p>
                    <p className="text-sm text-[color:var(--muted)]">{a.description[lang]}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {!premium && <AdSlot id="results" />}

        <div className="flex flex-col gap-3">
          {result.won && nextLevel && (
            <Link href={`/play/${nextLevel}`} className="btn btn-moss" onClick={() => useGame.getState().reset()}>
              {t('results.nextLevel')}
            </Link>
          )}
          {!result.won && (
            <Link href={`/play/${levelId}`} className="btn btn-sun" onClick={() => useGame.getState().reset()}>
              {t('results.retry')}
            </Link>
          )}
          {chapter && (
            <button type="button" className="btn btn-plum" onClick={() => setChapterOpen(true)}>
              {t('results.chapter')}
            </button>
          )}
          {result.ending && isSeasonFinal(levelId) && (
            <Link href={`/ending?type=${result.ending}`} className="btn btn-sakura">
              {t('results.ending')}
            </Link>
          )}
          <Link href="/levels" className="btn btn-ghost" onClick={() => useGame.getState().reset()}>
            {t('results.toMap')}
          </Link>
        </div>
      </main>
    </>
  );
}
