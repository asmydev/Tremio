# Tremio — consignes pour l'assistant de code

- Next.js 16 : le middleware s'appelle `src/proxy.ts`. Lire `node_modules/next/dist/docs/` en cas de doute sur une API récente.
- AI SDK 7 : la doc est dans `node_modules/ai/docs/`. Passer par `src/lib/ai/gateway.ts`, jamais d'appel direct à un fournisseur dans une page ou une route.
- Couleurs : uniquement les classes issues des tokens (`bg-surface-1`, `text-ink-muted`, `bg-accent`…), jamais de hex dans les composants. Une seule action `accent` et au plus une carte `spotlight` par écran.
- Textes : toujours dans `messages/fr.json` et `messages/en.json`, jamais en dur. Vouvoiement en français, anglais canadien (« résumé »).
- Accessibilité : zones cliquables d'au moins 44 px, vrais `<button>`/`<a>`, `aria-pressed` sur les contrôles segmentés.
- Base de données : toute nouvelle table active la RLS dans la même migration. Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client.
- Nouvelle action IA : l'ajouter dans `supabase/seed/prompt_templates.json` (FR et EN), puis régénérer `supabase/seed.sql`.
- Avant de terminer : `npm run typecheck` et `npm run build`.
