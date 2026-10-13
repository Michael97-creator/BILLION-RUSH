-- Billion Rush Stage 11: production security & anti-cheat foundation

create table if not exists public.idempotency_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  operation text not null,
  response_code integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (user_id, key)
);

create index if not exists idempotency_keys_expiry_idx on public.idempotency_keys(expires_at);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid references public.game_sessions(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_user_idx on public.security_events(user_id, created_at desc);
create index if not exists security_events_session_idx on public.security_events(session_id, created_at desc);

create table if not exists public.request_rate_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.idempotency_keys enable row level security;
alter table public.security_events enable row level security;
alter table public.request_rate_buckets enable row level security;

-- No direct client access. Trusted server/Edge Functions use the service role.
revoke all on public.idempotency_keys from anon, authenticated;
revoke all on public.security_events from anon, authenticated;
revoke all on public.request_rate_buckets from anon, authenticated;

create or replace function public.cleanup_security_records()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.idempotency_keys where expires_at < now();
  delete from public.request_rate_buckets where updated_at < now() - interval '2 hours';
$$;
