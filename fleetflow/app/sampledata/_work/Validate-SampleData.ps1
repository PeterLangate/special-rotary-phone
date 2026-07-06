<#
.SYNOPSIS
  Deterministic structural validation of the finished FleetFlow sample-data files.
  Checks: valid JSON, all arrays present and meeting minimums, no leftover @@IMG
  tokens, every documents[].base64 is a real data URI, and core referential
  integrity. Pure local checks - no API/agent cost.
#>
[CmdletBinding()]
param(
  [string] $Dir = 'x:\Source\FleetFlow\Documentation\Human\SampleData'
)
$ErrorActionPreference = 'Stop'

$mins = [ordered]@{
  vehicleTypes=3; vehicles=5; trackedObjects=5; drivers=6; driverCertifications=8; customers=5;
  locations=8; workOrders=12; routes=12; stops=28; assignments=12; telemetryReadings=40;
  events=15; notes=12; documents=12; fieldDefinitions=10; inspections=5; maintenanceJobs=5
}

function Count-Of { param($node) if ($null -eq $node) { return 0 } return @($node).Count }
function Ids { param($node, [string]$field) $h = New-Object System.Collections.Generic.HashSet[string]; foreach ($r in @($node)) { if ($r -and $null -ne $r.$field) { [void]$h.Add([string]$r.$field) } } return $h }

try {
  $files = Get-ChildItem -LiteralPath $Dir -Filter '*.json' | Where-Object { $_.Name -match '\.(sv|en|de)\.json$' } | Sort-Object Name
  if (-not $files) { Write-Output 'No locale files to validate.'; return }

  $rows = New-Object System.Collections.Generic.List[object]
  $passCount = 0

  foreach ($f in $files) {
    $issues = New-Object System.Collections.Generic.List[string]
    try {
      $raw = [System.IO.File]::ReadAllText($f.FullName)
      if ([regex]::IsMatch($raw, '@@IMG:[A-Za-z0-9_]+@@')) { $issues.Add('leftover @@IMG token') | Out-Null }
      $j = $raw | ConvertFrom-Json -Depth 100

      foreach ($k in $mins.Keys) {
        $c = Count-Of $j.$k
        if ($c -lt $mins[$k]) { $issues.Add("$k=$c<$($mins[$k])") | Out-Null }
      }

      # documents must carry a real data URI
      $badImg = 0
      foreach ($d in @($j.documents)) { if ($d.base64 -notlike 'data:image/*;base64,*') { $badImg++ } }
      if ($badImg -gt 0) { $issues.Add("badBase64=$badImg") | Out-Null }

      # core referential integrity
      $cust = Ids $j.customers 'customerId'
      $wo   = Ids $j.workOrders 'workOrderId'
      $rt   = Ids $j.routes 'routeId'
      $veh  = Ids $j.vehicles 'vehicleId'
      $drv  = Ids $j.drivers 'driverId'
      $loc  = Ids $j.locations 'locationId'
      $dangling = 0
      foreach ($w in @($j.workOrders)) { if ($null -ne $w.customerId -and -not $cust.Contains([string]$w.customerId)) { $dangling++ } }
      foreach ($r in @($j.routes))     { if ($null -ne $r.workOrderId -and -not $wo.Contains([string]$r.workOrderId)) { $dangling++ } }
      foreach ($s in @($j.stops))      { if ($null -ne $s.routeId -and -not $rt.Contains([string]$s.routeId)) { $dangling++ }
                                         if ($null -ne $s.locationId -and -not $loc.Contains([string]$s.locationId)) { $dangling++ } }
      foreach ($a in @($j.assignments)){ if ($null -ne $a.routeId -and -not $rt.Contains([string]$a.routeId)) { $dangling++ }
                                         if ($null -ne $a.vehicleId -and -not $veh.Contains([string]$a.vehicleId)) { $dangling++ }
                                         if ($null -ne $a.driverId -and -not $drv.Contains([string]$a.driverId)) { $dangling++ } }
      if ($dangling -gt 0) { $issues.Add("danglingRefs=$dangling") | Out-Null }

      # locale sanity
      $suffix = ($f.BaseName -split '\.')[-1]
      if ($j.metadata -and $j.metadata.locale -and ([string]$j.metadata.locale).ToLower() -notmatch $suffix) {
        # not fatal - just note
        $issues.Add("localeTag=$($j.metadata.locale)") | Out-Null
      }

      $status = if ($issues.Count -eq 0) { $passCount++; 'PASS' } else { 'FAIL' }
      $rows.Add([pscustomobject]@{ File=$f.Name; Status=$status; Issues=($issues -join '; ') }) | Out-Null
    }
    catch {
      $rows.Add([pscustomobject]@{ File=$f.Name; Status='ERROR'; Issues=$_.Exception.Message }) | Out-Null
    }
  }

  $rows | Format-Table -AutoSize | Out-String -Width 200 | Write-Output
  Write-Output ("VALIDATION  files={0}  PASS={1}  FAIL/ERROR={2}" -f $files.Count, $passCount, ($files.Count - $passCount))
}
catch { Write-Output "VALIDATE FAIL: $($_.Exception.Message)"; exit 1 }
