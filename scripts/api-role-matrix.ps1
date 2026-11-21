$ErrorActionPreference = 'Continue'
$base = 'http://localhost:8080/api/v1'
$results = @()

function Add-Result($area, $case, $ok, $detail) {
  $script:results += [pscustomobject]@{ Area = $area; Case = $case; OK = $ok; Detail = $detail }
  $mark = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host ("[{0}] {1} :: {2} — {3}" -f $mark, $area, $case, $detail)
}

function Login($email) {
  $otpRes = Invoke-RestMethod -Uri "$base/auth/otp/request" -Method POST -ContentType 'application/json' -Body (@{
      email = $email
    } | ConvertTo-Json)
  if (-not $otpRes.devOtp) { throw "OTP_EXPOSE must be true for scripted login (no devOtp returned)" }
  Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType 'application/json' -Body (@{
      email = $email; otp = $otpRes.devOtp
    } | ConvertTo-Json)
}

function AuthHeaders($token) {
  @{ Authorization = "Bearer $token" }
}

function StatusOf($scriptBlock) {
  try {
    $null = & $scriptBlock
    return @{ code = 200; err = $null }
  } catch {
    $code = 0
    $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode
      try {
        $reader = [IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $raw = $reader.ReadToEnd()
        if ($raw) {
          $j = $raw | ConvertFrom-Json
          if ($j.message) { $msg = $j.message }
        }
      } catch {}
    }
    return @{ code = $code; err = $msg }
  }
}

Write-Host "`n=== 1) AUTH ==="
$sa = Login 'superadmin@haven.local'
$ad = Login 'admin@haven.local'
$st = Login 'staff@haven.local'
$sec = Login 'security@haven.local'
$res = Login 'resident@haven.local'
Add-Result 'Auth' 'superadmin login' ($sa.user.role -eq 'SUPER_ADMIN') $sa.user.role
Add-Result 'Auth' 'apartment admin login' ($ad.user.role -eq 'APARTMENT_ADMIN') "$($ad.user.role) / $($ad.user.apartmentName)"
Add-Result 'Auth' 'staff login' ($st.user.role -eq 'STAFF') $st.user.role
Add-Result 'Auth' 'security login' ($sec.user.role -eq 'SECURITY') $sec.user.role
Add-Result 'Auth' 'resident login' ($res.user.role -eq 'RESIDENT' -and $res.user.flatNumber) "$($res.user.role) flat=$($res.user.flatNumber)"

Write-Host "`n=== 2) MULTI-APARTMENT ==="
$apts = Invoke-RestMethod -Uri "$base/apartments" -Headers (AuthHeaders $sa.accessToken)
Add-Result 'MultiApt' 'superadmin lists apartments' ($apts.Count -ge 1) "count=$($apts.Count)"
$apts | ForEach-Object { Write-Host ("  society: {0}" -f $_.name) }

$adminApts = Invoke-RestMethod -Uri "$base/apartments" -Headers (AuthHeaders $ad.accessToken)
Add-Result 'MultiApt' 'apartment admin scoped list' ($adminApts.Count -eq 1 -and $adminApts[0].name -match 'Green Valley') "count=$($adminApts.Count) name=$($adminApts[0].name)"

# Create a second society if fewer than 2
if ($apts.Count -lt 2) {
  $created = Invoke-RestMethod -Uri "$base/apartments" -Method POST -Headers (AuthHeaders $sa.accessToken) -ContentType 'application/json' -Body (@{
      name = "Lakeview Heights Test"
      address = "88 Lake Road, Hyderabad"
      timezone = "Asia/Kolkata"
    } | ConvertTo-Json)
  Add-Result 'MultiApt' 'superadmin create society' ($null -ne $created.id) $created.name
  $apts = Invoke-RestMethod -Uri "$base/apartments" -Headers (AuthHeaders $sa.accessToken)
}

$other = $apts | Where-Object { $_.name -ne 'Green Valley Residency' } | Select-Object -First 1
$gvr = $apts | Where-Object { $_.name -eq 'Green Valley Residency' } | Select-Object -First 1

# Apartment admin must NOT create apartments
$denyCreate = StatusOf {
  Invoke-RestMethod -Uri "$base/apartments" -Method POST -Headers (AuthHeaders $ad.accessToken) -ContentType 'application/json' -Body (@{
      name = 'Should Fail Society'; address = 'x'; timezone = 'Asia/Kolkata'
    } | ConvertTo-Json)
}
Add-Result 'MultiApt' 'apartment admin cannot create society' ($denyCreate.code -in 401, 403) "http=$($denyCreate.code) $($denyCreate.err)"

# Isolation: admin flats should only be Green Valley
$adminFlats = Invoke-RestMethod -Uri "$base/flats" -Headers (AuthHeaders $ad.accessToken)
$adminFlatSample = ($adminFlats | Select-Object -First 3 | ForEach-Object { $_.flatNumber }) -join ', '
Add-Result 'MultiApt' 'apartment admin flats scoped' ($adminFlats.Count -gt 0) "count=$($adminFlats.Count) sample=$adminFlatSample"

$saFlats = Invoke-RestMethod -Uri "$base/flats" -Headers (AuthHeaders $sa.accessToken)
Add-Result 'MultiApt' 'superadmin sees all flats' ($saFlats.Count -ge $adminFlats.Count) "super=$($saFlats.Count) admin=$($adminFlats.Count)"

Write-Host "`n=== 3) ROLE GET MATRIX ==="
$paths = @(
  '/dashboard/summary', '/apartments', '/flats', '/residents', '/occupancies',
  '/bills', '/receipts', '/parking-slots', '/visitors', '/complaints', '/auth/me'
)
$tokens = [ordered]@{
  SUPER_ADMIN     = $sa.accessToken
  APARTMENT_ADMIN = $ad.accessToken
  STAFF           = $st.accessToken
  SECURITY        = $sec.accessToken
  RESIDENT        = $res.accessToken
}
# Expected: 200 allowed, 403/401 denied
$expect = @{
  '/dashboard/summary' = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 403 }
  '/apartments'        = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 403 }
  '/flats'             = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 200 }
  '/residents'         = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 403 }
  '/occupancies'       = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 403 }
  '/bills'             = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 200 }
  '/receipts'          = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 200 }
  '/parking-slots'     = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 200 }
  '/visitors'          = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 200; RESIDENT = 200 }
  '/complaints'        = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 403; RESIDENT = 200 }
  '/auth/me'           = @{ SUPER_ADMIN = 200; APARTMENT_ADMIN = 200; STAFF = 200; SECURITY = 200; RESIDENT = 200 }
}

foreach ($p in $paths) {
  foreach ($role in $tokens.Keys) {
    $stt = StatusOf { Invoke-RestMethod -Uri "$base$p" -Headers (AuthHeaders $tokens[$role]) }
    $want = $expect[$p][$role]
    $ok = ($stt.code -eq $want) -or ($want -eq 403 -and $stt.code -in 401, 403)
    Add-Result 'GET' "$role $p" $ok "got=$($stt.code) want=$want"
  }
}

Write-Host "`n=== 4) WRITE / FLOW APIs ==="
# Receipts exist
$receipts = Invoke-RestMethod -Uri "$base/receipts" -Headers (AuthHeaders $ad.accessToken)
Add-Result 'Receipts' 'list receipts' ($receipts.Count -ge 1) "count=$($receipts.Count) first=$($receipts[0].receiptNumber)"

# Resident receipts only own flat
$resReceipts = Invoke-RestMethod -Uri "$base/receipts" -Headers (AuthHeaders $res.accessToken)
$foreign = @($resReceipts | Where-Object { $_.flatNumber -ne $res.user.flatNumber })
Add-Result 'Receipts' 'resident only own flat' ($foreign.Count -eq 0) "count=$($resReceipts.Count) foreign=$($foreign.Count)"

# Parking allocate/release
$slots = Invoke-RestMethod -Uri "$base/parking-slots" -Headers (AuthHeaders $ad.accessToken)
$free = $slots | Where-Object { -not $_.allocated -and $_.active } | Select-Object -First 1
$flat = $adminFlats | Where-Object { $_.flatNumber -eq 'A-202' } | Select-Object -First 1
if ($free -and $flat) {
  $allocBody = @{ flatId = $flat.id; vehicleNumber = 'KA99TEST9999' } | ConvertTo-Json
  $alloc = Invoke-RestMethod -Uri "$base/parking-slots/$($free.id)/allocate" -Method POST -Headers (AuthHeaders $ad.accessToken) -ContentType 'application/json' -Body $allocBody
  Add-Result 'Parking' 'allocate to flat' ($alloc.allocated -and $alloc.flatNumber -eq 'A-202') "$($alloc.slotCode)->$($alloc.flatNumber)"
  $rel = Invoke-RestMethod -Uri "$base/parking-slots/$($free.id)/release" -Method POST -Headers (AuthHeaders $ad.accessToken)
  Add-Result 'Parking' 'release slot' (-not $rel.allocated) "allocated=$($rel.allocated)"
} else {
  Add-Result 'Parking' 'allocate to flat' $false 'no free slot or flat'
}

# Visitor create + validate + exit
$visitorFlat = $adminFlats | Where-Object { $_.flatNumber -eq 'A-101' } | Select-Object -First 1
$created = Invoke-RestMethod -Uri "$base/visitors" -Method POST -Headers (AuthHeaders $ad.accessToken) -ContentType 'application/json' -Body (@{
    flatId = $visitorFlat.id; visitorName = 'Matrix Tester'; visitType = 'GUEST'; validityMinutes = 60
  } | ConvertTo-Json)
Add-Result 'Visitors' 'create pass' ($null -ne $created.qrToken) "id=$($created.id)"

$val = Invoke-RestMethod -Uri "$base/visitors/validate" -Method POST -Headers (AuthHeaders $sec.accessToken) -ContentType 'application/json' -Body (@{
    qrToken = $created.qrToken
  } | ConvertTo-Json)
Add-Result 'Visitors' 'security check-in' ($val.valid -eq $true) $val.message

$exit = Invoke-RestMethod -Uri "$base/visitors/$($val.id)/exit" -Method POST -Headers (AuthHeaders $sec.accessToken)
Add-Result 'Visitors' 'security check-out' ($null -ne $exit.exitAt) "exitAt=$($exit.exitAt)"

# Resident cannot validate
$denyVal = StatusOf {
  Invoke-RestMethod -Uri "$base/visitors/validate" -Method POST -Headers (AuthHeaders $res.accessToken) -ContentType 'application/json' -Body (@{ qrToken = 'x' } | ConvertTo-Json)
}
Add-Result 'Visitors' 'resident cannot validate' ($denyVal.code -in 401, 403) "http=$($denyVal.code)"

# Bill pay creates receipt
$bills = Invoke-RestMethod -Uri "$base/bills" -Headers (AuthHeaders $ad.accessToken)
$open = $bills | Where-Object { [decimal]$_.balance -gt 0 } | Select-Object -First 1
if ($open) {
  $before = (Invoke-RestMethod -Uri "$base/receipts" -Headers (AuthHeaders $ad.accessToken)).Count
  $payAmt = [math]::Min(100, [decimal]$open.balance)
  $paid = Invoke-RestMethod -Uri "$base/bills/$($open.id)/payments" -Method POST -Headers (AuthHeaders $ad.accessToken) -ContentType 'application/json' -Body (@{
      amount = $payAmt; method = 'UPI'; reference = "MATRIX-$([DateTime]::UtcNow.Ticks)"
    } | ConvertTo-Json)
  $after = (Invoke-RestMethod -Uri "$base/receipts" -Headers (AuthHeaders $ad.accessToken)).Count
  Add-Result 'Billing' 'pay creates receipt' ($after -gt $before -and [decimal]$paid.balance -lt [decimal]$open.balance) "receipts $before->$after bal=$($paid.balance)"
} else {
  Add-Result 'Billing' 'pay creates receipt' $false 'no open bill'
}

# Security cannot list bills
$secBills = StatusOf { Invoke-RestMethod -Uri "$base/bills" -Headers (AuthHeaders $sec.accessToken) }
Add-Result 'Security' 'cannot list bills' ($secBills.code -in 401, 403) "http=$($secBills.code)"

Write-Host "`n=== SUMMARY ==="
$passN = @($results | Where-Object OK).Count
$failN = @($results | Where-Object { -not $_.OK }).Count
Write-Host "PASS=$passN FAIL=$failN TOTAL=$($results.Count)"
if ($failN -gt 0) {
  Write-Host "`nFailures:"
  $results | Where-Object { -not $_.OK } | Format-Table -AutoSize | Out-String | Write-Host
}
$results | ConvertTo-Json -Depth 4 | Set-Content -Path "$PSScriptRoot\api-role-matrix-results.json" -Encoding utf8
Write-Host "Wrote scripts/api-role-matrix-results.json"
