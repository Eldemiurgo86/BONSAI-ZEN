'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Line } from '@/data/story';
import { SPEAKER_NAMES } from '@/data/story';
import { useLang, useT } from '@/lib/use-t';

interface Props {
  title: string;
  lines: readonly Line[];
  onDone: () => void;
}

/** Diálogo de historia que avanza línea a línea. */
export function StoryDialog({ title, lines, onDone }: Props) {
  const t = useT();
  const lang = useLang();
  const [index, setIndex] = useState(0);
  const line = lines[index];
  const last = index >= lines.length - 1;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="story-title">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="card w-full max-w-md p-6"
        >
          <p id="story-title" className="font-display text-sm font-bold uppercase tracking-wide text-moss-deep">
            {title}
          </p>
          {line && (
            <>
              <p className="mt-2 font-display text-xl font-bold">{SPEAKER_NAMES[line.speaker][lang]}</p>
              <p className="mt-2 text-lg leading-relaxed">{line.text[lang]}</p>
            </>
          )}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost text-sm" onClick={onDone}>
              {t('story.skip')}
            </button>
            <button
              type="button"
              className="btn btn-moss"
              onClick={() => (last ? onDone() : setIndex(index + 1))}
            >
              {t('story.continue')}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
