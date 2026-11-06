'use client';
import { useEffect, useState } from 'react';
import { Chip, Notice, Panel, ScreenHeader } from '@/components/ui';
import { BOOSTER_PRICES } from '@/lib/progress-prices';
import { api, ApiClientError } from '@/lib/api-client';
import { useSessionGate } from '@/lib/use-session-gate';
import { useT } from '@/lib/use-t';
import { useSession } from '@/store/session';
import type { TranslationKey } from '@/data/i18n';
import { BOOSTERS, type Booster } from '@/game/types';

const BOOSTER_ICON: Record<Booster, string> = { scissors: '✂️', rain: '🌧️', fertilizer: '🧪' };
const BOOSTER_NAME: Record<Booster, TranslationKey> = { scissors: 'play.scissors', rain: 'play.rain', fertilizer: 'play.fertilizer' };

export default function ShopPage() {
  const t = useT();
  const { ready, user, progress } = useSessionGate();
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status');
    if (status === 'success') setNotice({ tone: 'success', text: t('shop.success') });
    if (status === 'canceled') setNotice({ tone: 'info', text: t('shop.canceled') });
    // Tras el pago, Stripe redirige aquí antes de que llegue el webhook: se refresca unos segundos.
    if (status === 'success') {
      let tries = 0;
      const id = setInterval(async () => {
        tries++;
        const ok = await useSession.getState().refresh();
        if (ok && useSession.getState().user?.isPremium) clearInterval(id);
        if (tries > 10) clearInterval(id);
      }, 2000);
      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buyPremium = async () => {
    setBusy('premium');
    setNotice(null);
    try {
      const res = await api<{ url: string }>('/api/stripe/checkout', { method: 'POST' });
      window.location.href = res.url;
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : '';
      setNotice({ tone: 'error', text: code === 'stripe_not_configured' ? t('shop.stripeDisabled') : t('shop.checkoutError') });
      setBusy(null);
    }
  };

  const buyBooster = async (booster: Booster) => {
    setBusy(booster);
    setNotice(null);
    try {
      await api('/api/shop/booster', { method: 'POST', body: { booster } });
      await useSession.getState().refresh();
      setNotice({ tone: 'success', text: t('shop.bought') });
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : '';
      setNotice({ tone: 'error', text: code === 'not_enough_coins' ? t('shop.notEnough') : t('common.error') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <ScreenHeader title={t('shop.title')} backHref="/menu" right={progress ? <Chip tone="sun">🪙 {progress.coins}</Chip> : null} />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-10">
        {notice && <Notice tone={notice.tone === 'info' ? 'info' : notice.tone}>{notice.text}</Notice>}

        <Panel className="flex flex-col gap-3 bg-gradient-to-b from-sakura/25 to-plum/20">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-3xl font-bold">{t('shop.premium')}</h2>
            <Chip tone="sakura">👑</Chip>
          </div>
          <p>{t('shop.premiumDesc')}</p>
          <ul className="list-inside list-disc text-sm">
            <li>{t('shop.perk1')}</li>
            <li>{t('shop.perk2')}</li>
            <li>{t('shop.perk3')}</li>
            <li>{t('shop.perk4')}</li>
          </ul>
          <p className="text-xs text-[color:var(--muted)]">{t('shop.price')}</p>
          {ready && user?.isPremium ? (
            <p className="font-display text-xl font-bold">✓ {t('shop.owned')}</p>
          ) : (
            <button type="button" className="btn btn-sakura" onClick={buyPremium} disabled={!ready || busy !== null}>
              {t('shop.buy')}
            </button>
          )}
        </Panel>

        <Panel className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">{t('shop.boosters')}</h2>
          {BOOSTERS.map((b) => (
            <div key={b} className="flex items-center gap-3 rounded-2xl bg-black/5 p-3">
              <span className="text-3xl" aria-hidden>{BOOSTER_ICON[b]}</span>
              <div className="flex-1">
                <p className="font-bold">{t(BOOSTER_NAME[b])}</p>
                <p className="text-sm text-[color:var(--muted)]">{t('shop.boosterCost', { n: BOOSTER_PRICES[b] })} · {t('play.inventory', { n: progress?.boosters[b] ?? 0 })}</p>
              </div>
              <button type="button" className="btn btn-sun btn-sm" onClick={() => buyBooster(b)} disabled={!ready || busy !== null}>
                {t('shop.buyBooster')}
              </button>
            </div>
          ))}
        </Panel>
      </main>
    </>
  );
}
