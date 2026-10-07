import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/login-form';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-6 px-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/tremio-logo.svg" alt="Tremio" className="h-10 w-auto self-start" />
      <LoginForm locale={locale} />
    </main>
  );
}
