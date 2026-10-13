-- Stage 4 game-engine support
alter table public.game_sessions
  add column if not exists current_deadline timestamptz;

alter table public.game_sessions
  add column if not exists answered_question_ids uuid[] not null default '{}';

create index if not exists game_sessions_active_idx
  on public.game_sessions(player_id, status, current_deadline);

-- The client receives a question through a trusted function, not by reading
-- the questions table. The correct_option remains inaccessible to players.
