import 'server-only';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createProviderRegistry, generateText, Output, streamText } from 'ai';
import type { z } from 'zod';

/**
 * Passerelle multi-fournisseurs.
 * - Routage par type de tâche (fast / smart / research), configuré par variables d'environnement.
 * - Seuls les fournisseurs dont la clé est présente sont utilisés.
 * - Repli automatique sur le modèle suivant si un appel échoue (generate).
 */
export type Tier = 'fast' | 'smart' | 'research';

// OpenRouter : une seule clé pour de nombreux modèles (GPT, Llama, Mistral…), API compatible OpenAI.
const openrouter = createOpenAICompatible({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  supportsStructuredOutputs: true,
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    'X-Title': 'Tremio'
  }
});

const registry = createProviderRegistry({ anthropic, openai, google, openrouter });

const PROVIDER_KEYS: Record<string, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY
};

const TIER_ENV: Record<Tier, string | undefined> = {
  fast: process.env.AI_MODELS_FAST,
  smart: process.env.AI_MODELS_SMART,
  research: process.env.AI_MODELS_RESEARCH
};

type ModelId = `${'anthropic' | 'openai' | 'google' | 'openrouter'}:${string}`;

/** Modèles candidats pour un niveau, dans l'ordre de repli, limités aux fournisseurs configurés. */
export function candidates(tier: Tier): ModelId[] {
  const list = (TIER_ENV[tier] ?? TIER_ENV.smart ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as ModelId[];
  const usable = list.filter((id) => Boolean(PROVIDER_KEYS[id.split(':')[0]]));
  if (usable.length === 0) {
    throw new Error(`Aucun modèle utilisable pour le niveau "${tier}". Vérifiez AI_MODELS_* et les clés API.`);
  }
  return usable;
}

interface RunArgs {
  tier: Tier;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  onFinish?: (info: { modelId: string; inputTokens?: number; outputTokens?: number }) => void | Promise<void>;
}

export class AiUnavailableError extends Error {
  constructor(public readonly attempts: { modelId: string; message: string }[]) {
    super(attempts.map((a) => `${a.modelId} : ${a.message}`).join(' | '));
  }
}

function describe(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { statusCode?: number; message?: string; responseBody?: string };
    return [e.statusCode, e.message, e.responseBody?.slice(0, 300)].filter(Boolean).join(' — ');
  }
  return String(error);
}

/**
 * Génération en flux avec repli : on attend le premier morceau de texte de chaque modèle.
 * Si un modèle échoue avant d'avoir écrit quoi que ce soit, on passe au suivant.
 * Si tous échouent, AiUnavailableError est levée (la route renvoie alors une erreur claire).
 */
export async function streamWithFallback({ tier, system, prompt, maxOutputTokens = 2000, onFinish }: RunArgs): Promise<ReadableStream<Uint8Array>> {
  const attempts: { modelId: string; message: string }[] = [];
  const encoder = new TextEncoder();

  for (const modelId of candidates(tier)) {
    const result = streamText({ model: registry.languageModel(modelId), system, prompt, maxOutputTokens });
    const parts = result.stream[Symbol.asyncIterator]();
    let first: string | undefined;
    try {
      for (;;) {
        const { value, done } = await parts.next();
        if (done) throw new Error('réponse vide');
        if (value.type === 'error') throw value.error;
        if (value.type === 'text-delta' && value.text) { first = value.text; break; }
      }
    } catch (error) {
      const message = describe(error);
      console.error(`[ai] ${modelId} a échoué : ${message}`);
      attempts.push({ modelId, message });
      continue;
    }

    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(first));
      },
      // pull doit toujours ajouter un morceau ou fermer le flux : sinon la lecture reste bloquée.
      // On boucle donc sur les événements sans texte (début/fin d'étape, fin de texte…).
      async pull(controller) {
        try {
          for (;;) {
            const { value, done } = await parts.next();
            if (done) return controller.close();
            if (value.type === 'text-delta') {
              if (value.text) return controller.enqueue(encoder.encode(value.text));
            } else if (value.type === 'finish') {
              await onFinish?.({ modelId, inputTokens: value.totalUsage.inputTokens, outputTokens: value.totalUsage.outputTokens });
            } else if (value.type === 'error') {
              console.error(`[ai] ${modelId} interrompu : ${describe(value.error)}`);
              controller.enqueue(encoder.encode('\n\n[…]'));
              return controller.close();
            }
          }
        } catch (error) {
          console.error(`[ai] ${modelId} interrompu : ${describe(error)}`);
          controller.close();
        }
      },
      cancel() {
        // L'utilisateur a quitté la page : on arrête de lire la réponse du modèle.
        void parts.return?.();
      }
    });
  }
  throw new AiUnavailableError(attempts);
}

/** Génération complète avec repli : essaie chaque modèle jusqu'à ce que l'un réponde. */
export async function generateWithFallback({ tier, system, prompt, maxOutputTokens = 2000, onFinish }: RunArgs) {
  let lastError: unknown;
  for (const modelId of candidates(tier)) {
    try {
      const result = await generateText({ model: registry.languageModel(modelId), system, prompt, maxOutputTokens });
      await onFinish?.({ modelId, inputTokens: result.totalUsage.inputTokens, outputTokens: result.totalUsage.outputTokens });
      return { text: result.text, modelId };
    } catch (error) {
      console.warn(`[ai] repli : ${modelId} indisponible`, error);
      lastError = error;
    }
  }
  throw lastError;
}

/** Sortie structurée (validée par un schéma Zod) avec repli multi-fournisseurs. */
export async function generateStructured<T>({
  tier, system, prompt, schema, maxOutputTokens = 2000, onFinish
}: Omit<RunArgs, 'onFinish'> & { schema: z.ZodType<T>; onFinish?: RunArgs['onFinish'] }): Promise<{ output: T; modelId: string }> {
  const attempts: { modelId: string; message: string }[] = [];
  for (const modelId of candidates(tier)) {
    try {
      const result = await generateText({
        model: registry.languageModel(modelId),
        system,
        prompt,
        maxOutputTokens,
        output: Output.object({ schema })
      });
      await onFinish?.({ modelId, inputTokens: result.totalUsage.inputTokens, outputTokens: result.totalUsage.outputTokens });
      return { output: result.output as T, modelId };
    } catch (error) {
      const message = describe(error);
      console.error(`[ai] ${modelId} a échoué : ${message}`);
      attempts.push({ modelId, message });
    }
  }
  throw new AiUnavailableError(attempts);
}
