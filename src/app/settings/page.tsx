'use client';
import { useState } from 'react';
import { Notice, Panel, ScreenHeader } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useSessionGate } from '@/lib/use-session-gate';
import { useLang, useT } from '@/lib/use-t';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { BACKGROUNDS, resolveBackground } from '@/data/backgrounds';
import { translate, type Lang, type TranslationKey } from '@/data/i18n';
import type { BackgroundId } from '@/store/settings';
import type { Difficulty } from '@/game/types';
import { useRouter } from 'next/navigation';

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 font-bold">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 rounded-full transition ${checked ? 'bg-moss' : 'bg-black/20'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const { ready, user, progress } = useSessionGate();
  const settings = useSettings();
  const [error, setError] = useState<TranslationKey | null>(null);
  const [saved, setSaved] = useState(false);

  const premium = user?.isPremium ?? false;
  const background = resolveBackground(settings.background, premium);

  const changeDifficulty = async (difficulty: Difficulty) => {
    setError(null);
    try {
      await api('/api/settings', { method: 'PATCH', body: { difficulty } });
      await useSession.getState().refresh();
      setSaved(true);
    } catch {
      setError(difficulty === 'pro' ? 'difficulty.proPremium' : 'common.error');
    }
  };

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    useSession.getState().clear();
    router.replace('/');
  };

  return (
    <>
      <ScreenHeader title={t('settings.title')} backHref="/menu" />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-10">
        <Panel className="flex flex-col divide-y divide-black/10">
          <Toggle label={t('settings.sound')} checked={settings.sound} onChange={(v) => settings.set({ sound: v })} />
          <Toggle label={t('settings.animations')} checked={settings.animations} onChange={(v) => settings.set({ animations: v })} />
          <Toggle label={t('settings.reducedMotion')} checked={settings.reduceMotion} onChange={(v) => settings.set({ reduceMotion: v })} />
        </Panel>

        <Panel className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 font-bold">
            {t('settings.language')}
            <select
              className="input"
              value={settings.lang}
              onChange={(e) => settings.set({ lang: e.target.value as Lang })}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-bold">{t('settings.difficulty')}</legend>
            {(['novato', 'pro'] as const).map((d) => (
              <label key={d} className="flex items-center gap-3 rounded-2xl bg-black/5 p-3">
                <input
                  type="radio"
                  name="difficulty"
                  value={d}
                  checked={(progress?.difficulty ?? 'novato') === d}
                  onChange={() => changeDifficulty(d)}
                  disabled={!ready}
                  className="h-5 w-5 accent-moss"
                />
                <span className="font-bold">{t(d === 'pro' ? 'difficulty.pro' : 'difficulty.novato')}</span>
              </label>
            ))}
          </fieldset>
          {saved && <p role="status" className="text-sm font-bold">{t('difficulty.saved')}</p>}
          {error && <Notice tone="error">{t(error)}</Notice>}
        </Panel>

        <Panel className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="font-bold">{t('settings.background')}</legend>
            {BACKGROUNDS.map((b) => {
              const locked = b.premium && !premium;
              return (
                <label key={b.id} className={`flex items-center gap-3 rounded-2xl p-3 ${locked ? 'opacity-60' : 'bg-black/5'}`}>
                  <input
                    type="radio"
                    name="background"
                    value={b.id}
                    checked={background.id === b.id}
                    disabled={locked}
                    onChange={() => settings.set({ background: b.id as BackgroundId })}
                    className="h-5 w-5 accent-moss"
                  />
                  <span className={`h-8 w-12 rounded-lg ${b.className}`} aria-hidden />
                  <span className="flex-1 font-bold">
                    {b.name[lang]}
                    {b.premium && <span className="ml-2 text-xs">👑 {t('common.premium')}</span>}
                  </span>
                </label>
              );
            })}
            {!premium && <p className="text-sm text-[color:var(--muted)]">{t('settings.premiumNote')}</p>}
          </fieldset>
        </Panel>

        <button type="button" className="btn btn-ghost w-full" onClick={logout}>
          {t('common.logout')}
        </button>
        <p className="text-center text-xs text-[color:var(--muted)]">{translate(lang, 'app.name')}</p>
      </main>
    </>
  );
}
