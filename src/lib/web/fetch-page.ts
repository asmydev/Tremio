import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Récupère le texte lisible d'une page web publique (ex. « À propos » d'une entreprise).
 * Protégé contre le SSRF : http(s) uniquement, ports standard, adresses privées refusées,
 * redirections vérifiées une à une, délai et taille limités.
 */
const MAX_BYTES = 2_000_000;
const MAX_CHARS = 15_000;
const TIMEOUT_MS = 8_000;

export class PageFetchError extends Error {}

function isPrivate(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivate(v6.slice(7));
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

async function assertPublic(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) throw new PageFetchError('protocole non autorisé');
  if (url.port && !['80', '443'].includes(url.port)) throw new PageFetchError('port non autorisé');
  const addresses = await lookup(url.hostname, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new PageFetchError('adresse introuvable');
  if (addresses.some((a) => isPrivate(a.address))) throw new PageFetchError('adresse non publique');
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export async function fetchPageText(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new PageFetchError('adresse invalide');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; hop < 4; hop++) {
      await assertPublic(url);
      const res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'TremioBot/1.0 (career research)', Accept: 'text/html,text/plain' }
      });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        url = new URL(location, url);
        continue;
      }
      if (!res.ok) throw new PageFetchError(`la page a répondu ${res.status}`);
      const type = res.headers.get('content-type') ?? '';
      if (!/text\/html|text\/plain/.test(type) || !res.body) throw new PageFetchError('ce n’est pas une page web');

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
      const body = new TextDecoder().decode(Buffer.concat(chunks));
      const text = type.includes('html') ? htmlToText(body) : body;
      if (text.length < 200) throw new PageFetchError('page vide ou affichée uniquement en JavaScript');
      return `Source : ${url.href}\n\n${text.slice(0, MAX_CHARS)}`;
    }
    throw new PageFetchError('trop de redirections');
  } catch (error) {
    if (error instanceof PageFetchError) throw error;
    throw new PageFetchError(controller.signal.aborted ? 'délai dépassé' : 'page inaccessible');
  } finally {
    clearTimeout(timer);
  }
}

/** Vrai si le champ contient uniquement une adresse web. */
export function looksLikeUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}
