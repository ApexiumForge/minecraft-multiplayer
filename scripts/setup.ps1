$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Java not found. Install a Java 21 JDK, reopen PowerShell, then retry.' }
$JavaVersion = (& java -version 2>&1 | Select-Object -First 1) -join ''
if ($JavaVersion -notmatch 'version "21[\.]') { throw "Java 21 is required for Paper 1.21.11. Found: $JavaVersion" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js not found. Install Node.js 22 LTS, then retry.' }
New-Item -ItemType Directory -Force -Path "$Root\server\plugins\BentoBox\addons", "$Root\backups" | Out-Null
Push-Location "$Root\apps\web"
try {
  npm ci
  if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env'; Write-Warning 'Edit apps/web/.env with independent random secrets before starting.' }
  npx prisma generate
  npx prisma migrate deploy
  npm run db:seed
  npm run build
} finally { Pop-Location }
if (-not (Test-Path "$Root\server\paper.jar")) { Write-Warning 'Missing server/paper.jar. Download the exact Paper 1.21.11 build from PaperMC.' }
Write-Host 'Foundation setup complete. Review docs/SETUP.md before first server boot.' -ForegroundColor Green
