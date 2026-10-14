'use strict'
// Additive, no data reset. Safe to apply only after SaaS Core signed runtime has been certified.
const {pool}=require('../src/config/database')
const ROLE=/^[a-z_][a-z0-9_]*$/i
async function up(options={}){
 const db=options.pool||pool,role=String(options.runtimeRole||process.env.DB_RUNTIME_ROLE||'').trim()
 if(!ROLE.test(role))throw Error('PERSONAL_SIGNATURE_RESTRICTED_ROLE_REQUIRED')
 const client=await db.connect()
 try{
  await client.query('BEGIN')
  const fn=await client.query("SELECT to_regprocedure('core_security.signed_school_allowed(integer)') AS fn")
  if(!fn.rows[0]?.fn)throw Error('SIGNATURE_SIGNED_SCHOOL_RUNTIME_MISSING')
  const grant=await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1',[role])
  if(grant.rows.length!==1||grant.rows[0].rolsuper||grant.rows[0].rolbypassrls)
   throw Error('PERSONAL_SIGNATURE_ROLE_MUST_BE_RESTRICTED')
  await client.query(`
   CREATE TABLE IF NOT EXISTS grade910_personal_signature_assets (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id integer NOT NULL REFERENCES schools(id),
    actor_user_id integer NOT NULL REFERENCES users(id),
    actor_role varchar(24) NOT NULL CHECK (actor_role IN ('principal','teacher','admin','school_admin')),
    signature_sha char(64) NOT NULL CHECK (signature_sha ~ '^[0-9a-f]{64}$'),
    width_px integer NOT NULL CHECK (width_px BETWEEN 1 AND 4096),
    height_px integer NOT NULL CHECK (height_px BETWEEN 1 AND 2048),
    ciphertext bytea NOT NULL CHECK (octet_length(ciphertext) BETWEEN 45 AND 122880),
    nonce bytea NOT NULL CHECK (octet_length(nonce)=12),
    auth_tag bytea NOT NULL CHECK (octet_length(auth_tag)=16),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT grade910_personal_signature_unique_actor_bytes UNIQUE (school_id,actor_user_id,signature_sha)
   );
   ALTER TABLE grade910_personal_signature_assets ENABLE ROW LEVEL SECURITY;
   ALTER TABLE grade910_personal_signature_assets FORCE ROW LEVEL SECURITY;
   REVOKE ALL ON grade910_personal_signature_assets FROM PUBLIC;
   DROP POLICY IF EXISTS grade910_personal_signature_signed_school ON grade910_personal_signature_assets;
   CREATE POLICY grade910_personal_signature_signed_school ON grade910_personal_signature_assets
    FOR ALL USING (core_security.signed_school_allowed(school_id))
    WITH CHECK (core_security.signed_school_allowed(school_id));
  `)
  await client.query('GRANT SELECT,INSERT ON grade910_personal_signature_assets TO "'+role+'"')
  await client.query('GRANT USAGE,SELECT ON SEQUENCE grade910_personal_signature_assets_id_seq TO "'+role+'"')
  const checks=await client.query(`SELECT c.relrowsecurity,c.relforcerowsecurity,p.polname
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   LEFT JOIN pg_policy p ON p.polrelid=c.oid
   WHERE n.nspname='public' AND c.relname='grade910_personal_signature_assets'`)
  if(checks.rows.length!==1||!checks.rows[0].relrowsecurity||
  !checks.rows[0].relforcerowsecurity||checks.rows[0].polname!=='grade910_personal_signature_signed_school')
   throw Error('PERSONAL_SIGNATURE_FORCE_RLS_REQUIRED')
  await client.query('COMMIT')
  return {encrypted:true,personalOnly:true,roleRestricted:true,approved:false,productionReleased:false}
 }catch(err){
  try{await client.query('ROLLBACK')}catch(_){}
  throw err
 }finally{client.release()}
}
module.exports={up}
