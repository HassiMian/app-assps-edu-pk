'use strict'
const {pool}=require('../src/config/database')
const ROLE=/^[a-z_][a-z0-9_]*$/i
async function up(options={}) {
 const db=options.pool||pool
 const role=String(options.runtimeRole||process.env.DB_RUNTIME_ROLE||'').trim()
 if(!ROLE.test(role))throw Error('GRADE910_RUNTIME_RESTRICTED_ROLE_REQUIRED')
 const client=await db.connect()
 try {
  await client.query('BEGIN')
  const guard=await client.query("SELECT to_regprocedure('core_security.signed_school_allowed(integer)') AS f")
  if(!guard.rows[0]?.f)throw Error('GRADE910_SIGNED_RLS_GUARD_NOT_INSTALLED')
  const actor=await client.query('SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname=$1',[role])
  if(actor.rows.length!==1||actor.rows[0].rolbypassrls||actor.rows[0].rolsuper)
   throw Error('GRADE910_RUNTIME_ROLE_MUST_BE_NOBYPASS_AND_NOSUPERUSER')
  await client.query(`
   CREATE TABLE IF NOT EXISTS grade910_human_signoff_evidence (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id),
    actor_user_id INTEGER NOT NULL REFERENCES users(id),
    actor_role VARCHAR(24) NOT NULL CHECK (actor_role IN ('teacher','principal','admin','school_admin')),
    action VARCHAR(32) NOT NULL CHECK(action IN ('subject_review','urdu_review','book_adoption','principal_approval')),
    catalog_id VARCHAR(128) NOT NULL,
    original_catalog_pdf_sha CHAR(64) NOT NULL,
    original_question_set_sha CHAR(64) NOT NULL,
    question_id VARCHAR(180),
    question_sha CHAR(64),
    answer_sha CHAR(64),
    evidence_sha CHAR(64),
    teacher_receipt_sha CHAR(64),
    academic_session VARCHAR(16) NOT NULL CHECK (academic_session='2026-27'),
    board_year INTEGER NOT NULL CHECK (board_year=2027),
    image_sha CHAR(64) NOT NULL,
    image_ciphertext BYTEA NOT NULL CHECK (octet_length(image_ciphertext) BETWEEN 40 AND 122880),
    image_nonce BYTEA NOT NULL CHECK (octet_length(image_nonce)=12),
    image_tag BYTEA NOT NULL CHECK (octet_length(image_tag)=16),
    claim_sha CHAR(64) NOT NULL,
    review_claim JSONB NOT NULL,
    verification_status VARCHAR(40) NOT NULL DEFAULT 'PENDING_SCHOOL_IDENTITY_VERIFICATION'
      CHECK(verification_status='PENDING_SCHOOL_IDENTITY_VERIFICATION'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(school_id,actor_user_id,claim_sha)
   );
   ALTER TABLE grade910_human_signoff_evidence ENABLE ROW LEVEL SECURITY;
   ALTER TABLE grade910_human_signoff_evidence FORCE ROW LEVEL SECURITY;
   REVOKE ALL ON grade910_human_signoff_evidence FROM PUBLIC;
   DROP POLICY IF EXISTS grade910_signoff_signed_school ON grade910_human_signoff_evidence;
   CREATE POLICY grade910_signoff_signed_school ON grade910_human_signoff_evidence
    FOR ALL USING (core_security.signed_school_allowed(school_id))
    WITH CHECK (core_security.signed_school_allowed(school_id));
  `)
  await client.query('GRANT SELECT,INSERT ON grade910_human_signoff_evidence TO "'+role+'"')
  await client.query('GRANT USAGE,SELECT ON SEQUENCE grade910_human_signoff_evidence_id_seq TO "'+role+'"')
  const checks=await client.query(`
   SELECT c.relrowsecurity,c.relforcerowsecurity,p.polname
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   LEFT JOIN pg_policy p ON p.polrelid=c.oid
   WHERE n.nspname='public' AND c.relname='grade910_human_signoff_evidence'
  `)
  if(checks.rows.length!==1||!checks.rows[0].relrowsecurity||!checks.rows[0].relforcerowsecurity||
      checks.rows[0].polname!=='grade910_signoff_signed_school')
   throw Error('GRADE910_SIGNED_RLS_POLICY_NOT_ENFORCED')
  await client.query('COMMIT')
  return {created:true,privateSignatures:true,signedRlsEnforced:true,publicReadable:false,releaseAllowed:false}
 }catch(e){
  try{await client.query('ROLLBACK')}catch(_){}
  throw e
 }finally{await client.release()}
}
module.exports={up}
