import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { ActionRunner } from '@/components/action-runner';
import { DetailsForm } from '@/components/applications/details-form';
import { DocumentsList, type SavedDocument } from '@/components/applications/documents-list';
import { TemplateSchema } from '@/lib/prompts/render';
import type { Application } from '@/lib/applications';
import { TailoredResume, type ResumeVersion } from '@/components/applications/tailored-resume';
import { ResumeDocSchema } from '@/lib/resume/schema';
import { TailoredLetter, type LetterVersion } from '@/components/applications/tailored-letter';
import { LetterDocSchema } from '@/lib/letter/schema';

export default async function ApplicationPage({ params, searchParams }: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const { locale, id } = await params;
  const { action } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('applications');
  const supabase = await createClient();

  const [{ data: app }, { data: tpls }, { data: docs }, { data: profile }] = await Promise.all([
    supabase.from('applications').select('*').eq('id', id).maybeSingle(),
    supabase.from('prompt_templates').select('*').order('sort_order'),
    supabase.from('documents').select('id, kind, locale, content, created_at, template_id').eq('application_id', id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('doc_locale, grammatical_gender').single()
  ]);
  if (!app) notFound();

  const application = app as Application;
  const templates = (tpls ?? []).map((row) => TemplateSchema.parse(row));
  const titleOf = (templateId: string | null) => templates.find((tpl) => tpl.id === templateId)?.title[locale === 'en' ? 'en' : 'fr'] ?? t('document');
  const documents: SavedDocument[] = (docs ?? []).filter((d) => d.kind !== 'resume_pdf' && d.kind !== 'cover_letter_doc').map((d) => ({ ...d, title: titleOf(d.template_id) }));
  const versions: ResumeVersion[] = (docs ?? [])
    .filter((d) => d.kind === 'resume_pdf')
    .flatMap((d) => {
      try {
        return [{ id: d.id, created_at: d.created_at, locale: d.locale === 'en' ? 'en' as const : 'fr' as const, doc: ResumeDocSchema.parse(JSON.parse(d.content)) }];
      } catch {
        return [];
      }
    });
  const letters: LetterVersion[] = (docs ?? [])
    .filter((d) => d.kind === 'cover_letter_doc')
    .flatMap((d) => {
      try {
        return [{ id: d.id, created_at: d.created_at, locale: d.locale === 'en' ? 'en' as const : 'fr' as const, doc: LetterDocSchema.parse(JSON.parse(d.content)) }];
      } catch {
        return [];
      }
    });
  // Extrait d'offre tronqué (cas des offres Adzuna) : on invite à coller le texte complet.
  const description = application.job_description?.trim() ?? '';
  const truncated = description.length > 0 && (/(…|\.\.\.)$/.test(description) || (description.length < 700 && Boolean(application.job_url)));
  // Langue des documents : celle de l'offre si connue, sinon la préférence du profil.
  const docLocale = (application.lang ?? profile?.doc_locale ?? locale) === 'en' ? 'en' : 'fr';

  return (
    <>
      <Sidebar active="applications" />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-[clamp(20px,4vw,56px)] py-9">
        <header className="flex flex-col gap-2">
          <Link href="/applications" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-ink-2">
            <ArrowLeft size={18} aria-hidden="true" />{t('back')}
          </Link>
          <p className="text-sm text-ink-muted">{[application.company, application.location, t(`status.${application.status}`)].filter(Boolean).join(' · ')}</p>
          <h1 lang={application.lang ?? undefined} className="font-display text-[clamp(26px,3vw,36px)] font-bold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere] hyphens-auto">{application.title}</h1>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <DetailsForm app={application} />
          <div className="flex min-w-0 flex-col gap-6">
            <TailoredResume applicationId={application.id} defaultLocale={docLocale} versions={versions} genderSet={Boolean(profile?.grammatical_gender)} hasDescription={Boolean(application.job_description)} />
            <TailoredLetter applicationId={application.id} defaultLocale={docLocale} versions={letters} hasDescription={Boolean(application.job_description)} />
            <section className="flex flex-col gap-4">
              <h2 className="font-display text-xl font-medium">{t('prepare')}</h2>
              {!application.job_description && <p className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">{t('noDescription')}</p>}
              {truncated && (
                <p className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal-strong">
                  {t('truncated')}{' '}
                  {application.job_url && <a href={application.job_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">{t('openPosting')}</a>}
                </p>
              )}
              <ActionRunner templates={templates.filter((tpl) => tpl.id !== 'cover-letter')} defaultDocLocale={docLocale} applicationId={application.id} initialTemplateId={action} />
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-medium">{t('documents')}</h2>
              <DocumentsList documents={documents} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
