# Phase 3U: native psql actual two-school synthetic tests; invoked by OWN cluster runner only.
[CmdletBinding()]
param([ValidateSet('REAL_SYNTHETIC_NATIVE_55443')][string]$Action)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if($Action -ne 'REAL_SYNTHETIC_NATIVE_55443' -or
 $env:ASSPS_PHASE3U_REAL_PG -ne 'EXPLICIT_SYNTHETIC_PG18_55443' -or
 $env:PGHOST -ne '127.0.0.1' -or $env:PGPORT -ne '55443' -or
 -not $env:ASSPS_PHASE3U_ADMIN_PASSWORD -or
 -not $env:ASSPS_PHASE3U_51_PASSWORD -or
 -not $env:ASSPS_PHASE3U_52_PASSWORD){
 throw 'Phase3U native psql accepts ONLY self-created 127.0.0.1:55443 disposable runner.'
}
$exe='C:\Program Files\PostgreSQL\18\bin\psql.exe'
$db='assps_paper_phase3u_ci'
function As-Pg([string]$login,[string]$password,[string]$sql,[string]$label){
 $env:PGUSER=$login;$env:PGPASSWORD=$password
 $value=$sql | & $exe -q -X -At -v ON_ERROR_STOP=1 -d $db
 if($LASTEXITCODE -ne 0){throw ('REAL Phase3U synthetic step failed: '+$label)}
 return ($value|Out-String).Trim()
}
function Expected([string]$actual,[string]$expected,[string]$label){
 if($actual -ne $expected){throw ("REAL Phase3U assertion $label; expected=$expected; actual=$actual")}
}
function Sha([string]$value){
 $instance=[Security.Cryptography.SHA256]::Create()
 try{return [BitConverter]::ToString($instance.ComputeHash(
  [Text.Encoding]::UTF8.GetBytes($value))).Replace('-','').ToLowerInvariant()}
 finally{$instance.Dispose()}
}
$admin='assps_p3u_admin'
$school51='assps_p3t_school51'
$school52='assps_p3t_school52'
$secretAdmin=$env:ASSPS_PHASE3U_ADMIN_PASSWORD
$secret51=$env:ASSPS_PHASE3U_51_PASSWORD
$secret52=$env:ASSPS_PHASE3U_52_PASSWORD
$binding=('c'*64)
$schoolScope="SELECT public.phase3t_session_school_id()::text || '|' || public.phase3t_session_tenant_id()"
Expected (As-Pg $admin $secretAdmin "SELECT current_database() || '|' || current_setting('port') || '|' || current_setting('listen_addresses')" 'target') 'assps_paper_phase3u_ci|55443|127.0.0.1' 'guarded self-created target'
Expected (As-Pg $school51 $secret51 $schoolScope 'login51') '51|tenant-51' 'independent school51 session'
Expected (As-Pg $school52 $secret52 $schoolScope 'login52') '52|tenant-52' 'independent school52 session'
$pub="INSERT INTO public.new_authoring_approved_snapshots_staging "+
 "(school_id,tenant_id,binding_sha256,revision,status) "+
 "VALUES(51,'tenant-51','$binding',7,'PUBLISHED_APPROVED');"+
 "SELECT revision FROM public.new_authoring_approved_snapshots_staging WHERE school_id=51;"
Expected (As-Pg $admin $secretAdmin $pub 'synthetic published snapshot seed') '7' 'independent published snapshot row'
$lock="SELECT revision FROM public.phase3t_lock_published_snapshot(51,'tenant-51','$binding',7);"
Expected (As-Pg $school51 $secret51 $lock 'private snapshot lock 51') '7' 'publisher lock for school 51'
Expected (As-Pg $school52 $secret52 $lock 'private snapshot lock wrong school') '' 'cross-school publication not disclosed'
$priv="SELECT CASE WHEN NOT has_table_privilege(current_user,'public.phase3u_identity_bindings','SELECT') AND "+
 "NOT has_table_privilege(current_user,'public.new_authoring_approved_snapshots_staging','SELECT') AND "+
 "NOT has_table_privilege(current_user,'public.new_authoring_revisions_staging','UPDATE') "+
 "THEN 'PASS' ELSE 'FAIL' END;"
Expected (As-Pg $school51 $secret51 $priv 'least-privilege grants') 'PASS' 'direct private mapping/snapshot/audit modification denied'
$fakeGuc="SELECT set_config('app.paper_school_id','52',false); SELECT public.phase3t_session_school_id();"
$guResult=As-Pg $school51 $secret51 $fakeGuc 'untrusted GUC attack simulation'
Expected (($guResult -split '[\r\n]+'|Select-Object -Last 1)) '51' 'RLS school identity unaffected by client GUC'
# Original native JSON retains escaped Urdu text losslessly; all test data are fabricated.
$native='{"id":"draft-phase3u-001","format":"assps-new-authoring-paper","documentModel":"PaperDocumentNewAuthoring","schemaVersion":1,"status":"UNSAVED_LOCAL_DRAFT","sourceIdentity":{"draftId":"draft-phase3u-001","kind":"NEW_AUTHORING_APPROVED_CURRICULUM","approvedSnapshotRevision":7},"sourceLedger":[{"questionId":"q1","evidence":"synthetic"}],"canonicalV13MigrationClaim":false,"metadata":{"title":"First Term Biology","urdu":"\u062d\u06cc\u0627\u062a\u06cc\u0627\u062a"}}'
$nativeHash=Sha $native
$next=$native.Replace('First Term Biology','Revised Biology')
$nextHash=Sha $next
$escaped=$native.Replace("'","''")
$escapedNext=$next.Replace("'","''")
$createSql=@"
BEGIN;
INSERT INTO public.new_authoring_drafts_staging
(school_id,tenant_id,draft_id,created_by,updated_by,status,source_protected,revision,native_json_text,native_sha256,approved_snapshot_revision,approved_binding_sha256)
VALUES(51,'tenant-51','draft-phase3u-001',110,110,'DRAFT',FALSE,1,'$escaped','$nativeHash',7,'$binding');
INSERT INTO public.new_authoring_revisions_staging
(school_id,tenant_id,draft_id,revision,native_json_text,native_sha256,previous_native_sha256,actor_id,change_kind)
SELECT school_id,tenant_id,draft_id,revision,native_json_text,native_sha256,NULL,110,'INITIAL_AUTHORING'
FROM public.new_authoring_drafts_staging WHERE school_id=51 AND tenant_id='tenant-51' AND draft_id='draft-phase3u-001';
COMMIT;
SELECT revision::text || '|' || native_sha256 FROM public.new_authoring_drafts_staging
WHERE school_id=51 AND tenant_id='tenant-51' AND draft_id='draft-phase3u-001';
"@
Expected (As-Pg $school51 $secret51 $createSql 'real initial native text draft plus audit') ("1|"+$nativeHash) 'first atomic draft and immutable initial revision'
Expected (As-Pg $school52 $secret52 "SELECT count(*) FROM public.new_authoring_drafts_staging WHERE school_id=51;" 'real cross-school RLS SELECT') '0' 'FORCE RLS hides school 51 from school 52'
$urdu=[string]([char]0x062d)+[char]0x06cc+[char]0x0627+[char]0x062a+[char]0x06cc+[char]0x0627+[char]0x062a
$urduHex=[BitConverter]::ToString([Text.Encoding]::UTF8.GetBytes($urdu)).Replace('-','').ToLowerInvariant()
$fromNative="SELECT encode(convert_to((native_json_text::jsonb->'metadata'->>'urdu'),'UTF8'),'hex') FROM public.new_authoring_drafts_staging WHERE school_id=51;"
Expected (As-Pg $school51 $secret51 $fromNative 'fabricated Urdu source read') $urduHex 'Urdu UTF8 bytes preserved through native JSON parsing'
$reviseSql=@"
BEGIN;
UPDATE public.new_authoring_drafts_staging SET
native_json_text='$escapedNext',native_sha256='$nextHash',revision=2,updated_by=110,updated_at=now()
WHERE school_id=51 AND tenant_id='tenant-51' AND draft_id='draft-phase3u-001'
AND revision=1 AND native_sha256='$nativeHash' AND approved_snapshot_revision=7
AND approved_binding_sha256='$binding';
INSERT INTO public.new_authoring_revisions_staging
(school_id,tenant_id,draft_id,revision,native_json_text,native_sha256,previous_native_sha256,actor_id,change_kind)
SELECT school_id,tenant_id,draft_id,revision,native_json_text,native_sha256,
'$nativeHash',110,'DRAFT_CAS_REVISION'
FROM public.new_authoring_drafts_staging
WHERE school_id=51 AND tenant_id='tenant-51' AND draft_id='draft-phase3u-001' AND revision=2;
COMMIT;
SELECT revision::text || '|' || native_sha256 FROM public.new_authoring_drafts_staging
WHERE school_id=51 AND tenant_id='tenant-51' AND draft_id='draft-phase3u-001';
"@
Expected (As-Pg $school51 $secret51 $reviseSql 'real CAS and immutable SHA link') ("2|"+$nextHash) 'serializable revision updated exactly once'
$chain="SELECT count(*)::text || '|' || MAX(CASE WHEN revision=2 THEN previous_native_sha256 END) FROM public.new_authoring_revisions_staging WHERE school_id=51 AND tenant_id='tenant-51';"
Expected (As-Pg $school51 $secret51 $chain 'immutable prior SHA') ("2|"+$nativeHash) 'two append-only revisions with exact predecessor'
$actualHash="SELECT CASE WHEN native_sha256=encode(sha256(convert_to(native_json_text,'UTF8')),'hex') THEN 'PASS' ELSE 'FAIL' END FROM public.new_authoring_drafts_staging WHERE school_id=51;"
Expected (As-Pg $school51 $secret51 $actualHash 'database recomputed native hash') 'PASS' 'database native TEXT and SHA match'
$stale="WITH u AS (UPDATE public.new_authoring_drafts_staging SET revision=2 WHERE school_id=51 AND tenant_id='tenant-51' AND revision=1 RETURNING revision) SELECT count(*) FROM u;"
Expected (As-Pg $school51 $secret51 $stale 'stale CAS negative') '0' 'outdated revision cannot match saved row'
$integrity=@'
DO $rev$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  UPDATE public.new_authoring_revisions_staging SET native_sha256=native_sha256 WHERE school_id=51;
 EXCEPTION WHEN OTHERS THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'PHASE3U REAL TEST: audit mutation unexpectedly allowed'; END IF;
END $rev$;
DO $ledger$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  UPDATE public.new_authoring_drafts_staging SET
   native_json_text=replace(native_json_text,'synthetic','forged'),
   native_sha256=encode(sha256(convert_to(replace(native_json_text,'synthetic','forged'),'UTF8')),'hex'),
   revision=revision+1 WHERE school_id=51;
 EXCEPTION WHEN OTHERS THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'PHASE3U REAL TEST: source ledger mutation allowed'; END IF;
END $ledger$;
SELECT count(*) FROM public.new_authoring_revisions_staging WHERE school_id=51;
'@
Expected (As-Pg $admin $secretAdmin $integrity 'actual audit/source immutable triggers') '2' 'real PG trigger blocks original ledger and revision mutation'
$revoke="UPDATE public.new_authoring_approved_snapshots_staging SET status='REVOKED' WHERE school_id=51 AND tenant_id='tenant-51' AND binding_sha256='$binding' AND revision=7 RETURNING status;"
Expected (As-Pg $admin $secretAdmin $revoke 'withdraw synthetic source publication') 'REVOKED' 'publication state was actually revoked'
Expected (As-Pg $school51 $secret51 $lock 'publication lock after revocation') '' 'revoked source cannot be locked for saving'
$denyAfterRevoke=@'
DO $revoked$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.new_authoring_drafts_staging SET revision=revision+1
   WHERE school_id=51 AND tenant_id='tenant-51' AND draft_id='draft-phase3u-001';
 EXCEPTION WHEN OTHERS THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PHASE3U REAL TEST: revoked source update unexpectedly allowed'; END IF;
END $revoked$;
SELECT revision FROM public.new_authoring_drafts_staging WHERE school_id=51;
'@
Expected (As-Pg $school51 $secret51 $denyAfterRevoke 'revoked source direct SQL attack') '2' 'database-level revocation guard retained original revision'
$env:PGUSER=$admin;$env:PGPASSWORD=$secretAdmin
Write-Output 'PHASE3U_NATIVE_REAL_PG=PASS_ROLE_TENANT_RLS_CAS_URDU_SHA_AUDIT_REVOCATION'
