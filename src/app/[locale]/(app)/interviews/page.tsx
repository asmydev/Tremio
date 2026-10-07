import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { StartPractice } from '@/components/interviews/start-practice';
import type { Answer } from '@/lib/interviews';

export default async function InterviewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('interviews');
  const format = await getFormatter();
  const supabase = await createClient();

  const [{ data: apps }, { data: sessions }] = await Promise.all([
    supabase.from('applications').select('id, title, company, lang, interview_at').eq('status', 'interview'),
    supabase.from('interview_sessions').select('id, application_id, questions, answers, created_at').order('created_at', { ascending: false }).limit(20)
  ]);

  const now = Date.now();
  const time = (d: string | null) => (d ? new Date(d).getTime() : Infinity);
  const upcoming = (apps ?? []).sort((a, b) => {
    const pa = time(a.interview_at) < now ? Infinity - 1 : time(a.interview_at);
    const pb = time(b.interview_at) < now ? Infinity - 1 : time(b.interview_at);
    return pa - pb;
  });
  const appTitle = new Map((apps ?? []).map((a) => [a.id, [a.title, a.company].filter(Boolean).join(' · ')]));
  const average = (answers: Answer[]) => (answers.length ? (answers.reduce((s, a) => s + a.feedback.score, 0) / answers.length).toFixed(1) : null);

  return (
    <>
      <Sidebar active="interviews" />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-7 px-[clamp(20px,4vw,56px)] py-9">
        <header className="max-w-[680px]">
          <h1 className="font-display text-[clamp(27px,3vw,40px)] font-bold tracking-[-0.03em]">{t('title')}</h1>
          <p className="mt-1.5 text-ink-muted">{t('intro')}</p>
        </header>

        {upcoming.length === 0 ? (
          <section className="flex max-w-[600px] flex-col gap-3 rounded-xl border border-dashed border-line-strong bg-surface-1 p-6">
            <h2 className="font-display text-xl font-medium">{t('emptyTitle')}</h2>
            <p className="text-ink-muted">{t('emptyBody')}</p>
            <Link href="/applications" className="inline-flex min-h-11 items-center self-start rounded-md bg-accent px-5 font-semibold text-accent-fg">{t('goApplications')}</Link>
          </section>
        ) : (
          <section aria-labelledby="upcoming" className="flex flex-col gap-3">
            <h2 id="upcoming" className="font-display text-2xl font-medium">{t('upcoming')}</h2>
            <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
              {upcoming.map((app) => {
                const past = app.interview_at && time(app.interview_at) < now;
                return (
                  <li key={app.id} className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1 p-5">
                    <div>
                      <p className={`text-[13px] font-semibold ${app.interview_at && !past ? 'text-accent-strong' : 'text-ink-muted'}`}>
                        {app.interview_at ? format.dateTime(new Date(app.interview_at), { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) : t('noDate')}
                        {past ? ` · ${t('past')}` : ''}
                      </p>
                      <Link href={`/applications/${app.id}`} className="mt-1 block">
                        <span lang={app.lang ?? undefined} className="block text-[17px] font-semibold leading-snug">{app.title}</span>
                        {app.company && <span className="text-sm text-ink-muted">{app.company}</span>}
                      </Link>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                      <StartPractice applicationId={app.id} docLocale={app.lang === 'en' ? 'en' : app.lang === 'fr' ? 'fr' : undefined} />
                      <Link href={`/applications/${app.id}?action=interview-star`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong px-4 font-semibold">
                        {t('prepareStar')}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {(sessions?.length ?? 0) > 0 && (
          <section aria-labelledby="history" className="flex flex-col gap-3">
            <h2 id="history" className="font-display text-2xl font-medium">{t('history')}</h2>
            <ul className="flex flex-col gap-2.5">
              {sessions!.map((s) => {
                const answers = s.answers as Answer[];
                const avg = average(answers);
                return (
                  <li key={s.id}>
                    <Link href={`/interviews/${s.id}`} className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-1 px-5 py-3.5">
                      <span className={`flex size-12 flex-none items-center justify-center rounded-full border-4 font-display font-bold ${avg && Number(avg) >= 4 ? 'border-accent' : 'border-signal'}`}>{avg ?? '–'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{appTitle.get(s.application_id) ?? t('archived')}</span>
                        <span className="text-[13px] text-ink-muted">{format.dateTime(new Date(s.created_at), { dateStyle: 'medium', timeStyle: 'short' })} · {t('answered', { done: answers.length, total: (s.questions as unknown[]).length })}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
