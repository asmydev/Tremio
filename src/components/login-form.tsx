'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations('login');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}` }
    });
    setState(error ? 'error' : 'sent');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1 p-6">
      <h1 className="font-display text-[27px] font-bold tracking-[-0.02em]">{t('title')}</h1>
      <p className="text-ink-muted">{t('intro')}</p>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
        {t('email')}
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-md border border-line-strong bg-surface-1 px-4 text-ink" />
      </label>
      <button type="submit" className="min-h-[50px] rounded-[14px] bg-accent font-semibold text-accent-fg">{t('submit')}</button>
      {state === 'sent' && <p role="status" className="rounded-md bg-accent-soft px-4 py-3 text-sm text-accent-strong">{t('sent')}</p>}
      {state === 'error' && <p role="alert" className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">{t('error')}</p>}
    </form>
  );
}
