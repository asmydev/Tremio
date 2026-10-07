-- Sprint 5 : CV adapté en PDF
-- Accord grammatical choisi par l'utilisateur pour ses documents en français
-- (développeuse / développeur / formulations épicènes). Jamais déduit du nom.
alter table public.profiles
  add column if not exists grammatical_gender text check (grammatical_gender in ('feminine','masculine','neutral'));

-- Coordonnées affichées sur les CV générés (prioritaires sur celles du CV importé)
alter table public.profiles
  add column if not exists phone text,
  add column if not exists contact_email text,
  add column if not exists linkedin_url text,
  add column if not exists github_url text,
  add column if not exists website_url text,
  add column if not exists work_status text;
