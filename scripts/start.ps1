$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Run = Join-Path $Root '.run'; New-Item -ItemType Directory -Force -Path $Run | Out-Null
if (-not (Test-Path "$Root\server\paper.jar")) { throw 'Missing server/paper.jar (exact Paper 1.21.11 build required).' }
$Web = Start-Process npm -ArgumentList 'run','start','--','-H','0.0.0.0','-p','3000' -WorkingDirectory "$Root\apps\web" -PassThru -WindowStyle Hidden
$Minecraft = Start-Process java -ArgumentList '-Xms1G','-Xmx4G','-jar','paper.jar','--nogui' -WorkingDirectory "$Root\server" -PassThru -WindowStyle Hidden
Set-Content "$Run\web.pid" $Web.Id; Set-Content "$Run\minecraft.pid" $Minecraft.Id
Write-Host "Web PID $($Web.Id); Minecraft PID $($Minecraft.Id)"
