-- Anonymous solo score sharing. These rows are player-submitted achievements,
-- not server-verified competitive scores or leaderboard entries.
create table if not exists public.solo_shared_results (
  token text primary key check (token ~ '^[a-f0-9]{32}$'),
  display_name text not null default 'CHALLENGER' check (char_length(display_name) between 1 and 24),
  amount bigint not null check (amount >= 0 and amount <= 1000000000),
  questions_faced smallint not null check (questions_faced between 1 and 50),
  correct_count smallint not null check (correct_count between 0 and 50 and correct_count <= questions_faced),
  total_questions smallint not null default 50 check (total_questions = 50),
  country text not null default 'Global' check (char_length(country) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists solo_shared_results_created_at_idx on public.solo_shared_results(created_at desc);
alter table public.solo_shared_results enable row level security;
-- Intentionally no anon/authenticated table policies. Public access is read-only
-- through get-solo-share; writes are handled by validated Edge Functions only.

create table if not exists public.solo_share_requests (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists solo_share_requests_ip_time_idx on public.solo_share_requests(ip_hash, created_at desc);
alter table public.solo_share_requests enable row level security;
-- No client policies: service-role Edge Function only.
