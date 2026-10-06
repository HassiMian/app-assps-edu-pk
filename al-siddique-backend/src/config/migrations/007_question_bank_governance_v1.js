const { query } = require('../database')

async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS question_masters (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      canonical_fingerprint CHAR(64) NOT NULL,
      source_question_bank_id TEXT,
      lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'candidate' CHECK (lifecycle_status IN ('candidate','reviewed','ready','retired')),
      current_revision INTEGER NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, canonical_fingerprint),
      UNIQUE (school_id, source_question_bank_id),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS question_revisions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      question_master_id BIGINT NOT NULL,
      revision_number INTEGER NOT NULL CHECK (revision_number > 0),
      content_json JSONB NOT NULL,
      content_hash CHAR(64) NOT NULL,
      revision_reason TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, question_master_id, revision_number),
      UNIQUE (school_id, question_master_id, content_hash),
      FOREIGN KEY (school_id, question_master_id) REFERENCES question_masters(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS question_mappings (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      question_master_id BIGINT NOT NULL,
      mapping_type VARCHAR(40) NOT NULL,
      mapping_key TEXT NOT NULL,
      mapping_status VARCHAR(20) NOT NULL DEFAULT 'candidate' CHECK (mapping_status IN ('candidate','reviewed','ready','retired')),
      confidence NUMERIC(5,4),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      UNIQUE (school_id, question_master_id, mapping_type, mapping_key),
      FOREIGN KEY (school_id, question_master_id) REFERENCES question_masters(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS question_capture_requests (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      idempotency_key TEXT NOT NULL,
      canonical_fingerprint CHAR(64) NOT NULL,
      question_master_id BIGINT,
      request_hash CHAR(64) NOT NULL,
      result_json JSONB,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, idempotency_key),
      FOREIGN KEY (school_id, question_master_id) REFERENCES question_masters(school_id, id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_question_master_status ON question_masters (school_id, lifecycle_status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_question_revision_master ON question_revisions (school_id, question_master_id, revision_number DESC);
    CREATE INDEX IF NOT EXISTS idx_question_mapping_status ON question_mappings (school_id, mapping_status, mapping_type);
    CREATE INDEX IF NOT EXISTS idx_question_capture_fingerprint ON question_capture_requests (school_id, canonical_fingerprint);

    CREATE OR REPLACE FUNCTION reject_question_revision_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'immutable question revision cannot be modified';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS question_revisions_immutable ON question_revisions;
    CREATE TRIGGER question_revisions_immutable BEFORE UPDATE OR DELETE ON question_revisions
      FOR EACH ROW EXECUTE FUNCTION reject_question_revision_mutation();
  `)
  console.log('Question Bank governance V1 migration ready')
}

module.exports = { up }
