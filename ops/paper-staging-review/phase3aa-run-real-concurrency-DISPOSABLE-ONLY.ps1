# Phase 3Z: real JS adapter against ONLY a self-created PG18 synthetic cluster; reuses guarded Phase3U schema.
[CmdletBinding()]
param([ValidateSet('RUN_PHASE3AA_REAL_ADAPTER_SYNTHETIC_ONLY')][string]$Action)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if($Action -ne 'RUN_PHASE3AA_REAL_ADAPTER_SYNTHETIC_ONLY'){
 throw 'Explicit RUN_PHASE3AA_REAL_ADAPTER_SYNTHETIC_ONLY is required; no implicit DB command.'
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
$root=Join-Path $env:TEMP ('assps-phase3aa-ephemeral-'+[guid]::NewGuid().ToString('N'))
if(Test-Path -LiteralPath $root){throw 'Generated disposable path collision.'}
New-Item -ItemType Directory -Path $root|Out-Null
$marker=Join-Path $root '.ASSPS_PHASE3AA_SELF_CREATED'
$deps=Join-Path $root 'offline-deps'
Set-Content -LiteralPath $marker -Value 'SELF-CREATED SYNTHETIC-ONLY PHASE3AA' -Encoding ASCII
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
 Write-Output 'PHASE3AA_TARGET=SELF_CREATED_PG18_127.0.0.1_55443'
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
 # Obtain pg@8.20.0 only from already-cached tarballs into OWN ephemeral fixture dir.
 # Never modify project/JARVIS node_modules; --offline forbids network fetching.
 & npm install pg@8.20.0 --offline --ignore-scripts --no-audit --no-fund --prefix $deps --loglevel error
 Assert-NativeExit 'local cached pg isolation'
 if(-not (Test-Path (Join-Path $deps 'node_modules\pg\package.json'))){
  throw 'Offline node-postgres dependency was not installed in marker-owned test directory.'
 }
 $env:NODE_PATH=Join-Path $deps 'node_modules'
 $env:ASSPS_PHASE3AA_REAL_PG='SELF_CREATED_PG18_127_0_0_1_55443'
 $env:ASSPS_PHASE3AA_OWNED_CLUSTER_MARKER=$marker
 $env:ASSPS_PHASE3U_ADMIN_PASSWORD=$pwAdmin
 $env:ASSPS_PHASE3U_51_PASSWORD=$pw51
 $env:ASSPS_PHASE3U_52_PASSWORD=$pw52
 & node --test --test-concurrency=1 (Join-Path $repo 'al-siddique-backend\src\tests\newAuthoringConcurrencyPhase3AA.test.js')
 Assert-NativeExit 'actual JS Phase3S Phase3T PG18 integration'
 $env:PGUSER='assps_p3u_admin';$env:PGPASSWORD=$pwAdmin
 Write-Output 'PHASE3AA_REAL_PG18_JS_ADAPTER_TESTS=PASS'
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
 if(($counts|Out-String).Trim() -ne '2|4'){
  throw "Unexpected synthetic restored native records: $counts"
 }
 $digest=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
 $proof=[ordered]@{
  format='ASSPS_PHASE3AA_REAL_JS_ADAPTER_SYNTHETIC_PG18_V1'
  syntheticOnly=$true
  clusterHost='127.0.0.1'
  clusterPort=55443
  productionDatabaseAccessed=$false
  schoolCredentialsRead=$false
  realTwoSchoolScopeTest='PASS'
  actualPhase3SPhase3TNodePostgresIntegration='PASS'
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
 Write-Output 'PHASE3AA_SYNTHETIC_RESTORE=PASS_2_DRAFTS_4_REVISIONS'
 Write-Output ('PHASE3AA_ARCHIVE_SHA256='+$digest)
 Write-Output ('PHASE3AA_SYNTHETIC_EVIDENCE='+$manifest)
 $complete=$true
}finally{
 if(Test-Path -LiteralPath $pwFile){Remove-Item -LiteralPath $pwFile -Force -ErrorAction SilentlyContinue}
 if($started){
  & (Join-Path $bin 'pg_ctl.exe') -D $data -m fast -w stop
  if($LASTEXITCODE -eq 0){$stopped=$true;Write-Output 'PHASE3AA_SELF_CREATED_CLUSTER_STOPPED=true'}
  else{Write-Warning 'Could not confirm stop of owned synthetic cluster; retaining all test data.'}
 }
 foreach($key in @('PGHOST','PGPORT','PGUSER','PGPASSWORD','NODE_PATH',
  'ASSPS_PHASE3AA_REAL_PG','ASSPS_PHASE3AA_OWNED_CLUSTER_MARKER',
  'ASSPS_PHASE3U_ADMIN_PASSWORD',
  'ASSPS_PHASE3U_51_PASSWORD','ASSPS_PHASE3U_52_PASSWORD')){
  Remove-Item ('Env:'+$key) -ErrorAction SilentlyContinue
 }
 $pwAdmin=$null;$pw51=$null;$pw52=$null;$rng.Dispose()
 if($stopped -and (Test-Path -LiteralPath $marker) -and
    $root.StartsWith((Join-Path $env:TEMP 'assps-phase3aa-ephemeral-'),
     [System.StringComparison]::OrdinalIgnoreCase)){
  Remove-Item -LiteralPath $data -Recurse -Force
  if(Test-Path -LiteralPath $deps){Remove-Item -LiteralPath $deps -Recurse -Force}
  Write-Output 'PHASE3AA_STOPPED_SELF_CREATED_DB_AND_OFFLINE_DEPS_CLEANED=true'
 }
}
if(-not $complete){throw 'Phase3AA disposable-only real JS adapter verification incomplete.'}
Write-Output 'PHASE3AA_REAL_PG18_JS_ADAPTER_CHECK_COMPLETE_NO_DEPLOY'
