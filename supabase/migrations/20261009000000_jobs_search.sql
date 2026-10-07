-- Sprint 4 : offres Adzuna (salaire, catégorie) et suivi des recherches
alter table public.jobs
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists category text;

create index if not exists match_scores_user_recent on public.match_scores (user_id, computed_at desc);
create index if not exists jobs_posted on public.jobs (posted_at desc);
