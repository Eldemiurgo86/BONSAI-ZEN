'use client';
import { useEffect, useState } from 'react';
import { LIFE_REGEN_MS } from '@/game/lives';
import { useT } from '@/lib/use-t';
import { useSession } from '@/store/session';

/** Tiempo actual que se actualiza cada segundo (solo para contadores visibles). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Muestra las vidas (modo gratis), o el estado Premium sin límite. */
export function LivesChip() {
  const t = useT();
  const progress = useSession((s) => s.progress);
  const now = useNow();
  if (!progress) return null;
  if (progress.lives === null) {
    return <span className="rounded-full bg-plum px-3 py-1 text-sm font-bold text-white">👑 {t('menu.unlimited')}</span>;
  }
  const next = progress.nextRegenAt;
  return (
    <span className="rounded-full bg-sakura px-3 py-1 text-sm font-bold text-white" aria-label={`${t('menu.lives')}: ${progress.lives}/${progress.maxLives}`}>
      ❤ {progress.lives}/{progress.maxLives}
      {progress.lives < progress.maxLives && next ? <span className="ml-1 font-normal opacity-90">· {formatMs(next - now)}</span> : null}
    </span>
  );
}

export function CoinsChip() {
  const progress = useSession((s) => s.progress);
  if (!progress) return null;
  return <span className="rounded-full bg-sun px-3 py-1 text-sm font-bold text-ink">🪙 {progress.coins}</span>;
}

export { LIFE_REGEN_MS, formatMs };
