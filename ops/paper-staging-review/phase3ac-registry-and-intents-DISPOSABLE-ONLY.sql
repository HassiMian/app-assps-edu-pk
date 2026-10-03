-- Phase3AC: supplement to Phase3U only, never an app migration.
-- Execute ONLY against a NEW synthetic PG18 cluster and Phase3U prerequisite.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'assps_paper_phase3u_ci' OR current_setting('port')<>'55443'
 OR current_setting('listen_addresses')<>'127.0.0.1' OR session_user<>'assps_p3u_admin'
 OR to_regclass('public.new_authoring_drafts_staging') IS NULL
 OR to_regclass('public.phase3u_identity_bindings') IS NULL
 OR to_regclass('public.phase3ac_school_registry') IS NOT NULL
 OR to_regclass('public.phase3ac_intents_staging') IS NOT NULL
 THEN RAISE EXCEPTION 'PHASE3AC REFUSE: not isolated, pristine Phase3U PG18'; END IF;
END $guard$;
-- Independently provisioned synthetic evidence. There is NO automatic synchronization
-- with real school/teacher tables, JWT, client request, or Curriculum release.
CREATE TABLE public.phase3ac_school_registry(
 school_id integer NOT NULL,tenant_id text NOT NULL,payload jsonb NOT NULL,
 PRIMARY KEY(school_id,tenant_id),
 FOREIGN KEY(school_id,tenant_id) REFERENCES public.phase3u_schools(id,tenant_id));
CREATE TABLE public.phase3ac_staff_registry(
 school_id integer NOT NULL,tenant_id text NOT NULL,actor_id integer NOT NULL,
 payload jsonb NOT NULL,PRIMARY KEY(school_id,tenant_id,actor_id),
 FOREIGN KEY(school_id,tenant_id) REFERENCES public.phase3ac_school_registry(school_id,tenant_id));
CREATE TABLE public.phase3ac_assignment_registry(
 school_id integer NOT NULL,tenant_id text NOT NULL,actor_id integer NOT NULL,
 grade integer NOT NULL,subject_id text NOT NULL,assignment_id text NOT NULL,
 payload jsonb NOT NULL,
 PRIMARY KEY(school_id,tenant_id,actor_id,grade,subject_id),
 UNIQUE(school_id,tenant_id,assignment_id),
 FOREIGN KEY(school_id,tenant_id,actor_id)
 REFERENCES public.phase3ac_staff_registry(school_id,tenant_id,actor_id));
CREATE TABLE public.phase3ac_curriculum_registry(
 school_id integer NOT NULL,tenant_id text NOT NULL,assignment_id text NOT NULL,
 identity jsonb NOT NULL,payload jsonb NOT NULL,
 PRIMARY KEY(school_id,tenant_id,assignment_id),
 FOREIGN KEY(school_id,tenant_id,assignment_id)
 REFERENCES public.phase3ac_assignment_registry(school_id,tenant_id,assignment_id));
-- Separate role-only read, even table-level SELECT is NOT granted to tenant logins.
DO $isolate$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['phase3ac_school_registry','phase3ac_staff_registry',
 'phase3ac_assignment_registry','phase3ac_curriculum_registry'] LOOP
 EXECUTE format('ALTER TABLE public.%I OWNER TO assps_p3u_schema_owner',t);
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY phase3ac_owner_school_scope ON public.%I FOR ALL TO assps_p3u_schema_owner USING (school_id=public.phase3t_session_school_id() AND tenant_id=public.phase3t_session_tenant_id()) WITH CHECK (school_id=public.phase3t_session_school_id() AND tenant_id=public.phase3t_session_tenant_id())',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,assps_p3t_school51,assps_p3t_school52',t);
 END LOOP; END $isolate$;
CREATE FUNCTION public.phase3ac_read_school(p_school integer)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $f$
 SELECT r.payload FROM public.phase3ac_school_registry r
 WHERE r.school_id=p_school AND r.school_id=public.phase3t_session_school_id()
 AND r.tenant_id=public.phase3t_session_tenant_id() $f$;
CREATE FUNCTION public.phase3ac_read_staff(p_school integer,p_tenant text,p_actor integer)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $f$
 SELECT r.payload FROM public.phase3ac_staff_registry r
 WHERE r.school_id=p_school AND r.tenant_id=p_tenant AND r.actor_id=p_actor
 AND r.school_id=public.phase3t_session_school_id()
 AND r.tenant_id=public.phase3t_session_tenant_id() $f$;
CREATE FUNCTION public.phase3ac_read_assignment(p_school integer,p_tenant text,
 p_actor integer,p_grade integer,p_subject text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $f$
 SELECT r.payload FROM public.phase3ac_assignment_registry r
 WHERE r.school_id=p_school AND r.tenant_id=p_tenant AND r.actor_id=p_actor
 AND r.grade=p_grade AND r.subject_id=p_subject
 AND r.school_id=public.phase3t_session_school_id()
 AND r.tenant_id=public.phase3t_session_tenant_id() $f$;
CREATE FUNCTION public.phase3ac_read_binding(p_school integer,p_tenant text,
 p_assignment text,p_identity jsonb)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $f$
 SELECT r.payload FROM public.phase3ac_curriculum_registry r
 WHERE r.school_id=p_school AND r.tenant_id=p_tenant
 AND r.assignment_id=p_assignment AND r.identity=p_identity
 AND r.school_id=public.phase3t_session_school_id()
 AND r.tenant_id=public.phase3t_session_tenant_id() $f$;
DO $functions$ DECLARE signature text; BEGIN
 FOREACH signature IN ARRAY ARRAY[
 'phase3ac_read_school(integer)',
 'phase3ac_read_staff(integer,text,integer)',
 'phase3ac_read_assignment(integer,text,integer,integer,text)',
 'phase3ac_read_binding(integer,text,text,jsonb)'] LOOP
 EXECUTE format('ALTER FUNCTION public.%s OWNER TO assps_p3u_schema_owner',signature);
 EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC',signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO assps_p3t_school51,assps_p3t_school52',signature);
 END LOOP; END $functions$;
-- Durable, restart-safe claim ledger. School roles have ONLY purpose-function EXECUTE.
CREATE TABLE public.phase3ac_intents_staging(
 intent_id uuid PRIMARY KEY,school_id integer NOT NULL,tenant_id text NOT NULL,
 actor_id integer NOT NULL,staff_role text NOT NULL CHECK(staff_role IN('teacher','principal','admin')),
 assignment_id text NOT NULL,publication_id text NOT NULL,
 binding_sha256 text NOT NULL CHECK(binding_sha256~'^[0-9a-f]{64}$'),
 approved_revision integer NOT NULL CHECK(approved_revision>0),
 records_digest text NOT NULL CHECK(records_digest~'^[0-9a-f]{64}$'),
 projection_fingerprint text NOT NULL CHECK(projection_fingerprint~'^[0-9a-f]{64}$'),
 source_pin jsonb NOT NULL,
 state text NOT NULL DEFAULT 'READY' CHECK(state IN('READY','CLAIMED','SPENT','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '10 minutes',
 claimed_at timestamptz,finished_at timestamptz,
 FOREIGN KEY(school_id,tenant_id,actor_id)
 REFERENCES public.phase3ac_staff_registry(school_id,tenant_id,actor_id),
 FOREIGN KEY(school_id,tenant_id,assignment_id)
 REFERENCES public.phase3ac_assignment_registry(school_id,tenant_id,assignment_id),
 FOREIGN KEY(school_id,tenant_id,binding_sha256,approved_revision)
 REFERENCES public.new_authoring_approved_snapshots_staging
 (school_id,tenant_id,binding_sha256,revision));
ALTER TABLE public.phase3ac_intents_staging OWNER TO assps_p3u_schema_owner;
ALTER TABLE public.phase3ac_intents_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase3ac_intents_staging FORCE ROW LEVEL SECURITY;
CREATE POLICY phase3ac_owner_scope ON public.phase3ac_intents_staging
 FOR ALL TO assps_p3u_schema_owner
 USING(school_id=public.phase3t_session_school_id()
 AND tenant_id=public.phase3t_session_tenant_id())
 WITH CHECK(school_id=public.phase3t_session_school_id()
 AND tenant_id=public.phase3t_session_tenant_id());
REVOKE ALL ON public.phase3ac_intents_staging FROM PUBLIC,assps_p3t_school51,assps_p3t_school52;
-- Reserve locks a global serialization key; FORCE RLS counts are per school (max64),
-- plus max3 READY intents per actor; no inter-instance actor overbooking.
CREATE FUNCTION public.phase3ac_reserve_intent(
 p_id uuid,p_school integer,p_tenant text,p_actor integer,p_role text,
 p_assignment text,p_publication text,p_binding text,p_revision integer,
 p_digest text,p_fingerprint text,p_pin jsonb)
 RETURNS TABLE(reserved_id uuid,deadline timestamptz)
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $reserve$
DECLARE accepted boolean; BEGIN
 IF p_school IS DISTINCT FROM public.phase3t_session_school_id()
 OR p_tenant IS DISTINCT FROM public.phase3t_session_tenant_id()
 OR p_actor<=0 OR p_role NOT IN('teacher','principal','admin')
 OR length(p_publication)<3 OR p_revision<=0
 OR p_binding !~ '^[0-9a-f]{64}$' OR p_digest !~ '^[0-9a-f]{64}$'
 OR p_fingerprint !~ '^[0-9a-f]{64}$' OR p_pin->>'publicationId' IS DISTINCT FROM p_publication
 OR (p_pin->>'revision')::int IS DISTINCT FROM p_revision
 OR p_pin->>'recordsDigest' IS DISTINCT FROM p_digest
 THEN RAISE EXCEPTION 'PHASE3AC refused: invalid authenticated source pin'; END IF;
 SELECT true INTO accepted FROM public.phase3ac_staff_registry s
 JOIN public.phase3ac_school_registry sc
 ON (sc.school_id=s.school_id AND sc.tenant_id=s.tenant_id)
 JOIN public.phase3ac_assignment_registry a
 ON (a.school_id=s.school_id AND a.tenant_id=s.tenant_id AND a.actor_id=s.actor_id)
 JOIN public.phase3ac_curriculum_registry b
 ON (b.school_id=a.school_id AND b.tenant_id=a.tenant_id AND b.assignment_id=a.assignment_id)
 WHERE s.school_id=p_school AND s.tenant_id=p_tenant AND s.actor_id=p_actor
 AND sc.payload->>'status'='active' AND sc.payload->>'isDemo'='false'
 AND sc.payload->>'paperAuthoringStagingApproved'='true'
 AND s.payload->>'status'='active' AND s.payload->>'account_type'='human'
 AND s.payload->>'role'=p_role AND s.payload->>'paperAuthoringEligible'='true'
 AND a.assignment_id=p_assignment AND a.payload->>'status'='ACTIVE'
 AND (a.payload->>'validFromMs')::bigint <=(extract(epoch from clock_timestamp())*1000)::bigint
 AND (a.payload->>'validUntilMs')::bigint >(extract(epoch from clock_timestamp())*1000)::bigint
 AND a.payload->'review'->>'approvedByStaffId' IS DISTINCT FROM p_actor::text
 AND length(coalesce(a.payload->'review'->>'evidenceId',''))>0
 AND b.payload->>'status'='ACTIVE' AND b.identity=p_pin->'curriculumIdentity'
 AND b.payload->>'approvedByStaffId' IS DISTINCT FROM p_actor::text
 AND length(coalesce(b.payload->>'approvalEvidenceId',''))>0
 AND ((p_pin->'selection'->>'syllabusMode'='full'
       AND b.payload->>'fullTextbookApproved'='true')
   OR (p_pin->'selection'->>'syllabusMode'='alp' AND EXISTS(
       SELECT 1 FROM jsonb_array_elements(b.payload->'alpApprovals') ap
       WHERE ap->>'status'='INDEPENDENTLY_VERIFIED' AND length(coalesce(ap->>'evidenceId',''))>0
       AND ap->>'examYear'=p_pin->'selection'->>'examYear')));
 IF accepted IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'PHASE3AC refused: subject assignment not currently approved';
 END IF;
 PERFORM 1 FROM public.phase3t_lock_published_snapshot(p_school,p_tenant,p_binding,p_revision);
 IF NOT FOUND THEN RAISE EXCEPTION 'PHASE3AC refused: publisher revoked or not published'; END IF;
 PERFORM pg_advisory_xact_lock(349901);
 IF (SELECT count(*) FROM public.phase3ac_intents_staging
     WHERE state='READY' AND expires_at>clock_timestamp())>=64
 OR (SELECT count(*) FROM public.phase3ac_intents_staging
     WHERE school_id=p_school AND tenant_id=p_tenant AND actor_id=p_actor
     AND state='READY' AND expires_at>clock_timestamp())>=3
 THEN RAISE EXCEPTION 'PHASE3AC refused: persistent authoring capacity exhausted'; END IF;
 RETURN QUERY INSERT INTO public.phase3ac_intents_staging(
 intent_id,school_id,tenant_id,actor_id,staff_role,assignment_id,
 publication_id,binding_sha256,approved_revision,records_digest,
 projection_fingerprint,source_pin)
 VALUES(p_id,p_school,p_tenant,p_actor,p_role,p_assignment,p_publication,p_binding,
 p_revision,p_digest,p_fingerprint,p_pin) RETURNING intent_id,expires_at;
END $reserve$;
-- Atomic READY->CLAIMED CAS, safe across independent Node workers/hosts.
-- CLAIMED is deliberately never automatically reset to READY after a process crash.
CREATE FUNCTION public.phase3ac_claim_intent(
 p_id uuid,p_school integer,p_tenant text,p_actor integer,p_role text,
 p_fingerprint text,p_digest text) RETURNS jsonb
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $claim$
DECLARE acquired jsonb;snap_binding text;snap_revision integer; BEGIN
 IF p_school IS DISTINCT FROM public.phase3t_session_school_id()
 OR p_tenant IS DISTINCT FROM public.phase3t_session_tenant_id()
 THEN RAISE EXCEPTION 'PHASE3AC refused: tenant cannot claim other school intent'; END IF;
 SELECT i.binding_sha256,i.approved_revision INTO snap_binding,snap_revision
 FROM public.phase3ac_intents_staging i WHERE i.intent_id=p_id
 AND i.school_id=p_school AND i.tenant_id=p_tenant AND i.actor_id=p_actor
 AND i.staff_role=p_role AND i.state='READY' AND i.expires_at>clock_timestamp()
 AND i.projection_fingerprint=p_fingerprint AND i.records_digest=p_digest;
 IF NOT FOUND THEN RETURN NULL; END IF;
 -- Recheck and HOLD current published row at claim time, not only reservation time.
 -- Share lock prevents a concurrent publisher revocation overtaking the atomic claim.
 PERFORM 1 FROM public.phase3t_lock_published_snapshot(
  p_school,p_tenant,snap_binding,snap_revision);
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE public.phase3ac_intents_staging i SET state='CLAIMED',claimed_at=clock_timestamp()
 WHERE i.intent_id=p_id AND i.school_id=p_school AND i.tenant_id=p_tenant
 AND i.actor_id=p_actor AND i.staff_role=p_role AND i.state='READY'
 AND i.expires_at>clock_timestamp() AND i.projection_fingerprint=p_fingerprint
 AND i.records_digest=p_digest
 AND EXISTS(SELECT 1 FROM public.phase3ac_school_registry sc
   WHERE sc.school_id=i.school_id AND sc.tenant_id=i.tenant_id
   AND sc.payload->>'status'='active' AND sc.payload->>'isDemo'='false'
   AND sc.payload->>'paperAuthoringStagingApproved'='true')
 AND EXISTS(SELECT 1 FROM public.phase3ac_staff_registry s
   WHERE s.school_id=i.school_id AND s.tenant_id=i.tenant_id AND s.actor_id=i.actor_id
   AND s.payload->>'status'='active' AND s.payload->>'account_type'='human'
   AND s.payload->>'role'=i.staff_role AND s.payload->>'paperAuthoringEligible'='true')
 AND EXISTS(SELECT 1 FROM public.phase3ac_assignment_registry a
   WHERE a.school_id=i.school_id AND a.tenant_id=i.tenant_id
   AND a.assignment_id=i.assignment_id AND a.payload->>'status'='ACTIVE'
   AND (a.payload->>'validFromMs')::bigint <=(extract(epoch from clock_timestamp())*1000)::bigint
   AND (a.payload->>'validUntilMs')::bigint >(extract(epoch from clock_timestamp())*1000)::bigint
   AND a.payload->'review'->>'approvedByStaffId' IS DISTINCT FROM i.actor_id::text
   AND length(coalesce(a.payload->'review'->>'evidenceId',''))>0)
 AND EXISTS(SELECT 1 FROM public.phase3ac_curriculum_registry b
   WHERE b.school_id=i.school_id AND b.tenant_id=i.tenant_id
   AND b.assignment_id=i.assignment_id AND b.payload->>'status'='ACTIVE'
   AND b.identity=i.source_pin->'curriculumIdentity'
   AND b.payload->>'approvedByStaffId' IS DISTINCT FROM i.actor_id::text
   AND length(coalesce(b.payload->>'approvalEvidenceId',''))>0
   AND ((i.source_pin->'selection'->>'syllabusMode'='full'
         AND b.payload->>'fullTextbookApproved'='true')
     OR (i.source_pin->'selection'->>'syllabusMode'='alp' AND EXISTS(
        SELECT 1 FROM jsonb_array_elements(b.payload->'alpApprovals') ap
        WHERE ap->>'status'='INDEPENDENTLY_VERIFIED'
        AND length(coalesce(ap->>'evidenceId',''))>0
        AND ap->>'examYear'=i.source_pin->'selection'->>'examYear'))))
 RETURNING jsonb_build_object('intentId',i.intent_id,'sourcePin',i.source_pin,
 'publicationId',i.publication_id,'approvedRevision',i.approved_revision,
 'recordsDigest',i.records_digest,'projectionFingerprint',i.projection_fingerprint)
 INTO acquired;
 RETURN acquired;
END $claim$;
CREATE FUNCTION public.phase3ac_finish_intent(
 p_id uuid,p_school integer,p_tenant text,p_actor integer,p_role text)
 RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $finish$
DECLARE done boolean; BEGIN
 IF p_school IS DISTINCT FROM public.phase3t_session_school_id()
 OR p_tenant IS DISTINCT FROM public.phase3t_session_tenant_id()
 THEN RAISE EXCEPTION 'PHASE3AC refused: cross-school finish'; END IF;
 UPDATE public.phase3ac_intents_staging i SET state='SPENT',finished_at=clock_timestamp()
 WHERE i.intent_id=p_id AND i.school_id=p_school AND i.tenant_id=p_tenant
 AND i.actor_id=p_actor AND i.staff_role=p_role AND i.state='CLAIMED'
 RETURNING true INTO done;
 RETURN coalesce(done,false);
END $finish$;
CREATE FUNCTION public.phase3ac_cancel_intent(
 p_id uuid,p_school integer,p_tenant text,p_actor integer,p_role text)
 RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $cancel$
DECLARE done boolean; BEGIN
 IF p_school IS DISTINCT FROM public.phase3t_session_school_id()
 OR p_tenant IS DISTINCT FROM public.phase3t_session_tenant_id()
 THEN RAISE EXCEPTION 'PHASE3AC refused: cross-school cancel'; END IF;
 UPDATE public.phase3ac_intents_staging i SET state='CANCELLED',finished_at=clock_timestamp()
 WHERE i.intent_id=p_id AND i.school_id=p_school AND i.tenant_id=p_tenant
 AND i.actor_id=p_actor AND i.staff_role=p_role AND i.state='READY'
 RETURNING true INTO done;
 RETURN coalesce(done,false);
END $cancel$;
DO $function_acl$ DECLARE signature text; BEGIN
 FOREACH signature IN ARRAY ARRAY[
 'phase3ac_reserve_intent(uuid,integer,text,integer,text,text,text,text,integer,text,text,jsonb)',
 'phase3ac_claim_intent(uuid,integer,text,integer,text,text,text)',
 'phase3ac_finish_intent(uuid,integer,text,integer,text)',
 'phase3ac_cancel_intent(uuid,integer,text,integer,text)'] LOOP
 EXECUTE format('ALTER FUNCTION public.%s OWNER TO assps_p3u_schema_owner',signature);
 EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC',signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO assps_p3t_school51,assps_p3t_school52',signature);
 END LOOP; END $function_acl$;
COMMIT;
