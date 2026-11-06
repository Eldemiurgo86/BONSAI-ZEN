'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BonsaiView } from '@/components/BonsaiView';
import { useT } from '@/lib/use-t';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';

/** Portada: bonsái animado y acceso al jardín. */
export default function SplashPage() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const animations = useSettings((s) => s.animations && !s.reduceMotion);

  const enter = async () => {
    setBusy(true);
    const ok = await useSession.getState().refresh();
    router.push(ok ? '/menu' : '/login');
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-between px-6 py-10 text-center">
      <header className="mt-2">
        <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-moss-deep">Cultivo japonés</p>
        <h1 className="mt-2 font-display text-5xl font-bold sm:text-6xl">{t('app.name')}</h1>
        <p className="mx-auto mt-3 max-w-xs text-lg">{t('app.tagline')}</p>
      </header>

      <BonsaiView stage="maduro" style="japones" seed={20240601} season="primavera" animate={animations} className="h-[48dvh] w-full" />

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button type="button" className="btn btn-moss w-full text-xl" onClick={enter} disabled={busy}>
          {t('splash.play')}
        </button>
        <Link href="/settings" className="text-sm font-bold underline underline-offset-4">
          {t('menu.settings')}
        </Link>
      </div>
    </main>
  );
}
