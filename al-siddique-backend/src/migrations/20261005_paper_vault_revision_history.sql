-- V6-D shared paper_vault audit journal; NOT a separate Connect paper truth.
-- Both initial baseline and subsequent revisions are immutable snapshots.
CREATE TABLE IF NOT EXISTS paper_vault_revision_history (
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  paper_id BIGINT NOT NULL REFERENCES paper_vault(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_kind VARCHAR(32) NOT NULL CHECK (event_kind IN ('baseline_capture','v6d_guarded_edit')),
  payload_hash CHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (school_id,paper_id,revision)
);
CREATE INDEX IF NOT EXISTS idx_paper_vault_revision_owner_lookup
ON paper_vault_revision_history(school_id,paper_id,revision DESC);

-- G34: extend immutable journal event taxonomy without recreating the table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'paper_vault_revision_history'::regclass
      AND conname = 'paper_vault_revision_history_event_kind_check'
      AND pg_get_constraintdef(oid) NOT LIKE '%v6d_guarded_rename%'
  ) THEN
    ALTER TABLE paper_vault_revision_history
      DROP CONSTRAINT paper_vault_revision_history_event_kind_check;
    ALTER TABLE paper_vault_revision_history
      ADD CONSTRAINT paper_vault_revision_history_event_kind_check
      CHECK (event_kind IN ('baseline_capture','v6d_guarded_edit','v6d_guarded_rename','v6d_guarded_delete'));
  END IF;
END $$;
