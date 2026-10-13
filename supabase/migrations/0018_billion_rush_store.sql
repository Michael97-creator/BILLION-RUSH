-- Server-authoritative Billion Rush store inventory and idempotent Paystack grants.
create table if not exists public.billion_rush_store_players (
  player_id uuid primary key,
  fifty integer not null default 0 check (fifty >= 0),
  audience integer not null default 0 check (audience >= 0),
  friend integer not null default 0 check (friend >= 0),
  extra_time integer not null default 0 check (extra_time >= 0),
  second_chance integer not null default 0 check (second_chance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billion_rush_store_purchases (
  reference text primary key,
  player_id uuid not null references public.billion_rush_store_players(player_id) on delete cascade,
  product_id text not null check (product_id in ('fifty_single','fifty_triple','audience_single','audience_triple','friend_single','friend_triple','extra_time_single','extra_time_five','second_chance_single','second_chance_two','complete_bundle')),
  amount_kobo integer not null check (amount_kobo > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  granted_at timestamptz
);
create index if not exists billion_rush_store_purchases_player_idx on public.billion_rush_store_purchases(player_id, created_at desc);

alter table public.billion_rush_store_players enable row level security;
alter table public.billion_rush_store_purchases enable row level security;
revoke all on public.billion_rush_store_players from anon, authenticated;
revoke all on public.billion_rush_store_purchases from anon, authenticated;
grant select, insert, update, delete on public.billion_rush_store_players to service_role;
grant select, insert, update, delete on public.billion_rush_store_purchases to service_role;

create or replace function public.br_complete_store_purchase(p_reference text, p_provider_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.billion_rush_store_purchases%rowtype;
  v public.billion_rush_store_players%rowtype;
  v_granted boolean := false;
begin
  select * into p from public.billion_rush_store_purchases where reference = p_reference for update;
  if not found then raise exception 'purchase reference not found'; end if;
  insert into public.billion_rush_store_players(player_id) values (p.player_id) on conflict (player_id) do nothing;
  if p.status = 'paid' then
    select * into v from public.billion_rush_store_players where player_id = p.player_id;
    return jsonb_build_object('granted', false, 'inventory', jsonb_build_object('fifty',v.fifty,'audience',v.audience,'friend',v.friend,'extraTime',v.extra_time,'secondChance',v.second_chance));
  end if;
  if p.status <> 'pending' then raise exception 'purchase is not pending'; end if;

  update public.billion_rush_store_players set
    fifty = fifty + case p.product_id when 'fifty_single' then 1 when 'fifty_triple' then 3 when 'complete_bundle' then 2 else 0 end,
    audience = audience + case p.product_id when 'audience_single' then 1 when 'audience_triple' then 3 when 'complete_bundle' then 2 else 0 end,
    friend = friend + case p.product_id when 'friend_single' then 1 when 'friend_triple' then 3 when 'complete_bundle' then 2 else 0 end,
    extra_time = extra_time + case p.product_id when 'extra_time_single' then 1 when 'extra_time_five' then 5 else 0 end,
    second_chance = second_chance + case p.product_id when 'second_chance_single' then 1 when 'second_chance_two' then 2 else 0 end,
    updated_at = now()
  where player_id = p.player_id returning * into v;

  update public.billion_rush_store_purchases set status='paid', paid_at=now(), granted_at=now(), provider_payload=p_provider_payload where reference=p_reference;
  v_granted := true;
  return jsonb_build_object('granted',v_granted,'inventory',jsonb_build_object('fifty',v.fifty,'audience',v.audience,'friend',v.friend,'extraTime',v.extra_time,'secondChance',v.second_chance));
end; $$;

create or replace function public.br_consume_store_item(p_player_id uuid, p_item text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.billion_rush_store_players%rowtype;
begin
  update public.billion_rush_store_players set
    fifty = fifty - case when p_item='fifty' then 1 else 0 end,
    audience = audience - case when p_item='audience' then 1 else 0 end,
    friend = friend - case when p_item='friend' then 1 else 0 end,
    extra_time = extra_time - case when p_item='extraTime' then 1 else 0 end,
    second_chance = second_chance - case when p_item='secondChance' then 1 else 0 end,
    updated_at=now()
  where player_id=p_player_id
    and p_item in ('fifty','audience','friend','extraTime','secondChance')
    and ((p_item='fifty' and fifty>0) or (p_item='audience' and audience>0) or (p_item='friend' and friend>0) or (p_item='extraTime' and extra_time>0) or (p_item='secondChance' and second_chance>0))
  returning * into v;
  if not found then return jsonb_build_object('consumed',false); end if;
  return jsonb_build_object('consumed',true,'inventory',jsonb_build_object('fifty',v.fifty,'audience',v.audience,'friend',v.friend,'extraTime',v.extra_time,'secondChance',v.second_chance));
end; $$;

revoke all on function public.br_complete_store_purchase(text,jsonb) from public, anon, authenticated;
revoke all on function public.br_consume_store_item(uuid,text) from public, anon, authenticated;
grant execute on function public.br_complete_store_purchase(text,jsonb) to service_role;
grant execute on function public.br_consume_store_item(uuid,text) to service_role;
