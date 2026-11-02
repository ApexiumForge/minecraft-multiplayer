$Root = Split-Path -Parent $PSScriptRoot
foreach ($Name in 'web','minecraft') { $PidFile = "$Root\.run\$Name.pid"; if (Test-Path $PidFile) { $ProcessId = [int](Get-Content $PidFile); Stop-Process -Id $ProcessId -ErrorAction SilentlyContinue; Remove-Item -LiteralPath $PidFile -Force; Write-Host "Stopped $Name (PID $ProcessId)." } }
