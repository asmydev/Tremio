-- Sprint 3 : séances d'entraînement aux entretiens (questions générées + réponses évaluées)
create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  application_id uuid not null references public.applications on delete cascade,
  locale text not null check (locale in ('fr','en')),
  questions jsonb not null,            -- [{ text, kind }]
  answers jsonb not null default '[]', -- [{ index, answer, feedback }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger interview_sessions_touch before update on public.interview_sessions for each row execute function public.touch_updated_at();
create index interview_sessions_app on public.interview_sessions (application_id, created_at desc);

alter table public.interview_sessions enable row level security;
create policy "séances : les siennes" on public.interview_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
