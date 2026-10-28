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
    CREATE UNIQUE INDEX IF NOT EXISTS exam_results_school_record_key
      ON public.exam_results(school_id,id);
    CREATE TABLE IF NOT EXISTS public.exam_marks_revision_history (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      school_id integer NOT NULL REFERENCES public.schools(id),
      exam_result_id integer NOT NULL,
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
      CHECK (old_marks <> new_marks),
      CONSTRAINT exam_marks_revision_result_school_fk
        FOREIGN KEY(school_id,exam_result_id) REFERENCES public.exam_results(school_id,id)
    );
    -- Immutable original source identity and same-school actor (defence in depth).
    -- Requires exact student, exam, subject and school match, not only result id.
    CREATE UNIQUE INDEX IF NOT EXISTS exam_results_school_record_identity_key
      ON public.exam_results(school_id,id,exam_id,student_id,subject);
    CREATE UNIQUE INDEX IF NOT EXISTS users_school_actor_identity_key
      ON public.users(school_id,id);
    DO $identity_guard$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint
          WHERE conrelid='public.exam_marks_revision_history'::regclass
            AND conname='exam_marks_revision_source_identity_fk') THEN
        ALTER TABLE public.exam_marks_revision_history
          ADD CONSTRAINT exam_marks_revision_source_identity_fk
          FOREIGN KEY(school_id,exam_result_id,exam_id,student_id,subject)
          REFERENCES public.exam_results(school_id,id,exam_id,student_id,subject);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint
          WHERE conrelid='public.exam_marks_revision_history'::regclass
            AND conname='exam_marks_revision_actor_school_fk') THEN
        ALTER TABLE public.exam_marks_revision_history
          ADD CONSTRAINT exam_marks_revision_actor_school_fk
          FOREIGN KEY(school_id,actor_user_id) REFERENCES public.users(school_id,id);
      END IF;
    END
    $identity_guard$;
    -- A cross-school FK alone does not ensure the ratifying actor is a Principal.
    -- Fail closed if the referenced same-school actor is inactive or not eligible.
    CREATE OR REPLACE FUNCTION public.assps_exam_marks_audit_actor_eligibility()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = pg_catalog, public AS $actor$
    BEGIN
      -- A school-scoped signer is not sufficient to prove the named human.
      -- Require the existing transaction-bound HMAC actor claim to be EXACTLY
      -- the inserted audit actor; unsigned/expired/forged claim fails closed.
      IF NEW.actor_user_id::text IS DISTINCT FROM
          current_setting('app.core_actor_id',true)
          OR core_security.signed_school_allowed(NEW.school_id) IS NOT TRUE THEN
        RAISE EXCEPTION 'EXAM_MARKS_REVISION_SIGNED_ACTOR_MISMATCH'
          USING ERRCODE='42501';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.users u
         WHERE u.id=NEW.actor_user_id AND u.school_id=NEW.school_id
           AND u.is_active IS TRUE AND u.role IN ('principal','owner')
      ) THEN
        RAISE EXCEPTION 'EXAM_MARKS_REVISION_ACTIVE_PRINCIPAL_OR_OWNER_REQUIRED'
          USING ERRCODE='42501';
      END IF;
      RETURN NEW;
    END;
    $actor$;
    REVOKE ALL ON FUNCTION public.assps_exam_marks_audit_actor_eligibility() FROM PUBLIC;
    DROP TRIGGER IF EXISTS exam_marks_revision_actor_eligibility ON public.exam_marks_revision_history;
    CREATE TRIGGER exam_marks_revision_actor_eligibility
      BEFORE INSERT ON public.exam_marks_revision_history
      FOR EACH ROW EXECUTE FUNCTION public.assps_exam_marks_audit_actor_eligibility();
    -- Also upgrade existing isolated/staged ledgers without truncating rows.
    DO $guard$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname='exam_marks_revision_result_school_fk'
           AND conrelid='public.exam_marks_revision_history'::regclass
      ) THEN
        ALTER TABLE public.exam_marks_revision_history
          ADD CONSTRAINT exam_marks_revision_result_school_fk
          FOREIGN KEY(school_id,exam_result_id)
          REFERENCES public.exam_results(school_id,id);
      END IF;
    END
    $guard$;
    CREATE OR REPLACE FUNCTION public.assps_exam_marks_audit_deny_mutation()
     RETURNS trigger LANGUAGE plpgsql AS $guard$
      BEGIN RAISE EXCEPTION 'MARKS_AUDIT_APPEND_ONLY'; END
     $guard$;
    DROP TRIGGER IF EXISTS exam_marks_revision_immutable ON public.exam_marks_revision_history;
    CREATE TRIGGER exam_marks_revision_immutable
      BEFORE UPDATE OR DELETE ON public.exam_marks_revision_history
      FOR EACH ROW EXECUTE FUNCTION public.assps_exam_marks_audit_deny_mutation();
    CREATE INDEX IF NOT EXISTS idx_exam_marks_revision_school_result
      ON public.exam_marks_revision_history(school_id,exam_result_id,created_at DESC);
    ALTER TABLE public.exam_marks_revision_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.exam_marks_revision_history FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS exam_marks_revision_signed_school ON public.exam_marks_revision_history;
    CREATE POLICY exam_marks_revision_signed_school ON public.exam_marks_revision_history
      FOR ALL USING (core_security.signed_school_allowed(school_id))
      WITH CHECK (core_security.signed_school_allowed(school_id));
  `)
  await client.query('REVOKE ALL ON public.exam_marks_revision_history FROM PUBLIC')
  await client.query('GRANT SELECT,INSERT ON public.exam_marks_revision_history TO "'+role+'"')
  await client.query('GRANT USAGE,SELECT ON SEQUENCE public.exam_marks_revision_history_id_seq TO "'+role+'"')
  const check=await client.query(`SELECT c.relrowsecurity,c.relforcerowsecurity,
    EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname='exam_marks_revision_signed_school') AS has_policy
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='exam_marks_revision_history'`)
  const immutable=await client.query(`SELECT COUNT(*)::int AS count FROM pg_trigger t
    JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='exam_marks_revision_history'
      AND t.tgname='exam_marks_revision_immutable' AND t.tgenabled='O'`)
  const signedActorTrigger=await client.query(`SELECT COUNT(*)::int AS count FROM pg_trigger t
    JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='exam_marks_revision_history'
      AND t.tgname='exam_marks_revision_actor_eligibility' AND t.tgenabled='O'`)
  if(Number(signedActorTrigger.rows[0]?.count)!==1)
   throw Error('EXAM_MARKS_SIGNED_ACTOR_TRIGGER_REQUIRED')
  if(Number(immutable.rows[0]?.count)!==1)
   throw Error('EXAM_MARKS_AUDIT_APPEND_ONLY_TRIGGER_REQUIRED')
  if(check.rows.length!==1 || !check.rows[0].relrowsecurity ||
     !check.rows[0].relforcerowsecurity || !check.rows[0].has_policy)
    throw Error('EXAM_MARKS_REVISION_FORCE_RLS_VERIFICATION_FAILED')
  await client.query('COMMIT')
  return {created:true,appendOnlyAudit:true,schoolSigned:true,actorSignatureEnforced:true,existingMarksChanged:false,productionApproved:false}
 }catch(e){try{await client.query('ROLLBACK')}catch(_){}throw e}
 finally{client.release()}
}
module.exports={up}
