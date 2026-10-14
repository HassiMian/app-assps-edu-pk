'use strict'
// Additive, NO implicit publication. Academic and Paper Studio owners jointly hold publication permission.
const {pool}=require('../src/config/database')
const SAFE=/^[a-z_][a-z0-9_]*$/i
async function up(options={}){
 const db=options.pool||pool,role=String(options.runtimeRole||process.env.DB_RUNTIME_ROLE||'')
 if(!SAFE.test(role))throw Error('G910_SELECTOR_RESTRICTED_ROLE_REQUIRED')
 const c=await db.connect()
 try{
  await c.query('BEGIN')
  const funcs=await c.query("SELECT to_regprocedure('core_security.signed_school_allowed(integer)') AS f")
  if(!funcs.rows[0]?.f)throw Error('G910_SELECTOR_SIGNED_CORE_RLS_REQUIRED')
  const rr=await c.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1',[role])
  if(rr.rows.length!==1||rr.rows[0].rolsuper||rr.rows[0].rolbypassrls)
   throw Error('G910_SELECTOR_NOBYPASS_RUNTIME_ROLE_REQUIRED')
  await c.query(`
   CREATE TABLE IF NOT EXISTS grade910_verified_paper_publications(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id),
    original_question_id VARCHAR(180) NOT NULL,
    question_revision INTEGER NOT NULL CHECK(question_revision>0),
    question_sha CHAR(64) NOT NULL CHECK(question_sha~'^[0-9a-f]{64}$'),
    answer_sha CHAR(64) NOT NULL CHECK(answer_sha~'^[0-9a-f]{64}$'),
    catalog_id VARCHAR(128) NOT NULL,
    original_source_pdf_sha CHAR(64) NOT NULL CHECK(original_source_pdf_sha~'^[0-9a-f]{64}$'),
    grade INTEGER NOT NULL CHECK(grade IN(9,10)),
    medium VARCHAR(8) NOT NULL CHECK(medium IN('english','urdu','dual')),
    subject VARCHAR(120) NOT NULL,
    paper_payload JSONB NOT NULL CHECK(jsonb_typeof(paper_payload)='object' AND
      paper_payload ? 'finalQuestion' AND paper_payload ? 'finalAnswer' AND
      paper_payload ? 'originalQuestionId' AND paper_payload ? 'questionRevision'),
    verified_review_packet_sha CHAR(64) NOT NULL CHECK(verified_review_packet_sha~'^[0-9a-f]{64}$'),
    qualified_faculty_receipt_sha CHAR(64) NOT NULL CHECK(qualified_faculty_receipt_sha~'^[0-9a-f]{64}$'),
    school_book_certificate_sha CHAR(64) NOT NULL CHECK(school_book_certificate_sha~'^[0-9a-f]{64}$'),
    principal_approval_sha CHAR(64) NOT NULL CHECK(principal_approval_sha~'^[0-9a-f]{64}$'),
    publication_grant_sha CHAR(64) NOT NULL CHECK(publication_grant_sha~'^[0-9a-f]{64}$'),
    academic_approval_verified BOOLEAN NOT NULL DEFAULT false CHECK(academic_approval_verified=true),
    paper_studio_acceptance_verified BOOLEAN NOT NULL DEFAULT false CHECK(paper_studio_acceptance_verified=true),
    core_restricted_release_verified BOOLEAN NOT NULL DEFAULT false CHECK(core_restricted_release_verified=true),
    published_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    UNIQUE(school_id,original_question_id,question_revision)
   );
   CREATE INDEX IF NOT EXISTS idx_g910_verified_paper_picker
    ON grade910_verified_paper_publications(school_id,grade,subject,question_revision)
    WHERE revoked_at IS NULL;
   ALTER TABLE grade910_verified_paper_publications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE grade910_verified_paper_publications FORCE ROW LEVEL SECURITY;
   REVOKE ALL ON grade910_verified_paper_publications FROM PUBLIC;
   DROP POLICY IF EXISTS grade910_verified_picker_signed_school ON grade910_verified_paper_publications;
   CREATE POLICY grade910_verified_picker_signed_school ON grade910_verified_paper_publications
    FOR SELECT USING(core_security.signed_school_allowed(school_id));
  `)
  await c.query('GRANT SELECT ON grade910_verified_paper_publications TO "'+role+'"')
  const check=await c.query(`SELECT c.relrowsecurity AS rls,c.relforcerowsecurity AS force,
     (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid
      AND p.polname='grade910_verified_picker_signed_school') AS policies
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='grade910_verified_paper_publications'`)
  if(check.rows.length!==1||!check.rows[0].rls||!check.rows[0].force||
    Number(check.rows[0].policies)!==1)throw Error('G910_SELECTOR_FORCE_RLS_NOT_CERTIFIED')
  await c.query('COMMIT')
  return{schemaReady:true,forceRls:true,runtimeRoleReadOnly:true,rowsImported:0,productionCutover:false}
 }catch(e){
  try{await c.query('ROLLBACK')}catch(_){}
  throw e
 }finally{await c.release()}
}
async function down(){return{success:true,storagePreserved:true,message:'APP_ROLLBACK_NO_DESTRUCTIVE_DDL'}}
module.exports={up,down}
