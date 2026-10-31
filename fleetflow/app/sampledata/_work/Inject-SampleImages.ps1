<#
.SYNOPSIS
  Replaces @@IMG:<key>@@ tokens in a FleetFlow sample-data JSON file with real,
  valid, large base64 PNG images generated on the fly via System.Drawing.

.DESCRIPTION
  Each unique token key becomes one rendered image (document-style for scan_*,
  photo-style for photo_*), captioned with the key label and the supplied -Caption.
  A noise overlay inflates the PNG to a realistic "scanned/photographed" size.
  The output is validated as JSON before being written.

.PARAMETER InFile   Tokenised JSON produced by the generation/expert agents.
.PARAMETER OutFile  Final JSON file to write (base64 injected).
.PARAMETER Caption  Footer caption (company / industry) drawn on every image.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $InFile,
  [Parameter(Mandatory)] [string] $OutFile,
  [Parameter(Mandatory)] [string] $Caption
)

$ErrorActionPreference = 'Stop'

# --- key -> human label -------------------------------------------------------
$script:Labels = @{
  photo_vehicle       = 'VEHICLE PHOTO'
  photo_driver        = 'DRIVER ID / LICENCE'
  photo_damage        = 'DAMAGE PHOTO'
  photo_pod_signature = 'PROOF OF DELIVERY - SIGNATURE'
  photo_asset         = 'ASSET PHOTO'
  photo_site          = 'SITE PHOTO'
  scan_cmr            = 'CMR CONSIGNMENT NOTE'
  scan_adr            = 'ADR TRANSPORT DOCUMENT'
  scan_pod            = 'PROOF OF DELIVERY'
  scan_inspection     = 'INSPECTION REPORT'
  scan_weighbridge    = 'WEIGHBRIDGE TICKET'
  scan_insurance      = 'INSURANCE CERTIFICATE'
  scan_tacho          = 'TACHOGRAPH RECORD'
  scan_invoice        = 'INVOICE'
  scan_contract       = 'CONTRACT'
  scan_permit         = 'PERMIT / LICENCE'
  scan_certificate    = 'CERTIFICATE'
  scan_manifest       = 'MANIFEST'
  scan_checklist      = 'CHECKLIST'
}

function Get-StableSeed {
  param([string] $Text)
  # String.GetHashCode is per-process randomised on .NET Core; build a stable seed.
  [int] $h = 17
  foreach ($c in $Text.ToCharArray()) { $h = ($h * 31 + [int] $c) -band 0x7FFFFFFF }
  return $h
}

function New-Base64Image {
  param(
    [Parameter(Mandatory)] [string] $Key,
    [Parameter(Mandatory)] [string] $Caption,
    [int] $Width = 1280,
    [int] $Height = 900
  )

  $bmp = $null; $g = $null; $ms = $null
  try {
    $label = $script:Labels[$Key]
    if (-not $label) { $label = ($Key -replace '_', ' ').ToUpper() }
    $isScan = $Key.StartsWith('scan_')
    $seed = Get-StableSeed -Text $Key
    $rand = New-Object System.Random $seed

    $bmp = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $navy = [System.Drawing.Color]::FromArgb(31, 78, 121)
    $accent = [System.Drawing.Color]::FromArgb(138, 75, 8)

    if ($isScan) {
      # ---- document / scanned-paper style ----
      $g.Clear([System.Drawing.Color]::FromArgb(246, 245, 241))
      $hdr = New-Object System.Drawing.SolidBrush $navy
      $g.FillRectangle($hdr, 0, 0, $Width, 96)
      $hdr.Dispose()
      $titleFont = New-Object System.Drawing.Font 'Arial', 30, ([System.Drawing.FontStyle]::Bold)
      $g.DrawString($label, $titleFont, [System.Drawing.Brushes]::White, 40, 28)
      $titleFont.Dispose()

      # simulated body text lines
      $lineBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(205, 205, 200))
      [int] $y = 150
      while ($y -lt ($Height - 150)) {
        [int] $w = 360 + $rand.Next(0, $Width - 480)
        $g.FillRectangle($lineBrush, 60, $y, $w, 14)
        $y += 34
      }
      $lineBrush.Dispose()

      # stamp box (lower-right)
      $pen = New-Object System.Drawing.Pen $accent, 4
      $g.DrawRectangle($pen, ($Width - 360), ($Height - 230), 300, 150)
      $pen.Dispose()
      $stampFont = New-Object System.Drawing.Font 'Arial', 18, ([System.Drawing.FontStyle]::Bold)
      $stampBrush = New-Object System.Drawing.SolidBrush $accent
      $g.DrawString("FLEETFLOW`r`nSAMPLE", $stampFont, $stampBrush, ($Width - 340), ($Height - 210))
      $stampFont.Dispose(); $stampBrush.Dispose()
    }
    else {
      # ---- photo style: diagonal gradient ----
      $c1 = [System.Drawing.Color]::FromArgb(255, $rand.Next(40, 110), $rand.Next(90, 150), $rand.Next(110, 180))
      $c2 = [System.Drawing.Color]::FromArgb(255, $rand.Next(10, 60), $rand.Next(40, 90), $rand.Next(60, 110))
      $rect = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
      $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 45.0
      $g.FillRectangle($grad, $rect)
      $grad.Dispose()

      # framing + big label
      $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 255, 255, 255)), 6
      $g.DrawRectangle($pen, 30, 30, ($Width - 60), ($Height - 60))
      $pen.Dispose()
      $titleFont = New-Object System.Drawing.Font 'Arial', 46, ([System.Drawing.FontStyle]::Bold)
      $shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
      $g.DrawString($label, $titleFont, $shadow, 63, 73)
      $g.DrawString($label, $titleFont, [System.Drawing.Brushes]::White, 60, 70)
      $titleFont.Dispose(); $shadow.Dispose()
    }

    # ---- footer caption band (both styles) ----
    $fb = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 20, 20, 20))
    $g.FillRectangle($fb, 0, ($Height - 64), $Width, 64)
    $fb.Dispose()
    $capFont = New-Object System.Drawing.Font 'Arial', 18, ([System.Drawing.FontStyle]::Regular)
    $docNo = 'DOC-{0:D5}' -f $rand.Next(1, 99999)
    $cap = "$Caption    |    $label    |    $docNo"
    $g.DrawString($cap, $capFont, [System.Drawing.Brushes]::White, 30, ($Height - 50))
    $capFont.Dispose()

    # ---- noise overlay (realism + inflates size so base64 is "large") ----
    for ($i = 0; $i -lt 9000; $i++) {
      $nc = [System.Drawing.Color]::FromArgb($rand.Next(18, 60), $rand.Next(0, 256), $rand.Next(0, 256), $rand.Next(0, 256))
      $nb = New-Object System.Drawing.SolidBrush $nc
      $g.FillRectangle($nb, $rand.Next(0, $Width), $rand.Next(0, $Height), $rand.Next(2, 5), $rand.Next(2, 5))
      $nb.Dispose()
    }

    $g.Dispose(); $g = $null
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    return 'data:image/png;base64,' + [Convert]::ToBase64String($bytes)
  }
  catch {
    throw "New-Base64Image failed for key '$Key': $($_.Exception.Message)"
  }
  finally {
    if ($g)   { $g.Dispose() }
    if ($ms)  { $ms.Dispose() }
    if ($bmp) { $bmp.Dispose() }
  }
}

# ============================ main ============================================
try {
  Add-Type -AssemblyName System.Drawing

  if (-not (Test-Path -LiteralPath $InFile)) { throw "InFile not found: $InFile" }
  $text = [System.IO.File]::ReadAllText($InFile)

  $matches = [regex]::Matches($text, '@@IMG:([A-Za-z0-9_]+)@@')
  if ($matches.Count -eq 0) { Write-Warning "No @@IMG tokens found in $InFile" }

  $keys = $matches | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  $report = New-Object System.Collections.Generic.List[string]
  [int] $replacements = 0

  foreach ($key in $keys) {
    $dataUri = New-Base64Image -Key $key -Caption $Caption
    $token = "@@IMG:$key@@"
    $before = $text.Length
    $text = $text.Replace($token, $dataUri)
    $delta = ($before - $text.Length)  # informational only
    $report.Add(("  {0,-22} base64Len={1,8}" -f $key, $dataUri.Length)) | Out-Null
  }
  $replacements = $matches.Count

  # validate JSON before committing
  try { [void]([System.Text.Json.JsonDocument]::Parse($text)) }
  catch { throw "Result is not valid JSON: $($_.Exception.Message)" }

  $outDir = Split-Path -Parent $OutFile
  if ($outDir -and -not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($OutFile, $text, $utf8)

  $sizeKB = [math]::Round((Get-Item -LiteralPath $OutFile).Length / 1KB, 1)
  Write-Output "=== Inject-SampleImages OK ==="
  Write-Output ("InFile : {0}" -f $InFile)
  Write-Output ("OutFile: {0}  ({1} KB)" -f $OutFile, $sizeKB)
  Write-Output ("Tokens replaced: {0}   unique keys: {1}" -f $replacements, $keys.Count)
  Write-Output "Per-key image sizes:"
  $report | ForEach-Object { Write-Output $_ }
  Write-Output "JSON valid: true"
}
catch {
  Write-Output "FAIL: $($_.Exception.Message)"
  exit 1
}
