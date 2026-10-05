-- V6-F1 dormant canonical paper registry foundation.
-- DBA migration: creates restricted cluster roles + empty canonical tables only.
-- NO paper_vault copy, NO dual-write, NO automatic source identity fabrication.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_paper_owner') THEN
    CREATE ROLE apex_paper_owner NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  ELSE
    ALTER ROLE apex_paper_owner NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_paper_runtime') THEN
    CREATE ROLE apex_paper_runtime NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  ELSE
    ALTER ROLE apex_paper_runtime NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END $$;

-- PostgreSQL 16 membership options: apexos_user may explicitly SET ROLE only.
GRANT apex_paper_runtime TO apexos_user WITH INHERIT FALSE, SET TRUE;

CREATE TABLE IF NOT EXISTS paper_documents (
  id BIGSERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  document_family VARCHAR(64) NOT NULL CHECK (document_family IN ('historical-v13','approved-curriculum-authoring')),
  document_format VARCHAR(80) NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  title VARCHAR(220),
  class_name VARCHAR(120),
  section VARCHAR(60),
  subject_name VARCHAR(160),
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','archived')),
  current_revision INTEGER NOT NULL DEFAULT 1 CHECK (current_revision >= 1),
  payload_hash CHAR(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload)='object'),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT paper_documents_family_discriminator_ck CHECK (
    (document_family='historical-v13' AND document_format='assps-canonical-paper' AND schema_version=3)
    OR
    (document_family='approved-curriculum-authoring' AND document_format='assps-new-authoring-paper' AND schema_version=1)
  ),
  UNIQUE (school_id,id)
);

CREATE TABLE IF NOT EXISTS paper_revisions (
  school_id INTEGER NOT NULL,
  paper_document_id BIGINT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_kind VARCHAR(40) NOT NULL CHECK (event_kind IN ('canonical_create','canonical_edit','approved_import','archive')),
  document_family VARCHAR(64) NOT NULL CHECK (document_family IN ('historical-v13','approved-curriculum-authoring')),
  document_format VARCHAR(80) NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  payload_hash CHAR(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload)='object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (school_id,paper_document_id,revision),
  CONSTRAINT paper_revisions_document_fk FOREIGN KEY (school_id,paper_document_id)
    REFERENCES paper_documents(school_id,id) ON DELETE RESTRICT,
  CONSTRAINT paper_revisions_family_discriminator_ck CHECK (
    (document_family='historical-v13' AND document_format='assps-canonical-paper' AND schema_version=3)
    OR
    (document_family='approved-curriculum-authoring' AND document_format='assps-new-authoring-paper' AND schema_version=1)
  )
);

CREATE INDEX IF NOT EXISTS idx_paper_documents_school_owner_updated
  ON paper_documents(school_id,owner_user_id,updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_paper_documents_school_class_subject
  ON paper_documents(school_id,LOWER(COALESCE(class_name,'')),LOWER(COALESCE(subject_name,''))) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_paper_revisions_document_latest
  ON paper_revisions(school_id,paper_document_id,revision DESC);

ALTER TABLE paper_documents OWNER TO apex_paper_owner;
ALTER SEQUENCE paper_documents_id_seq OWNER TO apex_paper_owner;
ALTER TABLE paper_revisions OWNER TO apex_paper_owner;

REVOKE ALL ON TABLE paper_documents,paper_revisions FROM PUBLIC,apexos_user;
REVOKE ALL ON SEQUENCE paper_documents_id_seq FROM PUBLIC,apexos_user;
GRANT SELECT,INSERT,UPDATE ON TABLE paper_documents TO apex_paper_runtime;
GRANT SELECT,INSERT ON TABLE paper_revisions TO apex_paper_runtime;
GRANT USAGE,SELECT ON SEQUENCE paper_documents_id_seq TO apex_paper_runtime;

ALTER TABLE paper_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE paper_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_revisions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_tenant_isolation ON paper_documents;
CREATE POLICY canonical_tenant_isolation ON paper_documents
  FOR ALL TO apex_paper_runtime
  USING (school_id = NULLIF(current_setting('app.tenant_id',true),'')::int)
  WITH CHECK (school_id = NULLIF(current_setting('app.tenant_id',true),'')::int);
DROP POLICY IF EXISTS canonical_tenant_isolation ON paper_revisions;
CREATE POLICY canonical_tenant_isolation ON paper_revisions
  FOR ALL TO apex_paper_runtime
  USING (school_id = NULLIF(current_setting('app.tenant_id',true),'')::int)
  WITH CHECK (school_id = NULLIF(current_setting('app.tenant_id',true),'')::int);

CREATE OR REPLACE FUNCTION paper_canonical_write_guard_v6f1() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.paper_canonical_write_enabled',true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'canonical paper registry write gate is disabled' USING ERRCODE='42501';
  END IF;
  IF NULLIF(current_setting('app.tenant_id',true),'') IS NULL THEN
    RAISE EXCEPTION 'canonical paper registry tenant context is required' USING ERRCODE='42501';
  END IF;
  IF NEW.school_id IS DISTINCT FROM current_setting('app.tenant_id',true)::int THEN
    RAISE EXCEPTION 'canonical paper registry school mismatch' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
ALTER FUNCTION paper_canonical_write_guard_v6f1() OWNER TO apex_paper_owner;
REVOKE ALL ON FUNCTION paper_canonical_write_guard_v6f1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION paper_canonical_write_guard_v6f1() TO apex_paper_runtime;

DROP TRIGGER IF EXISTS trg_paper_documents_write_guard_v6f1 ON paper_documents;
CREATE TRIGGER trg_paper_documents_write_guard_v6f1
BEFORE INSERT OR UPDATE ON paper_documents
FOR EACH ROW EXECUTE FUNCTION paper_canonical_write_guard_v6f1();
DROP TRIGGER IF EXISTS trg_paper_revisions_write_guard_v6f1 ON paper_revisions;
CREATE TRIGGER trg_paper_revisions_write_guard_v6f1
BEFORE INSERT ON paper_revisions
FOR EACH ROW EXECUTE FUNCTION paper_canonical_write_guard_v6f1();

CREATE OR REPLACE FUNCTION paper_canonical_revision_immutable_v6f1() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  RAISE EXCEPTION 'canonical paper revisions are immutable' USING ERRCODE='42501';
END $$;
ALTER FUNCTION paper_canonical_revision_immutable_v6f1() OWNER TO apex_paper_owner;
REVOKE ALL ON FUNCTION paper_canonical_revision_immutable_v6f1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION paper_canonical_revision_immutable_v6f1() TO apex_paper_runtime;
DROP TRIGGER IF EXISTS trg_paper_revisions_immutable_v6f1 ON paper_revisions;
CREATE TRIGGER trg_paper_revisions_immutable_v6f1
BEFORE UPDATE OR DELETE ON paper_revisions
FOR EACH ROW EXECUTE FUNCTION paper_canonical_revision_immutable_v6f1();

-- Hard delete of the current document is prohibited; archival uses status/deleted_at later.
CREATE OR REPLACE FUNCTION paper_canonical_document_no_delete_v6f1() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  RAISE EXCEPTION 'canonical paper documents cannot be hard deleted' USING ERRCODE='42501';
END $$;
ALTER FUNCTION paper_canonical_document_no_delete_v6f1() OWNER TO apex_paper_owner;
REVOKE ALL ON FUNCTION paper_canonical_document_no_delete_v6f1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION paper_canonical_document_no_delete_v6f1() TO apex_paper_runtime;
DROP TRIGGER IF EXISTS trg_paper_documents_no_delete_v6f1 ON paper_documents;
CREATE TRIGGER trg_paper_documents_no_delete_v6f1
BEFORE DELETE ON paper_documents
FOR EACH ROW EXECUTE FUNCTION paper_canonical_document_no_delete_v6f1();

COMMENT ON TABLE paper_documents IS 'V6-F1 dormant canonical SaaS paper registry. No dual-write/cutover until explicit gates pass.';
COMMENT ON TABLE paper_revisions IS 'V6-F1 immutable canonical paper revision journal.';
