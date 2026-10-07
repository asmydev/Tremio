'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { searchJobs } from '@/app/[locale]/(app)/jobs/actions';

export function JobSearch({ defaultWhat, defaultWhere }: { defaultWhat: string; defaultWhere: string }) {
  const t = useTranslations('jobs');
  const locale = useLocale() as 'fr' | 'en';
  const router = useRouter();
  const [what, setWhat] = useState(defaultWhat);
  const [where, setWhere] = useState(defaultWhere);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await searchJobs({ what, where, locale });
      if (!res.ok) setMessage({ tone: 'error', text: t(`errors.${res.error}`) });
      else setMessage({ tone: 'ok', text: res.data?.count ? t('found', { count: res.data.count }) : t('noneFound') });
      router.refresh();
    });
  }

  const field = 'min-h-12 w-full rounded-md border border-line-strong bg-surface-1 px-4 text-ink';
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border border-line bg-surface-1 p-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">{t('what')}<input value={what} onChange={(e) => setWhat(e.target.value)} required minLength={2} className={field} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">{t('where')}<input value={where} onChange={(e) => setWhere(e.target.value)} className={field} /></label>
        <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-accent px-6 font-semibold text-accent-fg disabled:opacity-60">
          <Search size={18} aria-hidden="true" />
          {pending ? t('searching') : t('search')}
        </button>
      </div>
      {pending && <p role="status" className="text-sm text-ink-muted">{t('searchingHint')}</p>}
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md px-4 py-3 text-sm ${message.tone === 'ok' ? 'bg-accent-soft text-accent-strong' : 'bg-signal-soft text-signal-strong'}`}>{message.text}</p>}
    </form>
  );
}
