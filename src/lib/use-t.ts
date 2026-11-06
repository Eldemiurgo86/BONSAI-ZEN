'use client';
import { useCallback } from 'react';
import { translate, type TranslationKey } from '@/data/i18n';
import { useSettings } from '@/store/settings';

/** Devuelve la función de traducción para el idioma activo. */
export function useT() {
  const lang = useSettings((s) => s.lang);
  return useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
}

export function useLang() {
  return useSettings((s) => s.lang);
}
