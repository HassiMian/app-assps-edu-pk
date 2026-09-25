param(
  [ValidateSet('Frontend', 'Backend', 'Both')]
  [string]$Mode = 'Both',
  [switch]$Apply,
  [switch]$ConfirmProduction,
  [string]$HostSpec = $env:ASSPS_DEPLOY_HOST,
  [string]$SshKey = $env:ASSPS_DEPLOY_SSH_KEY,
  [string]$KnownHostsFile = $env:ASSPS_DEPLOY_KNOWN_HOSTS
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$frontendRoot = Join-Path $repoRoot 'al-siddique-frontend'
$backendSrc = Join-Path $repoRoot 'al-siddique-backend\src'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

if (-not $KnownHostsFile) { $KnownHostsFile = Join-Path $HOME '.ssh\known_hosts' }

function Step($message) {
  Write-Host "==> $message" -ForegroundColor Cyan
}

function HostLabel() {
  if ($HostSpec) { return $HostSpec }
  return '<unset>'
}

function Assert-NativeSuccess($label) {
  if ($LASTEXITCODE -ne 0) {
    throw "$label failed with exit code $LASTEXITCODE"
  }
}

function Run($command, $workingDirectory = $repoRoot) {
  Step $command
  if (-not $Apply) { return }
  Push-Location $workingDirectory
  try {
    Invoke-Expression $command
    Assert-NativeSuccess $command
  } finally {
    Pop-Location
  }
}

function RunAlways($command, $workingDirectory = $repoRoot) {
  Step $command
  Push-Location $workingDirectory
  try {
    Invoke-Expression $command
    Assert-NativeSuccess $command
  } finally {
    Pop-Location
  }
}

function Remote($script) {
  Step "remote command on $(HostLabel)"
  if (-not $Apply) {
    Write-Host $script
    return
  }
  & ssh -i $SshKey -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHostsFile" $HostSpec $script
  Assert-NativeSuccess "ssh $HostSpec"
}

function CopyToRemote($localPath, $remotePath) {
  Step "copy $localPath -> $(HostLabel):$remotePath"
  if (-not $Apply) { return }
  & scp -i $SshKey -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHostsFile" $localPath "${HostSpec}:$remotePath"
  Assert-NativeSuccess "scp $localPath"
}

if ($Apply -and -not $ConfirmProduction) {
  throw 'Refusing production deploy without -ConfirmProduction.'
}

if ($Apply -and -not $HostSpec) {
  throw 'Refusing production deploy without ASSPS_DEPLOY_HOST or -HostSpec.'
}

if ($Apply -and -not $SshKey) {
  throw 'Refusing production deploy without ASSPS_DEPLOY_SSH_KEY or -SshKey.'
}

if ($Apply -and -not (Test-Path $SshKey)) {
  throw "SSH key not found: $SshKey"
}

if ($Apply -and -not (Test-Path $KnownHostsFile)) {
  throw "Known hosts file not found: $KnownHostsFile"
}

Step "mode=$Mode apply=$Apply timestamp=$timestamp host=$(HostLabel)"
RunAlways 'npm run production:safety'

if ($Apply -and ($Mode -in @('Backend', 'Both'))) {
  Remote @"
set -e
test -f /var/www/apex-backend/.env
grep -Eq '^NODE_ENV=production$' /var/www/apex-backend/.env
grep -Eq '^AUTO_MIGRATE_ON_BOOT=false$' /var/www/apex-backend/.env
"@
}

if ($Mode -in @('Frontend', 'Both')) {
  Run 'npm run build:frontend'
  $archive = Join-Path $env:TEMP "assps-frontend-dist-$timestamp.tar"
  Run "tar -cf `"$archive`" -C `"$frontendRoot\dist`" ."
  CopyToRemote $archive "/tmp/assps-frontend-dist-$timestamp.tar"
  Remote @"
set -e
test -f /tmp/assps-frontend-dist-$timestamp.tar
test -d /var/www/apex-os
cp -a /var/www/apex-os /var/www/apex-os.bak-$timestamp
rm -rf /var/www/apex-os.new-$timestamp
mkdir -p /var/www/apex-os.new-$timestamp
tar -xf /tmp/assps-frontend-dist-$timestamp.tar -C /var/www/apex-os.new-$timestamp
chown -R www-data:www-data /var/www/apex-os.new-$timestamp
find /var/www/apex-os.new-$timestamp -type d -exec chmod 755 {} \;
find /var/www/apex-os.new-$timestamp -type f -exec chmod 644 {} \;
rm -rf /var/www/apex-os
mv /var/www/apex-os.new-$timestamp /var/www/apex-os
nginx -t
curl -fsS https://app.assps.edu.pk >/dev/null
"@
}

if ($Mode -in @('Backend', 'Both')) {
  Run "node -c `"$backendSrc\server.js`""
  Get-ChildItem -Path (Join-Path $backendSrc 'routes') -Filter '*.js' | ForEach-Object {
    Run "node -c `"$($_.FullName)`""
  }

  $archive = Join-Path $env:TEMP "assps-backend-src-$timestamp.tar"
  Run "tar --exclude='.env' --exclude='node_modules' --exclude='uploads' --exclude='logs' -cf `"$archive`" -C `"$backendSrc`" ."
  CopyToRemote $archive "/tmp/assps-backend-src-$timestamp.tar"
  Remote @"
set -e
test -f /tmp/assps-backend-src-$timestamp.tar
test -d /var/www/apex-backend
cp -a /var/www/apex-backend /var/www/apex-backend.bak-$timestamp
rm -rf /var/www/apex-backend/src.new-$timestamp
mkdir -p /var/www/apex-backend/src.new-$timestamp
tar -xf /tmp/assps-backend-src-$timestamp.tar -C /var/www/apex-backend/src.new-$timestamp
cp -a /var/www/apex-backend/.env /var/www/apex-backend/src.new-$timestamp/.env
rm -rf /var/www/apex-backend/src
mv /var/www/apex-backend/src.new-$timestamp /var/www/apex-backend/src
for item in server.js package.json package-lock.json config middleware routes services utils scripts; do
  if [ -e "/var/www/apex-backend/src/`$item" ]; then
    rm -rf "/var/www/apex-backend/`$item"
    cp -a "/var/www/apex-backend/src/`$item" "/var/www/apex-backend/`$item"
  fi
done
cp -a /var/www/apex-backend/src/.env /var/www/apex-backend/.env
node -c /var/www/apex-backend/server.js
node -c /var/www/apex-backend/middleware/auth.js
node -c /var/www/apex-backend/routes/authRoutes.js
pm2 restart apex-backend --update-env
pm2 status --no-color
curl -fsS https://api.assps.edu.pk/health >/dev/null
"@
}

Step 'done'
if (-not $Apply) {
  Write-Host 'Dry-run only. Set ASSPS_DEPLOY_HOST, ASSPS_DEPLOY_SSH_KEY, ASSPS_DEPLOY_KNOWN_HOSTS, then add -Apply -ConfirmProduction to execute.' -ForegroundColor Yellow
}
