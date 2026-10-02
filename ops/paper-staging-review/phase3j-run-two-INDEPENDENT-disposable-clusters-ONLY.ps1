# Phase3J. ONE-SHOT synthetic-only recovery across TWO newly initialized PG18
# clusters. Never connects to existing installed PostgreSQL port 5432 or app .env.
[CmdletBinding()]
param([ValidateSet('RUN_TWO_NEW_SYNTHETIC_CLUSTERS_ONLY')][string]$Action)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if($Action -ne 'RUN_TWO_NEW_SYNTHETIC_CLUSTERS_ONLY'){
 throw 'Explicit RUN_TWO_NEW_SYNTHETIC_CLUSTERS_ONLY required; refuse implicit database startup.'
}
$bin='C:\Program Files\PostgreSQL\18\bin'
$rootRepo=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backend=Join-Path $rootRepo 'al-siddique-backend\src'
$baseSql=Join-Path $PSScriptRoot 'phase3g-DISPOSABLE-ONLY-schema.sql'
$roleSql=Join-Path $PSScriptRoot 'phase3h-role-bound-DISPOSABLE-ONLY.sql'
$ownerSql=Join-Path $PSScriptRoot 'phase3i-least-privilege-DISPOSABLE-ONLY.sql'
if((Get-PSDrive -Name C).Free -lt 2GB){throw 'At least 2GB C: free required for independent TEST clusters.'}
foreach($n in @('initdb.exe','pg_ctl.exe','pg_dumpall.exe','pg_dump.exe','pg_restore.exe','createdb.exe','psql.exe')){
 if(-not(Test-Path (Join-Path $bin $n))){throw ('Missing installed PG18 binary: '+$n)}
}
foreach($f in @($baseSql,$roleSql,$ownerSql)){
 if(-not(Test-Path $f)){throw ('Versioned synthetic-only guarded schema missing: '+$f)}
}
foreach($port in @(55442,55443)){
 if(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue){
  throw ('Refusing pre-existing port listener, do not inspect/connect: '+$port)
 }
}
$installedPg=Join-Path $rootRepo 'al-siddique-frontend\node_modules'
if(-not(Test-Path (Join-Path $installedPg 'pg'))){
 throw 'Previously installed pg module unavailable. Refuse network install.'
}
$root=Join-Path $env:TEMP ('assps-phase3j-ephemeral-'+[guid]::NewGuid().ToString('N'))
if(Test-Path $root){throw 'Unexpected GUID directory collision.'}
New-Item -Path $root -ItemType Directory|Out-Null
$marker=Join-Path $root '.ASSPS_PHASE3J_SELF_CREATED'
Set-Content -LiteralPath $marker -Value 'Two separate entirely fictional isolated PG18 clusters ONLY' -Encoding ASCII
$sourceData=Join-Path $root 'source-data'
$targetData=Join-Path $root 'target-data'
$sourceLog=Join-Path $root 'source.log'
$targetLog=Join-Path $root 'target.log'
$sourcePwfile=Join-Path $root 'source-initial-password.txt'
$targetPwfile=Join-Path $root 'target-initial-password.txt'
$temporarySql=@(
 (Join-Path $root 'base-generated-SYNTHETIC.sql'),
 (Join-Path $root 'role-generated-SYNTHETIC.sql'),
 (Join-Path $root 'owner-generated-SYNTHETIC.sql')
)
$globals=Join-Path $root 'global-roles-NO-PASSWORDS-TEMPORARY.sql'
$archive=Join-Path $root 'synthetic-source-database.dump'
$manifest=Join-Path $root 'two-independent-cluster-evidence.json'
$sourceStarted=$false;$targetStarted=$false;$sourceStopped=$false
$targetStopped=$false;$success=$false
$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
function New-FakeSecret {
 $b=New-Object byte[] 24
 $rng.GetBytes($b)
 return [BitConverter]::ToString($b).Replace('-','').ToLowerInvariant()
}
$srcAdminPw=New-FakeSecret
$src51Pw=New-FakeSecret
$src52Pw=New-FakeSecret
$dstAdminPw=New-FakeSecret
$dst51Pw=New-FakeSecret
$dst52Pw=New-FakeSecret
function Check([string]$stage){
 if($LASTEXITCODE -ne 0){throw ('Phase3J fictional ONLY '+$stage+' FAILED, exit='+$LASTEXITCODE)}
}
function Set-PgSource{
 $env:PGHOST='127.0.0.1';$env:PGPORT='55442'
 $env:PGUSER='assps_p3g_admin';$env:PGPASSWORD=$srcAdminPw
}
function Set-PgTarget{
 $env:PGHOST='127.0.0.1';$env:PGPORT='55443'
 $env:PGUSER='assps_p3j_restore_admin';$env:PGPASSWORD=$dstAdminPw
}
try{
 Write-Output 'PHASE3J_NEW_CLUSTERS=127.0.0.1:55442_SOURCE_AND_55443_RECOVERY'
 Write-Output 'PHASE3J_EXISTING_5432_SERVICE=NEVER_TOUCHED'
 Set-Content -LiteralPath $sourcePwfile -Value $srcAdminPw -NoNewline -Encoding ASCII
 & (Join-Path $bin 'initdb.exe') -D $sourceData -U assps_p3g_admin -A scram-sha-256 "--pwfile=$sourcePwfile" --encoding=UTF8 --locale=C
 Check 'source initdb'
 Remove-Item -LiteralPath $sourcePwfile -Force
 & (Join-Path $bin 'pg_ctl.exe') -D $sourceData -l $sourceLog -o '-h 127.0.0.1 -p 55442 -c max_connections=32' -w start
 Check 'start source'
 $sourceStarted=$true
 Set-PgSource
 # Each distinct synthetic login is created ONLY inside our just initialized cluster.
 $roles=("CREATE ROLE assps_p3g_app NOLOGIN NOSUPERUSER NOBYPASSRLS;"+
  "CREATE ROLE assps_p3h_school51 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '"+$src51Pw+"';"+
  "CREATE ROLE assps_p3h_school52 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '"+$src52Pw+"';"+
  'CREATE ROLE assps_p3i_identity_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;')
 $roles | & (Join-Path $bin 'psql.exe') -X -v ON_ERROR_STOP=1 -d postgres
 Check 'synthetic source roles'
 $roles=$null
 & (Join-Path $bin 'createdb.exe') -E UTF8 -T template0 assps_paper_phase3j_ci
 Check 'create original fictional source database'
 # Previous Phase3G/H/I original files are NEVER modified. Re-scope their disposable
 # guards to the exact NEW source port/database in separate generated TEMP files only.
 $basetext=Get-Content -LiteralPath $baseSql -Raw
 $roletext=Get-Content -LiteralPath $roleSql -Raw
 $ownertext=Get-Content -LiteralPath $ownerSql -Raw
 if($basetext -notmatch '55439' -or $basetext -notmatch 'assps_paper_phase3f_ci' -or
  $roletext -notmatch '55440' -or $roletext -notmatch 'assps_paper_phase3h_ci' -or
  $ownertext -notmatch '55441' -or $ownertext -notmatch 'assps_paper_phase3i_ci'){
  throw 'Previously reviewed synthetic schema guard changed; refuse any adaptation.'
 }
 $adapted=@(
  $basetext.Replace('55439','55442').Replace('assps_paper_phase3f_ci','assps_paper_phase3j_ci'),
  $roletext.Replace('55440','55442').Replace('assps_paper_phase3h_ci','assps_paper_phase3j_ci'),
  $ownertext.Replace('55441','55442').Replace('assps_paper_phase3i_ci','assps_paper_phase3j_ci')
 )
 for($i=0;$i -lt $temporarySql.Count;$i++){
  Set-Content -LiteralPath $temporarySql[$i] -Value $adapted[$i] -Encoding UTF8
  & (Join-Path $bin 'psql.exe') -X -v ON_ERROR_STOP=1 -d assps_paper_phase3j_ci -f $temporarySql[$i]
  Check ('apply disposable source guarded patch index '+$i)
 }
 Write-Output 'PHASE3J_NEW_SOURCE=STRICT_ROLE_BOUND_LEAST_PRIVILEGE_READY'
 $env:NODE_PATH=$installedPg
 $env:ASSPS_PHASE3J_REAL_PG='EXPLICIT_TWO_NEW_CLUSTERS_55442_55443'
 $env:ASSPS_PHASE3J_SOURCE_ADMIN_URL="postgresql://assps_p3g_admin:$srcAdminPw@127.0.0.1:55442/assps_paper_phase3j_ci"
 $env:ASSPS_PHASE3J_SOURCE_51_URL="postgresql://assps_p3h_school51:$src51Pw@127.0.0.1:55442/assps_paper_phase3j_ci"
 $env:ASSPS_PHASE3J_SOURCE_52_URL="postgresql://assps_p3h_school52:$src52Pw@127.0.0.1:55442/assps_paper_phase3j_ci"
 Push-Location $backend
 try{
  & node --test 'tests/paperTrustedSchoolRouterRealPhase3J.test.js'
  Check 'REAL source role registry+CAS+adversarial tests'
 }finally{Pop-Location}
 Write-Output 'PHASE3J_REAL_SOURCE_PRIVATE_ROUTER_TESTS=PASS'
 # PostgreSQL globals are CLUSTER-wide, and are NOT included in pg_dump -Fc.
 # Dump source global roles with no passwords, then reissue NEW unrelated target secrets.
 & (Join-Path $bin 'pg_dumpall.exe') --globals-only --no-role-passwords --file=$globals
 Check 'SOURCE global roles without password material'
 $globalText=Get-Content -LiteralPath $globals -Raw
 foreach($required in @('assps_p3g_admin','assps_p3h_school51','assps_p3h_school52','assps_p3i_identity_owner')){
  if(-not $globalText.Contains($required)){throw ('Incomplete global roles dump: '+$required)}
 }
 if($globalText -match 'SCRAM-SHA-256\$|MD5[0-9a-f]{16}|PASSWORD\s+''[^'']+'''){
  throw 'Global-only backup unexpectedly contains source password material.'
 }
 $globalsSha=(Get-FileHash -LiteralPath $globals -Algorithm SHA256).Hash.ToLowerInvariant()
 & (Join-Path $bin 'pg_dump.exe') -Fc --file=$archive -d assps_paper_phase3j_ci
 Check 'source native fictional database archive'
 if((Get-Item $archive).Length -lt 2000){throw 'Synthetic database archive empty.'}
 & (Join-Path $bin 'pg_restore.exe') --list $archive |Out-Null
 Check 'synthetic archive format inspection'
 $archiveSha=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
 Write-Output 'PHASE3J_GLOBAL_ROLE_BACKUP=NO_SOURCE_PASSWORDS'
 # Now initialize a PHYSICALLY SEPARATE target cluster with a DIFFERENT bootstrap
 # login and fresh random password. No copying source DATA directory or postgres.conf.
 Set-Content -LiteralPath $targetPwfile -Value $dstAdminPw -NoNewline -Encoding ASCII
 & (Join-Path $bin 'initdb.exe') -D $targetData -U assps_p3j_restore_admin -A scram-sha-256 "--pwfile=$targetPwfile" --encoding=UTF8 --locale=C
 Check 'independent target initdb'
 Remove-Item -LiteralPath $targetPwfile -Force
 & (Join-Path $bin 'pg_ctl.exe') -D $targetData -l $targetLog -o '-h 127.0.0.1 -p 55443 -c max_connections=32' -w start
 Check 'start wholly independent target cluster'
 $targetStarted=$true
 Set-PgTarget
 & (Join-Path $bin 'psql.exe') -X -v ON_ERROR_STOP=1 -d postgres -f $globals
 Check 'reconstitute original source global roles on new cluster WITHOUT original passwords'
 & (Join-Path $bin 'createdb.exe') -E UTF8 -T template0 -O assps_p3g_admin assps_paper_phase3j_restore_ci
 Check 'create new-cluster database owned by recovered source role'
 & (Join-Path $bin 'pg_restore.exe') --exit-on-error -d assps_paper_phase3j_restore_ci $archive
 Check 'restore all fictional native paper tables, original RLS, function owner and triggers'
 # Role secrets NEVER copied across clusters. Restore credentials are freshly rotated.
 $rotation=("ALTER ROLE assps_p3h_school51 WITH LOGIN PASSWORD '"+$dst51Pw+"';"+
  "ALTER ROLE assps_p3h_school52 WITH LOGIN PASSWORD '"+$dst52Pw+"';")
 $rotation|& (Join-Path $bin 'psql.exe') -X -v ON_ERROR_STOP=1 -d postgres
 Check 'rotate BOTH independent recovered school login secrets'
 $rotation=$null
 $env:ASSPS_PHASE3J_TARGET_ADMIN_URL="postgresql://assps_p3j_restore_admin:$dstAdminPw@127.0.0.1:55443/assps_paper_phase3j_restore_ci"
 $env:ASSPS_PHASE3J_TARGET_51_URL="postgresql://assps_p3h_school51:$dst51Pw@127.0.0.1:55443/assps_paper_phase3j_restore_ci"
 $env:ASSPS_PHASE3J_TARGET_52_URL="postgresql://assps_p3h_school52:$dst52Pw@127.0.0.1:55443/assps_paper_phase3j_restore_ci"
 $env:ASSPS_PHASE3J_OLD_51_ON_TARGET_URL="postgresql://assps_p3h_school51:$src51Pw@127.0.0.1:55443/assps_paper_phase3j_restore_ci"
 Push-Location $backend
 try{
  & node --test 'tests/paperGlobalRolesFreshClusterRestorePhase3J.test.js'
  Check 'REAL physically separate global-role/new-password/restore test'
 }finally{Pop-Location}
 $proof=[ordered]@{
  format='ASSPS_PHASE3J_TWO_INDEPENDENT_SYNTHETIC_PG18_V1'
  sourceIsNewIndependentCluster=$true
  targetIsNewIndependentCluster=$true
  fictionalDataOnly=$true
  sourcePort=55442;targetPort=55443
  existingProductionPort5432Touched=$false
  actualPrincipalPaperApproved=$false
  actualEncryptedSchoolBackupRestored=$false
  originalNativeRendererChanged=$false
  productionDeploymentPerformed=$false
  actualPersistentStagingAuthorized=$false
  nativeDRAFTSchoolRouter='REAL_PG_PASS'
  sourceRoleOwnershipAndPermissions='REAL_PG_PASS'
  physicallySeparatePGClustersGlobalsRestore='REAL_PG_PASS'
  sourceLoginPasswordCopiedToNewCluster=$false
  recoveredTenantCredentialsRotated='REAL_PG_PASS'
  exactFakeNativeJsonShaRlsTriggers='REAL_PG_PASS'
  fakeDatabaseArchiveSha256=$archiveSha
  fakeDatabaseArchiveBytes=(Get-Item $archive).Length
  temporaryNoPasswordGlobalRoleDumpSha256=$globalsSha
 }
 $proof|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $manifest -Encoding UTF8
 Write-Output ('PHASE3J_FAKE_DATABASE_ARCHIVE_BYTES='+(Get-Item $archive).Length)
 Write-Output ('PHASE3J_FAKE_DATABASE_ARCHIVE_SHA256='+$archiveSha)
 Write-Output ('PHASE3J_NO_SECRET_EVIDENCE_MANIFEST='+$manifest)
 Write-Output 'PHASE3J_TWO_INDEPENDENT_CLUSTER_GLOBAL_ROLE_RECOVERY=PASS'
 $success=$true
}finally{
 foreach($pw in @($sourcePwfile,$targetPwfile)){
  if(Test-Path $pw){Remove-Item -LiteralPath $pw -Force -ErrorAction SilentlyContinue}
 }
 if($targetStarted){
  & (Join-Path $bin 'pg_ctl.exe') -D $targetData -m fast -w stop
  if($LASTEXITCODE -eq 0){$targetStopped=$true;Write-Output 'PHASE3J_OWN_TARGET_STOPPED=true'}
  else{Write-Warning 'Own TARGET stop not verified: keep its data directory for safe recovery.'}
 }
 if($sourceStarted){
  & (Join-Path $bin 'pg_ctl.exe') -D $sourceData -m fast -w stop
  if($LASTEXITCODE -eq 0){$sourceStopped=$true;Write-Output 'PHASE3J_OWN_SOURCE_STOPPED=true'}
  else{Write-Warning 'Own SOURCE stop not verified: keep its data directory for safe recovery.'}
 }
 foreach($key in @('PGHOST','PGPORT','PGUSER','PGPASSWORD','NODE_PATH',
  'ASSPS_PHASE3J_REAL_PG','ASSPS_PHASE3J_SOURCE_ADMIN_URL','ASSPS_PHASE3J_SOURCE_51_URL',
  'ASSPS_PHASE3J_SOURCE_52_URL','ASSPS_PHASE3J_TARGET_ADMIN_URL',
  'ASSPS_PHASE3J_TARGET_51_URL','ASSPS_PHASE3J_TARGET_52_URL',
  'ASSPS_PHASE3J_OLD_51_ON_TARGET_URL')){
  Remove-Item ('Env:'+$key) -ErrorAction SilentlyContinue
 }
 # No passwords, credential-containing process logs or global role scripts are retained.
 foreach($s in @($srcAdminPw,$src51Pw,$src52Pw,$dstAdminPw,$dst51Pw,$dst52Pw)){$s=$null}
 $rng.Dispose()
 if(Test-Path $globals){Remove-Item -LiteralPath $globals -Force}
 foreach($tmp in $temporarySql){
  if(Test-Path $tmp){Remove-Item -LiteralPath $tmp -Force}
 }
 if((Test-Path $marker) -and $root.StartsWith(
  (Join-Path $env:TEMP 'assps-phase3j-ephemeral-'),
  [System.StringComparison]::OrdinalIgnoreCase)){
  if($sourceStopped -and (Test-Path $sourceData)){
   Remove-Item -LiteralPath $sourceData -Force -Recurse
   Write-Output 'PHASE3J_ONLY_STOPPED_OWN_SOURCE_DATA_REMOVED=true'
  }
  if($targetStopped -and (Test-Path $targetData)){
   Remove-Item -LiteralPath $targetData -Force -Recurse
   Write-Output 'PHASE3J_ONLY_STOPPED_OWN_TARGET_DATA_REMOVED=true'
  }
 }
}
if(-not $success){throw 'Phase3J actual isolated independent-cluster test DID NOT PASS.'}
Write-Output 'PHASE3J_REAL_TRUSTED_ROUTER_AND_TWO_NEW_CLUSTERS_COMPLETE_SYNTHETIC_ONLY'
