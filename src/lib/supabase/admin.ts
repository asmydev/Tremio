import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Client « service role » : contourne la RLS. Réservé aux écritures partagées faites par le serveur
 * (offres agrégées, scores de compatibilité). Ne jamais l'utiliser avec des données venant du client
 * sans avoir vérifié l'utilisateur, et ne jamais l'importer dans un composant client.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
