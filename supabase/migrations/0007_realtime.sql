create table if not exists public.multiplayer_match_events(id uuid primary key default gen_random_uuid(),match_id uuid not null references public.matches(id) on delete cascade,event_type text not null,payload jsonb not null default '{}',created_at timestamptz not null default now());
alter table public.multiplayer_match_events enable row level security;
create policy realtime_events_member on public.multiplayer_match_events for select using(exists(select 1 from public.match_members mm where mm.match_id=multiplayer_match_events.match_id and mm.player_id=auth.uid()));
