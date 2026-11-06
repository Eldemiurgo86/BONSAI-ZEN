'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/use-t';
import type { TranslationKey } from '@/data/i18n';

/** Cabecera de pantalla con botón de volver. */
export function ScreenHeader({ title, backHref, right }: { title: string; backHref?: string; right?: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-[color:var(--bg)]/85 px-4 py-3 backdrop-blur">
      {backHref ? (
        <Link href={backHref} className="btn btn-ghost btn-icon" aria-label={t('common.back')}>
          ←
        </Link>
      ) : (
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => router.back()} aria-label={t('common.back')}>
          ←
        </button>
      )}
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">{right}</div>
    </header>
  );
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

export function Chip({ children, tone = 'sun' }: { children: React.ReactNode; tone?: 'sun' | 'sky' | 'sakura' | 'moss' }) {
  const colors: Record<string, string> = {
    sun: 'bg-sun text-ink',
    sky: 'bg-sky text-white',
    sakura: 'bg-sakura text-white',
    moss: 'bg-moss text-white',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${colors[tone]}`}>{children}</span>;
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  const classes = {
    info: 'bg-sky/20 text-[color:var(--fg)]',
    error: 'bg-sakura/30 text-[color:var(--fg)]',
    success: 'bg-moss/25 text-[color:var(--fg)]',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 font-bold ${classes[tone]}`}>
      {children}
    </div>
  );
}

export function Loading({ labelKey = 'common.loading' }: { labelKey?: TranslationKey }) {
  const t = useT();
  return (
    <div className="flex min-h-[50dvh] items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-moss border-t-transparent" aria-hidden />
        <p className="font-display text-lg">{t(labelKey)}</p>
      </div>
    </div>
  );
}
