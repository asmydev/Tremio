-- Sprint 2 : une candidature porte sa propre offre (collée par l'utilisateur),
-- pour que l'Atelier IA puisse s'en servir sans ressaisie.
alter table public.applications
  add column if not exists job_description text,
  add column if not exists job_url text,
  add column if not exists location text,
  add column if not exists lang text check (lang in ('fr','en'));

create index if not exists applications_user_status on public.applications (user_id, status, position);
create index if not exists documents_application on public.documents (application_id, created_at desc);
