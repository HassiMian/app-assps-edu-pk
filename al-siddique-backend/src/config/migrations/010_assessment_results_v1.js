const { query } = require('../database')

async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS assessment_result_revisions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      paper_id BIGINT NOT NULL,
      release_id TEXT NOT NULL,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      revision_number INTEGER NOT NULL CHECK (revision_number > 0),
      result_status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (result_status IN ('DRAFT','FINALIZED')),
      total_score NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_score >= 0),
      maximum_score NUMERIC(10,2) NOT NULL CHECK (maximum_score >= 0),
      effective_maximum_score NUMERIC(10,2) NOT NULL CHECK (effective_maximum_score >= 0),
      result_hash CHAR(64) NOT NULL,
      reason TEXT,
      created_by_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, release_id, student_id, revision_number),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, paper_id) REFERENCES assessment_papers(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, release_id) REFERENCES assessment_releases(school_id, release_id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS assessment_result_entries (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      result_revision_id BIGINT NOT NULL,
      question_instance_id TEXT NOT NULL,
      display_label TEXT NOT NULL,
      state VARCHAR(20) NOT NULL CHECK (state IN ('SCORED','NOT_ATTEMPTED','ABSENT','NOT_CHECKED','EXEMPT')),
      score NUMERIC(10,2),
      max_score NUMERIC(10,2) NOT NULL CHECK (max_score >= 0),
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (result_revision_id, question_instance_id),
      FOREIGN KEY (school_id, result_revision_id) REFERENCES assessment_result_revisions(school_id, id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_assessment_result_revisions_lookup
      ON assessment_result_revisions(school_id, release_id, student_id, revision_number DESC);
    CREATE INDEX IF NOT EXISTS idx_assessment_result_entries_revision
      ON assessment_result_entries(school_id, result_revision_id);

    CREATE OR REPLACE FUNCTION reject_assessment_result_mutation()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION 'assessment result revisions are immutable';
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_assessment_result_revisions_immutable ON assessment_result_revisions;
    CREATE TRIGGER trg_assessment_result_revisions_immutable
      BEFORE UPDATE OR DELETE ON assessment_result_revisions
      FOR EACH ROW EXECUTE FUNCTION reject_assessment_result_mutation();

    DROP TRIGGER IF EXISTS trg_assessment_result_entries_immutable ON assessment_result_entries;
    CREATE TRIGGER trg_assessment_result_entries_immutable
      BEFORE UPDATE OR DELETE ON assessment_result_entries
      FOR EACH ROW EXECUTE FUNCTION reject_assessment_result_mutation();
  `)
}

module.exports = { up }
