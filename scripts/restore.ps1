param([Parameter(Mandatory=$true)][string]$Backup)
$ErrorActionPreference = 'Stop'; $Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath $Backup)) { throw "Backup not found: $Backup" }
if ((Get-Process java,node -ErrorAction SilentlyContinue).Count -gt 0) { throw 'Stop Minecraft and the web application before restoring.' }
$Resolved = (Resolve-Path -LiteralPath $Backup).Path
Write-Warning "Restore is destructive and intentionally requires manual extraction. Verified archive: $Resolved"
Write-Host "Inspect it, back up current data, then extract into: $Root"
