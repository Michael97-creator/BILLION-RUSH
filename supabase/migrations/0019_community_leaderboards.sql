-- Community leaderboards for the account-free mobile game. Scores are client-reported
-- until the solo game flow becomes server-authoritative; never present these as cheat-proof.
create table if not exists public.community_leaderboard_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique check (length(run_id) between 8 and 100),
  player_id uuid not null,
  display_name text not null default 'Player' check (length(display_name) between 1 and 24),
  country text not null default 'Other' check (length(country) between 2 and 50),
  prize bigint not null default 0 check (prize between 0 and 1000000000),
  questions_correct smallint not null default 0 check (questions_correct between 0 and 50),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_community_leaderboard_completed on public.community_leaderboard_runs(completed_at desc);
create index if not exists idx_community_leaderboard_country_completed on public.community_leaderboard_runs(country, completed_at desc);
alter table public.community_leaderboard_runs enable row level security;
revoke all on public.community_leaderboard_runs from anon, authenticated;
grant all on public.community_leaderboard_runs to service_role;
