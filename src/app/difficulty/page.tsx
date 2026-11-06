'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ScreenHeader, Notice, Chip } from '@/components/ui';
import { api, ApiClientError } from '@/lib/api-client';
import { useSessionGate } from '@/lib/use-session-gate';
import { useT } from '@/lib/use-t';
import { useSession } from '@/store/session';
import type { Difficulty } from '@/game/types';

const OPTIONS: { value: Difficulty; titleKey: 'difficulty.novato' | 'difficulty.pro'; descKey: 'difficulty.novatoDesc' | 'difficulty.proDesc'; tone: string; icon: string }[] = [
  { value: 'novato', titleKey: 'difficulty.novato', descKey: 'difficulty.novatoDesc', tone: 'from-moss to-moss-deep', icon: '🌱' },
  { value: 'pro', titleKey: 'difficulty.pro', descKey: 'difficulty.proDesc', tone: 'from-sakura to-sakura-deep', icon: '🔥' },
];

export default function DifficultyPage() {
  const t = useT();
  const router = useRouter();
  const { ready, user, progress } = useSessionGate();
  const [selected, setSelected] = useState<Difficulty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const current = selected ?? progress?.difficulty ?? 'novato';

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await api('/api/settings', { method: 'PATCH', body: { difficulty: current } });
      await useSession.getState().refresh();
      router.push('/levels');
    } catch (err) {
      setError(err instanceof ApiClientError && err.code === 'difficulty_premium_required' ? t('difficulty.proPremium') : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ScreenHeader title={t('difficulty.title')} backHref="/menu" />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-10">
        <p className="text-[color:var(--muted)]">{t('difficulty.chooseHint')}</p>
        {ready && OPTIONS.map((opt) => {
          const active = current === opt.value;
          const locked = opt.value === 'pro' && !user?.isPremium;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(opt.value)}
              className={`card flex items-start gap-4 p-5 text-left transition ${active ? 'ring-4 ring-sun' : ''}`}
            >
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b text-3xl text-white ${opt.tone}`} aria-hidden>
                {opt.icon}
              </span>
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-2xl font-bold">{t(opt.titleKey)}</span>
                  {active && <Chip tone="sun">{t('difficulty.current')}</Chip>}
                  {locked && <Chip tone="sakura">{t('common.premium')}</Chip>}
                </span>
                <span className="mt-1 block text-[color:var(--muted)]">{t(opt.descKey)}</span>
              </span>
            </button>
          );
        })}
        {progress && progress.difficulty === 'pro' && !user?.isPremium && <Notice>{t('difficulty.proFree')}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className="btn btn-moss mt-2 w-full" onClick={save} disabled={busy || !ready}>
          {t('difficulty.continue')}
        </button>
      </main>
    </>
  );
}
