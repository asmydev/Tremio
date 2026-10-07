import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { ActionRunner } from '@/components/action-runner';
import { TemplateSchema } from '@/lib/prompts/render';

export default async function Atelier({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('studio');
  const supabase = await createClient();
  const { data } = await supabase.from('prompt_templates').select('*').order('sort_order');
  const templates = (data ?? []).map((row) => TemplateSchema.parse(row));

  return (
    <>
      <Sidebar active="studio" />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-[clamp(20px,4vw,56px)] py-9">
        <header className="max-w-[640px]">
          <h1 className="font-display text-[clamp(27px,3vw,40px)] font-bold tracking-[-0.03em]">{t('title')}</h1>
          <p className="mt-1.5 text-ink-muted">{t('intro')}</p>
        </header>
        <ActionRunner templates={templates} defaultDocLocale={locale === 'en' ? 'en' : 'fr'} />
      </main>
    </>
  );
}
