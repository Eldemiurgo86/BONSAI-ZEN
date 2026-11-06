'use client';
import { motion } from 'framer-motion';

/** Tres estrellas animadas; `count` indica cuántas están encendidas. */
export function Stars({ count, size = 'text-4xl' }: { count: number; size?: string }) {
  return (
    <div className="flex items-center justify-center gap-2" role="img" aria-label={`${count} / 3`}>
      {[1, 2, 3].map((n) => (
        <motion.span
          key={n}
          aria-hidden
          className={`${size} ${n <= count ? 'text-sun drop-shadow' : 'text-[color:var(--muted)] opacity-40'}`}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15 * n, type: 'spring', stiffness: 300, damping: 12 }}
        >
          ★
        </motion.span>
      ))}
    </div>
  );
}
