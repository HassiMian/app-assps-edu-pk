-- V6-F2 canonical registry defense-in-depth.
-- Locks relational discriminator columns to the JSON payload discriminator.
-- No data copy, no repository cutover, no write-gate enablement.

ALTER TABLE paper_documents
  DROP CONSTRAINT IF EXISTS paper_documents_payload_discriminator_v6f2_ck;
ALTER TABLE paper_documents
  ADD CONSTRAINT paper_documents_payload_discriminator_v6f2_ck CHECK (
    payload ? 'format'
    AND payload ? 'documentModel'
    AND payload ? 'schemaVersion'
    AND payload->>'format' = document_format
    AND (payload->>'schemaVersion') ~ '^[0-9]+$'
    AND (payload->>'schemaVersion')::integer = schema_version
    AND (
      (document_family='historical-v13' AND payload->>'documentModel'='PaperDocumentV2')
      OR
      (document_family='approved-curriculum-authoring' AND payload->>'documentModel'='PaperDocumentNewAuthoring')
    )
  ) NOT VALID;
ALTER TABLE paper_documents VALIDATE CONSTRAINT paper_documents_payload_discriminator_v6f2_ck;

ALTER TABLE paper_revisions
  DROP CONSTRAINT IF EXISTS paper_revisions_payload_discriminator_v6f2_ck;
ALTER TABLE paper_revisions
  ADD CONSTRAINT paper_revisions_payload_discriminator_v6f2_ck CHECK (
    payload ? 'format'
    AND payload ? 'documentModel'
    AND payload ? 'schemaVersion'
    AND payload->>'format' = document_format
    AND (payload->>'schemaVersion') ~ '^[0-9]+$'
    AND (payload->>'schemaVersion')::integer = schema_version
    AND (
      (document_family='historical-v13' AND payload->>'documentModel'='PaperDocumentV2')
      OR
      (document_family='approved-curriculum-authoring' AND payload->>'documentModel'='PaperDocumentNewAuthoring')
    )
  ) NOT VALID;
ALTER TABLE paper_revisions VALIDATE CONSTRAINT paper_revisions_payload_discriminator_v6f2_ck;

COMMENT ON CONSTRAINT paper_documents_payload_discriminator_v6f2_ck ON paper_documents IS
  'V6-F2: relational paper discriminator must exactly match the JSON PaperDocument discriminator.';
COMMENT ON CONSTRAINT paper_revisions_payload_discriminator_v6f2_ck ON paper_revisions IS
  'V6-F2: immutable revision discriminator must exactly match its JSON PaperDocument discriminator.';
