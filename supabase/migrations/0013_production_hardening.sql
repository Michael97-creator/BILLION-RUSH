-- Billion Rush V9 production hardening.
-- Safe to run after migrations 0001-0012.

-- Prevent more than one active solo Rush per player.
create unique index if not exists one_active_solo_rush_per_player
  on public.game_sessions(player_id)
  where status = 'active' and mode = 'solo';

-- Fast lookup for approved live questions by difficulty.
create index if not exists questions_live_difficulty_idx
  on public.questions(difficulty, id)
  where status = 'approved';

-- Staff-only analytics view.
revoke all on public.question_analytics from anon, authenticated;
revoke all on public.question_analytics from anon, authenticated;

-- Server-side helper for safe leaderboard upsert.
create or replace function public.record_daily_best(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.game_sessions%rowtype;
  d date;
begin
  select * into s from public.game_sessions where id = p_session_id;
  if s.id is null then raise exception 'Session not found'; end if;
  d := (coalesce(s.finished_at, now()) at time zone 'UTC')::date;
  insert into public.leaderboard_daily(leaderboard_date, player_id, best_session_id, best_money, correct_count, questions_attempted)
  values(d, s.player_id, s.id, s.money_reached, s.correct_count, s.questions_attempted)
  on conflict (leaderboard_date, player_id) do update set
    best_session_id = case when excluded.best_money > leaderboard_daily.best_money
      or (excluded.best_money = leaderboard_daily.best_money and excluded.correct_count > leaderboard_daily.correct_count)
      then excluded.best_session_id else leaderboard_daily.best_session_id end,
    best_money = greatest(leaderboard_daily.best_money, excluded.best_money),
    correct_count = greatest(leaderboard_daily.correct_count, excluded.correct_count),
    questions_attempted = greatest(leaderboard_daily.questions_attempted, excluded.questions_attempted),
    updated_at = now();
end;
$$;

revoke all on function public.record_daily_best(uuid) from public;
