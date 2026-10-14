'use strict'
const {pool}=require('../src/config/database')
const ROLE=/^[A-Za-z_][A-Za-z0-9_]*$/
async function up(options={}){
 const db=options.pool||pool
 const role=String(options.runtimeRole||process.env.DB_RUNTIME_ROLE||'').trim()
 if(!ROLE.test(role))throw Error('GRADE910_RESTRICTED_RUNTIME_ROLE_REQUIRED')
 const client=await db.connect()
 try{
  await client.query('BEGIN')
  const guard=await client.query("SELECT to_regprocedure('core_security.signed_school_allowed(integer)') AS fn")
  if(!guard.rows[0]?.fn)throw Error('GRADE910_SIGNED_RLS_GUARD_NOT_INSTALLED')
  const r=await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1',[role])
  if(r.rows.length!==1||r.rows[0].rolsuper||r.rows[0].rolbypassrls)
   throw Error('GRADE910_EVIDENCE_ROLE_MUST_BE_RESTRICTED')
  const parent=await client.query("SELECT to_regclass('public.grade910_human_signoff_evidence') AS tbl")
  if(!parent.rows[0]?.tbl)throw Error('GRADE910_SIGNOFF_MIGRATION_030_REQUIRED')
  await client.query(`
   CREATE UNIQUE INDEX IF NOT EXISTS grade910_signoff_school_actor_fk_key
    ON grade910_human_signoff_evidence(id,school_id,actor_user_id);
   CREATE TABLE IF NOT EXISTS grade910_supporting_evidence_objects(
     school_id integer NOT NULL REFERENCES schools(id),
     submission_id bigint NOT NULL,
     actor_user_id integer NOT NULL REFERENCES users(id),
     file_sha char(64) NOT NULL CHECK(file_sha ~ '^[a-f0-9]{64}$'),
     mime_type varchar(30) NOT NULL CHECK(mime_type IN ('application/pdf','image/png','image/jpeg')),
     byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 15728640),
     ciphertext bytea NOT NULL CHECK(octet_length(ciphertext)=byte_size),
     nonce bytea NOT NULL CHECK(octet_length(nonce)=12),
     auth_tag bytea NOT NULL CHECK(octet_length(auth_tag)=16),
     created_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (school_id,submission_id),
     FOREIGN KEY(submission_id,school_id,actor_user_id)
       REFERENCES grade910_human_signoff_evidence(id,school_id,actor_user_id)
   );
   ALTER TABLE grade910_supporting_evidence_objects ENABLE ROW LEVEL SECURITY;
   ALTER TABLE grade910_supporting_evidence_objects FORCE ROW LEVEL SECURITY;
   REVOKE ALL ON grade910_supporting_evidence_objects FROM PUBLIC;
   DROP POLICY IF EXISTS grade910_evidence_signed_school ON grade910_supporting_evidence_objects;
   CREATE POLICY grade910_evidence_signed_school ON grade910_supporting_evidence_objects
    FOR ALL USING (core_security.signed_school_allowed(school_id))
    WITH CHECK (core_security.signed_school_allowed(school_id));
  `)
  await client.query('GRANT SELECT,INSERT ON grade910_supporting_evidence_objects TO "'+role+'"')
  const check=await client.query(`SELECT c.relrowsecurity,c.relforcerowsecurity,p.polname
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   LEFT JOIN pg_policy p ON p.polrelid=c.oid
   WHERE n.nspname='public' AND c.relname='grade910_supporting_evidence_objects'`)
  if(check.rows.length!==1||!check.rows[0].relrowsecurity||!check.rows[0].relforcerowsecurity||
    check.rows[0].polname!=='grade910_evidence_signed_school')
   throw Error('GRADE910_EVIDENCE_FORCE_RLS_REQUIRED')
  await client.query('COMMIT')
  return {signedRlsEnforced:true,privateEvidenceEncrypted:true,updatesDenied:true,productionReleased:false}
 }catch(e){
  try{await client.query('ROLLBACK')}catch(_){}
  throw e
 }finally{client.release()}
}
module.exports={up}
