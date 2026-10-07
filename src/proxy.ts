import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intl = createIntlMiddleware(routing);

// Pages accessibles sans être connecté (après le préfixe de langue).
const PUBLIC_PATHS = ['/login'];

export default async function proxy(request: NextRequest) {
  // 1. Langue : redirige / vers /fr ou /en selon le navigateur.
  const response = intl(request);

  // 2. Session Supabase : rafraîchit les cookies sur la réponse.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Protection des pages de l'app.
  const [, locale = routing.defaultLocale, ...rest] = request.nextUrl.pathname.split('/');
  const path = '/' + rest.join('/');
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  if (!user && !isPublic && routing.locales.includes(locale as never)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Tout sauf l'API, les fichiers internes de Next et les fichiers statiques.
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
