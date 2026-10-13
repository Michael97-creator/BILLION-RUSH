-- Billion Rush V12 final production hardening.
-- Run after 0013_production_hardening.sql.

-- A question can be answered at most once in a Rush session.
create unique index if not exists game_answers_one_per_question
  on public.game_answers(session_id, question_id);

-- Helpful indexes for production result/history queries.
create index if not exists game_lifelines_session_question_idx
  on public.game_lifelines(session_id, question_id);

create index if not exists player_question_history_player_seen_idx
  on public.player_question_history(player_id, last_seen_at desc);

-- Ensure direct client access to sensitive answer/history tables stays blocked.
revoke all on public.game_answers from anon, authenticated;
revoke all on public.game_lifelines from anon, authenticated;
revoke all on public.player_question_history from anon, authenticated;
