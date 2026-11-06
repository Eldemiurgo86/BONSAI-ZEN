'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/store/session';

/** Exige sesión: refresca /api/me al montar y redirige a /login si no hay cuenta. */
export function useSessionGate() {
  const router = useRouter();
  const status = useSession((s) => s.status);
  const user = useSession((s) => s.user);
  const progress = useSession((s) => s.progress);

  useEffect(() => {
    let cancelled = false;
    void useSession.getState().refresh().then((ok) => {
      if (!ok && !cancelled) router.replace('/login');
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { status, user, progress, ready: status === 'ready' && user !== null && progress !== null };
}
