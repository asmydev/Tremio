'use client';

import { useState, useTransition } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Download, Mail, Sparkles } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import type { LetterDoc } from '@/lib/letter/schema';
import { generateCoverLetter } from '@/app/[locale]/(app)/applications/letter-actions';

export interface LetterVersion { id: string; created_at: string; locale: 'fr' | 'en'; doc: LetterDoc }

const plain = (t: string) => t.replace(/\*\*/g, '');

export function TailoredLetter({ applicationId, defaultLocale, versions, hasDescription }: {
  applicationId: string; defaultLocale: 'fr' | 'en'; versions: LetterVersion[]; hasDescription: boolean;
}) {
  const t = useTranslations('letter');
  const format = useFormatter();
  const router = useRouter();
  const [locale, setLocale] = useState<'fr' | 'en'>(defaultLocale);
  const [notes, setNotes] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const latest = versions[0];

  function generate() {
    setError(null);
    start(async () => {
      const res = await generateCoverLetter(applicationId, locale, notes);
      if (res.ok) router.refresh();
      else setError(t(`errors.${res.error}`));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[520px] text-sm text-ink-muted">{t('intro')}</p>
        <div role="group" aria-label={t('language')} className="flex rounded-md border border-line bg-surface-0 p-[3px]">
          {(['fr', 'en'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={locale === l} onClick={() => setLocale(l)}
              className={`min-h-9 min-w-[52px] rounded-sm text-[13px] uppercase ${locale === l ? 'bg-surface-1 font-semibold' : 'text-ink-muted'}`}>{l}</button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
        {t('notes')}
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1500} placeholder={t('notesPlaceholder')}
          className="w-full rounded-md border border-line-strong bg-surface-1 px-4 py-3 font-normal text-ink" />
      </label>

      <button type="button" onClick={generate} disabled={pending || !hasDescription}
        className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-accent px-6 font-semibold text-accent-fg disabled:opacity-60">
        <Sparkles size={18} aria-hidden="true" />
        {pending ? t('generating') : latest ? t('regenerate') : t('generate')}
      </button>
      {pending && <p role="status" className="text-sm text-ink-muted">{t('generatingHint')}</p>}
      {!hasDescription && <p className="text-sm text-signal-strong">{t('errors.no_description')}</p>}
      {error && <p role="alert" className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">{error}</p>}

      {latest && (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-0 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 flex-none items-center justify-center rounded-md bg-accent-soft text-accent-strong"><Mail size={20} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{plain(latest.doc.subject)}</p>
                <p className="text-[13px] text-ink-muted">{format.dateTime(new Date(latest.created_at), { dateStyle: 'medium', timeStyle: 'short' })} · {latest.locale.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/letter/${latest.id}/pdf`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-fg"><Download size={16} aria-hidden="true" />{t('downloadPdf')}</a>
              <a href={`/api/letter/${latest.id}/docx`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-surface-1 px-4 font-semibold"><Download size={16} aria-hidden="true" />{t('downloadDocx')}</a>
            </div>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-accent">{t('preview')}</summary>
            <div className="mt-3 flex flex-col gap-2.5 rounded-md bg-surface-1 p-4 text-sm leading-relaxed text-ink-2">
              <p>{latest.doc.salutation}</p>
              {latest.doc.paragraphs.map((p, i) => <p key={i}>{plain(p)}</p>)}
              <p>{latest.doc.closing}</p>
            </div>
          </details>
        </div>
      )}

      {versions.length > 1 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-accent">{t('previous', { count: versions.length - 1 })}</summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {versions.slice(1).map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-4 text-sm text-ink-2">
                <span>{format.dateTime(new Date(v.created_at), { dateStyle: 'medium', timeStyle: 'short' })} · {v.locale.toUpperCase()}</span>
                <a href={`/api/letter/${v.id}/pdf`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent underline underline-offset-2"><Download size={14} aria-hidden="true" />PDF</a>
                <a href={`/api/letter/${v.id}/docx`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent underline underline-offset-2"><Download size={14} aria-hidden="true" />Word</a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
