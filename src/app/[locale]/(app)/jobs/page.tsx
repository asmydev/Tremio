import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { JobSearch } from '@/components/jobs/job-search';
import { JobCard, type JobItem } from '@/components/jobs/job-card';

interface Row {
  score: number;
  reasons: { kind: 'strength' | 'gap'; text: string }[];
  computed_at: string;
  jobs: { id: string; title: string; company: string | null; location: string | null; lang: string | null; url: string | null; posted_at: string | null; salary_min: number | null; salary_max: number | null } | null;
}

export default async function JobsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('jobs');
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: rows }, { data: apps }] = await Promise.all([
    supabase.from('profiles').select('target_roles, locations').eq('id', user!.id).single(),
    supabase.from('match_scores')
      .select('score, reasons, computed_at, jobs(id, title, company, location, lang, url, posted_at, salary_min, salary_max)')
      .order('computed_at', { ascending: false })
      .order('score', { ascending: false })
      .limit(40),
    supabase.from('applications').select('id, job_id').not('job_id', 'is', null)
  ]);

  const applied = new Map((apps ?? []).map((a) => [a.job_id as string, a.id as string]));
  const money = (n: number) => format.number(n, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  const now = Date.now();
  const jobs: JobItem[] = ((rows ?? []) as unknown as Row[])
    .filter((r) => r.jobs)
    .map((r) => {
      const j = r.jobs!;
      const salary = j.salary_min && j.salary_max && j.salary_min !== j.salary_max ? `${money(j.salary_min)} – ${money(j.salary_max)}` : j.salary_min ? money(j.salary_min) : null;
      return {
        id: j.id, title: j.title, company: j.company, location: j.location, lang: j.lang, url: j.url, salary,
        posted: j.posted_at ? format.relativeTime(new Date(j.posted_at), now) : null,
        score: r.score, reasons: r.reasons ?? [], applicationId: applied.get(j.id) ?? null
      };
    });

  return (
    <>
      <Sidebar active="jobs" />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-[clamp(20px,4vw,56px)] py-9">
        <header className="max-w-[680px]">
          <h1 className="font-display text-[clamp(27px,3vw,40px)] font-bold tracking-[-0.03em]">{t('title')}</h1>
          <p className="mt-1.5 text-ink-muted">{t('intro')}</p>
        </header>

        <JobSearch defaultWhat={profile?.target_roles?.[0] ?? ''} defaultWhere={profile?.locations?.[0] ?? (locale === 'fr' ? 'Québec' : 'Quebec City')} />

        {jobs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface-1 p-5 text-ink-muted">{t('empty')}</p>
        ) : (
          <section aria-labelledby="results" className="flex flex-col gap-3">
            <h2 id="results" className="font-display text-2xl font-medium">{t('results')}</h2>
            <p className="text-sm text-ink-muted">{t('snippetNote')}</p>
            <div className="flex flex-col gap-3">
              {jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </section>
        )}

        <p className="text-[13px] text-ink-muted">
          <a href="https://www.adzuna.ca" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink-2 underline underline-offset-2">Jobs by Adzuna</a>
        </p>
      </main>
    </>
  );
}
