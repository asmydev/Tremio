'use client';

import { useState, useTransition } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Download, FileText, Sparkles } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import type { ResumeDoc } from '@/lib/resume/schema';
import { generateTailoredResume } from '@/app/[locale]/(app)/applications/resume-actions';

export interface ResumeVersion { id: string; created_at: string; locale: 'fr' | 'en'; doc: ResumeDoc }

export function TailoredResume({ applicationId, defaultLocale, versions, genderSet, hasDescription }: {
  applicationId: string; defaultLocale: 'fr' | 'en'; versions: ResumeVersion[]; genderSet: boolean; hasDescription: boolean;
}) {
  const t = useTranslations('resumePdf');
  const format = useFormatter();
  const router = useRouter();
  const [locale, setLocale] = useState<'fr' | 'en'>(defaultLocale);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const latest = versions[0];

  function generate() {
    setError(null);
    start(async () => {
      const res = await generateTailoredResume(applicationId, locale);
      if (res.ok) router.refresh();
      else setError(t(`errors.${res.error}`));
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[520px]">
          <h2 className="font-display text-xl font-medium">{t('title')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('intro')}</p>
        </div>
        <div role="group" aria-label={t('language')} className="flex rounded-md border border-line bg-surface-0 p-[3px]">
          {(['fr', 'en'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={locale === l} onClick={() => setLocale(l)}
              className={`min-h-9 min-w-[52px] rounded-sm text-[13px] uppercase ${locale === l ? 'bg-surface-1 font-semibold' : 'text-ink-muted'}`}>{l}</button>
          ))}
        </div>
      </div>

      {locale === 'fr' && !genderSet && (
        <p className="text-sm text-ink-muted">
          {t('genderHint')} <Link href="/profile" className="font-semibold text-accent underline underline-offset-2">{t('genderLink')}</Link>
        </p>
      )}

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
              <span className="flex size-11 flex-none items-center justify-center rounded-md bg-accent-soft text-accent-strong"><FileText size={20} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{latest.doc.headline || latest.doc.full_name}</p>
                <p className="text-[13px] text-ink-muted">{format.dateTime(new Date(latest.created_at), { dateStyle: 'medium', timeStyle: 'short' })} · {latest.locale.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/resume/${latest.id}/pdf`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-fg">
                <Download size={16} aria-hidden="true" />{t('download')}
              </a>
              <a href={`/api/resume/${latest.id}/docx`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-surface-1 px-4 font-semibold">
                <Download size={16} aria-hidden="true" />{t('downloadDocx')}
              </a>
            </div>
          </div>
          <p className="text-[13px] text-ink-muted">{t('formatsHint')}</p>
          {latest.doc.summary && <p className="text-sm leading-relaxed text-ink-2">{latest.doc.summary.replace(/\*\*/g, '')}</p>}
          {latest.doc.keywords_used.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-ink-2">{t('keywordsUsed')}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {latest.doc.keywords_used.map((k) => <span key={k} className="rounded-sm bg-accent-soft px-2.5 py-1 font-mono text-xs text-accent-strong">{k}</span>)}
              </div>
            </div>
          )}
          {latest.doc.missing_keywords.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-signal-strong">{t('missingKeywords')}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {latest.doc.missing_keywords.map((k) => <span key={k} className="rounded-sm border border-dashed border-signal-icon bg-signal-soft px-2.5 py-1 font-mono text-xs text-signal-strong">{k}</span>)}
              </div>
              <p className="mt-1.5 text-[13px] text-ink-muted">{t('missingHint')}</p>
            </div>
          )}
        </div>
      )}

      {versions.length > 1 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-accent">{t('previous', { count: versions.length - 1 })}</summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {versions.slice(1).map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-4 text-sm text-ink-2">
                <span>{format.dateTime(new Date(v.created_at), { dateStyle: 'medium', timeStyle: 'short' })} · {v.locale.toUpperCase()}</span>
                <a href={`/api/resume/${v.id}/pdf`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent underline underline-offset-2"><Download size={14} aria-hidden="true" />PDF</a>
                <a href={`/api/resume/${v.id}/docx`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent underline underline-offset-2"><Download size={14} aria-hidden="true" />Word</a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
