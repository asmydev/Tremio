'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LanguageSwitch() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div role="group" aria-label={t('language')} className="flex rounded-md border border-line bg-surface-0 p-[3px]">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          onClick={() => router.replace(pathname, { locale: l })}
          className={`min-h-[38px] flex-1 rounded-sm text-sm uppercase ${l === locale ? 'bg-surface-1 font-semibold text-ink' : 'font-medium text-ink-muted'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
