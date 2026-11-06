'use client';
import { motion } from 'framer-motion';
import { resolveBackground } from '@/data/backgrounds';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';

/** Transición de entrada entre pantallas y fondo activo. Framer respeta la preferencia de movimiento reducido. */
export default function Template({ children }: { children: React.ReactNode }) {
  const background = useSettings((s) => s.background);
  const premium = useSession((s) => s.user?.isPremium ?? false);
  const bg = resolveBackground(background, premium);
  return (
    <motion.div
      id="contenido"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`min-h-dvh ${bg.className}`}
    >
      {children}
    </motion.div>
  );
}
