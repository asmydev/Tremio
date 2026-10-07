'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Mic } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { startPractice } from '@/app/[locale]/(app)/interviews/actions';

export function StartPractice({ applicationId, docLocale }: { applicationId: string; docLocale?: 'fr' | 'en' }) {
  const t = useTranslations('interviews');
  const ui = useLocale() as 'fr' | 'en';
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await startPractice(applicationId, docLocale ?? ui);
            if (res.ok) router.push(`/interviews/${res.data.id}`);
            else setError(t(`errors.${res.error}`));
          });
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-fg disabled:opacity-60"
      >
        <Mic size={16} aria-hidden="true" />
        {pending ? t('preparing') : t('practice')}
      </button>
      {error && <p role="alert" className="text-sm text-signal-strong">{error}</p>}
    </div>
  );
}
