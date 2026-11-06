'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StoryDialog } from '@/components/StoryDialog';
import { ENDINGS } from '@/data/story';
import { useLang, useT } from '@/lib/use-t';

/** Final de la historia. El tipo llega en `?type=pro|standard` desde la pantalla de resultados. */
export default function EndingPage() {
  const t = useT();
  const lang = useLang();
  const [type, setType] = useState<'pro' | 'standard' | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('type');
    setType(value === 'pro' ? 'pro' : 'standard');
  }, []);

  if (!type) return null;
  const ending = ENDINGS[type];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-display text-4xl font-bold">{ending.title[lang]}</h1>
      <p className="max-w-sm text-[color:var(--muted)]">{t('ending.subtitle')}</p>
      {!done ? (
        <StoryDialog title={t('ending.title')} lines={ending.lines} onDone={() => setDone(true)} />
      ) : (
        <Link href="/menu" className="btn btn-moss">{t('ending.back')}</Link>
      )}
    </main>
  );
}
