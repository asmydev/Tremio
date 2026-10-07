'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { STATUSES, nextAction, type Application, type Status, type Tone } from '@/lib/applications';
import { moveApplication } from '@/app/[locale]/(app)/applications/actions';

const toneClass: Record<Tone, string> = {
  ready: 'bg-accent-soft text-accent-strong',
  decision: 'bg-signal-soft text-signal-strong',
  neutral: 'border border-line bg-surface-0 text-ink-2'
};

export function Board({ applications, now }: { applications: Application[]; now: number }) {
  const t = useTranslations('applications');
  const format = useFormatter();
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [error, setError] = useState(false);
  const [items, move] = useOptimistic(applications, (state, { id, status }: { id: string; status: Status }) =>
    state.map((a) => (a.id === id ? { ...a, status, position: Date.now(), updated_at: new Date().toISOString() } : a))
  );

  function changeStatus(id: string, status: Status) {
    setError(false);
    startTransition(async () => {
      move({ id, status });
      const res = await moveApplication(id, status);
      if (!res.ok) setError(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p role="alert" className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">{t('moveError')}</p>}
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1180px] grid-cols-5 gap-4">
          {STATUSES.map((status) => {
            const cards = items.filter((a) => a.status === status).sort((a, b) => b.position - a.position);
            return (
              <section
                key={status}
                aria-labelledby={`col-${status}`}
                onDragOver={(e) => { e.preventDefault(); setOver(status); }}
                onDragLeave={() => setOver((s) => (s === status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const id = e.dataTransfer.getData('text/plain');
                  if (id && items.find((a) => a.id === id)?.status !== status) changeStatus(id, status);
                }}
                className={`flex min-h-[520px] flex-col gap-2.5 rounded-[18px] p-3.5 transition-colors ${over === status ? 'bg-accent-soft' : 'bg-surface-sunken'}`}
              >
                <div className="flex items-center justify-between px-1 pb-1.5">
                  <h2 id={`col-${status}`} className="font-display text-[17px] font-medium">{t(`status.${status}`)}</h2>
                  <span className="rounded-full bg-surface-1 px-2.5 text-[13px] text-ink-2">{cards.length}</span>
                </div>
                {cards.length === 0 && <p className="px-1 text-[13px] text-ink-muted">{t('emptyColumn')}</p>}
                {cards.map((app) => {
                  const next = nextAction(app);
                  return (
                    <article
                      key={app.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', app.id); setDragging(app.id); }}
                      onDragEnd={() => setDragging(null)}
                      className={`flex cursor-grab flex-col gap-2.5 rounded-[14px] border border-line bg-surface-1 p-3.5 active:cursor-grabbing ${dragging === app.id ? 'opacity-50' : ''}`}
                    >
                      <Link href={`/applications/${app.id}`} className="block">
                        <span lang={app.lang ?? undefined} className="block font-semibold leading-snug">{app.title}</span>
                        <span className="text-[13px] text-ink-muted">
                          {[app.company, app.status === 'interview' && app.interview_at ? format.dateTime(new Date(app.interview_at), { weekday: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : format.relativeTime(new Date(app.updated_at), now)].filter(Boolean).join(' · ')}
                        </span>
                      </Link>
                      <Link
                        href={next.templateId ? `/applications/${app.id}?action=${next.templateId}` : `/applications/${app.id}`}
                        className={`inline-flex min-h-9 items-center gap-2 rounded-sm px-2.5 text-[13px] font-semibold ${toneClass[next.tone]}`}
                      >
                        <ArrowRight size={14} aria-hidden="true" />
                        {t(`next.${next.key}`)}
                      </Link>
                      <label className="flex items-center gap-2 text-[12px] text-ink-muted">
                        <span className="sr-only">{t('moveTo')}</span>
                        <select
                          value={app.status}
                          onChange={(e) => changeStatus(app.id, e.target.value as Status)}
                          className="min-h-9 w-full rounded-sm border border-line bg-surface-0 px-2 text-[13px] text-ink-2"
                          aria-label={t('moveTo')}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                        </select>
                      </label>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
