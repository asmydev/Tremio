import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { Board } from '@/components/applications/board';
import { NewApplication } from '@/components/applications/new-application';
import type { Application } from '@/lib/applications';

export default async function ApplicationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('applications');
  const supabase = await createClient();
  const { data } = await supabase
    .from('applications')
    .select('id, title, company, status, position, location, lang, job_url, job_description, interview_at, notes, created_at, updated_at')
    .order('position', { ascending: false });
  const applications = (data ?? []) as Application[];

  return (
    <>
      <Sidebar active="applications" />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-[clamp(20px,4vw,56px)] py-9">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[clamp(27px,3vw,40px)] font-bold tracking-[-0.03em]">{t('title')}</h1>
            <p className="mt-1.5 text-ink-muted">{applications.length ? t('intro') : t('introEmpty')}</p>
          </div>
          <NewApplication />
        </header>
        <Board applications={applications} now={Date.now()} />
      </main>
    </>
  );
}
