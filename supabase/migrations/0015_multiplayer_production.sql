-- Production multiplayer room-code support.
alter table public.matches add column if not exists room_code text;
create unique index if not exists matches_room_code_unique on public.matches(room_code) where room_code is not null;
create index if not exists matches_waiting_idx on public.matches(status, created_at desc) where status='waiting';

create or replace function public.generate_match_room_code()
returns text language plpgsql security definer set search_path=public as $$
declare code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6),'hex'),1,6));
    exit when not exists(select 1 from public.matches where room_code=code);
  end loop;
  return code;
end; $$;
