# Tremio

Application web responsive de recherche d'emploi assistée par IA, en français et en anglais.

## Stack

Next.js 16 (App Router, `src/proxy.ts`) · React 19 · TypeScript · Tailwind CSS 4 (tokens Boréal) · next-intl 4 (FR/EN) · Supabase (Auth, Postgres, pgvector, Storage, RLS) · AI SDK 7 (Anthropic, OpenAI, Google) · Zod 4.

## Démarrer en local

1. **Supabase** : créez un projet (de préférence dans une région au Canada, pour la Loi 25). Dans *SQL Editor*, exécutez dans l'ordre les fichiers de `supabase/migrations/`, puis `supabase/seed.sql`. Avec la CLI Supabase : `supabase link` puis `supabase db push` et `supabase db seed`.
2. **Authentification** : dans *Authentication > URL Configuration*, ajoutez `http://localhost:3000/auth/callback` aux URL de redirection.
3. **Variables** : `cp .env.example .env.local`, puis renseignez Supabase et au moins une clé IA.
4. `npm install` puis `npm run dev`, et ouvrez http://localhost:3000.

Vérifications : `npm run typecheck` et `npm run build`.

## Architecture

```
src/
  proxy.ts                    langue (next-intl) + session Supabase + protection des pages
  i18n/                       routage FR/EN, navigation typée
  app/[locale]/(app)/         pages connectées : tableau de bord, Atelier IA
  app/[locale]/login/         connexion par lien magique
  app/api/ai/run/route.ts     exécute une action IA (quota, variables, flux, journal)
  app/auth/callback/          retour du lien magique
  lib/ai/gateway.ts           routage par niveau (fast/smart/research) + repli multi-fournisseurs
  lib/prompts/render.ts       moteur de prompts : variables typées, remplissage auto, balisage anti-injection
  components/                 barre latérale, sélecteur de langue, Atelier, connexion
messages/{fr,en}.json         textes de l'interface
supabase/migrations/          schéma + RLS + bucket des CV
supabase/seed/                actions IA (source JSON) ; seed.sql est généré à partir d'elle
public/brand/                 logos SVG ; icônes d'app et manifeste PWA
```

**Principes à garder :**

- **Une action IA = un modèle** dans `prompt_templates`, avec des variables dont la source est déclarée (`profile`, `resume`, `job`, `input`). L'app remplit seule ce qu'elle connaît.
- **Les textes externes** (offres, articles) sont marqués `untrusted` et encadrés comme données, jamais comme instructions.
- **Les modèles se configurent par variables d'environnement** (`AI_MODELS_*`), jamais dans le code. Plusieurs modèles séparés par des virgules définissent l'ordre de repli.
- **Toutes les tables ont la RLS.** La clé `service_role` ne sert qu'aux tâches serveur (ingestion des offres).

## Déjà en place

Auth par lien magique, FR/EN avec sélecteur, tokens de design, tableau de bord (action recommandée, compteurs, offres compatibles), Atelier IA avec 6 actions en flux, lecture de pages web, quota quotidien et journal des coûts. Profil et CV (import PDF/DOCX, profil suggéré par l'IA). Candidatures : Kanban, fiche détaillée, actions IA depuis la candidature, documents enregistrés. Entretiens : simulation avec questions sur mesure et évaluation STAR, historique des séances. Offres : recherche Adzuna (Canada), score de compatibilité expliqué par l IA, ajout en un clic aux candidatures. CV adapté au poste en PDF compatible ATS, avec accord grammatical choisi dans le profil.

## Feuille de route

1. **Profil et CV** : import PDF/DOCX vers Storage, extraction du texte, structuration par LLM (sortie typée Zod), CV principal.
2. **Candidatures** : Kanban (glisser-déposer, `position`), prochaine action par carte, enregistrement des documents générés.
3. **Offres** : ingestion planifiée (API Adzuna, données ouvertes du Guichet-Emplois), embeddings, `match_jobs`, score expliqué en sortie structurée.
4. **IA avancée** : outil de recherche web pour la recherche entreprise, simulation d'entretien vocale.
5. **Mise en production** : conformité Loi 25 (consentement, export et suppression des données, page de confidentialité), suivi des erreurs, limitation de débit, tests de bout en bout, offre freemium avec Stripe, déploiement Vercel.
