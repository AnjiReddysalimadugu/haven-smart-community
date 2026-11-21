$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $pair = $_.Split('=', 2)
    if ($pair.Length -eq 2) {
      Set-Item -Path "Env:$($pair[0].Trim())" -Value $pair[1].Trim()
    }
  }
}

$required = @('DB_URL', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET', 'DEMO_PASSWORD')
foreach ($k in $required) {
  if (-not [string]::IsNullOrWhiteSpace((Get-Item "Env:$k" -ErrorAction SilentlyContinue).Value)) { continue }
  throw "Missing required environment variable: $k (set in .env)"
}

$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:USERPROFILE\apache-maven-3.9.9\bin;$env:Path"
Set-Location (Join-Path $root 'backend')
mvn spring-boot:run
