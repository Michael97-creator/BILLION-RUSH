-- Stage 9: leaderboard support
-- Requires Stage 3/4 tables.

create index if not exists idx_game_sessions_completed_score
  on public.game_sessions (status, finished_at desc, money_reached desc)
  where status in ('won','lost','walked_away');

create index if not exists idx_game_sessions_player_completed
  on public.game_sessions (player_id, finished_at desc)
  where status in ('won','lost','walked_away');

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type in ('daily','weekly','monthly','all_time')),
  period_key text not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  score bigint not null default 0,
  questions_survived integer not null default 0,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(period_type, period_key, player_id)
);

create index if not exists idx_leaderboard_period_score
  on public.leaderboard_entries(period_type, period_key, score desc, questions_survived desc, completed_at asc);

alter table public.leaderboard_entries enable row level security;

create policy "players can read leaderboard"
  on public.leaderboard_entries for select
  to authenticated
  using (true);

create or replace view public.public_leaderboard as
select
  le.period_type,
  le.period_key,
  le.player_id,
  coalesce(p.display_name, 'Player') as display_name,
  le.score,
  le.questions_survived,
  le.completed_at
from public.leaderboard_entries le
join public.profiles p on p.id = le.player_id;
