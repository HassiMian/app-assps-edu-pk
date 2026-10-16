param()
$ErrorActionPreference = 'Stop'
$schema = 'ASSPS_WINDOWS_JAMEEL_EMBEDDED_PDF_PROOF_V1'
$work = Join-Path $env:TEMP ('assps-jameel-proof-' + [guid]::NewGuid().ToString('N'))
$exitCode = 2
$result = @{ schema=$schema; verdict='HOLD'; productionChanged=$false; physicalPrinterUsed=$false; officialPaperPrintCertified=$false; releaseAuthorized=$false }
try {
  if ($env:OS -ne 'Windows_NT') { throw 'WINDOWS_HOST_REQUIRED' }
  $fontFile = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts\Jameel Noori Nastaleeq Kasheeda.ttf'
  $systemFontFile = Join-Path $env:WINDIR 'Fonts\Jameel Noori Nastaleeq Kasheeda.ttf'
  if (!(Test-Path -LiteralPath $fontFile) -and !(Test-Path -LiteralPath $systemFontFile)) { throw 'JAMEEL_LOCAL_FONT_NOT_FOUND' }
  $candidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  $chrome = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
  if (!$chrome) { throw 'CHROME_NOT_INSTALLED' }
  New-Item -ItemType Directory -Path $work -Force | Out-Null
  $html = '<!doctype html><html lang="ur"><head><meta charset="utf-8"><style>@font-face{font-family:"ASSPS Jameel Noori";src:local("Jameel Noori Nastaleeq Kasheeda")}body{font-family:"ASSPS Jameel Noori","Jameel Noori Nastaleeq Kasheeda",serif;direction:rtl;font-size:28px;line-height:2}</style></head><body><h1>الصدیق سکالرز پبلک سکول</h1><p>اردو پرنٹ کی جانچ، سوال نمبر ایک، درست جوابات اور امتحانی پرچہ</p></body></html>'
  $htmlPath = Join-Path $work 'probe.html'
  $pdfPath = Join-Path $work 'probe.pdf'
  [System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.UTF8Encoding]::new($false))
  $url = 'file:///' + $htmlPath.Replace('\','/')
  $ErrorActionPreference = 'Continue'
  & $chrome --headless=new --disable-gpu --no-first-run --no-default-browser-check "--user-data-dir=$work\chrome-profile" "--print-to-pdf=$pdfPath" $url 2>$null | Out-Null
  $ErrorActionPreference = 'Stop'
  if (!(Test-Path -LiteralPath $pdfPath)) { throw 'CHROMIUM_PDF_NOT_CREATED' }
  $bytes = [System.IO.File]::ReadAllBytes($pdfPath)
  if ($bytes.Length -lt 10000) { throw 'PDF_UNEXPECTEDLY_SHORT' }
  $ascii = [System.Text.Encoding]::ASCII.GetString($bytes)
  if (!$ascii.StartsWith('%PDF-')) { throw 'BAD_PDF_SIGNATURE' }
  if (!$ascii.Contains('Jameel#20Noori#20Nastaleeq#20Kasheeda')) { throw 'JAMEEL_BASEFONT_NOT_USED' }
  if (!$ascii.Contains('/FontFile2') -and !$ascii.Contains('/FontFile3')) { throw 'PDF_EMBEDDED_FONT_MISSING' }
  $result.verdict = 'WINDOWS_LOCAL_JAMEEL_EMBEDDED_PASS_NOT_RELEASE'
  $result['pdfBytes'] = $bytes.Length
  $result['pdfSha256'] = (Get-FileHash -LiteralPath $pdfPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $result['jameelSubsetObserved'] = $true
  $result['fontFileEmbedded'] = $true
  $exitCode = 0
} catch {
  $result['failureCode'] = switch -Regex ($_.Exception.Message) {
    '^WINDOWS_HOST_REQUIRED$' { 'WINDOWS_HOST_REQUIRED'; break }
    '^JAMEEL_LOCAL_FONT_NOT_FOUND$' { 'JAMEEL_LOCAL_FONT_NOT_FOUND'; break }
    '^CHROME_NOT_INSTALLED$' { 'CHROME_NOT_INSTALLED'; break }
    '^CHROMIUM_PDF_NOT_CREATED$' { 'CHROMIUM_PDF_NOT_CREATED'; break }
    '^PDF_UNEXPECTEDLY_SHORT$' { 'PDF_UNEXPECTEDLY_SHORT'; break }
    '^BAD_PDF_SIGNATURE$' { 'BAD_PDF_SIGNATURE'; break }
    '^JAMEEL_BASEFONT_NOT_USED$' { 'JAMEEL_BASEFONT_NOT_USED'; break }
    '^PDF_EMBEDDED_FONT_MISSING$' { 'PDF_EMBEDDED_FONT_MISSING'; break }
    default { 'FONT_PROOF_EXECUTION_ERROR' }
  }
} finally {
  if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
}
Write-Output ($result | ConvertTo-Json -Compress)
exit $exitCode
