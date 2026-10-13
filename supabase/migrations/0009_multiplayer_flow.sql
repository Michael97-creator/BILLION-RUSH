alter table public.matches add column if not exists current_deadline timestamptz;
alter table public.matches add column if not exists reveal_at timestamptz;
alter table public.matches add column if not exists started_at timestamptz;
alter table public.matches add column if not exists completed_at timestamptz;
alter table public.matches add column if not exists current_question_index integer not null default 0;
alter table public.matches add column if not exists question_ids uuid[] not null default '{}';
create index if not exists matches_status_deadline_idx on public.matches(status,current_deadline);
