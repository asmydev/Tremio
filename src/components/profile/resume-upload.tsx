'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import { uploadResume } from '@/app/[locale]/(app)/profile/actions';

export function ResumeUpload({ current }: { current: { title: string; date: string; chars: number } | null }) {
  const t = useTranslations('profile');
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.set('file', file);
    setMessage(null);
    start(async () => {
      const res = await uploadResume(data);
      setMessage(res.ok ? { tone: 'ok', text: t('uploaded') } : { tone: 'error', text: t(`errors.${res.error}`) });
      if (input.current) input.current.value = '';
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface-1 p-5">
      <h2 className="font-display text-[17px] font-medium">{t('resumeTitle')}</h2>
      {current ? (
        <div className="flex items-center gap-3">
          <span className="flex size-11 flex-none items-center justify-center rounded-md bg-accent-soft text-accent-strong">
            <FileText size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{current.title}</p>
            <p className="text-[13px] text-ink-muted">{t('resumeMeta', { date: current.date, chars: current.chars })}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">{t('resumeEmpty')}</p>
      )}

      <label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-line-strong px-4 font-semibold ${pending ? 'opacity-60' : 'hover:bg-surface-0'}`}>
        {pending ? t('uploading') : current ? t('replace') : t('upload')}
        <input ref={input} type="file" accept=".pdf,.docx,.txt" className="sr-only" disabled={pending} onChange={onChange} />
      </label>
      <p className="text-[13px] text-ink-muted">{t('formats')}</p>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md px-4 py-3 text-sm ${message.tone === 'ok' ? 'bg-accent-soft text-accent-strong' : 'bg-signal-soft text-signal-strong'}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
