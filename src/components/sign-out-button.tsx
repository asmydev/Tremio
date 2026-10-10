'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

/** Ferme la session Supabase puis renvoie vers la page de connexion. */
export function SignOutButton() {
  const t = useTranslations('nav');
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3.5 font-medium text-ink-2 hover:bg-signal-soft hover:text-signal-strong disabled:opacity-60"
    >
      <LogOut size={18} aria-hidden="true" className="flex-none" />
      {t('signOut')}
    </button>
  );
}
