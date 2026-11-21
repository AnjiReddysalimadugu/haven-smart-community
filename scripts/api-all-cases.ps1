$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080/api/v1'
$password = 'Password@123'
$results = New-Object System.Collections.Generic.List[object]

function Record($role, $case, $pass, $detail) {
  $results.Add([pscustomobject]@{ Role = $role; Case = $case; Pass = [bool]$pass; Detail = "$detail" })
  $mark = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host "[$mark] $($role.PadRight(10)) $case :: $detail"
}

function ApiLogin([string]$email) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  return Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType 'application/json' -Body $body
}

function ApiCall {
  param(
    [string]$Method = 'GET',
    [string]$Path,
    [string]$Token,
    [object]$Body,
    [int[]]$Expect = @(200, 201)
  )
  $uri = if ($Path.StartsWith('http')) { $Path } else { "$base$Path" }
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $json = $null
  if ($null -ne $Body) { $json = ($Body | ConvertTo-Json -Depth 6) }
  try {
    if ($json) {
      $data = Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType 'application/json' -Body $json
    } else {
      $data = Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }
    return @{ ok = $true; status = 200; data = $data; message = 'ok' }
  } catch {
    $status = 0
    $message = $_.Exception.Message
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $message = $reader.ReadToEnd()
        }
      } catch {}
    } elseif ($_.ErrorDetails.Message) {
      $message = $_.ErrorDetails.Message
      if ($message -match '"status"\s*:\s*(\d+)') { $status = [int]$Matches[1] }
    }
    return @{ ok = $false; status = $status; data = $null; message = $message }
  }
}

function Expect {
  param($Role, $Case, $Result, [int[]]$Status)
  $pass = $Status -contains $Result.status -or ($Result.ok -and ($Status | Where-Object { $_ -ge 200 -and $_ -lt 300 }))
  if (($Status | Where-Object { $_ -ge 200 -and $_ -lt 300 }) -and $Result.ok) { $pass = $true }
  if (($Status | Where-Object { $_ -ge 400 }) -and (-not $Result.ok) -and ($Status -contains $Result.status)) { $pass = $true }
  if (($Status | Where-Object { $_ -ge 400 }) -and $Result.ok) { $pass = $false }
  $detail = "status=$($Result.status) expect=$($Status -join '|')"
  if (-not $Result.ok -and $Result.message) { $detail = "$detail $($Result.message.Substring(0, [Math]::Min(120, $Result.message.Length)))" }
  Record $Role $Case $pass $detail
  return $Result
}

Write-Host "=== AUTH ==="
Expect PUBLIC 'login bad password' (ApiCall -Method POST -Path '/auth/login' -Body @{ email = 'admin@haven.local'; password = 'wrong' }) @(401) | Out-Null
Expect PUBLIC 'dashboard without token' (ApiCall -Path '/dashboard/summary') @(401) | Out-Null

$admin = ApiLogin 'admin@haven.local'
$staff = ApiLogin 'staff@haven.local'
$sec = ApiLogin 'security@haven.local'
$res = ApiLogin 'resident@haven.local'
Record ADMIN login ($null -ne $admin.accessToken) $admin.user.role
Record STAFF login ($null -ne $staff.accessToken) $staff.user.role
Record SECURITY login ($null -ne $sec.accessToken) $sec.user.role
Record RESIDENT login ($null -ne $res.accessToken) "$($res.user.role) flat=$($res.user.flatNumber)"

$AT = $admin.accessToken
$ST = $staff.accessToken
$SE = $sec.accessToken
$RT = $res.accessToken

Expect ADMIN 'auth/me' (ApiCall -Path '/auth/me' -Token $AT) @(200) | Out-Null

Write-Host "`n=== DASHBOARD ==="
Expect ADMIN 'dashboard summary' (ApiCall -Path '/dashboard/summary' -Token $AT) @(200) | Out-Null
Expect STAFF 'dashboard summary' (ApiCall -Path '/dashboard/summary' -Token $ST) @(200) | Out-Null
Expect RESIDENT 'dashboard forbidden' (ApiCall -Path '/dashboard/summary' -Token $RT) @(403) | Out-Null
Expect SECURITY 'dashboard forbidden' (ApiCall -Path '/dashboard/summary' -Token $SE) @(403) | Out-Null

Write-Host "`n=== PROPERTY ==="
$apts = Expect ADMIN 'list apartments' (ApiCall -Path '/apartments' -Token $AT) @(200)
$apartmentId = $admin.user.apartmentId
if (-not $apartmentId) { $apartmentId = @($apts.data)[0].id }

$blocks = Expect ADMIN 'list blocks' (ApiCall -Path "/apartments/$apartmentId/blocks" -Token $AT) @(200)
$blockId = @($blocks.data)[0].id
$floors = Expect ADMIN 'list floors' (ApiCall -Path "/blocks/$blockId/floors" -Token $AT) @(200)
$floorId = @($floors.data)[0].id
Expect ADMIN 'list flats by floor' (ApiCall -Path "/floors/$floorId/flats" -Token $AT) @(200) | Out-Null
$societyFlats = Expect ADMIN 'list society flats' (ApiCall -Path '/flats' -Token $AT) @(200)
$flatId = $res.user.flatId
if (-not $flatId) { $flatId = @($societyFlats.data)[0].id }

$code = "T{0:D3}" -f (Get-Random -Maximum 999)
$newBlock = Expect ADMIN 'create block' (ApiCall -Method POST -Path '/blocks' -Token $AT -Body @{
  apartmentId = $apartmentId; name = "Temp Block $code"; code = $code
}) @(201, 200)
$tempBlockId = $newBlock.data.id
$newFloor = Expect ADMIN 'create floor' (ApiCall -Method POST -Path '/floors' -Token $AT -Body @{
  blockId = $tempBlockId; floorNumber = 9; name = 'Test Floor'
}) @(201, 200)
$tempFloorId = $newFloor.data.id
$newFlat = Expect ADMIN 'create flat' (ApiCall -Method POST -Path '/flats' -Token $AT -Body @{
  floorId = $tempFloorId; flatNumber = "T-$code"; areaSqft = 900; bedroomCount = 2
}) @(201, 200)
$tempFlatId = $newFlat.data.id

Expect STAFF 'create block forbidden' (ApiCall -Method POST -Path '/blocks' -Token $ST -Body @{
  apartmentId = $apartmentId; name = 'Nope'; code = 'ZZ'
}) @(403) | Out-Null
Expect RESIDENT 'create flat forbidden' (ApiCall -Method POST -Path '/flats' -Token $RT -Body @{
  floorId = $floorId; flatNumber = 'X-999'; areaSqft = 100; bedroomCount = 1
}) @(403) | Out-Null
Expect SECURITY 'list apartments forbidden' (ApiCall -Path '/apartments' -Token $SE) @(403) | Out-Null
Expect RESIDENT 'list apartments' (ApiCall -Path '/apartments' -Token $RT) @(200) | Out-Null

Write-Host "`n=== BILLING ==="
$adminBills = Expect ADMIN 'list bills' (ApiCall -Path '/bills' -Token $AT) @(200)
$resBills = Expect RESIDENT 'list bills scoped' (ApiCall -Path '/bills' -Token $RT) @(200)
$period = "2027-{0:D2}" -f (Get-Random -Minimum 1 -Maximum 12)
$bill = Expect ADMIN 'create bill' (ApiCall -Method POST -Path '/bills' -Token $AT -Body @{
  flatId = $tempFlatId; billType = 'WATER'; billingPeriod = $period; amount = 1200; dueDate = '2027-12-15'
}) @(201, 200)
Expect RESIDENT 'create bill forbidden' (ApiCall -Method POST -Path '/bills' -Token $RT -Body @{
  flatId = $flatId; billType = 'WATER'; billingPeriod = '2028-01'; amount = 100; dueDate = '2028-01-15'
}) @(403) | Out-Null
Expect STAFF 'record payment' (ApiCall -Method POST -Path "/bills/$($bill.data.id)/payments" -Token $ST -Body @{
  amount = 500; method = 'UPI'; reference = "TST-$code"
}) @(200) | Out-Null
Expect RESIDENT 'payment forbidden' (ApiCall -Method POST -Path "/bills/$($bill.data.id)/payments" -Token $RT -Body @{
  amount = 100; method = 'UPI'; reference = 'NOPE'
}) @(403) | Out-Null
Expect SECURITY 'list bills forbidden' (ApiCall -Path '/bills' -Token $SE) @(403) | Out-Null
Record RESIDENT 'bills scoped <= admin' ((@($resBills.data).Count) -le (@($adminBills.data).Count)) "resident=$(@($resBills.data).Count) admin=$(@($adminBills.data).Count)"

Write-Host "`n=== VISITORS ==="
$visitor = Expect RESIDENT 'create visitor pass' (ApiCall -Method POST -Path '/visitors' -Token $RT -Body @{
  visitorName = 'API Tester'; visitType = 'GUEST'; validityMinutes = 60
}) @(201, 200)
$qr = $visitor.data.qrToken
Expect SECURITY 'validate pass' (ApiCall -Method POST -Path '/visitors/validate' -Token $SE -Body @{ qrToken = $qr }) @(200) | Out-Null
Expect SECURITY 'create visitor forbidden' (ApiCall -Method POST -Path '/visitors' -Token $SE -Body @{
  flatId = $flatId; visitorName = 'Nope'; visitType = 'GUEST'; validityMinutes = 30
}) @(403) | Out-Null
Expect RESIDENT 'validate forbidden' (ApiCall -Method POST -Path '/visitors/validate' -Token $RT -Body @{ qrToken = 'x' }) @(403) | Out-Null
Expect ADMIN 'list visitors' (ApiCall -Path '/visitors' -Token $AT) @(200) | Out-Null
Expect SECURITY 'list visitors' (ApiCall -Path '/visitors' -Token $SE) @(200) | Out-Null

Write-Host "`n=== COMPLAINTS ==="
$complaint = Expect RESIDENT 'create complaint' (ApiCall -Method POST -Path '/complaints' -Token $RT -Body @{
  title = 'API test complaint'; category = 'OTHER'; description = 'Created by automated API suite.'
}) @(201, 200)
Expect STAFF 'update complaint status' (ApiCall -Method PATCH -Path "/complaints/$($complaint.data.id)/status" -Token $ST -Body @{
  status = 'IN_PROGRESS'
}) @(200) | Out-Null
Expect RESIDENT 'update status forbidden' (ApiCall -Method PATCH -Path "/complaints/$($complaint.data.id)/status" -Token $RT -Body @{
  status = 'CLOSED'
}) @(403) | Out-Null
Expect SECURITY 'list complaints forbidden' (ApiCall -Path '/complaints' -Token $SE) @(403) | Out-Null
Expect STAFF 'create complaint forbidden' (ApiCall -Method POST -Path '/complaints' -Token $ST -Body @{
  flatId = $flatId; title = 'Nope'; category = 'OTHER'; description = 'staff cannot create'
}) @(403) | Out-Null
Expect ADMIN 'list complaints' (ApiCall -Path '/complaints' -Token $AT) @(200) | Out-Null

Write-Host "`n=== PARKING ==="
Expect ADMIN 'list parking' (ApiCall -Path '/parking-slots' -Token $AT) @(200) | Out-Null
$slotCode = "P-T$code"
Expect ADMIN 'create parking' (ApiCall -Method POST -Path '/parking-slots' -Token $AT -Body @{
  apartmentId = $apartmentId; slotCode = $slotCode; vehicleType = 'CAR'; monthlyCharge = 1100
}) @(201, 200) | Out-Null
Expect RESIDENT 'list parking' (ApiCall -Path '/parking-slots' -Token $RT) @(200) | Out-Null
Expect STAFF 'create parking forbidden' (ApiCall -Method POST -Path '/parking-slots' -Token $ST -Body @{
  apartmentId = $apartmentId; slotCode = 'P-NO'; vehicleType = 'BIKE'; monthlyCharge = 200
}) @(403) | Out-Null
Expect SECURITY 'parking forbidden' (ApiCall -Path '/parking-slots' -Token $SE) @(403) | Out-Null

Write-Host "`n=== SUMMARY ==="
$passCount = @($results | Where-Object Pass).Count
$failCount = @($results | Where-Object { -not $_.Pass }).Count
Write-Host "Passed=$passCount Failed=$failCount Total=$($results.Count)"
if ($failCount -gt 0) {
  $results | Where-Object { -not $_.Pass } | Format-Table -AutoSize
  exit 1
}
Write-Host 'All API cases passed.'
exit 0
