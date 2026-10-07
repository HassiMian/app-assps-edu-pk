const { query } = require('../database')

async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS assessment_papers (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      public_id TEXT NOT NULL,
      title TEXT,
      status VARCHAR(24) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEWED','FINALIZED','PRINTED','ARCHIVED')),
      current_revision INTEGER NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
      created_by_key TEXT,
      updated_by_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS assessment_paper_revisions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      paper_id BIGINT NOT NULL,
      revision_number INTEGER NOT NULL CHECK (revision_number > 0),
      document_json JSONB NOT NULL,
      content_hash CHAR(64) NOT NULL,
      created_by_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (paper_id, revision_number),
      FOREIGN KEY (school_id, paper_id) REFERENCES assessment_papers(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS assessment_releases (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      paper_id BIGINT NOT NULL,
      release_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL CHECK (revision_number > 0),
      content_hash CHAR(64) NOT NULL,
      renderer_version TEXT NOT NULL,
      snapshot_json JSONB NOT NULL,
      released_by_key TEXT,
      released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, release_id),
      UNIQUE (paper_id, revision_number, content_hash),
      FOREIGN KEY (school_id, paper_id) REFERENCES assessment_papers(school_id, id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_assessment_papers_school_updated
      ON assessment_papers (school_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assessment_revisions_school_paper
      ON assessment_paper_revisions (school_id, paper_id, revision_number DESC);
    CREATE INDEX IF NOT EXISTS idx_assessment_releases_school_paper
      ON assessment_releases (school_id, paper_id, released_at DESC);

    CREATE OR REPLACE FUNCTION reject_assessment_immutable_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'immutable assessment history cannot be modified';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS assessment_revisions_immutable ON assessment_paper_revisions;
    CREATE TRIGGER assessment_revisions_immutable
      BEFORE UPDATE OR DELETE ON assessment_paper_revisions
      FOR EACH ROW EXECUTE FUNCTION reject_assessment_immutable_mutation();

    DROP TRIGGER IF EXISTS assessment_releases_immutable ON assessment_releases;
    CREATE TRIGGER assessment_releases_immutable
      BEFORE UPDATE OR DELETE ON assessment_releases
      FOR EACH ROW EXECUTE FUNCTION reject_assessment_immutable_mutation();
  `)
}

module.exports = { up }
