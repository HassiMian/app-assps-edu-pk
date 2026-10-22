[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$ConfirmProduction,
  [string]$HostSpec = $env:ASSPS_DEPLOY_HOST,
  [string]$SshKey = $env:ASSPS_DEPLOY_SSH_KEY,
  [string]$KnownHostsFile = $env:ASSPS_DEPLOY_KNOWN_HOSTS
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseId = ('release-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + (& git -C $root rev-parse --short=8 HEAD)).Trim()
$worktree = Join-Path $env:TEMP "assps-release-src-$releaseId"
$frontend = Join-Path $worktree 'al-siddique-frontend'
$archive = Join-Path $env:TEMP "$releaseId.tar"
$serverTool = Join-Path $PSScriptRoot 'assps-frontend-atomic.sh'
$remoteTool = '/tmp/assps-frontend-atomic.sh'
$remoteArchive = "/tmp/$releaseId.tar"
$promoted = $false
$worktreeCreated = $false

function Assert-Ok([string] $Message) {
  if ($LASTEXITCODE -ne 0) { throw "$Message (exit code $LASTEXITCODE)" }
}
function Remote([string] $Command) {
  & ssh -i $SshKey -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHostsFile" $HostSpec $Command
  Assert-Ok "Remote: $Command"
}
function Copy-Remote([string] $Local, [string] $RemotePath) {
  & scp -i $SshKey -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHostsFile" $Local "${HostSpec}:$RemotePath"
  Assert-Ok 'scp upload'
}
function Browser-Smoke([string] $Url) {
  $prior = $env:APEX_BASE_URL
  try {
    $env:APEX_BASE_URL = $Url
    & node (Join-Path $frontend 'scripts/verify-production-shell.mjs')
    Assert-Ok "Browser shell smoke at $Url"
  } finally {
    $env:APEX_BASE_URL = $prior
  }
}

Write-Host "ASSPS atomic frontend release: $releaseId"
if (-not $Apply) {
  Write-Host 'DRY RUN: Will require clean git, lockfile build, verify hashed JS graph, browser-smoke candidate, SSH-stage immutable release, Nginx test/promote, browser-smoke public release, rollback on failure.'
  Write-Host 'Apply requires -Apply -ConfirmProduction and pinned SSH host credentials. No live changes performed.'
  exit 0
}
if (-not $ConfirmProduction) { throw 'Production deployment requires -ConfirmProduction' }
if (-not $HostSpec -or -not $SshKey -or -not (Test-Path $SshKey)) { throw 'Missing verified ASSPS SSH host/key' }
if (-not $KnownHostsFile) { $KnownHostsFile = Join-Path $HOME '.ssh/known_hosts' }
if (-not (Test-Path $KnownHostsFile)) { throw 'Pinned known_hosts file missing' }
if (-not (Test-Path $serverTool)) { throw 'Immutable release controller missing' }

# Use a clean, detached commit worktree. NEVER package pending workstation edits.
if (Test-Path $worktree) { throw 'Candidate worktree path already exists' }
& git -C $root worktree add --detach $worktree HEAD
Assert-Ok 'Clean release worktree creation'
$worktreeCreated = $true
Push-Location $worktree
try {
  & npm ci --prefix $frontend --no-audit --no-fund
  Assert-Ok 'Install locked release dependencies'
  & npm run production:safety
  Assert-Ok 'Production security checks'
  & npm run build:frontend
  Assert-Ok 'Vite build'
  & npm run release:frontend:validate
  Assert-Ok 'Immutable asset graph validation'

  # Browser test the ACTUAL candidate before deployment; no production mutation.
  $preview = $null
  try {
    $preview = Start-Process -FilePath 'node' -ArgumentList @('node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort') -WorkingDirectory $frontend -PassThru -WindowStyle Hidden
    $ready = $false
    for ($i=0; $i -lt 25; $i++) {
      try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/login' -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) { $ready = $true; break }
      } catch {}
      Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'Candidate Vite preview not healthy' }
    Browser-Smoke 'http://127.0.0.1:4173'
  } finally {
    if ($preview -and -not $preview.HasExited) { Stop-Process -Id $preview.Id -Force }
  }

  & tar -cf $archive -C (Join-Path $frontend 'dist') .
  Assert-Ok 'Archive complete candidate'

  Copy-Remote $serverTool $remoteTool
  Copy-Remote $archive $remoteArchive
  Remote "bash $remoteTool stage $releaseId $remoteArchive"
  Remote "bash $remoteTool promote $releaseId"
  $promoted = $true
  Browser-Smoke 'https://app.assps.edu.pk'
  Write-Host "RELEASE VERIFIED: $releaseId; previous release retained for rollback."
} catch {
  $cause = $_
  if ($promoted) {
    Write-Warning 'Post-promotion verification failed; invoking safe rollback.'
    try { Remote "bash $remoteTool rollback $releaseId" } catch { Write-Error 'AUTOMATIC ROLLBACK FAILED: immediate operations intervention required' }
  }
  throw $cause
} finally {
  Pop-Location
  if (Test-Path $archive) { Remove-Item $archive -Force }
  if ($worktreeCreated) {
    & git -C $root worktree remove --force $worktree
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Release worktree requires safe cleanup after failed remove' }
  }
}
