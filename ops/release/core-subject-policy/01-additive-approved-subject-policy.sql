-- SaaS Core owner-only; review and backup before live migration.
-- Additive only. Existing subject rows do NOT become approved automatically.
-- SQL does not create/rewrite school answers, marks, users, or approvals.
BEGIN;
ALTER TABLE public.exam_subjects
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_revision integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by_user_id integer,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;
-- Existing exam_subjects rows are unapproved until a real school-authorized
-- Principal/Admin approves an exact revision via SaaS Core-owned workflow.
COMMIT;
