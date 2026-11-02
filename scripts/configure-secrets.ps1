param(
  [switch]$Rotate,
  [switch]$EnableDelivery
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$WebEnv = Join-Path $Root 'apps\web\.env'
$BridgeConfig = Join-Path $Root 'server\plugins\SkyBridge\config.yml'

function New-Secret {
  $bytes = [byte[]]::new(48)
  [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToBase64String($bytes)
}

if ($Rotate -or -not (Test-Path -LiteralPath $WebEnv)) {
  $session = New-Secret
  $bridge = New-Secret
  $content = @"
DATABASE_URL="file:./dev.db"
SESSION_SECRET="$session"
BRIDGE_SECRET="$bridge"
BRIDGE_ALLOWED_IP="127.0.0.1"
ENABLE_LIVE_PURCHASES="$($EnableDelivery.ToString().ToLowerInvariant())"
ENABLE_LIVE_SELLING="false"
ENABLE_LIVE_CHALLENGE_REWARDS="false"
"@
  [IO.File]::WriteAllText($WebEnv, $content, [Text.UTF8Encoding]::new($false))
} else {
  $match = Select-String -LiteralPath $WebEnv -Pattern '^BRIDGE_SECRET="(.+)"$'
  if (-not $match) { throw 'Existing .env has no BRIDGE_SECRET; update it manually without replacing other values.' }
  $bridge = $match.Matches[0].Groups[1].Value
  $envContent = [IO.File]::ReadAllText($WebEnv)
  $liveValue = $EnableDelivery.ToString().ToLowerInvariant()
  if ($envContent -match '(?m)^ENABLE_LIVE_PURCHASES=') {
    $envContent = [Regex]::Replace($envContent, '(?m)^ENABLE_LIVE_PURCHASES=.*$', "ENABLE_LIVE_PURCHASES=`"$liveValue`"")
  } else {
    $envContent = $envContent.TrimEnd() + "`r`nENABLE_LIVE_PURCHASES=`"$liveValue`"`r`n"
  }
  if ($envContent -match '(?m)^ENABLE_LIVE_SELLING=') {
    $envContent = [Regex]::Replace($envContent, '(?m)^ENABLE_LIVE_SELLING=.*$', 'ENABLE_LIVE_SELLING="false"')
  } else {
    $envContent = $envContent.TrimEnd() + "`r`nENABLE_LIVE_SELLING=`"false`"`r`n"
  }
  if ($envContent -match '(?m)^ENABLE_LIVE_CHALLENGE_REWARDS=') {
    $envContent = [Regex]::Replace($envContent, '(?m)^ENABLE_LIVE_CHALLENGE_REWARDS=.*$', 'ENABLE_LIVE_CHALLENGE_REWARDS="false"')
  } else {
    $envContent = $envContent.TrimEnd() + "`r`nENABLE_LIVE_CHALLENGE_REWARDS=`"false`"`r`n"
  }
  [IO.File]::WriteAllText($WebEnv, $envContent, [Text.UTF8Encoding]::new($false))
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $BridgeConfig) | Out-Null
$yaml = @"
backend-url: "http://127.0.0.1:3000"
bridge-secret: "$bridge"
poll-seconds: 5
connect-timeout-seconds: 3
request-timeout-seconds: 5
journal-file: "operations.jsonl"
delivery-enabled: $($EnableDelivery.ToString().ToLowerInvariant())
selling-enabled: false
challenge-rewards-enabled: false
"@
[IO.File]::WriteAllText($BridgeConfig, $yaml, [Text.UTF8Encoding]::new($false))
Write-Host 'Local web and bridge secrets are configured. Values were not printed.' -ForegroundColor Green
