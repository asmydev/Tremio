'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ExternalLink, Plus } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { addJobToApplications } from '@/app/[locale]/(app)/jobs/actions';

export interface JobItem {
  id: string; title: string; company: string | null; location: string | null; lang: string | null; url: string | null;
  salary: string | null; posted: string | null; score: number; reasons: { kind: 'strength' | 'gap'; text: string }[]; applicationId: string | null;
}

export function JobCard({ job }: { job: JobItem }) {
  const t = useTranslations('jobs');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  return (
    <article className="flex flex-wrap items-start gap-4 rounded-lg border border-line bg-surface-1 p-5">
      <span className={`flex size-14 flex-none items-center justify-center rounded-full border-4 font-display text-base font-bold ${job.score >= 80 ? 'border-accent' : 'border-signal'}`} aria-label={t('scoreLabel', { score: job.score })}>
        {job.score}
      </span>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
        <div>
          <h3 lang={job.lang ?? undefined} className="text-[17px] font-semibold leading-snug [overflow-wrap:anywhere] hyphens-auto">{job.title}</h3>
          <p className="text-sm text-ink-muted [overflow-wrap:anywhere]">{[job.company, job.location, job.salary, job.posted].filter(Boolean).join(' · ')}</p>
        </div>
        {job.reasons.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {job.reasons.map((r) => (
              <li key={r.text} className={`flex gap-2 ${r.kind === 'gap' ? 'text-signal-strong' : 'text-ink-2'}`}>
                {r.kind === 'strength'
                  ? <Check size={16} className="mt-0.5 flex-none text-accent" aria-label={t('strength')} />
                  : <Plus size={16} className="mt-0.5 flex-none text-signal-icon" aria-label={t('gap')} />}
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-col">
        {job.applicationId ? (
          <Link href={`/applications/${job.applicationId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent-soft px-4 font-semibold text-accent-strong">
            <Check size={16} aria-hidden="true" />{t('inApplications')}
          </Link>
        ) : (
          <button type="button" disabled={pending}
            onClick={() => start(async () => {
              setError(false);
              const res = await addJobToApplications(job.id);
              if (res.ok && res.data) router.push(`/applications/${res.data.id}`);
              else setError(true);
            })}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-fg disabled:opacity-60">
            <Plus size={16} aria-hidden="true" />{pending ? t('adding') : t('add')}
          </button>
        )}
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line-strong px-4 font-semibold">
            <ExternalLink size={16} aria-hidden="true" />{t('view')}
            <span className="sr-only">{t('newTab')}</span>
          </a>
        )}
        {error && <p role="alert" className="text-sm text-signal-strong">{t('errors.save_failed')}</p>}
      </div>
    </article>
  );
}
