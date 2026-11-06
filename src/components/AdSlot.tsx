'use client';
import { useT } from '@/lib/use-t';

/**
 * Espacio publicitario simulado. Para servir anuncios reales, sustituye el contenido
 * por el código de tu red de anuncios; este componente solo se muestra a usuarios gratuitos.
 */
export function AdSlot({ id = 'between-levels' }: { id?: string }) {
  const t = useT();
  return (
    <aside data-ad-slot={id} aria-label={t('results.ad')} className="card flex min-h-[88px] items-center justify-center p-4 text-center text-sm text-[color:var(--muted)]">
      <div>
        <p className="font-bold uppercase tracking-wide">{t('results.ad')}</p>
        <p className="mt-1">{t('results.removeAds')}</p>
      </div>
    </aside>
  );
}
