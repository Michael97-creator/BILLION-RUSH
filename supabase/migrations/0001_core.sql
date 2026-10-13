-- Billion Rush production database foundation
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.user_role as enum ('player','reviewer','admin');
create type public.question_status as enum ('draft','pending_review','approved','rejected','retired');
create type public.difficulty_level as enum ('easy','medium','hard');
create type public.question_type as enum ('multiple_choice');
create type public.review_decision as enum ('approve','reject','request_changes');
create type public.report_status as enum ('open','reviewing','resolved','dismissed');
create type public.game_mode as enum ('solo','daily_challenge','multiplayer');
create type public.game_status as enum ('active','won','lost','walked_away','abandoned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  avatar_url text,
  role public.user_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  explanation text not null,
  category text not null,
  difficulty public.difficulty_level not null,
  question_type public.question_type not null default 'multiple_choice',
  tags text[] not null default '{}',
  source_reference text,
  status public.question_status not null default 'draft',
  normalized_text text generated always as (lower(regexp_replace(question_text, '[^a-zA-Z0-9 ]', '', 'g'))) stored,
  created_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(question_text)) >= 10),
  check (option_a <> option_b and option_a <> option_c and option_a <> option_d and option_b <> option_c and option_b <> option_d and option_c <> option_d)
);

create index questions_status_category_difficulty_idx
  on public.questions(status, category, difficulty);

create index questions_status_type_idx
  on public.questions(status, question_type);

create index questions_normalized_text_idx
  on public.questions using gin(normalized_text gin_trgm_ops);

create table public.question_reviews (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  decision public.review_decision not null,
  notes text,
  created_at timestamptz not null default now()
);

create index question_reviews_question_idx on public.question_reviews(question_id, created_at desc);

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.player_question_history (
  player_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  times_seen integer not null default 1 check (times_seen >= 1),
  times_correct integer not null default 0 check (times_correct >= 0),
  times_wrong integer not null default 0 check (times_wrong >= 0),
  primary key(player_id, question_id)
);

create index player_history_recent_idx
  on public.player_question_history(player_id, last_seen_at desc);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  mode public.game_mode not null default 'solo',
  status public.game_status not null default 'active',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  money_reached bigint not null default 0 check (money_reached >= 0 and money_reached <= 1000000000),
  questions_attempted smallint not null default 0 check (questions_attempted between 0 and 20),
  correct_count smallint not null default 0 check (correct_count between 0 and 20),
  lifelines_used text[] not null default '{}',
  question_sequence uuid[] not null default '{}',
  current_index smallint not null default 0 check (current_index between 0 and 19)
);

create index game_sessions_player_started_idx
  on public.game_sessions(player_id, started_at desc);

create table public.game_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option char(1) check (selected_option in ('A','B','C','D')),
  submitted_at timestamptz not null default now(),
  server_elapsed_ms integer,
  is_correct boolean not null,
  timed_out boolean not null default false,
  money_before bigint not null,
  money_after bigint not null
);

create index game_answers_session_idx on public.game_answers(session_id, submitted_at);

create table public.leaderboard_daily (
  leaderboard_date date not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  best_session_id uuid not null references public.game_sessions(id),
  best_money bigint not null,
  correct_count smallint not null,
  questions_attempted smallint not null,
  updated_at timestamptz not null default now(),
  primary key(leaderboard_date, player_id)
);

create index leaderboard_daily_rank_idx
  on public.leaderboard_daily(leaderboard_date, best_money desc, correct_count desc, questions_attempted desc);

create table public.leaderboard_periods (
  period_type text not null check (period_type in ('weekly','monthly','all_time')),
  period_start date not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  accumulated_score bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key(period_type, period_start, player_id)
);

create index leaderboard_periods_rank_idx
  on public.leaderboard_periods(period_type, period_start, accumulated_score desc);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('reviewer','admin')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.question_reviews enable row level security;
alter table public.question_reports enable row level security;
alter table public.player_question_history enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_answers enable row level security;
alter table public.leaderboard_daily enable row level security;
alter table public.leaderboard_periods enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid());

create policy questions_staff_all on public.questions for all using (public.is_staff()) with check (public.is_staff());
create policy question_reviews_staff_all on public.question_reviews for all using (public.is_staff()) with check (public.is_staff());

create policy reports_player_insert on public.question_reports
  for insert with check (player_id = auth.uid());
create policy reports_player_select on public.question_reports
  for select using (player_id = auth.uid() or public.is_staff());

create policy history_self on public.player_question_history
  for all using (player_id = auth.uid()) with check (player_id = auth.uid());

create policy sessions_self on public.game_sessions
  for select using (player_id = auth.uid());
create policy answers_self on public.game_answers
  for select using (
    exists(select 1 from public.game_sessions s where s.id = session_id and s.player_id = auth.uid())
  );

create policy leaderboard_daily_read on public.leaderboard_daily
  for select using (true);
create policy leaderboard_periods_read on public.leaderboard_periods
  for select using (true);

-- Important: players should not receive questions directly with correct_option.
-- A later trusted RPC/Edge Function will return only PublicQuestion fields.
create or replace view public.live_question_public as
select id, question_text, option_a, option_b, option_c, option_d,
       category, difficulty, question_type, tags
from public.questions
where status = 'approved';

revoke all on public.live_question_public from anon, authenticated;

-- Near-duplicate candidates for Studio review.
create or replace function public.find_question_duplicates(p_text text, p_threshold real default 0.72)
returns table(id uuid, question_text text, similarity_score real)
language sql stable security definer set search_path = public
as $$
  select q.id, q.question_text, similarity(q.normalized_text,
    lower(regexp_replace(p_text, '[^a-zA-Z0-9 ]', '', 'g'))) as similarity_score
  from public.questions q
  where similarity(q.normalized_text,
    lower(regexp_replace(p_text, '[^a-zA-Z0-9 ]', '', 'g'))) >= p_threshold
  order by similarity_score desc
  limit 20;
$$;

-- Analytics
create or replace view public.question_analytics as
select
  q.id,
  q.question_text,
  q.category,
  q.difficulty,
  q.status,
  count(ga.id)::bigint as times_played,
  coalesce(sum(case when ga.is_correct then 1 else 0 end),0)::bigint as correct_count,
  coalesce(sum(case when not ga.is_correct then 1 else 0 end),0)::bigint as wrong_count,
  case when count(ga.id)=0 then 0
       else round(100.0 * sum(case when ga.is_correct then 1 else 0 end) / count(ga.id), 2)
  end as correct_rate,
  (select count(*) from public.question_reports r where r.question_id=q.id)::bigint as report_count
from public.questions q
left join public.game_answers ga on ga.question_id=q.id
group by q.id;

-- Automatically create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name','Player'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
