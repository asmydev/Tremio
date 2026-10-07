import 'server-only';
import type { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Charge un document généré (CV ou lettre) de l'utilisateur connecté — la RLS limite aux siens —
 * et construit un nom de fichier lisible : <Préfixe>_<Nom>_<Entreprise>.
 */
export async function loadGeneratedDocument<T extends { full_name: string }>(id: string, kind: string, schema: z.ZodType<T>, prefix: string): Promise<
  { ok: true; doc: T; locale: 'fr' | 'en'; basename: string } | { ok: false; status: number }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  const { data } = await supabase.from('documents').select('content, locale, applications(title, company)').eq('id', id).eq('kind', kind).maybeSingle();
  if (!data) return { ok: false, status: 404 };

  let doc: T;
  try {
    doc = schema.parse(JSON.parse(data.content));
  } catch {
    return { ok: false, status: 422 };
  }
  const app = (Array.isArray(data.applications) ? data.applications[0] : data.applications) as { title?: string; company?: string | null } | null;
  const slug = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  const basename = [prefix, slug(doc.full_name), slug(app?.company ?? app?.title ?? '')].filter(Boolean).join('_');
  return { ok: true, doc, locale: data.locale === 'en' ? 'en' : 'fr', basename };
}

export function fileResponse(body: Buffer, filename: string, type: string) {
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' }
  });
}

export const PDF = 'application/pdf';
export const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
