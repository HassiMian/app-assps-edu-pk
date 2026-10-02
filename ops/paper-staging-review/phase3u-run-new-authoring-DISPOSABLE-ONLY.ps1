# Phase 3U: ONLY self-created synthetic PostgreSQL18 cluster. Never connect to an existing instance.
[CmdletBinding()]
param([ValidateSet('RUN_PHASE3U_SYNTHETIC_ONLY')][string]$Action)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if($Action -ne 'RUN_PHASE3U_SYNTHETIC_ONLY'){
 throw 'Explicit RUN_PHASE3U_SYNTHETIC_ONLY is required; no implicit DB command.'
}
$bin='C:\Program Files\PostgreSQL\18\bin'
$port=55443
$db='assps_paper_phase3u_ci'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$schema=Join-Path $PSScriptRoot 'phase3u-new-authoring-DISPOSABLE-ONLY.sql'
if(-not (Test-Path $schema)){throw 'Versioned guarded Phase3U SQL is missing.'}
if((Get-PSDrive C).Free -lt 2GB){throw 'Less than 2GB free C drive: abort disposable test.'}
foreach($n in @('initdb.exe','pg_ctl.exe','psql.exe','createdb.exe','pg_dump.exe','pg_restore.exe')){
 if(-not(Test-Path (Join-Path $bin $n))){throw "Missing installed PG18 binary: $n"}
}
if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){
 throw 'Phase3U port 55443 already in use. Refuse access to existing cluster.'
}
$root=Join-Path $env:TEMP ('assps-phase3u-ephemeral-'+[guid]::NewGuid().ToString('N'))
if(Test-Path -LiteralPath $root){throw 'Generated disposable path collision.'}
New-Item -ItemType Directory -Path $root|Out-Null
$marker=Join-Path $root '.ASSPS_PHASE3U_SELF_CREATED'
Set-Content -LiteralPath $marker -Value 'SELF-CREATED SYNTHETIC-ONLY PHASE3U' -Encoding ASCII
$data=Join-Path $root 'data'
$pwFile=Join-Path $root 'initdb-password.txt'
$log=Join-Path $root 'pg.log'
$archive=Join-Path $root 'synthetic-new-authoring-PG18.dump'
$manifest=Join-Path $root 'synthetic-evidence.json'
$started=$false;$stopped=$false;$complete=$false
$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
function New-RandomSecret {
 $b=New-Object byte[] 24;$rng.GetBytes($b)
 return [BitConverter]::ToString($b).Replace('-','').ToLowerInvariant()
}
$pwAdmin=New-RandomSecret;$pw51=New-RandomSecret;$pw52=New-RandomSecret
function Assert-NativeExit([string]$stage){
 if($LASTEXITCODE -ne 0){throw "Synthetic Phase3U $stage failed (exit $LASTEXITCODE)."}
}
try{
 Write-Output 'PHASE3U_TARGET=SELF_CREATED_PG18_127.0.0.1_55443'
 Write-Output 'EXISTING_DATABASES_AND_PORT_5432=NOT_TOUCHED'
 Set-Content -LiteralPath $pwFile -Value $pwAdmin -Encoding ASCII -NoNewline
 & (Join-Path $bin 'initdb.exe') -D $data -U assps_p3u_admin -A scram-sha-256 "--pwfile=$pwFile" --encoding=UTF8 --locale=C
 Assert-NativeExit 'initdb'
 Remove-Item -LiteralPath $pwFile -Force
 & (Join-Path $bin 'pg_ctl.exe') -D $data -l $log -o "-h 127.0.0.1 -p 55443 -c max_connections=16 -c shared_buffers=32MB" -w start
 Assert-NativeExit 'own-cluster startup'
 $started=$true
 $env:PGHOST='127.0.0.1';$env:PGPORT='55443'
 $env:PGUSER='assps_p3u_admin';$env:PGPASSWORD=$pwAdmin
 $roleSql=(
  "CREATE ROLE assps_p3t_school51 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT PASSWORD '$pw51';"+
  "CREATE ROLE assps_p3t_school52 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT PASSWORD '$pw52';"+
  'CREATE ROLE assps_p3u_identity_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;'+
  'CREATE ROLE assps_p3u_schema_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;')
 $roleSql| & (Join-Path $bin 'psql.exe') -q -X -v ON_ERROR_STOP=1 -d postgres
 Assert-NativeExit 'four separate synthetic roles'
 $roleSql=$null
 & (Join-Path $bin 'createdb.exe') -E UTF8 -T template0 $db
 Assert-NativeExit 'create exact isolated disposable database'
 $source=Get-Content -LiteralPath $schema -Raw
 foreach($required in @('assps_paper_phase3u_ci','55443','phase3u_guard',
  'phase3t_lock_published_snapshot','new_authoring_revisions_staging','FORCE ROW LEVEL SECURITY')){
  if(-not $source.Contains($required)){throw "SQL safety contract missing: $required"}
 }
 & (Join-Path $bin 'psql.exe') -q -X -v ON_ERROR_STOP=1 -d $db -f $schema
 Assert-NativeExit 'guarded separate new-authoring schema'
 Write-Output 'PHASE3U_GUARDED_SQL=APPLIED_TO_OWN_SYNTHETIC_DB_ONLY'
 # Native PostgreSQL 18 smoke checks: deliberately no npm install or node-postgres dependency.
 $env:ASSPS_PHASE3U_REAL_PG='EXPLICIT_SYNTHETIC_PG18_55443'
 $env:ASSPS_PHASE3U_ADMIN_PASSWORD=$pwAdmin
 $env:ASSPS_PHASE3U_51_PASSWORD=$pw51
 $env:ASSPS_PHASE3U_52_PASSWORD=$pw52
 & (Join-Path $PSScriptRoot 'phase3u-native-smoke-DISPOSABLE-ONLY.ps1') -Action REAL_SYNTHETIC_NATIVE_55443
 if(-not $?) {throw 'Native real PostgreSQL smoke script did not complete.'}
 $env:PGUSER='assps_p3u_admin';$env:PGPASSWORD=$pwAdmin
 Write-Output 'PHASE3U_REAL_PG18_TWO_SCHOOL_NATIVE_TESTS=PASS'
& (Join-Path $bin 'pg_dump.exe') -Fc --file=$archive -d $db
 Assert-NativeExit 'synthetic custom archive backup'
 if((Get-Item $archive).Length -lt 2000){throw 'Suspiciously small synthetic backup.'}
 & (Join-Path $bin 'pg_restore.exe') --list $archive|Out-Null
 Assert-NativeExit 'synthetic custom backup catalog inspection'
 & (Join-Path $bin 'createdb.exe') -E UTF8 -T template0 assps_paper_phase3u_restore_ci
 Assert-NativeExit 'create second fresh synthetic restore DB'
 & (Join-Path $bin 'pg_restore.exe') --exit-on-error -d assps_paper_phase3u_restore_ci $archive
 Assert-NativeExit 'independent isolated synthetic backup restore'
 $counts=(& (Join-Path $bin 'psql.exe') -X -At -v ON_ERROR_STOP=1 -d assps_paper_phase3u_restore_ci -c 'SELECT (SELECT count(*) FROM public.new_authoring_drafts_staging),(SELECT count(*) FROM public.new_authoring_revisions_staging)')
 Assert-NativeExit 'restored new-authoring table counts'
 if(($counts|Out-String).Trim() -ne '1|2'){
  throw "Unexpected synthetic restored native records: $counts"
 }
 $digest=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
 $proof=[ordered]@{
  format='ASSPS_PHASE3U_SYNTHETIC_POSTGRES18_V1'
  syntheticOnly=$true
  clusterHost='127.0.0.1'
  clusterPort=55443
  productionDatabaseAccessed=$false
  schoolCredentialsRead=$false
  realTwoSchoolScopeTest='PASS'
  actualPostgresNewAuthoringCreateCasRead='PASS'
  actualPublishedSnapshotRevocationTest='PASS'
  sourceNativeTextShaImmutableRevision='PASS'
  separateSyntheticArchiveRestore='PASS'
  customArchiveBytes=(Get-Item $archive).Length
  customArchiveSha256=$digest
  curriculumRealProviderApproved=$false
  institutionBackupVerified=$false
  productionDeploymentPerformed=$false
 }
 $proof|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $manifest -Encoding UTF8
 Write-Output 'PHASE3U_SYNTHETIC_RESTORE=PASS_1_DRAFT_2_REVISIONS'
 Write-Output ('PHASE3U_ARCHIVE_SHA256='+$digest)
 Write-Output ('PHASE3U_SYNTHETIC_EVIDENCE='+$manifest)
 $complete=$true
}finally{
 if(Test-Path -LiteralPath $pwFile){Remove-Item -LiteralPath $pwFile -Force -ErrorAction SilentlyContinue}
 if($started){
  & (Join-Path $bin 'pg_ctl.exe') -D $data -m fast -w stop
  if($LASTEXITCODE -eq 0){$stopped=$true;Write-Output 'PHASE3U_SELF_CREATED_CLUSTER_STOPPED=true'}
  else{Write-Warning 'Could not confirm stop of owned synthetic cluster; retaining all test data.'}
 }
 foreach($key in @('PGHOST','PGPORT','PGUSER','PGPASSWORD','NODE_PATH',
  'ASSPS_PHASE3U_REAL_PG','ASSPS_PHASE3U_ADMIN_PASSWORD',
  'ASSPS_PHASE3U_51_PASSWORD','ASSPS_PHASE3U_52_PASSWORD')){
  Remove-Item ('Env:'+$key) -ErrorAction SilentlyContinue
 }
 $pwAdmin=$null;$pw51=$null;$pw52=$null;$rng.Dispose()
 if($stopped -and (Test-Path -LiteralPath $marker) -and
    $root.StartsWith((Join-Path $env:TEMP 'assps-phase3u-ephemeral-'),
     [System.StringComparison]::OrdinalIgnoreCase)){
  Remove-Item -LiteralPath $data -Recurse -Force
  Write-Output 'PHASE3U_STOPPED_SELF_CREATED_DB_DATA_CLEANED=true'
 }
}
if(-not $complete){throw 'Phase3U disposable-only real verification incomplete.'}
Write-Output 'PHASE3U_REAL_PG18_SYNTHETIC_CHECK_COMPLETE_NO_DEPLOY'
