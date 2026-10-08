const { query } = require('../database')

async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS assessment_result_records (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      result_id TEXT NOT NULL,
      release_id TEXT NOT NULL,
      student_key TEXT NOT NULL,
      student_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(24) NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN ('IN_PROGRESS','COMPLETED','ABSENT','ARCHIVED')),
      current_revision INTEGER NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
      created_by_key TEXT,
      updated_by_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, result_id),
      UNIQUE (school_id, release_id, student_key),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, release_id)
        REFERENCES assessment_releases(school_id, release_id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS assessment_result_revisions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      result_record_id BIGINT NOT NULL,
      revision_number INTEGER NOT NULL CHECK (revision_number > 0),
      entries_json JSONB NOT NULL,
      obtained_marks NUMERIC(10,2) NOT NULL DEFAULT 0,
      maximum_marks NUMERIC(10,2) NOT NULL CHECK (maximum_marks >= 0),
      revision_reason TEXT,
      created_by_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (result_record_id, revision_number),
      FOREIGN KEY (school_id, result_record_id)
        REFERENCES assessment_result_records(school_id, id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_assessment_results_school_release
      ON assessment_result_records (school_id, release_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assessment_result_revisions_record
      ON assessment_result_revisions (school_id, result_record_id, revision_number DESC);

    CREATE OR REPLACE FUNCTION reject_assessment_result_revision_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'immutable assessment result revision cannot be modified';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS assessment_result_revisions_immutable ON assessment_result_revisions;
    CREATE TRIGGER assessment_result_revisions_immutable
      BEFORE UPDATE OR DELETE ON assessment_result_revisions
      FOR EACH ROW EXECUTE FUNCTION reject_assessment_result_revision_mutation();
  `)
  console.log('✅ Migration 010: Assessment Results V1 ready')
}

module.exports = { up }
