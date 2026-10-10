# Model-independent, READ-ONLY client workstation printer readiness for ASSPS.
# Does not install/change drivers, clear or submit any print jobs, change paper defaults,
# access school data, or elevate OS permissions.
[CmdletBinding()]
param([switch]$Json)
$ErrorActionPreference = 'Stop'
try {
    $spool = Get-Service -Name Spooler
    $printers = @(Get-Printer)
    $wmi = @(Get-CimInstance -ClassName Win32_Printer)
    $configs = @(Get-CimInstance -ClassName Win32_PrinterConfiguration)
} catch {
    Write-Error ('PRINTER_READINESS_ERROR: '+$_.Exception.Message)
    exit 3
}
$results = foreach ($printer in $printers) {
    $name = [string]$printer.Name
    $port = [string]$printer.PortName
    $virtual = ($name -match '^(Microsoft Print to PDF|Microsoft XPS Document Writer|OneNote( \(Desktop\))?|Fax)$') -or ($port -match '^(PORTPROMPT:|nul:|SHRFAX:|Microsoft\.Office\.)')
    $status = $wmi | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    $config = $configs | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    $offline = if ($null -eq $status) { $null } else { [bool]$status.WorkOffline }
    $paper = if ($null -eq $config) { 'Unknown' } else { [string]$config.PaperSize }
    $pending = $null
    try {
        $jobs = @(Get-PrintJob -PrinterName $name -ErrorAction Stop)
        $pending = @($jobs | Where-Object { [string]$_.JobStatus -notin @('Complete','Printed','Deleted','Retained') }).Count
    } catch { $pending = $null }
    [pscustomobject]@{
        Name = $name
        DriverName = [string]$printer.DriverName
        Port = $port
        IsVirtual = [bool]$virtual
        WorkOffline = $offline
        WindowsPrinterStatus = [string]$printer.PrinterStatus
        DefaultPaper = $paper
        HasA4Default = [bool]($paper -match '^A4\b')
        PendingJobCount = $pending
        ReadyForOSSelection = [bool]((-not $virtual) -and ($offline -eq $false) -and ($spool.Status -eq 'Running'))
    }
}
$physical = @($results | Where-Object { -not $_.IsVirtual })
$ready = @($physical | Where-Object { $_.ReadyForOSSelection })
$result = [pscustomobject]@{
    Workstation = [string]$env:COMPUTERNAME
    SpoolerStatus = [string]$spool.Status
    InstalledPrinters = $results.Count
    PhysicalPrinters = $physical.Count
    PhysicallySelectable = $ready.Count
    Printers = @($results)
    # This is readiness to select in the OS dialog, NOT proof of physical paper output.
    PaperPrintCertified = $false
}
if ($Json) { $result | ConvertTo-Json -Depth 5 -Compress }
else {
    Write-Output ('SPOOLER='+$result.SpoolerStatus+' PHYSICAL='+$physical.Count+' READY_FOR_SELECTION='+$ready.Count+' INSTALLED='+$results.Count)
    $results | Select-Object Name,Port,IsVirtual,WorkOffline,DefaultPaper,PendingJobCount,ReadyForOSSelection | Format-Table -AutoSize | Out-String | Write-Output
    if ($ready.Count -eq 0) { Write-Output 'BLOCKED: No physically selectable printer; verify device power, USB/Wi-Fi/network connection and Windows driver status. Virtual PDF remains available.' }
}
if ($ready.Count -eq 0) { exit 2 }
exit 0
