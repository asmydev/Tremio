'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { STATUSES, documentKind } from '@/lib/applications';

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const text = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const ApplicationInput = z.object({
  title: z.string().trim().min(1).max(300),
  company: text(300),
  location: text(200),
  job_url: z.union([z.literal(''), z.string().trim().url().max(1000)]).transform((v) => v || null),
  job_description: text(30000),
  lang: z.enum(['fr', 'en', '']).transform((v) => (v === '' ? null : v))
});

function read(formData: FormData) {
  return ApplicationInput.safeParse({
    title: formData.get('title') ?? '',
    company: formData.get('company') ?? '',
    location: formData.get('location') ?? '',
    job_url: formData.get('job_url') ?? '',
    job_description: formData.get('job_description') ?? '',
    lang: formData.get('lang') ?? ''
  });
}

export async function createApplication(formData: FormData): Promise<Result<{ id: string }>> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: 'unauthorized' };
  const parsed = read(formData);
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const { data, error } = await supabase
    .from('applications')
    .insert({ ...parsed.data, user_id: user.id, status: 'to_apply', position: Date.now() })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[applications] création', error?.message);
    return { ok: false, error: 'save_failed' };
  }
  revalidatePath('/[locale]', 'layout');
  return { ok: true, data: { id: data.id } };
}

export async function updateApplication(id: string, formData: FormData): Promise<Result> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: 'unauthorized' };
  const parsed = read(formData);
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const interview = String(formData.get('interview_at') ?? '');
  const { error } = await supabase
    .from('applications')
    .update({
      ...parsed.data,
      notes: String(formData.get('notes') ?? '').slice(0, 10000) || null,
      interview_at: interview && !Number.isNaN(Date.parse(interview)) ? new Date(interview).toISOString() : null
    })
    .eq('id', id);
  if (error) {
    console.error('[applications] mise à jour', error.message);
    return { ok: false, error: 'save_failed' };
  }
  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}

export async function moveApplication(id: string, status: string): Promise<Result> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: 'unauthorized' };
  if (!STATUSES.includes(status as never)) return { ok: false, error: 'invalid' };
  const { error } = await supabase.from('applications').update({ status, position: Date.now() }).eq('id', id);
  if (error) {
    console.error('[applications] déplacement', error.message);
    return { ok: false, error: 'save_failed' };
  }
  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}

export async function deleteApplication(id: string): Promise<Result> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: 'unauthorized' };
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) return { ok: false, error: 'save_failed' };
  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}

export async function saveDocument(input: { applicationId: string; templateId: string; locale: 'fr' | 'en'; content: string }): Promise<Result> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: 'unauthorized' };
  if (!input.content.trim()) return { ok: false, error: 'invalid' };
  const { error } = await supabase.from('documents').insert({
    user_id: user.id,
    application_id: input.applicationId,
    template_id: input.templateId,
    kind: documentKind(input.templateId),
    locale: input.locale,
    content: input.content.slice(0, 50000)
  });
  if (error) return { ok: false, error: 'save_failed' };
  revalidatePath('/[locale]/applications/[id]', 'page');
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<Result> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: 'unauthorized' };
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) return { ok: false, error: 'save_failed' };
  revalidatePath('/[locale]/applications/[id]', 'page');
  return { ok: true };
}
