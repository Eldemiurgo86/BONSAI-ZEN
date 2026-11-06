'use client';
import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useSettings } from '@/store/settings';

/** Rehidrata preferencias, sincroniza idioma y aplica la configuración de movimiento. */
export function Providers({ children }: { children: React.ReactNode }) {
  const lang = useSettings((s) => s.lang);
  const animations = useSettings((s) => s.animations);
  const reduceMotion = useSettings((s) => s.reduceMotion);

  useEffect(() => {
    void useSettings.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? 'Bonsai Zen' : 'Bonsái Zen';
  }, [lang]);

  // 'always' fuerza el movimiento reducido; 'user' respeta prefers-reduced-motion del sistema.
  const motionMode = !animations || reduceMotion ? 'always' : 'user';
  return <MotionConfig reducedMotion={motionMode}>{children}</MotionConfig>;
}
