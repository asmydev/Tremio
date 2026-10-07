-- Tremio : schéma initial
create extension if not exists vector;

-- Utilitaire updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Profil candidat (1 par utilisateur)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  headline text,                       -- ex. « Développeuse full-stack — intégration IA »
  identity_statement text,             -- énoncé d'identité professionnelle
  target_roles text[] not null default '{}',
  skills text[] not null default '{}',
  locations text[] not null default '{}',
  ui_locale text not null default 'fr' check (ui_locale in ('fr','en')),
  doc_locale text not null default 'fr' check (doc_locale in ('fr','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- CV (fichier dans Storage + texte extrait + vecteur pour le matching)
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  storage_path text,                   -- resumes/<user_id>/<fichier>
  raw_text text,
  parsed jsonb,                        -- CV structuré par le LLM
  embedding vector(1536),              -- adapter à la dimension du modèle d'embeddings choisi
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index resumes_one_primary on public.resumes (user_id) where is_primary;

-- Modèles de prompts (actions IA). Les modèles système ont owner_id null.
create table public.prompt_templates (
  id text primary key,                 -- slug, ex. 'tailor-resume'
  owner_id uuid references auth.users on delete cascade,
  module text not null,                -- goals | materials | search | interview | offer | brand
  category text not null check (category in ('brainstorming','planning','editing','research')),
  tier text not null check (tier in ('fast','smart','research')),
  title jsonb not null,                -- { "fr": "...", "en": "..." }
  body jsonb not null,                 -- { "fr": "...", "en": "..." } avec {{variables}}
  variables jsonb not null default '[]',
  follow_ups jsonb not null default '[]',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Offres d'emploi agrégées (écrites par le serveur avec la clé service_role)
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,                -- adzuna | jobbank | manual ...
  external_id text,
  title text not null,
  company text,
  location text,
  remote text check (remote in ('onsite','hybrid','remote')),
  lang text check (lang in ('fr','en')),
  description text,
  url text,
  posted_at timestamptz,
  embedding vector(1536),
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);
create index jobs_embedding_idx on public.jobs using hnsw (embedding vector_cosine_ops);

-- Candidatures (Kanban)
create type public.application_status as enum ('to_apply','sent','interview','offer','rejected');
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  job_id uuid references public.jobs on delete set null,
  title text not null,
  company text,
  status public.application_status not null default 'to_apply',
  position int not null default 0,     -- ordre dans la colonne
  next_action jsonb,                   -- { template_id, tone: ready|decision|neutral, label }
  interview_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

-- Documents générés (CV adaptés, lettres, courriels)
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  application_id uuid references public.applications on delete cascade,
  template_id text references public.prompt_templates on delete set null,
  kind text not null,                  -- resume | cover_letter | email | pitch | notes
  locale text not null check (locale in ('fr','en')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Scores de compatibilité CV-offre
create table public.match_scores (
  user_id uuid not null references auth.users on delete cascade,
  job_id uuid not null references public.jobs on delete cascade,
  score int not null check (score between 0 and 100),
  reasons jsonb not null default '[]', -- [{ kind: strength|gap, text }]
  computed_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- Journal des appels IA (coûts, quotas)
create table public.ai_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  template_id text,
  job_id uuid,
  model text not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);
create index ai_runs_user_day on public.ai_runs (user_id, created_at desc);

-- Recherche vectorielle : offres les plus proches d'un vecteur de CV
create or replace function public.match_jobs(query_embedding vector(1536), match_count int default 20)
returns table (id uuid, title text, company text, location text, lang text, similarity float)
language sql stable as $$
  select j.id, j.title, j.company, j.location, j.lang, 1 - (j.embedding <=> query_embedding) as similarity
  from public.jobs j
  where j.embedding is not null
  order by j.embedding <=> query_embedding
  limit match_count
$$;

-- ===== Sécurité (RLS) =====
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.documents enable row level security;
alter table public.match_scores enable row level security;
alter table public.ai_runs enable row level security;

create policy "profil : le sien" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "cv : les siens" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "candidatures : les siennes" on public.applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents : les siens" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scores : les siens" on public.match_scores for select using (auth.uid() = user_id);
create policy "ia : lire les siens" on public.ai_runs for select using (auth.uid() = user_id);
create policy "ia : insérer les siens" on public.ai_runs for insert with check (auth.uid() = user_id);
create policy "offres : lecture connectée" on public.jobs for select to authenticated using (true);
create policy "modèles : système ou les siens" on public.prompt_templates for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy "modèles : créer les siens" on public.prompt_templates for insert to authenticated with check (owner_id = auth.uid());
create policy "modèles : modifier les siens" on public.prompt_templates for update to authenticated using (owner_id = auth.uid());
create policy "modèles : supprimer les siens" on public.prompt_templates for delete to authenticated using (owner_id = auth.uid());

-- ===== Stockage des CV (bucket privé, un dossier par utilisateur) =====
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false) on conflict do nothing;
create policy "cv fichiers : les siens" on storage.objects for all to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
