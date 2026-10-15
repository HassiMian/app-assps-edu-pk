'use strict'
// Additive, no mark updates, no backfill, no demo rows. SaaS Core signed release only.
const ROLE=/^[a-z_][a-z0-9_]*$/i
async function up(options={}){
 const db=options.pool||require('../src/config/database').pool
 const role=String(options.runtimeRole||process.env.DB_RUNTIME_ROLE||'').trim()
 if(!ROLE.test(role))throw Error('EXAM_MARKS_REVISION_RESTRICTED_RUNTIME_ROLE_REQUIRED')
 const client=await db.connect()
 try{
  await client.query('BEGIN')
  const signer=await client.query("SELECT to_regprocedure('core_security.signed_school_allowed(integer)') AS fn")
  if(!signer.rows[0]?.fn)throw Error('EXAM_MARKS_SIGNED_SCHOOL_VERIFIER_REQUIRED')
  const actor=await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1',[role])
  if(actor.rows.length!==1||actor.rows[0].rolsuper||actor.rows[0].rolbypassrls)
   throw Error('EXAM_MARKS_REVISION_BYPASS_ROLE_FORBIDDEN')
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.exam_marks_revision_history (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      school_id integer NOT NULL REFERENCES public.schools(id),
      exam_result_id integer NOT NULL REFERENCES public.exam_results(id),
      exam_id integer NOT NULL,
      student_id integer NOT NULL,
      subject text NOT NULL,
      old_marks numeric(10,2) NOT NULL,
      new_marks numeric(10,2) NOT NULL,
      total_marks integer NOT NULL CHECK (total_marks>0),
      old_grade text,
      new_grade text,
      actor_user_id integer NOT NULL REFERENCES public.users(id),
      reason text NOT NULL CHECK (char_length(reason) BETWEEN 12 AND 500),
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (old_marks >= 0 AND old_marks <= total_marks),
      CHECK (new_marks >= 0 AND new_marks <= total_marks),
      CHECK (old_marks <> new_marks)
    );
    CREATE INDEX IF NOT EXISTS idx_exam_marks_revision_school_result
      ON public.exam_marks_revision_history(school_id,exam_result_id,created_at DESC);
    ALTER TABLE public.exam_marks_revision_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.exam_marks_revision_history FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS exam_marks_revision_signed_school ON public.exam_marks_revision_history;
    CREATE POLICY exam_marks_revision_signed_school ON public.exam_marks_revision_history
      FOR ALL USING (core_security.signed_school_allowed(school_id))
      WITH CHECK (core_security.signed_school_allowed(school_id));
  `)
  await client.query('GRANT SELECT,INSERT ON public.exam_marks_revision_history TO "'+role+'"')
  await client.query('GRANT USAGE,SELECT ON SEQUENCE public.exam_marks_revision_history_id_seq TO "'+role+'"')
  const check=await client.query(`SELECT c.relrowsecurity,c.relforcerowsecurity,
    EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname='exam_marks_revision_signed_school') AS has_policy
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='exam_marks_revision_history'`)
  if(check.rows.length!==1 || !check.rows[0].relrowsecurity ||
     !check.rows[0].relforcerowsecurity || !check.rows[0].has_policy)
    throw Error('EXAM_MARKS_REVISION_FORCE_RLS_VERIFICATION_FAILED')
  await client.query('COMMIT')
  return {created:true,appendOnlyAudit:true,schoolSigned:true,existingMarksChanged:false,productionApproved:false}
 }catch(e){try{await client.query('ROLLBACK')}catch(_){}throw e}
 finally{client.release()}
}
module.exports={up}
