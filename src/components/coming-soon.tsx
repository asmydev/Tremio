import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Sidebar } from './sidebar';

export async function ComingSoon({ active, titleKey }: { active: 'jobs' | 'applications' | 'interviews'; titleKey: 'jobs' | 'applications' | 'interviews' }) {
  const nav = await getTranslations('nav');
  const t = await getTranslations('soon');
  return (
    <>
      <Sidebar active={active} />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-[clamp(20px,4vw,56px)] py-9">
        <h1 className="font-display text-[clamp(27px,3vw,40px)] font-bold tracking-[-0.03em]">{nav(titleKey)}</h1>
        <section className="flex max-w-[560px] flex-col gap-3 rounded-xl border border-dashed border-line-strong bg-surface-1 p-6">
          <h2 className="font-display text-xl font-medium">{t('title')}</h2>
          <p className="text-ink-muted">{titleKey === 'jobs' ? t('jobsBody') : t('body')}</p>
          <Link href={titleKey === 'jobs' ? '/applications' : '/atelier'} className="inline-flex min-h-11 items-center self-start rounded-md bg-accent px-5 font-semibold text-accent-fg">{titleKey === 'jobs' ? t('jobsCta') : t('cta')}</Link>
        </section>
      </main>
    </>
  );
}
