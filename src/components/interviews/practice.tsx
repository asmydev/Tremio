'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { evaluateAnswer } from '@/app/[locale]/(app)/interviews/actions';
import type { Answer, Feedback, Question } from '@/lib/interviews';

const STAR = ['situation', 'task', 'action', 'result'] as const;

function FeedbackCard({ feedback, title }: { feedback: Feedback; title: string }) {
  const t = useTranslations('interviews');
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface-1 p-5" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-2">{title}</p>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${feedback.score >= 4 ? 'bg-accent-soft text-accent-strong' : 'bg-signal-soft text-signal-strong'}`}>{t('score', { score: feedback.score })}</span>
      </div>
      <ul className="grid grid-cols-4 gap-1.5 text-center">
        {STAR.map((k) => (
          <li key={k} className={`flex items-center justify-center gap-1 rounded-[10px] px-1 py-2 text-[13px] font-semibold ${feedback.star[k] ? 'bg-accent-soft text-accent-strong' : 'border-[1.5px] border-dashed border-signal-icon bg-signal-soft text-signal-strong'}`}>
            {feedback.star[k] ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
            <span>{t(`star.${k}`)}</span>
            <span className="sr-only">{feedback.star[k] ? t('present') : t('missing')}</span>
          </li>
        ))}
      </ul>
      {feedback.strengths.length > 0 && (
        <div><p className="text-sm font-semibold">{t('strengths')}</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">{feedback.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
      )}
      {feedback.improvements.length > 0 && (
        <div><p className="text-sm font-semibold text-signal-strong">{t('improvements')}</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">{feedback.improvements.map((s) => <li key={s}>{s}</li>)}</ul></div>
      )}
      <details className="rounded-md bg-surface-0 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-accent">{t('improvedAnswer')}</summary>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{feedback.improved}</p>
      </details>
    </section>
  );
}

export function Practice({ sessionId, questions, initialAnswers, backHref }: { sessionId: string; questions: Question[]; initialAnswers: Answer[]; backHref: string }) {
  const t = useTranslations('interviews');
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers);
  const firstOpen = questions.findIndex((_, i) => !initialAnswers.some((a) => a.index === i));
  const [current, setCurrent] = useState(firstOpen === -1 ? questions.length : firstOpen);
  const [draft, setDraft] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const done = current >= questions.length;
  const currentFeedback = answers.find((a) => a.index === current)?.feedback;
  const answered = (i: number) => answers.some((a) => a.index === i);

  function submit() {
    setError(null);
    start(async () => {
      const res = await evaluateAnswer(sessionId, current, draft);
      if (!res.ok) return setError(t(`errors.${res.error}`));
      setAnswers((prev) => prev.filter((a) => a.index !== current).concat({ index: current, answer: draft, feedback: res.data }));
    });
  }

  function next() {
    setDraft('');
    setError(null);
    setCurrent((c) => c + 1);
  }

  const avg = answers.length ? answers.reduce((s, a) => s + a.feedback.score, 0) / answers.length : 0;

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <ol className="flex gap-1.5" aria-label={t('progress', { current: Math.min(current + 1, questions.length), total: questions.length })}>
        {questions.map((_, i) => (
          <li key={i} className={`h-1.5 flex-1 rounded-full ${answered(i) || i < current ? 'bg-accent' : i === current ? 'bg-accent/40' : 'bg-line'}`} />
        ))}
      </ol>

      {done ? (
        <section className="flex flex-col gap-4 rounded-xl bg-spotlight p-6 text-spotlight-fg">
          <p className="text-[13px] tracking-[0.08em] text-spotlight-muted uppercase">{t('summary')}</p>
          <p className="font-display text-[28px] font-medium leading-tight">{answers.length ? t('average', { score: avg.toFixed(1) }) : t('noAnswers')}</p>
          <p className="text-spotlight-muted">{avg >= 4 ? t('summaryGood') : t('summaryWork')}</p>
          <Link href={backHref} className="inline-flex min-h-[46px] items-center self-start rounded-md bg-spotlight-fg px-5 font-semibold text-[#12172B]">{t('backToInterviews')}</Link>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-xl bg-spotlight p-6 text-spotlight-fg">
            <p className="text-[13px] tracking-[0.08em] text-spotlight-muted uppercase">{t('questionN', { n: current + 1, total: questions.length })} · {t(`kind.${questions[current].kind}`)}</p>
            <p className="font-display text-[clamp(20px,2.2vw,24px)] font-medium leading-snug">{questions[current].text}</p>
          </section>

          {currentFeedback ? (
            <>
              <FeedbackCard feedback={currentFeedback} title={t('feedbackTitle')} />
              <button type="button" onClick={next} className="min-h-[50px] rounded-[14px] bg-accent font-semibold text-accent-fg">
                {current + 1 < questions.length ? t('nextQuestion') : t('finish')}
              </button>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
                {t('yourAnswer')}
                <textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} className="w-full rounded-md border border-line-strong bg-surface-1 px-4 py-3 font-normal text-ink" />
                <span className="text-[13px] font-normal text-ink-muted">{t('answerHint')}</span>
              </label>
              {error && <p role="alert" className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">{error}</p>}
              <div className="flex gap-2.5">
                <button type="button" onClick={submit} disabled={pending || draft.trim().length < 20} className="min-h-[50px] flex-[2] rounded-[14px] bg-accent font-semibold text-accent-fg disabled:opacity-60">
                  {pending ? t('evaluating') : t('evaluate')}
                </button>
                <button type="button" onClick={next} disabled={pending} className="min-h-[50px] flex-1 rounded-[14px] border border-line-strong bg-surface-1 font-semibold">{t('skip')}</button>
              </div>
            </>
          )}
        </>
      )}

      {done && answers.length > 0 && (
        <section className="flex flex-col gap-3">
          {[...answers].sort((a, b) => a.index - b.index).map((a) => (
            <div key={a.index} className="flex flex-col gap-2">
              <p className="font-semibold">{t('questionN', { n: a.index + 1, total: questions.length })} : {questions[a.index].text}</p>
              <FeedbackCard feedback={a.feedback} title={t('feedbackTitle')} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
