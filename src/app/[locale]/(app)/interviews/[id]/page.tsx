import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { Practice } from '@/components/interviews/practice';
import type { Session } from '@/lib/interviews';

export default async function PracticePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('interviews');
  const supabase = await createClient();
  const { data } = await supabase.from('interview_sessions').select('id, application_id, locale, questions, answers, created_at').eq('id', id).maybeSingle();
  if (!data) notFound();
  const session = data as Session;
  const { data: app } = await supabase.from('applications').select('title, company').eq('id', session.application_id).maybeSingle();

  return (
    <>
      <Sidebar active="interviews" />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-[clamp(20px,4vw,56px)] py-9">
        <header className="flex flex-col gap-2">
          <Link href="/interviews" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-ink-2">
            <ArrowLeft size={18} aria-hidden="true" />{t('backToInterviews')}
          </Link>
          <h1 className="font-display text-[clamp(26px,3vw,36px)] font-bold tracking-[-0.02em]">{t('practiceTitle')}</h1>
          {app && <p className="text-ink-muted">{[app.title, app.company].filter(Boolean).join(' · ')}</p>}
        </header>
        <Practice sessionId={session.id} questions={session.questions} initialAnswers={session.answers} backHref="/interviews" />
      </main>
    </>
  );
}
