'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { createApplication } from '@/app/[locale]/(app)/applications/actions';

export function NewApplication() {
  const t = useTranslations('applications');
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await createApplication(data);
      if (!res.ok || !res.data) return setError(t(`errors.${res.ok ? 'save_failed' : res.error}`));
      dialog.current?.close();
      router.push(`/applications/${res.data.id}`);
    });
  }

  const field = 'w-full rounded-md border border-line-strong bg-surface-1 px-4 py-3 text-ink';
  const label = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-2';

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="inline-flex min-h-[46px] items-center gap-2 rounded-md bg-accent px-5 font-semibold text-accent-fg">
        <Plus size={18} aria-hidden="true" />
        {t('add')}
      </button>
      <dialog ref={dialog} aria-labelledby="new-app-title" className="m-auto w-[min(640px,calc(100vw-32px))] rounded-xl border border-line bg-surface-1 p-0 text-ink backdrop:bg-black/40">
        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 id="new-app-title" className="font-display text-xl font-medium">{t('addTitle')}</h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label={t('close')} className="flex size-11 items-center justify-center rounded-md hover:bg-surface-0">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>{t('fields.title')}<input name="title" required maxLength={300} className={field} /></label>
            <label className={label}>{t('fields.company')}<input name="company" maxLength={300} className={field} /></label>
            <label className={label}>{t('fields.location')}<input name="location" maxLength={200} className={field} /></label>
            <label className={label}>
              {t('fields.lang')}
              <select name="lang" defaultValue="" className={field}>
                <option value="">—</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <label className={label}>{t('fields.url')}<input name="job_url" type="url" placeholder="https://" className={field} /></label>
          <label className={label}>
            {t('fields.description')}
            <textarea name="job_description" rows={8} className={field} />
            <span className="text-[13px] font-normal text-ink-muted">{t('descriptionHint')}</span>
          </label>
          {error && <p role="alert" className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">{error}</p>}
          <button type="submit" disabled={pending} className="min-h-[50px] rounded-[14px] bg-accent font-semibold text-accent-fg disabled:opacity-60">
            {pending ? t('saving') : t('create')}
          </button>
        </form>
      </dialog>
    </>
  );
}
