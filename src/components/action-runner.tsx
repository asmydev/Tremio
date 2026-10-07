'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { PromptTemplate, Variable } from '@/lib/prompts/render';
import { Markdown } from './markdown';
import { useRouter } from '@/i18n/navigation';
import { saveDocument } from '@/app/[locale]/(app)/applications/actions';

type Lang = 'fr' | 'en';

export function ActionRunner({ templates, defaultDocLocale, applicationId, initialTemplateId }: {
  templates: PromptTemplate[];
  defaultDocLocale: Lang;
  applicationId?: string; // mode candidature : l'offre vient de la candidature, rien à coller
  initialTemplateId?: string;
}) {
  const t = useTranslations('studio');
  const ui = useLocale() as Lang;
  const [selected, setSelected] = useState(templates.find((tpl) => tpl.id === initialTemplateId)?.id ?? templates[0]?.id);
  const router = useRouter();
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [docLocale, setDocLocale] = useState<Lang>(defaultDocLocale);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [jobText, setJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const template = templates.find((tpl) => tpl.id === selected);
  const needsJob = !applicationId && template?.variables.some((v) => v.source === 'job');
  const asks = template?.variables.filter((v) => v.source === 'input') ?? [];

  async function run() {
    if (!template) return;
    setStatus('running'); setOutput(''); setMessage(''); setSaved('idle');
    let res: Response;
    try {
      res = await fetch('/api/ai/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        applicationId,
        outputLocale: docLocale,
        inputs,
        job: needsJob && jobText ? { title: jobTitle, company: company || undefined, description: jobText } : undefined
      })
      });
    } catch {
      setStatus('error');
      setMessage(t('error'));
      return;
    }
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      setStatus('error');
      if (res.status === 422 && body.error === 'page_fetch_failed') setMessage(t('pageFetch', { reason: body.reason }));
      else if (res.status === 422) setMessage(t('missing', { fields: (body.missing as Variable[]).map((v) => v.label[ui]).join(', ') }));
      else if (res.status === 429) setMessage(t('limit'));
      else setMessage(body.detail ? `${t('error')} (${body.detail})` : t('error'));
      return;
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      setOutput((prev) => prev + value);
    }
    setStatus('idle');
  }

  const field = 'w-full rounded-md border border-line-strong bg-surface-1 px-4 py-3 text-ink';

  return (
    <div className={applicationId ? 'flex flex-col gap-5' : 'grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]'}>
      <div className="flex flex-col gap-4">
        <div className={`grid gap-2.5 ${applicationId ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              aria-pressed={tpl.id === selected}
              onClick={() => setSelected(tpl.id)}
              className={`min-h-[64px] rounded-[14px] border px-3.5 py-3 text-left font-semibold ${tpl.id === selected ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line bg-surface-1'}`}
            >
              {tpl.title[ui]}
            </button>
          ))}
        </div>

        {needsJob && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
                {t('jobTitle')}
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
                {t('company')}
                <input value={company} onChange={(e) => setCompany(e.target.value)} className={field} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
              {t('pasteJob')}
              <textarea rows={7} value={jobText} onChange={(e) => setJobText(e.target.value)} className={field} />
            </label>
            <p className="text-[13px] text-ink-muted">{t('pasteJobHint')}</p>
          </div>
        )}

        {asks.map((v) => (
          <label key={v.key} className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
            {v.label[ui]}
            <textarea rows={3} value={inputs[v.key] ?? ''} onChange={(e) => setInputs({ ...inputs, [v.key]: e.target.value })} className={field} />
          </label>
        ))}

        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-muted">{t('docLanguage')}</span>
          <div role="group" aria-label={t('docLanguage')} className="ml-auto flex rounded-md border border-line bg-surface-0 p-[3px]">
            {(['fr', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={docLocale === l} onClick={() => setDocLocale(l)}
                className={`min-h-9 min-w-[52px] rounded-sm text-[13px] uppercase ${docLocale === l ? 'bg-surface-1 font-semibold' : 'text-ink-muted'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={run} disabled={status === 'running'}
          className="min-h-[50px] rounded-[14px] bg-accent font-semibold text-accent-fg disabled:opacity-60">
          {status === 'running' ? t('running') : t('run')}
        </button>
        {message && <p role="alert" className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">{message}</p>}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
      <section aria-live="polite" aria-busy={status === 'running'} className="min-h-[320px] min-w-0 rounded-xl border border-line bg-surface-1 p-6 text-ink-2">
        <Markdown>{output}</Markdown>
      </section>
      {applicationId && output && status === 'idle' && template && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saved === 'saving' || saved === 'saved'}
            onClick={async () => {
              setSaved('saving');
              const res = await saveDocument({ applicationId, templateId: template.id, locale: docLocale, content: output });
              setSaved(res.ok ? 'saved' : 'error');
              if (res.ok) router.refresh();
            }}
            className="min-h-11 rounded-md border border-line-strong bg-surface-1 px-4 font-semibold disabled:opacity-60"
          >
            {saved === 'saved' ? t('savedToApplication') : saved === 'saving' ? t('saving') : t('saveToApplication')}
          </button>
          {saved === 'error' && <span role="alert" className="text-sm text-signal-strong">{t('saveError')}</span>}
        </div>
      )}
      </div>
    </div>
  );
}
