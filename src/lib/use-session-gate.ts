'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/store/session';

/** Garantiza sesión al montar (crea un invitado si hace falta) y expone el estado para la pantalla. */
export function useSessionGate() {
  const router = useRouter();
  const status = useSession((s) => s.status);
  const user = useSession((s) => s.user);
  const progress = useSession((s) => s.progress);

  useEffect(() => {
    let cancelled = false;
    void useSession.getState().ensure().then((ok) => {
      if (!ok && !cancelled) {
        const code = useSession.getState().lastError ?? 'unknown';
        router.replace(`/?error=${encodeURIComponent(code)}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { status, user, progress, ready: status === 'ready' && user !== null && progress !== null };
}
