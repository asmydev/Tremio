import 'server-only';

/** Client de l'API de recherche d'Adzuna (https://developer.adzuna.com/docs/search). */
export interface AdzunaJob {
  id: string;
  title: string;
  description: string;           // extrait tronqué par Adzuna
  redirect_url: string;
  created: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  category?: { label?: string };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
}

export class AdzunaError extends Error {
  constructor(public readonly code: 'not_configured' | 'unauthorized' | 'rate_limited' | 'unavailable') {
    super(code);
  }
}

export async function searchAdzuna({ what, where, page = 1 }: { what: string; where?: string; page?: number }): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new AdzunaError('not_configured');

  const country = process.env.ADZUNA_COUNTRY ?? 'ca';
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '20',
    what,
    max_days_old: '30',
    sort_by: 'relevance',
    'content-type': 'application/json'
  });
  if (where) params.set('where', where);

  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store'
  });
  if (res.status === 401 || res.status === 403) throw new AdzunaError('unauthorized');
  if (res.status === 429) throw new AdzunaError('rate_limited');
  if (!res.ok) throw new AdzunaError('unavailable');
  const body = (await res.json()) as { results?: AdzunaJob[] };
  return body.results ?? [];
}

/** Supprime le HTML résiduel des extraits Adzuna. */
export function cleanSnippet(text: string) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Langue probable d'une offre, à partir de mots très fréquents. */
export function guessLang(text: string): 'fr' | 'en' {
  const words = text.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿœ']+/g) ?? [];
  const fr = new Set(['le', 'la', 'les', 'des', 'et', 'pour', 'avec', 'vous', 'nous', 'une', 'du', 'dans', 'sur', 'poste', 'est']);
  const en = new Set(['the', 'and', 'for', 'with', 'you', 'we', 'our', 'to', 'of', 'in', 'is', 'will', 'are', 'this']);
  let score = 0;
  for (const w of words) score += fr.has(w) ? 1 : en.has(w) ? -1 : 0;
  return score >= 0 ? 'fr' : 'en';
}
