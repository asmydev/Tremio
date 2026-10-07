'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import type { Application } from '@/lib/applications';
import { deleteApplication, updateApplication } from '@/app/[locale]/(app)/applications/actions';

/** Valeur pour <input type="datetime-local"> dans le fuseau du navigateur. */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function DetailsForm({ app }: { app: Application }) {
  const t = useTranslations('applications');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    // Le navigateur envoie une heure locale : on la convertit en date absolue avant l'envoi.
    const local = String(data.get('interview_at') ?? '');
    data.set('interview_at', local ? new Date(local).toISOString() : '');
    setMessage(null);
    start(async () => {
      const res = await updateApplication(app.id, data);
      setMessage(res.ok ? { tone: 'ok', text: t('saved') } : { tone: 'error', text: t(`errors.${res.error}`) });
      if (res.ok) router.refresh();
    });
  }

  function onDelete() {
    if (!window.confirm(t('confirmDelete'))) return;
    start(async () => {
      const res = await deleteApplication(app.id);
      if (res.ok) router.push('/applications');
      else setMessage({ tone: 'error', text: t(`errors.${res.error}`) });
    });
  }

  const field = 'w-full rounded-md border border-line-strong bg-surface-1 px-4 py-3 text-ink';
  const label = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-2';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1 p-5">
      <h2 className="font-display text-[17px] font-medium">{t('detailsTitle')}</h2>
      <label className={label}>{t('fields.title')}<input name="title" required defaultValue={app.title} className={field} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('fields.company')}<input name="company" defaultValue={app.company ?? ''} className={field} /></label>
        <label className={label}>{t('fields.location')}<input name="location" defaultValue={app.location ?? ''} className={field} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          {t('fields.lang')}
          <select name="lang" defaultValue={app.lang ?? ''} className={field}>
            <option value="">—</option>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className={label}>{t('fields.interview')}<input name="interview_at" type="datetime-local" defaultValue={toLocalInput(app.interview_at)} className={field} /></label>
      </div>
      <label className={label}>{t('fields.url')}<input name="job_url" type="url" defaultValue={app.job_url ?? ''} placeholder="https://" className={field} /></label>
      <label className={label}>{t('fields.description')}<textarea name="job_description" rows={7} defaultValue={app.job_description ?? ''} className={field} /></label>
      <label className={label}>{t('fields.notes')}<textarea name="notes" rows={4} defaultValue={app.notes ?? ''} className={field} /></label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-accent px-5 font-semibold text-accent-fg disabled:opacity-60">{t('save')}</button>
        <button type="button" onClick={onDelete} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold text-signal-strong hover:bg-signal-soft">
          <Trash2 size={16} aria-hidden="true" />{t('delete')}
        </button>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md px-4 py-2.5 text-sm ${message.tone === 'ok' ? 'bg-accent-soft text-accent-strong' : 'bg-signal-soft text-signal-strong'}`}>{message.text}</p>}
    </form>
  );
}
