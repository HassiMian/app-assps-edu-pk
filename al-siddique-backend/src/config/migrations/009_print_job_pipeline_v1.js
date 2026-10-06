const { query } = require('../database')

async function up() {
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_releases_school_id_id ON assessment_releases (school_id, id);

    CREATE TABLE IF NOT EXISTS roster_snapshots (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      class_name VARCHAR(100) NOT NULL,
      section VARCHAR(50),
      student_count INTEGER NOT NULL CHECK (student_count >= 0),
      roster_hash CHAR(64) NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS roster_snapshot_members (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      roster_snapshot_id BIGINT NOT NULL,
      ordinal INTEGER NOT NULL CHECK (ordinal > 0),
      student_id INTEGER,
      student_key TEXT,
      display_name VARCHAR(160) NOT NULL,
      roll_number VARCHAR(40),
      class_name VARCHAR(100) NOT NULL,
      section VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, roster_snapshot_id, ordinal),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, roster_snapshot_id) REFERENCES roster_snapshots(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS teacher_binding_snapshots (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      class_name VARCHAR(100) NOT NULL,
      section VARCHAR(50),
      subject VARCHAR(160) NOT NULL,
      teacher_user_id INTEGER,
      teacher_name VARCHAR(160) NOT NULL,
      binding_source VARCHAR(30) NOT NULL CHECK (binding_source IN ('assignment','manual_override')),
      source_assignment_id INTEGER,
      override_reason TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS print_jobs (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      assessment_release_id BIGINT NOT NULL,
      roster_snapshot_id BIGINT,
      teacher_binding_snapshot_id BIGINT,
      artifact_kind VARCHAR(30) NOT NULL CHECK (artifact_kind IN ('student_batch','master','staff_answer_key')),
      personalized BOOLEAN NOT NULL DEFAULT FALSE,
      duplex BOOLEAN NOT NULL DEFAULT FALSE,
      copy_count INTEGER NOT NULL DEFAULT 1 CHECK (copy_count > 0 AND copy_count <= 500),
      status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','rendering','ready','printing','completed','cancelled','failed')),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      renderer_version TEXT NOT NULL,
      browser_engine_version TEXT,
      settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, assessment_release_id) REFERENCES assessment_releases(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, roster_snapshot_id) REFERENCES roster_snapshots(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, teacher_binding_snapshot_id) REFERENCES teacher_binding_snapshots(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS print_job_booklets (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      print_job_id BIGINT NOT NULL,
      roster_member_id BIGINT NOT NULL,
      booklet_index INTEGER NOT NULL CHECK (booklet_index > 0),
      start_page INTEGER NOT NULL CHECK (start_page > 0),
      content_pages INTEGER NOT NULL CHECK (content_pages > 0),
      padding_pages INTEGER NOT NULL DEFAULT 0 CHECK (padding_pages >= 0),
      artifact_hash CHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, print_job_id, booklet_index),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, print_job_id) REFERENCES print_jobs(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, roster_member_id) REFERENCES roster_snapshot_members(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS print_job_attempts (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      print_job_id BIGINT NOT NULL,
      attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
      status VARCHAR(24) NOT NULL CHECK (status IN ('printing','completed','cancelled','failed')),
      operator_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      note TEXT,
      actor_id INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, print_job_id, attempt_number),
      FOREIGN KEY (school_id, print_job_id) REFERENCES print_jobs(school_id, id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_roster_snapshot_class ON roster_snapshots (school_id, class_name, section, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_print_jobs_release ON print_jobs (school_id, assessment_release_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs (school_id, status, created_at DESC);

    CREATE OR REPLACE FUNCTION reject_print_snapshot_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'immutable print snapshot/history cannot be modified';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS roster_snapshots_immutable ON roster_snapshots;
    CREATE TRIGGER roster_snapshots_immutable BEFORE UPDATE OR DELETE ON roster_snapshots FOR EACH ROW EXECUTE FUNCTION reject_print_snapshot_mutation();
    DROP TRIGGER IF EXISTS roster_snapshot_members_immutable ON roster_snapshot_members;
    CREATE TRIGGER roster_snapshot_members_immutable BEFORE UPDATE OR DELETE ON roster_snapshot_members FOR EACH ROW EXECUTE FUNCTION reject_print_snapshot_mutation();
    DROP TRIGGER IF EXISTS teacher_binding_snapshots_immutable ON teacher_binding_snapshots;
    CREATE TRIGGER teacher_binding_snapshots_immutable BEFORE UPDATE OR DELETE ON teacher_binding_snapshots FOR EACH ROW EXECUTE FUNCTION reject_print_snapshot_mutation();
    DROP TRIGGER IF EXISTS print_job_booklets_immutable ON print_job_booklets;
    CREATE TRIGGER print_job_booklets_immutable BEFORE UPDATE OR DELETE ON print_job_booklets FOR EACH ROW EXECUTE FUNCTION reject_print_snapshot_mutation();
    DROP TRIGGER IF EXISTS print_job_attempts_immutable ON print_job_attempts;
    CREATE TRIGGER print_job_attempts_immutable BEFORE UPDATE OR DELETE ON print_job_attempts FOR EACH ROW EXECUTE FUNCTION reject_print_snapshot_mutation();
  `)
  console.log('PrintJob pipeline V1 migration ready')
}

module.exports = { up }
