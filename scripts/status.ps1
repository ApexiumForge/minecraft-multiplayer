$Root = Split-Path -Parent $PSScriptRoot
foreach ($Name in 'web','minecraft') { $PidFile = "$Root\.run\$Name.pid"; $Running = $false; if (Test-Path $PidFile) { $ProcessId = [int](Get-Content $PidFile); $Running = $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) }; [pscustomobject]@{Service=$Name;Running=$Running;Pid=if($Running){$ProcessId}else{$null}} }
