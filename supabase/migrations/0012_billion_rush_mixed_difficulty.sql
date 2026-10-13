-- Billion Rush V8: four production difficulty tiers.
-- Run once after the existing migrations.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'difficulty_level' AND e.enumlabel = 'very_hard'
  ) THEN
    ALTER TYPE public.difficulty_level ADD VALUE 'very_hard';
  END IF;
END $$;

create index if not exists questions_approved_difficulty_idx
  on public.questions(status, difficulty) where status='approved';
