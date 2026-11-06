'use client';
import { BonsaiView } from '@/components/BonsaiView';
import { Chip, Panel, ScreenHeader } from '@/components/ui';
import { ACHIEVEMENTS } from '@/data/achievements';
import { LEVELS } from '@/data/levels';
import { useSessionGate } from '@/lib/use-session-gate';
import { useLang, useT } from '@/lib/use-t';
import { useSettings } from '@/store/settings';
import type { TranslationKey } from '@/data/i18n';

export default function ProfilePage() {
  const t = useT();
  const lang = useLang();
  const { ready, user, progress } = useSessionGate();
  const animations = useSettings((s) => s.animations && !s.reduceMotion);

  if (!ready || !user || !progress) {
    return <div className="flex min-h-dvh items-center justify-center font-display text-xl" role="status">{t('common.loading')}</div>;
  }

  const s = progress.stats;
  const unlocked = new Set(progress.achievements);
  const stat = (label: TranslationKey, value: string | number) => (
    <div className="rounded-2xl bg-black/5 p-3">
      <p className="text-xs font-bold uppercase text-[color:var(--muted)]">{t(label)}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );

  return (
    <>
      <ScreenHeader title={t('profile.title')} backHref="/menu" />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-10">
        <Panel className="flex flex-col items-center gap-2">
          <BonsaiView stage={progress.bonsai.stage as 'semilla'} style={progress.bonsai.style as 'japones'} seed={progress.bonsai.seed} season={progress.season} animate={animations} glow={progress.achievements.length >= 5} className="h-52 w-full" />
          <h2 className="font-display text-2xl font-bold">{user.name}</h2>
          <div className="flex flex-wrap justify-center gap-2">
            <Chip tone={user.isPremium ? 'sakura' : 'sky'}>{user.isPremium ? t('common.premium') : t('common.free')}</Chip>
            <Chip tone="moss">{t('profile.stage')}: {t(`stage.${progress.bonsai.stage}` as TranslationKey)}</Chip>
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-3 font-display text-xl font-bold">{t('profile.stats')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {stat('profile.completed', `${s.completedIds.length} / ${LEVELS.length}`)}
            {stat('profile.best', s.bestScore.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES'))}
            {stat('profile.seasons', `${progress.completedSeasons.length} / 4`)}
            {stat('profile.totalMatches', s.totalMatches)}
            {stat('profile.maxCascade', s.maxCascade)}
            {stat('profile.prunes', s.totalPrunes)}
            {stat('profile.seeds', s.totalSeeds)}
            {stat('profile.ending', s.proCompletedIds.length >= 4 ? '✓' : '—')}
          </div>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl font-bold">{t('profile.achievements')}</h3>
            <span className="text-sm font-bold">{t('profile.achievementsCount', { n: unlocked.size, total: ACHIEVEMENTS.length })}</span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const got = unlocked.has(a.id);
              return (
                <li key={a.id} className={`flex items-center gap-3 rounded-2xl p-3 ${got ? 'bg-sun/30' : 'bg-black/5'}`}>
                  <span className={`text-2xl ${got ? '' : 'grayscale opacity-50'}`} aria-hidden>{a.icon}</span>
                  <div className="min-w-0">
                    <p className={`font-bold ${got ? '' : 'text-[color:var(--muted)]'}`}>{a.title[lang]}</p>
                    <p className="text-xs text-[color:var(--muted)]">{got ? a.description[lang] : t('profile.locked')}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </main>
    </>
  );
}
