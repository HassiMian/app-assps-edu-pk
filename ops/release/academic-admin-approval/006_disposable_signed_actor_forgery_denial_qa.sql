-- AUTHORIZATION TEST ONLY, disposable database. No real Principal session.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'assps_signed_reviewer_fn_qa_20261014' THEN
  RAISE EXCEPTION 'ISOLATED QA DB ONLY';
 END IF;
END
$guard$;
\o /dev/null
SELECT set_config('app.rls_enabled','true',true);
SELECT set_config('app.is_super_admin','false',true);
SELECT set_config('app.tenant_id','1',true);
SELECT set_config('app.tenant_key',(SELECT COALESCE(tenant_id,'') FROM schools WHERE id=1),true);
SELECT set_config('app.core_actor_id',(SELECT id::text FROM users WHERE school_id=1 AND role='admin' AND is_active=true ORDER BY id LIMIT 1),true);
SELECT set_config('app.core_sig_exp',(EXTRACT(EPOCH FROM clock_timestamp())::bigint+60)::text,true);
SELECT set_config('app.core_sig_nonce',encode(public.gen_random_bytes(16),'hex'),true);
SELECT set_config('app.core_sig',
  encode(public.hmac(convert_to(
    current_setting('app.tenant_id',true)||'|'||
    current_setting('app.tenant_key',true)||'|'||
    session_user||'|'||
    current_setting('app.core_actor_id',true)||'|'||
    current_setting('app.core_sig_exp',true)||'|'||
    current_setting('app.core_sig_nonce',true)||'|'||
    txid_current()::text,'UTF8'),
    convert_to((SELECT secret FROM core_security.signing_key WHERE singleton=true),'UTF8'),
    'sha256'),'hex'),true);
\o
SET LOCAL ROLE assps_core_green_runtime;
INSERT INTO public.school_academic_approval_events
 (school_id,exam_id,actor_user_id,action,object_id,evidence_sha256,evidence_reference)
 VALUES (1,9,(current_setting('app.core_actor_id',true)::integer+1),
 'exam_subject_maximum',10,repeat('a',64),'SYNTHETIC signed QA principal test');
SELECT 'signed_audit_rows',count(*) FROM public.school_academic_approval_events;
ROLLBACK;
