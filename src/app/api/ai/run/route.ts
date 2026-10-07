import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { AiUnavailableError, streamWithFallback } from '@/lib/ai/gateway';
import { TemplateSchema, renderPrompt, resolveVariables, systemPrompt } from '@/lib/prompts/render';
import { PageFetchError, fetchPageText, looksLikeUrl } from '@/lib/web/fetch-page';

export const maxDuration = 60;

const Body = z.object({
  templateId: z.string(),
  jobId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  inputs: z.record(z.string(), z.string().max(20000)).default({}),
  // Offre collée par l'utilisateur quand elle n'est pas encore enregistrée
  job: z.object({ title: z.string().max(300), company: z.string().max(300).optional(), description: z.string().max(30000) }).optional(),
  outputLocale: z.enum(['fr', 'en'])
});

/**
 * Exécute une action IA (un modèle de prompt) pour l'utilisateur connecté.
 * Réponses : 200 flux de texte | 401 non connecté | 422 variables manquantes | 429 quota atteint.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  const { templateId, jobId, applicationId, inputs, outputLocale, job: pastedJob } = parsed.data;

  // Quota quotidien (contrôle des coûts).
  const limit = Number(process.env.AI_DAILY_LIMIT ?? 60);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase.from('ai_runs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  if ((count ?? 0) >= limit) return Response.json({ error: 'daily_limit' }, { status: 429 });

  const [{ data: tpl }, { data: profile }, { data: resume }, job] = await Promise.all([
    supabase.from('prompt_templates').select('*').eq('id', templateId).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('resumes').select('title, raw_text, parsed').eq('user_id', user.id).eq('is_primary', true).maybeSingle(),
    jobId ? supabase.from('jobs').select('*').eq('id', jobId).single().then((r) => r.data) : Promise.resolve(null)
  ]);

  // Offre enregistrée dans une candidature (la RLS garantit qu'elle appartient à l'utilisateur).
  let applicationJob: { title: string; company: string | null; description: string | null; location: string | null } | null = null;
  if (applicationId) {
    const { data: app } = await supabase.from('applications').select('title, company, job_description, location').eq('id', applicationId).single();
    if (!app) return Response.json({ error: 'application_not_found' }, { status: 404 });
    applicationJob = { title: app.title, company: app.company, description: app.job_description, location: app.location };
  }
  if (!tpl) return Response.json({ error: 'template_not_found' }, { status: 404 });

  const template = TemplateSchema.parse(tpl);

  // Un champ « document externe » qui ne contient qu'une URL : on récupère le texte de la page.
  for (const v of template.variables) {
    const value = inputs[v.key];
    if (v.source === 'input' && v.untrusted && value && looksLikeUrl(value)) {
      try {
        inputs[v.key] = await fetchPageText(value);
      } catch (error) {
        const reason = error instanceof PageFetchError ? error.message : 'page inaccessible';
        return Response.json({ error: 'page_fetch_failed', url: value, reason }, { status: 422 });
      }
    }
  }
  const { values, missing } = resolveVariables(template, { profile, resume, job: applicationJob ?? job ?? pastedJob ?? null, input: inputs });
  if (missing.length) return Response.json({ error: 'missing_variables', missing }, { status: 422 });

  try {
    const stream = await streamWithFallback({
      tier: template.tier,
      system: systemPrompt(outputLocale),
      prompt: renderPrompt(template, outputLocale, values),
      onFinish: async ({ modelId, inputTokens, outputTokens }) => {
        const { error } = await supabase.from('ai_runs').insert({
          user_id: user.id,
          template_id: template.id,
          job_id: jobId ?? null,
          model: modelId,
          input_tokens: inputTokens ?? null,
          output_tokens: outputTokens ?? null
        });
        if (error) console.error('[ai] journal ai_runs', error.message);
      }
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // Le détail technique n'est renvoyé qu'en développement.
    return Response.json(
      { error: 'ai_unavailable', detail: process.env.NODE_ENV === 'production' ? undefined : detail },
      { status: 502 }
    );
  }
}
