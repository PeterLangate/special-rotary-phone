<#
.SYNOPSIS
  Batch image-injection for the trilingual FleetFlow sample data.
  For every tokenised _work/<nn>-<key>.<sv|en|de>.json file, render a real base64
  PNG per @@IMG token (caption from the file's own metadata.company.name), replace
  the tokens, validate JSON, and write the finished file to SampleData/.
  Idempotent: skips files whose finished output is already up to date.
#>
[CmdletBinding()]
param(
  [string] $WorkDir = 'x:\Source\FleetFlow\Documentation\Human\SampleData\_work',
  [string] $OutDir  = 'x:\Source\FleetFlow\Documentation\Human\SampleData'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'New-SampleImage.ps1')

try {
  if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }

  $files = Get-ChildItem -LiteralPath $WorkDir -Filter '*.json' |
           Where-Object { $_.Name -match '\.(sv|en|de)\.json$' } |
           Sort-Object Name
  if (-not $files) { Write-Output 'No locale JSON files found in work dir.'; return }

  $ok = 0; $fail = 0; $skip = 0
  $rows = New-Object System.Collections.Generic.List[object]

  foreach ($f in $files) {
    try {
      $out = Join-Path $OutDir $f.Name
      if ((Test-Path -LiteralPath $out) -and ((Get-Item -LiteralPath $out).LastWriteTime -ge $f.LastWriteTime)) {
        $sizeKB0 = [math]::Round((Get-Item -LiteralPath $out).Length / 1KB, 0)
        $rows.Add([pscustomobject]@{ File = $f.Name; Tokens = 0; Images = 0; SizeKB = $sizeKB0; Status = 'SKIP up-to-date' }) | Out-Null
        $skip++; continue
      }

      $text = [System.IO.File]::ReadAllText($f.FullName)

      $caption = $f.BaseName
      try {
        $obj = $text | ConvertFrom-Json -Depth 100
        if ($obj.metadata -and $obj.metadata.company -and $obj.metadata.company.name) {
          $loc = ($f.BaseName -split '\.')[-1].ToUpper()
          $caption = "$($obj.metadata.company.name)  -  $($obj.metadata.industryKey)  [$loc]"
        }
      } catch { <# ERROR-SUPPRESSED-JUSTIFIED: caption is cosmetic; the hard JSON validation below is the real gate #> }

      $tokens = [regex]::Matches($text, '@@IMG:([A-Za-z0-9_]+)@@')
      $keys = $tokens | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
      foreach ($key in $keys) {
        $uri = New-Base64Image -Key $key -Caption $caption
        $text = $text.Replace("@@IMG:$key@@", $uri)
      }

      [void]([System.Text.Json.JsonDocument]::Parse($text))   # hard JSON validation before writing

      $utf8 = New-Object System.Text.UTF8Encoding $false
      [System.IO.File]::WriteAllText($out, $text, $utf8)

      $sizeKB = [math]::Round((Get-Item -LiteralPath $out).Length / 1KB, 0)
      $rows.Add([pscustomobject]@{ File = $f.Name; Tokens = $tokens.Count; Images = $keys.Count; SizeKB = $sizeKB; Status = 'OK' }) | Out-Null
      $ok++
    }
    catch {
      $rows.Add([pscustomobject]@{ File = $f.Name; Tokens = 0; Images = 0; SizeKB = 0; Status = "FAIL: $($_.Exception.Message)" }) | Out-Null
      $fail++
    }
  }

  $rows | Where-Object { $_.Status -ne 'SKIP up-to-date' } | Format-Table -AutoSize | Out-String -Width 200 | Write-Output
  $totalMB = [math]::Round((($rows | Measure-Object SizeKB -Sum).Sum) / 1024, 1)
  Write-Output ("DONE  files={0}  injected={1}  skipped={2}  fail={3}  totalSize={4} MB" -f $files.Count, $ok, $skip, $fail, $totalMB)
}
catch {
  Write-Output "BATCH FAIL: $($_.Exception.Message)"
  exit 1
}
