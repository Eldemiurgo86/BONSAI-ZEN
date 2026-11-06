'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BonsaiView } from '@/components/BonsaiView';
import { CoinsChip, LivesChip } from '@/components/Hud';
import { Chip } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useSessionGate } from '@/lib/use-session-gate';
import { useT } from '@/lib/use-t';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { levelById } from '@/data/levels';
import { translate } from '@/data/i18n';

const ITEMS = [
  { href: '/levels', key: 'menu.play', icon: '🌸', tone: 'bg-moss' },
  { href: '/shop', key: 'menu.shop', icon: '🛍️', tone: 'bg-sakura' },
  { href: '/profile', key: 'menu.profile', icon: '🏅', tone: 'bg-plum' },
  { href: '/ranking', key: 'menu.ranking', icon: '🏆', tone: 'bg-sun' },
  { href: '/settings', key: 'menu.settings', icon: '⚙️', tone: 'bg-sky' },
] as const;

export default function MenuPage() {
  const t = useT();
  const router = useRouter();
  const { ready, user, progress } = useSessionGate();
  const lang = useSettings((s) => s.lang);
  const animations = useSettings((s) => s.animations && !s.reduceMotion);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!ready || !user || !progress) {
    return <div className="flex min-h-dvh items-center justify-center font-display text-xl" role="status">{t('common.loading')}</div>;
  }

  const currentLevel = levelById(progress.currentLevel);
  const season = currentLevel?.season ?? 'primavera';
  const stageLabel = t(`stage.${progress.bonsai.stage}` as Parameters<typeof t>[0]);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      useSession.getState().clear();
      router.replace('/login');
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 px-4 pb-10 pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[color:var(--muted)]">{translate(lang, 'menu.welcome', { name: user.name })}</p>
          <h1 className="font-display text-3xl font-bold">{t('menu.title')}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <CoinsChip />
          <LivesChip />
        </div>
      </header>

      <section className="card overflow-hidden p-4">
        <BonsaiView stage={progress.bonsai.stage as 'semilla'} style={progress.bonsai.style as 'japones'} seed={progress.bonsai.seed} season={season} animate={animations} className="h-56 w-full" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-lg font-bold">{translate(lang, 'menu.progressLabel', { season: t(`levels.season.${season}`), level: progress.currentLevel })}</p>
          <div className="flex flex-wrap gap-2">
            <Chip tone="moss">{stageLabel}</Chip>
            <Chip tone={user.isPremium ? 'sakura' : 'sky'}>{user.isPremium ? t('menu.premiumBadge') : t('menu.freeBadge')}</Chip>
          </div>
        </div>
      </section>

      <nav aria-label="Menú principal" className="grid grid-cols-2 gap-3">
        {ITEMS.map((item) => (
          <Link key={item.href + item.key} href={item.href} className={`btn ${item.tone} flex-col py-6 text-xl ${item.href === '/settings' ? 'col-span-2' : ''}`}>
            <span className="text-3xl" aria-hidden>{item.icon}</span>
            {t(item.key)}
          </Link>
        ))}
      </nav>

      <section className="card p-4 text-sm">
        <p className="font-bold">{t('menu.dailyTip')}</p>
        <p className="mt-1 text-[color:var(--muted)]">
          {t('menu.achievementsCount', { n: progress.achievements.length })} · {t('difficulty.title')}: {t(progress.difficulty === 'pro' ? 'difficulty.pro' : 'difficulty.novato')}
        </p>
        <Link href="/difficulty" className="mt-2 inline-block font-bold underline underline-offset-4">
          {t('levels.changeDifficulty')}
        </Link>
      </section>

      <button type="button" className="btn btn-ghost w-full" onClick={logout} disabled={loggingOut} title={t('menu.logoutHint')}>
        {t('common.logout')}
      </button>
    </main>
  );
}
