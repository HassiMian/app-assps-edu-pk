# Phase 3H. Creates its OWN throwaway PostgreSQL18 cluster ONLY, never existing 5432.
# Test credentials and fake data stay outside Git. Required explicit invocation/marker.
[CmdletBinding()]
param([ValidateSet('RUN_ROLE_BOUND_SYNTHETIC_ONLY')][string]$Action)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if($Action -ne 'RUN_ROLE_BOUND_SYNTHETIC_ONLY'){
 throw 'Explicit RUN_ROLE_BOUND_SYNTHETIC_ONLY is mandatory. Refusing implicit DB startup.'
}
$bin='C:\Program Files\PostgreSQL\18\bin'
$port=55440
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backend=Join-Path $repo 'al-siddique-backend\src'
$baseSchema=Join-Path $PSScriptRoot 'phase3g-DISPOSABLE-ONLY-schema.sql'
$rolePatch=Join-Path $PSScriptRoot 'phase3h-role-bound-DISPOSABLE-ONLY.sql'
if((Get-PSDrive -Name C).Free -lt 2GB){
 throw 'Cannot safely initialize synthetic DB: C has less than 2 GB free.'
}
foreach($name in @('initdb.exe','pg_ctl.exe','psql.exe','createdb.exe','pg_dump.exe','pg_restore.exe')){
 if(-not(Test-Path (Join-Path $bin $name))){throw ('PostgreSQL18 missing: '+$name)}
}
if(-not(Test-Path $baseSchema) -or -not(Test-Path $rolePatch)){
 throw 'Versioned disposable base/role schema missing; refuse fabrication.'
}
if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){
 throw 'Port 55440 already listened: refuse access to ANY existing cluster.'
}
$root=Join-Path $env:TEMP ('assps-phase3h-ephemeral-'+[guid]::NewGuid().ToString('N'))
if(Test-Path $root){throw 'Generated path collision; refuse.'}
New-Item -ItemType Directory -Path $root|Out-Null
$marker=Join-Path $root '.ASSPS_PHASE3H_SELF_CREATED'
Set-Content -LiteralPath $marker -Value 'SELF-CREATED FAKE-ONLY ASSPS PHASE3H' -Encoding ASCII
$data=Join-Path $root 'data'
$pwfile=Join-Path $root 'initdb-password.txt'
$log=Join-Path $root 'pg.log'
$generated=Join-Path $root 'base-phase3h-generated-DISPOSABLE.sql'
$archive=Join-Path $root 'synthetic-role-bound-PG18-backup.dump'
$manifest=Join-Path $root 'synthetic-role-bound-evidence.json'
$started=$false;$stopped=$false;$success=$false
$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
function New-DisposableSecret {
 $bytes=New-Object byte[] 24
 $rng.GetBytes($bytes)
 return [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant()
}
$adminPw=New-DisposableSecret
$pw51=New-DisposableSecret
$pw52=New-DisposableSecret
function Assert-Exit([string]$stage){
 if($LASTEXITCODE -ne 0){throw ('Synthetic Phase3H '+$stage+' failed, exit='+$LASTEXITCODE)}
}
try{
 Write-Output 'PHASE3H_ISOLATED=NEW_MARKER_PROTECTED_LOCAL_CLUSTER_127_0_0_1_PORT_55440'
 Write-Output 'EXISTING_PG5432=NOT_TOUCHED'
 Set-Content -LiteralPath $pwfile -Encoding ASCII -NoNewline -Value $adminPw
 & (Join-Path $bin 'initdb.exe') -D $data -U assps_p3g_admin -A scram-sha-256 "--pwfile=$pwfile" --encoding=UTF8 --locale=C
 Assert-Exit 'initdb'
 Remove-Item -LiteralPath $pwfile -Force
 & (Join-Path $bin 'pg_ctl.exe') -D $data -l $log -o "-h 127.0.0.1 -p 55440 -c max_connections=32" -w start
 Assert-Exit 'cluster start'
 $started=$true
 $env:PGHOST='127.0.0.1';$env:PGPORT='55440'
 $env:PGUSER='assps_p3g_admin';$env:PGPASSWORD=$adminPw
 # Legacy synthetic role is NOLOGIN; cannot be a bypass connector in Phase3H.
 $sql=("CREATE ROLE assps_p3g_app NOLOGIN NOSUPERUSER NOBYPASSRLS;"+
  "CREATE ROLE assps_p3h_school51 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '"+$pw51+"';"+
  "CREATE ROLE assps_p3h_school52 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '"+$pw52+"';")
 $sql | & (Join-Path $bin 'psql.exe') -X -v ON_ERROR_STOP=1 -d postgres
 Assert-Exit 'create separate fictional school LOGIN roles'
 $sql=$null
 & (Join-Path $bin 'createdb.exe') -E UTF8 -T template0 assps_paper_phase3h_ci
 Assert-Exit 'create exact disposable role-bound DB'
 # Safe static adaptation of previously PROVEN synthetic-only SQL.
 # Its DO guard will STILL reject any wrong port/DB or pre-existing school/paper table.
 $src=Get-Content -LiteralPath $baseSchema -Raw
 if($src -notmatch '55439' -or $src -notmatch 'assps_paper_phase3f_ci'){
  throw 'Unexpected Phase3G base SQL; refuse to synthesize Phase3H baseline.'
 }
 $converted=$src.Replace('55439','55440').Replace('assps_paper_phase3f_ci','assps_paper_phase3h_ci')
 Set-Content -LiteralPath $generated -Encoding UTF8 -Value $converted
 & (Join-Path $bin 'psql.exe') -X -v ON_ERROR_STOP=1 -d assps_paper_phase3h_ci -f $generated
 Assert-Exit 'apply pristine synthetic foundation with actual hard port/database guard'
 & (Join-Path $bin 'psql.exe') -X -v ON_ERROR_STOP=1 -d assps_paper_phase3h_ci -f $rolePatch
 Assert-Exit 'apply role-bound identity hardening on disposable DB only'
 Write-Output 'PHASE3H_ROLE_BOUND_SYNTHETIC_SCHEMA=APPLIED_TO_OWN_CLUSTER_ONLY'
 # Leverage ALREADY INSTALLED pg module; no npm downloads or package mutations.
 $installedPg=Join-Path $repo 'al-siddique-frontend\node_modules'
 if(-not(Test-Path (Join-Path $installedPg 'pg'))){
  throw 'Existing node-postgres module unavailable; refuse network install.'
 }
 $env:NODE_PATH=$installedPg
 $env:ASSPS_PHASE3H_REAL_PG='EXPLICIT_SYNTHETIC_ROLE_BOUND_55440'
 $env:ASSPS_PHASE3H_ADMIN_URL="postgresql://assps_p3g_admin:$adminPw@127.0.0.1:55440/assps_paper_phase3h_ci"
 $env:ASSPS_PHASE3H_51_URL="postgresql://assps_p3h_school51:$pw51@127.0.0.1:55440/assps_paper_phase3h_ci"
 $env:ASSPS_PHASE3H_52_URL="postgresql://assps_p3h_school52:$pw52@127.0.0.1:55440/assps_paper_phase3h_ci"
 Push-Location $backend
 try{
  & node --test 'tests/paperRoleBoundRealPostgresPhase3H.test.js'
  Assert-Exit 'REAL role-bound adversarial two-school integration'
 }finally{Pop-Location}
 Write-Output 'PHASE3H_REAL_POSTGRES_ROLE_BOUND_ATTACK_TESTS=PASS'
 & (Join-Path $bin 'pg_dump.exe') -Fc --file=$archive -d assps_paper_phase3h_ci
 Assert-Exit 'real fictional custom archive backup'
 if((Get-Item $archive).Length -lt 2000){throw 'Synthetic archive unexpectedly small.'}
 $archiveSha=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
 & (Join-Path $bin 'pg_restore.exe') --list $archive |Out-Null
 Assert-Exit 'archive listing inspection'
 & (Join-Path $bin 'createdb.exe') -E UTF8 -T template0 assps_paper_phase3h_restore_ci
 Assert-Exit 'create second empty database'
 & (Join-Path $bin 'pg_restore.exe') --exit-on-error -d assps_paper_phase3h_restore_ci $archive
 Assert-Exit 'restore exact native/role-bound source schema to separate database'
 $env:ASSPS_PHASE3H_RESTORE_URL="postgresql://assps_p3g_admin:$adminPw@127.0.0.1:55440/assps_paper_phase3h_restore_ci"
 $env:ASSPS_PHASE3H_RESTORE_51_URL="postgresql://assps_p3h_school51:$pw51@127.0.0.1:55440/assps_paper_phase3h_restore_ci"
 Push-Location $backend
 try{
  & node --test 'tests/paperRoleBoundRestorePhase3H.test.js'
  Assert-Exit 'REAL independent role-bound synthetic archive RESTORE'
 }finally{Pop-Location}
 $proof=[ordered]@{
  format='ASSPS_PHASE3H_SYNTHETIC_ROLE_BOUND_PG18_V1'
  syntheticOnly=$true
  isolatedHost='127.0.0.1'
  isolatedPort=55440
  active5432ServiceAccessed=$false
  genuineSchoolCredentialsRead=$false
  genuinePaperVisualSignoff=$false
  actualEncryptedSchoolBackupVerified=$false
  roleLoginAttestation='REAL_ADVERSARIAL_TEST_PASS'
  forgedGucCannotChangeRlsSchool='REAL_TEST_PASS'
  arbitrarySetRoleOtherSchoolDenied='REAL_TEST_PASS'
  realSerializableDraftCas='REAL_TEST_PASS'
  distinctDatabaseNativeShaAndRoleRlsRestore='REAL_TEST_PASS'
  archiveBytes=(Get-Item $archive).Length
  archiveSha256=$archiveSha
  originalPaperRendererChanged=$false
  productionDeploymentPerformed=$false
 }
 $proof|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $manifest -Encoding UTF8
 Write-Output ('PHASE3H_SYNTHETIC_ARCHIVE_BYTES='+(Get-Item $archive).Length)
 Write-Output ('PHASE3H_SYNTHETIC_ARCHIVE_SHA256='+$archiveSha)
 Write-Output ('PHASE3H_NO_SECRET_EVIDENCE='+$manifest)
 $success=$true
}finally{
 if(Test-Path $pwfile){Remove-Item -LiteralPath $pwfile -Force -ErrorAction SilentlyContinue}
 if($started){
  & (Join-Path $bin 'pg_ctl.exe') -D $data -m fast -w stop
  if($LASTEXITCODE -eq 0){$stopped=$true;Write-Output 'PHASE3H_OWN_CLUSTER_STOPPED=true'}
  else{Write-Warning 'Disposable cluster did not confirm stop; no cleanup of running data.'}
 }
 foreach($name in @('PGHOST','PGPORT','PGUSER','PGPASSWORD','NODE_PATH',
  'ASSPS_PHASE3H_REAL_PG','ASSPS_PHASE3H_ADMIN_URL','ASSPS_PHASE3H_51_URL',
  'ASSPS_PHASE3H_52_URL','ASSPS_PHASE3H_RESTORE_URL','ASSPS_PHASE3H_RESTORE_51_URL')){
  Remove-Item ('Env:'+$name) -ErrorAction SilentlyContinue
 }
 $adminPw=$null;$pw51=$null;$pw52=$null;$rng.Dispose()
 if($stopped -and (Test-Path $marker) -and
    $root.StartsWith((Join-Path $env:TEMP 'assps-phase3h-ephemeral-'),
    [System.StringComparison]::OrdinalIgnoreCase)){
  # Only our OWN verified stopped throwaway cluster data, never other service/directory.
  Remove-Item -LiteralPath $data -Recurse -Force
  if(Test-Path $generated){Remove-Item -LiteralPath $generated -Force}
  Write-Output 'PHASE3H_STOPPED_SELF_CREATED_DATA_REMOVED=true'
 }
}
if(-not $success){throw 'Real disposable Phase3H identity verification was incomplete.'}
Write-Output 'PHASE3H_REAL_ROLE_BOUND_PG_AND_SEPARATE_RESTORE=COMPLETE_SYNTHETIC_ONLY'
