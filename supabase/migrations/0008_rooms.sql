do $$ begin create type public.room_type as enum ('private','public'); exception when duplicate_object then null; end $$;
do $$ begin create type public.room_status as enum ('waiting','ready','starting','active','completed','cancelled','expired'); exception when duplicate_object then null; end $$;

create table if not exists public.multiplayer_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  room_type public.room_type not null,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status public.room_status not null default 'waiting',
  max_players int not null default 2 check (max_players between 2 and 2),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  started_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.multiplayer_room_members (
  room_id uuid not null references public.multiplayer_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_host boolean not null default false,
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id)
);

create table if not exists public.matchmaking_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  queued_at timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued','matched','cancelled')),
  room_id uuid references public.multiplayer_rooms(id) on delete set null
);

create index if not exists idx_rooms_code on public.multiplayer_rooms(room_code);
create index if not exists idx_rooms_status_expiry on public.multiplayer_rooms(status, expires_at);
create index if not exists idx_room_members_user on public.multiplayer_room_members(user_id, room_id);
create index if not exists idx_queue_status_time on public.matchmaking_queue(status, queued_at);

alter table public.multiplayer_rooms enable row level security;
alter table public.multiplayer_room_members enable row level security;
alter table public.matchmaking_queue enable row level security;

create policy "members can view their rooms" on public.multiplayer_rooms for select using (
  exists (select 1 from public.multiplayer_room_members m where m.room_id = id and m.user_id = auth.uid())
);
create policy "members can view room members" on public.multiplayer_room_members for select using (
  exists (select 1 from public.multiplayer_room_members me where me.room_id = room_id and me.user_id = auth.uid())
);
create policy "users view own queue" on public.matchmaking_queue for select using (user_id = auth.uid());

create or replace function public.generate_room_code() returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6),'hex'),1,6));
    exit when not exists(select 1 from public.multiplayer_rooms where room_code = code);
  end loop;
  return code;
end; $$;
