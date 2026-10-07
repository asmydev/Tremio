import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { ResumeDocSchema, type ResumeDoc } from './schema';

/** Charge un CV adapté de l'utilisateur connecté (la RLS limite aux siens) et construit le nom de fichier. */
export async function loadResumeDocument(id: string): Promise<
  { ok: true; doc: ResumeDoc; locale: 'fr' | 'en'; basename: string } | { ok: false; status: number }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  const { data } = await supabase
    .from('documents')
    .select('content, locale, applications(title, company)')
    .eq('id', id)
    .eq('kind', 'resume_pdf')
    .maybeSingle();
  if (!data) return { ok: false, status: 404 };

  let doc: ResumeDoc;
  try {
    doc = ResumeDocSchema.parse(JSON.parse(data.content));
  } catch {
    return { ok: false, status: 422 };
  }
  const app = (Array.isArray(data.applications) ? data.applications[0] : data.applications) as { title?: string; company?: string | null } | null;
  const slug = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  const basename = ['CV', slug(doc.full_name), slug(app?.company ?? app?.title ?? '')].filter(Boolean).join('_');
  return { ok: true, doc, locale: data.locale === 'en' ? 'en' : 'fr', basename };
}
