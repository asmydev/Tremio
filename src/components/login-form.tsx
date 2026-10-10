'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Connexion par code à usage unique reçu par courriel (OTP).
 * Étape 1 : l'adresse courriel → envoi du code. Étape 2 : saisie du code → session ouverte.
 * Aucun lien à cliquer : rien ne dépend de l'URL du site (aperçus Vercel protégés, etc.).
 */
export function LoginForm() {
  const t = useTranslations('login');
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function sendCode() {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? t('errors.rateLimit') : t('errors.send'));
      return;
    }
    setStep('code');
    setCode('');
    setCooldown(60);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (error) {
      setPending(false);
      setError(error.status === 429 ? t('errors.rateLimit') : t('errors.code'));
      return;
    }
    router.replace('/');
    router.refresh();
  }

  const field = 'min-h-12 rounded-md border border-line-strong bg-surface-1 px-4 text-ink';
  const button = 'min-h-[50px] rounded-[14px] bg-accent font-semibold text-accent-fg disabled:opacity-60';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1 p-6">
      <h1 className="font-display text-[27px] font-bold tracking-[-0.02em]">{t('title')}</h1>

      {step === 'email' ? (
        <form onSubmit={(e) => { e.preventDefault(); void sendCode(); }} className="flex flex-col gap-4">
          <p className="text-ink-muted">{t('intro')}</p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
            {t('email')}
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <button type="submit" disabled={pending} className={button}>{pending ? t('sending') : t('sendCode')}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <p className="text-ink-muted">{t('codeSent', { email: email.trim() })}</p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
            {t('code')}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              maxLength={10}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${field} font-mono text-xl tracking-[0.3em]`}
            />
          </label>
          <button type="submit" disabled={pending || code.length < 6} className={button}>{pending ? t('verifying') : t('verify')}</button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" onClick={() => { setStep('email'); setError(null); }} className="min-h-11 font-semibold text-ink-2 underline underline-offset-2">
              {t('changeEmail')}
            </button>
            <button type="button" onClick={() => void sendCode()} disabled={cooldown > 0 || pending} className="min-h-11 font-semibold text-accent underline underline-offset-2 disabled:text-ink-muted disabled:no-underline">
              {cooldown > 0 ? t('resendIn', { seconds: cooldown }) : t('resend')}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">{error}</p>}
    </div>
  );
}
