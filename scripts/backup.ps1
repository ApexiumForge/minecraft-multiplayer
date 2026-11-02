param([string]$Destination)
$ErrorActionPreference = 'Stop'; $Root = Split-Path -Parent $PSScriptRoot
if (-not $Destination) { $Destination = Join-Path $Root ("backups\skyblock-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip') }
$Items = @(); foreach ($Path in "$Root\server\world", "$Root\server\world_nether", "$Root\server\world_the_end", "$Root\server\bskyblock_world", "$Root\server\bskyblock_world_nether", "$Root\server\bskyblock_world_the_end", "$Root\server\plugins", "$Root\server\config", "$Root\server\server.properties", "$Root\server\bukkit.yml", "$Root\server\spigot.yml", "$Root\server\paper-global.yml", "$Root\server\paper-world-defaults.yml", "$Root\server\whitelist.json", "$Root\server\ops.json", "$Root\server\eula.txt", "$Root\apps\web\prisma\dev.db", "$Root\apps\web\prisma\migrations") { if (Test-Path $Path) { $Items += $Path } }
if ($Items.Count -eq 0) { throw 'Nothing to back up.' }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
Compress-Archive -LiteralPath $Items -DestinationPath $Destination -CompressionLevel Optimal -ErrorAction Stop
Write-Host "Backup created: $Destination"
