$ErrorActionPreference = 'Stop'
$Src = $MyInvocation.MyCommand.Path
$RepoDir = Split-Path -Parent $Src
$LauncherSource = Join-Path $RepoDir 'windows-launcher.ps1'
$TargetDir = Join-Path $env:USERPROFILE 'ASSPS-Cloud-Workspace'
$TargetPs1 = Join-Path $TargetDir 'Start-ASSPS-Cloud-Workspace.ps1'
$Desktop = [Environment]::GetFolderPath('Desktop')
$TargetCmd = Join-Path $Desktop 'ASSPS Cloud Workspace.cmd'
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -LiteralPath $LauncherSource -Destination $TargetPs1 -Force
$cmd = '@echo off' + [Environment]::NewLine + 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $TargetPs1 + '"' + [Environment]::NewLine
Set-Content -LiteralPath $TargetCmd -Value $cmd -Encoding ASCII
Write-Output "INSTALLED=$TargetCmd"
