'use client';
import { useEffect, useState } from 'react';
import { Notice, Panel, ScreenHeader } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useSessionGate } from '@/lib/use-session-gate';
import { useLang, useT } from '@/lib/use-t';
import type { TranslationKey } from '@/data/i18n';

type Filter = 'all' | 'novato' | 'pro';
interface Entry {
  rank: number;
  name: string;
  score: number;
}

const TABS: { value: Filter; label: TranslationKey }[] = [
  { value: 'all', label: 'ranking.global' },
  { value: 'novato', label: 'difficulty.novato' },
  { value: 'pro', label: 'difficulty.pro' },
];

export default function RankingPage() {
  const t = useT();
  const lang = useLang();
  const { ready, user } = useSessionGate();
  const [filter, setFilter] = useState<Filter>('all');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setEntries(null);
    setError(false);
    api<{ entries: Entry[] }>(`/api/leaderboard?difficulty=${filter}&limit=20`)
      .then((r) => !cancelled && setEntries(r.entries))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [filter, ready]);

  return (
    <>
      <ScreenHeader title={t('ranking.title')} backHref="/menu" />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-10">
        <div role="tablist" aria-label={t('ranking.title')} className="grid grid-cols-3 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={filter === tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`btn btn-sm ${filter === tab.value ? 'btn-sun' : 'btn-ghost'}`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        {error && <Notice tone="error">{t('common.error')}</Notice>}
        <Panel>
          {!entries && !error && <p role="status">{t('common.loading')}</p>}
          {entries && entries.length === 0 && <p>{t('ranking.empty')}</p>}
          {entries && entries.length > 0 && (
            <ol className="flex flex-col gap-2">
              {entries.map((e) => {
                const me = user && e.name === user.name;
                return (
                  <li key={e.rank} className={`flex items-center gap-3 rounded-2xl p-3 ${me ? 'bg-sun/35 font-bold' : 'bg-black/5'}`}>
                    <span className="w-8 font-display text-xl">{e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}</span>
                    <span className="flex-1 truncate">
                      {e.name}
                      {me && <span className="ml-2 text-xs">({t('ranking.you')})</span>}
                    </span>
                    <span className="font-display text-xl">{e.score.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </main>
    </>
  );
}
