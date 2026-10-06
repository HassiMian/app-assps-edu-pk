const { query } = require('../database')

async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS subject_offerings (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      class_level VARCHAR(40) NOT NULL,
      subject_code VARCHAR(80),
      subject_name VARCHAR(160) NOT NULL,
      medium VARCHAR(30),
      board_authority VARCHAR(120),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS academic_sessions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS academic_session_versions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      academic_session_id BIGINT NOT NULL,
      version_number INTEGER NOT NULL CHECK (version_number > 0),
      label VARCHAR(120) NOT NULL,
      starts_on DATE,
      ends_on DATE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, academic_session_id, version_number),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, academic_session_id) REFERENCES academic_sessions(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS curriculum_profiles (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      subject_offering_id BIGINT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, subject_offering_id) REFERENCES subject_offerings(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS curriculum_profile_versions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      curriculum_profile_id BIGINT NOT NULL,
      academic_session_version_id BIGINT NOT NULL,
      version_number INTEGER NOT NULL CHECK (version_number > 0),
      predecessor_version_id BIGINT,
      label VARCHAR(180) NOT NULL,
      curriculum_authority VARCHAR(160),
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, curriculum_profile_id, version_number),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, curriculum_profile_id) REFERENCES curriculum_profiles(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, academic_session_version_id) REFERENCES academic_session_versions(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, predecessor_version_id) REFERENCES curriculum_profile_versions(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS learning_scope_identities (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      subject_offering_id BIGINT NOT NULL,
      canonical_key TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, subject_offering_id, canonical_key),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, subject_offering_id) REFERENCES subject_offerings(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS learning_scope_versions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      learning_scope_id BIGINT NOT NULL,
      curriculum_profile_version_id BIGINT NOT NULL,
      scope_type VARCHAR(30) NOT NULL CHECK (scope_type IN ('chapter','topic','skill','learning_outcome','slo','cross_chapter','general')),
      label VARCHAR(240) NOT NULL,
      parent_learning_scope_id BIGINT,
      sort_order NUMERIC(12,4),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, learning_scope_id, curriculum_profile_version_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, learning_scope_id) REFERENCES learning_scope_identities(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, curriculum_profile_version_id) REFERENCES curriculum_profile_versions(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, parent_learning_scope_id) REFERENCES learning_scope_identities(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS publishers (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      name VARCHAR(180) NOT NULL,
      canonical_alias VARCHAR(180),
      managed_by_tenant BOOLEAN NOT NULL DEFAULT TRUE,
      merged_into_publisher_id BIGINT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, merged_into_publisher_id) REFERENCES publishers(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_series (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      publisher_id BIGINT NOT NULL,
      public_id TEXT NOT NULL,
      title VARCHAR(220) NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, publisher_id) REFERENCES publishers(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_books (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      resource_series_id BIGINT,
      publisher_id BIGINT NOT NULL,
      public_id TEXT NOT NULL,
      title VARCHAR(260) NOT NULL,
      resource_kind VARCHAR(30) NOT NULL DEFAULT 'coursebook' CHECK (resource_kind IN ('coursebook','workbook','grammar','reader','reference','teacher_guide','other')),
      isbn TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, resource_series_id) REFERENCES resource_series(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, publisher_id) REFERENCES publishers(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_versions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      resource_book_id BIGINT NOT NULL,
      version_number INTEGER NOT NULL CHECK (version_number > 0),
      edition_label VARCHAR(160),
      publication_year INTEGER,
      checksum_sha256 CHAR(64),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, resource_book_id, version_number),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, resource_book_id) REFERENCES resource_books(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_sets (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      subject_offering_id BIGINT NOT NULL,
      public_id TEXT NOT NULL,
      label VARCHAR(200) NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, subject_offering_id) REFERENCES subject_offerings(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_set_items (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      resource_set_id BIGINT NOT NULL,
      resource_version_id BIGINT NOT NULL,
      resource_role VARCHAR(20) NOT NULL CHECK (resource_role IN ('primary','supporting')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, resource_set_id, resource_version_id),
      FOREIGN KEY (school_id, resource_set_id) REFERENCES resource_sets(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, resource_version_id) REFERENCES resource_versions(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_scope_mappings (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      resource_version_id BIGINT NOT NULL,
      learning_scope_id BIGINT NOT NULL,
      source_locator JSONB NOT NULL DEFAULT '{}'::jsonb,
      mapping_status VARCHAR(20) NOT NULL DEFAULT 'candidate' CHECK (mapping_status IN ('candidate','reviewed','ready','retired')),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      UNIQUE (school_id, resource_version_id, learning_scope_id),
      FOREIGN KEY (school_id, resource_version_id) REFERENCES resource_versions(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, learning_scope_id) REFERENCES learning_scope_identities(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS curriculum_migration_plans (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      from_profile_version_id BIGINT NOT NULL,
      to_profile_version_id BIGINT NOT NULL,
      plan_hash CHAR(64) NOT NULL,
      plan_json JSONB NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, from_profile_version_id, to_profile_version_id, plan_hash),
      FOREIGN KEY (school_id, from_profile_version_id) REFERENCES curriculum_profile_versions(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, to_profile_version_id) REFERENCES curriculum_profile_versions(school_id, id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_curriculum_profile_versions ON curriculum_profile_versions (school_id, curriculum_profile_id, version_number DESC);
    CREATE INDEX IF NOT EXISTS idx_learning_scope_profile_version ON learning_scope_versions (school_id, curriculum_profile_version_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_resource_set_subject ON resource_sets (school_id, subject_offering_id);
    CREATE INDEX IF NOT EXISTS idx_resource_mapping_scope ON resource_scope_mappings (school_id, learning_scope_id, mapping_status);

    CREATE OR REPLACE FUNCTION reject_curriculum_immutable_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'immutable curriculum/resource version cannot be modified';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS academic_session_versions_immutable ON academic_session_versions;
    CREATE TRIGGER academic_session_versions_immutable BEFORE UPDATE OR DELETE ON academic_session_versions FOR EACH ROW EXECUTE FUNCTION reject_curriculum_immutable_mutation();
    DROP TRIGGER IF EXISTS curriculum_profile_versions_immutable ON curriculum_profile_versions;
    CREATE TRIGGER curriculum_profile_versions_immutable BEFORE UPDATE OR DELETE ON curriculum_profile_versions FOR EACH ROW EXECUTE FUNCTION reject_curriculum_immutable_mutation();
    DROP TRIGGER IF EXISTS learning_scope_versions_immutable ON learning_scope_versions;
    CREATE TRIGGER learning_scope_versions_immutable BEFORE UPDATE OR DELETE ON learning_scope_versions FOR EACH ROW EXECUTE FUNCTION reject_curriculum_immutable_mutation();
    DROP TRIGGER IF EXISTS resource_versions_immutable ON resource_versions;
    CREATE TRIGGER resource_versions_immutable BEFORE UPDATE OR DELETE ON resource_versions FOR EACH ROW EXECUTE FUNCTION reject_curriculum_immutable_mutation();
    DROP TRIGGER IF EXISTS curriculum_migration_plans_immutable ON curriculum_migration_plans;
    CREATE TRIGGER curriculum_migration_plans_immutable BEFORE UPDATE OR DELETE ON curriculum_migration_plans FOR EACH ROW EXECUTE FUNCTION reject_curriculum_immutable_mutation();
  `)
  console.log('Curriculum/resource model V1 migration ready')
}

module.exports = { up }
