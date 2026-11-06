'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/game/engine';
import { inBounds } from '@/game/board';
import type { PieceType, Pos } from '@/game/types';
import { useT } from '@/lib/use-t';
import type { Burst } from '@/store/game';

const EMOJI: Record<PieceType, string> = {
  leaf: '🍃',
  blossom: '🌸',
  water: '💧',
  shears: '✂️',
  fertilizer: '🧪',
  stone: '🪨',
  seed: '🌰',
};

const TONE: Record<PieceType, string> = {
  leaf: 'from-lime-300 to-emerald-500',
  blossom: 'from-pink-200 to-rose-400',
  water: 'from-sky-200 to-blue-500',
  shears: 'from-slate-100 to-slate-400',
  fertilizer: 'from-amber-200 to-orange-500',
  stone: 'from-stone-200 to-stone-500',
  seed: 'from-amber-100 to-yellow-700',
};

interface BoardProps {
  game: GameState;
  selected: Pos | null;
  hint: [Pos, Pos] | null;
  burst: Burst | null;
  disabled: boolean;
  onTap: (p: Pos) => void;
  onSwipe: (a: Pos, b: Pos) => void;
}

const PARTICLES = 6;

/** Tablero match-3. Soporta toque (seleccionar y luego adyacente) y deslizamiento directo. */
export function Board({ game, selected, hint, burst, disabled, onTap, onSwipe }: BoardProps) {
  const t = useT();
  const innerRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(40);
  const drag = useRef<{ start: Pos; x: number; y: number; moved: boolean } | null>(null);
  const size = game.level.size;

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCell(entry.contentRect.width / size));
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  const cellFromPoint = (clientX: number, clientY: number): Pos | null => {
    const el = innerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const col = Math.floor((clientX - rect.left) / (rect.width / size));
    const row = Math.floor((clientY - rect.top) / (rect.height / size));
    const p = { row, col };
    return inBounds(p, size) ? p : null;
  };

  const isHint = (p: Pos) => hint !== null && hint.some((h) => h.row === p.row && h.col === p.col);
  const isSelected = (p: Pos) => selected !== null && selected.row === p.row && selected.col === p.col;

  return (
    <div className="board card relative aspect-square w-full p-2" role="grid" aria-label={t('play.objectives')} aria-disabled={disabled}>
      <div
        ref={innerRef}
        className="relative h-full w-full"
        onPointerDown={(e) => {
          if (disabled) return;
          const p = cellFromPoint(e.clientX, e.clientY);
          if (!p) return;
          drag.current = { start: p, x: e.clientX, y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.moved || disabled) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.3) return;
          d.moved = true;
          const target: Pos =
            Math.abs(dx) > Math.abs(dy)
              ? { row: d.start.row, col: d.start.col + Math.sign(dx) }
              : { row: d.start.row + Math.sign(dy), col: d.start.col };
          if (inBounds(target, size)) onSwipe(d.start, target);
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (d && !d.moved) onTap(d.start);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <AnimatePresence initial={false}>
          {game.grid.flatMap((row, r) =>
            row.map((piece, c) => {
              const hinted = isHint({ row: r, col: c });
              const selectedHere = isSelected({ row: r, col: c });
              return (
                <motion.div
                  key={piece.id}
                  role="gridcell"
                  data-row={r}
                  data-col={c}
                  data-type={piece.type}
                  data-hint={hinted ? 'true' : undefined}
                  aria-label={t(`piece.${piece.type}`)}
                  className="absolute left-0 top-0 flex items-center justify-center"
                  style={{ width: cell, height: cell, padding: cell * 0.06 }}
                  initial={{ opacity: 0, scale: 0.5, x: c * cell, y: (r - size) * cell }}
                  animate={{
                    x: c * cell,
                    y: r * cell,
                    opacity: 1,
                    scale: selectedHere ? 1.12 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.18 } }}
                  transition={{
                    x: { type: 'spring', stiffness: 520, damping: 40 },
                    y: { type: 'spring', stiffness: 520, damping: 40 },
                    scale: { duration: 0.15 },
                    opacity: { duration: 0.15 },
                  }}
                >
                  <div
                    className={`flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-b ${TONE[piece.type]} shadow-[inset_0_-4px_0_rgba(0,0,0,.15),inset_0_3px_0_rgba(255,255,255,.55)] ${
                      selectedHere ? 'ring-4 ring-sun' : ''
                    } ${hinted ? 'animate-pulse ring-4 ring-white' : ''}`}
                    style={{ fontSize: cell * 0.5 }}
                  >
                    <span aria-hidden>{EMOJI[piece.type]}</span>
                  </div>
                </motion.div>
              );
            }),
          )}
        </AnimatePresence>

        {burst && (
          <div key={burst.key} className="pointer-events-none absolute inset-0" aria-hidden>
            {burst.cells.flatMap((p, i) =>
              Array.from({ length: PARTICLES }, (_, k) => {
                const angle = (k / PARTICLES) * Math.PI * 2 + i;
                return (
                  <motion.span
                    key={`${i}-${k}`}
                    className="absolute rounded-full bg-sun"
                    style={{ left: p.col * cell + cell / 2 - 4, top: p.row * cell + cell / 2 - 4, width: 8, height: 8 }}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{ opacity: 0, x: Math.cos(angle) * cell * 0.6, y: Math.sin(angle) * cell * 0.6, scale: 0.2 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                );
              }),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
