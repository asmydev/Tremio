import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { ResumeUpload } from '@/components/profile/resume-upload';
import { ProfileForm } from '@/components/profile/profile-form';

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('profile');
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: resume }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('resumes').select('title, created_at, raw_text').eq('user_id', user!.id).eq('is_primary', true).maybeSingle()
  ]);

  const fields = [profile?.headline, profile?.identity_statement, profile?.target_roles?.length, profile?.skills?.length, resume];
  const completion = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  return (
    <>
      <Sidebar active="profile" />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-[clamp(20px,4vw,56px)] py-9">
        <header className="max-w-[640px]">
          <h1 className="font-display text-[clamp(27px,3vw,40px)] font-bold tracking-[-0.03em]">{t('title')}</h1>
          <p className="mt-1.5 text-ink-muted">{t('intro')}</p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-xl bg-spotlight p-5 text-spotlight-fg">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-spotlight-muted">{t('completion')}</span>
                <span className="font-display text-[26px] font-bold">{completion} %</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} aria-label={t('completion')}>
                <div className="h-full rounded-full bg-spotlight-fg" style={{ width: `${completion}%` }} />
              </div>
              <p className="text-sm text-spotlight-muted">{completion < 100 ? t('completionHint') : t('completionDone')}</p>
            </section>

            <ResumeUpload
              current={resume ? { title: resume.title, date: format.dateTime(new Date(resume.created_at), { dateStyle: 'medium' }), chars: resume.raw_text?.length ?? 0 } : null}
            />
          </div>

          <ProfileForm
            hasResume={Boolean(resume)}
            initial={{
              full_name: profile?.full_name ?? '',
              headline: profile?.headline ?? '',
              identity_statement: profile?.identity_statement ?? '',
              target_roles: (profile?.target_roles ?? []).join(', '),
              skills: (profile?.skills ?? []).join(', '),
              locations: (profile?.locations ?? []).join(', '),
              doc_locale: profile?.doc_locale === 'en' ? 'en' : 'fr',
              phone: profile?.phone ?? '',
              contact_email: profile?.contact_email ?? '',
              linkedin_url: profile?.linkedin_url ?? '',
              github_url: profile?.github_url ?? '',
              website_url: profile?.website_url ?? '',
              work_status: profile?.work_status ?? '',
              grammatical_gender: (['feminine', 'masculine', 'neutral'].includes(profile?.grammatical_gender) ? profile?.grammatical_gender : '') as '' | 'feminine' | 'masculine' | 'neutral'
            }}
          />
        </div>
      </main>
    </>
  );
}
