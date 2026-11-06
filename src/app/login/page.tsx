'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiClientError, api } from '@/lib/api-client';
import { useT } from '@/lib/use-t';
import { useSession } from '@/store/session';
import { Notice } from '@/components/ui';
import type { TranslationKey } from '@/data/i18n';

const ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_credentials: 'auth.invalid',
  email_taken: 'auth.emailTaken',
  invalid_password: 'auth.weakPassword',
  invalid_email: 'auth.invalidEmail',
};

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  // Si ya hay sesión, va directo al menú.
  useEffect(() => {
    void useSession.getState().refresh().then((ok) => {
      if (ok) router.replace('/menu');
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = mode === 'login' ? { email, password } : { name, email, password };
      await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body });
      await useSession.getState().refresh();
      router.replace('/menu');
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : '';
      setError(ERROR_KEYS[code] ?? 'common.error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="card p-6">
        <h1 className="font-display text-3xl font-bold">{mode === 'login' ? t('auth.login') : t('auth.register')}</h1>
        <p className="mt-1 text-[color:var(--muted)]">{t('auth.subtitle')}</p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          {mode === 'register' && (
            <label className="flex flex-col gap-1 font-bold">
              {t('auth.name')}
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={40} required />
            </label>
          )}
          <label className="flex flex-col gap-1 font-bold">
            {t('auth.email')}
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            {t('auth.password')}
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>

          {error && <Notice tone="error">{t(error)}</Notice>}

          <button type="submit" className="btn btn-moss mt-2" disabled={busy}>
            {mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm font-bold underline underline-offset-4"
          onClick={() => {
            setError(null);
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
        </button>
      </div>
    </main>
  );
}
