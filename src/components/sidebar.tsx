import { getTranslations } from 'next-intl/server';
import { BriefcaseBusiness, FileUser, LayoutDashboard, MessagesSquare, Sparkles, SquareKanban } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LanguageSwitch } from './language-switch';
import { SignOutButton } from './sign-out-button';

const items = [
  { href: '/', key: 'dashboard', icon: LayoutDashboard },
  { href: '/jobs', key: 'jobs', icon: BriefcaseBusiness },
  { href: '/applications', key: 'applications', icon: SquareKanban },
  { href: '/atelier', key: 'studio', icon: Sparkles },
  { href: '/interviews', key: 'interviews', icon: MessagesSquare },
  { href: '/profile', key: 'profile', icon: FileUser }
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
        {items.map(({ href, key, icon: Icon }) => {
          const current = key === active;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3.5 ${current ? 'bg-accent-soft font-semibold text-accent-strong' : 'font-medium text-ink-2 hover:bg-surface-0'}`}
              >
                <Icon size={18} aria-hidden="true" className="flex-none" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex flex-col gap-3">
        <LanguageSwitch />
        <SignOutButton />
      </div>
    </nav>
  );
}
