create table if not exists public.game_lifelines (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  lifeline_type text not null check (lifeline_type in ('fifty_fifty','audience','friend')),
  payload jsonb not null default '{}'::jsonb,
  used_at timestamptz not null default now()
);

create unique index if not exists game_lifelines_once_per_type
  on public.game_lifelines(session_id, question_id, lifeline_type);
create index if not exists game_lifelines_session_idx on public.game_lifelines(session_id);

alter table public.game_lifelines enable row level security;
create policy "players can read own lifeline usage" on public.game_lifelines
  for select using (exists (select 1 from public.game_sessions s where s.id = session_id and s.player_id = auth.uid()));
