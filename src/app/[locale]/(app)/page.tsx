import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';

const STATUSES = ['to_apply', 'sent', 'interview', 'offer'] as const;

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard');
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: resume }, { data: apps }, { data: matches }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('resumes').select('id').eq('user_id', user!.id).eq('is_primary', true).maybeSingle(),
    supabase.from('applications').select('id, status, company, interview_at'),
    supabase.from('match_scores').select('score, reasons, jobs(id, title, company, location, lang)').order('score', { ascending: false }).limit(5)
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, apps?.filter((a) => a.status === s).length ?? 0]));
  const firstName = profile?.full_name?.split(' ')[0];
  const now = Date.now();
  const interview = apps
    ?.filter((a) => a.status === 'interview' && a.interview_at && new Date(a.interview_at).getTime() > now)
    .sort((a, b) => new Date(a.interview_at!).getTime() - new Date(b.interview_at!).getTime())[0];
  const spotlight = interview
    ? { text: t('interviewSoon', { date: format.dateTime(new Date(interview.interview_at!), { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }), company: interview.company ?? '—' }), href: `/applications/${interview.id}?action=interview-star`, cta: t('prepareInterview') }
    : resume
      ? { text: t('nextTailor'), href: '/applications', cta: t('openStudio') }
      : { text: t('emptyRecommendation'), href: '/profile', cta: t('importResume') };

  return (
    <>
      <Sidebar active="dashboard" />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-7 px-[clamp(20px,4vw,56px)] py-9">
        <h1 className="font-display text-[clamp(27px,3vw,40px)] font-bold leading-tight tracking-[-0.03em]">
          {firstName ? t('greeting', { name: firstName }) : t('greetingAnon')}
        </h1>

        <section className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          <div className="flex min-w-0 flex-col gap-4 rounded-xl bg-spotlight p-7 text-spotlight-fg md:col-span-2">
            <p className="text-[13px] tracking-[0.08em] text-spotlight-muted uppercase">{t('recommended')}</p>
            <p className="max-w-[620px] font-display text-[clamp(22px,2.4vw,28px)] font-medium leading-tight tracking-[-0.02em]">
              {spotlight.text}
            </p>
            <Link href={spotlight.href} className="inline-flex min-h-[46px] items-center self-start rounded-md bg-spotlight-fg px-5 font-semibold text-[#12172B]">
              {spotlight.cta}
            </Link>
          </div>

          <div className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-line bg-surface-1 p-6">
            <h2 className="font-display text-xl font-medium"><Link href="/applications" className="hover:underline">{t('applications')}</Link></h2>
            <dl className="grid grid-cols-2 gap-2.5">
              {STATUSES.map((s) => {
                const tone = s === 'interview' ? 'bg-accent-soft text-accent-strong' : s === 'offer' ? 'bg-signal-soft text-signal-strong' : 'bg-surface-0 text-ink-muted';
                return (
                  <div key={s} className={`flex flex-col-reverse rounded-md px-3.5 py-3 ${tone}`}>
                    <dt className="text-[13px]">{t(`status.${s}`)}</dt>
                    <dd className="font-display text-[28px] font-bold">{counts[s]}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>

        <section aria-labelledby="matches" className="flex flex-col gap-3.5">
          <h2 id="matches" className="font-display text-2xl font-medium">{t('matches')}</h2>
          {!matches?.length ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-surface-1 p-5 text-ink-muted">{t('noMatches')}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {matches.map((m) => {
                const job = Array.isArray(m.jobs) ? m.jobs[0] : m.jobs;
                if (!job) return null;
                return (
                  <li key={job.id}>
                    <Link href="/jobs" className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-1 px-5 py-4">
                      <span className={`flex size-14 flex-none items-center justify-center rounded-full border-4 font-display font-bold ${m.score >= 80 ? 'border-accent' : 'border-signal'}`}>{m.score}</span>
                      <span className="min-w-0 flex-[1_1_260px]">
                        <span lang={job.lang ?? undefined} className="block text-[17px] font-semibold">{job.title}</span>
                        <span className="text-sm text-ink-muted">{[job.company, job.location].filter(Boolean).join(' · ')}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
