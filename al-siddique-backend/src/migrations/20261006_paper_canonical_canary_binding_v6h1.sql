-- V6-H1 additive source binding for future single-paper canonical canary imports.
-- No data copy, no dual-write, no write gate enablement.
BEGIN;

ALTER TABLE paper_documents
  ADD COLUMN IF NOT EXISTS source_repository VARCHAR(40),
  ADD COLUMN IF NOT EXISTS source_paper_id BIGINT,
  ADD COLUMN IF NOT EXISTS source_revision INTEGER,
  ADD COLUMN IF NOT EXISTS source_snapshot_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS canary_imported_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='paper_documents_source_repository_v6h1_chk'
  ) THEN
    ALTER TABLE paper_documents
      ADD CONSTRAINT paper_documents_source_repository_v6h1_chk
      CHECK (source_repository IS NULL OR source_repository='paper_vault');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='paper_documents_source_revision_v6h1_chk'
  ) THEN
    ALTER TABLE paper_documents
      ADD CONSTRAINT paper_documents_source_revision_v6h1_chk
      CHECK (source_revision IS NULL OR source_revision >= 1);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='paper_documents_source_snapshot_hash_v6h1_chk'
  ) THEN
    ALTER TABLE paper_documents
      ADD CONSTRAINT paper_documents_source_snapshot_hash_v6h1_chk
      CHECK (source_snapshot_hash IS NULL OR source_snapshot_hash ~ '^[0-9a-f]{64}$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='paper_documents_source_binding_complete_v6h1_chk'
  ) THEN
    ALTER TABLE paper_documents
      ADD CONSTRAINT paper_documents_source_binding_complete_v6h1_chk
      CHECK (
        (source_repository IS NULL AND source_paper_id IS NULL AND source_revision IS NULL AND source_snapshot_hash IS NULL AND canary_imported_at IS NULL)
        OR
        (source_repository='paper_vault' AND source_paper_id IS NOT NULL AND source_revision IS NOT NULL AND source_snapshot_hash IS NOT NULL AND canary_imported_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_paper_documents_source_binding_v6h1
  ON paper_documents(school_id, source_repository, source_paper_id, source_revision)
  WHERE source_repository IS NOT NULL;

COMMENT ON COLUMN paper_documents.source_repository IS 'V6-H1 immutable origin discriminator for an explicitly approved canonical canary import.';
COMMENT ON COLUMN paper_documents.source_paper_id IS 'Source Paper Vault id captured at canonical canary import time.';
COMMENT ON COLUMN paper_documents.source_revision IS 'Exact source Paper Vault revision captured at canonical canary import time.';
COMMENT ON COLUMN paper_documents.source_snapshot_hash IS 'Exact reviewed source snapshot hash captured before canonical canary import.';
COMMENT ON COLUMN paper_documents.canary_imported_at IS 'Timestamp of the explicitly approved single-paper canary import; null for non-canary documents.';

COMMIT;
