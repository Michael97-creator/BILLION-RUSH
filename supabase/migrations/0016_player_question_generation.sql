-- Anonymous device-based rate limiting for demand-driven player question generation.
-- The table has no client-facing RLS policies; only the service-role Edge Function may access it.
create table if not exists public.player_question_generation_limits (
  device_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.player_question_generation_limits enable row level security;
revoke all on public.player_question_generation_limits from anon, authenticated;

create or replace function public.consume_player_question_generation_quota(
  p_device_hash text,
  p_daily_limit integer default 4
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.player_question_generation_limits%rowtype;
begin
  insert into public.player_question_generation_limits(device_hash, window_started_at, request_count, updated_at)
  values (p_device_hash, now(), 0, now())
  on conflict (device_hash) do nothing;

  select * into v_row from public.player_question_generation_limits
  where device_hash = p_device_hash for update;

  if v_row.window_started_at < now() - interval '24 hours' then
    update public.player_question_generation_limits
      set window_started_at = now(), request_count = 1, updated_at = now()
      where device_hash = p_device_hash;
    return true;
  end if;

  if v_row.request_count >= p_daily_limit then
    return false;
  end if;

  update public.player_question_generation_limits
    set request_count = request_count + 1, updated_at = now()
    where device_hash = p_device_hash;
  return true;
end;
$$;

revoke all on function public.consume_player_question_generation_quota(text, integer) from public, anon, authenticated;
grant execute on function public.consume_player_question_generation_quota(text, integer) to service_role;

create table if not exists public.player_lifeline_generation_limits (
  device_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.player_lifeline_generation_limits enable row level security;
revoke all on public.player_lifeline_generation_limits from anon, authenticated;

create or replace function public.consume_player_lifeline_quota(
  p_device_hash text,
  p_daily_limit integer default 60
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_row public.player_lifeline_generation_limits%rowtype;
begin
  insert into public.player_lifeline_generation_limits(device_hash,window_started_at,request_count,updated_at)
  values(p_device_hash,now(),0,now()) on conflict(device_hash) do nothing;
  select * into v_row from public.player_lifeline_generation_limits where device_hash=p_device_hash for update;
  if v_row.window_started_at < now() - interval '24 hours' then
    update public.player_lifeline_generation_limits set window_started_at=now(),request_count=1,updated_at=now() where device_hash=p_device_hash;
    return true;
  end if;
  if v_row.request_count >= p_daily_limit then return false; end if;
  update public.player_lifeline_generation_limits set request_count=request_count+1,updated_at=now() where device_hash=p_device_hash;
  return true;
end;
$$;
revoke all on function public.consume_player_lifeline_quota(text,integer) from public, anon, authenticated;
grant execute on function public.consume_player_lifeline_quota(text,integer) to service_role;
