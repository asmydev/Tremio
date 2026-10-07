import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LanguageSwitch } from './language-switch';

const items = [
  { href: '/', key: 'dashboard' },
  { href: '/jobs', key: 'jobs' },
  { href: '/applications', key: 'applications' },
  { href: '/atelier', key: 'studio' },
  { href: '/interviews', key: 'interviews' },
  { href: '/profile', key: 'profile' }
] as const;

export async function Sidebar({ active }: { active: (typeof items)[number]['key'] }) {
  const t = await getTranslations('nav');
  return (
    <nav aria-label={t('main')} className="flex flex-[1_1_220px] flex-col gap-7 border-line bg-surface-1 px-5 py-7 md:max-w-[260px] md:border-r">
      <Link href="/" className="self-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/tremio-logo.svg" alt="Tremio" className="h-9 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/tremio-logo-dark.svg" alt="Tremio" className="hidden h-9 w-auto dark:block" />
      </Link>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const current = item.key === active;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-[10px] px-3.5 ${current ? 'bg-accent-soft font-semibold text-accent-strong' : 'font-medium text-ink-2 hover:bg-surface-0'}`}
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto">
        <LanguageSwitch />
      </div>
    </nav>
  );
}
