const { query } = require('../database')

async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS academic_sessions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      session_key TEXT NOT NULL,
      label TEXT NOT NULL,
      starts_on DATE,
      ends_on DATE,
      version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
      supersedes_id BIGINT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, session_key, version),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, supersedes_id) REFERENCES academic_sessions(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS subject_offerings (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      stable_key TEXT NOT NULL,
      class_level TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      subject_code TEXT,
      medium VARCHAR(20) NOT NULL DEFAULT 'english',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, stable_key),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS curriculum_profiles (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      academic_session_id BIGINT NOT NULL,
      subject_offering_id BIGINT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
      authority_type VARCHAR(40),
      authority_name TEXT,
      supersedes_id BIGINT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, academic_session_id, subject_offering_id, version),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, academic_session_id) REFERENCES academic_sessions(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, subject_offering_id) REFERENCES subject_offerings(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, supersedes_id) REFERENCES curriculum_profiles(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS learning_scopes (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      curriculum_profile_id BIGINT NOT NULL,
      stable_key TEXT NOT NULL,
      scope_type VARCHAR(30) NOT NULL CHECK (scope_type IN ('chapter','topic','skill','learning_outcome','cross_chapter','general')),
      label TEXT NOT NULL,
      parent_scope_id BIGINT,
      sequence_no NUMERIC(10,3),
      external_id TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, curriculum_profile_id, stable_key),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, curriculum_profile_id) REFERENCES curriculum_profiles(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, parent_scope_id) REFERENCES learning_scopes(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS publishers (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      normalized_key TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      tenant_managed BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, normalized_key),
      UNIQUE (school_id, id)
    );

    CREATE TABLE IF NOT EXISTS publisher_aliases (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      publisher_id BIGINT NOT NULL,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, normalized_alias),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, publisher_id) REFERENCES publishers(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_series (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      publisher_id BIGINT NOT NULL,
      public_id TEXT NOT NULL,
      stable_key TEXT NOT NULL,
      label TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, publisher_id, stable_key),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, publisher_id) REFERENCES publishers(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resources (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      publisher_id BIGINT NOT NULL,
      series_id BIGINT,
      public_id TEXT NOT NULL,
      stable_key TEXT NOT NULL,
      title TEXT NOT NULL,
      resource_type VARCHAR(30) NOT NULL DEFAULT 'coursebook' CHECK (resource_type IN ('coursebook','workbook','grammar','reader','reference','other')),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, stable_key),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, publisher_id) REFERENCES publishers(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, series_id) REFERENCES resource_series(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_versions (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      resource_id BIGINT NOT NULL,
      public_id TEXT NOT NULL,
      edition_label TEXT NOT NULL,
      edition_year INTEGER,
      isbn TEXT,
      content_checksum CHAR(64),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, resource_id, edition_label),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, resource_id) REFERENCES resources(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_sets (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      academic_session_id BIGINT NOT NULL,
      subject_offering_id BIGINT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
      label TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
      supersedes_id BIGINT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, academic_session_id, subject_offering_id, version),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, academic_session_id) REFERENCES academic_sessions(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, subject_offering_id) REFERENCES subject_offerings(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, supersedes_id) REFERENCES resource_sets(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_set_items (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      resource_set_id BIGINT NOT NULL,
      resource_version_id BIGINT NOT NULL,
      resource_role VARCHAR(20) NOT NULL CHECK (resource_role IN ('primary','supporting')),
      sequence_no INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, resource_set_id, resource_version_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, resource_set_id) REFERENCES resource_sets(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, resource_version_id) REFERENCES resource_versions(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resource_scope_mappings (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      resource_version_id BIGINT NOT NULL,
      learning_scope_id BIGINT NOT NULL,
      locator_key TEXT NOT NULL,
      locator JSONB NOT NULL DEFAULT '{}'::jsonb,
      mapping_status VARCHAR(20) NOT NULL DEFAULT 'candidate' CHECK (mapping_status IN ('candidate','reviewed','ready','retired')),
      confidence NUMERIC(5,4),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      UNIQUE (school_id, resource_version_id, learning_scope_id, locator_key),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, resource_version_id) REFERENCES resource_versions(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, learning_scope_id) REFERENCES learning_scopes(school_id, id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS curriculum_migration_runs (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      public_id TEXT NOT NULL,
      from_profile_id BIGINT NOT NULL,
      to_profile_id BIGINT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','applied','failed')),
      plan JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      applied_at TIMESTAMPTZ,
      UNIQUE (school_id, public_id),
      UNIQUE (school_id, id),
      FOREIGN KEY (school_id, from_profile_id) REFERENCES curriculum_profiles(school_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (school_id, to_profile_id) REFERENCES curriculum_profiles(school_id, id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_curriculum_profile_lookup ON curriculum_profiles (school_id, academic_session_id, subject_offering_id, status, version DESC);
    CREATE INDEX IF NOT EXISTS idx_learning_scope_profile ON learning_scopes (school_id, curriculum_profile_id, scope_type, sequence_no);
    CREATE INDEX IF NOT EXISTS idx_resource_version_resource ON resource_versions (school_id, resource_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_resource_set_lookup ON resource_sets (school_id, academic_session_id, subject_offering_id, status, version DESC);
    CREATE INDEX IF NOT EXISTS idx_resource_scope_ready ON resource_scope_mappings (school_id, mapping_status, learning_scope_id);

    CREATE OR REPLACE FUNCTION reject_published_version_mutation() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = 'published' THEN
        RAISE EXCEPTION 'published version is immutable';
      END IF;
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS academic_sessions_published_immutable ON academic_sessions;
    CREATE TRIGGER academic_sessions_published_immutable BEFORE UPDATE OR DELETE ON academic_sessions
      FOR EACH ROW EXECUTE FUNCTION reject_published_version_mutation();
    DROP TRIGGER IF EXISTS curriculum_profiles_published_immutable ON curriculum_profiles;
    CREATE TRIGGER curriculum_profiles_published_immutable BEFORE UPDATE OR DELETE ON curriculum_profiles
      FOR EACH ROW EXECUTE FUNCTION reject_published_version_mutation();
    DROP TRIGGER IF EXISTS resource_sets_published_immutable ON resource_sets;
    CREATE TRIGGER resource_sets_published_immutable BEFORE UPDATE OR DELETE ON resource_sets
      FOR EACH ROW EXECUTE FUNCTION reject_published_version_mutation();

    CREATE OR REPLACE FUNCTION reject_resource_version_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'resource edition/version is immutable';
    END;
    $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS resource_versions_immutable ON resource_versions;
    CREATE TRIGGER resource_versions_immutable BEFORE UPDATE OR DELETE ON resource_versions
      FOR EACH ROW EXECUTE FUNCTION reject_resource_version_mutation();

    CREATE OR REPLACE FUNCTION guard_learning_scope_mutation() RETURNS trigger AS $$
    DECLARE profile_id BIGINT;
    DECLARE profile_status TEXT;
    BEGIN
      profile_id := COALESCE(NEW.curriculum_profile_id, OLD.curriculum_profile_id);
      SELECT status INTO profile_status FROM curriculum_profiles WHERE school_id=COALESCE(NEW.school_id, OLD.school_id) AND id=profile_id;
      IF profile_status = 'published' THEN
        RAISE EXCEPTION 'learning scopes of a published curriculum profile are immutable';
      END IF;
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END;
    $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS learning_scopes_published_guard ON learning_scopes;
    CREATE TRIGGER learning_scopes_published_guard BEFORE INSERT OR UPDATE OR DELETE ON learning_scopes
      FOR EACH ROW EXECUTE FUNCTION guard_learning_scope_mutation();

    CREATE OR REPLACE FUNCTION guard_resource_set_item_mutation() RETURNS trigger AS $$
    DECLARE set_id BIGINT;
    DECLARE set_status TEXT;
    BEGIN
      set_id := COALESCE(NEW.resource_set_id, OLD.resource_set_id);
      SELECT status INTO set_status FROM resource_sets WHERE school_id=COALESCE(NEW.school_id, OLD.school_id) AND id=set_id;
      IF set_status = 'published' THEN
        RAISE EXCEPTION 'items of a published resource set are immutable';
      END IF;
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END;
    $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS resource_set_items_published_guard ON resource_set_items;
    CREATE TRIGGER resource_set_items_published_guard BEFORE INSERT OR UPDATE OR DELETE ON resource_set_items
      FOR EACH ROW EXECUTE FUNCTION guard_resource_set_item_mutation();
  `)
  console.log('Curriculum/resource versioning V1 migration ready')
}

module.exports = { up }
