const { query } = require('../database')

async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS assessment_roster_snapshots (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      snapshot_id TEXT NOT NULL,
      context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      students_json JSONB NOT NULL,
      student_count INTEGER NOT NULL CHECK (student_count >= 0),
      roster_hash CHAR(64) NOT NULL,
      created_by_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, snapshot_id),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS assessment_print_jobs (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      print_job_id TEXT NOT NULL,
      release_id TEXT NOT NULL,
      roster_snapshot_id TEXT,
      binding_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      render_settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      copy_count INTEGER NOT NULL DEFAULT 1 CHECK (copy_count > 0 AND copy_count <= 1000),
      personalized BOOLEAN NOT NULL DEFAULT FALSE,
      duplex BOOLEAN NOT NULL DEFAULT FALSE,
      student_boundary_policy VARCHAR(40) NOT NULL DEFAULT 'START_EACH_STUDENT_ON_FRONT'
        CHECK (student_boundary_policy IN ('START_EACH_STUDENT_ON_FRONT','NOT_APPLICABLE')),
      reprint_mode VARCHAR(32) NOT NULL DEFAULT 'NEW_JOB'
        CHECK (reprint_mode IN ('NEW_JOB','REPRINT_ORIGINAL','UPDATED_JOB')),
      parent_print_job_id TEXT,
      status VARCHAR(24) NOT NULL DEFAULT 'CREATED'
        CHECK (status IN ('CREATED','QUEUED','PRINTING','COMPLETED','CANCELLED','FAILED')),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      last_error TEXT,
      created_by_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, print_job_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, release_id) REFERENCES assessment_releases(school_id, release_id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, roster_snapshot_id) REFERENCES assessment_roster_snapshots(school_id, snapshot_id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, parent_print_job_id) REFERENCES assessment_print_jobs(school_id, print_job_id) ON DELETE RESTRICT,
      CHECK ((personalized = FALSE AND roster_snapshot_id IS NULL) OR (personalized = TRUE AND roster_snapshot_id IS NOT NULL)),
      CHECK ((personalized = TRUE AND student_boundary_policy = 'START_EACH_STUDENT_ON_FRONT') OR (personalized = FALSE AND student_boundary_policy = 'NOT_APPLICABLE'))
    );

    CREATE INDEX IF NOT EXISTS idx_assessment_roster_snapshots_school_created
      ON assessment_roster_snapshots (school_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assessment_print_jobs_school_created
      ON assessment_print_jobs (school_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assessment_print_jobs_release
      ON assessment_print_jobs (school_id, release_id, created_at DESC);

    CREATE OR REPLACE FUNCTION reject_roster_snapshot_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'immutable roster snapshot cannot be modified';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS assessment_roster_snapshots_immutable ON assessment_roster_snapshots;
    CREATE TRIGGER assessment_roster_snapshots_immutable
      BEFORE UPDATE OR DELETE ON assessment_roster_snapshots
      FOR EACH ROW EXECUTE FUNCTION reject_roster_snapshot_mutation();

    CREATE OR REPLACE FUNCTION guard_print_job_binding_mutation() RETURNS trigger AS $$
    BEGIN
      IF OLD.school_id IS DISTINCT FROM NEW.school_id
         OR OLD.print_job_id IS DISTINCT FROM NEW.print_job_id
         OR OLD.release_id IS DISTINCT FROM NEW.release_id
         OR OLD.roster_snapshot_id IS DISTINCT FROM NEW.roster_snapshot_id
         OR OLD.binding_snapshot_json IS DISTINCT FROM NEW.binding_snapshot_json
         OR OLD.render_settings_json IS DISTINCT FROM NEW.render_settings_json
         OR OLD.copy_count IS DISTINCT FROM NEW.copy_count
         OR OLD.personalized IS DISTINCT FROM NEW.personalized
         OR OLD.duplex IS DISTINCT FROM NEW.duplex
         OR OLD.student_boundary_policy IS DISTINCT FROM NEW.student_boundary_policy
         OR OLD.reprint_mode IS DISTINCT FROM NEW.reprint_mode
         OR OLD.parent_print_job_id IS DISTINCT FROM NEW.parent_print_job_id
         OR OLD.created_by_key IS DISTINCT FROM NEW.created_by_key
         OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
        RAISE EXCEPTION 'immutable print job binding cannot be modified';
      END IF;
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS assessment_print_jobs_binding_immutable ON assessment_print_jobs;
    CREATE TRIGGER assessment_print_jobs_binding_immutable
      BEFORE UPDATE ON assessment_print_jobs
      FOR EACH ROW EXECUTE FUNCTION guard_print_job_binding_mutation();
  `)
}

module.exports = { up }
