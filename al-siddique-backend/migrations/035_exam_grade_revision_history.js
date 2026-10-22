'use strict'
// Additive, source-only until separately authorized restricted-runtime release.
// NEVER backfills, normalizes, deletes or changes historic grade/score rows.
const ROLE=/^[a-z_][a-z0-9_]*$/i
async function up(options={}){
 const db=options.pool||require('../src/config/database').pool
 const role=String(options.runtimeRole||process.env.DB_RUNTIME_ROLE||'').trim()
 if(!ROLE.test(role))throw Error('GRADE_AUDIT_RESTRICTED_RUNTIME_ROLE_REQUIRED')
 const client=await db.connect()
 try{
  await client.query('BEGIN')
  const signer=await client.query("SELECT to_regprocedure('core_security.signed_school_allowed(integer)') AS fn")
  if(!signer.rows[0]?.fn)throw Error('GRADE_AUDIT_SIGNED_SCHOOL_FUNCTION_MISSING')
  const runtime=await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1',[role])
  if(runtime.rows.length!==1||runtime.rows[0].rolsuper||runtime.rows[0].rolbypassrls)
   throw Error('GRADE_AUDIT_BYPASS_ROLE_FORBIDDEN')
  await client.query(`
   CREATE UNIQUE INDEX IF NOT EXISTS exam_results_school_record_key
     ON public.exam_results(school_id,id);
   CREATE TABLE IF NOT EXISTS public.exam_grade_revision_history (
     id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     school_id integer NOT NULL REFERENCES public.schools(id),
     exam_result_id integer NOT NULL,
     exam_id integer NOT NULL,
     student_id integer NOT NULL,
     subject text NOT NULL,
     marks_obtained numeric(10,2) NOT NULL,
     total_marks integer NOT NULL CHECK(total_marks>0),
     old_grade text NOT NULL,
     new_grade text NOT NULL,
     actor_user_id integer NOT NULL REFERENCES public.users(id),
     reason text NOT NULL CHECK(char_length(reason) BETWEEN 12 AND 500),
     created_at timestamptz NOT NULL DEFAULT now(),
     CHECK(marks_obtained>=0 AND marks_obtained<=total_marks),
     CHECK(old_grade<>new_grade),
     CONSTRAINT exam_grade_revision_result_school_fk
       FOREIGN KEY(school_id,exam_result_id) REFERENCES public.exam_results(school_id,id)
   );
   CREATE OR REPLACE FUNCTION public.assps_exam_grade_audit_deny_mutation()
    RETURNS trigger LANGUAGE plpgsql AS $guard$
     BEGIN RAISE EXCEPTION 'GRADE_AUDIT_APPEND_ONLY'; END
    $guard$;
   DROP TRIGGER IF EXISTS exam_grade_revision_immutable ON public.exam_grade_revision_history;
   CREATE TRIGGER exam_grade_revision_immutable
     BEFORE UPDATE OR DELETE ON public.exam_grade_revision_history
     FOR EACH ROW EXECUTE FUNCTION public.assps_exam_grade_audit_deny_mutation();
   CREATE INDEX IF NOT EXISTS idx_exam_grade_revision_school_record
     ON public.exam_grade_revision_history(school_id,exam_result_id,created_at DESC);
   ALTER TABLE public.exam_grade_revision_history ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.exam_grade_revision_history FORCE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS exam_grade_revision_signed_school ON public.exam_grade_revision_history;
   CREATE POLICY exam_grade_revision_signed_school ON public.exam_grade_revision_history
    FOR ALL USING (core_security.signed_school_allowed(school_id))
    WITH CHECK (core_security.signed_school_allowed(school_id));
  `)
  await client.query('REVOKE ALL ON public.exam_grade_revision_history FROM PUBLIC')
  await client.query('GRANT SELECT,INSERT ON public.exam_grade_revision_history TO "'+role+'"')
  await client.query('GRANT USAGE,SELECT ON SEQUENCE public.exam_grade_revision_history_id_seq TO "'+role+'"')
  const check=await client.query(`SELECT c.relrowsecurity,c.relforcerowsecurity,
    EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid
     AND p.polname='exam_grade_revision_signed_school') AS signed_policy
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='exam_grade_revision_history'`)
  const immutable=await client.query(`SELECT COUNT(*)::int AS count FROM pg_trigger t
    JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='exam_grade_revision_history'
    AND t.tgname='exam_grade_revision_immutable' AND t.tgenabled='O'`)
  if(Number(immutable.rows[0]?.count)!==1)
   throw Error('GRADE_AUDIT_APPEND_ONLY_TRIGGER_REQUIRED')
  if(check.rows.length!==1||!check.rows[0].relrowsecurity||
     !check.rows[0].relforcerowsecurity||!check.rows[0].signed_policy)
   throw Error('GRADE_AUDIT_FORCE_RLS_CHECK_FAILED')
  await client.query('COMMIT')
  return {created:true,additive:true,schoolSigned:true,gradesModified:false,marksModified:false,
   productionApproved:false}
 }catch(e){try{await client.query('ROLLBACK')}catch(_){}throw e}
 finally{client.release()}
}
module.exports={up}
