$ErrorActionPreference = 'Stop'

$SshExe = "$env:WINDIR\System32\OpenSSH\ssh.exe"
$Key = Join-Path $env:USERPROFILE '.ssh\assps_cloud_workstation'
$VpsHost = '187.127.121.221'
$VpsUser = 'asspscloud'
$LocalPort = 8484
$RemotePort = 8484
$WorkspaceUrl = "http://127.0.0.1:$LocalPort/"
$AgentBase = Join-Path $env:LOCALAPPDATA 'DesktopCommanderAgent\watchdog'
$Supervisor = Join-Path $AgentBase 'DesktopCommanderSupervisor.ps1'
$Guardian = Join-Path $AgentBase 'DesktopCommanderGuardian.ps1'

function Test-Workspace {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $WorkspaceUrl -TimeoutSec 2
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

function Start-CommanderWatchdogs {
  $needles = 'DesktopCommanderSupervisor|DesktopCommanderGuardian'
  $running = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match $needles }
  if (-not ($running.CommandLine -match 'DesktopCommanderSupervisor') -and (Test-Path $Supervisor)) {
    Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',('"'+$Supervisor+'"') -WindowStyle Hidden
  }
  if (-not ($running.CommandLine -match 'DesktopCommanderGuardian') -and (Test-Path $Guardian)) {
    Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',('"'+$Guardian+'"') -WindowStyle Hidden
  }
}

function Start-Tunnel {
  if (-not (Test-Path $SshExe)) { throw 'Windows OpenSSH client not found.' }
  if (-not (Test-Path $Key)) { throw 'ASSPS cloud SSH key not found.' }
  $forward = "${LocalPort}:127.0.0.1:${RemotePort}"
  $args = @('-i',$Key,'-o','BatchMode=yes','-o','StrictHostKeyChecking=accept-new','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-N','-L',$forward,"${VpsUser}@${VpsHost}")
  Start-Process -FilePath $SshExe -ArgumentList $args -WindowStyle Hidden | Out-Null
  foreach($i in 1..16){ Start-Sleep -Milliseconds 500; if(Test-Workspace){ return } }
  throw 'ASSPS cloud workspace tunnel could not start.'
}

Start-CommanderWatchdogs
if (-not (Test-Workspace)) { Start-Tunnel }
if (-not (Test-Workspace)) { throw 'ASSPS cloud workspace health check failed.' }
Start-Process $WorkspaceUrl
Write-Output 'ASSPS_CLOUD_WORKSPACE_READY'
